import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import mysql from "mysql2/promise";

const REVIEW_SOURCES = [
  { brandSlug: "bullpadel", url: "https://www.bullpadel.com/es/28-palas", type: "catalog" },
  { brandSlug: "nox", url: "https://www.noxsport.com/collections/palas-de-padel-nox", type: "catalog" },
  { brandSlug: "adidas", url: "https://allforpadel.com/es/54-palas-padel", type: "catalog" },
  { brandSlug: "babolat", url: "https://babolat.com.ar/", type: "catalog" },
  { brandSlug: "siux", url: "https://www.siuxpadel.com/collections/palas", type: "catalog" },
  { brandSlug: "starvie", url: "https://starvie.com/collections/palas", type: "catalog" },
  { brandSlug: "dropshot", url: "https://ar.dropshotstore.com/collections/all-levels", type: "catalog" },
  { brandSlug: "vairo", url: "https://padel.vairo.com/collections/all", type: "catalog" },
  { brandSlug: "royal", url: "https://www.royalpadel.com.ar/productos/", type: "catalog" },
  { brandSlug: "blackcrown", url: "https://blackcrown.es/categoria-producto/palas-de-padel/", type: "catalog" },
  { brandSlug: "akkeron", url: "https://akkeron.com/", type: "catalog" },
  { brandSlug: "wilson", url: "https://www.wilson.com/es-es/padel", type: "catalog" },
  { brandSlug: "head", url: "https://www.head.com/en_US/padel", type: "catalog" },
];

const STOPWORDS = new Set([
  "pala",
  "padel",
  "palas",
  "review",
  "analisis",
  "nueva",
  "nuevo",
  "edicion",
  "oficial",
  "pro",
  "ctrl",
  "control",
  "power",
  "light",
]);

function normalize(input) {
  return String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(input) {
  return normalize(input)
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t));
}

function extractCandidatesFromHtml(html, brandSlug) {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const windows = [];

  const patterns = [
    new RegExp(`\\b${brandSlug}\\b[^.\\n]{0,120}?(20\\d{2})?`, "gi"),
    /\b(?:metalbone|adipower|cross it|at10|ml10|vertex|hack|neuron|technical viper|air viper|counter viper|electra|fenix|diablo|blade|bela|speed pro|extreme pro|coello pro)\b[^.\n]{0,80}/gi,
  ];

  for (const re of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      const phrase = m[0].trim();
      if (phrase.length >= 8) windows.push(phrase);
      if (windows.length > 400) break;
    }
  }

  const counts = new Map();
  for (const phrase of windows) {
    const key = normalize(phrase);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([phrase, count]) => ({ phrase, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);
}

function dbNameSimilarity(dbName, phrase) {
  const a = new Set(tokenize(dbName));
  const b = new Set(tokenize(phrase));
  if (a.size === 0 || b.size === 0) return 0;
  let common = 0;
  for (const t of a) if (b.has(t)) common += 1;
  return common / Math.max(a.size, b.size);
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return await res.text();
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL no esta definida");

  const conn = await mysql.createConnection({ uri: dbUrl });

  try {
    const [dbRows] = await conn.query(
      `SELECT b.slug as brand_slug, p.id, p.name, p.slug, p.year
       FROM paddles p
       JOIN brands b ON b.id = p.brand_id`,
    );

    const dbByBrand = new Map();
    for (const row of dbRows) {
      const key = String(row.brand_slug);
      if (!dbByBrand.has(key)) dbByBrand.set(key, []);
      dbByBrand.get(key).push(row);
    }

    const report = {
      generatedAt: new Date().toISOString(),
      sources: [],
      candidates: [],
    };

    for (const src of REVIEW_SOURCES) {
      const sourceResult = {
        ...src,
        ok: false,
        error: null,
        extractedPhrases: 0,
        newSignals: 0,
      };

      try {
        const html = await fetchHtml(src.url);
        const phrases = extractCandidatesFromHtml(html, src.brandSlug);
        sourceResult.extractedPhrases = phrases.length;

        const dbList = dbByBrand.get(src.brandSlug) ?? [];

        for (const phraseRow of phrases) {
          let best = null;
          for (const db of dbList) {
            const score = dbNameSimilarity(db.name, phraseRow.phrase);
            if (!best || score > best.score) {
              best = { id: db.id, name: db.name, slug: db.slug, year: db.year, score };
            }
          }

          const isLikelyNew = !best || best.score < 0.45;
          if (isLikelyNew) {
            report.candidates.push({
              brand_slug: src.brandSlug,
              source_url: src.url,
              source_type: src.type,
              phrase: phraseRow.phrase,
              mention_count: phraseRow.count,
              best_db_match: best,
            });
            sourceResult.newSignals += 1;
          }
        }

        sourceResult.ok = true;
      } catch (err) {
        sourceResult.error = err instanceof Error ? err.message : String(err);
      }

      report.sources.push(sourceResult);
    }

    const outPath = path.resolve("src/paletas.review-candidates.json");
    await fs.writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

    console.log(`Review candidates generado en ${outPath}`);
    console.table(
      report.sources.map((s) => ({
        brand: s.brandSlug,
        type: s.type,
        ok: s.ok,
        extractedPhrases: s.extractedPhrases,
        newSignals: s.newSignals,
        error: s.error,
      })),
    );
    console.log(`Total señales nuevas: ${report.candidates.length}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

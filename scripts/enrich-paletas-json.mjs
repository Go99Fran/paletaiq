import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import mysql from "mysql2/promise";

const INPUT_PATH = path.resolve("src/paletas.json");
const OUTPUT_PATH = path.resolve("src/paletas.json");

const BRAND_TO_SLUG = {
  Bullpadel: "bullpadel",
  Nox: "nox",
  Adidas: "adidas",
  Head: "head",
  Babolat: "babolat",
  Siux: "siux",
  StarVie: "starvie",
  DropShot: "dropshot",
  Wilson: "wilson",
  Kombat: "kombat",
  Vairo: "vairo",
  Royal_Padel: "royal",
  Black_Crown: "blackcrown",
  Akkeron: "akkeron",
};

const BRAND_CATALOG_URLS = {
  bullpadel: [
    "https://www.bullpadel.com/es/28-palas",
  ],
  nox: [
    "https://www.noxsport.com/collections/palas-de-padel-nox",
  ],
  adidas: [
    "https://allforpadel.com/es/54-palas-padel",
    "https://allforpadel.com/es/74-todas-las-palas-de-padel",
  ],
  head: [
    "https://www.head.com/en_US/padel",
  ],
  babolat: [
    "https://www.babolat.com/en/padel",
    "https://babolat.com.ar/",
  ],
  siux: [
    "https://www.siuxpadel.com/collections/palas",
  ],
  starvie: [
    "https://starvie.com/collections/palas",
  ],
  dropshot: [
    "https://ar.dropshotstore.com/collections/all-levels",
  ],
  wilson: [
    "https://www.wilson.com/es-es/padel",
  ],
  kombat: [
    "https://kombatpadel.com.ar/18-palas",
  ],
  vairo: [
    "https://padel.vairo.com/collections/all",
  ],
  royal: [
    "https://www.royalpadel.com.ar/productos/",
  ],
  blackcrown: [
    "https://blackcrown.es/categoria-producto/palas-de-padel/",
  ],
  akkeron: [
    "https://akkeron.com/",
  ],
};

const ACCESSORY_TOKENS = [
  "mochila",
  "bolso",
  "bag",
  "paletero",
  "camiseta",
  "remera",
  "mu n equiv",
  "manga",
  "overgrip",
  "grip",
  "pelota",
  "balls",
  "zapatilla",
  "shoes",
];

function normalize(input) {
  return String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(input) {
  return normalize(input).split(/\s+/).filter(Boolean);
}

function extractYear(modelName) {
  const m = String(modelName).match(/(20\d{2})/);
  return m ? Number(m[1]) : null;
}

function buildCanonicalModel(modelName) {
  return normalize(String(modelName).replace(/\b20\d{2}\b/g, "")).trim();
}

function scoreCandidate(targetName, targetYear, row) {
  const targetTokens = tokenize(targetName);
  const rowTokens = tokenize(row.name);
  const rowTokenSet = new Set(rowTokens);

  let score = 0;
  for (const t of targetTokens) {
    if (rowTokenSet.has(t)) score += 5;
  }

  const targetCanonical = buildCanonicalModel(targetName);
  const rowCanonical = buildCanonicalModel(row.name);
  if (targetCanonical && rowCanonical.includes(targetCanonical)) score += 20;
  if (rowCanonical && targetCanonical.includes(rowCanonical)) score += 10;

  if (targetYear && row.year === targetYear) score += 12;
  else if (targetYear && row.year && Math.abs(row.year - targetYear) === 1) score += 4;

  if (row.is_active) score += 4;
  score += Math.min(Number(row.popularity || 0), 5);

  const rowNorm = normalize(row.name);
  if (ACCESSORY_TOKENS.some((token) => rowNorm.includes(token))) {
    score -= 40;
  }

  return score;
}

function parseRawData(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function scoreExternalName(targetName, externalName) {
  const targetTokens = tokenize(targetName);
  const externalTokens = tokenize(externalName);
  const tokenSet = new Set(externalTokens);

  let score = 0;
  for (const t of targetTokens) {
    if (tokenSet.has(t)) score += 5;
  }

  const targetCanonical = buildCanonicalModel(targetName);
  const extCanonical = buildCanonicalModel(externalName);
  if (targetCanonical && extCanonical.includes(targetCanonical)) score += 20;
  if (extCanonical && targetCanonical.includes(extCanonical)) score += 10;

  if (ACCESSORY_TOKENS.some((token) => normalize(externalName).includes(token))) {
    score -= 40;
  }

  return score;
}

function getSourceModelName(entry) {
  if (typeof entry === "string") return entry;
  if (entry && typeof entry === "object" && typeof entry.model === "string") {
    return entry.model;
  }
  return "";
}

function getInputGroups(sourceBrand) {
  if (!sourceBrand || typeof sourceBrand !== "object") return {};
  if (sourceBrand.groups && typeof sourceBrand.groups === "object") return sourceBrand.groups;
  return sourceBrand;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no esta definida");

  const raw = await fs.readFile(INPUT_PATH, "utf8");
  const input = JSON.parse(raw);

  const conn = await mysql.createConnection({ uri: url });

  try {
    const [brandRows] = await conn.query("SELECT id, slug, name FROM brands");
    const knownBrandSlugs = new Set(brandRows.map((b) => b.slug));

    const report = {
      totalModels: 0,
      matchedModels: 0,
      unmatchedModels: 0,
      brandsMissingInDb: [],
      byBrand: {},
      generatedAt: new Date().toISOString(),
    };

    const output = {};

    for (const [brandKey, groupsSource] of Object.entries(input)) {
      const brandSlug = BRAND_TO_SLUG[brandKey] || normalize(brandKey).replace(/\s+/g, "-");
      const brandExists = knownBrandSlugs.has(brandSlug);
      const groups = getInputGroups(groupsSource);

      const [paddleRows] = brandExists
        ? await conn.query(
            `SELECT p.id, p.name, p.slug, p.year, p.shape, p.balance, p.weight_min, p.weight_max,
                    p.core_material, p.face_material, p.frame_material, p.surface, p.hardness,
                    p.level, p.play_style, p.popularity, p.thickness, p.image_url, p.description,
                    p.is_active, p.validated, p.raw_data
             FROM paddles p
             JOIN brands b ON b.id = p.brand_id
             WHERE b.slug = ?`,
            [brandSlug],
          )
        : [[]];

      const [brandSourceRows] = await conn.query(
        `SELECT source, external_name, external_url, status
         FROM paddle_source_links
         WHERE source = ?
         ORDER BY updated_at DESC`,
        [brandSlug],
      );

      const rows = Array.isArray(paddleRows) ? paddleRows : [];
      const sourceRows = Array.isArray(brandSourceRows) ? brandSourceRows : [];

      output[brandKey] = {
        brand_slug: brandSlug,
        brand_exists_in_db: brandExists,
        catalog_urls: BRAND_CATALOG_URLS[brandSlug] ?? [],
        groups: {},
      };

      report.byBrand[brandKey] = {
        brandSlug,
        brandExists,
        total: 0,
        matched: 0,
        unmatched: 0,
      };

      if (!brandExists) {
        report.brandsMissingInDb.push({ brand: brandKey, suggestedSlug: brandSlug });
      }

      for (const [groupName, modelList] of Object.entries(groups)) {
        output[brandKey].groups[groupName] = [];

        for (const sourceEntry of modelList) {
          const modelName = getSourceModelName(sourceEntry);
          if (!modelName) continue;

          report.totalModels += 1;
          report.byBrand[brandKey].total += 1;

          const targetYear = extractYear(modelName);
          const sortedCandidates = rows
            .map((r) => ({ row: r, score: scoreCandidate(modelName, targetYear, r) }))
            .sort((a, b) => b.score - a.score);

          const best = sortedCandidates[0];
          const second = sortedCandidates[1];
          const matched = Boolean(best && best.score >= 28 && (!second || best.score - second.score >= 2));

          let sourceUrls = [];
          let storeUrls = [];
          let bestStoreUrl = null;
          let attributes = null;
          let matchInfo = {
            matched: false,
            confidence: "none",
            db_paddle_id: null,
            db_name: null,
            db_slug: null,
            score: best ? best.score : 0,
            candidates: sortedCandidates.slice(0, 5).map((c) => ({
              id: c.row.id,
              name: c.row.name,
              slug: c.row.slug,
              score: c.score,
            })),
            notes: [],
          };

          if (matched) {
            const row = best.row;
            const [links] = await conn.query(
              `SELECT source, external_url, status
               FROM paddle_source_links
               WHERE paddle_id = ?
               ORDER BY updated_at DESC`,
              [row.id],
            );
            const [prices] = await conn.query(
              `SELECT product_url, price, currency, in_stock, scraped_at
               FROM current_prices
               WHERE paddle_id = ?
               ORDER BY in_stock DESC, scraped_at DESC`,
              [row.id],
            );

            sourceUrls = (links || [])
              .map((l) => ({ source: l.source, url: l.external_url, status: l.status }))
              .filter((x) => x.url);
            storeUrls = (prices || [])
              .map((p) => ({ url: p.product_url, price: p.price, currency: p.currency, in_stock: Boolean(p.in_stock), scraped_at: p.scraped_at }))
              .filter((x) => x.url);
            bestStoreUrl = storeUrls.length > 0 ? storeUrls[0].url : null;

            const rawData = parseRawData(row.raw_data);
            attributes = {
              year: row.year,
              shape: row.shape,
              balance: row.balance,
              weight_min: row.weight_min,
              weight_max: row.weight_max,
              core_material: row.core_material,
              face_material: row.face_material,
              frame_material: row.frame_material,
              surface: row.surface,
              hardness: row.hardness,
              level: row.level,
              play_style: row.play_style,
              popularity: row.popularity,
              thickness: row.thickness,
              image_url: row.image_url,
              description: row.description,
              is_active: Boolean(row.is_active),
              validated: Boolean(row.validated),
              raw_keys: rawData ? Object.keys(rawData).slice(0, 25) : [],
            };

            matchInfo = {
              matched: true,
              confidence: best.score >= 28 ? "high" : "medium",
              db_paddle_id: row.id,
              db_name: row.name,
              db_slug: row.slug,
              score: best.score,
              candidates: sortedCandidates.slice(0, 5).map((c) => ({
                id: c.row.id,
                name: c.row.name,
                slug: c.row.slug,
                score: c.score,
              })),
              notes: [],
            };

            report.matchedModels += 1;
            report.byBrand[brandKey].matched += 1;
          } else {
            matchInfo.notes.push(
              brandExists
                ? "No match confiable en DB para este nombre"
                : "Marca no existe en DB actual"
            );

            if (brandExists) {
              matchInfo.notes.push("Revisar candidatos sugeridos y confirmar modelo exacto");
            }
            report.unmatchedModels += 1;
            report.byBrand[brandKey].unmatched += 1;
          }

          const sourceCandidates = sourceRows
            .map((s) => ({
              source: s.source,
              external_name: s.external_name,
              external_url: s.external_url,
              status: s.status,
              score: scoreExternalName(modelName, s.external_name),
            }))
            .filter((s) => s.score >= 18)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

          const sourceCandidatesUrls = sourceCandidates.map((s) => ({
            source: s.source,
            external_name: s.external_name,
            url: s.external_url,
            status: s.status,
            score: s.score,
          }));

          if (!matched && sourceCandidatesUrls.length > 0) {
            matchInfo.notes.push("Hay URLs candidatas en fuentes scrapeadas para validar");
          }

          output[brandKey].groups[groupName].push({
            model: modelName,
            desired_year: targetYear,
            match: matchInfo,
            attributes,
            urls: {
              image_url: attributes?.image_url ?? null,
              best_store_url: bestStoreUrl,
              store_urls: storeUrls,
              source_urls: sourceUrls,
              source_candidate_urls: sourceCandidatesUrls,
            },
          });
        }
      }
    }

    await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
    await fs.writeFile(path.resolve("src/paletas.report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");

    console.log("JSON enriquecido generado en src/paletas.json");
    console.log("Reporte generado en src/paletas.report.json");
    console.log(`Total modelos: ${report.totalModels}`);
    console.log(`Matcheados: ${report.matchedModels}`);
    console.log(`Sin match: ${report.unmatchedModels}`);
    if (report.brandsMissingInDb.length > 0) {
      console.log("Marcas ausentes en DB:", report.brandsMissingInDb.map((b) => b.brand).join(", "));
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

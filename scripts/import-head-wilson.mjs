// Da de alta marcas Head y Wilson y carga sus modelos vigentes desde zonadepadel.
// Specs base por linea (research comunidad) + imagen real (og:image) descargada local.
// Uso: node --env-file=.env scripts/import-head-wilson.mjs [--apply]
import fs from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const NON_RACKET = /padel-shoes|padel-bag|zapatillas|backpack|overgrip|protective|grip|\bbag\b|mochila|wristband|cap-|gorra|camiseta|short|sock/i;
const apply = process.argv.includes("--apply");

// Modelos canonicos a buscar (nombre limpio + specs base + busqueda en zonadepadel).
const BRANDS = {
  head: {
    name: "Head",
    slug: "head",
    website_url: "https://www.head.com/padel",
    country: "AT",
    models: [
      { name: "Speed Pro 2026", q: "head speed pro 2026", shape: "round", balance: "medium", hardness: "medium", level: "pro", play_style: "control", popularity: 5, desc: "La pala de Arturo Coello. Forma redonda, control y manejo de gama alta." },
      { name: "Speed Motion 2026", q: "head speed motion 2026", shape: "round", balance: "medium", hardness: "medium", level: "advanced", play_style: "control", popularity: 4 },
      { name: "Gravity Pro 2026", q: "head gravity pro 2026", shape: "teardrop", balance: "medium", hardness: "medium", level: "advanced", play_style: "balance", popularity: 4 },
      { name: "Extreme Pro 2026", q: "head extreme pro 2026", shape: "diamond", balance: "high", hardness: "hard", level: "pro", play_style: "power", popularity: 4, desc: "Diamante de máxima potencia, 100% carbono y goma Power FOAM." },
      { name: "Extreme Motion 2026", q: "head extreme motion 2026", shape: "diamond", balance: "high", hardness: "medium", level: "advanced", play_style: "power", popularity: 3 },
      { name: "Coello Pro 2026", q: "head coello pro 2026", shape: "round", balance: "medium", hardness: "medium", level: "advanced", play_style: "control", popularity: 4, desc: "Línea Coello: control y precisión para jugadores de toque." },
      { name: "Radical Pro 2025", q: "head radical pro", shape: "teardrop", balance: "medium", hardness: "medium", level: "advanced", play_style: "balance", popularity: 3 },
      { name: "Evo Speed 2026", q: "head evo speed 2026", shape: "round", balance: "low", hardness: "soft", level: "beginner", play_style: "control", popularity: 3, desc: "Gama de inicio: cómoda, manejable y con buena salida de bola." },
    ],
  },
  wilson: {
    name: "Wilson",
    slug: "wilson",
    website_url: "https://www.wilson.com/en-us/padel",
    country: "US",
    models: [
      { name: "Bela Pro V3 2025", q: "wilson bela pro v3", shape: "diamond", balance: "high", hardness: "hard", level: "pro", play_style: "power", popularity: 4, desc: "Tope de gama Bela: diamante de potencia para juego ofensivo." },
      { name: "Bela V3 2025", q: "wilson bela v3 2025", shape: "teardrop", balance: "medium", hardness: "medium", level: "advanced", play_style: "balance", popularity: 3 },
      { name: "Bela LT V3 2025", q: "wilson bela lt v3", shape: "round", balance: "low", hardness: "soft", level: "intermediate", play_style: "control", popularity: 3, desc: "Versión ligera de la Bela: manejo y control." },
      { name: "Blade Pro 2025", q: "wilson blade pro padel", shape: "teardrop", balance: "high", hardness: "hard", level: "advanced", play_style: "power", popularity: 3 },
    ],
  },
};

const slugify = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function getHtml(url) {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html" }, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

async function findProduct(brandSlug, q) {
  const html = await getHtml(`https://www.zonadepadel.com/buscar?controller=search&s=${encodeURIComponent(q)}`);
  const links = [...new Set(html.match(/https:\/\/www\.zonadepadel\.com\/[a-z0-9-]+\/\d+-[^"' ]+\.html/gi) || [])]
    .filter((u) => u.toLowerCase().includes(brandSlug) && !NON_RACKET.test(u));
  const tokens = q.toLowerCase().split(" ").filter((t) => t.length > 1 && t !== brandSlug && t !== "padel");
  const ranked = links
    .map((u) => ({ u, s: tokens.reduce((acc, t) => acc + (u.toLowerCase().includes(t) ? 1 : 0), 0) }))
    .sort((a, b) => b.s - a.s);
  if (ranked.length === 0 || ranked[0].s === 0) return null;
  const productUrl = ranked[0].u;
  const page = await getHtml(productUrl);
  const og = page.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] || null;
  return { productUrl, image: og };
}

async function download(url, outFile) {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "image/*", referer: "https://www.zonadepadel.com/" }, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  await fs.writeFile(outFile, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no definida");
  const conn = await mysql.createConnection({ uri: process.env.DATABASE_URL });
  try {
    for (const cfg of Object.values(BRANDS)) {
      // brand
      let [[brand]] = [await conn.query("SELECT id FROM brands WHERE slug=?", [cfg.slug])].map((r) => r[0]);
      let brandId = brand?.id;
      if (!brandId) {
        if (apply) {
          const [res] = await conn.query(
            "INSERT INTO brands (name, slug, website_url, country) VALUES (?,?,?,?)",
            [cfg.name, cfg.slug, cfg.website_url, cfg.country],
          );
          brandId = res.insertId;
          console.log(`Marca creada: ${cfg.name} (id ${brandId})`);
        } else {
          console.log(`[dry] crear marca ${cfg.name}`);
        }
      } else {
        console.log(`Marca ya existe: ${cfg.name} (id ${brandId})`);
      }

      const outDir = path.resolve(`public/images/paddles/${cfg.slug}`);
      await fs.mkdir(outDir, { recursive: true });

      for (const m of cfg.models) {
        const slug = `${cfg.slug}-${slugify(m.name)}`;
        let imageUrl = null;
        let found = null;
        try {
          found = await findProduct(cfg.slug, m.q);
          if (found?.image) {
            const ext = found.image.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || "jpg";
            const fileName = `${slug}.${ext}`;
            if (apply) await download(found.image, path.join(outDir, fileName));
            imageUrl = `/images/paddles/${cfg.slug}/${fileName}`;
          }
        } catch (err) {
          console.log(`  img fail ${m.name}: ${err}`);
        }
        const yearMatch = m.name.match(/\b(20\d{2})\b/);
        const year = yearMatch ? Number(yearMatch[1]) : null;

        console.log(`  ${found ? "✓img" : "·noimg"} ${m.name} -> ${imageUrl || "(sin imagen)"}`);

        if (apply && brandId) {
          await conn.query(
            `INSERT INTO paddles (brand_id, name, slug, year, shape, balance, hardness, level, play_style, popularity, image_url, description, is_active)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1)
             ON DUPLICATE KEY UPDATE shape=VALUES(shape), balance=VALUES(balance), hardness=VALUES(hardness),
               level=VALUES(level), play_style=VALUES(play_style), popularity=VALUES(popularity),
               image_url=COALESCE(VALUES(image_url), image_url), is_active=1`,
            [brandId, m.name, slug, year, m.shape, m.balance, m.hardness, m.level, m.play_style, m.popularity ?? 3, imageUrl, m.desc ?? null],
          );
        }
      }
    }
    console.log(apply ? "\nAPLICADO." : "\n(dry-run, usar --apply)");
  } finally {
    await conn.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

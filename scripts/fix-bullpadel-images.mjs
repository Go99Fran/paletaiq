// Arregla imagenes de Bullpadel (apuntaban a paleteros/sudaderas o URLs 404).
// Fuente: buscador oficial bullpadel.com -> ficha de producto -> og:image.
// Uso: node --env-file=.env scripts/fix-bullpadel-images.mjs
import fs from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

const OUTPUT_DIR = path.resolve("public/images/paddles/bullpadel");
const PUBLIC_PREFIX = "/images/paddles/bullpadel";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const BAD = /paletero|mochila|bag|sudadera|chaqueta|camiseta|pantalon|funda|grip|overgrip|zapatilla|gorra/i;

async function getHtml(url, referer) {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html", ...(referer ? { referer } : {}) },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

async function download(url, outFile) {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "image/*", referer: "https://www.bullpadel.com/" }, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  await fs.writeFile(outFile, Buffer.from(await res.arrayBuffer()));
}

// "PALA BULLPADEL VERTEX 04 MX 24" -> tokens significativos
function tokens(name) {
  return name
    .toLowerCase()
    .replace(/pala|bullpadel/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length > 1);
}

// Palabras genericas que no identifican el modelo (no deben decidir el match).
const GENERIC = new Set(["power", "light", "control", "ctrl", "pwr", "hybrid", "comfort", "soft", "hard", "pro", "mx", "tf", "w", "25", "24", "26", "pp26", "evo", "edge"]);

function scoreLink(url, wanted) {
  const slug = url.toLowerCase();
  if (BAD.test(slug)) return -1;
  // El primer token significativo es el nombre de la linea (k2, vertex, ionic, hack...).
  const key = wanted.find((t) => !GENERIC.has(t));
  if (key && !slug.includes(key)) return -1; // sin la palabra clave del modelo, no es match
  let score = 0;
  for (const t of wanted) if (slug.includes(t)) score += GENERIC.has(t) ? 1 : 5;
  return score;
}

async function findProductImage(name) {
  const wanted = tokens(name);
  const query = encodeURIComponent(wanted.join(" "));
  const searchUrl = `https://www.bullpadel.com/es/buscar?controller=search&s=${query}`;
  const html = await getHtml(searchUrl);

  const links = [...new Set(html.match(/https:\/\/www\.bullpadel\.com\/es\/[a-z0-9-]+\/\d+-pala-bullpadel[^"' ]*/gi) || [])];
  if (links.length === 0) return null;

  const ranked = links
    .map((u) => ({ u, s: scoreLink(u, wanted) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s);
  if (ranked.length === 0 || ranked[0].s === 0) return null;

  const productUrl = ranked[0].u;
  const page = await getHtml(productUrl, searchUrl);
  const og = page.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  const img = og?.[1] || null;
  if (!img || BAD.test(img)) return null;
  return { img, productUrl };
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no definida");
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const conn = await mysql.createConnection({ uri: process.env.DATABASE_URL });
  try {
    const [rows] = await conn.query(
      `SELECT p.id, p.slug, p.name FROM paddles p JOIN brands b ON b.id=p.brand_id
       WHERE p.is_active=1 AND b.slug='bullpadel' ORDER BY p.id`,
    );

    const details = [];
    for (const row of rows) {
      try {
        const found = await findProductImage(row.name);
        if (!found) {
          details.push({ id: row.id, name: row.name, status: "no-match" });
          continue;
        }
        const ext = found.img.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || "jpg";
        const fileName = `${row.slug}.${ext}`.replace(/[^a-zA-Z0-9._-]/g, "-");
        const outFile = path.join(OUTPUT_DIR, fileName);
        await download(found.img, outFile);
        const localUrl = `${PUBLIC_PREFIX}/${fileName}`;
        await conn.query("UPDATE paddles SET image_url=? WHERE id=?", [localUrl, row.id]);
        details.push({ id: row.id, name: row.name, status: "ok", source: found.img });
      } catch (err) {
        details.push({ id: row.id, name: row.name, status: "error", error: String(err) });
      }
    }
    console.table(details.map((d) => ({ id: d.id, name: d.name, status: d.status })));
    console.log(`Bullpadel: ${details.filter((d) => d.status === "ok").length}/${rows.length} ok`);
  } finally {
    await conn.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

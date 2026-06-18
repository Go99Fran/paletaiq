// Arregla imagenes buscando en zonadepadel.com (buscador limpio, og:image = foto real).
// Sirve de fuente para marcas cuyas URLs propias estan rotas (Babolat) o como fallback.
// Uso: node --env-file=.env scripts/fix-images-zonadepadel.mjs --brand=babolat
import fs from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const BAD = /logo|sprite|icon|payment|paletero|mochila|\bbag\b|sudadera|chaqueta|banner|flag|favicon|grip/i;
const GENERIC = new Set(["air","counter","technical","viper","veron","vertuo","soft","hard","pro","junior","light","control","ctrl","power","2","6","0","26","25","24","by","de"]);

function brandArg() {
  const a = process.argv.find((x) => x.startsWith("--brand="));
  if (!a) throw new Error("falta --brand=<slug>");
  return a.split("=")[1];
}

async function getHtml(url, referer) {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html", ...(referer ? { referer } : {}) }, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

async function download(url, outFile, referer) {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "image/*", referer: referer || "https://www.zonadepadel.com/" }, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  await fs.writeFile(outFile, Buffer.from(await res.arrayBuffer()));
}

function tokens(name, brand) {
  return name
    .toLowerCase()
    .replace(new RegExp(brand, "g"), " ")
    .replace(/pala|padel|pádel/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length > 1);
}

async function findImage(name, brand) {
  const wanted = tokens(name, brand);
  const query = encodeURIComponent(`${brand} ${wanted.join(" ")}`);
  const html = await getHtml(`https://www.zonadepadel.com/buscar?controller=search&s=${query}`);
  const links = [...new Set(html.match(/https:\/\/www\.zonadepadel\.com\/[a-z0-9-]+\/\d+-[^"' ]+\.html/gi) || [])]
    .filter((u) => u.toLowerCase().includes(brand));
  if (links.length === 0) return null;

  const key = wanted.find((t) => !GENERIC.has(t)); // palabra distintiva del modelo
  const ranked = links
    .map((u) => {
      const s = u.toLowerCase();
      if (key && !s.includes(key)) return { u, score: -1 };
      let score = 0;
      for (const t of wanted) if (s.includes(t)) score += GENERIC.has(t) ? 1 : 5;
      return { u, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  if (ranked.length === 0) return null;

  const productUrl = ranked[0].u;
  const page = await getHtml(productUrl);
  const og = page.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  const img = og?.[1] || null;
  if (!img || BAD.test(img)) return null;
  return { img, productUrl };
}

async function main() {
  const brand = brandArg();
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no definida");
  const outDir = path.resolve(`public/images/paddles/${brand}`);
  const prefix = `/images/paddles/${brand}`;
  await fs.mkdir(outDir, { recursive: true });

  const conn = await mysql.createConnection({ uri: process.env.DATABASE_URL });
  try {
    const [rows] = await conn.query(
      `SELECT p.id, p.slug, p.name FROM paddles p JOIN brands b ON b.id=p.brand_id
       WHERE p.is_active=1 AND b.slug=? ORDER BY p.id`,
      [brand],
    );
    const details = [];
    for (const row of rows) {
      try {
        const found = await findImage(row.name, brand);
        if (!found) { details.push({ id: row.id, name: row.name, status: "no-match" }); continue; }
        const ext = found.img.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || "jpg";
        const fileName = `${row.slug}.${ext}`.replace(/[^a-zA-Z0-9._-]/g, "-");
        await download(found.img, path.join(outDir, fileName), found.productUrl);
        const localUrl = `${prefix}/${fileName}`;
        await conn.query("UPDATE paddles SET image_url=? WHERE id=?", [localUrl, row.id]);
        details.push({ id: row.id, name: row.name, status: "ok" });
      } catch (err) {
        details.push({ id: row.id, name: row.name, status: "error", error: String(err) });
      }
    }
    console.table(details.map((d) => ({ id: d.id, name: d.name, status: d.status })));
    console.log(`${brand}: ${details.filter((d) => d.status === "ok").length}/${rows.length} ok`);
  } finally {
    await conn.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

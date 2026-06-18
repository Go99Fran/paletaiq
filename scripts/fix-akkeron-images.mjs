// Arregla imagenes de Akkeron (estaban apuntando al logo k.gif).
// Fuente: listado oficial akkeron.com/palas-2025/ (imagenes <modelo>_1-600x600.jpg).
// Uso: node --env-file=.env scripts/fix-akkeron-images.mjs
import fs from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

const LISTING_URL = "https://akkeron.com/palas-2025/";
const OUTPUT_DIR = path.resolve("public/images/paddles/akkeron");
const PUBLIC_PREFIX = "/images/paddles/akkeron";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

// Mapea el slug/nombre del modelo al token base de la imagen en el sitio.
function modelToken(name) {
  const n = name.toLowerCase();
  const isBlack = /\bblack\b/.test(n);
  const base = n
    .replace(/[áä]/g, "a").replace(/[éë]/g, "e").replace(/[íï]/g, "i").replace(/[óö]/g, "o").replace(/[úü]/g, "u")
    .replace(/\ba25\b/g, "")
    .replace(/\bedition\b/g, "")
    .replace(/\bblack\b/g, "")
    .replace(/[^a-z]/g, "")
    .trim();
  return { base, isBlack };
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html" }, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

async function downloadImage(url, outFile) {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "image/*", referer: "https://akkeron.com/" }, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  await fs.writeFile(outFile, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no definida");
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const html = await fetchText(LISTING_URL);
  const re = /https:\/\/akkeron\.com\/wp-content\/uploads\/2025\/[^"' ]+?-600x600\.(?:jpg|jpeg|png|webp)/gi;
  const urls = [...new Set(html.match(re) || [])];

  // Indexa por token: poseidon -> .../poseidon_1-600x600.jpg, poseidon_black -> negro.
  const byKey = new Map();
  for (const u of urls) {
    const file = u.split("/").pop().toLowerCase();
    const isBlack = /_black_/.test(file);
    const token = file.replace(/_black/, "").replace(/_\d.*$/, "").replace(/-600x600.*$/, "");
    byKey.set(`${token}|${isBlack}`, u);
  }

  const conn = await mysql.createConnection({ uri: process.env.DATABASE_URL });
  try {
    const [rows] = await conn.query(
      `SELECT p.id, p.slug, p.name FROM paddles p JOIN brands b ON b.id=p.brand_id
       WHERE p.is_active=1 AND b.slug='akkeron' ORDER BY p.id`,
    );

    const details = [];
    for (const row of rows) {
      const { base, isBlack } = modelToken(row.name);
      const candidate = byKey.get(`${base}|${isBlack}`) || byKey.get(`${base}|false`) || null;
      if (!candidate) {
        details.push({ id: row.id, name: row.name, status: "no-match", token: base });
        continue;
      }
      try {
        const ext = candidate.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || "jpg";
        const fileName = `${row.slug}.${ext}`.replace(/[^a-zA-Z0-9._-]/g, "-");
        const outFile = path.join(OUTPUT_DIR, fileName);
        await downloadImage(candidate, outFile);
        const localUrl = `${PUBLIC_PREFIX}/${fileName}`;
        await conn.query("UPDATE paddles SET image_url=? WHERE id=?", [localUrl, row.id]);
        details.push({ id: row.id, name: row.name, status: "ok", source: candidate, local: localUrl });
      } catch (err) {
        details.push({ id: row.id, name: row.name, status: "error", error: String(err) });
      }
    }
    console.table(details.map((d) => ({ id: d.id, name: d.name, status: d.status })));
    const ok = details.filter((d) => d.status === "ok").length;
    console.log(`Akkeron images: ${ok}/${rows.length} ok`);
  } finally {
    await conn.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

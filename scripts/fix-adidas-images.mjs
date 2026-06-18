import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import mysql from "mysql2/promise";

const OUTPUT_DIR = path.resolve("public/images/paddles/adidas");
const PUBLIC_PREFIX = "/images/paddles/adidas";

const FALLBACK_SEARCH_BASE = "https://allforpadel.com/es/busqueda?controller=search&s=";

function slugToQuery(slug) {
  return slug
    .replace(/^adidas-/, "")
    .replace(/-/g, " ")
    .replace(/\b\d{2,4}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

async function ensureDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return await res.text();
}

function pickFirstImageFromHtml(html) {
  const candidates = [];

  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogMatch && ogMatch[1]) candidates.push(ogMatch[1]);

  const imgRe = /<img[^>]+(?:data-src|src)=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = imgRe.exec(html)) !== null) {
    const url = m[1];
    if (!url) continue;
    if (/logo|icon|sprite|payment|banner|blog|paletero|mochila|bag/i.test(url)) continue;
    if (!/\.(jpg|jpeg|png|webp)(\?|$)/i.test(url)) continue;
    candidates.push(url);
  }

  const normalized = candidates
    .map((u) => u.startsWith("//") ? `https:${u}` : u)
    .map((u) => {
      if (u.startsWith("/")) return `https://allforpadel.com${u}`;
      return u;
    })
    .filter((u) => /^https?:\/\//i.test(u));

  return normalized[0] || null;
}

async function downloadImage(url, outFile) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      referer: "https://allforpadel.com/",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outFile, buf);
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL no esta definida");

  await ensureDir();

  const conn = await mysql.createConnection({ uri: dbUrl });
  try {
    const [rows] = await conn.query(
      `SELECT p.id, p.slug, p.name
       FROM paddles p
       JOIN brands b ON b.id = p.brand_id
       WHERE p.is_active = 1
         AND b.slug = 'adidas'
       ORDER BY p.id DESC`,
    );

    let ok = 0;
    let failed = 0;
    const details = [];

    for (const row of rows) {
      const slug = String(row.slug);
      const query = encodeURIComponent(slugToQuery(slug) || String(row.name));
      const searchUrl = `${FALLBACK_SEARCH_BASE}${query}`;

      try {
        const html = await fetchText(searchUrl);
        const imageUrl = pickFirstImageFromHtml(html);

        if (!imageUrl) {
          failed += 1;
          details.push({ id: row.id, slug, status: "no-image-found", source: searchUrl });
          continue;
        }

        const ext = imageUrl.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)?.[1]?.toLowerCase() || "jpg";
        const fileName = sanitizeFilename(`${slug}.${ext}`);
        const outFile = path.join(OUTPUT_DIR, fileName);
        await downloadImage(imageUrl, outFile);

        const localUrl = `${PUBLIC_PREFIX}/${fileName}`;
        await conn.query("UPDATE paddles SET image_url = ? WHERE id = ?", [localUrl, row.id]);

        ok += 1;
        details.push({ id: row.id, slug, status: "ok", source: imageUrl, local: localUrl });
      } catch (err) {
        failed += 1;
        details.push({
          id: row.id,
          slug,
          status: "error",
          error: err instanceof Error ? err.message : String(err),
          source: searchUrl,
        });
      }
    }

    const reportPath = path.resolve("src/adidas-image-fix-report.json");
    await fs.writeFile(
      reportPath,
      `${JSON.stringify({ generatedAt: new Date().toISOString(), total: rows.length, ok, failed, details }, null, 2)}\n`,
      "utf8",
    );

    console.log(`Adidas image fix done. total=${rows.length} ok=${ok} failed=${failed}`);
    console.log(`Report: ${reportPath}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Verificación rápida post-importación. Uso: node --env-file=.env scripts/verify-import.mjs
import mysql from "mysql2/promise";

const c = await mysql.createConnection({ uri: process.env.DATABASE_URL });
const q = async (sql) => (await c.query(sql))[0];

for (const table of [
  "paddles",
  "brands",
  "stores",
  "current_prices",
  "prices",
  "paddle_translations",
  "paddle_source_links",
]) {
  console.log(`${table}:`, (await q(`SELECT COUNT(*) n FROM ${table}`))[0].n);
}
console.log("por shape:", await q("SELECT shape, COUNT(*) n FROM paddles GROUP BY shape"));
console.log("por level:", await q("SELECT level, COUNT(*) n FROM paddles GROUP BY level"));
console.log("por play_style:", await q("SELECT play_style, COUNT(*) n FROM paddles GROUP BY play_style"));
console.log(
  "sample:",
  await q(
    `SELECT p.name, b.name brand, p.shape, p.balance, p.hardness, p.level, p.play_style, cp.price
     FROM paddles p
     JOIN brands b ON b.id = p.brand_id
     LEFT JOIN current_prices cp ON cp.paddle_id = p.id
     ORDER BY p.id LIMIT 5`,
  ),
);
await c.end();

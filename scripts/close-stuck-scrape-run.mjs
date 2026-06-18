import process from "node:process";
import mysql from "mysql2/promise";

const runId = Number(process.argv[2] || "0");
if (!Number.isFinite(runId) || runId <= 0) {
  console.error("Uso: node --env-file=.env scripts/close-stuck-scrape-run.mjs <runId>");
  process.exit(1);
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL no esta definida");

  const conn = await mysql.createConnection({ uri: dbUrl });
  try {
    await conn.query(
      `UPDATE scrape_runs
       SET status = 'error', finished_at = NOW(),
           error_message = 'Cancelled: stuck run terminated by operator'
       WHERE id = ? AND status = 'running'`,
      [runId],
    );

    const [rows] = await conn.query(
      `SELECT id, source, status, started_at, finished_at, items_found, items_created, items_updated, error_message
       FROM scrape_runs
       WHERE id = ?`,
      [runId],
    );

    console.table(rows);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

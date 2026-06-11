/**
 * Runner de migraciones mínimo (sin ORM).
 * Aplica en orden alfabético los .sql de db/migrations/ que no estén en _migrations.
 *
 * Uso: npm run db:migrate   (lee DATABASE_URL de .env via --env-file)
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import mysql from "mysql2/promise";

const MIGRATIONS_DIR = path.resolve("db/migrations");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL no está definida (¿existe .env?)");
    process.exit(1);
  }

  const conn = await mysql.createConnection({ uri: url, multipleStatements: true });

  await conn.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [rows] = await conn.query("SELECT name FROM _migrations");
  const applied = new Set(rows.map((r) => r.name));

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
    console.log(`Aplicando ${file}...`);
    try {
      await conn.query(sql);
      await conn.query("INSERT INTO _migrations (name) VALUES (?)", [file]);
      count++;
    } catch (err) {
      console.error(`ERROR en ${file}: ${err.message}`);
      console.error("Migración abortada. Las anteriores quedaron aplicadas.");
      await conn.end();
      process.exit(1);
    }
  }

  console.log(count === 0 ? "Nada que aplicar: DB al día." : `${count} migración(es) aplicada(s).`);
  await conn.end();
}

main();

import mysql, { type Pool } from "mysql2/promise";

/**
 * Pool de conexiones MySQL (singleton por proceso).
 * Solo los repositorios de infrastructure/db acceden a esto: el SQL no sale de esa capa.
 */
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL no está definida");
    }
    pool = mysql.createPool({
      uri: url,
      connectionLimit: 10,
      namedPlaceholders: true,
      // Railway expone MySQL por TCP plano; si se usa un proveedor con TLS,
      // agregar ?ssl=true a DATABASE_URL y manejarlo acá.
    });
  }
  return pool;
}

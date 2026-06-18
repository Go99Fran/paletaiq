/**
 * Limpieza puntual de catálogo para PaletaIQ.
 *
 * Objetivos:
 * - Desactivar pickeball en Vairo.
 * - Corregir casos de imágenes inválidas (logo/bolso) en Adidas y Kombat.
 * - Desactivar líneas no deseadas de Royal ("Mangas Black").
 * - Reducir ruido de Adidas: mantener activas las más relevantes/actuales.
 *
 * Uso:
 *   node --env-file=.env scripts/db-sanitize-catalog.mjs --apply
 *   node --env-file=.env scripts/db-sanitize-catalog.mjs          (solo auditoría)
 */
import process from "node:process";
import mysql from "mysql2/promise";

const applyChanges = process.argv.includes("--apply");

function printSection(title) {
  console.log("\n" + "=".repeat(80));
  console.log(title);
  console.log("=".repeat(80));
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL no está definida");
  }

  const conn = await mysql.createConnection({ uri: url });

  try {
    printSection("AUDITORIA PREVIA");

    const [brandCounts] = await conn.query(`
      SELECT b.slug AS brand, COUNT(*) AS total
      FROM paddles p
      JOIN brands b ON b.id = p.brand_id
      WHERE p.is_active = 1
      GROUP BY b.slug
      ORDER BY total DESC
      LIMIT 20
    `);
    console.table(brandCounts);

    const [vairoPickeball] = await conn.query(`
      SELECT p.id, p.name, p.slug, p.image_url
      FROM paddles p
      JOIN brands b ON b.id = p.brand_id
      WHERE p.is_active = 1
        AND b.slug = 'vairo'
        AND (
          LOWER(p.name) LIKE '%pickle%'
          OR LOWER(p.name) LIKE '%pickeball%'
          OR LOWER(p.slug) LIKE '%pickle%'
          OR LOWER(p.description) LIKE '%pickle%'
        )
      ORDER BY p.id DESC
    `);
    console.log(`Vairo pickeball detectadas: ${vairoPickeball.length}`);
    console.table(vairoPickeball.slice(0, 25));

    const [adidasLogoImages] = await conn.query(`
      SELECT p.id, p.name, p.slug, p.image_url
      FROM paddles p
      JOIN brands b ON b.id = p.brand_id
      WHERE p.is_active = 1
        AND b.slug = 'adidas'
        AND p.image_url IS NOT NULL
        AND (
          LOWER(p.image_url) LIKE '%logo%'
          OR LOWER(p.image_url) LIKE '%adidas.com/%logo%'
          OR LOWER(p.image_url) LIKE '%/logo.svg%'
        )
      ORDER BY p.id DESC
    `);
    console.log(`Adidas con imagen tipo logo: ${adidasLogoImages.length}`);
    console.table(adidasLogoImages.slice(0, 25));

    const [kombatBadLine] = await conn.query(`
      SELECT p.id, p.name, p.slug, p.image_url
      FROM paddles p
      JOIN brands b ON b.id = p.brand_id
      WHERE p.is_active = 1
        AND b.slug = 'kombat'
        AND (
          LOWER(p.name) REGEXP 'fuji|teide|vesubio'
          OR LOWER(p.slug) REGEXP 'fuji|teide|vesubio'
          OR LOWER(p.image_url) LIKE '%bolso%'
          OR LOWER(p.image_url) LIKE '%bag%'
        )
      ORDER BY p.id DESC
    `);
    console.log(`Kombat (Fuji/Teide/Vesubio o imagen bolso): ${kombatBadLine.length}`);
    console.table(kombatBadLine.slice(0, 25));

    const [royalMangasBlack] = await conn.query(`
      SELECT p.id, p.name, p.slug, p.image_url
      FROM paddles p
      JOIN brands b ON b.id = p.brand_id
      WHERE p.is_active = 1
        AND b.slug IN ('royal-padel', 'royalpadel', 'royal')
        AND (
          LOWER(p.name) LIKE '%mangas black%'
          OR LOWER(p.slug) LIKE '%mangas-black%'
          OR LOWER(p.name) LIKE '%mangas%'
        )
      ORDER BY p.id DESC
    `);
    console.log(`Royal "Mangas Black" detectadas: ${royalMangasBlack.length}`);
    console.table(royalMangasBlack.slice(0, 25));

    const [adidasTotal] = await conn.query(`
      SELECT COUNT(*) AS total
      FROM paddles p
      JOIN brands b ON b.id = p.brand_id
      WHERE p.is_active = 1 AND b.slug = 'adidas'
    `);
    console.log(`Adidas activas actuales: ${adidasTotal[0]?.total ?? 0}`);

    if (!applyChanges) {
      printSection("MODO AUDITORIA (sin cambios)");
      console.log("Ejecuta con --apply para aplicar la sanitización.");
      return;
    }

    printSection("APLICANDO SANITIZACION");

    await conn.beginTransaction();

    // 1) Vairo pickeball fuera de catálogo (soft-delete por is_active).
    const [vairoRes] = await conn.query(`
      UPDATE paddles p
      JOIN brands b ON b.id = p.brand_id
      SET p.is_active = 0
      WHERE p.is_active = 1
        AND b.slug = 'vairo'
        AND (
          LOWER(p.name) LIKE '%pickle%'
          OR LOWER(p.name) LIKE '%pickeball%'
          OR LOWER(p.slug) LIKE '%pickle%'
          OR LOWER(p.description) LIKE '%pickle%'
        )
    `);

    // 2) Kombat línea errónea (Fuji/Teide/Vesubio + posibles bolsas) fuera de catálogo.
    const [kombatRes] = await conn.query(`
      UPDATE paddles p
      JOIN brands b ON b.id = p.brand_id
      SET p.is_active = 0
      WHERE p.is_active = 1
        AND b.slug = 'kombat'
        AND (
          LOWER(p.name) REGEXP 'fuji|teide|vesubio'
          OR LOWER(p.slug) REGEXP 'fuji|teide|vesubio'
          OR LOWER(p.image_url) LIKE '%bolso%'
          OR LOWER(p.image_url) LIKE '%bag%'
        )
    `);

    // 3) Royal "Mangas Black" fuera de catálogo.
    const [royalRes] = await conn.query(`
      UPDATE paddles p
      JOIN brands b ON b.id = p.brand_id
      SET p.is_active = 0
      WHERE p.is_active = 1
        AND b.slug IN ('royal-padel', 'royalpadel', 'royal')
        AND (
          LOWER(p.name) LIKE '%mangas black%'
          OR LOWER(p.slug) LIKE '%mangas-black%'
          OR LOWER(p.name) LIKE '%mangas%'
        )
    `);

    // 4) Adidas con imagen de logo: limpiar image_url para forzar placeholder controlado en UI
    //    hasta que entre scraping correcto de imagen de producto.
    const [adidasImageRes] = await conn.query(`
      UPDATE paddles p
      JOIN brands b ON b.id = p.brand_id
      SET p.image_url = NULL
      WHERE b.slug = 'adidas'
        AND p.image_url IS NOT NULL
        AND (
          LOWER(p.image_url) LIKE '%logo%'
          OR LOWER(p.image_url) LIKE '%adidas.com/%logo%'
          OR LOWER(p.image_url) LIKE '%/logo.svg%'
        )
    `);

    // 5) Achique Adidas: mantener un set útil para recomendación/listado.
    //    Regla simple y reversible: dejar activas solo las top 30 por (popularity desc, year desc, id desc).
    const [adidasIdsRows] = await conn.query(`
      SELECT p.id
      FROM paddles p
      JOIN brands b ON b.id = p.brand_id
      WHERE p.is_active = 1
        AND b.slug = 'adidas'
      ORDER BY p.popularity DESC, COALESCE(p.year, 0) DESC, p.id DESC
    `);

    const adidasIds = adidasIdsRows.map((r) => r.id);
    let adidasTrimmed = 0;
    if (adidasIds.length > 30) {
      const keepIds = adidasIds.slice(0, 30);
      const placeholders = keepIds.map(() => "?").join(",");
      const [adidasTrimRes] = await conn.query(
        `
          UPDATE paddles p
          JOIN brands b ON b.id = p.brand_id
          SET p.is_active = 0
          WHERE p.is_active = 1
            AND b.slug = 'adidas'
            AND p.id NOT IN (${placeholders})
        `,
        keepIds,
      );
      adidasTrimmed = adidasTrimRes.affectedRows ?? 0;
    }

    await conn.commit();

    printSection("RESUMEN DE CAMBIOS");
    console.table([
      { action: 'disable_vairo_pickleball', affected: vairoRes.affectedRows ?? 0 },
      { action: 'disable_kombat_fuji_teide_vesubio', affected: kombatRes.affectedRows ?? 0 },
      { action: 'disable_royal_mangas_black', affected: royalRes.affectedRows ?? 0 },
      { action: 'clear_adidas_logo_images', affected: adidasImageRes.affectedRows ?? 0 },
      { action: 'trim_adidas_to_top_30', affected: adidasTrimmed },
    ]);

    const [postBrandCounts] = await conn.query(`
      SELECT b.slug AS brand, COUNT(*) AS total
      FROM paddles p
      JOIN brands b ON b.id = p.brand_id
      WHERE p.is_active = 1
      GROUP BY b.slug
      ORDER BY total DESC
      LIMIT 20
    `);

    printSection("AUDITORIA POST-SANITIZACION");
    console.table(postBrandCounts);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Error en sanitización:", err);
  process.exit(1);
});

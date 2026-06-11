/**
 * Importación one-shot del catálogo de palas existente en Supabase (proyecto ballgames)
 * hacia el esquema MySQL de PaletaIQ. Idempotente: upsertea por slug, se puede re-correr.
 *
 * Qué importa:
 *  - brands           -> brands
 *  - palas            -> paddles (+ paddle_translations es/en, + paddle_source_links)
 *  - precio_ars       -> stores ("tienda oficial" por marca) + prices + current_prices
 *
 * Uso: npm run db:import-supabase
 * Requiere en .env: DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import mysql from "mysql2/promise";
import process from "node:process";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

// Vocabulario del catálogo origen (español) -> enums canónicos de PaletaIQ
const SHAPE_MAP = { redonda: "round", lagrima: "teardrop", diamante: "diamond", hibrida: "hybrid" };
const BALANCE_MAP = { bajo: "low", medio: "medium", alto: "high" };
const HARDNESS_MAP = { blanda: "soft", media: "medium", dura: "hard" };
const LEVEL_MAP = {
  pro: "pro",
  avanzado: "advanced",
  intermedio: "intermediate",
  iniciacion: "beginner",
  junior: "beginner",
};
const STYLE_MAP = {
  defensivo: "control",
  control: "control",
  polivalente: "balance",
  equilibrado: "balance",
  ofensivo: "power",
  potencia: "power",
};
const SURFACE_MAP = { rugosa: "rough", lisa: "smooth" };

function mapEnum(map, value) {
  if (!value) return null;
  return map[String(value).toLowerCase().trim()] ?? null;
}

async function fetchAll(table, select) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Range: `${from}-${from + pageSize - 1}`,
        },
      },
    );
    if (!res.ok) throw new Error(`Supabase ${table}: HTTP ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

async function main() {
  for (const [name, value] of Object.entries({ SUPABASE_URL, SUPABASE_KEY, DATABASE_URL })) {
    if (!value) {
      console.error(`Falta la env var ${name} (¿existe .env?)`);
      process.exit(1);
    }
  }

  const conn = await mysql.createConnection({ uri: DATABASE_URL, namedPlaceholders: true });
  const startedAt = new Date();
  let created = 0;
  let updated = 0;

  try {
    console.log("Leyendo catálogo de Supabase...");
    const [brands, palas] = await Promise.all([
      fetchAll("brands", "*"),
      fetchAll("palas", "*"),
    ]);
    console.log(`  ${brands.length} marcas, ${palas.length} palas.`);

    // 1. Marcas (upsert por slug) + tienda oficial por marca
    const brandIdBySupabaseId = new Map();
    const storeIdByBrandSlug = new Map();

    for (const b of brands) {
      await conn.execute(
        `INSERT INTO brands (name, slug, logo_url, website_url)
         VALUES (:name, :slug, :logo, :web) AS new
         ON DUPLICATE KEY UPDATE name = new.name, logo_url = new.logo_url, website_url = new.website_url`,
        { name: b.nombre, slug: b.slug, logo: b.logo_url, web: b.web_oficial },
      );
      const [[brandRow]] = await conn.execute("SELECT id FROM brands WHERE slug = :slug", {
        slug: b.slug,
      });
      brandIdBySupabaseId.set(b.id, brandRow.id);

      const storeSlug = `oficial-${b.slug}`;
      await conn.execute(
        `INSERT INTO stores (name, slug, website_url, country)
         VALUES (:name, :slug, :web, 'ARG') AS new
         ON DUPLICATE KEY UPDATE name = new.name, website_url = new.website_url`,
        { name: `${b.nombre} (tienda oficial)`, slug: storeSlug, web: b.web_oficial },
      );
      const [[storeRow]] = await conn.execute("SELECT id FROM stores WHERE slug = :slug", {
        slug: storeSlug,
      });
      storeIdByBrandSlug.set(b.slug, storeRow.id);
    }
    console.log("Marcas y tiendas oficiales listas.");

    // 2. Palas
    for (const p of palas) {
      const brandId = brandIdBySupabaseId.get(p.brand_id);
      if (!brandId) {
        console.warn(`  SKIP ${p.slug}: marca desconocida ${p.brand_id}`);
        continue;
      }
      const brandSlug = brands.find((b) => b.id === p.brand_id)?.slug;

      // Conservamos el origen completo (menos el raw_data pesado) para auditoría
      const { raw_data, ...supabaseRow } = p;
      const rawData = JSON.stringify({
        imported_from: "supabase-ballgames",
        supabase: supabaseRow,
        ai_enrichment: raw_data?.ai_enrichment ?? null,
      });

      const params = {
        brand_id: brandId,
        name: p.nombre,
        slug: p.slug,
        year: p.ano,
        shape: mapEnum(SHAPE_MAP, p.forma),
        balance: mapEnum(BALANCE_MAP, p.balance),
        weight_min: p.peso_min_g,
        weight_max: p.peso_max_g,
        core_material: p.nucleo,
        face_material: p.cara,
        frame_material: p.marco,
        surface: mapEnum(SURFACE_MAP, p.superficie),
        hardness: mapEnum(HARDNESS_MAP, p.dureza),
        level: mapEnum(LEVEL_MAP, p.categoria) ?? mapEnum(LEVEL_MAP, p.nivel_juego?.[0]),
        play_style: mapEnum(STYLE_MAP, p.tipo_juego?.[0]),
        image_url: p.imagen_principal_url,
        description: p.descripcion_oficial,
        raw_data: rawData,
        validated: p.validated ? 1 : 0,
        validated_by: p.validated_by,
        validated_at: p.validated_at ? new Date(p.validated_at) : null,
      };

      const [result] = await conn.execute(
        `INSERT INTO paddles
           (brand_id, name, slug, year, shape, balance, weight_min, weight_max,
            core_material, face_material, frame_material, surface, hardness, level,
            play_style, image_url, description, raw_data, validated, validated_by, validated_at)
         VALUES
           (:brand_id, :name, :slug, :year, :shape, :balance, :weight_min, :weight_max,
            :core_material, :face_material, :frame_material, :surface, :hardness, :level,
            :play_style, :image_url, :description, :raw_data, :validated, :validated_by, :validated_at) AS new
         ON DUPLICATE KEY UPDATE
           brand_id = new.brand_id, name = new.name, year = new.year, shape = new.shape,
           balance = new.balance, weight_min = new.weight_min, weight_max = new.weight_max,
           core_material = new.core_material, face_material = new.face_material,
           frame_material = new.frame_material, surface = new.surface, hardness = new.hardness,
           level = new.level, play_style = new.play_style, image_url = new.image_url,
           description = new.description, raw_data = new.raw_data, validated = new.validated,
           validated_by = new.validated_by, validated_at = new.validated_at`,
        params,
      );
      // affectedRows: 1 = insert, 2 = update (convención de ON DUPLICATE KEY)
      if (result.affectedRows === 1) created++;
      else updated++;

      const [[paddleRow]] = await conn.execute("SELECT id FROM paddles WHERE slug = :slug", {
        slug: p.slug,
      });
      const paddleId = paddleRow.id;

      // Traducciones
      for (const [locale, text] of [
        ["es", p.descripcion_es],
        ["en", p.descripcion_en],
      ]) {
        if (!text) continue;
        await conn.execute(
          `INSERT INTO paddle_translations (paddle_id, locale, description)
           VALUES (:paddle_id, :locale, :description) AS new
           ON DUPLICATE KEY UPDATE description = new.description`,
          { paddle_id: paddleId, locale, description: text },
        );
      }

      // Links a fuentes (matcheadas: vienen del scraper oficial de la marca)
      for (const url of p.source_urls ?? []) {
        await conn.execute(
          `INSERT INTO paddle_source_links (paddle_id, source, external_name, external_url, status, matched_by)
           VALUES (:paddle_id, :source, :name, :url, 'matched', 'import') AS new
           ON DUPLICATE KEY UPDATE paddle_id = new.paddle_id, external_name = new.external_name`,
          { paddle_id: paddleId, source: brandSlug ?? "unknown", name: p.nombre, url },
        );
      }

      // Precio ARS de la tienda oficial de la marca
      if (p.precio_ars && brandSlug) {
        const storeId = storeIdByBrandSlug.get(brandSlug);
        const scrapedAt = new Date(p.precio_actualizado_at ?? p.scraped_at ?? Date.now());
        const priceParams = {
          paddle_id: paddleId,
          store_id: storeId,
          price: p.precio_ars,
          url: p.source_urls?.[0] ?? null,
          scraped_at: scrapedAt,
        };
        await conn.execute(
          `INSERT INTO current_prices (paddle_id, store_id, price, currency, in_stock, product_url, scraped_at)
           VALUES (:paddle_id, :store_id, :price, 'ARS', TRUE, :url, :scraped_at) AS new
           ON DUPLICATE KEY UPDATE price = new.price, product_url = new.product_url, scraped_at = new.scraped_at`,
          priceParams,
        );
        // Historial: solo si no existe ya una fila idéntica (re-corridas no duplican)
        const [[existing]] = await conn.execute(
          `SELECT id FROM prices
           WHERE paddle_id = :paddle_id AND store_id = :store_id AND scraped_at = :scraped_at
           LIMIT 1`,
          { paddle_id: paddleId, store_id: storeId, scraped_at: scrapedAt },
        );
        if (!existing) {
          await conn.execute(
            `INSERT INTO prices (paddle_id, store_id, price, currency, in_stock, product_url, scraped_at)
             VALUES (:paddle_id, :store_id, :price, 'ARS', TRUE, :url, :scraped_at)`,
            priceParams,
          );
        }
      }
    }

    await conn.execute(
      `INSERT INTO scrape_runs (source, status, trigger_type, started_at, finished_at, items_found, items_created, items_updated)
       VALUES ('supabase-import', 'success', 'import', :started_at, NOW(), :found, :created, :updated)`,
      { started_at: startedAt, found: palas.length, created, updated },
    );

    console.log(`Importación OK: ${created} paletas creadas, ${updated} actualizadas.`);
  } catch (err) {
    console.error("Importación fallida:", err.message);
    try {
      await conn.execute(
        `INSERT INTO scrape_runs (source, status, trigger_type, started_at, finished_at, items_created, items_updated, error_message)
         VALUES ('supabase-import', 'error', 'import', :started_at, NOW(), :created, :updated, :error)`,
        { started_at: startedAt, created, updated, error: String(err.message).slice(0, 2000) },
      );
    } catch {
      // si ni siquiera se puede loguear, el error original ya salió por consola
    }
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main();

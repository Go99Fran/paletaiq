import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getPool } from "../db/mysql-client";
import { createScrapeClient, type ScrapeClient } from "./http";
import { normalizeParsed } from "./normalizers/vocab";
import type { ParsedPaddle, ScrapeOptions, ScrapeRunResult } from "./types";

/**
 * Una "source spec" implementa cómo descubrir y parsear paletas para una fuente.
 * Cada marca/tienda exporta una de estas (ver scrapers/).
 */
export type SourceSpec = {
  /** Identificador único: persiste en scrape_runs.source y nombra la cache. */
  source: string;
  /** Slug de la marca en brands. Debe existir antes de correr. */
  brandSlug: string;
  /** Genera la lista de URLs de detalle a scrapear. */
  discoverUrls: (client: ScrapeClient, opts: ScrapeOptions) => Promise<string[]>;
  /** Parsea una página/JSON de detalle. Función pura. */
  parseDetail: (body: string, url: string) => ParsedPaddle;
};

export async function runScrape(
  spec: SourceSpec,
  opts: ScrapeOptions = {},
): Promise<ScrapeRunResult> {
  const pool = getPool();
  const client = createScrapeClient({ source: spec.source });
  const errors: ScrapeRunResult["errors"] = [];

  const log = (s: string) => console.log(`[${spec.source}] ${s}`);

  const [runInsert] = await pool.execute<ResultSetHeader>(
    `INSERT INTO scrape_runs (source, status, trigger_type, triggered_by, started_at)
     VALUES (:source, 'running', :trigger, :triggeredBy, NOW())`,
    {
      source: spec.source,
      trigger: opts.trigger ?? "manual_admin",
      triggeredBy: opts.triggeredBy ?? null,
    },
  );
  const runId = runInsert.insertId;
  log(`scrape_runs.id=${runId}`);

  let found = 0;
  let created = 0;
  let updated = 0;

  try {
    const [brandRows] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM brands WHERE slug = :slug LIMIT 1",
      { slug: spec.brandSlug },
    );
    if (brandRows.length === 0) {
      throw new Error(`Marca "${spec.brandSlug}" no existe en brands`);
    }
    const brandId = Number(brandRows[0].id);
    const storeId = await ensureOfficialStore(spec.brandSlug);

    let urls = await spec.discoverUrls(client, opts);
    if (opts.limit) urls = urls.slice(0, opts.limit);
    found = urls.length;
    log(`descubiertas ${found} urls`);

    for (const url of urls) {
      try {
        await client.checkRobots(url);
        const body = await client.fetchBody(url, { noCache: opts.noCache });
        const parsed = spec.parseDetail(body, url);
        const wasCreated = await upsertPaddle(brandId, storeId, spec, parsed);
        if (wasCreated) created++;
        else updated++;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        errors.push({ url, message });
        log(`ERROR ${url}: ${message}`);
      }
    }

    // Items con error no tiran toda la corrida; status error solo si no se procesó nada.
    const status = errors.length > 0 && created + updated === 0 ? "error" : "success";
    await pool.execute(
      `UPDATE scrape_runs
       SET status = :status, finished_at = NOW(), items_found = :found,
           items_created = :created, items_updated = :updated, error_message = :errorMessage
       WHERE id = :runId`,
      {
        status,
        found,
        created,
        updated,
        errorMessage:
          errors.length > 0
            ? errors.map((e) => `${e.url}: ${e.message}`).join("\n").slice(0, 60_000)
            : null,
        runId,
      },
    );
    log(`fin: found=${found} created=${created} updated=${updated} errors=${errors.length}`);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await pool.execute(
      `UPDATE scrape_runs
       SET status = 'error', finished_at = NOW(), items_found = :found,
           items_created = :created, items_updated = :updated, error_message = :message
       WHERE id = :runId`,
      { found, created, updated, message: message.slice(0, 60_000), runId },
    );
    throw e;
  }

  return { source: spec.source, runId, found, created, updated, errors };
}

/** Garantiza la tienda oficial de la marca (donde viven sus precios ARS). */
async function ensureOfficialStore(brandSlug: string): Promise<number> {
  const pool = getPool();
  const slug = `oficial-${brandSlug}`;
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT id FROM stores WHERE slug = :slug LIMIT 1",
    { slug },
  );
  if (rows.length > 0) return Number(rows[0].id);

  const [brandRows] = await pool.execute<RowDataPacket[]>(
    "SELECT name, website_url FROM brands WHERE slug = :slug LIMIT 1",
    { slug: brandSlug },
  );
  const brandName = brandRows.length > 0 ? String(brandRows[0].name) : brandSlug;
  const [insert] = await pool.execute<ResultSetHeader>(
    `INSERT INTO stores (name, slug, website_url, country)
     VALUES (:name, :slug, :web, 'ARG')`,
    {
      name: `${brandName} (tienda oficial)`,
      slug,
      web: brandRows.length > 0 ? brandRows[0].website_url : null,
    },
  );
  return insert.insertId;
}

/**
 * Upsert por slug `${brandSlug}-${slugRaw}`. Los campos de specs solo se pisan
 * con valores NO nulos del scraper, para no borrar correcciones manuales /
 * enriquecimiento previo. Devuelve true si fue insert nuevo.
 */
async function upsertPaddle(
  brandId: number,
  storeId: number,
  spec: SourceSpec,
  parsed: ParsedPaddle,
): Promise<boolean> {
  const pool = getPool();
  const n = normalizeParsed(parsed);
  const slug = `${spec.brandSlug}-${parsed.slugRaw}`;

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO paddles
       (brand_id, name, slug, year, shape, balance, weight_min, weight_max,
        core_material, face_material, frame_material, surface, hardness, level,
        play_style, image_url, description, raw_data)
     VALUES
       (:brand_id, :name, :slug, :year, :shape, :balance, :weight_min, :weight_max,
        :core_material, :face_material, :frame_material, :surface, :hardness, :level,
        :play_style, :image_url, :description, :raw_data) AS new
     ON DUPLICATE KEY UPDATE
       name = new.name,
       year = COALESCE(new.year, paddles.year),
       shape = COALESCE(new.shape, paddles.shape),
       balance = COALESCE(new.balance, paddles.balance),
       weight_min = COALESCE(new.weight_min, paddles.weight_min),
       weight_max = COALESCE(new.weight_max, paddles.weight_max),
       core_material = COALESCE(new.core_material, paddles.core_material),
       face_material = COALESCE(new.face_material, paddles.face_material),
       frame_material = COALESCE(new.frame_material, paddles.frame_material),
       surface = COALESCE(new.surface, paddles.surface),
       hardness = COALESCE(new.hardness, paddles.hardness),
       level = COALESCE(new.level, paddles.level),
       play_style = COALESCE(new.play_style, paddles.play_style),
       image_url = COALESCE(new.image_url, paddles.image_url),
       description = COALESCE(new.description, paddles.description),
       raw_data = JSON_MERGE_PATCH(COALESCE(paddles.raw_data, '{}'), new.raw_data)`,
    {
      brand_id: brandId,
      name: n.name,
      slug,
      year: n.year,
      shape: n.shape,
      balance: n.balance,
      weight_min: n.weightMin,
      weight_max: n.weightMax,
      core_material: n.coreMaterial,
      face_material: n.faceMaterial,
      frame_material: n.frameMaterial,
      surface: n.surface,
      hardness: n.hardness,
      level: n.level,
      play_style: n.playStyle,
      image_url: n.imageUrl,
      description: n.description,
      raw_data: JSON.stringify({ scraper: { source: spec.source, ...n.rawData } }),
    },
  );
  const wasCreated = result.affectedRows === 1;

  const [[paddleRow]] = (await pool.execute<RowDataPacket[]>(
    "SELECT id FROM paddles WHERE slug = :slug LIMIT 1",
    { slug },
  )) as unknown as [RowDataPacket[]];
  const paddleId = Number(paddleRow.id);

  await pool.execute(
    `INSERT INTO paddle_source_links (paddle_id, source, external_name, external_url, status, matched_by)
     VALUES (:paddle_id, :source, :name, :url, 'matched', 'scraper') AS new
     ON DUPLICATE KEY UPDATE paddle_id = new.paddle_id, external_name = new.external_name`,
    { paddle_id: paddleId, source: spec.source, name: n.name, url: n.sourceUrl },
  );

  if (n.priceArs !== null) {
    const priceParams = {
      paddle_id: paddleId,
      store_id: storeId,
      price: n.priceArs,
      in_stock: n.inStock,
      url: n.sourceUrl,
    };

    // Leemos el precio/stock vigente ANTES de pisarlo, para deduplicar el historial:
    // solo registramos en `prices` cuando hay un cambio real (evita inflar la tabla
    // con una fila idéntica por cada corrida del cron).
    const [prevRows] = await pool.execute<RowDataPacket[]>(
      "SELECT price, in_stock FROM current_prices WHERE paddle_id = :paddle_id AND store_id = :store_id LIMIT 1",
      { paddle_id: paddleId, store_id: storeId },
    );
    const prev = prevRows[0];
    const priceChanged = !prev || Number(prev.price) !== n.priceArs || Boolean(prev.in_stock) !== n.inStock;

    await pool.execute(
      `INSERT INTO current_prices (paddle_id, store_id, price, currency, in_stock, product_url, scraped_at)
       VALUES (:paddle_id, :store_id, :price, 'ARS', :in_stock, :url, NOW()) AS new
       ON DUPLICATE KEY UPDATE
         price = new.price, in_stock = new.in_stock,
         product_url = new.product_url, scraped_at = new.scraped_at`,
      priceParams,
    );

    if (priceChanged) {
      await pool.execute(
        `INSERT INTO prices (paddle_id, store_id, price, currency, in_stock, product_url, scraped_at)
         VALUES (:paddle_id, :store_id, :price, 'ARS', :in_stock, :url, NOW())`,
        priceParams,
      );
    }
  }

  return wasCreated;
}

import type { RowDataPacket } from "mysql2/promise";
import type {
  PaddleListItem,
  PaddleShape,
  PaddleBalance,
  PaddleSurface,
  PaddleHardness,
  PaddleLevel,
  PlayStyle,
} from "@/domain/paddle/paddle.entity";
import type {
  CandidateCriteria,
  PaddleFilters,
  PaddleListResult,
  PaddleRepository,
  PaddleUpdateInput,
} from "@/domain/paddle/paddle.repository";
import { getPool } from "./mysql-client";

interface PaddleRow extends RowDataPacket {
  id: number;
  brand_id: number;
  brand_name: string;
  brand_slug: string;
  name: string;
  slug: string;
  year: number | null;
  shape: PaddleShape | null;
  balance: PaddleBalance | null;
  weight_min: number | null;
  weight_max: number | null;
  core_material: string | null;
  face_material: string | null;
  frame_material: string | null;
  surface: PaddleSurface | null;
  hardness: PaddleHardness | null;
  level: PaddleLevel | null;
  play_style: PlayStyle | null;
  popularity: number;
  thickness: string | null;
  image_url: string | null;
  description: string | null;
  is_active: number;
  validated: number;
  best_price: string | null;
  best_price_currency: string | null;
  store_count: number;
  best_store_name: string | null;
  best_store_url: string | null;
}

/**
 * SELECT base: paleta + marca + mejor precio vigente (mínimo entre tiendas con stock).
 * current_prices está desnormalizada justamente para que esto sea un join directo.
 *
 * PaletaIQ es Argentina-first: el "mejor precio" se calcula SOLO sobre precios en ARS.
 * Antes se hacía MIN(price) sin filtrar moneda + MIN(currency) por separado, así que un
 * precio en EUR podía ganar el mínimo y renderizarse con "$" como si fueran pesos. Al
 * filtrar currency='ARS', best_price siempre está en ARS y best_price_currency es coherente.
 */
const PRICE_CURRENCY = "ARS";
const BASE_SELECT = `
  SELECT
    p.id, p.brand_id, b.name AS brand_name, b.slug AS brand_slug,
    p.name, p.slug, p.year, p.shape, p.balance, p.weight_min, p.weight_max,
    p.core_material, p.face_material, p.frame_material, p.surface, p.hardness,
    p.level, p.play_style, p.popularity, p.thickness, p.image_url, p.description,
    p.is_active, p.validated,
    bp.best_price, '${PRICE_CURRENCY}' AS best_price_currency, COALESCE(bp.store_count, 0) AS store_count,
    bp.best_store_name, bp.best_store_url
  FROM paddles p
  JOIN brands b ON b.id = p.brand_id
  LEFT JOIN (
    SELECT cp.paddle_id,
           MIN(cp.price) OVER (PARTITION BY cp.paddle_id) AS best_price,
           COUNT(*) OVER (PARTITION BY cp.paddle_id) AS store_count,
           s.name AS best_store_name,
           cp.product_url AS best_store_url,
           ROW_NUMBER() OVER (PARTITION BY cp.paddle_id ORDER BY cp.price ASC, cp.store_id ASC) AS rn
    FROM current_prices cp
    JOIN stores s ON s.id = cp.store_id
    WHERE cp.in_stock = TRUE AND cp.currency = '${PRICE_CURRENCY}'
  ) bp ON bp.paddle_id = p.id AND bp.rn = 1
`;

function mapRow(row: PaddleRow): PaddleListItem {
  return {
    id: row.id,
    brandId: row.brand_id,
    brandName: row.brand_name,
    brandSlug: row.brand_slug,
    name: row.name,
    slug: row.slug,
    year: row.year,
    shape: row.shape,
    balance: row.balance,
    weightMin: row.weight_min,
    weightMax: row.weight_max,
    coreMaterial: row.core_material,
    faceMaterial: row.face_material,
    frameMaterial: row.frame_material,
    surface: row.surface,
    hardness: row.hardness,
    level: row.level,
    playStyle: row.play_style,
    popularity: row.popularity,
    thickness: row.thickness !== null ? Number(row.thickness) : null,
    imageUrl: row.image_url,
    description: row.description,
    isActive: Boolean(row.is_active),
    validated: Boolean(row.validated),
    bestPrice: row.best_price !== null ? Number(row.best_price) : null,
    bestPriceCurrency: row.best_price_currency,
    storeCount: row.store_count,
    bestStoreName: row.best_store_name,
    bestStoreUrl: row.best_store_url,
  };
}

export class PaddleMysqlRepository implements PaddleRepository {
  async list(filters: PaddleFilters): Promise<PaddleListResult> {
    const where: string[] = filters.includeInactive ? ["1=1"] : ["p.is_active = TRUE"];
    const params: Record<string, string | number> = {};

    if (filters.validated !== undefined) {
      where.push(`p.validated = ${filters.validated ? "TRUE" : "FALSE"}`);
    }
    if (filters.brandSlug) {
      where.push("b.slug = :brandSlug");
      params.brandSlug = filters.brandSlug;
    }
    if (filters.shape) {
      where.push("p.shape = :shape");
      params.shape = filters.shape;
    }
    if (filters.level) {
      where.push("p.level = :level");
      params.level = filters.level;
    }
    if (filters.playStyle) {
      where.push("p.play_style = :playStyle");
      params.playStyle = filters.playStyle;
    }
    if (filters.priceMin !== undefined) {
      where.push("bp.best_price >= :priceMin");
      params.priceMin = filters.priceMin;
    }
    if (filters.priceMax !== undefined) {
      where.push("bp.best_price <= :priceMax");
      params.priceMax = filters.priceMax;
    }
    if (filters.search) {
      where.push("(p.name LIKE :search OR b.name LIKE :search)");
      params.search = `%${filters.search}%`;
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;
    const offset = (filters.page - 1) * filters.pageSize;

    const pool = getPool();
    const [rows] = await pool.execute<PaddleRow[]>(
      // LIMIT/OFFSET no aceptan placeholders en prepared statements de MySQL;
      // son números validados, no input de usuario directo.
      `${BASE_SELECT} ${whereSql} ORDER BY bp.best_price IS NULL, p.popularity DESC, p.validated DESC, p.name
       LIMIT ${Number(filters.pageSize)} OFFSET ${Number(offset)}`,
      params,
    );
    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM paddles p
       JOIN brands b ON b.id = p.brand_id
       LEFT JOIN (
         SELECT paddle_id, MIN(price) AS best_price FROM current_prices
         WHERE in_stock = TRUE AND currency = '${PRICE_CURRENCY}' GROUP BY paddle_id
       ) bp ON bp.paddle_id = p.id
       ${whereSql}`,
      params,
    );

    return { items: rows.map(mapRow), total: Number(countRows[0].total) };
  }

  async getBySlug(slug: string): Promise<PaddleListItem | null> {
    const [rows] = await getPool().execute<PaddleRow[]>(
      `${BASE_SELECT} WHERE p.slug = :slug LIMIT 1`,
      { slug },
    );
    return rows.length > 0 ? mapRow(rows[0]) : null;
  }

  async getById(id: number): Promise<PaddleListItem | null> {
    const [rows] = await getPool().execute<PaddleRow[]>(
      `${BASE_SELECT} WHERE p.id = :id LIMIT 1`,
      { id },
    );
    return rows.length > 0 ? mapRow(rows[0]) : null;
  }

  async getBySlugs(slugs: string[]): Promise<PaddleListItem[]> {
    if (slugs.length === 0) return [];
    const placeholders = slugs.map(() => "?").join(",");
    const [rows] = await getPool().query<PaddleRow[]>(
      `${BASE_SELECT} WHERE p.slug IN (${placeholders})`,
      slugs,
    );
    // Preservar el orden pedido (importa en el comparador)
    const bySlug = new Map(rows.map((r) => [r.slug, mapRow(r)]));
    return slugs.flatMap((s) => (bySlug.has(s) ? [bySlug.get(s)!] : []));
  }

  async findCandidates(criteria: CandidateCriteria): Promise<PaddleListItem[]> {
    const where: string[] = ["p.is_active = TRUE"];
    const params: Array<string | number> = [];

    if (criteria.levels.length > 0) {
      where.push(`p.level IN (${criteria.levels.map(() => "?").join(",")})`);
      params.push(...criteria.levels);
    }
    if (criteria.playStyles && criteria.playStyles.length > 0) {
      where.push(
        `(p.play_style IN (${criteria.playStyles.map(() => "?").join(",")}) OR p.play_style IS NULL)`,
      );
      params.push(...criteria.playStyles);
    }
    // El filtro de presupuesto NO descarta paletas sin precio publicado (best_price NULL):
    // "precio desconocido" no es "fuera de presupuesto". Igual van al final por el ORDER BY
    // (best_price IS NULL), así que no desplazan a las que sí tienen precio en rango.
    if (criteria.budgetMin !== undefined) {
      where.push("(bp.best_price >= ? OR bp.best_price IS NULL)");
      params.push(criteria.budgetMin);
    }
    if (criteria.budgetMax !== undefined) {
      where.push("(bp.best_price <= ? OR bp.best_price IS NULL)");
      params.push(criteria.budgetMax);
    }
    if (criteria.excludeIds && criteria.excludeIds.length > 0) {
      where.push(`p.id NOT IN (${criteria.excludeIds.map(() => "?").join(",")})`);
      params.push(...criteria.excludeIds);
    }
    if (criteria.excludeBrandSlugs && criteria.excludeBrandSlugs.length > 0) {
      where.push(`b.slug NOT IN (${criteria.excludeBrandSlugs.map(() => "?").join(",")})`);
      params.push(...criteria.excludeBrandSlugs);
    }

    // Diversificación por marca: traemos como mucho `perBrand` candidatas de cada
    // marca antes de cortar, para que la IA reciba un abanico de marcas y no 30
    // paletas de la misma. Usamos ROW_NUMBER particionado por marca.
    const perBrand = 3;
    const [rows] = await getPool().query<PaddleRow[]>(
      `SELECT * FROM (
         SELECT inner_q.*,
                ROW_NUMBER() OVER (
                  PARTITION BY inner_q.brand_id
                  ORDER BY inner_q.popularity DESC, inner_q.validated DESC, inner_q.store_count DESC, inner_q.name
                ) AS brand_rank
         FROM (${BASE_SELECT} WHERE ${where.join(" AND ")}) AS inner_q
       ) ranked
       WHERE ranked.brand_rank <= ${perBrand}
       ORDER BY ranked.popularity DESC, ranked.validated DESC, ranked.brand_rank, ranked.store_count DESC, ranked.name
       LIMIT ${Number(criteria.limit)}`,
      params,
    );
    return rows.map(mapRow);
  }

  async update(id: number, input: PaddleUpdateInput, updatedBy: string): Promise<void> {
    const columnByField: Record<string, string> = {
      name: "name",
      year: "year",
      shape: "shape",
      balance: "balance",
      weightMin: "weight_min",
      weightMax: "weight_max",
      coreMaterial: "core_material",
      faceMaterial: "face_material",
      frameMaterial: "frame_material",
      surface: "surface",
      hardness: "hardness",
      level: "level",
      playStyle: "play_style",
      popularity: "popularity",
      thickness: "thickness",
      description: "description",
      isActive: "is_active",
    };

    const sets: string[] = [];
    const params: Array<string | number | boolean | null> = [];
    for (const [field, column] of Object.entries(columnByField)) {
      if (field in input) {
        sets.push(`${column} = ?`);
        params.push(input[field as keyof PaddleUpdateInput] ?? null);
      }
    }
    if (input.validated !== undefined) {
      sets.push("validated = ?", "validated_by = ?", "validated_at = NOW()");
      params.push(input.validated, updatedBy);
    }
    if (sets.length === 0) return;

    params.push(id);
    await getPool().query(`UPDATE paddles SET ${sets.join(", ")} WHERE id = ?`, params);
  }
}

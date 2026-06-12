import type { RowDataPacket } from "mysql2/promise";
import type { CurrentPrice, PricePoint } from "@/domain/pricing/price.entity";
import type { PriceRepository } from "@/domain/pricing/price.repository";
import { getPool } from "./mysql-client";

interface CurrentPriceRow extends RowDataPacket {
  paddle_id: number;
  store_id: number;
  store_name: string;
  store_slug: string;
  price: string;
  currency: string;
  in_stock: number;
  product_url: string | null;
  scraped_at: Date;
}

interface PricePointRow extends RowDataPacket {
  store_id: number;
  store_name: string;
  price: string;
  currency: string;
  in_stock: number;
  scraped_at: Date;
}

export class PriceMysqlRepository implements PriceRepository {
  async getCurrentPrices(paddleId: number): Promise<CurrentPrice[]> {
    const [rows] = await getPool().execute<CurrentPriceRow[]>(
      `SELECT cp.paddle_id, cp.store_id, s.name AS store_name, s.slug AS store_slug,
              cp.price, cp.currency, cp.in_stock, cp.product_url, cp.scraped_at
       FROM current_prices cp
       JOIN stores s ON s.id = cp.store_id
       WHERE cp.paddle_id = :paddleId
       ORDER BY cp.price`,
      { paddleId },
    );
    return rows.map((r) => ({
      paddleId: r.paddle_id,
      storeId: r.store_id,
      storeName: r.store_name,
      storeSlug: r.store_slug,
      price: Number(r.price),
      currency: r.currency,
      inStock: Boolean(r.in_stock),
      productUrl: r.product_url,
      scrapedAt: r.scraped_at,
    }));
  }

  async getPriceHistory(paddleId: number): Promise<PricePoint[]> {
    const [rows] = await getPool().execute<PricePointRow[]>(
      `SELECT pr.store_id, s.name AS store_name, pr.price, pr.currency, pr.in_stock, pr.scraped_at
       FROM prices pr
       JOIN stores s ON s.id = pr.store_id
       WHERE pr.paddle_id = :paddleId
       ORDER BY pr.scraped_at`,
      { paddleId },
    );
    return rows.map((r) => ({
      storeId: r.store_id,
      storeName: r.store_name,
      price: Number(r.price),
      currency: r.currency,
      inStock: Boolean(r.in_stock),
      scrapedAt: r.scraped_at,
    }));
  }
}

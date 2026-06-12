import type { RowDataPacket } from "mysql2/promise";
import type { Store } from "@/domain/store/store.entity";
import type { StoreRepository } from "@/domain/store/store.repository";
import { getPool } from "./mysql-client";

interface StoreRow extends RowDataPacket {
  id: number;
  name: string;
  slug: string;
  website_url: string | null;
  logo_url: string | null;
  country: string;
}

export class StoreMysqlRepository implements StoreRepository {
  async listAll(): Promise<Store[]> {
    const [rows] = await getPool().query<StoreRow[]>(
      "SELECT id, name, slug, website_url, logo_url, country FROM stores ORDER BY name",
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      websiteUrl: r.website_url,
      logoUrl: r.logo_url,
      country: r.country,
    }));
  }
}

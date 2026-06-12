import type { RowDataPacket } from "mysql2/promise";
import type { Brand } from "@/domain/brand/brand.entity";
import type { BrandRepository } from "@/domain/brand/brand.repository";
import { getPool } from "./mysql-client";

interface BrandRow extends RowDataPacket {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  website_url: string | null;
}

export class BrandMysqlRepository implements BrandRepository {
  async listAll(): Promise<Brand[]> {
    const [rows] = await getPool().query<BrandRow[]>(
      "SELECT id, name, slug, logo_url, website_url FROM brands ORDER BY name",
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      logoUrl: r.logo_url,
      websiteUrl: r.website_url,
    }));
  }
}

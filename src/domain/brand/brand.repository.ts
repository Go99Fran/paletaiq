import type { Brand } from "./brand.entity";

export interface BrandRepository {
  listAll(): Promise<Brand[]>;
}

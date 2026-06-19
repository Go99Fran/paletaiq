import type {
  PaddleLevel,
  PaddleListItem,
  PaddleShape,
  PlayStyle,
  PaddleBalance,
  PaddleHardness,
  PaddleSurface,
} from "./paddle.entity";

export interface PaddleFilters {
  brandSlug?: string;
  shape?: PaddleShape;
  level?: PaddleLevel;
  playStyle?: PlayStyle;
  balance?: PaddleBalance;
  hardness?: PaddleHardness;
  priceMin?: number;
  priceMax?: number;
  search?: string;
  /** Solo para el admin: filtrar por estado de validación humana. */
  validated?: boolean;
  /** Solo para el admin: incluir paletas inactivas. */
  includeInactive?: boolean;
  page: number;
  pageSize: number;
}

export interface PaddleListResult {
  items: PaddleListItem[];
  total: number;
}

/** Criterios del filtro duro del recomendador (sección 6.2 del brief). */
export interface CandidateCriteria {
  levels: PaddleLevel[];
  playStyles?: PlayStyle[];
  budgetMin?: number;
  budgetMax?: number;
  excludeIds?: number[];
  excludeBrandSlugs?: string[];
  limit: number;
}

export interface PaddleUpdateInput {
  name?: string;
  year?: number | null;
  shape?: PaddleShape | null;
  balance?: PaddleBalance | null;
  weightMin?: number | null;
  weightMax?: number | null;
  coreMaterial?: string | null;
  faceMaterial?: string | null;
  frameMaterial?: string | null;
  surface?: PaddleSurface | null;
  hardness?: PaddleHardness | null;
  level?: PaddleLevel | null;
  playStyle?: PlayStyle | null;
  popularity?: number;
  thickness?: number | null;
  description?: string | null;
  isActive?: boolean;
  validated?: boolean;
}

export interface PaddleRepository {
  list(filters: PaddleFilters): Promise<PaddleListResult>;
  getBySlug(slug: string): Promise<PaddleListItem | null>;
  getById(id: number): Promise<PaddleListItem | null>;
  getBySlugs(slugs: string[]): Promise<PaddleListItem[]>;
  findCandidates(criteria: CandidateCriteria): Promise<PaddleListItem[]>;
  update(id: number, input: PaddleUpdateInput, updatedBy: string): Promise<void>;
}

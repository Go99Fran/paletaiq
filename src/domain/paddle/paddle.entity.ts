export type PaddleShape = "round" | "teardrop" | "diamond" | "hybrid";
export type PaddleBalance = "low" | "medium" | "high";
export type PaddleSurface = "rough" | "smooth";
export type PaddleHardness = "soft" | "medium" | "hard";
export type PaddleLevel = "beginner" | "intermediate" | "advanced" | "pro";
export type PlayStyle = "control" | "balance" | "power";

export const PADDLE_SHAPES: PaddleShape[] = ["round", "teardrop", "diamond", "hybrid"];
export const PADDLE_BALANCES: PaddleBalance[] = ["low", "medium", "high"];
export const PADDLE_HARDNESSES: PaddleHardness[] = ["soft", "medium", "hard"];
export const PADDLE_LEVELS: PaddleLevel[] = ["beginner", "intermediate", "advanced", "pro"];
export const PLAY_STYLES: PlayStyle[] = ["control", "balance", "power"];

export interface Paddle {
  id: number;
  brandId: number;
  brandName: string;
  brandSlug: string;
  name: string;
  slug: string;
  year: number | null;
  shape: PaddleShape | null;
  balance: PaddleBalance | null;
  weightMin: number | null;
  weightMax: number | null;
  coreMaterial: string | null;
  faceMaterial: string | null;
  frameMaterial: string | null;
  surface: PaddleSurface | null;
  hardness: PaddleHardness | null;
  level: PaddleLevel | null;
  playStyle: PlayStyle | null;
  popularity: number;
  thickness: number | null;
  imageUrl: string | null;
  description: string | null;
  isActive: boolean;
  validated: boolean;
}

/** Item de listado: paleta + mejor precio vigente (mínimo entre tiendas). */
export interface PaddleListItem extends Paddle {
  bestPrice: number | null;
  bestPriceCurrency: string | null;
  storeCount: number;
  /** Tienda con el mejor precio (la más barata con stock en ARS) y su link directo. */
  bestStoreName: string | null;
  bestStoreUrl: string | null;
}

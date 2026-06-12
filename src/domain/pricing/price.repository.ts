import type { CurrentPrice, PricePoint } from "./price.entity";

export interface PriceRepository {
  getCurrentPrices(paddleId: number): Promise<CurrentPrice[]>;
  getPriceHistory(paddleId: number): Promise<PricePoint[]>;
}

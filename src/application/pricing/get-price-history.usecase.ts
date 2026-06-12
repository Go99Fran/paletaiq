import type { PricePoint } from "@/domain/pricing/price.entity";
import type { PriceRepository } from "@/domain/pricing/price.repository";

export class GetPriceHistoryUseCase {
  constructor(private readonly prices: PriceRepository) {}

  execute(paddleId: number): Promise<PricePoint[]> {
    return this.prices.getPriceHistory(paddleId);
  }
}

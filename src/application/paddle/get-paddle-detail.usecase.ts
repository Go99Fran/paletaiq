import type { PaddleListItem } from "@/domain/paddle/paddle.entity";
import type { PaddleRepository } from "@/domain/paddle/paddle.repository";
import type { CurrentPrice, PricePoint } from "@/domain/pricing/price.entity";
import type { PriceRepository } from "@/domain/pricing/price.repository";

export interface PaddleDetail {
  paddle: PaddleListItem;
  prices: CurrentPrice[];
  history: PricePoint[];
}

export class GetPaddleDetailUseCase {
  constructor(
    private readonly paddles: PaddleRepository,
    private readonly prices: PriceRepository,
  ) {}

  async execute(slug: string): Promise<PaddleDetail | null> {
    const paddle = await this.paddles.getBySlug(slug);
    if (!paddle) return null;
    const [prices, history] = await Promise.all([
      this.prices.getCurrentPrices(paddle.id),
      this.prices.getPriceHistory(paddle.id),
    ]);
    return { paddle, prices, history };
  }
}

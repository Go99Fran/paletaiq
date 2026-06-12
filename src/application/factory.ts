/**
 * Composición de dependencias (DI simple, sin container).
 * Solo se importa desde código de servidor (server components / actions / route handlers).
 */
import { BrandMysqlRepository } from "@/infrastructure/db/brand.mysql.repository";
import { PaddleMysqlRepository } from "@/infrastructure/db/paddle.mysql.repository";
import { PriceMysqlRepository } from "@/infrastructure/db/price.mysql.repository";
import { RecommendationMysqlRepository } from "@/infrastructure/db/recommendation.mysql.repository";
import { StoreMysqlRepository } from "@/infrastructure/db/store.mysql.repository";
import { createAnthropicRecommender } from "@/infrastructure/ai/anthropic.client";
import { ListPaddlesUseCase } from "./paddle/list-paddles.usecase";
import { GetPaddleDetailUseCase } from "./paddle/get-paddle-detail.usecase";
import { ComparePaddlesUseCase } from "./paddle/compare-paddles.usecase";
import { GetPriceHistoryUseCase } from "./pricing/get-price-history.usecase";
import { RecommendPaddlesUseCase } from "./recommendation/recommend-paddles.usecase";

export const paddleRepository = new PaddleMysqlRepository();
export const brandRepository = new BrandMysqlRepository();
export const storeRepository = new StoreMysqlRepository();
export const priceRepository = new PriceMysqlRepository();
export const recommendationRepository = new RecommendationMysqlRepository();

export const listPaddles = new ListPaddlesUseCase(paddleRepository);
export const getPaddleDetail = new GetPaddleDetailUseCase(paddleRepository, priceRepository);
export const comparePaddles = new ComparePaddlesUseCase(paddleRepository);
export const getPriceHistory = new GetPriceHistoryUseCase(priceRepository);
export const recommendPaddles = new RecommendPaddlesUseCase(
  paddleRepository,
  recommendationRepository,
  createAnthropicRecommender(),
);

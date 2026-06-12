import type {
  PaddleFilters,
  PaddleListResult,
  PaddleRepository,
} from "@/domain/paddle/paddle.repository";

export class ListPaddlesUseCase {
  constructor(private readonly paddles: PaddleRepository) {}

  execute(filters: PaddleFilters): Promise<PaddleListResult> {
    return this.paddles.list(filters);
  }
}

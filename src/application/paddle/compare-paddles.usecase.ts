import { MAX_COMPARE } from "@/config";
import type { PaddleListItem } from "@/domain/paddle/paddle.entity";
import type { PaddleRepository } from "@/domain/paddle/paddle.repository";

export class ComparePaddlesUseCase {
  constructor(private readonly paddles: PaddleRepository) {}

  execute(slugs: string[]): Promise<PaddleListItem[]> {
    const unique = [...new Set(slugs)].slice(0, MAX_COMPARE);
    return this.paddles.getBySlugs(unique);
  }
}

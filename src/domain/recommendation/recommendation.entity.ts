import type { PaddleListItem } from "../paddle/paddle.entity";

/** Pick devuelto por el ranker (IA o heurístico): id real + explicación. */
export interface RankedPick {
  paddleId: number;
  rank: number;
  reason: string;
}

export interface Recommendation {
  paddle: PaddleListItem;
  rank: number;
  reason: string;
  /** true si vino del fallback heurístico (la IA falló o no estaba configurada). */
  heuristic: boolean;
}

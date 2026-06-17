import type { PaddleListItem } from "../paddle/paddle.entity";
import type { PlayerProfile } from "../player-profile/player-profile.entity";
import type { RefinementFeedback } from "./refinement-feedback.entity";
import type { RankedPick } from "./recommendation.entity";

/**
 * Puerto del ranker con IA. La implementación concreta (Anthropic SDK) vive en
 * infrastructure/ai; el caso de uso solo conoce esta interfaz.
 */
export interface AiRecommender {
  rank(
    profile: PlayerProfile,
    candidates: PaddleListItem[],
    refinement?: {
      feedback: RefinementFeedback;
      shownCandidates: PaddleListItem[];
      iteration: number;
    },
  ): Promise<RankedPick[]>;
}

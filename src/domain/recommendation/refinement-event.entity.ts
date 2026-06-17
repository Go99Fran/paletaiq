import type { RefinementFeedback } from "./refinement-feedback.entity";

export interface RefinementEventInput {
  playerProfileId: number;
  iteration: number;
  feedback: RefinementFeedback;
  resultCount: number;
  selectedPaddleId?: number | null;
  locale?: string | null;
}

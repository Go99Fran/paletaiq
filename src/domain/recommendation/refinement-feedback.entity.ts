export interface RefinementFeedback {
  shownPaddleIds: number[];
  wantMorePower?: boolean;
  wantMoreControl?: boolean;
  wantCheaper?: boolean;
  wantLighter?: boolean;
  excludeBrandSlugs?: string[];
  newBudgetMax?: number | null;
  freeFeedback?: string | null;
}

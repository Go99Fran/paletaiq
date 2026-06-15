import type { PaddleLevel, PlayStyle } from "../paddle/paddle.entity";

export type StrengthPref = "needs_power" | "has_power";
export type ImproveGoal = "power" | "control" | "ball_exit" | "comfort";
export type MatchPace = "calm" | "medium" | "fast";
export type InjuryArea = "elbow" | "shoulder" | "wrist";
export type SweetSpotTolerance = "wide" | "balanced" | "small";

/** Perfil del jugador armado por el chat del buscador inteligente. */
export interface PlayerProfile {
  level: PaddleLevel;
  playStyle: PlayStyle;
  frequency: number | null; // veces por semana
  matchPace: MatchPace | null;
  hasInjuries: boolean;
  injuryArea: InjuryArea | null;
  injuryNotes: string | null;
  strengthPref: StrengthPref | null;
  improveGoal: ImproveGoal | null;
  sweetSpotTolerance: SweetSpotTolerance | null;
  previousPaddle: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  currency: string;
}

export interface SavedPlayerProfile extends PlayerProfile {
  id: number;
  userId: number | null;
}

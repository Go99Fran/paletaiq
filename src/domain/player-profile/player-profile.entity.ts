import type { PaddleBalance, PaddleHardness, PaddleLevel, PlayStyle } from "../paddle/paddle.entity";

export type StrengthPref = "needs_power" | "has_power";
export type ImproveGoal = "power" | "control" | "ball_exit" | "comfort" | "maneuver";
export type MatchPace = "calm" | "medium" | "fast";
export type InjuryArea = "elbow" | "shoulder" | "wrist" | "back" | "other";
export type SweetSpotTolerance = "wide" | "balanced" | "small";

/** Contextura física: define la ventana de peso recomendada. */
export type BodyProfile = "light" | "medium" | "strong";
/** Primera paleta vs upgrade: cambia el tono y habilita preguntas de historia. */
export type PaddleJourney = "first" | "upgrade" | "enthusiast";
/** Quejas de la paleta anterior (señal fuerte para corregir el fit). */
export type PreviousPain =
  | "tiring"
  | "lacked_power"
  | "weak_smash"
  | "vibration"
  | "low_control"
  | "broke_fast";
/** Preferencia de cara declarada por avanzados. */
export type FacePref = "fiberglass" | "carbon3k" | "carbon12k" | "carbon18k";
export type DurabilityPref = "high" | "medium";

/** Perfil del jugador armado por el chat del buscador inteligente. */
export interface PlayerProfile {
  level: PaddleLevel;
  playStyle: PlayStyle;
  bodyProfile: BodyProfile | null;
  journey: PaddleJourney | null;
  frequency: number | null; // veces por semana
  matchPace: MatchPace | null;
  hasInjuries: boolean;
  injuryAreas: InjuryArea[];
  injuryNotes: string | null;
  strengthPref: StrengthPref | null;
  /** Objetivos a mejorar (hasta 2). El primero es el principal. */
  improveGoals: ImproveGoal[];
  sweetSpotTolerance: SweetSpotTolerance | null;
  durability: DurabilityPref | null;
  // Preferencias técnicas (solo avanzados; null = "que decidan ustedes").
  balancePref: PaddleBalance | null;
  hardnessPref: PaddleHardness | null;
  facePref: FacePref | null;
  spinImportant: boolean;
  // Historia (solo upgrade).
  previousPaddle: string | null;
  previousPains: PreviousPain[];
  // Preferencias blandas.
  brandSlugs: string[];
  freeText: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  currency: string;
}

export interface SavedPlayerProfile extends PlayerProfile {
  id: number;
  userId: number | null;
}

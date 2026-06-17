"use server";

import { auth } from "@/auth";
import { recommendPaddles } from "@/application/factory";
import {
  PADDLE_BALANCES,
  PADDLE_HARDNESSES,
  PADDLE_LEVELS,
  PLAY_STYLES,
  type PaddleLevel,
  type PlayStyle,
} from "@/domain/paddle/paddle.entity";
import type {
  BodyProfile,
  DurabilityPref,
  FacePref,
  InjuryArea,
  MatchPace,
  ImproveGoal,
  PaddleJourney,
  PlayerProfile,
  PreviousPain,
  SweetSpotTolerance,
  StrengthPref,
} from "@/domain/player-profile/player-profile.entity";
import { findUserIdByEmail } from "@/infrastructure/db/user.mysql.repository";

export interface FinderInput {
  level: string;
  playStyle: string;
  bodyProfile: string | null;
  journey: string | null;
  frequency: number | null;
  matchPace: string | null;
  hasInjuries: boolean;
  injuryAreas: string[];
  injuryNotes: string | null;
  strengthPref: string | null;
  improveGoals: string[];
  sweetSpotTolerance: string | null;
  durability: string | null;
  balancePref: string | null;
  hardnessPref: string | null;
  facePref: string | null;
  spinImportant: boolean;
  previousPaddle: string | null;
  previousPains: string[];
  brandSlugs: string[];
  freeText: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
}

export interface FinderRecommendation {
  rank: number;
  reason: string;
  slug: string;
  name: string;
  brandName: string;
  imageUrl: string | null;
  bestPrice: number | null;
  bestPriceCurrency: string | null;
  shape: string | null;
  level: string | null;
  playStyle: string | null;
}

export interface FinderResult {
  heuristic: boolean;
  recommendations: FinderRecommendation[];
  /** Nuevo techo de presupuesto si se amplió; -1 si se quitó el tope; null si no se tocó. */
  budgetExpandedToMax: number | null;
}

const STRENGTH_PREFS: StrengthPref[] = ["needs_power", "has_power"];
const IMPROVE_GOALS: ImproveGoal[] = ["power", "control", "ball_exit", "comfort", "maneuver"];
const MATCH_PACES: MatchPace[] = ["calm", "medium", "fast"];
const INJURY_AREAS: InjuryArea[] = ["elbow", "shoulder", "wrist", "back", "other"];
const SWEET_SPOT_TOLERANCES: SweetSpotTolerance[] = ["wide", "balanced", "small"];
const BODY_PROFILES: BodyProfile[] = ["light", "medium", "strong"];
const JOURNEYS: PaddleJourney[] = ["first", "upgrade", "enthusiast"];
const DURABILITIES: DurabilityPref[] = ["high", "medium"];
const FACE_PREFS: FacePref[] = ["fiberglass", "carbon3k", "carbon12k", "carbon18k"];
const PREVIOUS_PAINS: PreviousPain[] = [
  "tiring",
  "lacked_power",
  "weak_smash",
  "vibration",
  "low_control",
  "broke_fast",
];

/** Filtra un array de strings a los valores válidos de un set permitido. */
function keepValid<T extends string>(values: string[], allowed: readonly T[]): T[] {
  const set = new Set<string>(allowed);
  return [...new Set(values)].filter((v): v is T => set.has(v));
}

function sanitize(input: FinderInput): PlayerProfile {
  if (!PADDLE_LEVELS.includes(input.level as PaddleLevel)) {
    throw new Error("Nivel inválido");
  }
  if (!PLAY_STYLES.includes(input.playStyle as PlayStyle)) {
    throw new Error("Estilo inválido");
  }
  const budgetMin = input.budgetMin !== null && input.budgetMin >= 0 ? input.budgetMin : null;
  const budgetMax = input.budgetMax !== null && input.budgetMax > 0 ? input.budgetMax : null;

  const matchPace = MATCH_PACES.includes(input.matchPace as MatchPace)
    ? (input.matchPace as MatchPace)
    : null;
  const injuryAreas = input.hasInjuries ? keepValid(input.injuryAreas, INJURY_AREAS) : [];
  const sweetSpotTolerance = SWEET_SPOT_TOLERANCES.includes(
    input.sweetSpotTolerance as SweetSpotTolerance,
  )
    ? (input.sweetSpotTolerance as SweetSpotTolerance)
    : null;
  const valid = <T extends string>(v: string | null, allowed: readonly T[]): T | null =>
    v !== null && (allowed as readonly string[]).includes(v) ? (v as T) : null;

  return {
    level: input.level as PaddleLevel,
    playStyle: input.playStyle as PlayStyle,
    bodyProfile: valid(input.bodyProfile, BODY_PROFILES),
    journey: valid(input.journey, JOURNEYS),
    frequency:
      input.frequency !== null && input.frequency > 0 && input.frequency <= 14
        ? Math.round(input.frequency)
        : null,
    matchPace,
    hasInjuries: input.hasInjuries,
    injuryAreas,
    injuryNotes: input.injuryNotes ? input.injuryNotes.slice(0, 500) : null,
    strengthPref: valid(input.strengthPref, STRENGTH_PREFS),
    improveGoals: keepValid(input.improveGoals, IMPROVE_GOALS).slice(0, 2),
    sweetSpotTolerance,
    durability: valid(input.durability, DURABILITIES),
    balancePref: valid(input.balancePref, PADDLE_BALANCES),
    hardnessPref: valid(input.hardnessPref, PADDLE_HARDNESSES),
    facePref: valid(input.facePref, FACE_PREFS),
    spinImportant: input.spinImportant === true,
    previousPaddle: input.previousPaddle ? input.previousPaddle.slice(0, 300) : null,
    previousPains: keepValid(input.previousPains, PREVIOUS_PAINS),
    brandSlugs: [...new Set(input.brandSlugs ?? [])]
      .filter((s) => /^[a-z0-9-]{1,40}$/.test(s))
      .slice(0, 6),
    freeText: input.freeText ? input.freeText.slice(0, 1000) : null,
    budgetMin,
    budgetMax: budgetMax !== null && budgetMin !== null && budgetMax < budgetMin ? null : budgetMax,
    currency: "ARS",
  };
}

export async function getRecommendations(input: FinderInput): Promise<FinderResult> {
  const profile = sanitize(input);

  const session = await auth();
  let userId: number | null = null;
  if (session?.user?.email) {
    try {
      userId = await findUserIdByEmail(session.user.email);
    } catch {
      // si falla el lookup, la recomendación sigue como anónima
    }
  }

  const result = await recommendPaddles.execute(profile, userId);

  return {
    heuristic: result.recommendations.some((r) => r.heuristic),
    recommendations: result.recommendations.map((r) => ({
      rank: r.rank,
      reason: r.reason,
      slug: r.paddle.slug,
      name: r.paddle.name,
      brandName: r.paddle.brandName,
      imageUrl: r.paddle.imageUrl,
      bestPrice: r.paddle.bestPrice,
      bestPriceCurrency: r.paddle.bestPriceCurrency,
      shape: r.paddle.shape,
      level: r.paddle.level,
      playStyle: r.paddle.playStyle,
    })),
    budgetExpandedToMax: result.budgetExpandedToMax,
  };
}

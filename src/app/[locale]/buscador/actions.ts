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
import type { RefinementFeedback } from "@/domain/recommendation/refinement-feedback.entity";
import type { RecommendResult } from "@/application/recommendation/recommend-paddles.usecase";
import { findUserIdByEmail } from "@/infrastructure/db/user.mysql.repository";
import { rateLimit, clientIp } from "@/infrastructure/rate-limit";

// Límite por IP para los endpoints que disparan llamadas pagas a la IA.
const AI_RATE_LIMIT = 20; // peticiones
const AI_RATE_WINDOW_MS = 60_000; // por minuto

async function enforceAiRateLimit(scope: string): Promise<void> {
  const ip = await clientIp();
  const { ok } = rateLimit(`finder:${scope}:${ip}`, AI_RATE_LIMIT, AI_RATE_WINDOW_MS);
  if (!ok) throw new Error("RATE_LIMITED");
}

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
  paddleId: number;
  rank: number;
  reason: string;
  slug: string;
  name: string;
  brandName: string;
  brandSlug: string;
  imageUrl: string | null;
  bestPrice: number | null;
  bestPriceCurrency: string | null;
  shape: string | null;
  balance: string | null;
  hardness: string | null;
  level: string | null;
  playStyle: string | null;
}

export interface FinderResult {
  heuristic: boolean;
  recommendations: FinderRecommendation[];
  /** Nuevo techo de presupuesto si se amplió; -1 si se quitó el tope; null si no se tocó. */
  budgetExpandedToMax: number | null;
}

/** Mapea el resultado del caso de uso al DTO del finder (compartido por execute y refine). */
function toFinderResult(result: RecommendResult): FinderResult {
  return {
    heuristic: result.recommendations.some((r) => r.heuristic),
    recommendations: result.recommendations.map((r) => ({
      paddleId: r.paddle.id,
      rank: r.rank,
      reason: r.reason,
      slug: r.paddle.slug,
      name: r.paddle.name,
      brandName: r.paddle.brandName,
      brandSlug: r.paddle.brandSlug,
      imageUrl: r.paddle.imageUrl,
      bestPrice: r.paddle.bestPrice,
      bestPriceCurrency: r.paddle.bestPriceCurrency,
      shape: r.paddle.shape,
      balance: r.paddle.balance,
      hardness: r.paddle.hardness,
      level: r.paddle.level,
      playStyle: r.paddle.playStyle,
    })),
    budgetExpandedToMax: result.budgetExpandedToMax,
  };
}

export interface RefinementFeedbackInput {
  shownPaddleIds: number[];
  wantMorePower?: boolean;
  wantMoreControl?: boolean;
  wantCheaper?: boolean;
  wantLighter?: boolean;
  excludeBrandSlugs?: string[];
  newBudgetMax?: number | null;
  freeFeedback?: string | null;
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

function sanitizeFeedback(input: RefinementFeedbackInput): RefinementFeedback {
  const shownPaddleIds = [...new Set(input.shownPaddleIds ?? [])]
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 200);

  const excludeBrandSlugs = [...new Set(input.excludeBrandSlugs ?? [])]
    .filter((s) => /^[a-z0-9-]{1,40}$/.test(s))
    .slice(0, 8);

  const newBudgetMax =
    input.newBudgetMax === null
      ? null
      : typeof input.newBudgetMax === "number" && input.newBudgetMax > 0
        ? Math.round(input.newBudgetMax)
        : undefined;

  return {
    shownPaddleIds,
    wantMorePower: input.wantMorePower === true,
    wantMoreControl: input.wantMoreControl === true,
    wantCheaper: input.wantCheaper === true,
    wantLighter: input.wantLighter === true,
    excludeBrandSlugs,
    newBudgetMax,
    freeFeedback: input.freeFeedback ? input.freeFeedback.slice(0, 900) : null,
  };
}

export async function getRecommendations(input: FinderInput): Promise<FinderResult> {
  await enforceAiRateLimit("get");
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
  return toFinderResult(result);
}

export async function refineRecommendations(
  input: FinderInput,
  feedbackInput: RefinementFeedbackInput,
): Promise<FinderResult> {
  await enforceAiRateLimit("refine");
  const profile = sanitize(input);
  const feedback = sanitizeFeedback(feedbackInput);

  const session = await auth();
  let userId: number | null = null;
  if (session?.user?.email) {
    try {
      userId = await findUserIdByEmail(session.user.email);
    } catch {
      // si falla el lookup, la recomendación sigue como anónima
    }
  }

  const result = await recommendPaddles.refine(profile, feedback, userId);
  return toFinderResult(result);
}

"use server";

import { auth } from "@/auth";
import { recommendPaddles } from "@/application/factory";
import {
  PADDLE_LEVELS,
  PLAY_STYLES,
  type PaddleLevel,
  type PlayStyle,
} from "@/domain/paddle/paddle.entity";
import type {
  ImproveGoal,
  PlayerProfile,
  StrengthPref,
} from "@/domain/player-profile/player-profile.entity";
import { findUserIdByEmail } from "@/infrastructure/db/user.mysql.repository";

export interface FinderInput {
  level: string;
  playStyle: string;
  frequency: number | null;
  hasInjuries: boolean;
  injuryNotes: string | null;
  strengthPref: string | null;
  improveGoal: string | null;
  previousPaddle: string | null;
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
}

const STRENGTH_PREFS: StrengthPref[] = ["needs_power", "has_power"];
const IMPROVE_GOALS: ImproveGoal[] = ["power", "control", "ball_exit", "comfort"];

function sanitize(input: FinderInput): PlayerProfile {
  if (!PADDLE_LEVELS.includes(input.level as PaddleLevel)) {
    throw new Error("Nivel inválido");
  }
  if (!PLAY_STYLES.includes(input.playStyle as PlayStyle)) {
    throw new Error("Estilo inválido");
  }
  const budgetMin = input.budgetMin !== null && input.budgetMin >= 0 ? input.budgetMin : null;
  const budgetMax = input.budgetMax !== null && input.budgetMax > 0 ? input.budgetMax : null;

  return {
    level: input.level as PaddleLevel,
    playStyle: input.playStyle as PlayStyle,
    frequency:
      input.frequency !== null && input.frequency > 0 && input.frequency <= 14
        ? Math.round(input.frequency)
        : null,
    hasInjuries: input.hasInjuries,
    injuryNotes: input.injuryNotes ? input.injuryNotes.slice(0, 500) : null,
    strengthPref: STRENGTH_PREFS.includes(input.strengthPref as StrengthPref)
      ? (input.strengthPref as StrengthPref)
      : null,
    improveGoal: IMPROVE_GOALS.includes(input.improveGoal as ImproveGoal)
      ? (input.improveGoal as ImproveGoal)
      : null,
    previousPaddle: input.previousPaddle ? input.previousPaddle.slice(0, 300) : null,
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
  };
}

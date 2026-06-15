import type { PaddleLevel, PaddleListItem } from "@/domain/paddle/paddle.entity";
import type { PlayerProfile } from "@/domain/player-profile/player-profile.entity";
import type { RankedPick } from "@/domain/recommendation/recommendation.entity";

/** Niveles compatibles con el del jugador (el filtro duro no es exacto a propósito). */
export function compatibleLevels(level: PaddleLevel): PaddleLevel[] {
  switch (level) {
    case "beginner":
      return ["beginner", "intermediate"];
    case "intermediate":
      return ["beginner", "intermediate", "advanced"];
    case "advanced":
      return ["intermediate", "advanced", "pro"];
    case "pro":
      return ["advanced", "pro"];
  }
}

/**
 * Ranking heurístico por specs: fallback cuando la IA falla o no está configurada.
 * Las razones se generan en español (igual que las respuestas de la IA); la UI
 * marca las recomendaciones heurísticas con un badge.
 */
export function heuristicRank(
  profile: PlayerProfile,
  candidates: PaddleListItem[],
  count = 4,
): RankedPick[] {
  const scored = candidates.map((paddle) => {
    let score = 0;
    const reasons: string[] = [];

    if (paddle.playStyle === profile.playStyle) {
      score += 3;
      reasons.push("coincide con tu estilo de juego");
    }
    if (paddle.level === profile.level) {
      score += 2;
      reasons.push("es de tu nivel exacto");
    }
    if (profile.hasInjuries) {
      if (paddle.hardness === "soft") {
        score += 2;
        reasons.push("su goma blanda cuida tus molestias físicas");
      }
      if (paddle.balance === "low") {
        score += 1;
        reasons.push("el balance bajo reduce la carga en el brazo");
      }
      if (profile.injuryArea === "elbow" && paddle.hardness !== "hard") {
        score += 1;
        reasons.push("es más amigable para molestias de codo");
      }
      if (profile.injuryArea === "shoulder" && paddle.balance !== "high") {
        score += 1;
        reasons.push("evita exigir de más el hombro");
      }
      if (profile.injuryArea === "wrist" && paddle.weightMax !== null && paddle.weightMax <= 370) {
        score += 1;
        reasons.push("su peso contenido ayuda a cuidar la muñeca");
      }
    }
    if (profile.strengthPref === "needs_power" && paddle.playStyle === "power") {
      score += 1;
      reasons.push("aporta la potencia que te falta");
    }
    if (profile.improveGoal === "control" && paddle.shape === "round") {
      score += 1;
      reasons.push("la forma redonda maximiza el control");
    }
    if (profile.improveGoal === "power" && (paddle.shape === "diamond" || paddle.shape === "hybrid")) {
      score += 1;
      reasons.push("su forma favorece el remate");
    }
    if ((profile.improveGoal === "comfort" || profile.improveGoal === "ball_exit") && paddle.hardness === "soft") {
      score += 1;
      reasons.push("la goma blanda da mejor salida de bola y comodidad");
    }

    if (profile.matchPace === "fast") {
      if (paddle.balance !== "high") score += 1;
      if (paddle.hardness !== "hard") score += 1;
      reasons.push("responde bien para un ritmo de juego alto");
    }
    if (profile.matchPace === "calm" && paddle.shape === "round") {
      score += 1;
      reasons.push("favorece construir puntos largos con control");
    }

    if (profile.sweetSpotTolerance === "wide" && paddle.shape === "round") {
      score += 1;
      reasons.push("tiene punto dulce más permisivo");
    }
    if (profile.sweetSpotTolerance === "small" && (paddle.shape === "diamond" || paddle.shape === "hybrid")) {
      score += 1;
      reasons.push("premia una pegada más precisa y agresiva");
    }
    if (paddle.bestPrice !== null) {
      score += 1;
      reasons.push("tiene precio y stock en tiendas");
    }
    if (paddle.validated) {
      score += 1;
    }
    // Popularidad como peso editorial: las paletas que la gente usa suman.
    score += paddle.popularity * 0.5;

    return { paddle, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score);

  // Variedad de marca: a lo sumo una paleta por marca, igual que pedimos a la IA.
  const picks: typeof scored = [];
  const usedBrands = new Set<number>();
  for (const s of scored) {
    if (usedBrands.has(s.paddle.brandId)) continue;
    usedBrands.add(s.paddle.brandId);
    picks.push(s);
    if (picks.length >= count) break;
  }

  return picks.map((s, i) => ({
    paddleId: s.paddle.id,
    rank: i + 1,
    reason:
      s.reasons.length > 0
        ? `Seleccionada porque ${s.reasons.join(", ")}.`
        : "Buena opción dentro de tu nivel y presupuesto.",
  }));
}

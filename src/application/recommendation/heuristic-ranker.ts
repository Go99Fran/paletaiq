import type { PaddleLevel, PaddleListItem } from "@/domain/paddle/paddle.entity";
import type { PlayerProfile } from "@/domain/player-profile/player-profile.entity";
import type { RefinementFeedback } from "@/domain/recommendation/refinement-feedback.entity";
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
 * Reglas DURAS de seguridad/fit (diseño del fitter). Devuelven una penalización
 * fuerte (negativa grande) para candidatas que no deberían recomendarse a ese
 * perfil. No descartan del todo (para no quedarse sin opciones) pero las hunden
 * al fondo del ranking. La IA recibe estas mismas reglas como prohibiciones.
 */
function safetyPenalty(profile: PlayerProfile, p: PaddleListItem): number {
  let penalty = 0;
  const hasInjury = profile.hasInjuries && profile.injuryAreas.length > 0;

  // Codo (epicondilitis): nada de dura, balance alto ni carbono 18K.
  if (hasInjury && profile.injuryAreas.includes("elbow")) {
    if (p.hardness === "hard") penalty -= 8;
    if (p.balance === "high") penalty -= 6;
    if (p.faceMaterial?.includes("18")) penalty -= 4;
  }
  // Hombro: nada de balance alto ni peso pesado.
  if (hasInjury && profile.injuryAreas.includes("shoulder")) {
    if (p.balance === "high") penalty -= 6;
    if (p.weightMin !== null && p.weightMin > 370) penalty -= 4;
  }
  // Muñeca: techo de peso y preferir balance bajo.
  if (hasInjury && profile.injuryAreas.includes("wrist")) {
    if (p.weightMax !== null && p.weightMax > 365) penalty -= 5;
    if (p.balance === "high") penalty -= 3;
  }
  // Principiante: nada de diamante, balance alto, ni combo dura+18K.
  if (profile.level === "beginner") {
    if (p.shape === "diamond") penalty -= 7;
    if (p.balance === "high") penalty -= 5;
    if (p.hardness === "hard" && p.faceMaterial?.includes("18")) penalty -= 4;
  }
  return penalty;
}

/** Ventana de peso ideal según contextura física (gramos). */
function bodyWeightFit(profile: PlayerProfile, p: PaddleListItem): { score: number; reason?: string } {
  if (profile.bodyProfile === null || p.weightMax === null) return { score: 0 };
  const w = p.weightMax;
  if (profile.bodyProfile === "light") {
    if (w <= 365) return { score: 2, reason: "tiene un peso liviano que vas a manejar cómodo" };
    if (w > 375) return { score: -2 };
  }
  if (profile.bodyProfile === "strong") {
    if (w >= 370) return { score: 1, reason: "su peso te da inercia y potencia acorde a tu físico" };
  }
  return { score: 0 };
}

/**
 * Ranking heurístico por specs: fallback cuando la IA falla o no está configurada.
 * Aplica reglas duras de seguridad, señales de fit y preferencias blandas (marcas,
 * popularidad). Las razones se generan en español; la UI marca el fallback.
 */
export function heuristicRank(
  profile: PlayerProfile,
  candidates: PaddleListItem[],
  count = 4,
  refinement?: RefinementFeedback,
): RankedPick[] {
  const excludeBrands = new Set(refinement?.excludeBrandSlugs ?? []);
  const base = candidates.filter((c) => !excludeBrands.has(c.brandSlug));
  const pool = base.length >= count ? base : candidates;
  const primaryGoal = profile.improveGoals[0] ?? null;
  const brandSet = new Set(profile.brandSlugs);

  const scored = pool.map((paddle) => {
    let score = 0;
    const reasons: string[] = [];

    // --- Fit principal ---
    if (paddle.playStyle === profile.playStyle) {
      score += 3;
      reasons.push("coincide con tu estilo de juego");
    }
    if (paddle.level === profile.level) {
      score += 2;
      reasons.push("es de tu nivel exacto");
    }

    // --- Lesiones (señal positiva de confort, además de la penalización dura) ---
    if (profile.hasInjuries && profile.injuryAreas.length > 0) {
      if (paddle.hardness === "soft") {
        score += 2;
        reasons.push("su goma blanda cuida tus molestias físicas");
      }
      if (paddle.balance === "low") {
        score += 1;
        reasons.push("el balance bajo reduce la carga en el brazo");
      }
    }

    // --- Contextura física → peso ---
    const bw = bodyWeightFit(profile, paddle);
    score += bw.score;
    if (bw.reason) reasons.push(bw.reason);

    // --- Fuerza / pegada ---
    // Quien necesita potencia y NO pega fuerte: la potencia viene de confort/salida,
    // no de balance alto (regla del fitter).
    if (profile.strengthPref === "needs_power") {
      if (paddle.hardness === "soft" || paddle.shape === "teardrop") {
        score += 1;
        reasons.push("te va a ayudar a sacar más potencia sin esfuerzo");
      }
    }
    if (profile.strengthPref === "has_power" && paddle.playStyle === "control") {
      score += 1;
    }

    // --- Objetivos (multi) ---
    if (primaryGoal === "control" && paddle.shape === "round") {
      score += 2;
      reasons.push("la forma redonda maximiza el control");
    }
    if (primaryGoal === "power" && (paddle.shape === "diamond" || paddle.shape === "hybrid")) {
      score += 2;
      reasons.push("su forma favorece el remate");
    }
    if (
      (profile.improveGoals.includes("comfort") || profile.improveGoals.includes("ball_exit")) &&
      paddle.hardness === "soft"
    ) {
      score += 1;
      reasons.push("la goma blanda da mejor salida de bola y comodidad");
    }
    if (profile.improveGoals.includes("maneuver") && paddle.balance !== "high") {
      score += 1;
      reasons.push("es manejable y rápida de reacción");
    }

    // --- Ritmo de partido ---
    if (profile.matchPace === "fast") {
      if (paddle.balance !== "high") score += 1;
      if (paddle.hardness !== "hard") score += 1;
      reasons.push("responde bien para un ritmo de juego alto");
    }
    if (profile.matchPace === "calm" && paddle.shape === "round") {
      score += 1;
      reasons.push("favorece construir puntos largos con control");
    }

    // --- Sweet spot ---
    if (profile.sweetSpotTolerance === "wide" && paddle.shape === "round") {
      score += 1;
      reasons.push("tiene punto dulce más permisivo");
    }
    if (
      profile.sweetSpotTolerance === "small" &&
      (paddle.shape === "diamond" || paddle.shape === "hybrid")
    ) {
      score += 1;
      reasons.push("premia una pegada más precisa y agresiva");
    }

    // --- Preferencias técnicas declaradas (avanzados) ---
    if (profile.balancePref && paddle.balance === profile.balancePref) {
      score += 2;
      reasons.push("tiene el balance que buscás");
    }
    if (profile.hardnessPref && paddle.hardness === profile.hardnessPref) {
      score += 2;
      reasons.push("tiene la dureza de goma que preferís");
    }
    if (profile.spinImportant && paddle.surface === "rough") {
      score += 1;
      reasons.push("su superficie rugosa te da más efecto");
    }

    // --- Quejas de la paleta anterior ---
    if (profile.previousPains.includes("tiring") && paddle.balance !== "high") {
      score += 1;
    }
    if (profile.previousPains.includes("vibration") && paddle.hardness === "soft") {
      score += 1;
      reasons.push("vibra menos que tu paleta anterior");
    }
    if (profile.previousPains.includes("low_control") && (paddle.shape === "round" || paddle.shape === "teardrop")) {
      score += 1;
      reasons.push("te va a dar el control que sentías que te faltaba");
    }

    // --- Durabilidad ---
    if (profile.durability === "high" && paddle.faceMaterial?.toLowerCase().includes("carbono")) {
      score += 1;
    }

    // --- Ajustes del loop de refinamiento ---
    if (refinement?.wantCheaper && paddle.bestPrice !== null) {
      // Penaliza de forma suave a medida que sube el precio.
      score -= paddle.bestPrice / 300_000;
      reasons.push("priorizamos opciones más cuidadas en precio");
    }
    if (refinement?.wantLighter) {
      if (paddle.weightMax !== null && paddle.weightMax <= 365) {
        score += 2;
        reasons.push("es más liviana y rápida de mover");
      }
      if (paddle.weightMin !== null && paddle.weightMin > 372) score -= 2;
    }
    if (refinement?.wantMorePower) {
      // Señal de potencia, siempre sujeta a safetyPenalty.
      if (paddle.playStyle === "power") score += 1.5;
      if (paddle.shape === "diamond" || paddle.shape === "hybrid") score += 1;
      if (paddle.balance === "high") score += 0.5;
    }
    if (refinement?.wantMoreControl) {
      if (paddle.playStyle === "control") score += 1.5;
      if (paddle.shape === "round") score += 1;
      if (paddle.balance === "low" || paddle.balance === "medium") score += 0.5;
      reasons.push("reforzamos control y consistencia");
    }

    // --- Preferencias blandas: marca preferida ---
    if (brandSet.has(paddle.brandSlug)) {
      score += 2;
      reasons.push(`es ${paddle.brandName}, una de las marcas que elegiste`);
    }

    // --- Disponibilidad y relevancia editorial ---
    if (paddle.bestPrice !== null) {
      score += 1;
      reasons.push("tiene precio y stock en tiendas");
    }
    if (paddle.validated) score += 1;
    score += paddle.popularity * 0.5;

    // --- Reglas duras de seguridad (hunden las inseguras) ---
    score += safetyPenalty(profile, paddle);

    return { paddle, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score);

  // Variedad de marca: a lo sumo una paleta por marca.
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
        ? `Seleccionada porque ${s.reasons.slice(0, 3).join(", ")}.`
        : "Buena opción dentro de tu nivel y presupuesto.",
  }));
}

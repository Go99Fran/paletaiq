import type { PaddleRepository } from "@/domain/paddle/paddle.repository";
import type { PlayerProfile } from "@/domain/player-profile/player-profile.entity";
import type { AiRecommender } from "@/domain/recommendation/ai-recommender";
import type { RankedPick, Recommendation } from "@/domain/recommendation/recommendation.entity";
import type { RecommendationRepository } from "@/domain/recommendation/recommendation.repository";
import { compatibleLevels, heuristicRank } from "./heuristic-ranker";

const CANDIDATE_LIMIT = 30;
const MIN_CANDIDATES_WITH_BUDGET = 5;

export interface RecommendResult {
  profileId: number;
  recommendations: Recommendation[];
  /**
   * Si se amplió el presupuesto para encontrar opciones: el nuevo techo en ARS,
   * o -1 si se quitó el tope por completo, o null si no se tocó.
   */
  budgetExpandedToMax: number | null;
}

/**
 * Pipeline del buscador inteligente (sección 6.2 del brief):
 * 1. Filtro duro en MySQL (nivel compatible + presupuesto) -> candidatas reales.
 * 2. La IA elige y explica SOLO entre esas candidatas.
 * 3. Validación: ids devueltos deben existir en las candidatas.
 * 4. Fallback heurístico si la IA falla o no está configurada.
 */
export class RecommendPaddlesUseCase {
  constructor(
    private readonly paddles: PaddleRepository,
    private readonly recommendations: RecommendationRepository,
    private readonly ai: AiRecommender | null,
  ) {}

  async execute(profile: PlayerProfile, userId: number | null): Promise<RecommendResult> {
    const levels = compatibleLevels(profile.level);

    let candidates = await this.paddles.findCandidates({
      levels,
      budgetMin: profile.budgetMin ?? undefined,
      budgetMax: profile.budgetMax ?? undefined,
      limit: CANDIDATE_LIMIT,
    });

    // Relajación GRADUAL del presupuesto: si quedan pocas candidatas, ampliamos el
    // techo por tramos en vez de tirar el filtro de golpe (evita recomendar una de
    // $600k cuando pidieron hasta $200k). Reportamos cuánto se amplió para avisar al usuario.
    let budgetExpandedToMax: number | null = null;
    if (profile.budgetMax !== null && candidates.length < MIN_CANDIDATES_WITH_BUDGET) {
      for (const factor of [1.25, 1.6]) {
        const expandedMax = Math.round(profile.budgetMax * factor);
        candidates = await this.paddles.findCandidates({
          levels,
          budgetMin: profile.budgetMin ?? undefined,
          budgetMax: expandedMax,
          limit: CANDIDATE_LIMIT,
        });
        if (candidates.length >= MIN_CANDIDATES_WITH_BUDGET) {
          budgetExpandedToMax = expandedMax;
          break;
        }
      }
    }

    // Último recurso: sin filtro de precio (incluye las sin precio publicado) para
    // no devolver vacío. Es un fallback explícito, no el comportamiento normal.
    if (candidates.length < MIN_CANDIDATES_WITH_BUDGET) {
      candidates = await this.paddles.findCandidates({ levels, limit: CANDIDATE_LIMIT });
      budgetExpandedToMax = profile.budgetMax !== null ? -1 : null; // -1 = se quitó el tope
    }

    const saved = await this.recommendations.saveProfile(profile, userId);
    if (candidates.length === 0) {
      return { profileId: saved.id, recommendations: [], budgetExpandedToMax: null };
    }

    let picks: RankedPick[] = [];
    let heuristic = false;

    if (this.ai) {
      try {
        const validIds = new Set(candidates.map((c) => c.id));
        picks = (await this.ai.rank(profile, candidates))
          .filter((p) => validIds.has(p.paddleId)) // descartar ids inventados
          .slice(0, 5)
          .map((p, i) => ({ ...p, rank: i + 1 }));
      } catch (err) {
        console.error("AiRecommender falló, usando fallback heurístico:", err);
      }
    }

    if (picks.length === 0) {
      picks = heuristicRank(profile, candidates);
      heuristic = true;
    }

    await this.recommendations.saveRecommendations(saved.id, picks);

    const byId = new Map(candidates.map((c) => [c.id, c]));
    return {
      profileId: saved.id,
      recommendations: picks.map((p) => ({
        paddle: byId.get(p.paddleId)!,
        rank: p.rank,
        reason: p.reason,
        heuristic,
      })),
      budgetExpandedToMax,
    };
  }
}

import type { ResultSetHeader } from "mysql2/promise";
import type {
  PlayerProfile,
  SavedPlayerProfile,
} from "@/domain/player-profile/player-profile.entity";
import type { RankedPick } from "@/domain/recommendation/recommendation.entity";
import type { RecommendationRepository } from "@/domain/recommendation/recommendation.repository";
import { getPool } from "./mysql-client";

export class RecommendationMysqlRepository implements RecommendationRepository {
  async saveProfile(profile: PlayerProfile, userId: number | null): Promise<SavedPlayerProfile> {
    // injury_area/improve_goal (singular, legacy) se rellenan con el primer valor
    // del array para no perder compatibilidad con datos/queries viejas.
    const [result] = await getPool().execute<ResultSetHeader>(
      `INSERT INTO player_profiles
        (user_id, level, play_style, body_profile, journey, frequency, match_pace,
         has_injuries, injury_area, injury_areas, injury_notes, strength_pref,
         improve_goal, improve_goals, sweet_spot_tolerance, durability,
         balance_pref, hardness_pref, face_pref, spin_important,
         previous_paddle, previous_pains, brand_slugs, free_text,
         budget_min, budget_max, currency)
       VALUES (:userId, :level, :playStyle, :bodyProfile, :journey, :frequency, :matchPace,
         :hasInjuries, :injuryArea, :injuryAreas, :injuryNotes, :strengthPref,
         :improveGoal, :improveGoals, :sweetSpotTolerance, :durability,
         :balancePref, :hardnessPref, :facePref, :spinImportant,
         :previousPaddle, :previousPains, :brandSlugs, :freeText,
         :budgetMin, :budgetMax, :currency)`,
      {
        userId,
        level: profile.level,
        playStyle: profile.playStyle,
        bodyProfile: profile.bodyProfile,
        journey: profile.journey,
        frequency: profile.frequency,
        matchPace: profile.matchPace,
        hasInjuries: profile.hasInjuries,
        injuryArea: profile.injuryAreas[0] === "elbow" || profile.injuryAreas[0] === "shoulder" || profile.injuryAreas[0] === "wrist" ? profile.injuryAreas[0] : null,
        injuryAreas: JSON.stringify(profile.injuryAreas),
        injuryNotes: profile.injuryNotes,
        strengthPref: profile.strengthPref,
        improveGoal: profile.improveGoals.find((g) => g !== "maneuver") ?? null,
        improveGoals: JSON.stringify(profile.improveGoals),
        sweetSpotTolerance: profile.sweetSpotTolerance,
        durability: profile.durability,
        balancePref: profile.balancePref,
        hardnessPref: profile.hardnessPref,
        facePref: profile.facePref,
        spinImportant: profile.spinImportant,
        previousPaddle: profile.previousPaddle,
        previousPains: JSON.stringify(profile.previousPains),
        brandSlugs: JSON.stringify(profile.brandSlugs),
        freeText: profile.freeText,
        budgetMin: profile.budgetMin,
        budgetMax: profile.budgetMax,
        currency: profile.currency,
      },
    );
    return { ...profile, id: result.insertId, userId };
  }

  async saveRecommendations(profileId: number, picks: RankedPick[]): Promise<void> {
    if (picks.length === 0) return;
    const values = picks.map(() => "(?, ?, ?, ?)").join(", ");
    const params = picks.flatMap((p) => [profileId, p.paddleId, p.rank, p.reason]);
    await getPool().query(
      `INSERT INTO recommendations (player_profile_id, paddle_id, \`rank\`, reason) VALUES ${values}`,
      params,
    );
  }
}

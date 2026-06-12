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
    const [result] = await getPool().execute<ResultSetHeader>(
      `INSERT INTO player_profiles
         (user_id, level, play_style, frequency, has_injuries, injury_notes,
          strength_pref, improve_goal, previous_paddle, budget_min, budget_max, currency)
       VALUES (:userId, :level, :playStyle, :frequency, :hasInjuries, :injuryNotes,
               :strengthPref, :improveGoal, :previousPaddle, :budgetMin, :budgetMax, :currency)`,
      {
        userId,
        level: profile.level,
        playStyle: profile.playStyle,
        frequency: profile.frequency,
        hasInjuries: profile.hasInjuries,
        injuryNotes: profile.injuryNotes,
        strengthPref: profile.strengthPref,
        improveGoal: profile.improveGoal,
        previousPaddle: profile.previousPaddle,
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

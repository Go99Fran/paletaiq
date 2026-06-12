import type { PlayerProfile, SavedPlayerProfile } from "../player-profile/player-profile.entity";
import type { RankedPick } from "./recommendation.entity";

export interface RecommendationRepository {
  saveProfile(profile: PlayerProfile, userId: number | null): Promise<SavedPlayerProfile>;
  saveRecommendations(profileId: number, picks: RankedPick[]): Promise<void>;
}

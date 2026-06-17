import type { PlayerProfile, SavedPlayerProfile } from "../player-profile/player-profile.entity";
import type { RefinementEventInput } from "./refinement-event.entity";
import type { RankedPick } from "./recommendation.entity";

export interface RecommendationRepository {
  saveProfile(profile: PlayerProfile, userId: number | null): Promise<SavedPlayerProfile>;
  saveRecommendations(profileId: number, picks: RankedPick[]): Promise<void>;
  saveRefinementEvent(input: RefinementEventInput): Promise<void>;
}

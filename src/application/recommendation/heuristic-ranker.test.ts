import { describe, expect, it } from "vitest";
import type { PaddleListItem } from "@/domain/paddle/paddle.entity";
import type { PlayerProfile } from "@/domain/player-profile/player-profile.entity";
import { compatibleLevels, contraindicationReason, filterSafe, heuristicRank } from "./heuristic-ranker";

/** Paleta de prueba con defaults razonables; se sobreescribe lo que importe a cada test. */
function paddle(over: Partial<PaddleListItem> = {}): PaddleListItem {
  return {
    id: 1,
    brandId: 1,
    brandName: "Test",
    brandSlug: "test",
    name: "Test Paddle",
    slug: "test-paddle",
    year: 2025,
    shape: "round",
    balance: "medium",
    weightMin: 360,
    weightMax: 365,
    coreMaterial: null,
    faceMaterial: null,
    frameMaterial: null,
    surface: null,
    hardness: "medium",
    level: "intermediate",
    playStyle: "balance",
    popularity: 3,
    thickness: null,
    imageUrl: null,
    description: null,
    isActive: true,
    validated: false,
    bestPrice: 300000,
    bestPriceCurrency: "ARS",
    storeCount: 1,
    bestStoreName: "Tienda",
    bestStoreUrl: "https://x",
    ...over,
  };
}

function profile(over: Partial<PlayerProfile> = {}): PlayerProfile {
  return {
    level: "intermediate",
    playStyle: "balance",
    bodyProfile: null,
    journey: "upgrade",
    frequency: 3,
    hasInjuries: false,
    injuryAreas: [],
    injuryNotes: null,
    matchPace: null,
    sweetSpotTolerance: null,
    strengthPref: null,
    improveGoals: [],
    durability: null,
    balancePref: null,
    hardnessPref: null,
    facePref: null,
    spinImportant: false,
    previousPaddle: null,
    previousPains: [],
    brandSlugs: [],
    freeText: null,
    budgetMin: null,
    budgetMax: null,
    currency: "ARS",
    ...over,
  };
}

describe("compatibleLevels", () => {
  it("incluye el nivel propio y vecinos sin saltar de beginner a pro", () => {
    expect(compatibleLevels("beginner")).toEqual(["beginner", "intermediate"]);
    expect(compatibleLevels("pro")).toEqual(["advanced", "pro"]);
  });
});

describe("contraindicationReason (B01)", () => {
  it("contraindica goma dura y balance alto para lesión de codo", () => {
    const p = profile({ hasInjuries: true, injuryAreas: ["elbow"] });
    expect(contraindicationReason(p, paddle({ hardness: "hard" }))).not.toBeNull();
    expect(contraindicationReason(p, paddle({ balance: "high", hardness: "soft" }))).not.toBeNull();
    expect(contraindicationReason(p, paddle({ hardness: "soft", balance: "low" }))).toBeNull();
  });

  it("contraindica diamante y balance alto para principiante", () => {
    const p = profile({ level: "beginner" });
    expect(contraindicationReason(p, paddle({ shape: "diamond" }))).not.toBeNull();
    expect(contraindicationReason(p, paddle({ shape: "round", balance: "high" }))).not.toBeNull();
    expect(contraindicationReason(p, paddle({ shape: "round", balance: "low" }))).toBeNull();
  });
});

describe("filterSafe", () => {
  it("descarta contraindicadas pero nunca vacía el pool", () => {
    const p = profile({ hasInjuries: true, injuryAreas: ["elbow"] });
    const safe = paddle({ id: 1, hardness: "soft", balance: "low" });
    const unsafe = paddle({ id: 2, hardness: "hard", balance: "high" });
    expect(filterSafe(p, [safe, unsafe]).map((x) => x.id)).toEqual([1]);
    // Si TODAS son inseguras, devuelve las originales (no deja al usuario sin opciones).
    expect(filterSafe(p, [unsafe]).map((x) => x.id)).toEqual([2]);
  });
});

describe("heuristicRank seguridad (B01)", () => {
  it("nunca recomienda una paleta contraindicada para el perfil", () => {
    const p = profile({ level: "beginner" });
    const candidates = [
      paddle({ id: 1, shape: "diamond", balance: "high", popularity: 5 }), // contraindicada pese a popular
      paddle({ id: 2, shape: "round", balance: "low", popularity: 1 }),
    ];
    const picks = heuristicRank(p, candidates, 2);
    expect(picks.some((pick) => pick.paddleId === 1)).toBe(false);
    expect(picks[0].paddleId).toBe(2);
  });
});

describe("heuristicRank potencia vs pegada (B02)", () => {
  it("a quien NO pega fuerte y quiere potencia le prioriza lágrima blanda sobre diamante", () => {
    const p = profile({ improveGoals: ["power"], strengthPref: "needs_power" });
    const teardrop = paddle({ id: 1, shape: "teardrop", hardness: "soft", playStyle: "power" });
    const diamond = paddle({ id: 2, shape: "diamond", hardness: "hard", balance: "high", playStyle: "power" });
    const picks = heuristicRank(p, [diamond, teardrop], 2);
    expect(picks[0].paddleId).toBe(1);
  });
});

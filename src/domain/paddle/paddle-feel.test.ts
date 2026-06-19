import { describe, expect, it } from "vitest";
import type { Paddle } from "./paddle.entity";
import { computePaddleFeel, hasFeelData } from "./paddle-feel";

function paddle(over: Partial<Paddle> = {}): Paddle {
  return {
    id: 1, brandId: 1, brandName: "B", brandSlug: "b", name: "P", slug: "p", year: 2025,
    shape: null, balance: null, weightMin: null, weightMax: null,
    coreMaterial: null, faceMaterial: null, frameMaterial: null, surface: null,
    hardness: null, level: null, playStyle: null, popularity: 3, thickness: null,
    imageUrl: null, description: null, isActive: true, validated: false,
    ...over,
  };
}

describe("computePaddleFeel", () => {
  it("un diamante de balance alto y goma dura puntúa más potencia que un round blando", () => {
    const diamond = computePaddleFeel(paddle({ shape: "diamond", balance: "high", hardness: "hard" }));
    const round = computePaddleFeel(paddle({ shape: "round", balance: "low", hardness: "soft" }));
    expect(diamond.power).toBeGreaterThan(round.power);
    expect(round.control).toBeGreaterThan(diamond.control);
    expect(round.tolerance).toBeGreaterThan(diamond.tolerance);
  });

  it("acota los valores al rango 5–100", () => {
    const f = computePaddleFeel(paddle({ shape: "diamond", balance: "high", hardness: "hard", weightMax: 380 }));
    for (const v of Object.values(f)) {
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});

describe("hasFeelData", () => {
  it("requiere al menos forma, balance o dureza", () => {
    expect(hasFeelData(paddle())).toBe(false);
    expect(hasFeelData(paddle({ shape: "round" }))).toBe(true);
  });
});

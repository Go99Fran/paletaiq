/**
 * Mapeo del vocabulario crudo de las fuentes (español) a los enums canónicos
 * del esquema MySQL. Misma tabla de equivalencias que la importación inicial.
 */
import type { ParsedPaddle } from "../types";

const SHAPE_MAP = {
  redonda: "round",
  lagrima: "teardrop",
  diamante: "diamond",
  hibrida: "hybrid",
} as const;

const BALANCE_MAP = { bajo: "low", medio: "medium", alto: "high" } as const;
const HARDNESS_MAP = { blanda: "soft", media: "medium", dura: "hard" } as const;
const SURFACE_MAP = { rugosa: "rough", lisa: "smooth" } as const;

const LEVEL_MAP = {
  pro: "pro",
  avanzado: "advanced",
  intermedio: "intermediate",
  iniciacion: "beginner",
  junior: "beginner",
} as const;

const STYLE_MAP = {
  defensivo: "control",
  polivalente: "balance",
  ofensivo: "power",
} as const;

export interface NormalizedPaddle {
  name: string;
  year: number | null;
  shape: (typeof SHAPE_MAP)[keyof typeof SHAPE_MAP] | null;
  balance: (typeof BALANCE_MAP)[keyof typeof BALANCE_MAP] | null;
  weightMin: number | null;
  weightMax: number | null;
  coreMaterial: string | null;
  faceMaterial: string | null;
  frameMaterial: string | null;
  surface: (typeof SURFACE_MAP)[keyof typeof SURFACE_MAP] | null;
  hardness: (typeof HARDNESS_MAP)[keyof typeof HARDNESS_MAP] | null;
  level: (typeof LEVEL_MAP)[keyof typeof LEVEL_MAP] | null;
  playStyle: (typeof STYLE_MAP)[keyof typeof STYLE_MAP] | null;
  imageUrl: string | null;
  description: string | null;
  priceArs: number | null;
  inStock: boolean;
  sourceUrl: string;
  rawData: Record<string, unknown>;
}

function mapEnum<M extends Record<string, string>>(
  map: M,
  value: string | undefined,
): M[keyof M] | null {
  if (!value) return null;
  return (map[value.toLowerCase().trim() as keyof M] as M[keyof M]) ?? null;
}

/** Peso plausible de una paleta de pádel en gramos. */
function plausibleWeight(grams: number | undefined): number | null {
  return grams !== undefined && grams >= 280 && grams <= 420 ? Math.round(grams) : null;
}

export function normalizeParsed(parsed: ParsedPaddle): NormalizedPaddle {
  return {
    name: parsed.nombre.trim(),
    year: parsed.ano ?? null,
    shape: mapEnum(SHAPE_MAP, parsed.forma),
    balance: mapEnum(BALANCE_MAP, parsed.balance),
    weightMin: plausibleWeight(parsed.pesoMinG),
    weightMax: plausibleWeight(parsed.pesoMaxG),
    coreMaterial: parsed.nucleo ?? null,
    faceMaterial: parsed.cara ?? null,
    frameMaterial: parsed.marco ?? null,
    surface: mapEnum(SURFACE_MAP, parsed.superficie),
    hardness: mapEnum(HARDNESS_MAP, parsed.dureza),
    level: mapEnum(LEVEL_MAP, parsed.categoria),
    playStyle: mapEnum(STYLE_MAP, parsed.tipoJuego),
    imageUrl: parsed.imagenPrincipalUrl ?? null,
    description: parsed.descripcionOficial ?? null,
    priceArs: parsed.precioArs !== undefined && parsed.precioArs > 0 ? parsed.precioArs : null,
    inStock: parsed.enStock ?? true,
    sourceUrl: parsed.sourceUrl,
    rawData: parsed.rawData,
  };
}

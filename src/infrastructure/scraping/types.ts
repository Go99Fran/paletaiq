/**
 * Resultado del parser de UNA página de paleta, en el vocabulario crudo de la fuente
 * (español). El normalizador lo mapea al modelo canónico antes de tocar la DB.
 */
export type ParsedPaddle = {
  /** Slug local (sin prefijo de marca; lo agrega el runner). */
  slugRaw: string;
  nombre: string;
  ano?: number;
  forma?: "redonda" | "lagrima" | "diamante" | "hibrida";
  balance?: "bajo" | "medio" | "alto";
  pesoMinG?: number;
  pesoMaxG?: number;
  dureza?: "blanda" | "media" | "dura";
  categoria?: "pro" | "avanzado" | "intermedio" | "iniciacion" | "junior";
  tipoJuego?: "defensivo" | "polivalente" | "ofensivo";
  nucleo?: string;
  cara?: string;
  marco?: string;
  superficie?: "rugosa" | "lisa";
  precioEur?: number;
  precioArs?: number;
  precioUsd?: number;
  enStock?: boolean;
  imagenPrincipalUrl?: string;
  descripcionOficial?: string;
  sourceUrl: string;
  rawData: Record<string, unknown>;
};

export type ScrapeOptions = {
  /** Fuerza re-fetch ignorando cache local (solo dev). */
  noCache?: boolean;
  /** Limita la cantidad de items procesados (útil para --limit 5 en CLI). */
  limit?: number;
  trigger?: "cron" | "manual_admin" | "import";
  triggeredBy?: string;
};

export type ScrapeRunResult = {
  source: string;
  runId: number;
  found: number;
  created: number;
  updated: number;
  errors: Array<{ url: string; message: string }>;
};

import type { ParsedPaddle } from "../types";

/**
 * Mapea un texto libre de "estilo / tipo de juego" (como vienen narrados en las
 * fichas de fabricantes) al enum canónico de ParsedPaddle. Devuelve undefined si
 * no se reconoce, para no inventar datos.
 */
export function mapTipoJuego(raw: string | undefined): ParsedPaddle["tipoJuego"] {
  if (!raw) return undefined;
  const t = raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

  if (/polivalent|equilibr|versatil|mixto|control y potencia/.test(t))
    return "polivalente";
  if (/potenc|ofensiv|ataqu|pegador|atac|striker|power/.test(t)) return "ofensivo";
  if (/control|defens/.test(t)) return "defensivo";
  return undefined;
}

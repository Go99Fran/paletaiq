import Anthropic from "@anthropic-ai/sdk";
import type { PaddleListItem } from "@/domain/paddle/paddle.entity";
import type { PlayerProfile } from "@/domain/player-profile/player-profile.entity";
import type { AiRecommender } from "@/domain/recommendation/ai-recommender";
import type { RankedPick } from "@/domain/recommendation/recommendation.entity";

const DEFAULT_MODEL = "claude-opus-4-8";
const REQUEST_TIMEOUT_MS = 30_000;

/** El schema fuerza la respuesta a JSON válido: nada de markdown ni preámbulos. */
const PICKS_SCHEMA = {
  type: "object" as const,
  properties: {
    picks: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          paddle_id: { type: "integer" as const },
          reason: { type: "string" as const },
        },
        required: ["paddle_id", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["picks"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `Sos el experto en paletas de pádel de PaletaIQ (Argentina).
Recibís el perfil de un jugador y una lista de paletas candidatas REALES con sus specs, precio en
ARS y un "popularidad" (1=nicho, 5=muy usada/icónica).

Tu tarea:
- Elegí las 4 o 5 mejores paletas PARA ESE PERFIL, ordenadas de mejor a peor fit.
- SOLO podés elegir paletas de la lista provista, identificadas por su "id". Nunca inventes ids.
- VARIEDAD OBLIGATORIA: las recomendaciones deben ser de marcas DISTINTAS. Como máximo UNA
  paleta por marca. Nunca recomiendes varias paletas de la misma marca, aunque sea Adidas.
- A igualdad de fit, preferí las de mayor "popularidad": son las que la gente realmente usa.
  No recomiendes una paleta de nicho (popularidad 1-2) salvo que encaje claramente mejor que el resto.
- Para cada una explicá en español claro y cercano (voseo argentino) POR QUÉ le conviene a ese
  jugador: relacioná forma/balance/dureza/peso con su nivel, estilo, físico/lesiones, objetivo
  y presupuesto. 2 a 3 oraciones por paleta, sin tecnicismos innecesarios.
- Si hay señales avanzadas como ritmo_partido, zona_molestia o tolerancia_punto_dulce,
  usalas explícitamente para justificar la elección.
- Si el jugador tiene molestias de codo/hombro/muñeca, priorizá gomas blandas, balance bajo/medio
  y peso contenido, y mencionalo en la explicación.
- Respondé únicamente con el JSON pedido.`;

function buildUserMessage(profile: PlayerProfile, candidates: PaddleListItem[]): string {
  const profilePayload = {
    nivel: profile.level,
    estilo: profile.playStyle,
    frecuencia_semanal: profile.frequency,
    lesiones: profile.hasInjuries ? (profile.injuryNotes ?? "sí") : "no",
    zona_molestia: profile.injuryArea,
    ritmo_partido: profile.matchPace,
    tolerancia_punto_dulce: profile.sweetSpotTolerance,
    preferencia_fuerza: profile.strengthPref,
    objetivo_mejora: profile.improveGoal,
    paleta_anterior: profile.previousPaddle,
    presupuesto_ars: { min: profile.budgetMin, max: profile.budgetMax },
  };
  const candidatesPayload = candidates.map((c) => ({
    id: c.id,
    marca: c.brandName,
    nombre: c.name,
    anio: c.year,
    forma: c.shape,
    balance: c.balance,
    peso_g: c.weightMin && c.weightMax ? `${c.weightMin}-${c.weightMax}` : null,
    nucleo: c.coreMaterial,
    cara: c.faceMaterial,
    dureza: c.hardness,
    nivel: c.level,
    estilo: c.playStyle,
    popularidad: c.popularity,
    precio_ars: c.bestPrice,
  }));
  return JSON.stringify({ perfil: profilePayload, candidatas: candidatesPayload });
}

export function createAnthropicRecommender(): AiRecommender | null {
  const apiKey = process.env.ANTHROPIC_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({
    apiKey,
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: 1,
  });
  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;

  return {
    async rank(profile: PlayerProfile, candidates: PaddleListItem[]): Promise<RankedPick[]> {
      const response = await client.messages.create({
        model,
        max_tokens: 2000,
        thinking: { type: "adaptive" },
        output_config: {
          effort: "low",
          format: { type: "json_schema", schema: PICKS_SCHEMA },
        },
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserMessage(profile, candidates) }],
      });

      if (response.stop_reason === "refusal") {
        throw new Error("La IA rechazó la solicitud");
      }
      const text = response.content.find((b) => b.type === "text")?.text;
      if (!text) {
        throw new Error("Respuesta de la IA sin contenido de texto");
      }

      const parsed = JSON.parse(text) as { picks: Array<{ paddle_id: number; reason: string }> };
      return parsed.picks.map((p, i) => ({
        paddleId: p.paddle_id,
        rank: i + 1,
        reason: p.reason,
      }));
    },
  };
}

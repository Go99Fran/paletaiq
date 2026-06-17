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

const SYSTEM_PROMPT = `Sos el experto en paletas de pádel de PaletaIQ (Argentina), con criterio de fitter profesional.
Recibís el perfil COMPLETO de un jugador y una lista de paletas candidatas REALES con sus specs,
precio en ARS y un "popularidad" (1=nicho, 5=muy usada/icónica).

Tu tarea:
- Elegí las 4 o 5 mejores paletas PARA ESE PERFIL, ordenadas de mejor a peor fit.
- SOLO podés elegir paletas de la lista provista, identificadas por su "id". Nunca inventes ids.
- VARIEDAD OBLIGATORIA: máximo UNA paleta por marca. Nunca repitas marca.
- A igualdad de fit, preferí mayor "popularidad". No recomiendes nicho (1-2) salvo que encaje claramente mejor.

REGLAS DURAS DE SEGURIDAD (NUNCA las violes, ni siquiera por preferencia o precio):
- Molestia de CODO: prohibido goma dura, balance alto y carbono 18K. Preferí goma blanda/media,
  balance bajo/medio, peso contenido, forma redonda o lágrima.
- Molestia de HOMBRO: prohibido balance alto y peso > 370g.
- Molestia de MUÑECA: peso máximo ~365g, preferí balance bajo.
- PRINCIPIANTE: prohibido forma diamante, balance alto, y el combo goma dura + carbono 18K.
- Si alguien "necesita potencia" pero no pega fuerte, la potencia viene de goma blanda + salida de
  bola (forma lágrima), NO de balance alto (que solo cansa si no tenés pegada).
- Ante cualquier lesión, el confort pesa MÁS que potencia, durabilidad, marca o precio.

PREFERENCIAS BLANDAS (tenelas en cuenta pero NUNCA pisan las reglas duras):
- marcas_preferidas: subí en el ranking las de esas marcas, pero si hay algo claramente mejor de
  otra marca, recomendalo igual y aclaralo. Igual mostrá al menos una de su marca si encaja.
- comentario_libre: leelo y usalo para afinar (lateralidad, superficie, gustos, restricciones).

EXPLICACIONES:
- Para cada paleta, 2-3 oraciones en español rioplatense (voseo), cálido y claro.
- Conectá la recomendación con lo que la persona respondió ("como nos dijiste que te molesta el codo,
  priorizamos esta goma blanda...").
- Si es principiante, sin jerga técnica. Si es avanzado, podés ser más técnico.
- Respondé únicamente con el JSON pedido.`;

function buildUserMessage(profile: PlayerProfile, candidates: PaddleListItem[]): string {
  const profilePayload = {
    nivel: profile.level,
    estilo: profile.playStyle,
    contextura_fisica: profile.bodyProfile,
    primera_o_upgrade: profile.journey,
    frecuencia_semanal: profile.frequency,
    lesiones: profile.hasInjuries ? (profile.injuryNotes ?? "sí") : "no",
    zonas_molestia: profile.injuryAreas,
    ritmo_partido: profile.matchPace,
    tolerancia_punto_dulce: profile.sweetSpotTolerance,
    preferencia_fuerza: profile.strengthPref,
    objetivos_mejora: profile.improveGoals,
    durabilidad: profile.durability,
    preferencia_balance: profile.balancePref,
    preferencia_dureza: profile.hardnessPref,
    preferencia_cara: profile.facePref,
    le_importa_el_efecto: profile.spinImportant,
    paleta_anterior: profile.previousPaddle,
    quejas_paleta_anterior: profile.previousPains,
    marcas_preferidas: profile.brandSlugs,
    comentario_libre: profile.freeText,
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

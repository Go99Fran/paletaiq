import type { FinderInput } from "@/app/[locale]/buscador/actions";

/**
 * Árbol de preguntas adaptativo del buscador "Elegí mi paleta".
 *
 * Cada pregunta declara `showIf(answers)`: el motor avanza al siguiente paso
 * VISIBLE según las respuestas acumuladas, en vez de un orden lineal con saltos
 * hardcodeados. Esto permite ramas por nivel (principiante vs avanzado),
 * por lesión (zona solo si hay molestia), y por journey (historia solo si upgrade).
 *
 * Los tipos de control los renderiza finder-chat.tsx según `kind`.
 */

export type QuestionKind =
  | "single" // opción única (tarjetas)
  | "multi" // opción múltiple (chips), con maxSelect opcional
  | "scale" // escala de 3 opciones (estilo slider discreto)
  | "yesno" // sí / no
  | "brands" // multi-select de marcas (carga dinámica)
  | "text" // texto libre (opcional)
  | "previous" // texto de paleta anterior (opcional)
  | "budget"; // range slider de precio

export interface QuestionOption {
  value: string;
  /** clave i18n del label dentro del namespace "finder". */
  labelKey: string;
  /** clave i18n de una descripción corta opcional (para tarjetas de nivel, etc.). */
  descKey?: string;
}

export interface Question {
  id: string;
  kind: QuestionKind;
  /** clave i18n del texto de la pregunta. */
  questionKey: string;
  /** clave i18n de un subtexto/microcopy opcional. */
  hintKey?: string;
  /** Opciones para single/multi/scale/yesno. */
  options?: QuestionOption[];
  /** Máximo de selección para multi (ej. objetivos: 2). */
  maxSelect?: number;
  /** La pregunta es salteable (texto libre, marcas, paleta anterior). */
  optional?: boolean;
  /** Se muestra solo si esta función devuelve true para las respuestas actuales. */
  showIf?: (a: FinderInput) => boolean;
}

const isBeginner = (a: FinderInput) => a.level === "beginner" || a.journey === "first";
const isAdvanced = (a: FinderInput) => a.level === "advanced" || a.level === "pro";

export const QUESTIONS: Question[] = [
  {
    id: "level",
    kind: "single",
    questionKey: "qLevel",
    hintKey: "qLevelHint",
    options: [
      { value: "beginner", labelKey: "levelBeginner", descKey: "levelBeginnerDesc" },
      { value: "intermediate", labelKey: "levelIntermediate", descKey: "levelIntermediateDesc" },
      { value: "advanced", labelKey: "levelAdvanced", descKey: "levelAdvancedDesc" },
      { value: "pro", labelKey: "levelPro", descKey: "levelProDesc" },
    ],
  },
  {
    id: "journey",
    kind: "single",
    questionKey: "qJourney",
    options: [
      { value: "first", labelKey: "journeyFirst" },
      { value: "upgrade", labelKey: "journeyUpgrade" },
      { value: "enthusiast", labelKey: "journeyEnthusiast" },
    ],
  },
  {
    id: "bodyProfile",
    kind: "single",
    questionKey: "qBody",
    hintKey: "qBodyHint",
    options: [
      { value: "light", labelKey: "bodyLight" },
      { value: "medium", labelKey: "bodyMedium" },
      { value: "strong", labelKey: "bodyStrong" },
    ],
  },
  {
    id: "frequency",
    kind: "single",
    questionKey: "qFrequency",
    options: [
      { value: "1", labelKey: "freq1" },
      { value: "3", labelKey: "freq2" },
      { value: "5", labelKey: "freq4" },
    ],
  },
  {
    id: "playStyle",
    kind: "single",
    questionKey: "qStyle",
    hintKey: "qStyleHint",
    options: [
      { value: "control", labelKey: "styleControl" },
      { value: "balance", labelKey: "styleBalance" },
      { value: "power", labelKey: "stylePower" },
    ],
  },
  {
    id: "matchPace",
    kind: "scale",
    questionKey: "qMatchPace",
    options: [
      { value: "calm", labelKey: "paceCalm" },
      { value: "medium", labelKey: "paceMedium" },
      { value: "fast", labelKey: "paceFast" },
    ],
    // Un principiante con su primera paleta no tiene "ritmo" definido.
    showIf: (a) => !(isBeginner(a) && a.journey === "first"),
  },
  {
    id: "injuries",
    kind: "yesno",
    questionKey: "qInjuries",
    hintKey: "qInjuriesHint",
    options: [
      { value: "yes", labelKey: "injuryYes" },
      { value: "no", labelKey: "injuryNo" },
    ],
  },
  {
    id: "injuryAreas",
    kind: "multi",
    questionKey: "qInjuryZone",
    hintKey: "qInjuryZoneHint",
    options: [
      { value: "elbow", labelKey: "injuryElbow" },
      { value: "shoulder", labelKey: "injuryShoulder" },
      { value: "wrist", labelKey: "injuryWrist" },
      { value: "back", labelKey: "injuryBack" },
      { value: "other", labelKey: "injuryOther" },
    ],
    showIf: (a) => a.hasInjuries === true,
  },
  {
    id: "strength",
    kind: "scale",
    questionKey: "qStrength",
    options: [
      { value: "needs_power", labelKey: "strengthNeeds" },
      { value: "has_power", labelKey: "strengthHas" },
    ],
  },
  {
    id: "improveGoals",
    kind: "multi",
    questionKey: "qGoal",
    hintKey: "qGoalHint",
    maxSelect: 2,
    options: [
      { value: "power", labelKey: "goalPower" },
      { value: "control", labelKey: "goalControl" },
      { value: "ball_exit", labelKey: "goalBallExit" },
      { value: "comfort", labelKey: "goalComfort" },
      { value: "maneuver", labelKey: "goalManeuver" },
    ],
  },
  // Bloque técnico: solo avanzados/pro. null = "que decidan ustedes".
  {
    id: "balancePref",
    kind: "single",
    questionKey: "qBalancePref",
    hintKey: "qBalancePrefHint",
    options: [
      { value: "high", labelKey: "balanceHigh" },
      { value: "medium", labelKey: "balanceMedium" },
      { value: "low", labelKey: "balanceLow" },
      { value: "", labelKey: "noPref" },
    ],
    showIf: isAdvanced,
  },
  {
    id: "hardnessPref",
    kind: "single",
    questionKey: "qHardnessPref",
    options: [
      { value: "hard", labelKey: "hardnessHard" },
      { value: "medium", labelKey: "hardnessMedium" },
      { value: "soft", labelKey: "hardnessSoft" },
      { value: "", labelKey: "noPref" },
    ],
    showIf: isAdvanced,
  },
  {
    id: "sweetSpot",
    kind: "single",
    questionKey: "qSweetSpot",
    options: [
      { value: "wide", labelKey: "sweetSpotWide" },
      { value: "balanced", labelKey: "sweetSpotBalanced" },
      { value: "small", labelKey: "sweetSpotSmall" },
    ],
    showIf: (a) => a.level !== "beginner",
  },
  // Versión simple del bloque técnico para principiantes (sin jerga).
  {
    id: "comfortVsPunch",
    kind: "single",
    questionKey: "qComfortVsPunch",
    options: [
      { value: "comfort", labelKey: "comfortOption" },
      { value: "punch", labelKey: "punchOption" },
    ],
    showIf: (a) => a.level === "beginner",
  },
  {
    id: "previousPaddle",
    kind: "previous",
    questionKey: "qPrevious",
    optional: true,
    showIf: (a) => a.journey === "upgrade" || a.journey === "enthusiast",
  },
  {
    id: "previousPains",
    kind: "multi",
    questionKey: "qPreviousPain",
    hintKey: "qPreviousPainHint",
    optional: true,
    options: [
      { value: "tiring", labelKey: "painTiring" },
      { value: "lacked_power", labelKey: "painLackedPower" },
      { value: "weak_smash", labelKey: "painWeakSmash" },
      { value: "vibration", labelKey: "painVibration" },
      { value: "low_control", labelKey: "painLowControl" },
      { value: "broke_fast", labelKey: "painBrokeFast" },
    ],
    showIf: (a) => a.journey === "upgrade" || a.journey === "enthusiast",
  },
  {
    id: "brandSlugs",
    kind: "brands",
    questionKey: "qBrands",
    hintKey: "qBrandsHint",
    optional: true,
  },
  {
    id: "freeText",
    kind: "text",
    questionKey: "qFreeText",
    hintKey: "qFreeTextHint",
    optional: true,
  },
  {
    id: "budget",
    kind: "budget",
    questionKey: "qBudget",
    hintKey: "qBudgetHint",
  },
];

/** Pasos visibles para un set de respuestas dado (para la barra de progreso). */
export function visibleQuestions(answers: FinderInput): Question[] {
  return QUESTIONS.filter((q) => !q.showIf || q.showIf(answers));
}

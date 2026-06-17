# Prompt para GitHub Copilot — Loop de refinamiento del buscador "Elegí mi paleta"

> Copiá todo lo de abajo (desde "PROMPT PARA COPILOT") y pegáselo a Copilot en el repo PaletaIQ.

---

## PROMPT PARA COPILOT

Trabajás sobre el repo **PaletaIQ** (Next.js 16 App Router + TypeScript estricto + Tailwind 4 + MySQL nativo con `mysql2`, sin ORM; i18n con `next-intl` ES/EN; arquitectura por capas domain/application/infrastructure/presentation). Respetá esa arquitectura, no rompas i18n, TypeScript estricto sin `any`, y hacé commits chicos. Al terminar: `npm run build` y `npm run lint` deben dar verde, y luego `git add -A`, commit y `git push origin main` (el deploy a Vercel es automático por push).

### Objetivo

Agregar un **loop de refinamiento post-resultados** al buscador inteligente "Elegí mi paleta". Hoy el flujo TERMINA cuando la IA muestra 4-5 paletas recomendadas. Quiero que después de ver los resultados, el usuario pueda decir **"estas no me convencen"** y refinar la búsqueda de forma conversacional, sin empezar de cero. Tiene que ser SÚPER intuitivo.

### Estado actual del buscador (para que ubiques el código)

- **Componente principal:** `src/presentation/components/finder/finder-chat.tsx` (client component, motor de preguntas adaptativo tipo chat).
- **Árbol de preguntas declarativo:** `src/presentation/components/finder/question-tree.ts` (cada pregunta tiene `id`, `kind`, `showIf(answers)`, opciones). El motor avanza al siguiente paso visible según las respuestas.
- **Controles UI ya existentes:** `dual-range-slider.tsx` (slider de precio 0-1M), multi-select con chips, multi-select de marcas, textarea de texto libre, `use-typewriter.ts` (efecto typing del bot).
- **Server action:** `src/app/[locale]/buscador/actions.ts` — exporta `getRecommendations(input: FinderInput): Promise<FinderResult>`. Define `FinderInput` (todas las respuestas) y `FinderResult` (`{ heuristic, recommendations[], budgetExpandedToMax }`). Tiene una función `sanitize(input)` que valida y construye el `PlayerProfile`.
- **Dominio del perfil:** `src/domain/player-profile/player-profile.entity.ts` — `PlayerProfile` con: level, playStyle, bodyProfile, journey, frequency, matchPace, hasInjuries, injuryAreas[], strengthPref, improveGoals[], sweetSpotTolerance, durability, balancePref, hardnessPref, facePref, spinImportant, previousPaddle, previousPains[], brandSlugs[], freeText, budgetMin, budgetMax.
- **Caso de uso:** `src/application/recommendation/recommend-paddles.usecase.ts` — `RecommendPaddlesUseCase.execute(profile, userId)`. Hace: filtro duro SQL (nivel compatible + presupuesto, diversificado por marca con `ROW_NUMBER`), llamada a la IA (`AiRecommender`), validación de ids devueltos, fallback heurístico, y guarda perfil+recomendaciones en DB. Tiene relajación gradual de presupuesto.
- **Ranker heurístico:** `src/application/recommendation/heuristic-ranker.ts` — `heuristicRank(profile, candidates, count)`. Aplica reglas duras de seguridad (codo→no dura/balance alto/18K; principiante→no diamante; etc.), señales de fit, y limita a una paleta por marca.
- **Cliente IA:** `src/infrastructure/ai/anthropic.client.ts` — `createAnthropicRecommender()`. Tiene `SYSTEM_PROMPT` y `buildUserMessage(profile, candidates)` que serializa perfil + candidatas a JSON y pide a Claude un JSON con `{picks: [{paddle_id, reason}]}`. Usa structured output (json_schema). La interfaz del puerto es `AiRecommender.rank(profile, candidates): Promise<RankedPick[]>` en `src/domain/recommendation/ai-recommender.ts`.
- **Repo del candidato/filtro:** `src/infrastructure/db/paddle.mysql.repository.ts` — método `findCandidates(criteria)`. El `PaddleRepository` está en `src/domain/paddle/paddle.repository.ts`.
- **i18n:** las claves del buscador viven en `messages/es.json` y `messages/en.json` bajo el namespace `finder`. NUNCA hardcodear strings; agregar claves en ambos idiomas.

### Qué implementar

#### 1. Capa de refinamiento (dominio + caso de uso)

Crear un concepto de **sesión de búsqueda con feedback acumulado**. El refinamiento NO es un perfil nuevo: parte del `PlayerProfile` original + un objeto de feedback. Diseñá un tipo nuevo, por ejemplo:

```ts
export interface RefinementFeedback {
  // ids de paletas ya mostradas en corridas anteriores (para excluirlas o despriorizarlas)
  shownPaddleIds: number[];
  // ajustes que el usuario pidió en lenguaje de opciones rápidas
  wantMorePower?: boolean;
  wantMoreControl?: boolean;
  wantCheaper?: boolean;
  wantLighter?: boolean;
  excludeBrandSlugs?: string[];     // "no me gusta esta marca"
  newBudgetMax?: number | null;     // ajuste de presupuesto
  // texto libre del usuario diciendo qué no le convenció / qué busca
  freeFeedback?: string | null;
}
```

Extender `RecommendPaddlesUseCase` (o crear un método `refine(profile, feedback, userId)`) que:
- Vuelva a correr el filtro de candidatas, **excluyendo las `shownPaddleIds`** (para no repetir lo ya mostrado), salvo que queden muy pocas candidatas.
- Aplique los ajustes del feedback al filtro/scoring (ej. `wantCheaper` baja el techo de presupuesto; `excludeBrandSlugs` filtra esas marcas; `wantMorePower` sesga el scoring/prompt hacia balance alto/diamante SIEMPRE respetando las reglas duras de seguridad).
- Pase a la IA el **contexto previo**: el perfil + las paletas ya mostradas + el feedback + el texto libre, para que Claude entienda "ya le mostré estas, no le gustaron por X, ahora buscá distinto". Adaptá `buildUserMessage` y el `SYSTEM_PROMPT` para soportar este modo refinamiento (un segundo prompt o un bloque condicional). El heurístico de fallback también debe respetar las exclusiones.
- Las reglas duras de seguridad se mantienen SIEMPRE, aunque el usuario pida "más potencia".

#### 2. Server action

Agregar a `src/app/[locale]/buscador/actions.ts` una nueva action, ej. `refineRecommendations(input: FinderInput, feedback: RefinementFeedbackInput): Promise<FinderResult>`. Validar/sanitizar el feedback igual que se sanitiza el input (es input de cliente: limitar longitud del texto libre, validar slugs con regex, etc.).

#### 3. UI del loop (finder-chat.tsx)

Después de mostrar los resultados, agregar una sección de refinamiento que se sienta parte del chat:
- Un mensaje del bot tipo: *"¿Te sirve alguna? Si no te convencen, afinemos la búsqueda."*
- **Chips de feedback rápido** (quick-reactions): "Muy caras", "Quiero más potencia", "Más control", "Más livianas", "No me gusta [marca]" (por cada marca recomendada), "Ninguna me convence".
- Un **campo de texto libre** prominente: *"Contame qué buscás o qué no te gustó"* con placeholder de ejemplo (ej: "quiero algo parecido a la X pero más barata", "ninguna me cierra, busco algo más cómodo"). Es clave invitar a escribir.
- Un botón **"Buscar de nuevo"** que dispara `refineRecommendations` con el feedback acumulado, muestra el estado "pensando" (reusar el componente `ThinkingBubble` existente), y renderiza la nueva tanda de resultados (que entran al historial del chat, no reemplazan todo).
- Permitir **editar respuestas anteriores**: un link/botón "Cambiar mis respuestas" que deje al usuario reabrir alguna pregunta clave (al menos presupuesto, estilo, objetivos) sin rehacer todo el cuestionario. Si es complejo, como mínimo permitir reabrir el slider de presupuesto y el multi-select de marcas inline.
- Limitar a ~3-4 iteraciones de refinamiento antes de sugerir "mejor ajustá tus respuestas desde el inicio" o "hablá con la comunidad", para que no sea un loop infinito frustrante. Acumular el feedback entre iteraciones (las paletas mostradas se van sumando a `shownPaddleIds`).

#### 4. Más texto libre / input del usuario

Sumar oportunidades de texto libre donde aporte, sin volver tedioso el cuestionario:
- En el refinamiento (lo de arriba) es el lugar principal.
- Evaluá agregar UNA pregunta de texto libre opcional extra en el flujo principal para principiantes/intermedios donde hoy no hay (ej. "¿hay algo puntual que busques en una paleta?"), bien marcada como opcional y salteable.
- Las reacciones rápidas (chips) deben convivir con el texto libre: el usuario que no quiere escribir usa chips, el que quiere detalle escribe.

#### 5. i18n y copy

Todo el copy nuevo en ES (voseo rioplatense, cálido y claro) y EN, en el namespace `finder` de `messages/es.json` y `messages/en.json`. El microcopy de los resultados refinados debe conectar con lo que el usuario dijo (ej: "Dale, busqué opciones más económicas y sin [marca]. Mirá:").

### Criterios de aceptación

- El usuario puede, tras la primera corrida, dar feedback (chips + texto) y obtener una NUEVA tanda de paletas distintas, sin rehacer todo.
- La segunda corrida no repite las paletas ya mostradas (salvo que no haya alternativas).
- El feedback se acumula entre iteraciones.
- Las reglas duras de seguridad se respetan en todas las iteraciones.
- Funciona el fallback heurístico si la IA falla.
- i18n completo ES/EN, mobile-first, respeta `prefers-reduced-motion`.
- `npm run build` y `npm run lint` en verde.

### Notas importantes

- El `AiRecommender` ya existe como puerto; respetá la inyección por interfaz (no llames al SDK de Anthropic desde el caso de uso).
- Para excluir paletas ya mostradas, probablemente necesites extender `findCandidates` en `PaddleRepository`/`paddle.mysql.repository.ts` con un parámetro opcional `excludeIds: number[]` (usar prepared statements, nunca concatenar).
- Mantené el estilo visual: glass + gradiente teal→lima, animaciones de entrada (`animate-rise`, `animate-slide-in-left/right`), chips con el mismo look que el multi-select actual.
- Pequeños wins de intuitividad que podés sumar si te sobra: indicar en los resultados por qué se eligió cada una conectándolo a una respuesta concreta del usuario; un botón "comparar estas" que lleve al comparador con las recomendadas; resaltar la #1 como "la que mejor te queda".

Hacelo incremental: primero dominio + caso de uso + action (backend del refinamiento), commit; después la UI del loop, commit; después i18n y pulido, commit. Verificá build y lint antes de cada push.

---

## Contexto extra que le podés sumar a Copilot si lo pide

- La DB es MySQL en Railway; la `DATABASE_URL` está en `.env` (gitignored). Hay un runner de migraciones: `npm run db:migrate` aplica los `.sql` de `db/migrations/`. Si el refinamiento necesita persistir feedback, agregá una migración nueva (numerada 005_...).
- El catálogo tiene ~13 marcas y varios cientos de paletas con specs (forma, balance, peso, dureza, núcleo, cara, superficie, nivel, tipo de juego, popularidad 1-5) y precios en ARS.
- Hay un campo `popularity` (1-5) que el scoring usa como peso editorial.
- El proyecto ya tiene documentos de diseño en `outputs/` (análisis visual, plan de ejecución, etc.) por si querés contexto de producto.

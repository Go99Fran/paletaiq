# Auditoría Técnica #2 — Calidad y mantenibilidad del código

> Alcance: `src/domain`, `src/application`, `src/infrastructure`, `src/presentation`, config raíz.
> Foco: respeto de capas, estandarización de componentes, factorización de casos de uso/funciones,
> tipado TS, patrones (DI/repos/DRY), tests y deuda técnica. No se modificó código.

## Resumen ejecutivo

- **La arquitectura por capas se respeta con disciplina.** Cero `any` en `src`, cero SQL fuera de
  `infrastructure/db` + `scrape-runner`, `domain/` no importa infra ni Next, y la DI por interfaz
  (`AiRecommender`, repos) está bien aplicada vía `application/factory.ts`. Es una base sana.
- **El tipado del dominio es fuerte** (value objects como union types + constantes `PADDLE_*`
  reutilizadas para validación en server actions). Muy buen patrón anti-sobre-ingeniería.
- **Principal deuda: duplicación.** (1) Las dos server actions del buscador repiten un mapeo
  `Recommendation → FinderRecommendation` idéntico de ~18 líneas; (2) `finder-chat.tsx` (991 líneas)
  repite 3 veces el mismo bloque de clases Tailwind del "chip toggle" y mezcla mucha responsabilidad;
  (3) los 9 scrapers reimplementan helpers casi idénticos (`parseWeight`, `parseBalanceCm`,
  normalización NFD, `extractSlugFromUrl`).
- **No hay tests de ningún tipo** (solo los de `node_modules`). Los puntos de mayor riesgo
  —`heuristicRank`, `compatibleLevels`, `sanitize`, normalizadores de scraping— son funciones puras,
  fáciles de testear, y hoy no tienen ni un caso. Es la oportunidad de infraestructura #1.
- **ESLint mínimo y sin `typecheck` en scripts.** No hay regla que prohíba `any` ni script de
  `tsc --noEmit`; la calidad actual depende de la disciplina manual, no de un guardrail.

## Hallazgos

| # | Sev | Descripción | Archivo:línea | Impacto en mantenibilidad |
|---|-----|-------------|---------------|---------------------------|
| H1 | Media | Mapeo `Recommendation → FinderRecommendation` duplicado verbatim entre `getRecommendations` y `refineRecommendations` (~18 líneas c/u). Si se agrega un campo a la card, hay que tocar dos lugares y es fácil olvidar uno. | `src/app/[locale]/buscador/actions.ts:213-231` y `:254-272` | Duplicación con riesgo de divergencia. |
| H2 | Media | `finder-chat.tsx` es un componente cliente de 991 líneas con ~15 subcomponentes, lógica de scroll, lógica de refinamiento, mapeo de patches y armado de copy. Difícil de navegar y testear. | `src/presentation/components/finder/finder-chat.tsx` (todo) | Archivo monolítico; cualquier cambio obliga a leer todo. |
| H3 | Media | Patrón de clases Tailwind del "chip seleccionable" repetido **3 veces** idéntico (gradiente activo + `glass ... hover:text-primary` inactivo): `MultiSelect`, `BrandSelect`, `QuickChip`. No usa la librería `ui/`. | `finder-chat.tsx:431-436`, `:476-481`, `:832-837` | Estilos sueltos duplicados; viola "nada de estilos repetidos por la app" (CLAUDE §4). |
| H4 | Media | Helpers de parsing casi idénticos copiados en cada scraper: normalización NFD de diacríticos (9 archivos), `parseWeight`/`parseBalanceCm`/`extractSlugFromUrl`/`matchPattern`. | `scrapers/{bullpadel,babolat,kombat,blackcrown,akkeron,adidas,...}.ts` | ~9 copias a mantener; un fix de regex de peso hay que replicarlo N veces. |
| H5 | Baja | Campo `injuryNotes` declarado en `FinderInput`, seteado a `null` en `emptyInput` y **nunca poblado** por ningún paso del chat. Llega siempre `null` al perfil/IA. Campo muerto en toda la cadena. | `finder-chat.tsx:35` (origen) + `actions.ts:148` + `anthropic.client.ts:86` | Código muerto que aparenta funcionalidad inexistente (notas de lesión). |
| H6 | Baja | `execute()` y `refine()` en el caso de uso comparten ~80% de estructura (relajación de presupuesto por tramos, fallback sin precio, save + map de resultado) pero están copiados con variaciones. | `recommend-paddles.usecase.ts:36-111` vs `:113-241` | Dos pipelines paralelos que hay que mantener sincronizados (ya divergen los factores 1.25/1.6 vs 1.15/1.35/1.6). |
| H7 | Baja | `eslint.config.mjs` solo extiende los presets de Next; no hay `no-explicit-any`, `no-floating-promises` ni script `typecheck`. La ausencia de `any` hoy es mérito manual, no garantizado por tooling. | `eslint.config.mjs:1-18`, `package.json:5-21` | Sin red de seguridad para regresiones de tipado. |
| H8 | Info | `list()` interpola `validated` y `LIMIT/OFFSET` directo en el SQL (no placeholders). Está documentado y los valores son internos/numéricos (no input crudo de usuario), así que **no es inyección**, pero rompe la uniformidad de "siempre prepared". | `paddle.mysql.repository.ts:113`, `:151-152` | Inconsistencia de patrón; aceptable pero conviene comentar el invariante (ya lo hace en parte). |

## Bugs / code smells confirmados

- **Code smell — campo muerto `injuryNotes` (H5).** No hay paso de chat que lo escriba; el perfil
  siempre lo manda `null` a Claude y a la heurística. O se conecta a un input real o se elimina del
  `FinderInput`/`PlayerProfile` para no simular una feature que no existe.
- **Code smell — `seenBrandSlugs` matchea marca por nombre, no por slug** (`finder-chat.tsx:628-631`):
  hace `brands.find((x) => x.name === r.brandName)`. Acopla la lógica de exclusión a la igualdad
  exacta del string de nombre. Sería más robusto que `FinderRecommendation` exponga `brandSlug`
  (hoy expone `brandName` pero no `brandSlug`, aunque el dominio sí lo tiene). Frágil ante variaciones
  de nombre.
- **Smell — duplicación de mapeo de salida (H1)** y **de pipeline de recomendación (H6)**: ambos
  caминos ya empezaron a divergir (factores de expansión de presupuesto distintos), señal típica de
  que la copia se desincroniza.
- **Smell — `Math.floor(shownIds.length / 4) + 1` repetido** como cálculo de "iteración" en dos
  lugares del `refine` (`recommend-paddles.usecase.ts:205` y `:224`). Número mágico `4` (tamaño de
  página de resultados) sin constante.
- No se detectaron bugs de corrección graves ni fugas de SQL/secretos. La key de Anthropic se lee
  solo en server (`anthropic.client.ts:150`), el SQL usa prepared/named placeholders salvo lo notado
  en H8, y el manejo de errores del buscador tiene fallback heurístico correcto.

## Oportunidades de mejora (refactors, estandarización, tipos)

1. **Extraer el mapeo de resultado del buscador (H1).** Una función
   `toFinderResult(result: RecommendResult): FinderResult` en `actions.ts` elimina la doble copia y
   centraliza qué campos viajan al cliente. Refactor chico, alto impacto, sin abstracción nueva.
   - De paso, agregar `brandSlug` al `FinderRecommendation` para resolver el smell de match-por-nombre.
2. **Componente `ToggleChip` en `presentation/components/ui/` (H3).** Encapsula el bloque de clases
   `activo/inactivo` y se reutiliza en `MultiSelect`, `BrandSelect`, `QuickChip` (y donde aparezca a
   futuro). Es exactamente el tipo de "componente estándar reutilizable" que pide el brief y hoy falta.
3. **Trocear `finder-chat.tsx` (H2).** Mover `Results`, `BudgetInput`/`MultiSelect`/`BrandSelect`/
   inputs y las "piezas de chat" (`ChatBubble`, `ThinkingBubble`, `ProgressBar`, `TypingDots`) a
   archivos hermanos en `components/finder/`. No agrega capas, solo separa por responsabilidad y
   habilita testear `patchForSingle`/`patchForMulti` aislados.
4. **`scrapers/normalizers/parse-utils.ts` compartido (H4).** Concentrar `normalizeKey` (NFD +
   uppercase + trim), `parseWeightRange`, `parseBalanceCm`/clasificación bajo/medio/alto, y
   `firstUrl/parseSrcset`. Cada scraper queda solo con lo específico de su HTML. Reduce ~9 copias a 1.
5. **Unificar la relajación de presupuesto (H6).** Extraer un helper
   `findCandidatesWithBudgetRelaxation(criteria, factors)` que ambos `execute` y `refine` consuman.
   Elimina la divergencia de factores y el riesgo de arreglar un bug en un solo camino.
6. **Tipos:** reemplazar el cast doble `as unknown as [RowDataPacket[]]`
   (`scrape-runner.ts:208`) por el destructuring estándar de mysql2 `const [rows] = await pool.execute<RowDataPacket[]>(...)`.
   Es el único cast "raro" del repo; el resto del tipado es limpio.

## Funcionalidades de infraestructura sugeridas (tests, CI, tooling)

- **Tests unitarios de funciones puras (prioridad alta).** Sin dependencia de DB ni red:
  - `compatibleLevels` y `heuristicRank` (`application/recommendation/`): cubrir reglas duras de
    seguridad (codo→no dura/18K, principiante→no diamante, variedad de marca). Es lógica de negocio
    crítica y hoy sin red.
  - `sanitize`/`sanitizeFeedback` (`buscador/actions.ts`): inputs basura → perfil válido acotado.
  - Normalizadores de scraping (`normalizers/vocab.ts` + parsers): HTML fixture → `ParsedPaddle`.
  - Stack sugerido por simplicidad: `vitest` (cero config con TS/ESM, encaja con `tsx` ya presente).
- **Script `typecheck` + regla anti-`any`.** Agregar `"typecheck": "tsc --noEmit"` a `package.json`
  y activar `@typescript-eslint/no-explicit-any` y `no-floating-promises` en `eslint.config.mjs`
  para fijar por tooling el estándar que hoy se sostiene a mano.
- **CI mínimo (GitHub Actions):** `install → lint → typecheck → test → build` en PR. Hoy no hay
  workflow; un solo archivo cubre el guardrail básico.
- **Test de contrato del JSON de la IA.** Un test que valide que un payload de `picks` mal formado /
  con ids inventados es descartado correctamente por el use case (la lógica existe en
  `recommend-paddles.usecase.ts:83-87`, pero no está cubierta).

## Quick wins

1. **Eliminar o conectar `injuryNotes` (H5)** — borrar el campo muerto de `FinderInput` o agregar el
   input que lo alimente. Minutos, quita confusión real.
2. **`toFinderResult()` helper (H1)** — desduplica las dos actions, ~15 min.
3. **Constante `RESULTS_PAGE_SIZE = 4`** para reemplazar el `4` mágico repetido en el cálculo de
   iteración (`recommend-paddles.usecase.ts:205,224`).
4. **Agregar `"typecheck": "tsc --noEmit"` a `package.json`** — una línea, habilita verificación local/CI.
5. **Limpiar el cast `as unknown as [RowDataPacket[]]`** en `scrape-runner.ts:208`.
6. **`ToggleChip` en `ui/`** y aplicarlo en los 3 sitios de `finder-chat.tsx` — refactor acotado que
   cumple la regla de componentes estándar del brief.
7. **Activar `no-explicit-any` / `no-floating-promises`** en ESLint — congela el buen estado actual.

---

_Nota de criterio: el repo ya aplica bien el principio anti-sobre-ingeniería del brief (DI por
factory sin container, sin ORM, value objects como unions). Las recomendaciones de arriba son
desduplicación y guardrails, no capas nuevas — alineadas con esa filosofía._

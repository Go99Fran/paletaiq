# Plan de trabajo PaletaIQ — consolidado de auditorías

> Consolidación de 9 auditorías (UX x2, Experto Pádel x2, Usuarios x3, Técnica x2) generadas el 2026-06-18.
> Priorizado para decisión del dueño de producto. Se penaliza la sobre-ingeniería (principio del proyecto).
>
> **Contexto ya verificado en DB (no re-verificar):**
> - Hoy TODOS los precios son ARS (202 filas, 57 paletas activas con precio). El bug de "mezcla de monedas en el mejor precio" es REAL en el código pero LATENTE: se manifestará cuando entren scrapers EUR (siux/nox/starvie).
> - Head (8 modelos) y Wilson (4) YA fueron creadas; imágenes rotas (Akkeron/Bullpadel/Babolat/Adidas) YA arregladas. Esos hallazgos están RESUELTOS y no entran al plan.
> - padel-1, usuario-2 y usuario-3 auditaron solo estático (shell/DB bloqueado): sus afirmaciones sobre cobertura/NULL son hipótesis → ver "Pendientes de verificación".

---

## Resumen ejecutivo

- **La base técnica es sólida.** Arquitectura por capas respetada (cero SQL fuera de infra, cero `any`, DI por factory), seguridad en BAJO (SQL parametrizado, secretos server-only, admin con doble gate, IA no inventa paletas). El theming Tailwind es ejemplar (cero colores crudos). Esto es un piso sano para construir.
- **El buscador inteligente es el corazón y funciona** (lo confirma hasta la usuaria principiante: "el mejor momento de toda la web"). El pipeline filtro-duro → IA → validación → fallback está bien armado y el system prompt es de calidad de coach real.
- **Lo que más duele: la data y su comunicación.** Specs clave (`thickness`, `surface`, `hardness`, `balance_cm`) existen en el modelo pero no se muestran, no se envían a la IA, o se calculan y se tiran. La ficha es jerga cruda sin traducción para el comprador no experto. Es la pantalla donde se decide la compra y es donde todos los perfiles de usuario se pierden.
- **Mobile está roto en navegación.** Sin menú hamburguesa, las dos features estrella (Paletas, Buscador) son inalcanzables desde el header en celular — el grueso del tráfico de pádel.
- **El fallback heurístico puede contradecir las reglas de seguridad del propio prompt** (recomendar diamante a quien no tiene pegada; penalizar pero no excluir paletas contraindicadas para codo). Es un riesgo a la promesa de "recomendación segura".
- **Deuda controlada pero presente:** sin tests, sin rate limiting en endpoints que pagan IA, sin CSP, duplicación en finder/scrapers/use case. Nada bloqueante, todo accionable incrementalmente.

---

## Temas transversales (aparecen en varias auditorías)

| Tema | Apariciones | Auditorías |
|---|---|---|
| **Specs invisibles/incompletas (`thickness`, `surface`, `hardness`) en ficha y comparador; nulos ocultos silenciosamente** | 4 | padel-1, usuario-1, usuario-2, usuario-3 |
| **Ficha = jerga cruda sin traducir a sensaciones de juego para el comprador** | 3 | padel-1, usuario-1, usuario-2 |
| **Specs no se envían a la IA (`surface`/`thickness`/`frame_material`) → la IA decide con menos info que la que se muestra** | 2 | padel-1, padel-2 |
| **Heurístico contradice reglas de seguridad (potencia sin pegada → diamante; lesión solo penaliza, no excluye)** | 2 | padel-2, usuario-3 |
| **Chip "Ninguna me convence" enciende otros chips de forma confusa** | 3 | ux-1 (B1), usuario-1, (lógica en padel-2) |
| **`seenBrandSlugs` matchea marca por nombre exacto → chip "excluir marca" puede no aparecer** | 3 | ux-1 (B2), padel-2 (B3), tecnico-2 |
| **Buscador sin "volver"/editar respuestas (solo restart); flujo largo en mobile** | 3 | ux-1, ux-2, usuario-1 |
| **Comparador no autónomo: no se pueden agregar/quitar paletas desde la propia tabla** | 3 | ux-1, usuario-1, usuario-2 |
| **Mezcla de monedas en "mejor precio" (latente hoy, real con scrapers EUR)** | 1 (+1 técnica) | usuario-3 (crítico), confirmado latente |
| **Chips del finder sin `focus-visible` ni `aria-pressed`; estilos sueltos repetidos 3x (no usan `ui/`)** | 2 | ux-2, tecnico-2 |
| **No se ve qué tienda tiene el mejor precio hasta entrar a la ficha** | 2 | usuario-2, usuario-3 |
| **Buscador demasiado largo para lo que devuelve; preguntas técnicas mal segmentadas por nivel** | 3 | padel-2, usuario-2, usuario-3 |
| **Strings/aria-labels hardcodeados fuera de i18n** | 1 | ux-2 |

---

## Backlog priorizado

| ID | Tema | Tipo | Impacto | Esfuerzo | Prioridad | Auditorías | Archivos clave |
|---|---|---|---|---|---|---|---|
| **B01** | Heurístico: convertir reglas de seguridad por lesión en **exclusión real** (no solo penalizar) y aplicar la misma red a las picks de la IA | bug | Alto | M | **P0** | padel-2 (H3,B2), usuario-3 | `application/recommendation/heuristic-ranker.ts:26-53`, `recommend-paddles.usecase.ts:83-87` |
| **B02** | Heurístico: cruzar `improveGoals='power'` con `strengthPref`; sin pegada → `teardrop`+`soft`, NO diamante | bug | Alto | S | **P0** | padel-2 (H1,B1), usuario-3 | `heuristic-ranker.ts:135-138,167-173` |
| **B03** | Mezcla de monedas en "mejor precio" (`MIN(price)` sin filtrar `currency`; `MIN(currency)` desacoplado) | bug | Alto | M | **P0** | usuario-3 (crítico) | `paddle.mysql.repository.ts` BASE_SELECT, `format.ts` |
| **B04** | Menú hamburguesa mobile con Paletas/Buscador/Comparador (features estrella inalcanzables en celular) | bug/mejora | Alto | S | **P0** | ux-1 (H1) | `presentation/components/layout/site-header.tsx:17-37` |
| **B05** | Enviar `surface`, `thickness`, `frame_material` al payload de la IA | bug | Alto | S | **P0** | padel-1 (H1,H6), padel-2 | `infrastructure/ai/anthropic.client.ts:103-118` |
| **B06** | Mostrar `thickness`, `hardness`, `surface` en ficha y comparador; nulos como "—" explícito + indicador de completitud (no ocultarlos) | bug/mejora | Alto | M | **P1** | padel-1 (H2,H7), usuario-1, usuario-2, usuario-3 | `paletas/[slug]/page.tsx:35-52,104-105`, `comparar/page.tsx:90-112` |
| **B07** | Ficha: traducir specs a sensaciones de juego (1 frase por spec / barras Potencia-Control-Manejo-Tolerancia) | feature | Alto | M | **P1** | padel-1, usuario-1, usuario-2 | `paletas/[slug]/page.tsx`, `heuristic-ranker.ts` (reglas reutilizables) |
| **B08** | `frame_material` editable en admin + en `columnByField` del update | bug | Medio | S | **P1** | padel-1 (H3,bug#1) | `paddle.mysql.repository.ts:250-267`, `admin/.../[id]/page.tsx` |
| **B09** | Persistir `balance_cm` (ya se calcula y se tira en `raw_data`); columna + mostrar junto al enum | mejora | Alto | M | **P1** | padel-1 (H4,bug#3) | `db/migrations/`, `scrapers/bullpadel.ts:335-358`, esquema 001 |
| **B10** | Exponer `brandSlug` en `FinderRecommendation` (en vez de matchear por nombre exacto) → arregla chip "excluir marca" | bug | Medio | S | **P1** | ux-1 (B2), padel-2 (B3), tecnico-2 | `buscador/actions.ts:55-70`, `finder-chat.tsx:628-631` |
| **B11** | Chip "Ninguna me convence": toggle real e independiente (hoy enciende wantCheaper+wantMoreControl) | bug | Medio | S | **P1** | ux-1 (B1), usuario-1 | `finder-chat.tsx:783` |
| **B12** | Chips del finder: `focus-visible` + `aria-pressed`; unificar en `ToggleChip` de `ui/` | bug | Medio | M | **P1** | ux-2 (bug1), tecnico-2 (H3) | `finder-chat.tsx:427,472,829` |
| **B13** | Rate limiting en `getRecommendations`/`refineRecommendations` (denial-of-wallet contra Anthropic) | seguridad | Medio | S | **P1** | tecnico-1 (H1) | `buscador/actions.ts:197,234` |
| **B14** | Mostrar tienda del mejor precio + link directo desde card/listado | mejora | Medio | M | **P1** | usuario-2, usuario-3 | `paddle-card.tsx`, `paddle.mysql.repository.ts` |
| **B15** | Filtro de precio: no descartar paletas sin precio publicado en el camino normal del buscador | bug | Medio | M | **P1** | padel-2 (H4) | `paddle.mysql.repository.ts:211-218`, `recommend-paddles.usecase.ts:68-71` |
| **B16** | Estados faltantes: `loading.tsx` buscador/comparador, `not-found.tsx`/`error.tsx` con marca | mejora | Medio | S | **P1** | ux-1 (H3,H4) | `app/[locale]/buscador/`, `comparar/`, `app/` |
| **B17** | Buscador: botón "volver una pregunta" + resumen de perfil editable | mejora | Alto | M | **P2** | ux-1 (H5), ux-2, usuario-1 | `finder-chat.tsx:181-191,216-220` |
| **B18** | Hints/tooltips para principiantes en preguntas borrosas + opción "no sé / lo que me convenga" | mejora | Medio | S | **P2** | usuario-1 | `question-tree.ts` (qStrength, goalBallExit, improveGoals) |
| **B19** | Modo principiante en `/paletas`: cartel "¿No sabés? dejá que te ayudemos →" + tooltips de forma/balance | mejora | Medio | S | **P2** | usuario-1 | `paletas/page.tsx` |
| **B20** | Filtros por dureza/balance en `/paletas` (+ toggle "apto codo/brazo") | mejora | Medio | M | **P2** | usuario-2 | `paletas/page.tsx`, `paddle.mysql.repository.ts` |
| **B21** | Preservar query string de filtros al ir a ficha y volver; breadcrumb + `aria-current` en nav | mejora | Medio | M | **P2** | ux-1 (H6,H7) | `paletas/[slug]/page.tsx:56-62`, `paddle-card.tsx`, `site-header.tsx` |
| **B22** | Buscador→catálogo y resultado→compra: botón "ver dónde comprar" en resultado del chat + traducir perfil a filtros | mejora | Medio | M | **P2** | ux-1, usuario-1 | `finder-chat.tsx` (Results), `paletas/page.tsx` |
| **B23** | Buscador: segmentar mejor preguntas por nivel (técnico para intermedio que renueva; acortar flujo) | mejora | Medio | M | **P2** | usuario-2, usuario-3, padel-2 (H6,H7) | `question-tree.ts` |
| **B24** | Quitar o conectar campos muertos: `injuryNotes`, `facePref`, `spinImportant` (mandan ruido a la IA) | deuda | Bajo | S | **P2** | tecnico-2 (H5), padel-2 (H8) | `finder-chat.tsx:35`, `anthropic.client.ts:95-96` |
| **B25** | Separar `junior` de `beginner` (mapeo incorrecto mete palas de chicos en candidatas adultas) | bug | Medio | S | **P2** | padel-1 (bug#4,H5) | `scrapers/normalizers/vocab.ts:23` |
| **B26** | Badge "En stock" basado en stock real, no en `storeCount > 0` | bug | Bajo | S | **P2** | ux-1 (B4) | `paddle-card.tsx:23-28` |
| **B27** | a11y chat: acotar `aria-live` al último mensaje; `TypingDots` a `aria-hidden`; diff de tabla con marca textual | mejora | Medio | M | **P2** | ux-2 (bugs 2,6) | `finder-chat.tsx:202-207,960`, `comparar/page.tsx:189` |
| **B28** | Mover aria-labels hardcodeados a i18n (slider, modal "Close", paginación); subir `text-[11px]`→`text-xs` | mejora | Bajo | S | **P2** | ux-2 (bugs 3,4) | `dual-range-slider.tsx:51,63`, `modal.tsx:44`, `pagination.tsx:36` |
| **B29** | Tests unitarios de funciones puras (heuristicRank, compatibleLevels, sanitize, normalizadores) + `typecheck` + ESLint anti-`any` + CI mínimo | deuda | Medio | M | **P2** | tecnico-2 | `package.json`, `eslint.config.mjs`, nuevo `*.test.ts` |
| **B30** | Refactors anti-duplicación: `toFinderResult()`, `parse-utils.ts` compartido scrapers, unificar relajación de presupuesto | deuda | Bajo | M | **P3** | tecnico-2 (H1,H4,H6) | `buscador/actions.ts:213-272`, `scrapers/*`, `recommend-paddles.usecase.ts` |
| **B31** | CSP en `report-only` + hardening (SSL a MySQL, validar host de `image_url`, redactar logs) | seguridad | Bajo | S | **P3** | tecnico-1 (H3,H4) | `next.config.ts:24-34`, `mysql-client.ts` |
| **B32** | Comparar: vista mobile alternativa (cards apiladas/swipe en vez de scroll horizontal); arreglar doble sticky | mejora | Bajo | M | **P3** | ux-2 | `comparar/page.tsx:142-180` |
| **B33** | Specs estructuradas avanzadas a futuro: swingweight, balance_mm, tipo de fibra/core como enum, sweet_spot, gender_use, garantía | feature | Medio | L | **P3** | padel-1, usuario-3 | esquema, `normalizers/` |
| **B34** | Gráfico de precio histórico + (a futuro) alertas de baja | feature | Medio | L | **P3** | usuario-3, usuario-2 | `paletas/[slug]/page.tsx`, esquema `prices` |
| **B35** | Validación de coherencia spec↔spec en normalizador (loguear combos imposibles) | deuda | Bajo | S | **P3** | padel-1 (H8) | `scrapers/normalizers/` |

---

## Plan por fases

### Fase 0 — Quick wins (alto impacto, bajo esfuerzo; se hace ya)
**IDs:** B02, B04, B05, B10, B11, B26, B28
**Objetivo:** Cerrar de un saque los bugs baratos que tocan la promesa central (recomendación correcta, navegación mobile, IA con specs completas) y los arreglos de UX/a11y de minutos. Todo S, sin migraciones.

### Fase 1 — Correcciones core (bugs que afectan la promesa del producto)
**IDs:** B01, B03, B06, B08, B09, B12, B13, B14, B15, B16, B25
**Objetivo:** Garantizar que la recomendación sea segura (lesiones se excluyen, no se penalizan), que el precio local sea confiable (anti mezcla de monedas, blindaje preventivo), que las specs que definen la compra (dureza/superficie/grosor/balance_cm) sean visibles y corregibles, y que el catálogo sea navegable con estados completos.

### Fase 2 — Mejoras de experiencia y datos
**IDs:** B07, B17, B18, B19, B20, B21, B22, B23, B24, B27, B29
**Objetivo:** Hacer la ficha y el listado entendibles para no-expertos (traducción de specs, modo principiante, hints), reducir la fricción del buscador (volver/editar, segmentar por nivel), dar autonomía y orientación de navegación, limpiar campos muertos y poner la red de seguridad de tooling/tests.

### Fase 3 — Features nuevas y escalado
**IDs:** B30, B31, B32, B33, B34, B35
**Objetivo:** Pagar deuda de duplicación, subir la postura de seguridad (CSP/SSL), preparar specs avanzadas estructuradas, gráfico de precio histórico + alertas, y comparador mobile mejorado. Es el carril de diferenciación a mediano plazo (activo de data + fidelización).

---

## Funcionalidades nuevas propuestas (consolidadas)

- **"Cómo se siente esta paleta"** — specs traducidas a 3-4 barras de sensación (Potencia/Control/Manejo/Tolerancia) calculadas con las reglas que ya tiene el heurístico. (B07; padel-1, usuario-1, usuario-2)
- **Modo principiante / "no sé qué buscar"** — cartel y tooltips en el listado + opción "lo que me convenga" en el chat + badge "fácil para empezar". (B18, B19; usuario-1)
- **Buscador→compra directa** — botón "ver dónde comprar" con mejor precio en el propio resultado del chat, y "ver todas las del listado con mi perfil". (B22; ux-1, usuario-1)
- **Tienda más barata visible desde la card** + spread de precios entre tiendas en el comparador. (B14; usuario-2, usuario-3)
- **Buscador/typeahead dentro de `/comparar`** y deep-link "compartir comparación" (URL ya existe). (ux-1, usuario-2)
- **Resumen de perfil editable** al final del buscador + "volver una pregunta". (B17; ux-1, ux-2, usuario-1)
- **Modo experto del comparador** — ordenar/filtrar filas, "solo diferencias", comparar mismo modelo en años/pesos distintos. (usuario-3)
- **Specs avanzadas estructuradas** — swingweight, balance_mm, fibra/core como enum, sweet_spot, gender_use, garantía. (B33; padel-1, usuario-3)
- **Gráfico de precio histórico + alertas de baja** (esquema ya lo soporta). (B34; usuario-2, usuario-3)
- **Toggle de tema claro/oscuro** apoyado en las variables ya centralizadas (bajo costo). (ux-2)
- **"Explicame la diferencia entre las 3"** y **confianza del match** (% fit) tras las recomendaciones. (padel-2)
- **Indicador de completitud y frescura de ficha** ("7/12 specs", "specs validadas", "catálogo actualizado el…") usando `validated` que ya existe. (padel-1, usuario-2)

---

## Pendientes de verificación (sin acceso a DB en 3 auditorías)

> padel-1, usuario-2 y usuario-3 auditaron solo estático. Correr estas consultas antes de invertir en curación:

1. **% de NULL por columna** en `paddles WHERE is_active=1`: `surface`, `thickness`, `hardness`, `balance`, `weight_*`, `year`, `frame_material`. Cuantifica B06/B07 y la deuda de calidad (padel-1 H7, usuario-3 #5).
2. **Distribución por `shape`, `level`, `play_style`** y cuántas paletas tienen `play_style IS NULL` (entran a todos los sesgos del recomendador). (padel-1 H5/H11)
3. **Cobertura de precio/stock:** cuántas activas tienen `current_prices` con `in_stock=TRUE`, y cuántas dentro de rangos típicos (ej. 300k–500k). Determina si el filtro de presupuesto esconde catálogo (padel-2 H4, usuario-2).
4. **`GROUP BY year`** y representación de gamas tope/2025-2026 por marca. (usuario-3)
5. **Confirmar** que migraciones 003/004 ampliaron `improve_goal` a multi-valor y `maneuver` sin pérdida al persistir. (usuario-3 #4)
6. **Confirmar** que `enStock` derivado de precio español (bullpadel.ts:250) NO pinta el badge de stock AR. (padel-1 bug#6)
7. **Confirmar** que `shape.hybrid` de i18n no rompe filtros (ENUM tabla es solo round/teardrop/diamond). (usuario-2)

---

## Métricas de éxito sugeridas

- **Recomendación segura:** 0% de paletas contraindicadas (goma dura + balance alto + 18K para lesión de codo; diamante para principiante) en los resultados del buscador, medido sobre un set de perfiles de prueba. Hoy el fallback puede violarlo (B01/B02).
- **Completitud de ficha:** % de paletas activas con specs clave (dureza/superficie/grosor) cargadas; objetivo de cobertura creciente trimestre a trimestre.
- **Conversión a tienda:** tasa de clics "ver dónde comprar" desde resultado del buscador y desde ficha (hoy el camino a compra es indirecto).
- **Finalización del buscador:** % que llega de la primera pregunta a los resultados; abandono por paso (validar impacto de "volver/editar" B17 y del largo del flujo B23).
- **Navegación mobile:** uso del menú hamburguesa y % de sesiones mobile que alcanzan `/paletas` y `/buscador` (hoy bloqueado, B04).
- **Confianza en el precio:** 0 incidentes de precio en moneda incorrecta una vez activos los scrapers EUR (B03).
- **Calidad técnica:** cobertura de tests en funciones puras críticas (heurístico/normalizadores) > 0 y `typecheck`/CI en verde en cada PR (B29).
- **a11y:** controles del buscador operables por teclado y con `aria-pressed` (auditoría manual con lector de pantalla) (B12, B27).

# Auditoría Usuario Avanzado — "Lucas, 26, categoría 3ra, pegador"

> Nota metodológica: intenté correr las consultas SELECT contra la DB real con
> `node --env-file=.env` + mysql2 como pide la consigna, pero la ejecución de
> Bash/PowerShell quedó denegada por permisos del entorno. Así que esta auditoría
> se apoya en lo que SÍ pude verificar leyendo el código: el esquema real
> (`db/migrations/001_base_schema.sql`), las entidades (`paddle.entity.ts`), el
> roster de scrapers que define qué marcas y monedas entran al catálogo
> (`src/infrastructure/scraping/scrapers/`), los normalizadores, y todo el pipeline
> del comparador, la ficha y el buscador IA. Donde cito "specs reales" me refiero a
> la forma y los límites de la data tal como el código la produce y la muestra.
> Los conteos exactos de filas (cuántas paletas activas, cuántas con cada spec en
> NULL) no los pude correr; los marco como pendientes de verificación con DB en mano.

## Mi experiencia

Entré buscando lo de siempre: chequear specs finas de las paletas 2025/2026 que tengo
en el radar, comparar dos o tres lado a lado y ver el precio real en pesos. Lo primero
que valoro es que es argentino: precios en ARS, tiendas locales y un comparador que
no me obliga a traducir "pala" a "paleta". La ficha es limpia, el comparador resalta
las filas que difieren, y el chat del buscador es lindo de usar. Pero apenas rasqué la
superficie técnica, empecé a desconfiar: las specs que a mí me importan (perfil/grosor
real, swingweight, RPM/rugosidad medida, sistema de pesos, tipo exacto de carbono y core)
o no están, o están en categorías tan gruesas que no me dicen nada. Es un comparador de
nivel "entrada/intermedio" disfrazado de comparador serio.

El golpe de gracia a la confianza fue darme cuenta de que el "mejor precio" mezcla
monedas: hay marcas que entran al catálogo con precio en EUR y el sistema las trata
como si fueran ARS. Para alguien como yo, que justamente vengo a esta web por el precio
local, eso es romper la promesa central. Me quedo con ganas, porque la base está; pero
hoy, para specs finas y novedades, me sigo yendo a una española.

## Lo que me gustó

- **Foco argentino real.** Precios en ARS, tiendas locales, historial de precio por
  tienda y un badge de stock (`in_stock`) en la ficha (`paletas/[slug]/page.tsx`). Eso
  ya es más útil para mí que cualquier comparador español.
- **Comparador con diff highlighting.** En `comparar/page.tsx` la lógica `rowDiffers`
  pinta de fondo `bg-primary/10` solo las filas donde los valores difieren entre paletas.
  Para comparar rápido es exactamente lo que quiero ver.
- **Aviso de precio viejo.** `isPriceStale` (umbral 14 días, `format.ts`) marca con ícono
  de alerta los precios desactualizados. Detalle honesto que la mayoría de los comparadores
  no tiene.
- **El pipeline de IA está bien pensado en el papel.** La IA solo rankea candidatas reales
  de la DB y se validan los ids devueltos (`recommend-paddles.usecase.ts`, el `validIds`
  filtra ids inventados). No alucina paletas. Bien.
- **Reglas duras de fitter.** El `safetyPenalty` del `heuristic-ranker.ts` y el system prompt
  codifican criterio real (codo → nada de goma dura/balance alto/18K; principiante → nada de
  diamante). Eso está por encima de la media.
- **Diversificación por marca.** `findCandidates` usa `ROW_NUMBER() OVER (PARTITION BY brand_id)`
  con máximo 3 por marca, y la IA tiene "máximo UNA paleta por marca". No me va a tirar 5 Bullpadel.

## Lo que no me convenció / me hizo desconfiar

### [CRÍTICO] El "mejor precio" mezcla monedas (EUR tratado como ARS)
- **Qué:** El catálogo entra por scrapers, y varios de ellos están configurados en EUR, no en
  ARS. En `shopify-sources.ts`: `siux` → `currency: "EUR"`, `nox` → `"EUR"`, `starvie` → `"EUR"`.
  Solo `vairo` y `dropshot` (las `.com.ar`) están en ARS.
- **Dónde:** `paddle.mysql.repository.ts`, `BASE_SELECT`. El "mejor precio" sale de
  `MIN(price)` sobre `current_prices` **sin filtrar por moneda**, y devuelve `MIN(currency)`
  por separado. Si una paleta tiene un precio de 250 (EUR) y otro de 380000 (ARS), el `MIN`
  elige 250 y lo muestra. Encima `formatPrice` (`format.ts`) fuerza el símbolo según locale,
  así que en `es-AR` un precio de "250 EUR" se renderiza como "$ 250" pareciendo pesos.
- **Por qué me hace desconfiar:** Vengo por el precio local. Si el "desde $250" en realidad
  son 250 euros (~$300.000+), o si el "mejor precio" elige un EUR ridículamente bajo por ser
  el `MIN`, la cifra estrella de toda la web es basura. Y el filtro `precio_min`/`precio_max`
  de `paletas/page.tsx` filtra sobre ese mismo número mezclado: poner "hasta $400.000" puede
  dejar afuera paletas argentinas y dejar adentro europeas baratas en euros.

### [ALTO] Specs demasiado gruesas para nivel avanzado
- **Qué:** El modelo (`paddle.entity.ts` + migración 001) tiene `balance` y `hardness` como
  ENUMs de 3 valores (`low/medium/high`, `soft/medium/hard`). Yo no comparo paletas en
  "balance medio": comparo en mm de perfil de balance, en swingweight, en si el core es
  multieva o monoeva, en si el carbono es 3K/12K/18K/raw. La web tiene `thickness` (mm) y
  `face_material` como texto libre, pero:
  - **Falta swingweight / balance numérico.** No hay campo. Para un pegador es EL dato.
  - **`balance` en 3 baldes** no distingue una Diamante 380 de una Lágrima 365.
  - **`weight_min/weight_max`** es un rango, no el peso real ni el sistema de pesos (las marcas
    venden la misma paleta en varios pesos; acá se aplana).
- **Dónde:** ficha (`paletas/[slug]/page.tsx`, array `specs`) y comparador
  (`comparar/page.tsx`, array `rows`). Ninguno muestra perfil/grosor de balance, RPM/rugosidad,
  ni tipo de fibra detallado más allá del texto de `face_material`.

### [ALTO] La superficie (rugosidad/spin) está infrautilizada y casi nunca cargada
- **Qué:** Existe `surface ENUM('rough','smooth')`, pero ni la ficha ni el comparador la
  destacan, y `spinImportant` del perfil solo pesa en el heurístico (`+1` si `rough`). Para
  un pegador el efecto es clave y un enum binario rugosa/lisa es pobre (no distingue rugosidad
  de fábrica vs tratamiento, ni RPM).
- **Dónde:** `heuristic-ranker.ts` línea ~184; en el comparador `surface` está en `rows` pero
  si viene NULL muestra "—".

### [MEDIO] El buscador IA me subestima como avanzado
- **Qué:** El árbol de preguntas (`question-tree.ts`) abre el bloque técnico
  (`balancePref`, `hardnessPref`) **solo** para `advanced`/`pro` (`showIf: isAdvanced`), lo cual
  está bien, PERO incluso ahí las opciones son las mismas 3 baldas (high/medium/low). No me
  pregunta swingweight objetivo, ni grosor (38 vs 38.5), ni tipo de carbono que busco, ni si
  quiero core dual/multieva. Para un 3ra eso es básico.
- **Otra:** `frequency` solo ofrece 1/3/5 (`freq1/freq2/freq4`), no hay "todos los días/competitivo".
  Yo juego 4-5 y caigo en "5", aplastando el matiz.
- **Dónde:** `question-tree.ts` (preguntas `balancePref`, `hardnessPref`, `frequency`).

### [MEDIO] Catálogo sin las marcas/gamas tope que mira un avanzado
- **Qué:** Las marcas del catálogo salen del roster de scrapers (`scrapers/index.ts`):
  adidas, akkeron, babolat, blackcrown, bullpadel, felina, kombat, siux, nox, royal, vairo,
  starvie, dropshot. **Faltan marcas que cualquier 3ra mira:** Head (Delta/Zephyr/Extreme),
  Wilson, Nox top reciente (AT10/ML10 más allá del listado genérico), Bullpadel Hack/Vertex
  como líneas explícitas, Adidas Metalbone, Vibor-A, Black Crown Piton/Genius (ok hay BC),
  StarVie Metheora/Raptor. El roster no garantiza que las gamas pro estén bien representadas.
- **Pendiente DB:** confirmar cuántas paletas activas hay por marca y cuántas son modelos
  2025/2026 vs viejos (consulta `GROUP BY year`), no lo pude correr.

### [MEDIO] No hay precio histórico visual ni alertas
- **Qué:** El esquema soporta historial (`prices` con índice `(paddle_id, store_id, scraped_at)`)
  y la ficha lista `history` como texto, pero solo aparece `if (history.length > 1)` y es una
  lista plana, sin gráfico ni "mínimo histórico". No hay alertas de baja de precio (declarado
  fuera de MVP, pero es justo lo que me fidelizaría).

## Lo que me faltó

- **Profundidad de specs:** swingweight, balance en mm, grosor exacto (38/38.5/39), tipo de
  core (monoeva/dual/multieva/foam con densidad), tipo de fibra preciso (3K/12K/18K/raw/tricarbón),
  marco (caja/redondo), RPM/rugosidad medida, sistema de pesos disponibles. Hoy `face_material`/
  `core_material` son texto libre sin estructura comparable.
- **Comparativa fina:** poder comparar por columnas ordenables/filtrables, ver delta de precio
  entre tiendas en la misma vista, y un "modelo anterior vs actual" (ej. la del año pasado vs la 2025).
- **Precios/alertas:** gráfico de precio histórico con mínimo histórico marcado, alerta de baja,
  y comparativa de precio entre todas las tiendas argentinas en una tabla con envío incluido.
- **Novedades 2025/2026:** un feed de "recién salidas", filtro por `year`, badge de "nuevo".
  Hoy `year` es filtrable por URL pero no hay UI de orden por año ni destaque de lo nuevo.
- **Reviews / data de pros:** qué paleta usa cada profesional, reviews de la comunidad,
  valoraciones. Es lo que diferencia una ficha "de catálogo" de una "de referencia".

## Cómo me ganarían como usuario fiel

1. **Arreglar el precio multi-moneda YA** y mostrar siempre ARS (convertir EUR→ARS con tipo de
   cambio guardado, o no mostrar fuentes EUR como precio local). Sin esto, lo demás no importa.
2. **Specs estructuradas de nivel pro:** agregar columnas/atributos para swingweight, balance en
   mm, grosor, tipo de core, tipo de fibra y rugosidad numérica. Aunque vengan parcialmente
   cargados, que existan y sean comparables.
3. **Comparador "modo experto":** ordenar/filtrar filas, toggle "solo diferencias" (ya tienen el
   diff calculado), y comparar misma paleta en distintos pesos/años.
4. **Gráfico de precio histórico + alertas por mail.** El esquema ya lo soporta; es la feature
   killer para alguien que espera la baja.
5. **Sumar Head, Wilson, Nox/Adidas/Bullpadel gamas tope** y un feed de novedades con filtro por
   año y badge de "2026".
6. **Buscador IA con carril avanzado:** preguntar swingweight/grosor/fibra objetivo y "qué paleta
   usás hoy y qué le cambiarías" estructurado, no como texto libre suelto.
7. **Reviews + paletas de pros.** Aunque sea curado a mano al principio.

## Bugs / datos técnicos incorrectos que detecté

1. **[CRÍTICO] Mezcla de monedas en "mejor precio".** `BASE_SELECT` en
   `paddle.mysql.repository.ts` hace `MIN(price)` sobre `current_prices` sin agrupar/filtrar por
   `currency`, y trae `MIN(currency)` como columna independiente, desacoplada del precio elegido.
   Con fuentes en EUR (`siux`, `nox`, `starvie` en `shopify-sources.ts`) el `MIN` puede elegir un
   precio en euros y mostrarlo. `formatPrice` (`format.ts`) además fuerza el símbolo por locale,
   así que un EUR se ve como "$" en `es-AR`. Afecta listado, ficha, comparador y los filtros
   `precio_min/precio_max`.

2. **[ALTO] Los filtros de precio comparan números de monedas distintas.** En
   `list()` (`paddle.mysql.repository.ts`) `bp.best_price >= :priceMin` / `<= :priceMax` operan
   sobre el mismo `best_price` multi-moneda. Filtrar "hasta $400.000" mezcla ARS con EUR.

3. **[MEDIO] `frequency` pierde resolución.** En `question-tree.ts` solo hay 1/3/5; un jugador
   que entrena 4-5 veces no tiene opción real de "competitivo/diario". El perfil
   (`player_profiles.frequency TINYINT`) soporta más granularidad de la que la UI ofrece.

4. **[MEDIO] `improve_goal` del perfil queda corto vs la UI.** La migración 001 define
   `improve_goal ENUM('power','control','ball_exit','comfort')` (singular), pero el front maneja
   `improveGoals` como array con hasta 2 y agrega `maneuver` (`question-tree.ts`,
   `patchForMulti`). Hay desalineación entre lo que el chat captura y lo que el esquema base
   persiste; conviene verificar que migraciones posteriores (003/004) lo amplíen y que no se
   pierdan objetivos como `maneuver` al guardar.

5. **[MEDIO] Specs en NULL muy probables y silenciadas.** La ficha filtra
   `specs.filter((s) => s.value !== null)` y el comparador muestra "—". Con specs que vienen de
   scraping de Shopify/TiendaNube por regex de título (`nivelFromTitle` en `shopify-sources.ts`),
   es altísima la chance de que `balance`, `hardness`, `surface`, `weight`, `thickness` y `year`
   estén mayormente vacíos. Para un avanzado, una ficha con media docena de specs en "—" no es
   confiable. **Pendiente:** correr el conteo de NULL por columna en `paddles WHERE is_active=1`
   para cuantificarlo (no pude ejecutar la query).

6. **[BAJO] `MIN(currency)` es semánticamente incorrecto.** Tomar el mínimo alfabético de la
   moneda ("ARS" < "EUR" < "USD") no tiene relación con el precio elegido por `MIN(price)`.
   Es un side-effect del mismo bug de moneda.

7. **[BAJO] Nivel inferido por palabra clave del título.** En `shopify-sources.ts` el nivel se
   deduce de strings del nombre (ej. `\bGO\b` → intermedio). Eso va a clasificar mal modelos
   cuyo nombre no matchee, y como avanzado lo voy a notar al filtrar por nivel.

---

Archivo generado: `C:\Users\franc\Desktop\Workspace\personal\paletaiq\docs\auditorias\usuario-3-avanzado.md`

# Auditoría Experto Pádel #1 — Calidad de datos y specs

> Alcance: modelo de datos de paletas, normalización del scraping, ficha de paleta,
> comparador y pipeline de recomendación. Auditoría estática del código (no se pudo
> consultar la DB en vivo: las herramientas de shell estaban bloqueadas en esta sesión,
> así que las afirmaciones sobre *cobertura real* de specs quedan marcadas como
> "pendiente de verificar contra la DB").

---

## Resumen ejecutivo

- El esquema canónico cubre bien las specs **estructurales** que un jugador usa para
  pre-filtrar (forma, balance, peso, núcleo, cara, dureza, superficie, nivel, estilo,
  grosor). Es un buen piso. Pero le faltan specs **diferenciales** que hoy mueven la
  decisión de compra en pádel real: **balance numérico en cm**, **perfil/grosor real
  con marco vs. plano**, **sistema/canales antivibración**, **garantía/rotura** y
  **lateralidad/uso (hombre-mujer-junior)**. Sin esas specs el comparador "empata" paletas
  que en cancha se sienten muy distintas.
- Hay **3 specs que existen en la base pero se pierden en el camino**: `surface`
  (rugosidad), `frame_material` y `thickness` están en el esquema pero NO se envían a la
  IA; `thickness` además no se muestra en la ficha; `frame_material` no es editable desde
  el admin (bug de mantenimiento de datos). Esto degrada tanto la recomendación como la
  capacidad de corregir data.
- La **normalización de nivel y estilo de juego es endeble y derivada por heurística**
  (path de la URL, palabras sueltas). En pádel `nivel` y `play_style` no son specs
  objetivas: son etiquetas comerciales de cada marca. Tratarlas como verdad canónica para
  el *filtro duro* del recomendador es el mayor riesgo de calidad del producto.
- El `balance` se colapsa a 3 baldes (`low/medium/high`) tirando el dato fino: el scraper
  de Bullpadel **sí parsea los cm exactos** (`balance_cm`) pero los entierra en `raw_data`
  en vez de persistirlos en una columna comparable. Es regalar el activo más valioso.
- La ficha comunica de forma limpia, pero **es puramente una tabla de specs crudas**: no
  traduce specs a *sensaciones de juego* (lo que un comprador realmente necesita), no
  muestra grosor, no muestra historial de precio en gráfico, y filtra silenciosamente las
  specs nulas (lo cual oculta cuán incompleta está la ficha).

---

## Hallazgos

| # | Severidad | Descripción | Evidencia | Impacto para el jugador |
|---|-----------|-------------|-----------|--------------------------|
| H1 | **Alta** | `surface` (rugosa/lisa) se persiste pero **no se envía a la IA** ni pesa en el filtro. El efecto/spin es decisión clave para jugadores ofensivos. | `anthropic.client.ts:103-118` (payload de candidatas sin `surface`); el heurístico sí lo usa (`heuristic-ranker.ts:184`). | La IA recomienda sin saber si la paleta da efecto; un pegador que pidió spin puede recibir una paleta lisa. |
| H2 | **Alta** | `thickness` (grosor/perfil en mm) existe en esquema y admin, pero **no se muestra en la ficha**, **no está en el comparador** y **no se envía a la IA**. | `paletas/[slug]/page.tsx:35-52` (array `specs` sin grosor); `comparar/page.tsx:90-112`; `anthropic.client.ts:103-118`. | El perfil (38 vs 38.5 mm) define salida de bola y rigidez. El comprador no lo ve y la comparación queda incompleta. |
| H3 | **Alta** | `frame_material` se muestra en la ficha pero **no es editable en el admin** ni está en el mapa de `update`. Dato no corregible = se pudre. | `paddle.mysql.repository.ts:250-267` (`columnByField` sin `frame_material`); admin `[id]/page.tsx` sólo tiene `coreMaterial`/`faceMaterial`. | Si el scraper mete mal el marco, nadie puede arreglarlo desde el panel. Va contra el objetivo "corregir specs que el scraping saca mal". |
| H4 | **Alta** | El `balance` numérico (cm) **se calcula y se descarta**. El scraper de Bullpadel obtiene `balanceCm` pero lo guarda sólo en `raw_data`; el esquema sólo tiene el enum de 3 valores. | `bullpadel.ts:335-358` (`parseBalance` devuelve `balanceCm`), `bullpadel.ts:258` (queda en `rawData.balance_cm`); esquema `001:25` sólo `ENUM('low','medium','high')`. | Dos paletas "medium" pueden diferir 1,5 cm de balance (enorme en sensación). El comparador las muestra idénticas. Se tira el dato más fino del catálogo. |
| H5 | **Alta** | `level` y `play_style` son **derivados por heurística frágil** (categoría del path de la URL, mapeo de palabras). Y son la base del **filtro duro** del recomendador. | `bullpadel.ts:390-405` (`inferCategoria` por substrings tipo "tour"/"cloud"); `vocab.ts:18-30`; `recommend-paddles.usecase.ts:37-44` (filtra por `compatibleLevels`). | Una paleta mal clasificada de nivel queda fuera del universo de candidatas y nunca se recomienda, aunque sea perfecta. Ruido de datos = recomendación sesgada. |
| H6 | Media | El payload a la IA **no incluye `frameMaterial` ni `surface` ni `thickness`**, pero la ficha de comparación sí omite `frame`/`thickness`/`year` parcialmente. Inconsistencia entre lo que ve el humano y lo que "ve" la IA. | `anthropic.client.ts:103-118` vs `paletas/[slug]/page.tsx:35-52` vs `comparar/page.tsx:90-112`. | El motor decide con menos info que la que mostramos; la explicación de la IA puede contradecir la ficha. |
| H7 | Media | La ficha **filtra silenciosamente las specs nulas** (`specs.filter(s => s.value !== null)`). Una paleta con 3 specs cargadas se ve "completa". | `paletas/[slug]/page.tsx:104-105`. | El comprador no percibe que la ficha está incompleta y no puede pedir/esperar más data. Esconde la deuda de calidad de datos. |
| H8 | Media | No hay validación de **coherencia entre specs**. Nada impide `shape='diamond'` + `play_style='control'`, o `balance='high'` + `weight_max=350`. | No existe ninguna regla de consistencia en `normalizers/` ni en `update`. | Entran combinaciones imposibles que confunden al comprador y envenenan al recomendador. |
| H9 | Media | `weight_min`/`weight_max`: cuando la fuente da un único peso, se setea `min=max=n`. El rango real de fábrica suele ser 360-385 g. | `bullpadel.ts:376-382` (`parseWeight` single → min=max). | "Peso 365–365 g" comunica falsa precisión; el jugador cree que no hay rango cuando sí lo hay. |
| H10 | Baja | No se guarda **fuente/última actualización por spec**. `raw_data` y `validated` existen, pero no hay trazabilidad de qué spec vino de dónde ni cuándo. | esquema `001` (`raw_data JSON`, `validated`, sin `specs_updated_at` por campo). | Difícil saber si una spec está obsoleta (modelos cambian núcleo entre años con el mismo nombre). |
| H11 | Baja | `playStyles` en `findCandidates` incluye `OR p.play_style IS NULL` — las paletas sin estilo entran a TODOS los sesgos. | `paddle.mysql.repository.ts:205-210`. | Razonable como red de seguridad, pero infla candidatas con data faltante; conviene medir cuántas son NULL (pendiente verificar en DB). |

---

## Bugs / datos incorrectos detectados

1. **`frame_material` no actualizable (bug funcional).** Está en la entidad y en la ficha,
   pero no en `columnByField` del `update` (`paddle.mysql.repository.ts:250-267`) ni como
   input en el admin. Cualquier corrección humana del marco es imposible. — *Fix directo:
   agregar `frameMaterial: "frame_material"` al mapa y el input en el form.*

2. **`thickness` cargado pero invisible.** El admin lo deja editar
   (`admin/.../page.tsx:126-129`) y el repo lo guarda, pero la ficha
   (`paletas/[slug]/page.tsx`) nunca lo lista y el comparador tampoco. Dato fantasma.

3. **`balance_cm` calculado y tirado.** `bullpadel.ts:351-356` calcula el balance en cm y
   lo único que hace con él es meterlo en `raw_data.balance_cm`. No hay columna donde viva.

4. **Mapeo `junior → beginner` (vocab.ts:23).** Una pala junior NO es lo mismo que una de
   iniciación adulta (peso, longitud de mango, cabeza más chica). Colapsarlas a `beginner`
   mete palas de chicos en las candidatas para adultos principiantes. Es incorrecto en
   términos de pádel.

5. **`bullpadel.ts:341-344` precedencia de balance:** chequea `ALTO`/`BAJO`/`MEDIO` por
   `includes` sobre el texto en mayúsculas. Si el texto dijera "balance medio-alto" matchea
   `ALTO` primero por orden, perdiendo el matiz. Borde, pero documentable.

6. **`enStock: precioEur !== undefined` (bullpadel.ts:250).** Se infiere stock de "hay
   precio". Eso es precio de la fuente española de specs, no stock argentino real — el
   stock que importa al comprador viene de `current_prices`/tiendas AR, no de Bullpadel.es.
   Riesgo de mostrar "disponible" sin disponibilidad local. *Verificar que este `enStock`
   no termine pintando el badge de stock de la ficha AR.*

---

## Oportunidades de mejora (specs faltantes, normalización)

Specs que un comprador de pádel real busca y que el modelo NO captura hoy:

- **`balance_cm` (DECIMAL, cm).** El dato más diferencial. Persistirlo además del enum.
  Permite ordenar y comparar de verdad ("24,8 vs 26,2 cm"). Ya se está calculando.
- **`profile_mm` / perfil real.** Hoy `thickness` mezcla concepto. Distinguir grosor del
  plano (38 / 38.5 mm) y, si la fuente lo da, perfil variable.
- **Sistema antivibración / canales / refuerzos** (ej. nervios de carbono, marco
  reforzado, sistemas propietarios). Hoy se pierde en `description`.
- **Punto dulce / sweet spot declarado** (alto/centrado/bajo). El perfil del jugador ya
  pregunta `sweetSpotTolerance` (`heuristic-ranker.ts:163-173`) pero la paleta no tiene la
  spec correspondiente: se infiere sólo de `shape`. Agregar columna `sweet_spot` cerraría el
  círculo perfil↔paleta.
- **Uso recomendado (`gender_use`):** hombre / mujer / unisex / junior. Hoy `junior` se
  disfraza de `beginner`. Crucial en Argentina (mucha venta de palas de mujer/junior).
- **Garantía y política de rotura** (meses, cobertura). Es argumento de compra fuerte en
  gama media-alta.
- **Longitud/forma de puño y peso del grip** — secundario, pero diferencia ergonómica.
- **Tecnología de cara declarada y gramaje del tejido** ya está como texto libre en
  `face_material`; **normalizarlo a un enum/estructura** (3K/12K/18K/fibra vidrio/+) para que
  sea filtrable y comparable, en vez de string libre que la IA lee como prosa.
- **Núcleo: normalizar densidad de EVA** (soft/medium/hard ya existe en `hardness`, pero
  `core_material` es texto libre tipo "EVA Soft High Memory"). Un enum de densidad +
  composición separados harían la comparación real.

Normalización / consistencia:

- **Validación de coherencia spec↔spec** en el normalizador (rechazar/loguear combos
  imposibles, ver H8).
- **Capa de confianza por spec**: marcar cuáles vienen scrapeadas vs. validadas a mano
  (hoy `validated` es a nivel paleta entera, todo o nada).
- **Unidades canónicas garantizadas**: `plausibleWeight` (vocab.ts:63) ya valida rango
  280-420 g — bien. Hacer lo mismo para balance (cm 23-28) y grosor (37-40 mm).

---

## Funcionalidades nuevas sugeridas (desde la óptica del jugador)

- **"Cómo se siente esta paleta" — specs traducidas a sensaciones.** Sobre la ficha,
  derivar 3-4 ejes (Potencia / Control / Manejabilidad / Tolerancia al error) en barras
  0-100 calculadas desde forma+balance+peso+dureza. Es lo que el comprador entiende; la
  tabla de specs cruda es para el experto. La lógica del `heuristic-ranker` ya tiene casi
  todas las reglas para computar esos ejes.
- **Comparador con resaltado de diferencias "que se notan en cancha"**: ya se marca lo que
  difiere (`comparar/page.tsx:116-122`); sumar una nota de *qué implica* esa diferencia
  (ej. "+1,5 cm de balance ⇒ más potencia, menos manejo").
- **Filtro/orden por balance en cm y por grosor** una vez persistidos.
- **"Paletas similares pero más baratas"** usando specs + `bestPrice`: el activo de data
  más el historial de precios lo habilitan directo.
- **Indicador de completitud de ficha** (ej. "ficha 7/12 specs") para que el comprador
  sepa cuánta info hay y para priorizar curación interna (ver H7).
- **Equivalencias entre años de un mismo modelo** (qué cambió de la 24 a la 25): hoy `year`
  existe pero no se explota.
- **Recomendación que también muestre por qué NO otras**: con tanto dato, "descartamos las
  de diamante por tu codo" genera confianza.

---

## Quick wins

1. **Agregar `surface` y `thickness` (y `frameMaterial`) al payload de la IA**
   (`anthropic.client.ts:103-118`). Una línea por campo; la IA ya tiene las reglas para
   usarlos. Cierra H1, H2 (parcial), H6.
2. **Mostrar `thickness` en la ficha y en el comparador** (agregar una fila al array
   `specs` en `paletas/[slug]/page.tsx:35-52` y a `rows` en `comparar/page.tsx:90`). Cierra
   H2.
3. **Hacer `frame_material` editable**: agregar al `columnByField`
   (`paddle.mysql.repository.ts:250`) y un `<Input name="frameMaterial">` en el admin.
   Cierra H3.
4. **Persistir `balance_cm`**: nueva columna `balance_cm DECIMAL(4,1) NULL`, escribirla desde
   `bullpadel.ts` (ya está calculada) y mostrarla junto al enum. Migración chica + 2 líneas.
   Cierra H4 sin romper nada.
5. **Separar `junior` de `beginner`** en `vocab.ts:23` (mapear a un nuevo valor o a un campo
   `gender_use='junior'`). Evita meter palas de chicos en candidatas adultas. Cierra parte
   de H5/bug #4.
6. **Indicador de completitud en la ficha** en vez de filtrar nulos en silencio: mostrar las
   specs faltantes como "—" (como ya hace el comparador) y un contador. Cierra H7, costo casi
   nulo.
7. **Loguear combos incoherentes** en el normalizador (warning, no excepción) para empezar a
   medir la deuda de calidad antes de invertir en validación dura. Primer paso de H8.

---

*Nota de verificación pendiente:* las distribuciones reales (cuántas paletas por marca/forma/
nivel, % de specs NULL, paletas sin precio AR) no pudieron consultarse en esta corrida porque
el acceso a shell/MySQL estaba bloqueado. Recomiendo correr los conteos por `shape`, `level`,
`play_style`, `surface IS NULL`, `thickness IS NULL` y `balance` para cuantificar H5/H7/H11
antes de priorizar la curación.

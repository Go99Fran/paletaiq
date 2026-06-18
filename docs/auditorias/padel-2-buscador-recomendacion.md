# Auditoría Experto Pádel #2 — Buscador inteligente y recomendación

> Auditoría desde la mirada de coach/fitter de pádel. Foco: calidad del perfilado, sensatez
> del filtro duro, mapeo perfil→specs, prompt a Claude, explicaciones y fallback heurístico.
> No se modificó código.

## Resumen ejecutivo

- **El esqueleto es sólido y profesional.** El pipeline (filtro duro → IA rankea/explica → valida ids → fallback heurístico) está bien implementado, y el modelo de perfil es mucho más rico que el mínimo del brief (contextura, ritmo, sweet spot, quejas de paleta anterior, refinamiento iterativo). Las reglas duras de seguridad por lesión están razonadas como las haría un fitter real.
- **Hay una incoherencia de criterio importante:** el heurístico recomienda forma **diamante** para objetivo "potencia" y sweet-spot "chico" a CUALQUIER perfil, incluyendo gente sin pegada — contradiciendo la propia regla de oro del sistema ("potencia sin pegada = goma blanda + lágrima, NO balance alto/diamante"). El prompt a Claude sí respeta la regla; el fallback no.
- **El filtro duro de nivel es demasiado ancho** (un `beginner` puede recibir paletas `advanced`/`pro` vía `compatibleLevels`), y **el filtro de precio descarta silenciosamente toda paleta sin precio publicado** en el camino normal, lo que en una DB argentina con stock incompleto puede vaciar candidatas buenas.
- **Faltan dos señales que un coach siempre pregunta:** sexo/altura para afinar peso real (hoy `bodyProfile` es autopercibido y ambiguo), y si juega de **drive o de revés** (no condiciona specs pero sí el discurso). Sobra, en cambio, la pregunta de **durabilidad**, que casi no mueve el ranking y agrega fricción.
- **Las explicaciones serían convincentes en la rama IA**, pero el fallback heurístico arma frases por concatenación de fragmentos ("Seleccionada porque coincide con tu estilo, es de tu nivel exacto, ...") que suenan robóticas y pueden listar razones contradictorias.

---

## Hallazgos

### H1 — Severidad ALTA · El heurístico contradice la regla de oro de potencia/pegada
`src/application/recommendation/heuristic-ranker.ts:135-138` y `:167-173`

```ts
if (primaryGoal === "power" && (paddle.shape === "diamond" || paddle.shape === "hybrid")) {
  score += 2;
  reasons.push("su forma favorece el remate");
}
...
if (profile.sweetSpotTolerance === "small" && (paddle.shape === "diamond" || paddle.shape === "hybrid")) {
  score += 1;
}
```

El system prompt de la IA (`anthropic.client.ts:48-49`) establece explícitamente: *"Si alguien necesita potencia pero no pega fuerte, la potencia viene de goma blanda + salida de bola (forma lágrima), NO de balance alto"*. El heurístico **no cruza `improveGoals==='power'` con `strengthPref`**: a un intermedio que marca "quiero más potencia" pero declara `needs_power` (no tiene pegada), el fallback le suma puntos a un **diamante** — exactamente la paleta que un coach NO le daría (es la que más castiga el codo y la que menos perdona). Impacto: en cualquier momento que la IA falle/no esté configurada, el fallback puede recomendar la peor forma para el perfil. Un diamante a un jugador sin pegada genera frustración y lesión.

### H2 — Severidad ALTA · El filtro de nivel es demasiado permisivo en los extremos
`src/application/recommendation/heuristic-ranker.ts:7-18`

```ts
case "beginner": return ["beginner", "intermediate"];
case "advanced": return ["intermediate", "advanced", "pro"];
```

Para un **principiante** el universo incluye paletas `intermediate`, lo cual es razonable, pero combinado con la relajación de presupuesto (ver H4) y el último fallback "sin filtro de precio", un principiante puede terminar viendo paletas que en specs son intermedias-altas. Más grave en `advanced → [..., "pro"]`: las paletas `pro` suelen ser diamantes duras de balance alto; sumarlas al pool de un avanzado que marcó lesión de codo obliga a que la safetyPenalty haga todo el trabajo (y la penalización **no descarta**, solo hunde — ver H3). Un coach jamás le ofrece de arranque una pala pro a alguien con epicondilitis. Recomendación: estrechar el nivel para principiantes (solo `beginner`) y no incluir `pro` salvo que el jugador sea `pro`.

### H3 — Severidad ALTA · Las reglas duras de seguridad NO descartan, solo penalizan
`src/application/recommendation/heuristic-ranker.ts:26-53` + uso en `:248`

El comentario del propio código lo admite: *"No descartan del todo (para no quedarse sin opciones) pero las hunden al fondo"*. El problema: las penalizaciones (–8, –6, –4) **compiten en la misma escala** que los bonos de fit + `popularity * 0.5` + `validated` + marca preferida (+2) + precio (+1). Una paleta dura de balance alto MUY popular (popularidad 5 = +2.5) y de marca preferida (+2) y con precio (+1) acumula +5.5 de bonos; si el jugador tiene codo, recibe –8–6 = –14, queda en –8.5… pero una paleta neutra sin casi señales puede quedar en –2 y ganarle. En la práctica suele funcionar, pero **una "regla DURA de seguridad" no debería ser superable por popularidad/precio**. Para una lesión de codo, lo correcto es **excluir** (filtro, no score) la goma dura + balance alto + 18K, igual que se hace con el presupuesto. Hoy el sistema puede, en un caso borde, recomendarle a alguien con codo una pala que el prompt prohíbe explícitamente.

### H4 — Severidad MEDIA · El filtro de precio elimina paletas sin precio publicado en el camino normal
`src/infrastructure/db/paddle.mysql.repository.ts:211-218` + `:64-72`

`best_price` viene de un `LEFT JOIN` a `current_prices` con `in_stock = TRUE`. Cuando hay `budgetMin`/`budgetMax`, los `WHERE bp.best_price >= ?` / `<= ?` **descartan toda fila con `best_price` NULL** (sin precio o sin stock). En el contexto argentino del brief —stock incompleto, scraping parcial— esto puede sacar del pool paletas excelentes solo porque ninguna tienda tiene precio cargado todavía. El usuario rara vez deja `budgetMin = 0` exacto; el slider arranca en 150.000 (`finder-chat.tsx:553`), así que el `budgetMin` casi siempre aplica. Consecuencia: el camino normal recomienda solo sobre el subconjunto con precio, y solo cae a "incluir sin precio" en el último fallback de desesperación (`recommend-paddles.usecase.ts:68-71`). Para un comparador cuyo activo es la data, conviene tratar "sin precio" como candidato válido (mostrándolo sin precio) en vez de excluirlo por defecto.

### H5 — Severidad MEDIA · `bodyProfile` autopercibido es una señal débil y ambigua para el peso
`src/presentation/components/finder/question-tree.ts:76-85` + `heuristic-ranker.ts:56-67`

El peso de la pala es de las pocas variables físicas que un fitter ajusta con dato duro (sexo, altura, antebrazo). Acá `bodyProfile` es "liviano / medio / fuerte", autopercibido, y `bodyWeightFit` solo mueve ±2 puntos. No se pregunta sexo ni se distingue peso de mango/cabeza. Una jugadora liviana y un hombre fornido pueden ambos marcar "medio". El umbral fijo (≤365 liviano, ≥370 fuerte) es razonable pero opera sobre `weightMax`, que suele ser el tope del rango — conviene usar el promedio del rango. Impacto: el matching de peso, clave para evitar fatiga/lesión, queda flojo.

### H6 — Severidad MEDIA · La pregunta de estilo y la de objetivos se pisan y el filtro duro ignora `playStyle`
`src/infrastructure/db/paddle.mysql.repository.ts:197-218` (initial) vs `:205-210` (solo en refine)

En `execute()` el filtro duro **no filtra por `play_style`** (correcto: dejás que la IA decida). Pero entonces `playStyle` —una de las preguntas más cargadas del onboarding (`qStyle`)— solo influye vía bonus +3 del heurístico o vía prompt. Está bien como decisión, pero hay redundancia con `improveGoals` y `comfortVsPunch`: un principiante responde estilo (control/balance/power), luego "comodidad vs pegada" que se traduce a `improveGoals=['comfort']` o `['power']` (`finder-chat.tsx:351-353`), pisando cualquier `improveGoals` que hubiera. Para el principiante eso significa que **nunca puede declarar a la vez "salida de bola" y nada más** — su objetivo queda forzado a comfort o power. Es una simplificación defendible pero conviene revisarla: a un principiante "salida de bola" y "comodidad" le importan igual.

### H7 — Severidad BAJA · `frequency` y `durability` casi no influyen y agregan fricción
`heuristic-ranker.ts:202-205` (durabilidad: +1 si carbono) · `frequency` no se usa en el ranker

La frecuencia semanal se captura (`qFrequency`) y se manda a la IA, pero el heurístico **no la usa en absoluto**. Un coach sí la usa: alguien que juega 5 veces/semana necesita más durabilidad y tolerancia a la fatiga que quien juega 1. `durability` mueve apenas +1 y solo chequea substring "carbono". Son dos preguntas que alargan el flujo sin pagar en calidad de recomendación en el fallback.

### H8 — Severidad BAJA · `facePref` y `spinImportant` están en el modelo pero el chat nunca los captura
`question-tree.ts` (no existe pregunta `facePref` ni `spinImportant`) vs `player-profile.entity.ts:44,46` y `anthropic.client.ts:95-96`

El perfil define `facePref` (fibra/3K/12K/18K) y `spinImportant`, el prompt los envía a Claude (`le_importa_el_efecto`, `preferencia_cara`), y el heurístico puntúa `spinImportant` (`:184-187`), pero **el árbol de preguntas no tiene ningún paso que los setee** — siempre llegan como `null`/`false`. Son campos muertos en la práctica. O se agregan preguntas (al bloque avanzado) o se quitan del prompt para no mandar ruido constante.

---

## Bugs / lógica de recomendación incorrecta

- **B1 (=H1):** heurístico premia diamante/híbrido para `improveGoals='power'` sin cruzar con `strengthPref='needs_power'`. Lógica de pádel incorrecta. `heuristic-ranker.ts:135-138`.
- **B2:** En `refine`, cuando se pide más control, el filtro duro restringe `playStyles` a `["control","balance"]` (`recommend-paddles.usecase.ts:130-132`). Si el jugador tiene lesión de codo y pidió más control, está bien; pero cuando pide **más potencia** (`["power","balance"]`) el filtro puede traer palas `power` que luego la safetyPenalty debería frenar — y como esa penalización no descarta (H3), un refinamiento "quiero más potencia" de un lesionado puede subir al ranking justo lo contraindicado. El sesgo de play_style por feedback no respeta las reglas duras a nivel de filtro.
- **B3:** `seenBrandSlugs` en `finder-chat.tsx:628-631` mapea marca→slug por **igualdad exacta de `name`** (`brands.find(x => x.name === r.brandName)`). Si el nombre de marca en la recomendación difiere mínimamente del catálogo (acentos, mayúsculas, " Padel"), el chip "excluir esta marca" no aparece y el usuario no puede vetar la marca que no le gustó. Conviene exponer el `brandSlug` directo en `FinderRecommendation` en vez de re-derivarlo por nombre.
- **B4 (data):** El bonus por durabilidad (`heuristic-ranker.ts:203`) busca `"carbono"` en `faceMaterial`, pero el prompt y el catálogo a veces escriben "carbon" (inglés) o "3K/12K". Substring frágil; muchas palas de carbono no matchean.
- **B5 (menor):** `bodyWeightFit` usa `weightMax` como peso de referencia (`:58`). Para una pala 360–375g, "liviano" la castiga por su `weightMax=375` aunque su rango real sea medio. Usar el punto medio sería más fiel.

---

## Oportunidades de mejora

### Preguntas (perfilado)
- **Agregar sexo y, opcional, altura** para anclar la ventana de peso con dato duro en vez de `bodyProfile` autopercibido (H5). Es la pregunta que más mejora el matching de peso/lesión.
- **Cruzar explícitamente "qué querés mejorar" con "tenés pegada".** Hoy se capturan por separado y el heurístico no los combina. La regla de coach es: *potencia + sin pegada → goma blanda + lágmara; potencia + con pegada → diamante/balance alto*. Codificar esa matriz (no solo confiar en el prompt).
- **Revisar `comfortVsPunch` del principiante** (H6): permitir que un principiante elija "salida de bola"/"comodidad" sin forzar el objetivo a un único valor.
- **Quitar o fusionar `durability` y, si no se va a usar, `frequency`** del fallback (H7), o bien usarlas de verdad (frecuencia alta → más durabilidad y peso contenido por fatiga acumulada).
- **Sumar pregunta de mano hábil / juega drive o revés** (no cambia specs pero personaliza el discurso y permite, a futuro, recomendar por posición en cancha).

### Prompt a Claude
- El system prompt es **muy bueno y específico de pádel** (`anthropic.client.ts:32-69`): reglas duras claras, panel experto sintetizado, voseo. Mejoras:
  - Pedir que **devuelva también el atributo concreto que disparó la elección** (forma/balance/dureza) para poder mostrar "por qué" estructurado, no solo prosa.
  - El prompt confía en que la IA respete prohibiciones, pero **no se valida en el código** que las picks de la IA cumplan las reglas duras (solo se valida que el id exista, `recommend-paddles.usecase.ts:83-87`). Conviene aplicar la misma `safetyPenalty`/exclusión a las picks de la IA como red de seguridad: si la IA, por alucinación, devuelve una pala dura+18K para un codo, hoy pasa.
  - `output_config.effort: "low"` (`anthropic.client.ts:175`) puede limitar el razonamiento del fit en perfiles complejos (lesión + presupuesto + refinamiento). Evaluar "medium" para el primer ranking.

### Matching perfil→specs (resumen de criterio de coach)
| Perfil | Spec correcta | ¿Lo hace hoy? |
|---|---|---|
| Codo / epicondilitis | goma blanda, balance bajo/medio, redonda/lágrima, evitar 18K | Sí en prompt; en heurístico **penaliza pero no excluye** (H3) |
| Principiante | redonda/lágrima, balance medio/bajo, blanda, sweet spot amplio | Penaliza diamante/balance alto; OK pero ver H2 |
| Pegador con pegada | diamante, balance alto, dura, 18K | Sí |
| Quiere potencia SIN pegada | blanda + lágrima (NO diamante) | **No en heurístico (H1)** |
| Físico liviano | peso contenido (~355–365) | Señal débil (H5) |
| Ritmo rápido (red) | manejable, balance no alto | Sí (`:152-156`) |

### Fallback heurístico
- **Generar la explicación con plantillas coherentes**, no concatenando todos los fragmentos (`heuristic-ranker.ts:265-272`). Hoy una pala puede mostrar "coincide con tu estilo, es de tu nivel exacto, su goma blanda cuida tus molestias, tiene precio y stock" — suena a checklist. Mejor: 1 frase de fit principal + 1 de confort/lesión si aplica.
- **Convertir las reglas duras en exclusión real** antes de scorear (H3), para que el fallback nunca contradiga al prompt.

---

## Funcionalidades nuevas sugeridas

- **Modo "explicame la diferencia entre las 3":** tras las recomendaciones, un botón que pida a la IA un párrafo comparativo corto entre el top-3 (control vs potencia, a quién le conviene cada una). Es lo que un coach hace al final.
- **Confianza del match:** mostrar un % o etiqueta ("fit muy alto / bueno / aceptable") derivado del score, para que el usuario entienda cuándo el sistema está estirando el presupuesto o el nivel.
- **Detección de contradicciones en el perfil:** si alguien marca lesión de codo + "quiero máxima potencia" + presupuesto premium, el chat podría aclarar el trade-off ("priorizamos cuidar el codo; la potencia la buscamos por salida de bola, no por dureza"). Educa y genera confianza.
- **Guardar y comparar "sesiones de fitting":** permitir al usuario logueado volver a una recomendación previa y ver cómo cambió el precio (engancha con el feature de alertas).
- **Pregunta de presupuesto con anclas de mercado:** mostrar rangos típicos ARS ("gama media 250–400k") en el slider para que el usuario no fije un techo irreal.

---

## Quick wins

1. **(H1) Cruzar `improveGoals='power'` con `strengthPref`** en el heurístico: si `needs_power`, premiar `teardrop` + `soft` en vez de `diamond`/`hybrid`. Pocas líneas, corrige el bug de criterio más grave del fallback. `heuristic-ranker.ts:135-138`.
2. **(H3) Aplicar `safetyPenalty` / exclusión a las picks de la IA** en el usecase tras validar ids — red de seguridad barata contra alucinaciones de la IA. `recommend-paddles.usecase.ts:83-87`.
3. **(B3) Exponer `brandSlug` en `FinderRecommendation`** (ya está en el `PaddleListItem`) en vez de re-derivarlo por nombre, así el chip "excluir marca" nunca falla. `actions.ts:55-70`, `finder-chat.tsx:628-631`.
4. **(H8) Quitar `facePref`/`spinImportant` del payload del prompt** (o agregar las preguntas). Hoy mandan ruido constante. `anthropic.client.ts:95-96`.
5. **(B4) Hacer el match de carbono case/idioma-insensible** o por enum en vez de substring `"carbono"`. `heuristic-ranker.ts:203`.
6. **(B5/H5) Usar el punto medio del rango de peso** en `bodyWeightFit` en lugar de `weightMax`. `heuristic-ranker.ts:56-67`.
7. **(Fallback) Acortar las razones del heurístico a 2 fragmentos coherentes** en vez de hasta 3 concatenados de cualquier categoría. `heuristic-ranker.ts:265-272`.

---

Ruta del archivo generado: `C:\Users\franc\Desktop\Workspace\personal\paletaiq\docs\auditorias\padel-2-buscador-recomendacion.md`

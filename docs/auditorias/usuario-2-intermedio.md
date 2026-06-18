# Auditoría Usuario Intermedio — "Marto, 29, juega hace 2 años"

> Contexto del auditor: 6ta/5ta, juego equilibrado, lágrima me sirve, codo que a veces
> molesta. Vengo a renovar paleta, presupuesto $300.000–500.000 ARS. Quiero comparar bien,
> ver precios reales en pesos y dónde sale más barata.
>
> Nota de método: revisé la web "leyendo" el código (rutas, componentes y mensajes). No pude
> ejecutar consultas a la base (los comandos de shell estaban bloqueados en esta sesión), así
> que cuando hablo de "cuántas paletas tienen precio" lo deduzco de la lógica del código, no de
> un conteo real. Lo marco donde corresponde.

## Mi experiencia

Entré con una idea clara: ya sé que juego equilibrado y que una lágrima me va bien, así que lo
primero que probé fue el listado de paletas (`/paletas`) con los filtros de Forma=Lágrima,
Estilo=Equilibrada y precio 300k–500k. El filtro funciona, los chips de filtros activos están
buenos y cada card me muestra marca, forma, nivel, estilo, el mejor precio en pesos y un cartelito
"En stock". Eso me gustó: se siente una web pensada para Argentina, no un comparador español
traducido. De ahí entré a una ficha, comparé un par lado a lado y por curiosidad probé el buscador
con IA "Elegí mi paleta".

Donde se me empezó a caer la confianza fue en los detalles que un intermedio mira: la ficha técnica
no muestra **dureza** ni **superficie** aunque están en el modelo, el comparador no me deja agregar
paletas desde la propia tabla (tengo que volver al listado), y el "mejor precio" siempre asume que
la tienda más barata tiene stock, sin decirme de qué tienda es hasta que entro a la ficha. El
buscador es lindo y hace muchas preguntas, pero después de 15+ pasos terminé en paletas que yo ya
tenía en la cabeza. No me dio el "click" de descubrir algo mejor que mi propio criterio.

## Lo que me gustó

- **Precios en pesos y "En stock" desde el listado.** La card (`paddle-card.tsx`) muestra
  `formatPrice` en ARS y el badge de stock arriba a la izquierda. Es exactamente lo que un comprador
  argentino quiere ver de una.
- **El comparador resalta las diferencias.** En `/comparar` las filas donde las paletas difieren se
  pintan con `bg-primary/10` y hay una leyenda ("Resaltamos las filas donde las paletas se
  diferencian"). Para decidir entre 3 lágrimas parecidas, eso ahorra tiempo real.
- **Aviso de precio viejo.** En la ficha, si el scrapeo tiene más de 14 días sale un triángulo rojo
  con "Este precio puede estar desactualizado. Verificá en la tienda antes de comprar"
  (`isPriceStale`, `staleHint`). Honesto, me genera confianza.
- **Historial de precios.** La ficha tiene una sección "Historial de precios" cuando hay más de un
  punto. Para un fanático de cazar ofertas, esto es oro (aunque depende de que haya data, ver abajo).
- **Empty state del comparador con vida.** Si entro a `/comparar` sin nada, me explica cómo funciona
  y me ofrece paletas populares para arrancar. Mejor que una pantalla muerta.
- **El buscador respeta el presupuesto con honestidad.** Si no hay opciones en mi rango, amplía de a
  poco (1.25x, 1.6x) y me **avisa** que amplió ("ampliamos el rango hasta {max}"), en vez de meterme
  una de $700k a la fuerza. Eso es criterio, me gustó.

## Lo que me confundió o frustró

- **[ALTA] La ficha técnica no muestra dureza ni superficie.** En `paletas/[slug]/page.tsx` el array
  `specs` lista marca, año, forma, balance, peso, núcleo, cara, marco, superficie, dureza, nivel y
  estilo... pero **espesor (thickness) no está**, y peor: en la práctica un intermedio elige por
  **dureza de goma** (blanda vs dura) y **superficie (rugosa)** para el efecto. Sí están en `specs`,
  pero solo se renderizan las que tienen valor (`filter(s.value !== null)`). Si el scraping no las
  trae, simplemente desaparecen sin decir "sin dato". Termino sin saber si la paleta es dura o blanda,
  que es justo lo que me importa por el codo.
- **[ALTA] El comparador no incluye dureza, superficie ni espesor.** Las filas de `/comparar` son las
  mismas specs base pero **sin dureza, sin superficie, sin marco y sin espesor**. Comparar dos
  lágrimas equilibradas sin ver cuál es más blanda no me sirve para mi codo. Es la columna que más
  necesito y no está.
- **[MEDIA] No puedo sumar paletas a comparar desde la tabla del comparador.** Una vez adentro de
  `/comparar`, si quiero cambiar una paleta tengo que volver a `/paletas`, tocar "Comparar" y volver.
  No hay un botón "quitar/cambiar" por columna en la propia tabla (la `remove` existe en los mensajes
  pero no la veo cableada en la tabla).
- **[MEDIA] El "mejor precio" no me dice de qué tienda es hasta entrar a la ficha.** En el listado veo
  "$420.000 · 3 tiendas" pero no cuál es la barata. Para decidir tengo que entrar sí o sí. Un intermedio
  que ya sabe qué quiere, quiere el link directo a la más barata.
- **[MEDIA] El buscador es larguísimo para lo que devuelve.** Como intermedio que renueva, el árbol
  (`question-tree.ts`) me hace nivel, journey, físico, frecuencia, estilo, ritmo, lesión (+zona),
  fuerza, objetivos, sweet spot, paleta anterior, qué cambiar, marcas, texto libre y presupuesto.
  Son fácil 14–16 pasos. Para terminar recomendándome lágrimas equilibradas de gama media que yo ya
  conocía, es mucho peaje. El bloque "balance en cabeza/mango" y "goma dura/blanda" (`balancePref`,
  `hardnessPref`) **solo aparece para avanzado/pro** (`showIf: isAdvanced`); a mí como intermedio no me
  los pregunta, cuando justamente yo ya manejo esos conceptos.
- **[BAJA] "Competitivo" vs "pro".** En i18n nivel `pro` = "Competitivo", pero en specs de paleta el
  nivel `pro` se muestra igual. Coherente, pero un 5ta como yo no sabe si "Avanzado" me incluye o no.
  Un microcopy tipo "6ta–4ta" ayudaría.

## Lo que me faltó

- **Dureza y superficie en comparación y ficha (lo dije, pero es EL faltante).** Sin eso, la "ficha
  técnica normalizada" que promete la home no está completa para un intermedio.
- **Cuánta data real hay con precio y stock.** No pude correr el SELECT en esta sesión (shell
  bloqueado), pero por código sé algo importante: el filtro de presupuesto del buscador
  (`findCandidates`) y el "mejor precio" del listado usan `current_prices WHERE in_stock = TRUE`. O sea
  **una paleta sin precio cargado o sin stock no aparece cuando filtro por mi rango $300k–500k**. Si la
  cobertura de precios es baja, mi filtro de presupuesto me va a esconder paletas buenas y no me voy a
  enterar. Necesito saber, como usuario, si "5 resultados" es "hay 5" o "solo 5 tienen precio cargado".
- **De qué tienda es cada precio en el listado/comparador.** El detalle lo tiene (tabla de tiendas con
  link "Ver en tienda"), pero la decisión de compra empieza antes.
- **Comparar precio entre tiendas dentro del comparador.** La fila "Mejor precio" en `/comparar` muestra
  un solo número por paleta. No veo el spread entre tiendas, que es donde un cazador de ofertas decide.
- **Filtro por dureza/balance en el listado.** Los filtros de `/paletas` son marca, forma, nivel, estilo
  y precio. No puedo filtrar "lágrima + blanda" para cuidarme el codo, que es mi caso de uso textual.
- **Señal de confianza en los datos.** No vi fecha de "última actualización del catálogo" ni de dónde
  salió cada spec. El footer dice "recopilados de sitios oficiales y tiendas argentinas", pero a nivel
  ficha no sé si esa spec la validó un humano o la sacó un scraper (el modelo tiene `validated`, pero al
  usuario no se le muestra).

## Cómo me ayudarían más

- **Agregar dureza, superficie y espesor al comparador y a la ficha**, y cuando no haya dato mostrar
  "Sin dato" explícito en vez de ocultar la fila. Para el codo, marcar visualmente las blandas/con
  goma soft sería un golazo.
- **Filtros de `/paletas` para dureza y balance** (y ojalá un toggle "apto codo/brazo": blanda + lágrima
  + peso bajo). Es mi necesidad literal y la web ya tiene los datos en el modelo.
- **Mostrar la tienda más barata y su link directo desde la card** ("Más barata en Tienda X →"). Que el
  intermedio decidido pueda comprar sin tres clics.
- **Spread de precios en el comparador**: por paleta, mín–máx entre tiendas y cuántas con stock.
- **Acortar el buscador para "vengo a renovar"**: si elijo "renovar/mejorar" + intermedio, saltear físico
  y darme el bloque técnico (balance/dureza) que hoy reservan a avanzados. Un intermedio que renueva sabe
  lo que busca; menos preguntas y más precisión.
- **Indicador de frescura/validación a nivel catálogo y ficha**: "Catálogo actualizado el …" y un sellito
  "Specs validadas" usando el campo `validated` que ya existe. Sube muchísimo la confianza.

## Bugs/cosas raras que noté

- **`thickness` (espesor) no se muestra en ningún lado del usuario.** Está en el modelo y en el form del
  admin (`fieldThickness`), pero ni la ficha (`specs`) ni el comparador (`rows`) lo incluyen. Dato
  cargado que el usuario nunca ve.
- **Specs ocultas silenciosamente.** Ficha y comparador filtran/ponen "—" cuando el valor es null. En la
  ficha la fila directamente desaparece; el usuario no distingue "esta paleta no tiene esa caracteristica"
  de "no tenemos el dato". Confunde.
- **El "best match" del buscador puede ser solo heurístico sin que se note del todo.** Si la IA falla,
  cae al ranking por specs y muestra el cartel "Recomendación por specs (la IA no estaba disponible)"
  (`heuristicNote`). Bien que avise, pero el badge dorado "Mejor match" sigue igual de pomposo aunque sea
  un ranking heurístico simple. Para un exigente, eso es un poco vender humo.
- **`enums` define `shape.hybrid` ("Híbrida") pero el ENUM de la tabla `paddles` es solo
  round/teardrop/diamond.** Si alguna paleta quedara marcada "hybrid" el filtro de forma del listado
  (`PADDLE_SHAPES`) podría no contemplarla. No es un bug visible hoy, pero es un desajuste entre i18n y
  esquema.
- **El comparador sugiere "Comparar estas" desde el buscador y limita a 4** (`slice(0, 4)`), pero el
  buscador puede devolver 5 recomendaciones. La #5 se cae silenciosamente al pasar al comparador. Menor,
  pero raro si justo me interesaba la quinta.
- **No pude verificar cobertura real de precios/stock** porque el shell estaba bloqueado en esta sesión;
  dejo señalado que es lo primero a chequear con un `SELECT` (cuántas activas tienen `current_prices` con
  `in_stock=TRUE` dentro de 300k–500k), porque de eso depende que mi filtro de presupuesto no me esconda
  medio catálogo.

---

Veredicto de Marto: la base está muy bien y se nota la intención argentina (pesos, stock, frescura). Pero
para que un intermedio vuelva, necesito **dureza/superficie en la comparación**, **filtros para cuidarme el
codo**, **ver de qué tienda es el precio barato** y un **buscador más corto y técnico cuando ya sé lo que
busco**. Hoy me sirve para mirar precios; todavía no para que me sorprenda con una paleta mejor que mi
propio criterio.

# Auditoría Usuario Principiante — "Caro, 34, juega hace 2 meses"

## Mi experiencia (narrativa en primera persona)

Entré desde el celu porque me dijeron que esta página te ayuda a elegir la paleta. Lo primero que leí fue "Encontrá tu paleta ideal" y abajo "IA + datos reales de Argentina". Bien, eso me gustó: suena a que alguien me va a decir qué comprar. Aprecé los dos botones grandes, "Elegir mi paleta ideal" y "Explorar paletas". Toqué el primero sin dudar, porque "explorar paletas" me suena a tener que entender yo sola, y yo no entiendo nada.

El chat me empezó a hacer preguntas y al principio me sentí cómoda: "¿en qué nivel te ubicás?" con la opción "Recién arranco — Empezando o jugué pocas veces" es exactamente yo, y me alivió que no me obligara a saber jerga. Las preguntas de estilo, físico ("No hay respuesta mala", gracias) y lesiones las contesté tranquila. Pero después llegaron preguntas tipo "¿Buscás que la paleta te dé potencia o la generás vos?", "salida de bola", "punto dulce", y ahí ya empecé a dudar de si estaba contestando bien. Igual llegué al final, puse mi presupuesto con el slider, me apareció una animación linda de "Filtrando entre cientos de paletas reales…" y me tiró 3-5 paletas con un texto explicando por qué cada una. **Ese momento fue el mejor de toda la web**: por fin alguien me dijo "esta, y por esto". Pero cuando toqué "Ver ficha" para confirmar, la ficha técnica me devolvió a la confusión total: una tabla con "Balance medio", "Núcleo EVA", "Carbono 3K", "Rugosa", y ni una palabra de qué significa eso para mí. Terminé volviendo al chat y confiando en el texto de la IA más que en la ficha.

## Lo que me gustó

- **El buscador es el corazón y funciona para mí.** El flujo de chat es amable, las opciones son botones (perfecto para el celu) y la mayoría están escritas en castellano de persona, no de técnico. La pregunta de nivel con descripción ("Recién arranco — Empezando o jugué pocas veces") me hizo sentir que la web es para mí.
- **Que me digan "esta y por esto".** El resultado con ranking (#1, "Mejor match") y un párrafo de razón (`rec.reason`) es justo lo que yo quería: que alguien decida por mí y me lo explique. El intro "Listo, acá tenés una selección bien pensada para vos" es cálido.
- **Los microcopys que bajan la presión.** "No hay respuesta mala", "Escribilo como te salga, no hace falta que sea técnico", "Podés dejar campos vacíos si no tenés límite". Eso me dio confianza para no trabarme.
- **El presupuesto con slider en pesos.** Ver "$150.000 — $600.000" en ARS me resultó natural y argentino. No tuve que pensar en euros ni en conversiones.
- **El refinamiento con chips después de los resultados** ("Muy caras", "Más livianas", "Ninguna me convence"). Me gustó poder decir "no me cierra" sin tener que explicar por qué con palabras técnicas.
- **El aviso de honestidad.** "Paletas reales de catálogo, sin inventos" y el recordatorio de verificar el precio en la tienda me hicieron confiar en que no me están vendiendo humo.

## Lo que me confundió o frustró

- **[ALTA] La ficha de paleta es chino para mí.** En `paletas/[slug]/page.tsx` la "Ficha técnica" muestra Forma, Balance, Peso, Núcleo, Cara, Marco, Superficie, Dureza, Nivel, Estilo... pero ninguna fila explica qué significa ni qué me conviene a *mí*. "Núcleo: EVA soft", "Cara: Carbono 3K", "Balance: medio" son datos crudos. Yo, principiante, miro eso y no sé si es bueno o malo para mí. Es la pantalla donde más me perdí, y es justo la pantalla donde voy a *decidir la compra*.
- **[ALTA] El listado "Explorar paletas" me deja sola con la jerga.** En `paletas/page.tsx` los filtros son "Forma", "Nivel", "Estilo", "Marca". Para mí "Forma: Redonda / Lágrima / Diamante" no significa nada — no sé cuál me conviene. Si entro por acá en vez de por el buscador, me bloqueo enseguida. No hay un "no sé qué es esto" ni un atajo a "dejá que te ayudemos".
- **[MEDIA] Preguntas del chat que me hicieron dudar.** Aunque el árbol (`question-tree.ts`) me oculta el bloque técnico de balance/dureza por ser principiante (bien hecho), igual quedan preguntas que para mí son borrosas:
  - "¿Buscás que la paleta te dé potencia o la generás vos?" (`qStrength`) — no sé si genero potencia, recién empiezo.
  - "Salida de bola" (`goalBallExit`) como objetivo a mejorar — no tengo idea de qué es.
  - "¿Qué tolerancia querés en el punto dulce?" — a un principiante esto le ocultan (`showIf: a.level !== "beginner"`), bien, pero "punto dulce" igual aparece como concepto sin explicación si soy "intermedio".
  Estas no tienen `hint` que las aterrice para alguien que arrancó hace 2 meses.
- **[MEDIA] La pregunta de objetivos pide elegir "hasta 2" pero yo quiero todo.** En `improveGoals` (potencia, control, salida de bola, comodidad, manejabilidad) yo, que no sé nada, querría "que sea buena en general". No hay opción "no sé / lo que me convenga".
- **[BAJA] El comparador no es para mí todavía.** La tabla de `comparar` resalta diferencias, pero compara las mismas specs que no entiendo (Núcleo, Cara, Balance). Me sirve la idea pero no el contenido, porque sigue siendo jerga.
- **[BAJA] "Estilo: Equilibrada" vs "Equilibrado".** En `enums.playStyle.balance` dice "Equilibrada" pero en el chat `styleBalance` dice "Equilibrado, un poco de todo". Detalle menor, pero noté la inconsistencia.

## Lo que me faltó para decidirme a comprar

- **Un "comprá esta y listo" más fuerte.** El buscador me da 3-5 opciones rankeadas, pero yo querría que la #1 grite "ESTA es la tuya" con más contundencia, y un botón directo de "Dónde comprarla" en el mismo resultado del chat (hoy solo hay "Ver ficha", y recién en la ficha aparece el link a la tienda).
- **Traducción de la jerga al lado de cada spec.** Algo como "Balance medio = ni te pesa adelante ni atrás, fácil de manejar" en la ficha. Sin eso, no puedo validar por mí misma si la recomendación tiene sentido, y compro a ciegas confiando en la IA.
- **Saber si entra en mi presupuesto de verdad.** En el resultado del chat veo "bestPrice", pero si una paleta no tiene precio (`bestPrice === null`) no me queda claro qué hago. Para alguien con $150.000-250.000 el precio es LO importante y a veces falta.
- **Una señal de "esta es fácil para principiantes".** No vi en ningún lado un sello tipo "ideal para arrancar" o "perdona errores" en las cards. El campo `level` existe pero como tag técnico ("Principiante"), no como tranquilizador.
- **Una mini guía de "qué mirar en tu primera paleta".** Aunque sea un párrafo. Me daría confianza y me haría sentir que aprendí algo, no solo que un robot eligió por mí.

## Cómo me ayudarían más (ideas concretas desde mi necesidad)

- **Tooltips o subtítulos en la ficha técnica.** Cada spec con una frase de traducción para humanos. Ej: "Forma Redonda → más control y perdona errores, ideal para arrancar". Es el cambio #1 que me haría confiar.
- **Modo principiante en el listado.** Que "Explorar paletas" tenga arriba un cartel: "¿No sabés qué buscar? Dejá que te ayudemos →" linkeando al buscador. Y que los filtros tengan un "?" que explique cada forma/balance.
- **Badge de "Fácil para empezar"** en las cards de paletas con `level=beginner` y forma redonda, para que de un vistazo sepa cuáles no me van a complicar.
- **En el resultado del chat, un botón directo "Ver dónde comprar"** además de "Ver ficha", con el mejor precio bien grande. Que el camino a la compra sea de un toque.
- **Hints para principiantes en preguntas borrosas.** Agregar `hintKey` a `qStrength`, `goalBallExit`, etc., con explicación tipo "Si recién empezás, elegí 'que la paleta me ayude'".
- **Opción "no sé / lo que me convenga"** en objetivos y en estilo, para que no tenga que fingir que entiendo.
- **Un resumen final tipo "Tu perfil: principiante, buscás comodidad, hasta $250.000"** antes o junto a los resultados, para sentir que me escucharon y poder corregir si me equivoqué.

## Bugs/cosas raras que noté

- **Inconsistencia de género en "Equilibrad@".** `enums.playStyle.balance` = "Equilibrada"; en el chat `styleBalance` = "Equilibrado, un poco de todo". Conviene unificar.
- **El chip "Ninguna me convence" hace algo raro.** En `finder-chat.tsx` el chip `refineChipNoneConvinces` en realidad activa `wantCheaper && wantMoreControl` a la vez (`setWantCheaper(true); setWantMoreControl(true)`). Como usuaria yo esperaría que "ninguna me convence" simplemente busque otra tanda distinta, no que asuma que quiero "más barata + más control". Me confundió que al tocarlo se "prendieran" otros dos chips.
- **Precio ausente sin explicación.** Cuando una paleta no tiene precio, en la card del listado dice "Sin precio publicado" y en el chat directamente no muestra nada (queda un `<span />` vacío). Para mí, que decido por plata, un hueco vacío es raro; preferiría "Precio a confirmar en tienda".
- **El presupuesto arranca preseteado en $150.000–$600.000.** Está bien como default, pero mi tope es $250.000 y tuve que arrastrar el slider bastante; un principiante apurado podría no notar que hay que moverlo y aceptar un rango que no es el suyo.
- **"Salida de bola" y "punto dulce" aparecen sin definición.** No es un bug técnico, pero son términos que rompen la promesa de "sin jerga" del onboarding para alguien de mi nivel.

---

Ruta del archivo: `C:\Users\franc\Desktop\Workspace\personal\paletaiq\docs\auditorias\usuario-1-principiante.md`

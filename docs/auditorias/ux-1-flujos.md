# Auditoría UX #1 — Flujos, navegación e IA

> Alcance: flujos y navegación entre Home → `/paletas` → `/paletas/[slug]` → `/comparar` → `/buscador`.
> Jerarquía de información, claridad de CTAs, onboarding, estados vacíos/carga/error, breadcrumbs y descubribilidad.
> Auditoría de solo lectura sobre el código a 2026-06-18. No se modificó código.

## Resumen ejecutivo

- **La navegación principal desaparece en mobile y no hay menú hamburguesa.** En `< sm`, el header solo deja "Comparador" + locale + login. "Paletas" y "Buscador" (las dos features estrella) son inaccesibles desde la barra en celular, que es el grueso del tráfico de pádel. Es el problema de IA/navegación más grave.
- **El comparador es un destino huérfano de catálogo.** Está en la nav pero, sin paletas seleccionadas, su único camino real es volver al listado y tildar paletas; no se puede agregar una paleta a comparar desde la URL ni buscar dentro del comparador. El flujo "quiero comparar X vs Y" obliga a ida y vuelta entre páginas.
- **Estados de carga/error incompletos en rutas clave.** No hay `loading.tsx` para `/buscador` ni `/comparar`, ni `error.tsx`/`not-found.tsx` global. La ficha hace `notFound()` sin página 404 propia, por lo que un slug roto cae al 404 genérico de Next sin marca ni salida clara.
- **El buscador no deja editar respuestas: solo "empezar de nuevo".** Tras 18 posibles preguntas, equivocarse en la primera implica reiniciar todo. No hay "volver una pregunta" ni edición desde el resumen, lo que castiga un flujo largo en mobile.
- **Pérdida de contexto de filtros al navegar.** Entrar a una ficha y volver con el link "Paletas" descarta los filtros/paginación aplicados (no preserva query string). Falta breadcrumb que comunique dónde está el usuario.

## Hallazgos

### H1 — Nav principal inexistente en mobile (sin hamburguesa)
- **Severidad: alta**
- **Descripción:** En `site-header.tsx` la `<nav>` con Paletas/Buscador/Comparador tiene `hidden ... sm:flex`, así que se oculta en mobile. Como compensación solo se muestra un link suelto a `/comparar` (`sm:hidden`). No existe ningún botón de menú/drawer para acceder a `/paletas` ni `/buscador` desde el header en celular.
- **Archivo:** `src/presentation/components/layout/site-header.tsx:17-37`
- **Impacto:** En mobile (mayoría del tráfico) el usuario no puede llegar al listado ni al buscador inteligente desde la barra. Depende de los CTAs de la home; si está en una ficha o en el comparador, queda sin navegación a las features principales. Curiosamente el único link mobile es al comparador, que es la feature *menos* autónoma.

### H2 — `/comparar` no es alcanzable de forma útil sin pasar por el listado
- **Severidad: alta**
- **Descripción:** El comparador vacío (`comparar/page.tsx:30-87`) tiene un empty state cuidado (cómo funciona + 4 populares + "Ir al listado"), pero no permite **agregar paletas desde el propio comparador** (no hay buscador/typeahead). Toda selección ocurre vía `CompareToggle` repartido por listado/ficha y persistido en `useCompare`. El link de la nav lleva a una página que, en frío, no puede cumplir su promesa sin redirigir a otra ruta.
- **Archivo:** `src/app/[locale]/comparar/page.tsx:30-87`; `src/presentation/components/compare/compare-toggle.tsx`
- **Impacto:** Fricción alta en la intención directa "comparar dos modelos que ya conozco". El usuario que entra por la nav al comparador rebota al listado, busca, tilda, vuelve. Un buscador/agregador dentro del comparador cerraría el flujo en una sola pantalla.

### H3 — Faltan estados de carga en buscador y comparador
- **Severidad: media**
- **Descripción:** Existen `paletas/loading.tsx` y `paletas/[slug]/loading.tsx`, pero no hay `buscador/loading.tsx` ni `comparar/loading.tsx`. La página del buscador hace `brandRepository.listAll()` en server y el comparador resuelve `comparePaddles.execute(slugs)` (+ populares en el empty), ambos con latencia de DB sin skeleton.
- **Archivo:** ausencia en `src/app/[locale]/buscador/` y `src/app/[locale]/comparar/`
- **Impacto:** Transiciones en blanco/saltos de layout al entrar a estas rutas, especialmente en la primera carga o tras revalidación. Inconsistencia con el cuidado puesto en el listado y la ficha.

### H4 — Sin `not-found.tsx` ni `error.tsx` con marca
- **Severidad: media**
- **Descripción:** La ficha llama `notFound()` (`paletas/[slug]/page.tsx:32`) pero no hay `not-found.tsx` por locale ni global; tampoco `error.tsx`/`global-error.tsx`. El mensaje `detail.notFound` ("No encontramos esa paleta") existe en i18n pero no se usa en ningún componente de 404.
- **Archivo:** `src/app/[locale]/paletas/[slug]/page.tsx:32`; ausencia de `not-found.tsx`/`error.tsx` en `src/app/`
- **Impacto:** Slug inválido o error de runtime muestran la pantalla cruda de Next, sin header/footer de marca ni CTA de recuperación ("volver al listado", "ir al buscador"). Callejón sin salida para el usuario y se desperdicia el copy ya traducido.

### H5 — Buscador sin "volver" ni edición de respuestas
- **Severidad: media**
- **Descripción:** `FinderChat` solo expone `restart()` (resetea todo). No hay botón para volver una pregunta ni editar una respuesta ya dada desde el historial. El flujo puede tener hasta ~18 pasos (`question-tree.ts`), con ramas por nivel/lesión/journey.
- **Archivo:** `src/presentation/components/finder/finder-chat.tsx:181-191`, `216-220`
- **Impacto:** Un tap equivocado temprano obliga a rehacer todo el cuestionario. En mobile y con un flujo largo, esto es abandono asegurado. El historial se muestra como burbujas pero no es accionable.

### H6 — Navegar a la ficha y volver pierde filtros y página
- **Severidad: media**
- **Descripción:** El back-link de la ficha apunta fijo a `/paletas` (`paletas/[slug]/page.tsx:56-62`) y las cards enlazan a `/paletas/[slug]` sin arrastrar el query string de origen. Al volver, el listado vuelve a cero filtros/página 1 (salvo que el usuario use el botón "atrás" del browser, que no es lo que sugiere el link).
- **Archivo:** `src/app/[locale]/paletas/[slug]/page.tsx:56-62`; `src/presentation/components/paddle/paddle-card.tsx:19-21,46-51`
- **Impacto:** El usuario que filtró ("Bullpadel, diamante, hasta $600k", página 3) y entró a ver una paleta pierde todo el contexto al volver con el link visible. Re-trabajo y frustración en una tarea de exploración inherentemente iterativa.

### H7 — Sin breadcrumbs ni indicador de sección activa
- **Severidad: baja**
- **Descripción:** No hay breadcrumb en ninguna ruta. La ficha solo tiene un link "← Paletas". La nav del header (`site-header.tsx`) no marca el link de la sección actual (no usa `usePathname`/`aria-current`); todos los links se ven igual.
- **Archivo:** `src/presentation/components/layout/site-header.tsx:17-27`
- **Impacto:** Menor orientación dentro de la IA del sitio. En la ficha no queda claro a qué filtro/marca pertenece; en el header no se sabe en qué sección estás. Baja, pero acumulativa con H6.

### H8 — La home empuja casi en exclusiva al buscador; el catálogo queda secundario
- **Severidad: baja**
- **Descripción:** Home tiene CTA primario "Elegir mi paleta ideal" (buscador) repetido arriba y en el CTA final; el catálogo aparece como `variant="glass"`/secundario ("Explorar paletas", "Ir al comparador"). El producto se define como "comparador + buscador", pero el comparador en la home no tiene entrada propia directa (el botón secundario superior va a `/paletas`, no a `/comparar`).
- **Archivo:** `src/app/[locale]/page.tsx:60-78`, `137-154`
- **Impacto:** Para el usuario que ya sabe qué quiere comparar, la home no le da un atajo claro. La jerarquía es defendible (el buscador es el diferencial), pero conviene validar que el comparador no quede invisibilizado.

### H9 — La barra flotante de comparación puede tapar contenido y CTAs
- **Severidad: baja**
- **Descripción:** `CompareBar` es `fixed ... bottom-4 z-30` y aparece apenas hay 1 paleta seleccionada. En la ficha y el listado puede solaparse con el contenido del final (precios, paginación) sin que la página agregue padding inferior compensatorio.
- **Archivo:** `src/presentation/components/compare/compare-bar.tsx:16-29`
- **Impacto:** En mobile, con la barra visible, los últimos elementos (último precio de tienda, "Siguiente" de paginación) pueden quedar tapados. Molesto pero acotado.

### H10 — Una sola paleta "comparada" no aporta valor y no se comunica
- **Severidad: baja**
- **Descripción:** `CompareBar` aparece con `count >= 1` y permite "Comparar" con una sola paleta; la tabla resultante (`comparar/page.tsx`) no resalta diferencias con `paddles.length < 2` (`rowDiffers` retorna `false`). El usuario puede llegar a una "comparación" de una sola columna.
- **Archivo:** `src/presentation/components/compare/compare-bar.tsx:14`; `src/app/[locale]/comparar/page.tsx:116-121`
- **Impacto:** Expectativa fallida menor: comparar implica ≥2. No es bloqueante pero ensucia la promesa del feature.

## Bugs detectados

- **B1 (funcional/UX) — Chip "Ninguna me convence" muta estado de otros chips de forma confusa.** En `Results`, el chip `refineChipNoneConvinces` ejecuta `setWantCheaper(true); setWantMoreControl(true)` y su `active` se deriva de `wantCheaper && wantMoreControl`. Resultado: tocar "más barata" + "más control" por separado enciende visualmente "Ninguna me convence", y este chip no se puede "apagar" (no togglea). Comportamiento engañoso para el usuario.
  - `src/presentation/components/finder/finder-chat.tsx:783`
- **B2 (datos/UX) — Exclusión de marca en refinamiento puede fallar silenciosamente.** `seenBrandSlugs` se arma matcheando `brands.find((x) => x.name === r.brandName)` por **nombre exacto**. Si el `brandName` de la recomendación difiere del `name` del catálogo (acentos, mayúsculas, sufijos), el slug no se resuelve y el chip "No me gusta {brand}" no aparece, impidiendo excluir esa marca.
  - `src/presentation/components/finder/finder-chat.tsx:628-631`
- **B3 (a11y/estados) — `aria-live="polite"` envuelve todo el viewport del chat con `aria-atomic="false"`.** Al re-renderizar resultados largos (cards + refinamiento) el lector puede anunciar bloques enormes o parciales de forma errática, en vez de solo el último mensaje del bot. La región viva debería acotarse a la última burbuja/estado.
  - `src/presentation/components/finder/finder-chat.tsx:202-207`
- **B4 (consistencia visual) — Badge "En stock" basado en `storeCount > 0`, no en stock real.** En `PaddleCard` el badge "En stock" se muestra si `storeCount > 0`, pero `storeCount` cuenta tiendas con precio, no necesariamente con `in_stock = true`. Una paleta listada y sin stock real en ninguna tienda puede mostrar "En stock" en la card mientras la ficha la marca "Sin stock".
  - `src/presentation/components/paddle/paddle-card.tsx:23-28`

## Oportunidades de mejora (sobre lo existente)

- **Menú mobile (resuelve H1):** agregar un `Drawer`/menú hamburguesa que liste Paletas, Buscador, Comparador (con badge de cantidad seleccionada), locale y login. Es el cambio de mayor impacto en navegación.
- **Preservar contexto de filtros (H6):** que las cards y el back-link de la ficha arrastren el query string (`?marca=...&page=...`). Un `Link` con `searchParams` de origen, o un back que use el referer del listado.
- **Breadcrumbs + sección activa (H7):** breadcrumb `Inicio / Paletas / {marca} {modelo}` en la ficha y `aria-current`/subrayado activo en la nav usando `usePathname`.
- **Skeletons de buscador y comparador (H3):** `loading.tsx` con un esqueleto de chat (burbuja + opciones) y de tabla comparativa.
- **404/500 con marca (H4):** `not-found.tsx` y `error.tsx` por locale reusando `detail.notFound` y CTAs a `/paletas` y `/buscador`.
- **Edición de respuestas en el buscador (H5):** botón "← Volver" sobre la pregunta activa y/o hacer accionables las burbujas del historial ("editar") para no obligar a `restart`.
- **Padding inferior cuando `CompareBar` está activa (H9):** clase condicional o `scroll-padding` para que la barra flotante no tape paginación/precios.
- **Gating de comparación a ≥2 (H10):** que `CompareBar` invite a sumar una segunda paleta cuando hay solo una ("Agregá otra para comparar"), en vez de habilitar comparar con 1.
- **Indicador de "comparando N" global:** mostrar el contador de selección también en el link de nav del comparador, para que la persistencia de `useCompare` sea descubrible entre páginas.

## Funcionalidades nuevas sugeridas

- **Buscador/typeahead dentro de `/comparar`** para agregar paletas por nombre sin volver al listado (cierra H2 y convierte al comparador en destino autónomo).
- **Resumen de perfil al final del buscador**, editable por pregunta, antes o junto a los resultados (potencia H5 y da transparencia al "por qué" de la IA).
- **"Comparar con la actual"** en la ficha: atajo para enfrentar la paleta vista contra las ya seleccionadas o contra una recomendada.
- **Deep-link a comparación reproducible:** la URL `/comparar?p=a,b,c` ya existe; exponer un botón "Compartir comparación" copiaría ese link (útil para WhatsApp, muy argentino).
- **Filtros como facetas con conteos** en `/paletas` (cuántas paletas por marca/forma) para reducir filtros que devuelven 0 resultados.
- **Continuidad buscador → catálogo:** botón "Ver todas las del listado con mi perfil" que traduzca el `PlayerProfile` a filtros de `/paletas` (nivel, estilo, presupuesto).
- **Guardar/retomar la selección de comparación** para usuarios logueados (hoy `useCompare` parece vivir solo en cliente).

## Quick wins (cambios chicos, alto impacto)

1. **Agregar menú hamburguesa mobile** con los 3 links principales (H1). Mayor impacto/esfuerzo del informe.
2. **`buscador/loading.tsx` y `comparar/loading.tsx`** con skeletons simples (H3).
3. **`not-found.tsx` por locale** reusando `detail.notFound` + botones a Paletas/Buscador (H4).
4. **`aria-current="page"` y subrayado activo** en la nav según `usePathname` (H7).
5. **Padding-bottom condicional cuando hay selección de comparación** para que `CompareBar` no tape contenido (H9).
6. **Arreglar el chip "Ninguna me convence"** para que sea un toggle real e independiente (B1).
7. **Que las `PaddleCard` y el back de la ficha conserven el query string** del listado de origen (H6).
8. **Mostrar el contador de comparación en el link de nav** del comparador (descubribilidad de `useCompare`).

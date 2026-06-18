# Auditoría UX #2 — Diseño visual, consistencia y accesibilidad

> Alcance: librería de componentes UI (`src/presentation/components/ui/`), componentes de
> dominio (`paddle/`, `compare/`, `finder/`, `layout/`, `fx/`), theming Tailwind
> (`src/app/globals.css`) y páginas principales (`paletas`, `comparar`, `buscador`, home,
> ficha de paleta). Auditoría de solo lectura, sin cambios de código.

## Resumen ejecutivo

- **El sistema de theming es sólido y bien disciplinado.** No hay ni un solo color crudo de
  Tailwind (`bg-blue-600`, etc.) en toda la app, y los pocos hex sueltos están justificados
  (SVG del logo, thumbs nativos del slider). Las variables semánticas (`--primary`, `--muted`,
  glass) se usan de forma consistente. Esto cumple el brief de la sección 4 al pie de la letra.
- **El foco/teclado está bien resuelto en los componentes base** (`Button`, `Input`, `Select`,
  chips del finder con `focus-visible`), pero hay **excepciones puntuales sin estado de foco
  visible** (chips de `MultiSelect`/`BrandSelect`/`QuickChip`, chips de filtros activos, links de
  nav) que rompen la navegación por teclado en partes clave del producto.
- **Accesibilidad del chat (buscador) es el punto más flojo:** uso intensivo de `aria-live`
  pero con texto de máquina de escribir que puede spamear lectores de pantalla, dependencia de
  color para el estado activo de los chips (sin `aria-pressed`), y un `aria-label="…"` literal
  en los puntos de "escribiendo".
- **Hay strings hardcodeados fuera de i18n** en aria-labels y placeholders (`"Precio mínimo"`,
  `"Precio máximo"`, `"Close"`, `"Paginación"`), violando la regla de "cero strings hardcodeados"
  de la sección 5.
- **Riesgos de contraste:** `text-muted` (#64748b) sobre superficies glass translúcidas y textos
  de 11px (`text-[11px]`) en badges; varios usos de `opacity`/`/50` que pueden caer por debajo de
  WCAG AA. Requiere verificación de contraste real.

---

## Hallazgos

### Color y theming

| Severidad | Hallazgo |
|---|---|
| **Info (positivo)** | Cero colores hardcodeados de la paleta de Tailwind en toda la app (búsqueda `bg-(blue\|red\|...)-N` sin matches). Variables semánticas usadas correctamente en todos los componentes. Excelente. |
| **baja** | `src/presentation/components/layout/logo.tsx:42-47` — los huecos de la paleta usan `fill="#fff"` hardcodeado. Aceptable en un SVG de marca, pero si en el futuro hay tema oscuro estos puntos quedarán blancos sobre fondo claro. Mejor `var(--surface)` o `currentColor`. Impacto: bajo, solo afecta a un eventual dark mode. |
| **baja** | `src/presentation/components/finder/dual-range-slider.tsx` (vía `globals.css:359,369`) — los thumbs nativos usan `border: 2px solid #fff` hardcodeado. Igual que arriba: ok hoy, frágil ante re-skin. Impacto: bajo. |

### Tipografía y jerarquía

| Severidad | Hallazgo |
|---|---|
| **Info (positivo)** | `Heading` centraliza h1–h4 con escalas consistentes (`heading.tsx`). Bien usado en páginas. |
| **media** | Textos de 11px: `finder-chat.tsx:718` y `paddle-card.tsx:24` usan `text-[11px]`. En mobile, 11px de texto informativo ("En stock", "Mejor para vos") está por debajo del mínimo cómodo (12px). Impacto: legibilidad mobile, sobre todo el badge de stock que comunica info de compra. |
| **baja** | Inconsistencia de niveles de heading en la ficha de paleta: `paletas/[slug]/page.tsx:87` usa `Heading level={1}` con `className="text-2xl sm:text-3xl"`, pisando la escala del componente. Es un override puntual razonable, pero erosiona el "single source of truth" de tipografía. Impacto: bajo. |
| **baja** | En `comparar/page.tsx:69` y `:178` se usan `<h2>`/`<th>` con clases sueltas (`text-sm font-semibold uppercase`) en vez de `Heading`. Coherente visualmente, pero fuera del sistema. Impacto: bajo. |

### Accesibilidad (teclado, foco, ARIA, alt)

| Severidad | Hallazgo |
|---|---|
| **alta** | **Chips sin foco visible ni rol de estado.** `finder-chat.tsx` — `MultiSelect` (línea 427), `BrandSelect` (línea 472) y `QuickChip` (línea 829) son `<button>` con hover pero **sin `focus-visible:outline`** y **sin `aria-pressed`**. El estado seleccionado se comunica **solo por color** (gradiente vs glass) + un check decorativo (`aria-hidden`). Un usuario con teclado no ve dónde está el foco, y un lector de pantalla no sabe si el chip está activo. Impacto: alto — el buscador IA es la feature estrella y sus controles principales no son accesibles. |
| **alta** | **`OptionButton` (`finder-chat.tsx:386`) sí tiene `focus-visible`** (bien), pero las opciones single/scale/yesno **no exponen el estado seleccionado a AT** porque al elegir avanzan de paso; aceptable. El problema real es el contraste de `active:scale-90` sin indicación de qué quedó elegido en el historial salvo el bubble de usuario (ok). Impacto: medio-bajo (mitigado por el historial). |
| **media** | **`aria-live="polite"` sobre todo el viewport del chat** (`finder-chat.tsx:206`) combinado con el efecto typewriter (`useTypewriter`) puede hacer que el lector de pantalla **anuncie carácter por carácter** o re-anuncie todo el historial en cada cambio. Debería anunciarse solo el mensaje nuevo ya completo. Impacto: medio — experiencia muy ruidosa para usuarios de lector de pantalla. |
| **media** | **Dependencia de color en el ranking de resultados.** `finder-chat.tsx:705-716` — el `#1/#2/#3` se distingue por color de fondo (primary/secondary/glass). El número sí está presente como texto (`#{rec.rank}`), lo cual lo salva, pero el badge "Mejor para vos" (línea 717) solo aparece visualmente. Impacto: medio. |
| **media** | **Tabla comparadora: diferencias marcadas solo por color.** `comparar/page.tsx:189` resalta filas que difieren con `bg-primary/10`. La leyenda (`:204`) lo explica visualmente pero no hay marca textual/`aria` por celda. Un usuario daltónico o con lector de pantalla no percibe qué filas difieren. Impacto: medio. |
| **media** | **Modal sin foco inicial ni trap explícito.** `modal.tsx` usa `<dialog showModal()>` nativo (que da foco-trap del navegador, bien) pero no mueve el foco a un elemento útil ni lo restaura al cerrar de forma garantizada en todos los browsers. El botón de cierre tiene `aria-label="Close"` **hardcodeado en inglés**. Impacto: medio. |
| **baja** | **Iconos decorativos correctamente marcados** `aria-hidden` en casi todos lados. Bien. `Spinner` tiene `role="status"` (`skeleton.tsx:21`) — correcto. |
| **baja** | **Alt text de imágenes:** `PaddleCard` (`paddle-card.tsx:32`), ficha (`[slug]/page.tsx:71`), comparar (`comparar/page.tsx:156`) y resultados del finder (`finder-chat.tsx:696`) usan `alt={paddle.name}`. Correcto y descriptivo. El fallback sin imagen usa `ImageOff` con `aria-hidden` y sin texto alternativo visible — aceptable pero podría tener `aria-label` "sin imagen". Impacto: bajo. |
| **baja** | **`TypingDots` usa `aria-label="…"`** (`finder-chat.tsx:960`) — un literal de puntos suspensivos que el lector de pantalla leería como "puntos suspensivos". Debería ser `aria-hidden` (es decorativo; el estado de carga ya se comunica por el texto "Pensando…"). Impacto: bajo. |
| **baja** | **Progreso del chat es `aria-hidden`** (`finder-chat.tsx:881`) — las barritas son decorativas pero el contador `current/total` (`:877`) sí es legible. Ok, aunque convendría un `aria-label` resumen ("Paso 3 de 8"). Impacto: bajo. |

### Strings hardcodeados fuera de i18n

| Severidad | Hallazgo |
|---|---|
| **media** | `dual-range-slider.tsx:51,63` — `aria-label="Precio mínimo"` / `"Precio máximo"` en español hardcodeado. En inglés quedarán mal. Debe venir de `next-intl`. Impacto: medio (a11y + i18n incompletos). |
| **media** | `modal.tsx:44` — `aria-label="Close"` en inglés hardcodeado, encima inconsistente con el resto (la app default es español). Debe venir de i18n. Impacto: medio. |
| **baja** | `pagination.tsx:36` — `aria-label="Paginación"` en español hardcodeado. Debe ser i18n. Impacto: bajo. |
| **baja** | `comparar/page.tsx:193` y `:65` — el guion `"—"` para celda vacía y el separador `·` son glifos, no traducibles, ok. (No es hallazgo, se confirma que el resto del texto sí viene de `t()`). |

### Responsive / mobile-first

| Severidad | Hallazgo |
|---|---|
| **Info (positivo)** | Buen uso de breakpoints `sm:`/`lg:`, grillas que colapsan a 1 columna, header con nav oculta en mobile y link único, sombras de scroll en la tabla comparadora (`comparar/page.tsx:133-134`). El brief mobile-first se respeta. |
| **media** | **Tabla comparadora en mobile:** `comparar/page.tsx` — columnas con `min-w-[8.5rem]` y scroll horizontal. Con 4 paletas el scroll es largo y la primera columna sticky (`sticky left-0`) compite con el header sticky (`top-16`). En pantallas chicas puede haber solapamiento visual de los dos sticky. Conviene verificar en device real. Impacto: medio. |
| **media** | **Viewport del chat con `h-[68vh]`** (`finder-chat.tsx:204`) — en mobile con teclado virtual abierto (input de texto libre / presupuesto), 68vh puede dejar el campo activo tapado por el teclado. El auto-scroll ayuda pero `vh` no descuenta el teclado. Impacto: medio. |
| **baja** | **Targets táctiles chicos:** `Button size="sm"` es `h-8` (32px) y varios chips son `py-1.5` (~28-30px de alto). WCAG recomienda 44×44px en touch. El `LocaleSwitcher` (`py-1`) y el botón admin (`px-2 py-1`) quedan claramente por debajo. Impacto: bajo-medio en mobile. |

### Estados, microinteracciones y consistencia de componentes

| Severidad | Hallazgo |
|---|---|
| **Info (positivo)** | Excelente trabajo de microinteracciones: `glass-hover`, `glow-ring`, `btn-energy`, `nav-underline`, animaciones de entrada con `Reveal`, y **respeto serio de `prefers-reduced-motion`** (`globals.css:332`, `Tilt`, `ThinkingBubble`, auto-scroll del chat). Muy por encima del promedio. |
| **media** | **Botones "fantasma" reimplementados a mano.** `OptionButton`, `MultiSelect`, `BrandSelect`, `QuickChip` (todos en `finder-chat.tsx`) recrean estilos de botón con clases sueltas en vez de usar/extender `Button`. Resultado: el `focus-visible` y los tamaños divergen del sistema (de ahí el hallazgo de foco). Es justo el "estilos sueltos repetidos por la app" que el brief prohíbe (sección 4). Impacto: medio (consistencia + a11y). |
| **baja** | **`Tag` define `bg-surface` opaco** (`badge.tsx:35`) mientras casi todo lo demás es glass translúcido; visualmente los tags quedan más "duros" que las cards. Decisión de diseño, pero conviene revisar coherencia. Impacto: bajo. |
| **baja** | **Inputs y textarea repiten la misma cadena de clases** en vez de reutilizar el componente `Input`. El `<textarea>` del finder (`finder-chat.tsx:535` y `:804`) copia literalmente las clases de `Input`. Debería existir un `Textarea` en la librería UI. Impacto: bajo (mantenibilidad). |
| **baja** | **`RangeSlider` (componente UI) no se usa**: el finder usa su propio `DualRangeSlider`. Hay un componente base huérfano. No es un bug, pero indica deuda de librería. Impacto: bajo. |

---

## Bugs detectados

1. **[a11y / alta]** Chips del buscador (`MultiSelect`, `BrandSelect`, `QuickChip` en
   `finder-chat.tsx:427,472,829`) **no tienen `focus-visible` ni `aria-pressed`**: invisibles al
   tabular y mudos para lectores de pantalla. La feature estrella no es operable por teclado.
2. **[a11y / media]** `aria-live="polite"` sobre el contenedor completo del chat + typewriter
   (`finder-chat.tsx:206` + `use-typewriter`) → anuncios ruidosos / repetidos en lectores de pantalla.
3. **[i18n / media]** aria-labels hardcodeados: `"Precio mínimo"`, `"Precio máximo"`
   (`dual-range-slider.tsx:51,63`), `"Close"` (`modal.tsx:44`), `"Paginación"`
   (`pagination.tsx:36`). Rompen i18n y la coherencia de idioma.
4. **[contraste / media]** `text-[11px]` en badges de stock (`paddle-card.tsx:24`) y "mejor match"
   (`finder-chat.tsx:718`); `text-muted` sobre glass translúcido en varios lugares; usos de
   `text-muted/50` (paginación deshabilitada, `pagination.tsx:43,75`) y `opacity-50` en disabled.
   Probable sub-AA — requiere medición de contraste real sobre el fondo aurora.
5. **[responsive / media]** Doble sticky en la tabla comparadora (header `top-16` + primera
   columna `left-0`) puede solaparse en pantallas angostas (`comparar/page.tsx:142-180`).
6. **[a11y / media]** Tabla comparadora marca diferencias **solo con color** (`bg-primary/10`,
   `comparar/page.tsx:189`) sin equivalente textual por celda.
7. **[mobile / media]** `h-[68vh]` del chat no descuenta el teclado virtual; el campo activo puede
   quedar tapado al escribir (`finder-chat.tsx:204`).

---

## Oportunidades de mejora

- **Unificar todos los "chips/pills" en un componente `Chip`/`Toggle` de la librería UI** con
  `aria-pressed`, `focus-visible` y tamaños consistentes. Eliminaría 3 reimplementaciones y
  cerraría los hallazgos de a11y de un golpe.
- **Agregar `Textarea` a `ui/`** (hoy duplicado dos veces) y migrar los textareas del finder.
- **Centralizar aria-labels en i18n** (`a11y.*` namespace) para slider, modal, paginación.
- **Refinar el patrón `aria-live` del chat:** un `<div aria-live="polite" class="sr-only">` que
  contenga solo el último mensaje completo, y desactivar el live region del viewport visual.
- **Verificación formal de contraste WCAG AA** del set: `text-muted` (#64748b) sobre `--surface`
  y sobre glass; estados disabled/`/50`; badges de 11px. Documentar ratios en este mismo archivo.
- **Tokens de tamaño táctil:** definir un `min-h`/`min-w` de 44px para controles interactivos en
  mobile (botones sm, locale switcher, chips).
- **Dark mode listo:** las variables ya están centralizadas; reemplazar los `#fff` del logo y los
  thumbs por variables semánticas habilita un tema oscuro casi gratis (encaja con el activo de
  "re-skin en un solo lugar" del brief).
- **`Heading` para los h2/h3 sueltos** en comparar/ficha, para no perder el single source of truth.
- **Estado de foco para los nav links** (`site-header.tsx`, `site-footer.tsx`): hoy solo tienen
  `hover`, sin `focus-visible` explícito (heredan el del browser, que el `outline` global puede
  pisar). Verificar que el foco sea visible.

## Funcionalidades nuevas sugeridas

- **Toggle de tema claro/oscuro** apoyado en las variables ya existentes (`--background`,
  `--surface`, glass). Bajo costo, alto impacto percibido, y coherente con la promesa de re-skin.
- **Vista "comparar" responsive alternativa en mobile:** en vez de tabla con scroll, cards
  apiladas con specs en acordeón o swipe entre paletas (mejor que el scroll horizontal largo).
- **Modo "alto contraste" / respeto de `prefers-contrast`** además de `prefers-reduced-motion`.
- **Indicador de progreso accesible en el chat** (`aria-label="Paso X de Y"`) y botón "volver
  atrás" un paso (hoy solo existe "reiniciar").
- **Skeletons consistentes para el detalle de paleta y la tabla comparadora** (hoy solo existe
  `PaddleGridSkeleton`).
- **Sticky CTA del finder en mobile** ("Ver resultados") para presupuesto, con safe-area insets.

## Quick wins

1. Agregar `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`
   a `MultiSelect`/`BrandSelect`/`QuickChip` y `aria-pressed={on}`/`aria-pressed={active}`.
   (`finder-chat.tsx:427,472,829`) — cierra el bug de a11y más grave.
2. Mover los 4 aria-labels hardcodeados a i18n (`dual-range-slider.tsx:51,63`, `modal.tsx:44`,
   `pagination.tsx:36`).
3. Marcar `TypingDots` como `aria-hidden` y quitar el `aria-label="…"` (`finder-chat.tsx:960`).
4. Subir los `text-[11px]` a `text-xs` (12px) en los badges de stock y "mejor match"
   (`paddle-card.tsx:24`, `finder-chat.tsx:718`).
5. Añadir un equivalente textual (ícono + sr-only o `title`) a las celdas que difieren en la
   tabla comparadora (`comparar/page.tsx:189`).
6. Cambiar `fill="#fff"` del logo por `var(--surface)` y los `#fff` de los thumbs por variable
   (`logo.tsx:42-47`, `globals.css:359,369`) para dejar el dark mode listo.
7. Dar `min-h-[44px]` a botones `sm` usados como acciones primarias en mobile (o crear un
   `size="touch"`).
8. Añadir `aria-label` (i18n) al fallback `ImageOff` cuando una paleta no tiene imagen.

---

_Archivo generado: `docs/auditorias/ux-2-visual-a11y.md`_

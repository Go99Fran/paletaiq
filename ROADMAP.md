# PaletaIQ — Análisis y roadmap de mejoras

> Estado al 2026-06-14: MVP completo en producción (https://paletaiq.vercel.app).
> 399 paletas, 13 marcas, ~190 precios ARS. Stack: Next 16 + MySQL (Railway) +
> Auth.js (Google) + Anthropic. Deploy automático por push a GitHub.
> Este doc es la lista de trabajo priorizada para las próximas iteraciones.

Cada ítem lleva un peso: **[S]** chico (horas), **[M]** medio (1-2 días),
**[L]** grande (varios días). Y un impacto estimado: 🔥 alto, ⭐ medio, 💤 nice-to-have.

---

## 1. Funcionalidades posibles

### 1.1 Alertas de baja de precio 🔥 [M]
El esquema ya soporta historial de precios (`prices`), así que esto es "gratis" a nivel datos.
- Usuario logueado marca una paleta → "avisame si baja de $X".
- Tabla `price_alerts(user_id, paddle_id, target_price, active)`.
- Un cron diario compara `current_prices` contra los targets y manda email (Resend/SendGrid).
- **Por qué primero:** es el feature que genera retención y vuelve recurrente a un comprador
  que naturalmente entra una vez y se va. Es el gancho para pedir login.

### 1.2 Links de afiliados + tracking de clicks 🔥 [M]
- El modelo de negocio real. Cada `current_prices.product_url` puede llevar un tag de afiliado.
- Tabla `click_events(paddle_id, store_id, user_id?, ts)` para medir qué convierte.
- Redirección vía `/go/[priceId]` que registra el click y redirige (no exponer el link directo).
- **Por qué:** monetización sin cobrarle al usuario; alinea con el tono "independiente".

### 1.3 Historial de precios visible (gráfico) ⭐ [M]
- Ya guardamos `prices` con `scraped_at`. Falta exponerlo: un mini-gráfico en la ficha
  ("este es el precio más bajo de los últimos 3 meses" / "subió 12% este mes").
- Es un diferenciador fuerte vs. comparadores españoles y refuerza confianza.
- Lib liviana (visx, o SVG a mano para no sumar peso).

### 1.4 Guardar/compartir perfil de jugador y recomendaciones ⭐ [S]
- Ya guardamos `player_profiles` y `recommendations` en DB, pero el usuario anónimo las pierde.
- Con login: "mis búsquedas", link compartible de la recomendación (`/r/[id]`).
- Bajo esfuerzo porque la data ya se persiste; falta la vista y el routing.

### 1.5 Cuentas: favoritos / wishlist ⭐ [S]
- `favorites(user_id, paddle_id)`. Botón corazón en cards y ficha.
- Habilita "comparar mis favoritas" y alimenta las alertas de precio.

### 1.6 Más fuentes de scraping (cobertura de precios) 🔥 [L]
- Hoy ~190 paletas tienen precio ARS; el resto solo specs. Cada tienda nueva sube cobertura.
- Tiendas AR pendientes: las grandes multimarca (no solo oficiales de marca).
- El runner + adapters Shopify/Tiendanube ya están; sumar fuentes es repetir el patrón.
- **Cuello de botella del producto:** sin precios, una paleta es solo una ficha.

### 1.7 Buscador por texto libre / semántico ⭐ [L]
- Hoy el buscador es un wizard de pasos. Sumar un input "contame qué buscás" en lenguaje natural
  que arme el `PlayerProfile` con una llamada a Claude (extracción estructurada).
- Más rápido para el usuario experto; el wizard queda para el principiante.

### 1.8 SEO + contenido (tráfico orgánico) 🔥 [M]
- Es un producto de búsqueda: el tráfico va a venir de Google ("mejor paleta para principiante 2026").
- Generar páginas de categoría indexables: `/paletas/principiante`, `/paletas/control`, por marca, etc.
- `sitemap.xml` dinámico, metadata por ficha (ya hay base i18n), datos estructurados (JSON-LD Product).
- Bajo costo, alto retorno a mediano plazo.

### 1.9 Panel admin: cola de matching de fuentes ⭐ [M]
- Ya existe `paddle_source_links` con estado `pending`. Falta la UI para resolver matches
  (cuando una tienda tiene una paleta que no está en el catálogo canónico).
- Hoy el admin valida specs, pero el matching multi-fuente es manual/inexistente.

### 1.10 Comparador compartible + más slots ⭐ [S]
- El comparador ya toma slugs por URL (`?p=`). Falta botón "compartir esta comparación".
- Evaluar permitir comparar 4 (límite actual) vs. 5-6 en desktop.

---

## 2. Mejoras sobre lo ya hecho

### 2.1 Recomendador: señales reales de popularidad 🔥 [M]
- Hoy `popularity` es un seed editorial por marca (1-5) hecho a mano. Funciona, pero es estático.
- Mejor: derivarla de **datos reales** → clicks (1.2), favoritos (1.5), cantidad de tiendas con stock,
  apariciones en recomendaciones aceptadas. Un job nocturno recalcula el score.
- Mientras tanto, completar a mano desde el admin las top ~50 paletas.

### 2.2 Recomendador: explicar el "por qué no" y dar alternativas ⭐ [S]
- Cuando el presupuesto deja pocas candidatas, hoy se relaja silenciosamente el filtro de precio.
- Mejor: decírselo al usuario ("con tu presupuesto hay pocas; te muestro estas y algunas un poco
  por encima"). Más honesto y útil.

### 2.3 Calidad de datos: completar specs faltantes 🔥 [M]
- Hay ~14 paletas sin forma, ~17 sin nivel, ~62 sin estilo de juego (afecta filtros y recomendación).
- Pipeline de enriquecimiento con IA (el de ballgames ya existía): cross-reference con fuentes,
  con fuente verificable por campo, sin adivinar. Aplicar y validar desde el admin.

### 2.4 Caché de la llamada a Claude / costos ⭐ [S]
- Cada búsqueda llama a la IA. Perfiles idénticos podrían cachear el resultado (mismo set de
  candidatas + mismo perfil → misma respuesta) por unas horas.
- Reduce costo y latencia. Hoy hay fallback heurístico si la IA falla, lo cual está bien.

### 2.5 Scraping programado de verdad (cron) 🔥 [M]
- Hoy el scraping se dispara a mano desde el admin o CLI. Para mantener precios frescos hace falta
  un cron real (Vercel Cron o GitHub Actions) que corra las fuentes 2x/semana y registre en `scrape_runs`.
- Sin esto, los precios envejecen y el valor diferencial (precio ARS actual) se degrada.

### 2.6 Tests de los parsers de scraping ⭐ [M]
- Los adapters (Shopify/Tiendanube) no tienen tests. Cuando una tienda cambia el HTML, se rompe
  en silencio. Tests con fixtures (HTML guardado) por fuente, como función pura.

### 2.7 Manejo de errores e imágenes rotas ⭐ [S]
- Las imágenes vienen de CDNs externos (hotlink). Algunas fallan. Falta un fallback consistente
  (placeholder con la marca) y `loading="lazy"` afinado.
- Revisar estados vacíos en todas las páginas (sin resultados, sin precio, error de IA).

### 2.8 Login en producción (Google OAuth) 🔥 [S]
- **Pendiente operativo:** falta agregar el redirect URI de prod en Google Cloud Console
  (`https://paletaiq.vercel.app/api/auth/callback/google`). Hasta eso, el login no anda en prod.
- Bloquea 1.1, 1.4, 1.5 (todo lo que necesita usuario logueado).

### 2.9 Accesibilidad y performance ⭐ [M]
- Auditar con Lighthouse: contraste de los textos sobre el fondo aurora, foco visible, labels.
- El fondo animado y los blobs: medir impacto en mobile de gama baja; ya respeta reduced-motion.
- Lazy-load de imágenes below-the-fold, `priority` solo en la ficha.

---

## 3. UX y visual — efectos y mejoras

### 3.1 Buscador: streaming real de la explicación de la IA 🔥 [M]
- Hoy el typing del bot es simulado y la respuesta de la IA aparece de golpe tras "pensando".
- Mejor: **streamear la respuesta real de Claude** token por token (la API lo soporta) → se siente
  como ChatGPT generando. Es el efecto "wow" que el producto pide y que el usuario ya pidió.
- Requiere server action con streaming / route handler con `ReadableStream`.

### 3.2 Cards de paleta: micro-interacciones ⭐ [S]
- Hoy tienen glass + glow en hover. Sumar: tilt 3D sutil al mouse, parallax leve de la imagen,
  el precio que "cuenta" hasta el valor al entrar en viewport.
- Skeleton → contenido con fade, no corte seco.

### 3.3 Comparador: resaltar diferencias ⭐ [M]
- Hoy es una tabla plana. Mejor: resaltar la mejor celda de cada fila (precio más bajo en verde,
  peso más liviano, etc.) y atenuar las iguales. Hace la comparación *accionable* de un vistazo.
- En mobile ya scrollea con columna sticky (recién arreglado); sumar indicador de "deslizá →".

### 3.4 Transiciones entre páginas ⭐ [M]
- Usar View Transitions API (Next 16 la soporta) para que navegar listado → ficha sea fluido
  (la imagen de la card "vuela" a la ficha). Mucho impacto percibido, poco código.

### 3.5 Home: hero más vivo ⭐ [S]
- El fondo aurora está bueno. Sumar: un mockup/preview del producto en el hero (cards flotando),
  contador animado ("399 paletas, 13 marcas, precios reales"), y un CTA secundario más claro.

### 3.6 Filtros: versión mobile como bottom-sheet 🔥 [S]
- En mobile el form de filtros ocupa mucho scroll antes de ver resultados. Mejor: un botón
  "Filtros" que abre un panel/bottom-sheet (el componente Modal ya existe), con los chips activos
  siempre visibles arriba de la grilla.

### 3.7 Resultados del buscador: presentación tipo "podio" ⭐ [S]
- Hoy las recomendaciones son cards apiladas. Darle jerarquía visual a la #1 (más grande, badge
  "mejor match", destacada) y el resto como alternativas. Refuerza la sensación de recomendación.

### 3.8 Modo oscuro ⭐ [M]
- El theming ya está en variables CSS semánticas → un dark mode es mapear un segundo set de valores.
- El público (pádel, gamer-ish) lo va a apreciar; el toggle puede ir junto al de idioma.

### 3.9 Estados de carga con personalidad ⭐ [S]
- Los skeletons ya están. Sumar microcopy en el "pensando" del buscador ("analizando tu juego…",
  "buscando entre 399 paletas…") que rote, para que la espera de la IA se sienta intencional.

### 3.10 Pulido de detalle ⭐ [S]
- Toasts para acciones (agregada a comparar, alerta creada).
- Empty states ilustrados en vez de solo texto.
- Favicon + OpenGraph images (compartir en WhatsApp/redes muestra preview lindo) — clave para viralidad.
- Revisar tipografía: un display font para títulos le daría más carácter a la marca.

---

## Sugerencia de orden (si tuviera que elegir)

1. **Login en prod** (2.8) — desbloquea media app. [S]
2. **Cron de scraping** (2.5) + **más fuentes** (1.6) — mantiene vivo el activo: la data. [M/L]
3. **Streaming real de la IA** (3.1) — el "wow" que diferencia el buscador. [M]
4. **Alertas de precio** (1.1) + **afiliados** (1.2) — retención + monetización. [M]
5. **SEO/contenido** (1.8) — el motor de tráfico orgánico a mediano plazo. [M]

El resto es pulido incremental que se puede intercalar.

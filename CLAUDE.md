# PaletaIQ — Comparador + Buscador inteligente de paletas de pádel (Argentina-first)

> Este documento es el brief técnico y funcional del proyecto. Leelo entero antes de
> escribir una sola línea de código. Si una decisión no está especificada acá, priorizá:
> simplicidad, código directo, sin sobre-ingeniería, y commits chicos e incrementales.

---

## 0. Marca e identidad

- **Nombre del producto:** **PaletaIQ**
- **Escritura correcta:** "PaletaIQ" (una sola palabra, la "IQ" siempre en mayúsculas).
  Nunca "Paleta IQ", "PaletaiQ" ni "Paleta-IQ".
- **Concepto:** "Paleta" (la palabra argentina; en España se dice "pala") + "IQ" (inteligencia),
  por el buscador con IA que recomienda la paleta ideal según tu perfil de juego.
- **Tagline / claim sugerido:** "Encontrá tu paleta ideal" (ES) / "Find your perfect padel
  racket" (EN). Usar este claim como subtítulo del buscador inteligente.
- **Dominio objetivo:** `paletaiq.com` (y `paletaiq.com.ar` para Argentina). Handle de
  redes sugerido: `@paletaiq`.
- **Uso del nombre en el código:**
  - `<title>` y metadatos SEO (ver sección 4.1).
  - Variable de marca en config (ej. `APP_NAME = "PaletaIQ"`), nunca hardcodeado suelto
    por la app; el nombre visible viene de i18n / config para poder ajustarlo en un solo lugar.
  - `package.json` name: `paletaiq`.
- **Tono de marca:** moderno, claro, cercano y argentino. Experto pero sin solemnidad.
  Honesto e independiente (no somos una tienda que te empuja a comprar lo más caro).

---

## 1. Visión del producto

Estamos construyendo el **lugar de referencia del pádel en Argentina** para elegir paleta.
Hoy los comparadores buenos son españoles y son inútiles para un comprador argentino: no
tienen precios en pesos, ni stock local, ni tiendas argentinas. Esa es nuestra ventaja.

El producto tiene dos núcleos:

1. **Comparador de paletas** — fichas de paletas con specs normalizadas, precios en pesos,
   historial de precios y disponibilidad en tiendas argentinas. Comparar varias lado a lado.
2. **Buscador inteligente ("¿qué paleta te queda?")** — un flujo tipo chat que hace preguntas
   sobre el perfil del jugador y el presupuesto, y termina recomendando paletas reales usando IA.

**Principio rector:** el verdadero activo no es la UI, es **la base de datos de paletas**.
Diseñá el modelo de datos pensando que en 1 año lo vamos a licenciar/exponer como API a tiendas.
Todo lo demás (comparador, buscador, alertas de precio) son vistas sobre esa data.

---

## 2. Stack tecnológico (usar últimas versiones estables)

> Antes de instalar, verificá e instalá las **últimas versiones estables** de cada paquete.
> No fijes versiones viejas por costumbre. Lo de abajo son referencias, no pins obligatorios.

- **Next.js** (App Router) + **React** — últimas versiones estables.
- **TypeScript** estricto (`strict: true`).
- **MySQL** como base de datos. **Sin ORM, sin Prisma.** Queries nativas con el driver
  `mysql2` (usar la API de promises y *prepared statements* siempre, nunca concatenar strings).
- **Tailwind CSS** (última versión) para estilos.
- **Auth.js (NextAuth v5)** con provider de **Google OAuth**.
- **SDK oficial de Anthropic** (`@anthropic-ai/sdk`) para la parte de IA.
- **next-intl** (o equivalente vigente) para i18n (español e inglés).
- **lucide-react** para íconos.

### Regla de íconos (importante)
Usar **exclusivamente `lucide-react`**. Está **prohibido** dejar íconos por defecto, emojis
como íconos, o placeholders. Si un elemento necesita ícono, elegir uno apropiado de Lucide.

---

## 3. Arquitectura del backend (Domain-Driven, por capas)

Backend organizado por **dominio**, con separación clara de capas. No mezclar lógica de
negocio con detalles de Next.js ni con SQL.

```
src/
  domain/                # Núcleo. Cero dependencias de framework/infra.
    paddle/
      paddle.entity.ts          # Entidad Paddle + value objects (Shape, Balance, etc.)
      paddle.repository.ts       # Interfaz (puerto), no implementación
    pricing/
      price.entity.ts
      price.repository.ts
    store/
    brand/
    player-profile/
      player-profile.entity.ts   # Perfil del jugador (nivel, estilo, presupuesto...)
    recommendation/
      recommendation.entity.ts

  application/           # Casos de uso. Orquestan dominio. Independientes de Next.
    paddle/
      compare-paddles.usecase.ts
      get-paddle-detail.usecase.ts
      list-paddles.usecase.ts
    recommendation/
      recommend-paddles.usecase.ts    # El cerebro del buscador (ver sección 6)
    pricing/
      get-price-history.usecase.ts

  infrastructure/        # Implementaciones concretas. Acá vive el SQL y las APIs externas.
    db/
      mysql-client.ts                  # Pool de conexiones mysql2
      paddle.mysql.repository.ts       # Implementa paddle.repository.ts con SQL nativo
      price.mysql.repository.ts
      ...
    ai/
      anthropic.client.ts              # Wrapper del SDK de Anthropic
    scraping/
      scrapers/                        # Un scraper por fuente (ver sección 7)
      scrape-runner.ts
      normalizers/                     # Normalización de specs/marcas

  presentation/          # Next.js: solo entrada/salida. Llama a casos de uso.
    (rutas, server actions, componentes — ver sección 4)
```

**Reglas de la arquitectura:**
- El `domain` no importa nada de `infrastructure` ni de Next. Solo tipos/lógica pura.
- Los casos de uso reciben repositorios por **interfaz** (inyección de dependencias simple,
  no hace falta un container mágico: una factory/función que arma el caso de uso alcanza).
- El SQL vive **solo** en `infrastructure/db`. Si ves SQL en un componente o en un caso de uso,
  está mal ubicado.
- No sobre-abstraer. Si una capa no agrega valor real, no la fuerces. Pragmatismo > pureza.

---

## 4. Frontend

- **Server Components por defecto.** Usar `'use client'` solo cuando haga falta interactividad
  real (el chat, comparador interactivo, inputs controlados). Data fetching en server components
  o server actions, nunca llamando a la DB desde el cliente.
- **Componentes estándar reutilizables** desde el día 1. Antes de maquetar una pantalla,
  construir la librería base en `presentation/components/ui/`:
  - `Card`, `CardHeader`, `CardBody`
  - `Button` (variantes: primary, secondary, ghost, etc.)
  - `Input`, `Select`, `RangeSlider`
  - `Heading` / `Title` (h1..h4 consistentes)
  - `Badge`, `Tag`, `Skeleton`, `Spinner`, `Modal`
  - Todo tipado, accesible, y reutilizado. **Nada de estilos sueltos repetidos por la app.**
- Diseño limpio, mobile-first (mucho tráfico de pádel es mobile).

### Theming con Tailwind (colores estándar para cambiar fácil después)
Definir la paleta con **variables semánticas**, no colores hardcodeados, para poder
re-skinear todo cambiando un solo lugar:

- Definir CSS variables: `--color-primary`, `--color-secondary`, `--color-tertiary`,
  más `--color-background`, `--color-surface`, `--color-text`, `--color-muted`,
  `--color-success`, `--color-danger`.
- Mapearlas en la config de Tailwind como `primary`, `secondary`, `tertiary`, etc.
- En los componentes usar **siempre** `bg-primary`, `text-secondary`, etc. **Nunca**
  `bg-blue-600` ni hex sueltos. Así cambiar la identidad visual después es trivial.

---

## 5. Internacionalización (i18n)

- Idiomas: **español (default) e inglés.** Arquitectura preparada para sumar más después.
- Usar `next-intl` (o el estándar vigente) con routing por locale.
- **Cero strings hardcodeados** en la UI: todo va en archivos de mensajes (`es.json`, `en.json`).
- Ojo con la data de paletas: las descripciones/specs que vienen de scraping suelen estar en
  español. Para el MVP, los **textos de interfaz** son traducibles; las **descripciones de paleta**
  pueden quedar en su idioma original, pero dejá el modelo de datos preparado para tener
  campos de descripción por idioma a futuro (ej. tabla `paddle_translations`).

---

## 6. Funcionalidad estrella: el buscador inteligente (chat + IA)

Flujo tipo chat que arma el **perfil del jugador** y devuelve paletas recomendadas reales.

### 6.1 Flujo de preguntas (onboarding del perfil)
El chat guía al usuario con preguntas (pueden ser de opción múltiple para mobile). Mínimo:

1. **Nivel:** principiante / intermedio / avanzado / competitivo.
2. **Estilo de juego:** defensivo (control) / equilibrado / ofensivo (potencia/pegador).
3. **Frecuencia:** cuántas veces por semana juega.
4. **Físico / lesiones:** ¿molestias de codo/hombro/muñeca? (afecta dureza y peso recomendados).
5. **Fuerza / pegada:** ¿busca que la paleta le dé potencia o controla bien solo?
6. **Experiencia previa / paleta actual** (opcional, texto libre).
7. **Qué querés mejorar:** potencia / control / salida de bola / comodidad.
8. **Presupuesto:** rango en **pesos argentinos (ARS)** — min y max.

Guardar el perfil estructurado (`PlayerProfile`) asociado al usuario si está logueado, o en
sesión si es anónimo.

### 6.2 Cómo recomienda (decisión de arquitectura crítica)

**La IA NO inventa paletas. Solo rankea y explica sobre candidatas reales de nuestra DB.**

Pipeline del caso de uso `recommend-paddles.usecase.ts`:

1. **Filtro duro en MySQL:** con el perfil + presupuesto, traer las paletas candidatas
   (ej. dentro del rango de precio, nivel compatible, con stock). Esto reduce el universo
   a, digamos, 10–30 paletas reales con sus specs y precios actuales.
2. **Llamada a Claude (Anthropic SDK):** mandar el **perfil del jugador** + la **lista de
   candidatas con sus specs/precios** y pedirle que:
   - Elija las 3–5 mejores PARA ESE PERFIL.
   - Explique en lenguaje claro **por qué** cada una (estilo, físico, presupuesto).
   - Ordene por fit.
   - Devuelva **JSON estructurado** (ids de paletas + razón), sin texto extra, sin markdown.
3. **Validación:** parsear el JSON, verificar que los ids devueltos **existan** en las
   candidatas (descartar cualquier id inventado). Mapear a las fichas reales.
4. **Render:** mostrar las paletas recomendadas como cards, con la explicación de la IA,
   precio actual, y link al comparador / a la tienda.

> Clave: el prompt a Claude debe dejar EXPLÍCITO que solo puede elegir entre las paletas
> provistas, que responda únicamente con el JSON pedido, y nada más (sin preámbulo ni backticks).

### 6.3 Anthropic SDK
- La key va en `ANTHROPIC_KEY` (env var del servidor, **nunca** expuesta al cliente).
- La llamada a Claude ocurre **solo en el servidor** (server action o route handler).
- Encapsular el SDK en `infrastructure/ai/anthropic.client.ts`. El caso de uso no conoce el SDK
  directamente, habla con una interfaz (`AiRecommender`).
- Manejar errores y timeouts con elegancia: si la IA falla, caer a un ranking heurístico simple
  por specs (fallback) para no romper la experiencia.

---

## 7. Data: scraping y modelo de datos (el corazón del proyecto)

### 7.1 Fuentes a scrapear
Necesitamos **buena data**, es el 80% del valor. Scrapear:
- **Specs de paletas:** sitios de referencia con fichas técnicas completas (forma, balance,
  peso, núcleo, cara/carbono, dureza, nivel, perfil). Las marcas y los sitios españoles tienen
  buenas specs; usarlos para la ficha técnica.
- **Precios y stock argentinos:** tiendas online argentinas de pádel (varias). De acá sacamos
  precio en ARS, disponibilidad y link de compra. Una paleta puede estar en varias tiendas.
- Reutilizar/adaptar lógica de scraping ya existente si aplica.

Cada fuente = un scraper aislado en `infrastructure/scraping/scrapers/`, con un **normalizador**
que mapea los datos crudos al modelo canónico (mismas marcas, mismas formas, mismas unidades).

### 7.2 Observabilidad del scraping (tabla `scrape_runs`)
Toda corrida de scraping registra una fila en `scrape_runs` con: fuente, estado
(running/success/error), `started_at`, `finished_at`, items encontrados, items creados,
items actualizados, y errores. Sirve para saber si una fuente cambió de HTML y se rompió.

### 7.3 Programación
Las corridas de scraping deben poder ejecutarse de forma programada (cron) y manual desde el
panel admin. Mantener la data fresca es trabajo continuo, así que diseñalo para que sea robusto
ante cambios de las páginas (loguear y seguir, no explotar toda la corrida por un item).

### 7.4 Modelo de datos (MySQL) — esquema base

> SQL nativo. Definir migraciones en archivos `.sql` versionados (carpeta `db/migrations/`).
> Índices en los campos de filtro (brand_id, shape, level, play_style, price).

```sql
-- Marcas
brands(id, name, slug, logo_url, created_at, updated_at)

-- Paletas (specs canónicas normalizadas)
paddles(
  id, brand_id, name, slug, year,
  shape ENUM('round','teardrop','diamond'),
  balance ENUM('low','medium','high'),          -- bajo/medio/alto
  weight_min, weight_max,                        -- gramos
  core_material,                                 -- EVA soft/hard, FOAM, etc.
  face_material,                                 -- carbono 3K/12K/18K, fibra de vidrio
  surface ENUM('rough','smooth'),                -- rugosa/lisa
  hardness ENUM('soft','medium','hard'),
  level ENUM('beginner','intermediate','advanced','pro'),
  play_style ENUM('control','balance','power'),
  thickness,                                      -- mm (38 / 38.5)
  image_url, description, is_active,
  created_at, updated_at
)

-- Traducciones de descripción (preparado para multiidioma a futuro)
paddle_translations(id, paddle_id, locale, description)

-- Tiendas argentinas
stores(id, name, slug, website_url, logo_url, country, created_at, updated_at)

-- Precios (historial + multi-tienda). Cada scrape inserta una fila nueva.
prices(
  id, paddle_id, store_id,
  price DECIMAL(12,2), currency CHAR(3) DEFAULT 'ARS',
  in_stock BOOLEAN, product_url,
  scraped_at, created_at
)
-- índice (paddle_id, store_id, scraped_at) para historial y "precio actual" rápido

-- Usuarios (Google OAuth via Auth.js)
users(id, email, name, image, locale, created_at, updated_at)
-- (las tablas que pida Auth.js para sesiones/cuentas, según su adapter)

-- Perfil del jugador (resultado del chat)
player_profiles(
  id, user_id NULL,                  -- null si anónimo
  level, play_style, frequency,
  has_injuries BOOLEAN, injury_notes,
  strength_pref, improve_goal,
  budget_min, budget_max, currency DEFAULT 'ARS',
  created_at
)

-- Sesiones de recomendación (qué le recomendó la IA y por qué)
recommendations(
  id, player_profile_id, paddle_id, rank,
  reason TEXT,                        -- explicación de la IA
  created_at
)

-- Observabilidad de scraping
scrape_runs(
  id, source, status ENUM('running','success','error'),
  started_at, finished_at,
  items_found, items_created, items_updated,
  error_message, created_at
)
```

> Nota: "precio actual" = el `prices` más reciente por (paddle, store). El historial habilita
> el feature de **alertas de baja de precio** más adelante (no en el MVP, pero el esquema ya lo soporta).

---

## 8. Autenticación

- **Auth.js (NextAuth v5)** con **Google OAuth**.
- Credenciales en env vars del servidor.
- Login opcional para usar el buscador, pero **necesario** para guardar perfil/recomendaciones
  y (a futuro) configurar alertas de precio.
- Proteger el panel admin por rol (campo `role` en users, o lista de emails admin por env).

---

## 9. Panel de administración (mínimo, para nosotros)

Ruta protegida `/admin` con:
- Listado/edición manual de paletas (corregir specs que el scraping saca mal).
- Gestión de marcas y tiendas.
- Disparar scraping manual por fuente.
- Ver `scrape_runs` (estado de las corridas, errores).

---

## 10. Variables de entorno

```
DATABASE_URL / o host,user,pass,db de MySQL
ANTHROPIC_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
AUTH_SECRET=...
NEXT_PUBLIC_DEFAULT_LOCALE=es
ADMIN_EMAILS=...        # opcional, para gatekeeping del panel
```

Nunca commitear `.env`. Dejar un `.env.example` con las claves sin valores.

---

## 11. Alcance del MVP (qué construir primero)

Construir en este orden, con **commits chicos e incrementales** en cada paso:

1. **Setup + modelo de datos.** Proyecto Next, conexión MySQL (pool mysql2), migraciones base,
   librería de componentes UI estándar, theming Tailwind con variables, i18n esqueleto, Auth.js
   con Google.
2. **Capa de dominio + repos.** Entidades Paddle/Brand/Store/Price + interfaces + implementación
   MySQL con SQL nativo. Seed con un set de paletas reales de prueba (a mano, ~20).
3. **Comparador.** Listado de paletas con filtros, ficha de paleta, comparar hasta 4 lado a lado.
4. **Buscador inteligente.** Flujo de chat (preguntas + presupuesto) → filtro en DB → Claude
   rankea/explica → resultados. Con fallback heurístico.
5. **Scraping.** Un scraper de specs + un scraper de precios de una tienda argentina, con
   normalizadores y `scrape_runs`. Después sumar más fuentes.
6. **Panel admin.** Corrección manual + disparo de scraping + ver corridas.

**Fuera del MVP (pero el diseño ya lo soporta):** alertas de baja de precio, afiliados/links a
tiendas con tracking, API pública para tiendas, AdSense, más idiomas, juegos/prode.

---

## 12. Convenciones y filosofía de trabajo

- **Sin sobre-ingeniería.** Solución directa y accionable. Si una abstracción no se usa hoy,
  no la construyas hoy.
- **Commits chicos e incrementales**, mensajes claros.
- **TypeScript estricto**, sin `any` salvo casos justificadísimos.
- **SQL solo en repositorios**, siempre con prepared statements (anti SQL injection).
- **Server Components por defecto**, cliente solo donde hace falta.
- **Nada hardcodeado**: ni strings (van a i18n), ni colores (van a variables Tailwind), ni
  íconos por defecto (siempre Lucide).
- Código y comentarios pueden ir en español.
- Antes de cada feature grande, dejá claro el plan en un comentario o nota corta y avanzá.

---

## 13. Primer paso concreto

Arrancá por el **punto 1 del MVP**: armá el proyecto, la conexión a MySQL, las migraciones base
del esquema de la sección 7.4, la librería de componentes UI estándar con el theming de variables,
el esqueleto de i18n (es/en) y el login con Google. Cuando eso esté funcionando y comiteado,
seguimos con la capa de dominio y los repos.
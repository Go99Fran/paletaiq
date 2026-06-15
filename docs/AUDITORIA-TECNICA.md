# PaletaIQ — Auditoría técnica del código

> Revisión del código en producción al 2026-06-14. A diferencia del ROADMAP (features),
> esto son **hallazgos concretos leídos en el código**: bugs latentes, riesgos y deuda.
> Cada uno con archivo, severidad y fix propuesto.
> Severidad: 🔴 crítico (puede romper/costar), 🟡 medio (deuda real), 🟢 menor (pulido).

---

## A. Bugs latentes y riesgos

### A.1 🔴 La tabla `prices` crece sin tope ni deduplicación
**Archivo:** `src/infrastructure/scraping/scrape-runner.ts` (líneas ~234-238)
Cada corrida inserta una fila nueva en `prices` por cada paleta con precio, **siempre**, sin
chequear si el precio cambió respecto al último. Con un cron 2x/semana × ~190 precios = ~380
filas/semana = ~20k/año, la mayoría idénticas a la anterior.
- Hoy: 237 filas, 0 duplicados por día (porque se corrió poco). No es problema *aún*.
- **Fix:** insertar en `prices` solo si el precio difiere del último registrado para ese
  `(paddle_id, store_id)`. El historial debe registrar *cambios*, no *corridas*. Esto además
  hace el futuro gráfico de precios (1.3 del roadmap) mucho más limpio.

### A.2 🟡 El scraping corre con `pool.execute` sin transacción
**Archivo:** `scrape-runner.ts` (`upsertPaddle`)
El upsert de paleta + source_link + current_price + price son 4 statements separados. Si el
proceso muere a la mitad, queda una paleta sin precio o un source_link huérfano.
- **Fix:** envolver el upsert de cada paleta en una transacción (`conn.beginTransaction()`).
  No es crítico porque es idempotente (la próxima corrida lo arregla), pero ensucia datos.

### A.3 🟡 `findCandidates` con presupuesto muy bajo devuelve cualquier cosa
**Archivo:** `src/application/recommendation/recommend-paddles.usecase.ts` (~42)
Si el presupuesto deja <5 candidatas, se **descarta el filtro de precio por completo** y se traen
30 paletas de cualquier precio. El usuario que puso "hasta $200.000" puede recibir una de $600.000.
- **Fix:** relajar el presupuesto *gradualmente* (ej. +30%) en vez de eliminarlo, y avisarle al
  usuario que ampliamos el rango (ver 2.2 del roadmap).

### A.4 🟡 La llamada a Claude no tiene reintento ante errores transitorios
**Archivo:** `src/infrastructure/ai/anthropic.client.ts`
`maxRetries: 1` en el cliente, pero un `JSON.parse` que falle (respuesta malformada) o un 529
(overloaded) tira directo al fallback heurístico. Está *bien* que haya fallback, pero se pierde
la calidad de la IA por un error transitorio que un retry resolvería.
- **Fix:** subir `maxRetries` a 2-3 (el SDK ya hace backoff), y envolver el `JSON.parse` para
  reintentar una vez con un prompt de "devolvé JSON válido" antes de caer al heurístico.

### A.5 🟡 El JWT no expone el `userId` de nuestra DB
**Archivo:** `src/auth.ts` + `src/app/[locale]/buscador/actions.ts`
En cada recomendación de un usuario logueado se hace `findUserIdByEmail` (un SELECT extra) porque
el token solo tiene el email, no nuestro `users.id`. Es un round-trip a la DB evitable en cada acción.
- **Fix:** en el callback `signIn`/`jwt`, guardar el `userId` en el token. Una query menos por acción.

### A.6 🟢 `getPool` asume conexión sin TLS
**Archivo:** `src/infrastructure/db/mysql-client.ts`
Railway hoy expone MySQL por TCP plano y funciona. Si algún día se migra a un proveedor con TLS
obligatorio (PlanetScale, Aiven), el pool falla. Está comentado pero no resuelto.
- **Fix:** detectar `?ssl=true` en la URL o una env var y pasar `ssl` al pool. Menor hasta migrar.

### A.7 🟢 Imágenes externas sin dominios allowlisted explícitos
**Archivo:** `next.config.ts` — `remotePatterns: [{ hostname: "**" }]`
Permite optimizar imágenes de *cualquier* host. Funciona, pero es un vector de abuso (alguien
podría usar tu optimizador de imágenes con URLs arbitrarias) y Next lo desaconseja.
- **Fix:** listar los hosts reales de los CDNs de las marcas/tiendas. Requiere relevar qué dominios
  aparecen en `image_url` (un `SELECT DISTINCT` sobre el host).

---

## B. Arquitectura y consistencia

### B.1 🟡 La factory instancia todo en import (sin lazy)
**Archivo:** `src/application/factory.ts`
Se crean todos los repos y casos de uso al importar el módulo. Incluye `createAnthropicRecommender()`,
que lee env vars en import-time. En server components está bien, pero acopla el arranque. Si mañana
hay un repo con setup costoso, se paga siempre.
- **Fix (menor):** está ok para el tamaño actual. Si crece, mover a funciones `getX()` lazy.

### B.2 🟡 Falta capa de validación de entrada centralizada (Zod)
Los server actions validan a mano (`sanitize` en buscador, `enumOrNull` en admin). Funciona y es
explícito, pero es repetitivo y fácil de olvidar en una action nueva.
- **Fix:** un esquema Zod por action. Menos código, validación declarativa, y tipos derivados.

### B.3 🟢 `raw_data` mezcla import de Supabase y scraper
El JSON `raw_data` tiene formas distintas según el origen (`imported_from` vs `scraper`). No rompe
nada (es para debug/auditoría), pero dificulta consultarlo. Aceptable.

### B.4 🟡 No hay índice de unicidad documentado en `current_prices`/`prices`
El upsert `ON DUPLICATE KEY` de `current_prices` depende de que exista una PK/unique en
`(paddle_id, store_id)`. Está en la migración, pero conviene un test que lo verifique: si alguien
edita la migración y lo rompe, el upsert empieza a duplicar en silencio.

---

## C. Performance

### C.1 🟡 El listado hace 2 queries (items + count) en cada request
**Archivo:** `src/infrastructure/db/paddle.mysql.repository.ts` (`list`)
Normal para paginar, pero el `count` repite todo el JOIN de precios. Con catálogo chico (399) es
imperceptible; a escala conviene `SQL_CALC_FOUND_ROWS` o un count simplificado.

### C.2 🟡 El window function de candidatas corre en cada búsqueda
**Archivo:** `paddle.mysql.repository.ts` (`findCandidates`)
El `ROW_NUMBER() OVER (PARTITION BY brand)` sobre todo el catálogo filtrado se ejecuta en cada
recomendación. Con 399 filas es trivial; a 10k+ paletas conviene materializar o cachear el set
de candidatas por (nivel, rango de precio).

### C.3 🟢 Sin caché de páginas (`revalidate`)
El listado y las fichas son dinámicas (`ƒ`). El catálogo cambia poco (scraping 2x/semana), así que
podrían ser ISR con `revalidate: 3600` → muchísimo menos carga en la DB y respuestas instantáneas.
- **Fix:** `export const revalidate = 3600` en listado y ficha; revalidar on-demand tras un scrape.
  Alto impacto en costo/latencia, bajo esfuerzo.

### C.4 🟡 El fondo aurora + blobs animados en mobile de gama baja
Cuatro `blur-3xl` animados con `animate-blob` pueden costar batería/jank en celulares viejos.
Respeta `prefers-reduced-motion`, pero la mayoría no lo tiene activado.
- **Fix:** en mobile, reducir a 2 blobs o bajar el blur; medir con DevTools throttling.

---

## D. Seguridad

### D.1 🟢 Rol admin por email en env var (OK para MVP)
`ADMIN_EMAILS` define admins. Simple y suficiente ahora. A futuro, un campo `role` en `users`
(ya existe en el esquema) permitiría gestionarlo sin redeploy.

### D.2 🟡 El admin dispara scraping fire-and-forget sin rate-limit
**Archivo:** `src/app/[locale]/admin/actions.ts` (`triggerScrape`)
Un admin puede disparar N scrapings en paralelo (botón repetido) → N corridas concurrentes a la
misma fuente, posible rate-limit del sitio origen o carga en la DB.
- **Fix:** chequear si ya hay un `scrape_runs` con status `running` para esa fuente antes de lanzar.

### D.3 🟢 Prepared statements en todo el SQL ✅
Revisado: todo el SQL usa named placeholders o `?`. **No hay concatenación de input** → sin
SQL injection. Bien hecho. (Las únicas interpolaciones son `LIMIT`/`OFFSET` con `Number()`, seguro.)

### D.4 🟡 Sin CSP ni headers de seguridad
No hay Content-Security-Policy, `X-Frame-Options`, etc. Para un sitio público que va a tener
AdSense y afiliados, conviene definirlos en `next.config.ts` o middleware.

---

## E. Testing y observabilidad

### E.1 🔴 Cero tests automatizados
No hay un solo test. Los parsers de scraping (funciones puras con HTML de entrada) son el caso
ideal y el más frágil: cuando una tienda cambia el HTML, se rompe en silencio.
- **Fix prioritario:** vitest + fixtures de HTML por fuente. Es la red de seguridad del activo
  principal (la data). El brief original lo pedía.

### E.2 🟡 `console.log`/`console.error` como única observabilidad
El scraping y los errores de IA logean a consola. En Vercel se ven en los logs, pero no hay
alertas ni agregación. Un `scrape_runs` con status `error` no notifica a nadie.
- **Fix:** al menos, una vista en el admin que resalte corridas fallidas; idealmente un webhook
  a Discord/email cuando una fuente se rompe.

### E.3 🟢 Sin analytics de uso
No se mide qué se busca, qué se compara, qué recomendaciones se aceptan. Esa data alimentaría
la popularidad real (2.1 del roadmap) y decisiones de producto. Vercel Analytics o Plausible.

---

## Prioridad de la deuda técnica (qué tocar primero)

| # | Ítem | Severidad | Esfuerzo | Por qué |
|---|------|-----------|----------|---------|
| 1 | E.1 Tests de parsers | 🔴 | M | Red de seguridad del activo principal (data) |
| 2 | A.1 Dedup de `prices` | 🔴 | S | Evita tabla inflada antes de activar el cron |
| 3 | C.3 ISR en listado/ficha | 🟡 | S | Gran baja de carga/latencia, casi gratis |
| 4 | D.2 Lock de scraping concurrente | 🟡 | S | Evita rate-limit y corridas pisadas |
| 5 | A.3 Relajar presupuesto gradual | 🟡 | S | Recomendaciones más honestas |
| 6 | A.5 userId en el JWT | 🟡 | S | Una query menos por acción logueada |

Lo 🟢 es pulido que se intercala. Lo 🔴 conviene antes de escalar tráfico o activar el cron.

# PaletaIQ - Runbook de Scraping para LLM

Este documento explica todo lo necesario para que un LLM (o cualquier operador) pueda ejecutar scraping en este repositorio de forma segura y repetible.

## 1. Objetivo

Ejecutar scraping de fuentes de paletas y precios, persistiendo resultados en MySQL con trazabilidad en `scrape_runs`, usando comandos automatizados y estrategias de reintento robustas.

## 2. Ubicación y piezas clave

- Script batch recomendado: `scripts/scrape-batch.ts`
- Script legacy por fuente: `scripts/scrape.ts`
- Registro de fuentes: `src/infrastructure/scraping/scrapers/index.ts`
- Cliente HTTP con retry/backoff: `src/infrastructure/scraping/http.ts`
- Runner de persistencia (DB + `scrape_runs`): `src/infrastructure/scraping/scrape-runner.ts`

## 3. Prerrequisitos

1. Estar en la raíz del proyecto.
2. Tener dependencias instaladas.
3. Tener `.env` válido con conexión MySQL.
4. Verificar que DB responde y que las tablas de scraping existen.

Comandos sugeridos:

```bash
npm install
npm run lint
```

## 4. Comandos oficiales (usar estos primero)

Todos estos comandos ya están definidos en `package.json`.

### 4.1 Health-check rápido (recomendado antes de todo)

```bash
npm run scrape:quick
```

- Corre todas las fuentes con `limit=5`.
- Es el comando ideal para validar estado general del pipeline.

### 4.2 Fuentes Shopify (las más sensibles a 503)

```bash
npm run scrape:shopify
```

Incluye:
- nox
- siux
- starvie
- vairo
- dropshot

### 4.3 Fuentes core

```bash
npm run scrape:core
```

### 4.4 Corrida completa

```bash
npm run scrape:full
```

Notas:
- `scrape:full` corre todas las fuentes sin límite.
- Si hay mucho volumen, puede tardar bastante.

## 5. Modo avanzado (custom)

Usar `scrape:batch` con parámetros:

```bash
npm run scrape:batch -- --profile=quick --limit=5 --no-cache
npm run scrape:batch -- --profile=full --timeout-ms=900000 --continue-on-error
npm run scrape:batch -- --only=siux,starvie,nox --limit=10 --no-cache --continue-on-error
```

Parámetros disponibles:
- `--profile=quick|full|shopify|core`
- `--limit=N`
- `--no-cache`
- `--only=fuente1,fuente2`
- `--timeout-ms=NUM`
- `--continue-on-error`

## 6. Proceso recomendado para ejecutar en unos días

Seguir este orden exacto:

1. Pull de rama y dependencias:
   - `git pull`
   - `npm install`
2. Validación de base:
   - `npm run lint`
3. Smoke test scraping:
   - `npm run scrape:quick`
4. Si `quick` sale bien y se requiere más cobertura:
   - `npm run scrape:shopify`
   - `npm run scrape:core`
5. Si todo está estable y querés corrida total:
   - `npm run scrape:full`
6. Si hay fallos parciales:
   - rerun focalizado con `--only=` sobre fuentes falladas.

## 7. Interpretación de salida

El batch imprime:

- Inicio con perfil, fuentes y opciones.
- Bloque por fuente (`running source=...`).
- Resumen por fuente con:
  - `run`
  - `found`
  - `created`
  - `updated`
  - `errors`
  - `durationMs`
- Totales finales (`ok`, `failed`, `found`, `created`, `updated`, `errors`).

Criterio práctico de éxito:
- `failed=0` en resumen final.
- `errors=0` o muy bajos y recuperables en rerun focalizado.

## 8. Manejo de errores comunes

### 8.1 HTTP 503 / 429 intermitente

- Reintentar con rerun focalizado por fuente:

```bash
npm run scrape:batch -- --only=siux,starvie,nox --limit=10 --no-cache --continue-on-error
```

- El cliente HTTP ya incluye:
  - backoff exponencial
  - jitter
  - soporte `Retry-After`
  - retry de errores transitorios

### 8.2 Corridas largas sin output incremental

- Evitar una corrida gigante ciega.
- Preferir perfiles (`quick`, `shopify`, `core`) o `--only=` por grupos.
- Usar `--timeout-ms` si necesitás cortar fuentes colgadas.

### 8.3 Falla total de una fuente

- No bloquear todo el pipeline:
  - correr con `--continue-on-error`
- Luego relanzar solo esa fuente con `--only=`.

## 9. Fuentes registradas actualmente

- adidas
- akkeron
- babolat
- blackcrown
- bullpadel
- felina
- kombat
- siux
- nox
- royal
- vairo
- starvie
- dropshot

## 10. Qué persiste en DB

Por cada corrida:
- se crea un registro en `scrape_runs`
- se actualizan/insertan paletas
- se actualizan precios actuales e historial cuando hay cambios
- se registra error por item sin abortar toda la corrida

## 11. Checklist operativo para un LLM

Copiar y ejecutar como checklist:

1. Confirmar cwd en raíz del repo.
2. Ejecutar `npm install`.
3. Ejecutar `npm run lint`.
4. Ejecutar `npm run scrape:quick`.
5. Revisar resumen final:
   - si `failed=0`, continuar.
   - si hay fallas, usar rerun con `--only=`.
6. Ejecutar `npm run scrape:shopify`.
7. Ejecutar `npm run scrape:core`.
8. Solo si se necesita cobertura total, ejecutar `npm run scrape:full`.
9. Reportar matriz final por fuente (OK/FAIL + métricas).

## 12. Comandos de fallback (legacy)

Si necesitás correr una sola fuente con el script clásico:

```bash
npx tsx --env-file=.env scripts/scrape.ts --source=siux --limit=5 --no-cache
```

O todas (no recomendado para operación diaria):

```bash
npx tsx --env-file=.env scripts/scrape.ts --all --no-cache
```

## 13. Recomendación final

Para operación rutinaria usar siempre:

1. `scrape:quick`
2. rerun focalizado (`--only=`) sobre falladas
3. `scrape:shopify` o `scrape:core` según necesidad
4. `scrape:full` solo en ventanas largas de ejecución

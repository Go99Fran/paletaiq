# Plan Completo de Ejecucion para Claude Code

Fecha: 2026-06-14
Proyecto: PaletaIQ
Base: auditoria multiagente UX + Tech Lead + Product
Objetivo: bajar el analisis a tareas ejecutables, con orden, prompts y criterios de aceptacion.

## 1. Como usar este plan en Claude Code

1. Ejecutar por fases (P0 -> P1 -> P2), nunca todo junto.
2. En cada fase, usar el prompt sugerido y pedir PR pequeno por lote.
3. Exigir siempre:
- cambios de codigo,
- pruebas,
- evidencia de validacion,
- resumen de riesgos.
4. No avanzar de fase hasta cumplir DoD de fase.

## 2. Definition of Done global

- Build y typecheck en verde.
- Lint en verde.
- Sin regresiones visibles en:
- Home,
- Paletas listado,
- Paleta detalle,
- Comparar,
- Buscador,
- Admin scraping.
- Eventos de analytics core llegando correctamente.
- Flujo de recomendaciones mantiene restriccion de catalogo real.

## 3. Fase P0 (Semana 1-2): Riesgo alto inmediato

## P0.1 Instrumentacion de funnel

Objetivo:
Medir embudo completo y decisiones de usuario.

Archivos objetivo:
- [src/app/[locale]/page.tsx](src/app/%5Blocale%5D/page.tsx)
- [src/app/[locale]/paletas/page.tsx](src/app/%5Blocale%5D/paletas/page.tsx)
- [src/app/[locale]/paletas/[slug]/page.tsx](src/app/%5Blocale%5D/paletas/%5Bslug%5D/page.tsx)
- [src/app/[locale]/comparar/page.tsx](src/app/%5Blocale%5D/comparar/page.tsx)
- [src/presentation/components/finder/finder-chat.tsx](src/presentation/components/finder/finder-chat.tsx)
- [src/presentation/components/compare/compare-toggle.tsx](src/presentation/components/compare/compare-toggle.tsx)
- [src/presentation/components/compare/compare-bar.tsx](src/presentation/components/compare/compare-bar.tsx)
- [src/app/[locale]/layout.tsx](src/app/%5Blocale%5D/layout.tsx)

Eventos minimos:
- page_view
- finder_started
- finder_step_answered
- finder_completed
- compare_add
- compare_remove
- compare_view
- detail_viewed
- store_outbound_clicked
- catalog_filter_applied

Aceptacion:
- Eventos se disparan con payload consistente.
- No rompe SSR/hidratacion.
- Existe helper central para trackeo, sin duplicacion de logica.

Prompt para Claude Code:
Implementa una capa de analytics central en este proyecto Next.js y agrega instrumentacion de funnel en las rutas y componentes clave (home, listado, detalle, comparar, finder). Debe ser minimalista, tipada y sin romper Server Components. Agrega helper reutilizable y wrappers necesarios para eventos de cliente. Incluye pruebas basicas de utilidades y un documento corto con el mapa de eventos y payloads.

## P0.2 Concurrencia y robustez de scraping

Objetivo:
Evitar corridas simultaneas por fuente y estados inconsistentes.

Archivos objetivo:
- [src/app/[locale]/admin/actions.ts](src/app/%5Blocale%5D/admin/actions.ts)
- [src/infrastructure/scraping/scrape-runner.ts](src/infrastructure/scraping/scrape-runner.ts)
- [src/infrastructure/db/scrape-run.mysql.repository.ts](src/infrastructure/db/scrape-run.mysql.repository.ts)
- [db/migrations/001_base_schema.sql](db/migrations/001_base_schema.sql)

Cambios esperados:
- Guard por fuente en estado running.
- Rechazo limpio si ya existe corrida activa.
- Registro de error parcial/total mas claro.

Aceptacion:
- Si trigger doble para misma fuente, solo una corrida arranca.
- Admin recibe mensaje claro.
- Scrape_runs refleja estado correcto.

Prompt para Claude Code:
Implementa un lock de concurrencia por fuente para el scraping admin. Si una fuente ya tiene corrida activa, bloquear nuevo trigger con respuesta clara. Refactoriza el flujo para evitar inconsistencias de estado y deja pruebas de integracion simples sobre el repositorio o sobre funciones de negocio. No cambies la arquitectura por capas.

## P0.3 Buscador: presupuesto y confianza

Objetivo:
Eliminar comportamientos confusos con presupuesto.

Archivos objetivo:
- [src/presentation/components/finder/finder-chat.tsx](src/presentation/components/finder/finder-chat.tsx)
- [src/app/[locale]/buscador/actions.ts](src/app/%5Blocale%5D/buscador/actions.ts)
- [src/application/recommendation/recommend-paddles.usecase.ts](src/application/recommendation/recommend-paddles.usecase.ts)
- [src/application/recommendation/heuristic-ranker.ts](src/application/recommendation/heuristic-ranker.ts)
- [messages/es.json](messages/es.json)
- [messages/en.json](messages/en.json)

Cambios esperados:
- Validacion cliente min <= max con feedback inline.
- Relajacion gradual de presupuesto (no eliminar filtro de golpe).
- Mensaje explicito cuando se amplie rango.
- Mensaje de fallback heuristico mas visible.

Aceptacion:
- No hay recomendaciones absurdamente fuera de presupuesto salvo ampliacion explicada.
- UX muestra por que y cuanto se amplio.
- i18n completo en ES/EN.

Prompt para Claude Code:
Refactoriza el flujo de presupuesto del finder para que sea transparente y predecible. Valida min/max en cliente, aplica estrategia de relajacion gradual en servidor (por ejemplo por tramos) y comunica claramente al usuario cuando se amplia rango. Mantener JSON de recomendacion y constraints actuales. Agrega tests de casos borde.

## P0.4 Hardening de seguridad web

Objetivo:
Reducir superficie de riesgo.

Archivos objetivo:
- [next.config.ts](next.config.ts)
- [src/proxy.ts](src/proxy.ts)

Cambios esperados:
- Headers base: X-Content-Type-Options, Referrer-Policy, frame-ancestors/X-Frame-Options, Permissions-Policy.
- Politica CSP inicial no disruptiva (iterativa).
- Allowlist de imagenes en lugar de wildcard host total.

Aceptacion:
- Sitio sigue funcionando.
- Imagenes necesarias siguen cargando.
- Headers visibles en respuestas.

Prompt para Claude Code:
Aplica hardening de seguridad en Next.js con headers recomendados y reemplaza wildcard de remote image hosts por allowlist real. Haz cambios incrementales para no romper funcionalidad. Incluye checklist de validacion y fallback si algun host de imagen falta.

## P0.5 Smoke tests CI

Objetivo:
Poner red minima anti-regresion.

Archivos objetivo:
- [package.json](package.json)
- [eslint.config.mjs](eslint.config.mjs)
- nueva carpeta tests segun stack elegido

Alcance minimo:
- lint
- typecheck
- test de utilidades criticas
- smoke e2e de finder/comparar basico (si es viable)

Aceptacion:
- Scripts de CI listos.
- Pipeline local reproducible.

Prompt para Claude Code:
Instala y configura una base de testing pragmatica para este repo (unit + smoke), con comandos claros en package.json y enfoque en evitar regresiones de finder, compare y scraping logic. Mantener setup simple y rapido.

## 4. Fase P1 (Semana 3-4): Calidad de data, accesibilidad, performance

## P1.1 Dedupe de historico de precios

Objetivo:
Guardar solo cambios reales de precio/stock.

Archivos objetivo:
- [src/infrastructure/scraping/scrape-runner.ts](src/infrastructure/scraping/scrape-runner.ts)
- [src/infrastructure/db/price.mysql.repository.ts](src/infrastructure/db/price.mysql.repository.ts)

Aceptacion:
- Si no cambia precio/stock, no se inserta nuevo historico.
- Historial queda mas limpio para graficos.

Prompt para Claude Code:
Implementa deduplicacion del historico de precios: insertar nueva fila solo cuando cambie precio o stock respecto al ultimo registro por paddle y tienda. Mantener compatibilidad con consultas actuales.

## P1.2 A11y fixes criticos

Objetivo:
Subir baseline WCAG 2.2 AA en flujos core.

Archivos objetivo:
- [src/presentation/components/finder/finder-chat.tsx](src/presentation/components/finder/finder-chat.tsx)
- [src/presentation/components/ui/modal.tsx](src/presentation/components/ui/modal.tsx)
- [src/presentation/components/ui/input.tsx](src/presentation/components/ui/input.tsx)
- [src/presentation/components/ui/pagination.tsx](src/presentation/components/ui/pagination.tsx)
- [src/app/[locale]/comparar/page.tsx](src/app/%5Blocale%5D/comparar/page.tsx)
- [src/app/[locale]/layout.tsx](src/app/%5Blocale%5D/layout.tsx)

Alcance minimo:
- labels y asociaciones htmlFor/id,
- focus management modal,
- aria-live para chat,
- scope/caption en tablas,
- skip link a contenido principal.

Prompt para Claude Code:
Aplica un lote de mejoras de accesibilidad WCAG AA en finder, modal, paginacion y comparador. Prioriza cambios de alto impacto y bajo riesgo. Agrega una checklist de testing manual de teclado y screen reader.

## P1.3 Performance del catalogo

Objetivo:
Reducir carga DB y mejorar TTFB.

Archivos objetivo:
- [src/app/[locale]/paletas/page.tsx](src/app/%5Blocale%5D/paletas/page.tsx)
- [src/app/[locale]/paletas/[slug]/page.tsx](src/app/%5Blocale%5D/paletas/%5Bslug%5D/page.tsx)
- [src/infrastructure/db/paddle.mysql.repository.ts](src/infrastructure/db/paddle.mysql.repository.ts)

Cambios esperados:
- ISR/revalidate razonable.
- Revision de query list/count.
- Evitar llamadas repetitivas innecesarias.

Prompt para Claude Code:
Optimiza rendimiento en listado y detalle de paletas: agrega estrategia de revalidacion adecuada, revisa consultas SQL de listado/conteo y elimina overhead evitable. Entrega benchmark simple antes/despues (tiempo de respuesta y cantidad de queries).

## 5. Fase P2 (Semana 5-8): Growth y monetizacion

## P2.1 Tracking outbound con redirect medible

Objetivo:
Atribuir click comercial por tienda/paleta.

Archivos objetivo:
- [src/app/[locale]/paletas/[slug]/page.tsx](src/app/%5Blocale%5D/paletas/%5Bslug%5D/page.tsx)
- nueva ruta de redirect en app/api o app/[locale]

Aceptacion:
- Cada click outbound queda trackeado con contexto.
- Redireccion robusta y segura.

## P2.2 Alertas de precio MVP

Objetivo:
Crear loop de retencion real.

Dependencias:
- Auth estable,
- historico deduplicado,
- data freshness minima.

## P2.3 SEO tecnico base

Objetivo:
Mejorar adquisicion organica.

Alcance:
- sitemap,
- robots,
- metadata robusta por ruta,
- enlaces internos estrategicos.

## 6. Backlog operacional (tickets sugeridos)

Formato por ticket:
- Titulo
- Severidad
- Owner sugerido
- Archivos
- Tareas
- Criterio de aceptacion
- Estimacion (S/M/L)

### Ticket 01
Titulo: Instrumentar evento finder_started y finder_completed
Severidad: P0
Owner: Frontend
Archivos:
- [src/presentation/components/finder/finder-chat.tsx](src/presentation/components/finder/finder-chat.tsx)
Estimacion: S

### Ticket 02
Titulo: Bloqueo de scraping concurrente por source
Severidad: P0
Owner: Backend
Archivos:
- [src/app/[locale]/admin/actions.ts](src/app/%5Blocale%5D/admin/actions.ts)
- [src/infrastructure/db/scrape-run.mysql.repository.ts](src/infrastructure/db/scrape-run.mysql.repository.ts)
Estimacion: S

### Ticket 03
Titulo: Validacion de presupuesto min/max en cliente
Severidad: P0
Owner: Frontend
Archivos:
- [src/presentation/components/finder/finder-chat.tsx](src/presentation/components/finder/finder-chat.tsx)
Estimacion: S

### Ticket 04
Titulo: Relajacion gradual de presupuesto en recomendador
Severidad: P0
Owner: Backend
Archivos:
- [src/application/recommendation/recommend-paddles.usecase.ts](src/application/recommendation/recommend-paddles.usecase.ts)
Estimacion: M

### Ticket 05
Titulo: Hardening headers + allowlist de imagenes
Severidad: P0
Owner: Platform/Backend
Archivos:
- [next.config.ts](next.config.ts)
Estimacion: S

### Ticket 06
Titulo: Dedupe de historial de precios
Severidad: P1
Owner: Backend/Data
Archivos:
- [src/infrastructure/scraping/scrape-runner.ts](src/infrastructure/scraping/scrape-runner.ts)
Estimacion: M

### Ticket 07
Titulo: A11y live region en chat y focus trap modal
Severidad: P1
Owner: Frontend
Archivos:
- [src/presentation/components/finder/finder-chat.tsx](src/presentation/components/finder/finder-chat.tsx)
- [src/presentation/components/ui/modal.tsx](src/presentation/components/ui/modal.tsx)
Estimacion: M

### Ticket 08
Titulo: scope/caption en tabla comparador
Severidad: P1
Owner: Frontend
Archivos:
- [src/app/[locale]/comparar/page.tsx](src/app/%5Blocale%5D/comparar/page.tsx)
Estimacion: S

### Ticket 09
Titulo: ISR y revalidate en listado/ficha
Severidad: P1
Owner: Frontend/Backend
Archivos:
- [src/app/[locale]/paletas/page.tsx](src/app/%5Blocale%5D/paletas/page.tsx)
- [src/app/[locale]/paletas/[slug]/page.tsx](src/app/%5Blocale%5D/paletas/%5Bslug%5D/page.tsx)
Estimacion: S

### Ticket 10
Titulo: Redirect tracking outbound a tiendas
Severidad: P2
Owner: Backend/Growth
Archivos:
- [src/app/[locale]/paletas/[slug]/page.tsx](src/app/%5Blocale%5D/paletas/%5Bslug%5D/page.tsx)
Estimacion: M

## 7. Prompt maestro para Claude Code (copiar/pegar)

Actua como Staff Engineer fullstack en Next.js con foco en calidad de producto y confiabilidad de datos. Trabaja sobre el repo PaletaIQ y ejecuta esta fase del plan de auditoria. Restricciones:
- cambios pequenos e incrementales,
- respetar arquitectura por capas existente,
- no romper i18n,
- no introducir sobre-ingenieria,
- mantener TypeScript estricto.

Entregables obligatorios en cada lote:
1) Codigo implementado,
2) tests/validacion,
3) lista de archivos modificados,
4) riesgos y rollback plan,
5) checklist de aceptacion cumplida.

Si detectas decisiones ambiguas, toma la opcion mas pragmatica y documentala.

## 8. Orden sugerido de ejecucion con Claude Code

1. P0.2 scraping lock
2. P0.3 presupuesto finder
3. P0.1 analytics funnel
4. P0.4 security hardening
5. P0.5 smoke tests
6. P1.1 dedupe precios
7. P1.2 a11y critico
8. P1.3 performance catalogo
9. P2.1 outbound tracking
10. P2.2 alertas MVP
11. P2.3 SEO base

## 9. KPI de control semanal

- Finder completion rate
- Compare adoption rate
- Detail to store click-through
- % catalogo con precio vigente
- Scrape success rate por fuente
- Error rate del recomendador

Si estos KPI no mejoran tras cada fase, priorizar aprendizaje y no solo entrega de features.

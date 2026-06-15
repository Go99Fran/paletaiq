# Auditoría Multiagente — PaletaIQ

Fecha: 2026-06-14
Cobertura: 3 agentes UX + 2 Tech Leads + 2 Product Managers
Objetivo: detectar mejoras y bugs para elevar calidad UX, técnica y readiness comercial.

## Agentes ejecutados

1. UX Heurístico (navegación, usabilidad, consistencia)
2. UX Conversión (funnel, fricción, mobile, microcopy)
3. UX Accesibilidad (WCAG 2.2 AA)
4. Tech Lead Backend/Arquitectura (seguridad, performance, confiabilidad)
5. Tech Lead Frontend (componentes, estabilidad, calidad)
6. PM Estrategia (propuesta de valor, KPI tree, roadmap)
7. PM Ejecución (release readiness, riesgos, plan 8 semanas)

## Resumen Ejecutivo

PaletaIQ tiene una base sólida y diferencial (Argentina-first + IA sobre catálogo real), pero hoy no está listo para escala comercial agresiva. El principal cuello de botella no es la UI sino confiabilidad/operación de datos y falta de analítica de funnel. En paralelo, hay issues de UX/a11y que impactan activación y confianza.

## Hallazgos Críticos (P0)

1. Falta de tests automatizados para flujos críticos (scraping/recomendador/admin).
2. Scraping sin control robusto de concurrencia por fuente (riesgo de corridas simultáneas).
3. Ausencia de instrumentación de funnel (no hay visibilidad de drop-offs reales).
4. Riesgo de recomendaciones fuera de presupuesto percibidas como inconsistentes.
5. A11y: etiquetas de formularios/focus management/live regions mejorables en buscador y tablas.
6. Seguridad web: hardening incompleto (headers de seguridad y allowlist estricta de imágenes).

## Bugs/Mejoras de alto impacto detectadas

1. Compare: límite de 4 sin feedback claro al usuario.
2. Buscador: validación débil de presupuesto en cliente (min/max conflictivo).
3. Mobile discoverability: acceso a comparador menos visible en header.
4. Chat IA: manejo de error/recovery mejorable para confianza del usuario.
5. Tabla comparador: mejoras de semántica accesible (scope/caption) y UX mobile.
6. Admin scraping: visibilidad operativa parcial ante fallas parciales.

## Producto y Growth

1. North Star propuesto: sesiones semanales con alta intención (llegan a click de tienda tras decisión).
2. Falta marco de métricas leading: finder start/completion, compare adoption, detail->store CTR.
3. Monetización incompleta sin capa robusta de tracking outbound/afiliación.
4. Compliance mínimo pendiente para lanzamiento amplio: privacidad, términos, cookies/disclosure.

## Plan Priorizado

## Fase 1 (Semana 1-2)

1. Instrumentación core del funnel y dashboard operativo.
2. Lock de scraping por fuente + guardrails de concurrencia.
3. Validaciones de presupuesto y transparencia en buscador.
4. Hardening de seguridad web (headers + allowlist hosts de imágenes).
5. Smoke tests mínimos en CI (lint, typecheck, flujo buscador, flujo compare).

## Fase 2 (Semana 3-4)

1. Dedupe de historial de precios (guardar cambios reales, no duplicados).
2. A11y fixes críticos (labels, focus, aria-live, tablas).
3. Optimización de queries de listado/candidatas.
4. Mejoras de UX de conversión en landing/lista/ficha (CTA y microcopy).

## Fase 3 (Semana 5-8)

1. Alertas de precio MVP.
2. Tracking outbound con redirección medible.
3. SEO técnico base (sitemap/robots/metadata por ruta).
4. Expandir cobertura de fuentes ARS y observabilidad de scraping.

## Recomendación de ejecución

No conviene pedir informes extremadamente largos por agente como output final principal. Conviene formato ejecutivo con:
- hallazgo,
- severidad,
- evidencia,
- fix concreto,
- criterio de aceptación,
- esfuerzo (S/M/L),
- owner.

Ese formato acelera implementación real y evita documentos de alto volumen sin tracción.

## Entregables disponibles

1. Documento PM estratégico generado: [outputs/pdd.md](outputs/pdd.md)
2. Consolidado multiagente: este archivo.

## Siguiente paso recomendado

Convertir este consolidado en backlog ejecutable por sprint (P0/P1/P2) con tickets implementables y comenzar por 3 PRs rápidos:
1. Observabilidad funnel + eventos core.
2. Concurrencia y robustez de scraping.
3. Buscador: validación + UX de presupuesto + mensajes de fallback.

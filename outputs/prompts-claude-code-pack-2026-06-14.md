# Prompt Pack para Claude Code (PaletaIQ)

Uso: copiar un bloque por vez. Ejecutar en orden.

## Prompt 1 - P0.2 Lock de scraping

Implementa lock de concurrencia por fuente para el trigger de scraping admin en este repo Next.js. Si ya hay una corrida running de la misma fuente, bloquear nueva corrida con respuesta clara para UI. Mantener arquitectura por capas. Agregar pruebas de comportamiento minimo y resumen de archivos modificados.

## Prompt 2 - P0.3 Presupuesto finder

Refactoriza el flujo de presupuesto del finder: validacion cliente min <= max con error inline, relajacion gradual de presupuesto en backend (sin quitar filtro de golpe), y mensaje explicito al usuario cuando se amplia el rango. Mantener soporte i18n ES/EN y agregar tests de casos borde.

## Prompt 3 - P0.1 Analytics funnel

Crea capa central de analytics tipada e instrumenta eventos de funnel en home, catalogo, detalle, comparar y finder. Eventos minimos: page_view, finder_started, finder_step_answered, finder_completed, compare_add/remove/view, detail_viewed, store_outbound_clicked, catalog_filter_applied. Sin romper Server Components ni hidratacion.

## Prompt 4 - P0.4 Security hardening

Aplica hardening de seguridad web en Next.js: headers recomendados (nosniff, referrer-policy, frame protection, permissions-policy, CSP inicial) y reemplaza wildcard de imagenes remotas por allowlist real. Cambios incrementales y checklist de validacion.

## Prompt 5 - P0.5 Testing baseline

Configura baseline de calidad con scripts de lint, typecheck y tests smoke. Enfoca cobertura inicial en finder, compare y logica de scraping/recomendacion. Mantener setup simple y rapido. Entregar comandos de CI y evidencia de ejecucion.

## Prompt 6 - P1.1 Dedupe historico de precios

Implementa deduplicacion del historico de precios para guardar nueva fila solo cuando cambie precio o stock respecto al ultimo registro por paddle+store. Mantener compatibilidad con queries actuales y agregar pruebas de regresion.

## Prompt 7 - P1.2 A11y critico

Aplica mejoras WCAG AA de alto impacto en finder, modal, paginacion y comparador: labels correctas, focus management/trap modal, aria-live en chat, scope/caption en tablas, skip link. Entregar checklist manual de teclado/screen reader.

## Prompt 8 - P1.3 Performance catalogo

Optimiza rendimiento de listado y detalle: estrategia de revalidate/ISR, revision de query list/count y reduccion de overhead evitable. Entregar comparativa before/after simple de tiempos y numero de queries.

## Prompt 9 - P2.1 Outbound tracking

Implementa redireccion saliente medible para clicks a tiendas (tracking por paleta/tienda/session) con validaciones de seguridad. Integrar desde ficha de paleta sin romper UX actual.

## Prompt 10 - P2.2 Alertas precio MVP

Implementa MVP de alertas de precio para usuarios autenticados: crear alerta por paleta, persistencia minima, y disparo inicial (aunque sea manual/cron simulado). Integrar con UI de detalle.

## Prompt 11 - P2.3 SEO tecnico base

Implementa SEO tecnico base: sitemap, robots, metadata consistente por rutas principales y enlaces internos mejorados. No romper i18n por locale.

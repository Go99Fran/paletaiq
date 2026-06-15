Prompt maestro para Claude Code — Upgrade visual distintivo PaletaIQ

Contexto
Trabaja sobre el repositorio PaletaIQ (Next.js App Router + TypeScript + Tailwind + componentes propios UI/fx). Quiero una mejora visual fuerte, memorable y moderna: efectos reales, animaciones fluidas, microinteracciones divertidas y una identidad visual distintiva (sin romper rendimiento ni accesibilidad).

Objetivo de diseño
- Mantener ADN actual (glass + aurora), pero evolucionarlo a una experiencia premium y unica.
- Evitar apariencia generica de landing AI.
- Priorizar experiencia mobile y sensacion de producto vivo.

Restricciones tecnicas
- Cambios incrementales y seguros.
- Sin romper arquitectura por capas existente.
- Sin romper i18n ES/EN.
- Respetar prefers-reduced-motion.
- No degradar Lighthouse mobile: mantener CLS <= 0.1, evitar jank.
- Mantener accesibilidad base (focus visible, contraste, navegacion teclado).

Archivos prioritarios a intervenir
- src/app/globals.css
- src/presentation/components/fx/aurora-background.tsx
- src/presentation/components/fx/reveal.tsx
- src/presentation/components/ui/button.tsx
- src/presentation/components/ui/card.tsx
- src/app/[locale]/page.tsx
- src/presentation/components/finder/finder-chat.tsx
- src/app/[locale]/comparar/page.tsx
- src/presentation/components/layout/site-header.tsx
- src/presentation/components/layout/site-footer.tsx

Entregables obligatorios
1) Implementacion visual completa del lote.
2) Lista de archivos modificados con resumen breve por archivo.
3) Validacion funcional (build/typecheck/lint).
4) Checklist de accesibilidad y rendimiento post-cambio.
5) Notas de rollback (que revertir si hay regressions).

Lote de ejecucion visual (hacer en este orden)

Fase A — Identidad visual y movimiento base
1. Evoluciona aurora-background a una escena mas cinematica:
- Parallax sutil por scroll (solo cliente donde sea necesario y liviano).
- Capas aurora con blend modes controlados.
- Textura de ruido suave para evitar look plano.
- Variantes responsive: menos blur/capas en mobile low-end.

2. Reemplaza animaciones de entrada planas por sistema de motion escalonado:
- Reveal con presets (soft, spring, snap).
- Stagger real por grupos de cards.
- Soporte de delay declarativo por data-attributes.

3. Crea tokens de motion en globals.css:
- duraciones, easings, distancias, opacidades.
- utilidades para hover-lift, magnetic-hover y glow-pulse.

Fase B — Home y narrativa visual
4. Hero distintivo en home:
- CTA primario con efecto de energia (sheen o pulse ring elegante).
- Headline con gradiente vivo pero legible.
- Badge IA con microanimacion de “alive status”.
- Entrada secuencial del hero con ritmo claro.

5. Cards de features con personalidad:
- Hover con inclinacion leve y iluminacion direccional.
- Iconos con halo reactivo.
- Estado active/focus muy visible.

Fase C — Finder experiencial
6. Finder chat tipo experiencia conversacional premium:
- Burbujas con transicion de aparicion (scale + fade + slide).
- Indicador de “thinking” mas vivo (sin exceso).
- Progreso visual por pasos (stepper compacto).
- Validaciones visuales amigables (especialmente presupuesto).
- Resultado cards con reveal escalonado y microfeedback al hover.

7. Estado fallback heuristico visible y elegante:
- Banner informativo claro, no texto escondido.
- Iconografia consistente.
- Mensaje de confianza (“seguimos recomendando con reglas tecnicas”).

Fase D — Comparador y densidad visual
8. Mejorar comparador para legibilidad y wow:
- Header sticky mas robusto y elegante.
- Resaltar diferencias clave entre columnas (no solo tabla plana).
- Animar highlight al entrar en viewport.
- Mejor comportamiento horizontal en mobile.

9. Agregar affordances visuales:
- Sombras laterales para indicar scroll horizontal.
- Indicador de columna activa en touch.

Fase E — Pulido global
10. Header/footer:
- Header con efecto de vidrio adaptativo al scroll.
- Transiciones sutiles en nav links.
- CTA de comparar visible en mobile.

11. Buttons y Card primitives:
- Refinar estados hover/active/focus.
- Unificar altura, paddings y “peso visual”.
- Añadir variantes motion-safe sin duplicar clases excesivamente.

Criterios de aceptacion visual
- La app se percibe claramente mas premium y distintiva al primer vistazo.
- No hay animaciones intrusivas ni pesadas.
- Mobile mantiene fluidez.
- Las mejoras se sienten de producto, no de plantilla.
- Los estados de error/loading/empty son consistentes con nueva identidad.

Checklist de control
- Revisar home, finder, comparar en desktop y mobile.
- Revisar prefers-reduced-motion.
- Revisar contraste en textos sobre superficies glass.
- Revisar foco de teclado en botones/links/inputs.
- Revisar que no aparezca layout shift nuevo.

Output esperado de Claude Code
- Codigo aplicado.
- Resumen de cambios por archivo.
- Evidencia de validacion.
- Lista de proximos 5 ajustes visuales recomendados para iteracion 2.

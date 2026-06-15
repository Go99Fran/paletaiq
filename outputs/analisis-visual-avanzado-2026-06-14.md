# Analisis Visual Avanzado — PaletaIQ

Fecha: 2026-06-14
Foco: efectos reales, animados, divertidos y distintivos sobre codigo actual.

## Diagnostico rapido (estado actual)

Fortalezas actuales:
- Base visual solida con glass + aurora.
- Tokens semanticos en CSS bien planteados.
- Microanimaciones ya presentes (rise/blob/float/shimmer).
- Home con narrativa clara y limpia.

Limites actuales:
- Motion correcto pero predecible (look ya visto en muchas apps).
- Falta de “firma” visual propia de marca en interacciones clave.
- Finder y comparador todavia se sienten funcionales, no memorables.
- Home fuerte, pero el “wow” no se traslada igual al resto del producto.

## Oportunidades distintivas (muy concretas)

## 1. Firma visual PaletaIQ: energia de impacto + precision

Propuesta:
- Concepto visual inspirado en padel: impacto, rebote, trayectoria.
- Traducirlo a UI con:
- pulse de energia en CTA principal,
- ripple sutil al seleccionar opciones en finder,
- glow direccional en cards al hover.

Donde:
- [src/presentation/components/ui/button.tsx](src/presentation/components/ui/button.tsx)
- [src/presentation/components/ui/card.tsx](src/presentation/components/ui/card.tsx)
- [src/presentation/components/finder/finder-chat.tsx](src/presentation/components/finder/finder-chat.tsx)

## 2. Motion system con personalidad (no solo fade-in)

Hoy:
- Reveal usa animate-rise uniforme.

Mejora:
- Presets: soft/spring/snap con distancias y easings distintos.
- Stagger inteligente por bloque (cards, burbujas, filas de tabla).
- Entradas con “ritmo conversacional” en finder.

Donde:
- [src/presentation/components/fx/reveal.tsx](src/presentation/components/fx/reveal.tsx)
- [src/app/globals.css](src/app/globals.css)

## 3. Aurora cinematic y menos generica

Hoy:
- blobs lindos pero comunes.

Mejora:
- capas con blend modes,
- textura de ruido casi imperceptible,
- parallax minimo en scroll,
- modo mobile simplificado para rendimiento.

Donde:
- [src/presentation/components/fx/aurora-background.tsx](src/presentation/components/fx/aurora-background.tsx)
- [src/app/globals.css](src/app/globals.css)

## 4. Finder como experiencia hero del producto

Hoy:
- flow correcto, visualmente sobrio.

Mejora:
- stepper superior compacto (8 pasos) con progreso animado,
- entrada de burbujas con spring,
- opciones con feedback tactile (scale + glow),
- resultado de recomendaciones con reveal por ranking,
- banner fallback heuristico visual y claro.

Donde:
- [src/presentation/components/finder/finder-chat.tsx](src/presentation/components/finder/finder-chat.tsx)
- [messages/es.json](messages/es.json)
- [messages/en.json](messages/en.json)

## 5. Comparador con lectura diferencial real

Hoy:
- tabla correcta pero plana.

Mejora:
- resaltar diferencias automaticamente (chip de “diferente” o tono de celda),
- sombras laterales para indicar scroll,
- columna sticky mas expresiva,
- hover/focus de columna completa.

Donde:
- [src/app/[locale]/comparar/page.tsx](src/app/%5Blocale%5D/comparar/page.tsx)

## 6. Header y navegación con caracter

Mejora:
- header glass adaptativo por scroll,
- nav items con underline animado de marca,
- comparador visible en mobile,
- mini estado de seleccion compare (contador) con efecto suave.

Donde:
- [src/presentation/components/layout/site-header.tsx](src/presentation/components/layout/site-header.tsx)
- [src/presentation/components/compare/compare-bar.tsx](src/presentation/components/compare/compare-bar.tsx)

## 7. Microinteracciones divertidas (sin caer en ruido)

Agregar solo donde aporta:
- CTA primario: sheen diagonal en hover.
- Cards: tilt leve segun puntero (desktop), desactivado en mobile.
- Botones de opciones finder: pequeño “snap” al click.
- Badges ranking: pulse muy sutil al entrar.

## 8. Riesgos visuales a evitar

1. Exceso de blur/transparencia -> baja legibilidad.
2. Animaciones simultaneas en mobile -> jank.
3. Colores demasiado saturados -> fatiga visual.
4. Efectos sin narrativa -> look de template.

## 9. Reglas de calidad visual para esta iteracion

- Cada animacion debe tener proposito funcional o emocional.
- Ninguna animacion puede bloquear tareas.
- Reduced motion siempre respetado.
- Contraste minimo AA en texto principal.
- Estado hover/focus/active diferenciado en todos los componentes interactivos.

## 10. Prioridad visual recomendada

P1 (impacto inmediato)
1. Finder experience.
2. Hero + CTA signature.
3. Comparador legibilidad diferencial.

P2 (pulido de marca)
1. Aurora cinematic.
2. Header adaptativo.
3. Microinteracciones avanzadas.

P3 (optimizacion)
1. Ajustes de performance motion.
2. Ajustes finos de contraste y balance cromatico.
3. Documentar sistema motion para escalado.

## 11. KPI UX visual para validar mejoras

- Finder completion rate.
- Time to first meaningful interaction en home.
- Compare usage rate.
- Detail to outbound CTR.
- Rage clicks y rebote en mobile.

Si no suben estos indicadores, el cambio visual fue cosmetico y debe iterarse.

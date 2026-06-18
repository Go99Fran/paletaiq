"use client";

/**
 * Slider doble (desde / hasta) para el rango de precio. Dos <input type=range>
 * superpuestos sobre una pista; el thumb activo se eleva con z-index para poder
 * agarrar cualquiera de los dos aunque estén cerca. Pista coloreada entre min y max.
 */
export function DualRangeSlider({
  min,
  max,
  step,
  valueMin,
  valueMax,
  onChange,
  labelMin = "Precio mínimo",
  labelMax = "Precio máximo",
}: {
  min: number;
  max: number;
  step: number;
  valueMin: number;
  valueMax: number;
  onChange: (next: { min: number; max: number }) => void;
  labelMin?: string;
  labelMax?: string;
}) {
  const pct = (v: number) => ((v - min) / (max - min)) * 100;

  const handleMin = (raw: number) => {
    const next = Math.min(raw, valueMax - step);
    onChange({ min: Math.max(min, next), max: valueMax });
  };
  const handleMax = (raw: number) => {
    const next = Math.max(raw, valueMin + step);
    onChange({ min: valueMin, max: Math.min(max, next) });
  };

  return (
    <div className="relative h-6 w-full select-none">
      {/* Pista de fondo */}
      <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-border" />
      {/* Rango activo coloreado */}
      <div
        className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-primary to-tertiary"
        style={{ left: `${pct(valueMin)}%`, right: `${100 - pct(valueMax)}%` }}
      />
      {/* Thumb min */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={valueMin}
        onChange={(e) => handleMin(Number(e.target.value))}
        aria-label={labelMin}
        className="dual-thumb pointer-events-none absolute top-1/2 h-6 w-full -translate-y-1/2 appearance-none bg-transparent"
        style={{ zIndex: valueMin > max - max * 0.1 ? 5 : 3 }}
      />
      {/* Thumb max */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={valueMax}
        onChange={(e) => handleMax(Number(e.target.value))}
        aria-label={labelMax}
        className="dual-thumb pointer-events-none absolute top-1/2 h-6 w-full -translate-y-1/2 appearance-none bg-transparent"
        style={{ zIndex: 4 }}
      />
    </div>
  );
}

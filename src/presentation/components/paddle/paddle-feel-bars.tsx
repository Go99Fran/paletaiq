import type { PaddleFeel } from "@/domain/paddle/paddle-feel";

/**
 * Muestra las 4 sensaciones de juego (0–100) como barras. Las etiquetas llegan
 * traducidas desde el server para no acoplar el componente a i18n.
 */
export function PaddleFeelBars({
  feel,
  labels,
}: {
  feel: PaddleFeel;
  labels: { power: string; control: string; maneuver: string; tolerance: string };
}) {
  const rows: Array<{ key: keyof PaddleFeel; label: string }> = [
    { key: "power", label: labels.power },
    { key: "control", label: labels.control },
    { key: "maneuver", label: labels.maneuver },
    { key: "tolerance", label: labels.tolerance },
  ];

  return (
    <dl className="space-y-3">
      {rows.map(({ key, label }) => (
        <div key={key} className="grid grid-cols-[7rem_1fr] items-center gap-3">
          <dt className="text-sm text-muted">{label}</dt>
          <dd
            className="h-2.5 overflow-hidden rounded-full bg-border"
            role="meter"
            aria-valuenow={feel[key]}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={label}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-tertiary transition-all"
              style={{ width: `${feel[key]}%` }}
            />
          </dd>
        </div>
      ))}
    </dl>
  );
}

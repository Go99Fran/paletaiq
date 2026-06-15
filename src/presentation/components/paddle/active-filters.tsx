import { X } from "lucide-react";
import { Link } from "@/i18n/navigation";

export interface ActiveFilterChip {
  /** Clave del query param que representa este filtro. */
  key: string;
  /** Texto visible (ej. "Marca: Bullpadel"). */
  label: string;
}

/**
 * Chips de filtros activos. Cada chip lleva a la misma búsqueda sin ese filtro.
 * `buildHref` recibe la lista de claves a remover y devuelve la URL resultante.
 */
export function ActiveFilters({
  chips,
  buildHref,
  clearLabel,
}: {
  chips: ActiveFilterChip[];
  buildHref: (removeKeys: string[]) => string;
  clearLabel: string;
}) {
  if (chips.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={buildHref([chip.key])}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          {chip.label}
          <X size={13} aria-hidden />
        </Link>
      ))}
      {chips.length > 1 && (
        <Link
          href={buildHref(chips.map((c) => c.key))}
          className="text-xs font-medium text-muted underline-offset-2 transition-colors hover:text-danger hover:underline"
        >
          {clearLabel}
        </Link>
      )}
    </div>
  );
}

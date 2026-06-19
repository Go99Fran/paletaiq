"use client";

import type { ReactNode } from "react";
import { cn } from "./cn";

export interface ToggleChipProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * Chip seleccionable accesible: comunica el estado con aria-pressed (no solo color)
 * y es operable por teclado con focus-visible. Unifica los chips sueltos del buscador
 * que reimplementaban estas clases a mano sin a11y.
 */
export function ToggleChip({ active, onClick, children, className }: ToggleChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-sm font-medium transition-all duration-200 active:scale-95",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        active
          ? "bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-sm"
          : "glass text-text hover:border-primary/50 hover:text-primary",
        className,
      )}
    >
      {children}
    </button>
  );
}

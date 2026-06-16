"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/presentation/components/ui";

/**
 * Inclina sutilmente su contenido siguiendo el puntero (efecto 3D), solo en
 * dispositivos con hover real (desktop). En touch/mobile no hace nada, y respeta
 * prefers-reduced-motion. El movimiento es leve (máx ~6°) para no marear.
 */
export function Tilt({
  children,
  className,
  max = 6,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function canTilt() {
    if (typeof window === "undefined") return false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    // Solo donde hay hover fino (mouse), no en touch.
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || !canTilt()) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(800px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg)`;
  }

  function reset() {
    const el = ref.current;
    if (el) el.style.transform = "";
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className={cn("transition-transform duration-200 ease-out will-change-transform", className)}
    >
      {children}
    </div>
  );
}

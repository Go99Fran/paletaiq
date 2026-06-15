"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/presentation/components/ui";

type RevealPreset = "standard" | "soft" | "snap";

/**
 * Anima la entrada de su contenido al aparecer en viewport (una sola vez).
 *
 * Regla de oro: el contenido es VISIBLE por defecto y nunca se oculta vía estilos
 * que dependan de JS. La animación es puro adorno aditivo — si el JS no corre
 * (SSR, sin JS, crawler, hidration lenta) el contenido se ve igual, sin animar.
 *
 * `instant` (default false): para contenido above-the-fold (hero). Anima apenas
 * se renderiza, sin esperar scroll ni IntersectionObserver.
 */
export function Reveal({
  children,
  delay = 0,
  instant = false,
  preset = "standard",
  className,
}: {
  children: ReactNode;
  delay?: number;
  instant?: boolean;
  preset?: RevealPreset;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // El hero (instant) anima desde el primer render; el resto espera al observer.
  const [scrolledIn, setScrolledIn] = useState(false);

  useEffect(() => {
    if (instant) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setScrolledIn(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [instant]);

  const animate = instant || scrolledIn;
  const presetClass: Record<RevealPreset, string> = {
    standard: "animate-rise",
    soft: "animate-rise-soft",
    snap: "animate-rise-snap",
  };

  return (
    <div
      ref={ref}
      style={animate ? { animationDelay: `${delay}ms` } : undefined}
      className={cn(animate && presetClass[preset], className)}
    >
      {children}
    </div>
  );
}

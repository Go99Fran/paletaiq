"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/presentation/components/ui";

/**
 * Envoltorio del header que detecta el scroll vía IntersectionObserver sobre un
 * sentinel (no scroll listener), para profundizar la sombra y opacidad al bajar.
 * El contenido del header sigue siendo server-rendered y se pasa como children.
 */
export function HeaderShell({ children }: { children: ReactNode }) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { rootMargin: "0px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Sentinel: cuando sale del viewport (scroll > 10px), activamos el estado. */}
      <div ref={sentinelRef} className="absolute top-0 left-0 h-[10px] w-px" aria-hidden />
      <header
        className={cn(
          "sticky top-0 z-20 border-x-0 border-t-0 border-b backdrop-blur transition-all duration-300",
          scrolled
            ? "border-border bg-background/95 shadow-md supports-[backdrop-filter]:bg-background/85"
            : "border-transparent bg-background/70 shadow-none supports-[backdrop-filter]:bg-background/55",
        )}
      >
        {children}
      </header>
    </>
  );
}

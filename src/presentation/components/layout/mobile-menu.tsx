"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/presentation/components/ui";

// (cierre del menú al navegar se maneja en el onClick de cada link, no en un effect)

interface MobileMenuItem {
  href: "/paletas" | "/buscador" | "/comparar";
  label: string;
}

/**
 * Menú hamburguesa mobile (< sm). Despliega los links de navegación que en mobile
 * estaban ocultos, dejando inalcanzables Paletas y Buscador desde el header.
 * Los labels llegan ya traducidos desde el server (SiteHeader).
 */
export function MobileMenu({ items, menuLabel }: { items: MobileMenuItem[]; menuLabel: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Cerrar con Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={menuLabel}
        aria-expanded={open}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
      </button>

      {open && (
        <>
          {/* Backdrop para cerrar tocando fuera. */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-14 z-30 bg-background/40 backdrop-blur-sm"
          />
          <nav className="absolute left-0 right-0 top-14 z-40 border-b border-border bg-background shadow-md">
            <ul className="mx-auto flex max-w-6xl flex-col px-4 py-2">
              {items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "block rounded-lg px-3 py-3 text-base transition-colors hover:bg-surface",
                        active ? "font-semibold text-primary" : "text-text",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}

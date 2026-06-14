"use client";

import { useLocale } from "next-intl";
import { Languages } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/** Alterna entre los locales disponibles preservando la ruta actual. */
export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const other = routing.locales.find((l) => l !== locale) ?? locale;

  return (
    <button
      type="button"
      onClick={() => router.replace(pathname, { locale: other })}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-muted transition-colors hover:text-text"
      aria-label={`Switch to ${other.toUpperCase()}`}
    >
      <Languages size={15} aria-hidden />
      {other.toUpperCase()}
    </button>
  );
}

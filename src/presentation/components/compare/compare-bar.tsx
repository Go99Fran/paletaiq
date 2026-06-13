"use client";

import { useTranslations } from "next-intl";
import { GitCompareArrows, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/presentation/components/ui";
import { useCompare } from "./use-compare";

/** Barra flotante con la selección actual; aparece cuando hay al menos una paleta elegida. */
export function CompareBar() {
  const t = useTranslations("compare");
  const { slugs, clear } = useCompare();

  if (slugs.length === 0) return null;

  return (
    <div className="glass animate-rise fixed inset-x-0 bottom-4 z-30 mx-auto flex w-fit items-center gap-3 rounded-full px-5 py-2">
      <span className="text-sm text-muted">{t("barText", { count: slugs.length })}</span>
      <Link href={`/comparar?p=${slugs.join(",")}`}>
        <Button size="sm">
          <GitCompareArrows size={14} aria-hidden />
          {t("barCompare")}
        </Button>
      </Link>
      <Button variant="ghost" size="sm" onClick={clear} aria-label={t("barClear")}>
        <X size={14} aria-hidden />
      </Button>
    </div>
  );
}

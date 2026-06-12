"use client";

import { useTranslations } from "next-intl";
import { GitCompareArrows, Check } from "lucide-react";
import { Button } from "@/presentation/components/ui";
import { useCompare } from "./use-compare";

export function CompareToggle({ slug }: { slug: string }) {
  const t = useTranslations("paddles");
  const { slugs, toggle } = useCompare();
  const selected = slugs.includes(slug);

  return (
    <Button
      variant={selected ? "secondary" : "ghost"}
      size="sm"
      onClick={() => toggle(slug)}
      aria-pressed={selected}
    >
      {selected ? <Check size={14} aria-hidden /> : <GitCompareArrows size={14} aria-hidden />}
      {selected ? t("removeCompare") : t("addCompare")}
    </Button>
  );
}

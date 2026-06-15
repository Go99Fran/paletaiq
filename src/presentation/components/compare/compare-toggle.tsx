"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { GitCompareArrows, Check } from "lucide-react";
import { MAX_COMPARE } from "@/config";
import { Button } from "@/presentation/components/ui";
import { useCompare } from "./use-compare";

export function CompareToggle({ slug }: { slug: string }) {
  const t = useTranslations("paddles");
  const tCompare = useTranslations("compare");
  const { slugs, toggle } = useCompare();
  const selected = slugs.includes(slug);
  const [showLimit, setShowLimit] = useState(false);

  function onToggle() {
    const result = toggle(slug);
    if (result === "limit-reached") {
      setShowLimit(true);
      window.setTimeout(() => setShowLimit(false), 1800);
    }
  }

  return (
    <div className="space-y-1">
      <Button
        variant={selected ? "secondary" : "ghost"}
        size="sm"
        onClick={onToggle}
        aria-pressed={selected}
        aria-describedby={showLimit ? `compare-limit-${slug}` : undefined}
      >
        {selected ? <Check size={14} aria-hidden /> : <GitCompareArrows size={14} aria-hidden />}
        {selected ? t("removeCompare") : t("addCompare")}
      </Button>
      {showLimit && (
        <p id={`compare-limit-${slug}`} className="text-xs text-danger">
          {tCompare("limitReached", { max: MAX_COMPARE })}
        </p>
      )}
    </div>
  );
}

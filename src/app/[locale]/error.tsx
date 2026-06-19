"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Button, Heading } from "@/presentation/components/ui";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <AlertTriangle size={48} aria-hidden className="text-danger" />
      <Heading level={1} className="mt-4 text-2xl">
        {t("errorTitle")}
      </Heading>
      <p className="mt-2 text-muted">{t("errorText")}</p>
      <Button className="mt-6" onClick={reset}>
        {t("errorCta")}
      </Button>
    </div>
  );
}

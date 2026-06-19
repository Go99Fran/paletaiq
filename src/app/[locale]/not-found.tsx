import { getTranslations } from "next-intl/server";
import { SearchX } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Heading } from "@/presentation/components/ui";

export default async function LocaleNotFound() {
  const t = await getTranslations("errors");

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <SearchX size={48} aria-hidden className="text-muted" />
      <Heading level={1} className="mt-4 text-2xl">
        {t("notFoundTitle")}
      </Heading>
      <p className="mt-2 text-muted">{t("notFoundText")}</p>
      <Link
        href="/paletas"
        className="btn-energy mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover px-4 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/30 transition hover:brightness-110"
      >
        {t("notFoundCta")}
      </Link>
    </div>
  );
}

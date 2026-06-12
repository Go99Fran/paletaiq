import { getTranslations, setRequestLocale } from "next-intl/server";
import { Heading } from "@/presentation/components/ui";
import { FinderChat } from "@/presentation/components/finder/finder-chat";

export default async function FinderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("finder");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="text-center">
        <Heading level={1}>{t("title")}</Heading>
        <p className="mt-2 text-muted">{t("subtitle")}</p>
      </div>
      <div className="mt-8">
        <FinderChat />
      </div>
    </div>
  );
}

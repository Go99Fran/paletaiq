import { getTranslations, setRequestLocale } from "next-intl/server";
import { brandRepository } from "@/application/factory";
import { Heading } from "@/presentation/components/ui";
import { FinderChat } from "@/presentation/components/finder/finder-chat";

export default async function FinderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, brands] = await Promise.all([getTranslations("finder"), brandRepository.listAll()]);
  const brandOptions = brands.map((b) => ({ slug: b.slug, name: b.name }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="text-center">
        <Heading level={1} className="text-gradient">
          {t("title")}
        </Heading>
        <p className="mt-2 text-muted">{t("subtitle")}</p>
      </div>
      <div className="mt-8">
        <FinderChat brands={brandOptions} />
      </div>
    </div>
  );
}

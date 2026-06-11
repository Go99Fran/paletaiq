import { getTranslations, setRequestLocale } from "next-intl/server";
import { GitCompareArrows, Sparkles, CircleDollarSign } from "lucide-react";
import { Button, Card, CardBody, Heading } from "@/presentation/components/ui";
import { Link } from "@/i18n/navigation";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  const features = [
    {
      icon: GitCompareArrows,
      title: t("featureCompareTitle"),
      text: t("featureCompareText"),
    },
    {
      icon: Sparkles,
      title: t("featureFinderTitle"),
      text: t("featureFinderText"),
    },
    {
      icon: CircleDollarSign,
      title: t("featurePricesTitle"),
      text: t("featurePricesText"),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <section className="mx-auto max-w-2xl text-center">
        <Heading level={1}>{t("heroTitle")}</Heading>
        <p className="mt-4 text-lg text-muted">{t("heroSubtitle")}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/">
            <Button size="lg">
              <Sparkles size={18} aria-hidden />
              {t("ctaFinder")}
            </Button>
          </Link>
          <Link href="/">
            <Button size="lg" variant="ghost">
              {t("ctaCompare")}
            </Button>
          </Link>
        </div>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardBody>
              <feature.icon size={24} aria-hidden className="text-primary" />
              <Heading level={4} className="mt-3">
                {feature.title}
              </Heading>
              <p className="mt-1 text-sm text-muted">{feature.text}</p>
            </CardBody>
          </Card>
        ))}
      </section>
    </div>
  );
}

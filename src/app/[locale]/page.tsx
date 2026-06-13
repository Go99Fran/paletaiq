import { getTranslations, setRequestLocale } from "next-intl/server";
import { GitCompareArrows, Sparkles, CircleDollarSign, ArrowRight } from "lucide-react";
import { Button, Card, CardBody, Heading } from "@/presentation/components/ui";
import { Reveal } from "@/presentation/components/fx/reveal";
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
    { icon: GitCompareArrows, title: t("featureCompareTitle"), text: t("featureCompareText") },
    { icon: Sparkles, title: t("featureFinderTitle"), text: t("featureFinderText") },
    { icon: CircleDollarSign, title: t("featurePricesTitle"), text: t("featurePricesText") },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-20">
      <section className="mx-auto max-w-3xl text-center">
        <Reveal instant>
          <span className="glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-primary">
            <Sparkles size={15} aria-hidden />
            {t("featureFinderTitle")} · IA
          </span>
        </Reveal>
        <Reveal instant delay={80}>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
            <span className="text-gradient">{t("heroTitle")}</span>
          </h1>
        </Reveal>
        <Reveal instant delay={160}>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">{t("heroSubtitle")}</p>
        </Reveal>
        <Reveal instant delay={240}>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/buscador">
              <Button size="lg" className="group">
                <Sparkles size={18} aria-hidden />
                {t("ctaFinder")}
                <ArrowRight
                  size={16}
                  aria-hidden
                  className="transition-transform group-hover:translate-x-1"
                />
              </Button>
            </Link>
            <Link href="/paletas">
              <Button size="lg" variant="glass">
                {t("ctaCompare")}
              </Button>
            </Link>
          </div>
        </Reveal>
      </section>

      <section className="mt-24 grid gap-5 sm:grid-cols-3">
        {features.map((feature, i) => (
          <Reveal key={feature.title} delay={i * 120}>
            <Card interactive className="h-full">
              <CardBody>
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-tertiary/15 text-primary">
                  <feature.icon size={24} aria-hidden />
                </span>
                <Heading level={4} className="mt-4">
                  {feature.title}
                </Heading>
                <p className="mt-2 text-sm leading-relaxed text-muted">{feature.text}</p>
              </CardBody>
            </Card>
          </Reveal>
        ))}
      </section>
    </div>
  );
}

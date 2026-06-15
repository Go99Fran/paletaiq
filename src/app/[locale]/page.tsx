import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  GitCompareArrows,
  Sparkles,
  CircleDollarSign,
  ArrowRight,
  ShieldCheck,
  Gauge,
  Radar,
} from "lucide-react";
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

  const trustPoints = [
    { icon: ShieldCheck, text: t("trust1") },
    { icon: Gauge, text: t("trust2") },
    { icon: Radar, text: t("trust3") },
  ];

  const steps = [
    { title: t("step1Title"), text: t("step1Text") },
    { title: t("step2Title"), text: t("step2Text") },
    { title: t("step3Title"), text: t("step3Text") },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-20">
      <section className="mx-auto max-w-3xl text-center">
        <Reveal instant preset="soft">
          <span className="glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-primary">
            <Sparkles size={15} aria-hidden />
            {t("heroEyebrow")}
          </span>
        </Reveal>
        <Reveal instant delay={70} preset="snap">
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
            <span className="text-gradient">{t("heroTitle")}</span>
          </h1>
        </Reveal>
        <Reveal instant delay={145} preset="soft">
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">{t("heroSubtitle")}</p>
        </Reveal>
        <Reveal instant delay={215} preset="soft">
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

        <Reveal instant delay={290} preset="soft">
          <div className="mt-8 grid gap-2 sm:grid-cols-3">
            {trustPoints.map((point) => (
              <div key={point.text} className="glass animate-rise-soft rounded-xl px-3 py-2 text-left sm:text-center">
                <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
                  <point.icon size={14} aria-hidden className="text-primary" />
                  {point.text}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="mt-24 grid gap-5 sm:grid-cols-3">
        {features.map((feature, i) => (
          <Reveal key={feature.title} delay={i * 120} preset="soft">
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

      <section className="mt-20 grid gap-4 sm:grid-cols-3">
        {steps.map((step, i) => (
          <Reveal key={step.title} delay={i * 100} preset="snap">
            <Card className="h-full">
              <CardBody>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {t("stepLabel", { index: i + 1 })}
                </p>
                <Heading level={4} className="mt-2">
                  {step.title}
                </Heading>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
              </CardBody>
            </Card>
          </Reveal>
        ))}
      </section>

      <Reveal delay={140} preset="soft">
        <section className="glass mt-16 rounded-2xl px-6 py-8 text-center sm:px-10">
          <Heading level={2}>{t("finalCtaTitle")}</Heading>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted sm:text-base">{t("finalCtaText")}</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
            <Link href="/comparar">
              <Button size="lg" variant="glass">
                {t("ctaCompareNow")}
              </Button>
            </Link>
          </div>
        </section>
      </Reveal>
    </div>
  );
}

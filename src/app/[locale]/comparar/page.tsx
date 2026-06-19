import Image from "next/image";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { GitCompareArrows, ImageOff, MousePointerClick, Scale, Sparkles } from "lucide-react";
import { comparePaddles, listPaddles } from "@/application/factory";
import { Link } from "@/i18n/navigation";
import { Button, Card, CardBody, Heading } from "@/presentation/components/ui";
import { PaddleCard } from "@/presentation/components/paddle/paddle-card";
import { formatPrice } from "@/presentation/lib/format";

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { p } = await searchParams;

  const slugs = (p ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const [t, tEnums, currentLocale, paddles] = await Promise.all([
    getTranslations("compare"),
    getTranslations("enums"),
    getLocale(),
    comparePaddles.execute(slugs),
  ]);
  const tDetail = await getTranslations("detail");

  if (paddles.length === 0) {
    // Empty state con vida: explicamos cómo funciona y ofrecemos paletas populares
    // para empezar a comparar de una, en vez de una pantalla muerta.
    const { items: popular } = await listPaddles.execute({ page: 1, pageSize: 4 });
    const howSteps = [
      { icon: MousePointerClick, text: t("howStep1") },
      { icon: GitCompareArrows, text: t("howStep2") },
      { icon: Scale, text: t("howStep3") },
    ];

    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="text-center">
          <span className="glass mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl text-primary">
            <GitCompareArrows size={26} aria-hidden />
          </span>
          <Heading level={1} className="text-gradient">
            {t("title")}
          </Heading>
          <p className="mx-auto mt-3 max-w-xl text-muted">{t("emptyRich")}</p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {howSteps.map((s, i) => (
            <Card key={i} className="h-full">
              <CardBody className="flex flex-col items-center gap-2 text-center">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-tertiary/15 text-primary">
                  <s.icon size={20} aria-hidden />
                </span>
                <p className="text-sm text-text">{s.text}</p>
              </CardBody>
            </Card>
          ))}
        </div>

        {popular.length > 0 && (
          <div className="mt-12">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={16} aria-hidden className="text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                {t("emptyPopularTitle")}
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {popular.map((paddle) => (
                <PaddleCard key={paddle.id} paddle={paddle} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 text-center">
          <Link href="/paletas" className="inline-block">
            <Button size="lg">{t("goToList")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const rows: Array<{ label: string; render: (p: (typeof paddles)[number]) => string | null }> = [
    { label: tDetail("brand"), render: (p) => p.brandName },
    { label: tDetail("year"), render: (p) => (p.year ? String(p.year) : null) },
    { label: tDetail("shape"), render: (p) => (p.shape ? tEnums(`shape.${p.shape}`) : null) },
    { label: tDetail("balance"), render: (p) => (p.balance ? tEnums(`balance.${p.balance}`) : null) },
    {
      label: tDetail("weight"),
      render: (p) => (p.weightMin && p.weightMax ? `${p.weightMin}–${p.weightMax} g` : null),
    },
    { label: tDetail("core"), render: (p) => p.coreMaterial },
    { label: tDetail("face"), render: (p) => p.faceMaterial },
    { label: tDetail("frame"), render: (p) => p.frameMaterial },
    { label: tDetail("surface"), render: (p) => (p.surface ? tEnums(`surface.${p.surface}`) : null) },
    { label: tDetail("hardness"), render: (p) => (p.hardness ? tEnums(`hardness.${p.hardness}`) : null) },
    { label: tDetail("thickness"), render: (p) => (p.thickness ? `${p.thickness} mm` : null) },
    { label: tDetail("level"), render: (p) => (p.level ? tEnums(`level.${p.level}`) : null) },
    { label: tDetail("playStyle"), render: (p) => (p.playStyle ? tEnums(`playStyle.${p.playStyle}`) : null) },
    {
      label: t("bestPrice"),
      render: (p) =>
        p.bestPrice !== null
          ? formatPrice(p.bestPrice, p.bestPriceCurrency ?? "ARS", currentLocale)
          : null,
    },
  ];

  // Una fila "difiere" si hay al menos dos valores distintos entre las paletas
  // (ignorando los vacíos). Con una sola paleta nunca hay diferencia. Server-side.
  const rowDiffers = (render: (typeof rows)[number]["render"]): boolean => {
    if (paddles.length < 2) return false;
    const values = paddles.map((p) => render(p));
    const present = values.filter((v) => v !== null && v !== "");
    return new Set(present).size > 1;
  };
  const differs = rows.map((row) => rowDiffers(row.render));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Heading level={1} className="text-gradient">
        {t("title")}
      </Heading>
      <p className="mt-1 text-muted">{t("subtitle")}</p>

      {/* Scroll propio del comparador (vertical + horizontal). El thead queda sticky
          relativo a ESTE contenedor (top-0), no a la página: así la cabecera de paletas
          nunca tapa la primera fila del cuerpo (antes el doble-sticky cortaba "Año"). */}
      <div className="relative mt-4 -mx-4 sm:mx-0">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-40 w-6 bg-gradient-to-r from-background to-transparent sm:hidden" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-40 w-6 bg-gradient-to-l from-background to-transparent sm:hidden" />
        <div className="max-h-[75vh] overflow-auto px-4 sm:rounded-2xl sm:border sm:border-border sm:px-0">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">{t("tableCaption")}</caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 top-0 z-30 w-20 min-w-[5.25rem] bg-background sm:w-28"
                />
                {paddles.map((paddle) => (
                  <th
                    key={paddle.id}
                    scope="col"
                    className="sticky top-0 z-20 min-w-[8.5rem] border-b border-border bg-background/95 px-2 pb-4 pt-3 text-center align-bottom backdrop-blur sm:px-3"
                  >
                  <Link href={`/paletas/${paddle.slug}`} className="group inline-block">
                    <div className="relative mx-auto h-24 w-24 sm:h-32 sm:w-32">
                      {paddle.imageUrl ? (
                        <Image
                          src={paddle.imageUrl}
                          alt={paddle.name}
                          fill
                          sizes="128px"
                          className="object-contain"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-muted">
                          <ImageOff size={28} aria-hidden />
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-wide text-muted">{paddle.brandName}</p>
                    <p className="font-semibold text-text transition-colors group-hover:text-primary">
                      {paddle.name}
                    </p>
                  </Link>
                </th>
              ))}
            </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={row.label} className="border-b border-border last:border-0">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-background py-2.5 pr-2 text-left text-xs font-medium text-muted sm:pr-3 sm:text-sm"
                  >
                    {row.label}
                  </th>
                  {paddles.map((paddle) => (
                    <td
                      key={paddle.id}
                      className={
                        differs[rowIndex]
                          ? "min-w-[8.5rem] bg-primary/10 px-2 py-2.5 text-center font-medium text-text sm:px-3"
                          : "min-w-[8.5rem] px-2 py-2.5 text-center text-text sm:px-3"
                      }
                    >
                      {row.render(paddle) ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {paddles.length >= 2 && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted">
          <span className="inline-block h-3 w-3 rounded bg-primary/15" />
          {t("diffLegend")}
        </p>
      )}
    </div>
  );
}

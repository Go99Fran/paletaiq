import Image from "next/image";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { ImageOff } from "lucide-react";
import { comparePaddles } from "@/application/factory";
import { Link } from "@/i18n/navigation";
import { Button, Heading } from "@/presentation/components/ui";
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
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <Heading level={1}>{t("title")}</Heading>
        <p className="mt-4 text-muted">{t("empty")}</p>
        <Link href="/paletas" className="mt-6 inline-block">
          <Button>{t("goToList")}</Button>
        </Link>
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
    { label: tDetail("surface"), render: (p) => (p.surface ? tEnums(`surface.${p.surface}`) : null) },
    { label: tDetail("hardness"), render: (p) => (p.hardness ? tEnums(`hardness.${p.hardness}`) : null) },
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Heading level={1}>{t("title")}</Heading>
      <p className="mt-1 text-muted">{t("subtitle")}</p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-36 border-b border-border" />
              {paddles.map((paddle) => (
                <th key={paddle.id} className="border-b border-border px-3 pb-4 text-center align-bottom">
                  <Link href={`/paletas/${paddle.slug}`} className="group inline-block">
                    <div className="relative mx-auto h-32 w-32">
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
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-border last:border-0">
                <th className="py-2.5 pr-4 text-left font-medium text-muted">{row.label}</th>
                {paddles.map((paddle) => (
                  <td key={paddle.id} className="px-3 py-2.5 text-center text-text">
                    {row.render(paddle) ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

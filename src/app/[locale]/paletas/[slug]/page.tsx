import Image from "next/image";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ExternalLink, ImageOff } from "lucide-react";
import { getPaddleDetail } from "@/application/factory";
import { Link } from "@/i18n/navigation";
import { Badge, Card, CardBody, CardHeader, Heading, Tag } from "@/presentation/components/ui";
import { CompareToggle } from "@/presentation/components/compare/compare-toggle";
import { CompareBar } from "@/presentation/components/compare/compare-bar";
import { formatDate, formatPrice } from "@/presentation/lib/format";

export default async function PaddleDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [t, tEnums, tList, currentLocale, detail] = await Promise.all([
    getTranslations("detail"),
    getTranslations("enums"),
    getTranslations("paddles"),
    getLocale(),
    getPaddleDetail.execute(slug),
  ]);

  if (!detail) notFound();
  const { paddle, prices, history } = detail;

  const specs: Array<{ label: string; value: string | null }> = [
    { label: t("brand"), value: paddle.brandName },
    { label: t("year"), value: paddle.year ? String(paddle.year) : null },
    { label: t("shape"), value: paddle.shape ? tEnums(`shape.${paddle.shape}`) : null },
    { label: t("balance"), value: paddle.balance ? tEnums(`balance.${paddle.balance}`) : null },
    {
      label: t("weight"),
      value:
        paddle.weightMin && paddle.weightMax ? `${paddle.weightMin}–${paddle.weightMax} g` : null,
    },
    { label: t("core"), value: paddle.coreMaterial },
    { label: t("face"), value: paddle.faceMaterial },
    { label: t("frame"), value: paddle.frameMaterial },
    { label: t("surface"), value: paddle.surface ? tEnums(`surface.${paddle.surface}`) : null },
    { label: t("hardness"), value: paddle.hardness ? tEnums(`hardness.${paddle.hardness}`) : null },
    { label: t("level"), value: paddle.level ? tEnums(`level.${paddle.level}`) : null },
    { label: t("playStyle"), value: paddle.playStyle ? tEnums(`playStyle.${paddle.playStyle}`) : null },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link
        href="/paletas"
        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-text"
      >
        <ArrowLeft size={14} aria-hidden />
        {tList("title")}
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[2fr_3fr]">
        <Card className="flex h-fit items-center justify-center p-6">
          {paddle.imageUrl ? (
            <div className="relative h-80 w-full">
              <Image
                src={paddle.imageUrl}
                alt={paddle.name}
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-contain"
                priority
              />
            </div>
          ) : (
            <ImageOff size={48} aria-hidden className="my-24 text-muted" />
          )}
        </Card>

        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-muted">
            {paddle.brandName}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Heading level={1} className="text-2xl sm:text-3xl">
              {paddle.name}
            </Heading>
            <CompareToggle slug={paddle.slug} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {paddle.shape && <Tag>{tEnums(`shape.${paddle.shape}`)}</Tag>}
            {paddle.level && <Tag>{tEnums(`level.${paddle.level}`)}</Tag>}
            {paddle.playStyle && <Tag>{tEnums(`playStyle.${paddle.playStyle}`)}</Tag>}
          </div>

          <Card className="mt-6">
            <CardHeader>
              <Heading level={3}>{t("specs")}</Heading>
            </CardHeader>
            <CardBody>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                {specs
                  .filter((s) => s.value !== null)
                  .map((s) => (
                    <div key={s.label} className="flex justify-between gap-4 border-b border-border py-1.5 text-sm last:border-0 sm:[&:nth-last-child(2)]:border-0">
                      <dt className="text-muted">{s.label}</dt>
                      <dd className="text-right font-medium text-text">{s.value}</dd>
                    </div>
                  ))}
              </dl>
            </CardBody>
          </Card>
        </div>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <Heading level={3}>{t("prices")}</Heading>
        </CardHeader>
        <CardBody>
          {prices.length === 0 ? (
            <p className="text-sm text-muted">{t("noPrices")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="py-2 pr-4 font-medium">{t("store")}</th>
                    <th className="py-2 pr-4 font-medium">{t("price")}</th>
                    <th className="py-2 pr-4 font-medium">{t("stock")}</th>
                    <th className="py-2 pr-4 font-medium">{t("updated")}</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {prices.map((p) => (
                    <tr key={p.storeId} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4 text-text">{p.storeName}</td>
                      <td className="py-2 pr-4 font-semibold text-text">
                        {formatPrice(p.price, p.currency, currentLocale)}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant={p.inStock ? "success" : "danger"}>
                          {p.inStock ? t("inStock") : t("outOfStock")}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-muted">
                        {formatDate(new Date(p.scrapedAt), currentLocale)}
                      </td>
                      <td className="py-2 text-right">
                        {p.productUrl && (
                          <a
                            href={p.productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            {t("viewStore")}
                            <ExternalLink size={13} aria-hidden />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {history.length > 1 && (
        <Card className="mt-8">
          <CardHeader>
            <Heading level={3}>{t("history")}</Heading>
          </CardHeader>
          <CardBody>
            <ul className="space-y-1 text-sm">
              {history.map((point, i) => (
                <li key={i} className="flex justify-between border-b border-border py-1 last:border-0">
                  <span className="text-muted">
                    {formatDate(new Date(point.scrapedAt), currentLocale)} · {point.storeName}
                  </span>
                  <span className="font-medium text-text">
                    {formatPrice(point.price, point.currency, currentLocale)}
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {paddle.description && (
        <Card className="mt-8">
          <CardHeader>
            <Heading level={3}>{t("description")}</Heading>
          </CardHeader>
          <CardBody>
            <p className="whitespace-pre-line text-sm leading-relaxed text-text">
              {paddle.description}
            </p>
          </CardBody>
        </Card>
      )}

      <CompareBar />
    </div>
  );
}

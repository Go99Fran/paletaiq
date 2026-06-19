import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Check, ExternalLink, ImageOff } from "lucide-react";
import type { PaddleListItem } from "@/domain/paddle/paddle.entity";
import { Link } from "@/i18n/navigation";
import { Card, CardBody, Tag } from "@/presentation/components/ui";
import { formatPrice } from "@/presentation/lib/format";
import { CompareToggle } from "@/presentation/components/compare/compare-toggle";

export async function PaddleCard({ paddle }: { paddle: PaddleListItem }) {
  const [t, tEnums, locale] = await Promise.all([
    getTranslations("paddles"),
    getTranslations("enums"),
    getLocale(),
  ]);

  return (
    <Card interactive className="group flex flex-col overflow-hidden">
      <Link
        href={`/paletas/${paddle.slug}`}
        className="relative flex h-44 items-center justify-center bg-gradient-to-br from-white/40 to-transparent"
      >
        {/* storeCount viene del repo contando solo tiendas con in_stock=TRUE,
            así que > 0 = hay stock real en al menos una tienda. */}
        {paddle.storeCount > 0 && (
          <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-xs font-semibold text-success">
            <Check size={11} aria-hidden strokeWidth={3} />
            {t("inStock")}
          </span>
        )}
        {paddle.imageUrl ? (
          <Image
            src={paddle.imageUrl}
            alt={paddle.name}
            fill
            sizes="(max-width: 640px) 100vw, 25vw"
            className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <ImageOff size={32} aria-hidden className="text-muted" />
        )}
      </Link>
      <CardBody className="flex flex-1 flex-col gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {paddle.brandName}
          </p>
          <Link
            href={`/paletas/${paddle.slug}`}
            className="font-semibold text-text transition-colors hover:text-primary"
          >
            {paddle.name}
          </Link>
        </div>
        <div className="flex flex-wrap gap-1">
          {paddle.shape && <Tag>{tEnums(`shape.${paddle.shape}`)}</Tag>}
          {paddle.level && <Tag>{tEnums(`level.${paddle.level}`)}</Tag>}
          {paddle.playStyle && <Tag>{tEnums(`playStyle.${paddle.playStyle}`)}</Tag>}
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="min-w-0">
            {paddle.bestPrice !== null ? (
              <>
                <p className="text-xl font-extrabold tracking-tight text-primary">
                  {formatPrice(paddle.bestPrice, paddle.bestPriceCurrency ?? "ARS", locale)}
                </p>
                {paddle.bestStoreUrl && paddle.bestStoreName ? (
                  <a
                    href={paddle.bestStoreUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex max-w-full items-center gap-1 text-xs text-muted transition-colors hover:text-primary"
                  >
                    <span className="truncate">{t("bestPriceAt", { store: paddle.bestStoreName })}</span>
                    <ExternalLink size={11} aria-hidden className="shrink-0" />
                  </a>
                ) : (
                  <p className="text-xs text-muted">{t("storeCount", { count: paddle.storeCount })}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">{t("noPrice")}</p>
            )}
          </div>
          <CompareToggle slug={paddle.slug} />
        </div>
      </CardBody>
    </Card>
  );
}

import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { ImageOff } from "lucide-react";
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
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <Link
        href={`/paletas/${paddle.slug}`}
        className="relative flex h-44 items-center justify-center bg-surface"
      >
        {paddle.imageUrl ? (
          <Image
            src={paddle.imageUrl}
            alt={paddle.name}
            fill
            sizes="(max-width: 640px) 100vw, 25vw"
            className="object-contain p-3"
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
          <div>
            {paddle.bestPrice !== null ? (
              <>
                <p className="text-lg font-bold text-text">
                  {formatPrice(paddle.bestPrice, paddle.bestPriceCurrency ?? "ARS", locale)}
                </p>
                <p className="text-xs text-muted">{t("storeCount", { count: paddle.storeCount })}</p>
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

import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import {
  PADDLE_LEVELS,
  PADDLE_SHAPES,
  PLAY_STYLES,
  type PaddleLevel,
  type PaddleShape,
  type PlayStyle,
} from "@/domain/paddle/paddle.entity";
import { brandRepository, listPaddles } from "@/application/factory";
import { Link } from "@/i18n/navigation";
import { Button, Heading, Input, Select } from "@/presentation/components/ui";
import { PaddleCard } from "@/presentation/components/paddle/paddle-card";
import { CompareBar } from "@/presentation/components/compare/compare-bar";

const PAGE_SIZE = 24;

type SearchParams = { [key: string]: string | string[] | undefined };

function asString(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: string | string[] | undefined): number | undefined {
  const s = asString(value);
  if (s === undefined) return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function asEnum<T extends string>(value: string | string[] | undefined, options: T[]): T | undefined {
  const s = asString(value);
  return options.includes(s as T) ? (s as T) : undefined;
}

export default async function PaddlesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const [t, tEnums, tCommon, brands] = await Promise.all([
    getTranslations("paddles"),
    getTranslations("enums"),
    getTranslations("common"),
    brandRepository.listAll(),
  ]);

  const page = Math.max(1, asNumber(sp.page) ?? 1);
  const filters = {
    brandSlug: asString(sp.marca),
    shape: asEnum<PaddleShape>(sp.forma, PADDLE_SHAPES),
    level: asEnum<PaddleLevel>(sp.nivel, PADDLE_LEVELS),
    playStyle: asEnum<PlayStyle>(sp.estilo, PLAY_STYLES),
    priceMin: asNumber(sp.precio_min),
    priceMax: asNumber(sp.precio_max),
    search: asString(sp.q),
    page,
    pageSize: PAGE_SIZE,
  };

  const { items, total } = await listPaddles.execute(filters);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (target: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) {
      if (typeof value === "string" && value.length > 0 && key !== "page") query.set(key, value);
    }
    if (target > 1) query.set("page", String(target));
    const qs = query.toString();
    return `/paletas${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Heading level={1} className="text-gradient">
        {t("title")}
      </Heading>
      <p className="mt-1 text-muted">{t("subtitle", { count: total })}</p>

      <form method="get" className="glass mt-6 grid grid-cols-2 gap-3 rounded-2xl p-4 sm:grid-cols-3 lg:grid-cols-7">
        <Input name="q" defaultValue={filters.search ?? ""} placeholder={t("searchPlaceholder")} className="col-span-2 sm:col-span-3 lg:col-span-2" />
        <Select
          name="marca"
          defaultValue={filters.brandSlug ?? ""}
          placeholder={t("filterBrand")}
          options={brands.map((b) => ({ value: b.slug, label: b.name }))}
        />
        <Select
          name="forma"
          defaultValue={filters.shape ?? ""}
          placeholder={t("filterShape")}
          options={PADDLE_SHAPES.map((s) => ({ value: s, label: tEnums(`shape.${s}`) }))}
        />
        <Select
          name="nivel"
          defaultValue={filters.level ?? ""}
          placeholder={t("filterLevel")}
          options={PADDLE_LEVELS.map((l) => ({ value: l, label: tEnums(`level.${l}`) }))}
        />
        <Select
          name="estilo"
          defaultValue={filters.playStyle ?? ""}
          placeholder={t("filterStyle")}
          options={PLAY_STYLES.map((s) => ({ value: s, label: tEnums(`playStyle.${s}`) }))}
        />
        <div className="col-span-2 flex gap-2 sm:col-span-3 lg:col-span-1">
          <Input
            name="precio_min"
            type="number"
            min={0}
            defaultValue={filters.priceMin ?? ""}
            placeholder={t("filterPriceMin")}
          />
          <Input
            name="precio_max"
            type="number"
            min={0}
            defaultValue={filters.priceMax ?? ""}
            placeholder={t("filterPriceMax")}
          />
        </div>
        <Button type="submit" className="col-span-2 sm:col-span-3 lg:col-span-7 lg:w-fit lg:justify-self-end">
          <SlidersHorizontal size={16} aria-hidden />
          {t("applyFilters")}
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="mt-12 text-center text-muted">{tCommon("noResults")}</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((paddle) => (
            <PaddleCard key={paddle.id} paddle={paddle} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-4">
          {page > 1 && (
            <Link href={pageHref(page - 1)} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <ChevronLeft size={16} aria-hidden />
              {t("prev")}
            </Link>
          )}
          <span className="text-sm text-muted">{t("page", { page, total: totalPages })}</span>
          {page < totalPages && (
            <Link href={pageHref(page + 1)} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              {t("next")}
              <ChevronRight size={16} aria-hidden />
            </Link>
          )}
        </nav>
      )}

      <CompareBar />
    </div>
  );
}

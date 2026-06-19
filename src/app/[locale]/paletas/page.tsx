import { getTranslations, setRequestLocale } from "next-intl/server";
import { Sparkles, SlidersHorizontal } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  PADDLE_BALANCES,
  PADDLE_HARDNESSES,
  PADDLE_LEVELS,
  PADDLE_SHAPES,
  PLAY_STYLES,
  type PaddleBalance,
  type PaddleHardness,
  type PaddleLevel,
  type PaddleShape,
  type PlayStyle,
} from "@/domain/paddle/paddle.entity";
import { brandRepository, listPaddles } from "@/application/factory";
import { Button, Heading, Input, Select, Pagination } from "@/presentation/components/ui";
import { PaddleCard } from "@/presentation/components/paddle/paddle-card";
import { ActiveFilters, type ActiveFilterChip } from "@/presentation/components/paddle/active-filters";
import { CompareBar } from "@/presentation/components/compare/compare-bar";

const PAGE_SIZE = 50;

// ISR: el catálogo cambia poco (scraping ~2x/semana). Revalidamos cada hora para
// bajar carga de DB y mejorar TTFB; el admin revalida on-demand tras editar/scrapear.
export const revalidate = 3600;

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
    balance: asEnum<PaddleBalance>(sp.balance, PADDLE_BALANCES),
    hardness: asEnum<PaddleHardness>(sp.dureza, PADDLE_HARDNESSES),
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

  // URL sin uno o varios filtros (para los chips y el "limpiar").
  const hrefWithout = (removeKeys: string[]) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) {
      if (key === "page" || removeKeys.includes(key)) continue;
      if (typeof value === "string" && value.length > 0) query.set(key, value);
    }
    const qs = query.toString();
    return `/paletas${qs ? `?${qs}` : ""}`;
  };

  // Chips de filtros activos.
  const chips: ActiveFilterChip[] = [];
  if (filters.search) chips.push({ key: "q", label: `"${filters.search}"` });
  if (filters.brandSlug) {
    const brand = brands.find((b) => b.slug === filters.brandSlug);
    chips.push({ key: "marca", label: `${t("filterBrand")}: ${brand?.name ?? filters.brandSlug}` });
  }
  if (filters.shape) chips.push({ key: "forma", label: tEnums(`shape.${filters.shape}`) });
  if (filters.level) chips.push({ key: "nivel", label: tEnums(`level.${filters.level}`) });
  if (filters.playStyle) chips.push({ key: "estilo", label: tEnums(`playStyle.${filters.playStyle}`) });
  if (filters.balance) chips.push({ key: "balance", label: tEnums(`balance.${filters.balance}`) });
  if (filters.hardness) chips.push({ key: "dureza", label: tEnums(`hardness.${filters.hardness}`) });
  if (filters.priceMin !== undefined) chips.push({ key: "precio_min", label: `≥ ${filters.priceMin}` });
  if (filters.priceMax !== undefined) chips.push({ key: "precio_max", label: `≤ ${filters.priceMax}` });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Heading level={1} className="text-gradient">
        {t("title")}
      </Heading>
      <p className="mt-1 text-muted">{t("subtitle", { count: total })}</p>

      {/* Atajo al buscador para quien no sabe qué filtros tocar (B19). */}
      <Link
        href="/buscador"
        className="glass mt-6 flex items-center gap-3 rounded-2xl border border-primary/30 px-4 py-3 transition-colors hover:border-primary/60"
      >
        <Sparkles size={18} aria-hidden className="shrink-0 text-primary" />
        <span className="text-sm text-text">
          <span className="font-semibold">{t("helpBannerTitle")}</span>{" "}
          <span className="text-muted">{t("helpBannerText")}</span>
        </span>
      </Link>

      <form method="get" className="glass mt-4 grid grid-cols-2 gap-3 rounded-2xl p-4 sm:grid-cols-3 lg:grid-cols-9">
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
        <Select
          name="balance"
          defaultValue={filters.balance ?? ""}
          placeholder={t("filterBalance")}
          options={PADDLE_BALANCES.map((b) => ({ value: b, label: tEnums(`balance.${b}`) }))}
        />
        <Select
          name="dureza"
          defaultValue={filters.hardness ?? ""}
          placeholder={t("filterHardness")}
          options={PADDLE_HARDNESSES.map((h) => ({ value: h, label: tEnums(`hardness.${h}`) }))}
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
        <Button type="submit" className="col-span-2 sm:col-span-3 lg:col-span-9 lg:w-fit lg:justify-self-end">
          <SlidersHorizontal size={16} aria-hidden />
          {t("applyFilters")}
        </Button>
      </form>

      <ActiveFilters chips={chips} buildHref={hrefWithout} clearLabel={tCommon("clear")} />

      {items.length === 0 ? (
        <p className="mt-12 text-center text-muted">{tCommon("noResults")}</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((paddle) => (
              <PaddleCard key={paddle.id} paddle={paddle} />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            hrefFor={pageHref}
            labels={{ prev: t("prev"), next: t("next"), nav: t("paginationNav") }}
          />
        </>
      )}

      <CompareBar />
    </div>
  );
}

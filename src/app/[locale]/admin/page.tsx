import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft, ChevronRight, Pencil, Search } from "lucide-react";
import { listPaddles } from "@/application/factory";
import { Link } from "@/i18n/navigation";
import { Badge, Button, Heading, Input } from "@/presentation/components/ui";
import { formatPrice } from "@/presentation/lib/format";

const PAGE_SIZE = 50;

export default async function AdminPaddlesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; pendientes?: string; page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const [t, tEnums, currentLocale] = await Promise.all([
    getTranslations("admin"),
    getTranslations("enums"),
    getLocale(),
  ]);

  const page = Math.max(1, Number(sp.page) || 1);
  const onlyPending = sp.pendientes === "1";

  const { items, total } = await listPaddles.execute({
    search: sp.q || undefined,
    validated: onlyPending ? false : undefined,
    includeInactive: true,
    page,
    pageSize: PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (target: number) => {
    const query = new URLSearchParams();
    if (sp.q) query.set("q", sp.q);
    if (onlyPending) query.set("pendientes", "1");
    if (target > 1) query.set("page", String(target));
    const qs = query.toString();
    return `/admin${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <Heading level={2}>{t("paddlesTitle", { count: total })}</Heading>

      <form method="get" className="mt-4 flex flex-wrap items-center gap-3">
        <Input name="q" defaultValue={sp.q ?? ""} placeholder={t("searchPlaceholder")} className="max-w-xs" />
        <label className="flex items-center gap-2 text-sm text-text">
          <input type="checkbox" name="pendientes" value="1" defaultChecked={onlyPending} className="accent-primary" />
          {t("onlyPending")}
        </label>
        <Button type="submit" size="sm">
          <Search size={14} aria-hidden />
          {t("filter")}
        </Button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-4 py-2.5 font-medium">{t("colName")}</th>
              <th className="px-4 py-2.5 font-medium">{t("colBrand")}</th>
              <th className="px-4 py-2.5 font-medium">{t("colSpecs")}</th>
              <th className="px-4 py-2.5 font-medium">{t("colPrice")}</th>
              <th className="px-4 py-2.5 font-medium">{t("colStatus")}</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2 font-medium text-text">{p.name}</td>
                <td className="px-4 py-2 text-muted">{p.brandName}</td>
                <td className="px-4 py-2 text-muted">
                  {[
                    p.shape ? tEnums(`shape.${p.shape}`) : null,
                    p.level ? tEnums(`level.${p.level}`) : null,
                    p.playStyle ? tEnums(`playStyle.${p.playStyle}`) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </td>
                <td className="px-4 py-2 text-text">
                  {p.bestPrice !== null
                    ? formatPrice(p.bestPrice, p.bestPriceCurrency ?? "ARS", currentLocale)
                    : "—"}
                </td>
                <td className="px-4 py-2">
                  <span className="flex flex-wrap gap-1">
                    {p.validated ? (
                      <Badge variant="success">{t("validatedBadge")}</Badge>
                    ) : (
                      <Badge>{t("pendingBadge")}</Badge>
                    )}
                    {!p.isActive && <Badge variant="danger">{t("inactiveBadge")}</Badge>}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/admin/paletas/${p.id}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <Pencil size={13} aria-hidden />
                    {t("edit")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-4 text-sm">
          {page > 1 && (
            <Link href={pageHref(page - 1)} className="inline-flex items-center gap-1 text-primary hover:underline">
              <ChevronLeft size={14} aria-hidden />
            </Link>
          )}
          <span className="text-muted">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link href={pageHref(page + 1)} className="inline-flex items-center gap-1 text-primary hover:underline">
              <ChevronRight size={14} aria-hidden />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "./cn";

export interface PaginationProps {
  page: number;
  totalPages: number;
  /** Construye el href para una página dada. */
  hrefFor: (page: number) => string;
  labels: { prev: string; next: string };
}

/** Genera la secuencia de páginas con elipsis: 1 … 4 5 [6] 7 8 … 20 */
function pageSequence(page: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | "…"> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  if (start > 2) pages.push("…");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

export function Pagination({ page, totalPages, hrefFor, labels }: PaginationProps) {
  if (totalPages <= 1) return null;
  const seq = pageSequence(page, totalPages);

  const arrow =
    "inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm transition-colors";
  const num =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm transition-colors";

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-1.5" aria-label="Paginación">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={cn(arrow, "glass hover:text-primary")}>
          <ChevronLeft size={16} aria-hidden />
          <span className="hidden sm:inline">{labels.prev}</span>
        </Link>
      ) : (
        <span className={cn(arrow, "cursor-not-allowed text-muted/50")}>
          <ChevronLeft size={16} aria-hidden />
          <span className="hidden sm:inline">{labels.prev}</span>
        </span>
      )}

      {seq.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className={cn(num, "text-muted")}>
            <MoreHorizontal size={16} aria-hidden />
          </span>
        ) : p === page ? (
          <span
            key={p}
            aria-current="page"
            className={cn(num, "bg-gradient-to-br from-primary to-primary-hover font-semibold text-primary-foreground shadow-sm")}
          >
            {p}
          </span>
        ) : (
          <Link key={p} href={hrefFor(p)} className={cn(num, "glass hover:text-primary")}>
            {p}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={cn(arrow, "glass hover:text-primary")}>
          <span className="hidden sm:inline">{labels.next}</span>
          <ChevronRight size={16} aria-hidden />
        </Link>
      ) : (
        <span className={cn(arrow, "cursor-not-allowed text-muted/50")}>
          <span className="hidden sm:inline">{labels.next}</span>
          <ChevronRight size={16} aria-hidden />
        </span>
      )}
    </nav>
  );
}

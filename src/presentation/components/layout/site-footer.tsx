import { getTranslations } from "next-intl/server";
import { Zap } from "lucide-react";
import { APP_NAME } from "@/config";
import { Link } from "@/i18n/navigation";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="glass mt-20 border-x-0 border-b-0 border-t border-glass-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs">
          <span className="flex items-center gap-2 font-bold text-text">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-tertiary text-primary-foreground">
              <Zap size={15} aria-hidden />
            </span>
            Paleta<span className="text-gradient">IQ</span>
          </span>
          <p className="mt-3 text-sm text-muted">{t("tagline")}</p>
        </div>

        <nav className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-text">{t("explore")}</span>
          <Link href="/paletas" className="text-muted transition-colors hover:text-primary">
            {t("paddles")}
          </Link>
          <Link href="/buscador" className="text-muted transition-colors hover:text-primary">
            {t("finder")}
          </Link>
          <Link href="/comparar" className="text-muted transition-colors hover:text-primary">
            {t("compare")}
          </Link>
        </nav>

        <div className="max-w-xs text-sm">
          <span className="font-semibold text-text">{t("dataTitle")}</span>
          <p className="mt-2 text-muted">{t("dataAttribution")}</p>
        </div>
      </div>
      <div className="border-t border-glass-border">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted">
          © {year} {APP_NAME}. {t("rights")}
        </p>
      </div>
    </footer>
  );
}

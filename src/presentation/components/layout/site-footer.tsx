import { getTranslations } from "next-intl/server";
import { APP_NAME } from "@/config";
import { Link } from "@/i18n/navigation";
import { PaletaIcon } from "./logo";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="glass relative mt-20 border-x-0 border-b-0 border-t-0">
      {/* Separador superior con gradiente: invisible en los bordes, visible al centro. */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, var(--border), transparent)" }}
        aria-hidden
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs">
          <span className="flex items-center gap-2 font-bold text-text">
            <PaletaIcon size={28} gradientId="footer-grad" />
            Paleta<span className="text-gradient">IQ</span>
          </span>
          <p className="mt-3 text-sm text-muted">{t("tagline")}</p>
        </div>

        <nav className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-text">{t("explore")}</span>
          <Link
            href="/paletas"
            className="inline-flex w-fit text-muted underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            {t("paddles")}
          </Link>
          <Link
            href="/buscador"
            className="inline-flex w-fit text-muted underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            {t("finder")}
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

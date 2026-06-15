import { getTranslations } from "next-intl/server";
import { Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { AuthButtons } from "./auth-buttons";
import { LocaleSwitcher } from "./locale-switcher";

export async function SiteHeader() {
  const t = await getTranslations("nav");

  return (
    <header className="sticky top-0 z-20 border-x-0 border-t-0 border-b border-border bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/90">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="group flex items-center gap-2 text-lg font-bold text-text">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-tertiary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
            <Zap size={16} aria-hidden />
          </span>
          <span>
            Paleta<span className="text-gradient">IQ</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2 text-sm text-muted sm:gap-3">
          <Link href="/comparar" className="transition-colors hover:text-text sm:hidden">
            {t("compare")}
          </Link>
          <Link href="/paletas" className="hidden transition-colors hover:text-text sm:inline">
            {t("paddles")}
          </Link>
          <Link href="/buscador" className="hidden transition-colors hover:text-text sm:inline">
            {t("finder")}
          </Link>
          <Link href="/comparar" className="hidden transition-colors hover:text-text sm:inline">
            {t("compare")}
          </Link>
          <LocaleSwitcher />
          <AuthButtons />
        </nav>
      </div>
    </header>
  );
}

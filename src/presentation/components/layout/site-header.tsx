import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthButtons } from "./auth-buttons";
import { LocaleSwitcher } from "./locale-switcher";
import { HeaderShell } from "./header-shell";
import { Logo } from "./logo";

export async function SiteHeader() {
  const t = await getTranslations("nav");

  return (
    <HeaderShell>
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav className="flex items-center gap-3 text-sm text-muted sm:gap-5">
          <Link href="/comparar" className="nav-underline transition-colors hover:text-text sm:hidden">
            {t("compare")}
          </Link>
          <Link href="/paletas" className="nav-underline hidden transition-colors hover:text-text sm:inline">
            {t("paddles")}
          </Link>
          <Link href="/buscador" className="nav-underline hidden transition-colors hover:text-text sm:inline">
            {t("finder")}
          </Link>
          <Link href="/comparar" className="nav-underline hidden transition-colors hover:text-text sm:inline">
            {t("compare")}
          </Link>
          <LocaleSwitcher />
          <AuthButtons />
        </nav>
      </div>
    </HeaderShell>
  );
}

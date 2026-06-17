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
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Logo />

        {/* Navegación principal — pegada al logo, a la izquierda. */}
        <nav className="hidden items-center gap-6 text-sm text-muted sm:flex">
          <Link href="/paletas" className="nav-underline transition-colors hover:text-text">
            {t("paddles")}
          </Link>
          <Link href="/buscador" className="nav-underline transition-colors hover:text-text">
            {t("finder")}
          </Link>
          <Link href="/comparar" className="nav-underline transition-colors hover:text-text">
            {t("compare")}
          </Link>
        </nav>

        {/* Acciones de usuario — empujadas a la derecha, separadas de la nav. */}
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {/* En mobile, único link visible (la nav completa se oculta). */}
          <Link
            href="/comparar"
            className="nav-underline text-sm text-muted transition-colors hover:text-text sm:hidden"
          >
            {t("compare")}
          </Link>
          <LocaleSwitcher />
          <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />
          <AuthButtons />
        </div>
      </div>
    </HeaderShell>
  );
}

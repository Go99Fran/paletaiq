import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthButtons } from "./auth-buttons";
import { LocaleSwitcher } from "./locale-switcher";
import { HeaderShell } from "./header-shell";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";

export async function SiteHeader() {
  const t = await getTranslations("nav");

  // Comparador no va en el menú: es una pantalla a la que se llega comparando paletas,
  // no un destino de navegación por sí mismo.
  const navItems = [
    { href: "/paletas", label: t("paddles") },
    { href: "/buscador", label: t("finder") },
  ] as const;

  return (
    <HeaderShell>
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Logo />

        {/* Navegación principal — pegada al logo, a la izquierda. */}
        <nav className="hidden items-center gap-6 text-sm text-muted sm:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-underline transition-colors hover:text-text"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Acciones de usuario — empujadas a la derecha, separadas de la nav. */}
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <LocaleSwitcher />
          <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />
          <AuthButtons />
          {/* En mobile, menú hamburguesa con la navegación completa. */}
          <MobileMenu items={[...navItems]} menuLabel={t("menu")} />
        </div>
      </div>
    </HeaderShell>
  );
}

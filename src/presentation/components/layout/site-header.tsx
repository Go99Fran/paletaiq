import { getTranslations } from "next-intl/server";
import { Zap } from "lucide-react";
import { APP_NAME } from "@/config";
import { Link } from "@/i18n/navigation";
import { AuthButtons } from "./auth-buttons";

export async function SiteHeader() {
  const t = await getTranslations("nav");

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-text">
          <Zap size={20} aria-hidden className="text-primary" />
          {APP_NAME}
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted">
          <Link href="/paletas" className="transition-colors hover:text-text">
            {t("paddles")}
          </Link>
          <Link href="/buscador" className="transition-colors hover:text-text">
            {t("finder")}
          </Link>
          <AuthButtons />
        </nav>
      </div>
    </header>
  );
}

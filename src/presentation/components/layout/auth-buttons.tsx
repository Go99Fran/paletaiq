import { getTranslations } from "next-intl/server";
import { LogIn, LogOut, ShieldCheck } from "lucide-react";
import { auth, signIn, signOut } from "@/auth";
import { Link } from "@/i18n/navigation";
import { Button } from "@/presentation/components/ui";

export async function AuthButtons() {
  const [t, session] = await Promise.all([getTranslations("nav"), auth()]);

  if (session?.user) {
    // Solo el primer nombre para no inflar el navbar ("Franco Gonzalez" -> "Franco").
    const firstName = (session.user.name ?? session.user.email ?? "").split(" ")[0];
    return (
      <span className="flex items-center gap-2 sm:gap-3">
        {session.user.role === "admin" && (
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-glass-border/60 hover:text-text"
          >
            <ShieldCheck size={14} aria-hidden />
            <span className="hidden sm:inline">{t("admin")}</span>
          </Link>
        )}
        <span className="hidden max-w-[7rem] truncate text-sm text-muted md:inline">{firstName}</span>
        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <Button type="submit" variant="ghost" size="sm" className="h-7 gap-1 px-2.5 text-xs">
            <LogOut size={14} aria-hidden />
            <span className="hidden sm:inline">{t("signOut")}</span>
          </Button>
        </form>
      </span>
    );
  }

  return (
    <form
      action={async () => {
        "use server";
        await signIn("google");
      }}
    >
      <Button type="submit" variant="secondary" size="sm" className="h-7 px-2.5 text-xs gap-1">
        <LogIn size={14} aria-hidden />
        {t("signIn")}
      </Button>
    </form>
  );
}

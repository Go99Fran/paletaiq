import { getTranslations } from "next-intl/server";
import { LogIn, LogOut, ShieldCheck } from "lucide-react";
import { auth, signIn, signOut } from "@/auth";
import { Link } from "@/i18n/navigation";
import { Button } from "@/presentation/components/ui";

export async function AuthButtons() {
  const [t, session] = await Promise.all([getTranslations("nav"), auth()]);

  if (session?.user) {
    return (
      <span className="flex items-center gap-2">
        {session.user.role === "admin" && (
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-text"
          >
            <ShieldCheck size={15} aria-hidden />
            {t("admin")}
          </Link>
        )}
        <span className="hidden text-sm text-muted sm:inline">
          {session.user.name ?? session.user.email}
        </span>
        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <Button type="submit" variant="ghost" size="sm">
            <LogOut size={16} aria-hidden />
            {t("signOut")}
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
      <Button type="submit" variant="secondary" size="sm">
        <LogIn size={16} aria-hidden />
        {t("signIn")}
      </Button>
    </form>
  );
}

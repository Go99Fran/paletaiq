import { getTranslations } from "next-intl/server";
import { LogIn, LogOut } from "lucide-react";
import { auth, signIn, signOut } from "@/auth";
import { Button } from "@/presentation/components/ui";

export async function AuthButtons() {
  const [t, session] = await Promise.all([getTranslations("nav"), auth()]);

  if (session?.user) {
    return (
      <form
        action={async () => {
          "use server";
          await signOut();
        }}
        className="flex items-center gap-2"
      >
        <span className="hidden text-sm text-muted sm:inline">
          {session.user.name ?? session.user.email}
        </span>
        <Button type="submit" variant="ghost" size="sm">
          <LogOut size={16} aria-hidden />
          {t("signOut")}
        </Button>
      </form>
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

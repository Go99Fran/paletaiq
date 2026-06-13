import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { Link, redirect } from "@/i18n/navigation";
import { Heading } from "@/presentation/components/ui";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect({ href: "/", locale });
  }

  const t = await getTranslations("admin");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center gap-2">
        <ShieldCheck size={24} aria-hidden className="text-primary" />
        <Heading level={1} className="text-2xl">
          {t("title")}
        </Heading>
      </div>
      <nav className="mt-4 flex gap-4 border-b border-border pb-3 text-sm">
        <Link href="/admin" className="font-medium text-text transition-colors hover:text-primary">
          {t("navPaddles")}
        </Link>
        <Link
          href="/admin/scraping"
          className="font-medium text-text transition-colors hover:text-primary"
        >
          {t("navScraping")}
        </Link>
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}

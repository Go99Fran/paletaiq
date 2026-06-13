import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Play } from "lucide-react";
import { listRecentScrapeRuns } from "@/infrastructure/db/scrape-run.mysql.repository";
import { SOURCE_NAMES } from "@/infrastructure/scraping/scrapers";
import { Badge, Button, Card, CardBody, CardHeader, Heading } from "@/presentation/components/ui";
import { triggerScrape } from "../actions";

export default async function AdminScrapingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, currentLocale, runs] = await Promise.all([
    getTranslations("admin"),
    getLocale(),
    listRecentScrapeRuns(),
  ]);

  const dateFormat = new Intl.DateTimeFormat(currentLocale === "es" ? "es-AR" : "en-US", {
    dateStyle: "short",
    timeStyle: "short",
  });

  const statusBadge = (status: string) => {
    if (status === "success") return <Badge variant="success">{t("statusSuccess")}</Badge>;
    if (status === "error") return <Badge variant="danger">{t("statusError")}</Badge>;
    return <Badge variant="primary">{t("statusRunning")}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Heading level={3}>{t("scrapingTitle")}</Heading>
        </CardHeader>
        <CardBody>
          <p className="mb-3 text-sm text-muted">{t("scrapingHint")}</p>
          <div className="flex flex-wrap gap-2">
            {SOURCE_NAMES.map((source) => (
              <form
                key={source}
                action={async () => {
                  "use server";
                  await triggerScrape(source);
                }}
              >
                <Button type="submit" variant="secondary" size="sm">
                  <Play size={14} aria-hidden />
                  {t("runSource", { source })}
                </Button>
              </form>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <Heading level={3}>{t("runsTitle")}</Heading>
        </CardHeader>
        <CardBody>
          {runs.length === 0 ? (
            <p className="text-sm text-muted">{t("noRuns")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="py-2 pr-4 font-medium">{t("colSource")}</th>
                    <th className="py-2 pr-4 font-medium">{t("colRunStatus")}</th>
                    <th className="py-2 pr-4 font-medium">{t("colTrigger")}</th>
                    <th className="py-2 pr-4 font-medium">{t("colStarted")}</th>
                    <th className="py-2 pr-4 font-medium">{t("colItems")}</th>
                    <th className="py-2 font-medium">{t("colError")}</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id} className="border-b border-border align-top last:border-0">
                      <td className="py-2 pr-4 font-medium text-text">{run.source}</td>
                      <td className="py-2 pr-4">{statusBadge(run.status)}</td>
                      <td className="py-2 pr-4 text-muted">
                        {run.triggerType}
                        {run.triggeredBy ? ` (${run.triggeredBy})` : ""}
                      </td>
                      <td className="py-2 pr-4 text-muted">
                        {dateFormat.format(new Date(run.startedAt))}
                      </td>
                      <td className="py-2 pr-4 text-text">
                        {run.itemsFound}/{run.itemsCreated}/{run.itemsUpdated}
                      </td>
                      <td className="max-w-xs py-2">
                        {run.errorMessage ? (
                          <span className="block truncate text-danger" title={run.errorMessage}>
                            {run.errorMessage}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

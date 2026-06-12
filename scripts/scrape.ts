/**
 * CLI de scraping. Corre fuera del request cycle de Next (cron o manual).
 *
 * Uso:
 *   npm run scrape -- --source=vairo
 *   npm run scrape -- --source=vairo --limit=5 --no-cache
 *   npm run scrape -- --all
 */
import { SOURCES, SOURCE_NAMES } from "../src/infrastructure/scraping/scrapers";
import { runScrape } from "../src/infrastructure/scraping/scrape-runner";

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (name: string) => {
    const arg = args.find((a) => a.startsWith(`--${name}=`));
    return arg ? arg.split("=")[1] : undefined;
  };
  return {
    source: get("source"),
    limit: get("limit") ? Number(get("limit")) : undefined,
    noCache: args.includes("--no-cache"),
    all: args.includes("--all"),
  };
}

async function main() {
  const { source, limit, noCache, all } = parseArgs();

  const targets = all ? SOURCE_NAMES : source ? [source] : [];
  if (targets.length === 0) {
    console.error(`Uso: npm run scrape -- --source=<fuente> [--limit=N] [--no-cache] | --all`);
    console.error(`Fuentes disponibles: ${SOURCE_NAMES.join(", ")}`);
    process.exit(1);
  }

  let failed = false;
  for (const name of targets) {
    const spec = SOURCES[name];
    if (!spec) {
      console.error(`Fuente desconocida: ${name}. Disponibles: ${SOURCE_NAMES.join(", ")}`);
      process.exit(1);
    }
    try {
      const result = await runScrape(spec, { limit, noCache, trigger: "manual_admin" });
      console.log(
        `${name}: OK (run ${result.runId}) found=${result.found} created=${result.created} updated=${result.updated} errors=${result.errors.length}`,
      );
    } catch (e) {
      failed = true;
      console.error(`${name}: FALLÓ — ${e instanceof Error ? e.message : e}`);
    }
  }
  process.exit(failed ? 1 : 0);
}

main();

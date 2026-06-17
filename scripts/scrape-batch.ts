import { SOURCE_NAMES, SOURCES } from "../src/infrastructure/scraping/scrapers";
import { runScrape } from "../src/infrastructure/scraping/scrape-runner";

type ProfileName = "quick" | "full" | "shopify" | "core";

type CliOptions = {
  profile: ProfileName;
  limit?: number;
  noCache: boolean;
  only: string[];
  timeoutMs?: number;
  continueOnError: boolean;
};

type SourceResult = {
  source: string;
  runId?: number;
  found?: number;
  created?: number;
  updated?: number;
  errors?: number;
  status: "ok" | "failed";
  durationMs: number;
  message?: string;
};

const PROFILE_SOURCES: Record<ProfileName, string[]> = {
  quick: SOURCE_NAMES,
  full: SOURCE_NAMES,
  shopify: ["nox", "siux", "starvie", "vairo", "dropshot"],
  core: ["adidas", "bullpadel", "siux", "nox", "starvie", "vairo", "dropshot"],
};

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const get = (name: string) => {
    const arg = args.find((a) => a.startsWith(`--${name}=`));
    return arg ? arg.split("=")[1] : undefined;
  };

  const profileRaw = get("profile") ?? "quick";
  const profile = toProfile(profileRaw);
  const limit = get("limit") ? Number(get("limit")) : undefined;
  const only = (get("only") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const timeoutMs = get("timeout-ms") ? Number(get("timeout-ms")) : undefined;

  if (limit !== undefined && (!Number.isFinite(limit) || limit <= 0)) {
    throw new Error("--limit debe ser un numero mayor a 0");
  }
  if (timeoutMs !== undefined && (!Number.isFinite(timeoutMs) || timeoutMs <= 0)) {
    throw new Error("--timeout-ms debe ser un numero mayor a 0");
  }

  return {
    profile,
    limit,
    noCache: args.includes("--no-cache"),
    only,
    timeoutMs,
    continueOnError: args.includes("--continue-on-error"),
  };
}

function toProfile(value: string): ProfileName {
  const p = value.toLowerCase();
  if (p === "quick" || p === "full" || p === "shopify" || p === "core") return p;
  throw new Error(`Perfil invalido: ${value}. Validos: quick, full, shopify, core`);
}

function selectSources(opts: CliOptions): string[] {
  if (opts.only.length > 0) {
    for (const name of opts.only) {
      if (!SOURCES[name]) {
        throw new Error(`Fuente desconocida en --only: ${name}`);
      }
    }
    return opts.only;
  }
  return PROFILE_SOURCES[opts.profile];
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs?: number): Promise<T> {
  if (!timeoutMs) return promise;

  let timer: NodeJS.Timeout | null = null;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout de ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function nowIso() {
  return new Date().toISOString();
}

function printHeader(opts: CliOptions, selected: string[]) {
  console.log(`[scrape-batch] started=${nowIso()}`);
  console.log(`[scrape-batch] profile=${opts.profile} noCache=${opts.noCache} limit=${opts.limit ?? "none"}`);
  console.log(`[scrape-batch] timeoutMs=${opts.timeoutMs ?? "none"} continueOnError=${opts.continueOnError}`);
  console.log(`[scrape-batch] sources=${selected.join(",")}`);
}

function printSummary(results: SourceResult[], startedAt: number) {
  const ok = results.filter((r) => r.status === "ok");
  const failed = results.filter((r) => r.status === "failed");

  const totalFound = ok.reduce((acc, r) => acc + (r.found ?? 0), 0);
  const totalCreated = ok.reduce((acc, r) => acc + (r.created ?? 0), 0);
  const totalUpdated = ok.reduce((acc, r) => acc + (r.updated ?? 0), 0);
  const totalErrors = ok.reduce((acc, r) => acc + (r.errors ?? 0), 0);

  console.log("\n[scrape-batch] summary");
  for (const r of results) {
    if (r.status === "ok") {
      console.log(
        `- ${r.source}: OK run=${r.runId} found=${r.found} created=${r.created} updated=${r.updated} errors=${r.errors} durationMs=${r.durationMs}`,
      );
    } else {
      console.log(`- ${r.source}: FAIL message=${r.message} durationMs=${r.durationMs}`);
    }
  }

  console.log(
    `[scrape-batch] totals ok=${ok.length} failed=${failed.length} found=${totalFound} created=${totalCreated} updated=${totalUpdated} errors=${totalErrors}`,
  );
  console.log(`[scrape-batch] finished=${nowIso()} durationMs=${Date.now() - startedAt}`);
}

async function main() {
  const startedAt = Date.now();
  const opts = parseArgs();
  const selected = selectSources(opts);
  printHeader(opts, selected);

  const results: SourceResult[] = [];

  for (const source of selected) {
    const sourceStartedAt = Date.now();
    console.log(`\n[scrape-batch] running source=${source}`);

    try {
      const result = await withTimeout(
        runScrape(SOURCES[source], {
          limit: opts.limit,
          noCache: opts.noCache,
          trigger: "manual_admin",
        }),
        opts.timeoutMs,
      );

      results.push({
        source,
        runId: result.runId,
        found: result.found,
        created: result.created,
        updated: result.updated,
        errors: result.errors.length,
        status: "ok",
        durationMs: Date.now() - sourceStartedAt,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        source,
        status: "failed",
        durationMs: Date.now() - sourceStartedAt,
        message,
      });

      console.error(`[scrape-batch] source=${source} failed: ${message}`);
      if (!opts.continueOnError) {
        printSummary(results, startedAt);
        process.exit(1);
      }
    }
  }

  printSummary(results, startedAt);
  process.exit(results.some((r) => r.status === "failed") ? 1 : 0);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[scrape-batch] fatal: ${message}`);
  process.exit(1);
});

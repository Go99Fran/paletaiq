/**
 * Cliente HTTP para scrapers: rate limit por host, cache local en dev,
 * robots.txt check y retry con backoff. Portado del scraper de ballgames.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const USER_AGENT =
  process.env.SCRAPER_USER_AGENT ??
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";
const RATE_LIMIT_MS = 1500;
const REQUEST_TIMEOUT_MS = 50_000;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 10_000;
const MAX_BACKOFF_MS = 90_000;
const CACHE_ROOT = join(process.cwd(), ".cache", "scraper");

const lastFetchByHost = new Map<string, number>();
const robotsByHost = new Map<string, RobotsRules>();

type RobotsRules = {
  disallow: string[];
  allow: string[];
};

export type ScrapeClient = {
  source: string;
  /** Fetchea el body respetando rate limit + cache. */
  fetchBody: (url: string, opts?: { noCache?: boolean }) => Promise<string>;
  /** Alias de fetchBody para parsers HTML (compat con scrapers portados). */
  fetchHtml: (url: string, opts?: { noCache?: boolean }) => Promise<string>;
  /** Lanza si la URL está bloqueada por robots.txt. */
  checkRobots: (url: string) => Promise<void>;
};

export function createScrapeClient(opts: { source: string }): ScrapeClient {
  return {
    source: opts.source,
    fetchBody: (url, fetchOpts) => fetchBody(opts.source, url, fetchOpts),
    fetchHtml: (url, fetchOpts) => fetchBody(opts.source, url, fetchOpts),
    checkRobots: (url) => checkRobots(url),
  };
}

async function waitForSlot(host: string) {
  const last = lastFetchByHost.get(host) ?? 0;
  const remaining = RATE_LIMIT_MS - (Date.now() - last);
  if (remaining > 0) await sleep(remaining);
  lastFetchByHost.set(host, Date.now());
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function cacheKey(source: string, url: string) {
  const hash = createHash("sha1").update(url).digest("hex").slice(0, 16);
  return join(CACHE_ROOT, source, `${hash}.body`);
}

async function fetchBody(
  source: string,
  url: string,
  fetchOpts?: { noCache?: boolean },
): Promise<string> {
  const useCache = process.env.NODE_ENV !== "production" && !fetchOpts?.noCache;
  const cachePath = cacheKey(source, url);

  if (useCache && existsSync(cachePath)) {
    return readFileSync(cachePath, "utf-8");
  }

  await waitForSlot(new URL(url).host);
  const body = await fetchWithRetry(url);

  if (useCache) {
    mkdirSync(dirname(cachePath), { recursive: true });
    writeFileSync(cachePath, body, "utf-8");
  }
  return body;
}

async function fetchWithRetry(url: string, attempt = 0): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers = buildHeadersForUrl(url);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers,
    });

    if (shouldRetryStatus(res.status)) {
      if (attempt < MAX_RETRIES) {
        const retryAfterMs = parseRetryAfterMs(res.headers.get("retry-after"));
        const backoffMs = retryAfterMs ?? computeBackoffMs(attempt);
        await sleep(backoffMs);
        return fetchWithRetry(url, attempt + 1);
      }
      throw new Error(`HTTP ${res.status} after retry: ${url}`);
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return await res.text();
  } catch (error) {
    if (attempt < MAX_RETRIES && shouldRetryError(error)) {
      await sleep(computeBackoffMs(attempt));
      return fetchWithRetry(url, attempt + 1);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function isJsonUrl(url: string): boolean {
  return /\.json(?:\?|$)/i.test(url);
}

function buildHeadersForUrl(url: string): Record<string, string> {
  if (isJsonUrl(url)) {
    return {
      "User-Agent": USER_AGENT,
      "Accept-Language": "es-AR,es;q=0.9,en;q=0.7",
      Accept: "application/json,text/plain,*/*",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    };
  }

  return {
    "User-Agent": USER_AGENT,
    "Accept-Language": "es-AR,es;q=0.9,en;q=0.7",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Upgrade-Insecure-Requests": "1",
  };
}

function shouldRetryStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function shouldRetryError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "AbortError") return true;
  const msg = error.message.toLowerCase();
  return msg.includes("fetch failed") || msg.includes("network") || msg.includes("socket");
}

function computeBackoffMs(attempt: number): number {
  const exp = BASE_BACKOFF_MS * 2 ** attempt;
  const jitter = Math.floor(Math.random() * 2_000);
  return Math.min(exp + jitter, MAX_BACKOFF_MS);
}

function parseRetryAfterMs(retryAfter: string | null): number | null {
  if (!retryAfter) return null;
  const asSeconds = Number.parseInt(retryAfter, 10);
  if (!Number.isNaN(asSeconds) && asSeconds >= 0) {
    return asSeconds * 1000;
  }

  const asDate = Date.parse(retryAfter);
  if (Number.isNaN(asDate)) return null;
  const delta = asDate - Date.now();
  return delta > 0 ? delta : null;
}

async function checkRobots(url: string): Promise<void> {
  const u = new URL(url);
  const rules = await loadRobots(u.host, u.protocol);

  const path = u.pathname + u.search;
  const blocked = rules.disallow.find((rule) => matchesRule(path, rule));
  const allowed = rules.allow.find((rule) => matchesRule(path, rule));

  if (blocked && (!allowed || allowed.length < blocked.length)) {
    throw new Error(`robots.txt bloquea ${path} en ${u.host} (Disallow: ${blocked})`);
  }
}

async function loadRobots(host: string, protocol: string): Promise<RobotsRules> {
  const cached = robotsByHost.get(host);
  if (cached) return cached;

  await waitForSlot(host);
  let text = "";
  try {
    const res = await fetch(`${protocol}//${host}/robots.txt`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) text = await res.text();
  } catch {
    // sin robots.txt asumimos permitido
  }

  const rules = parseRobots(text);
  robotsByHost.set(host, rules);
  return rules;
}

/** Parser simple de robots.txt: aplica las reglas de `User-agent: *`. */
export function parseRobots(text: string): RobotsRules {
  const rules: RobotsRules = { disallow: [], allow: [] };
  let currentUA: string | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const directive = line.substring(0, colonIdx).trim().toLowerCase();
    const value = line.substring(colonIdx + 1).trim();

    if (directive === "user-agent") {
      currentUA = value;
      continue;
    }
    if (currentUA !== "*" || !value) continue;
    if (directive === "disallow") rules.disallow.push(value);
    else if (directive === "allow") rules.allow.push(value);
  }
  return rules;
}

function matchesRule(path: string, rule: string): boolean {
  if (rule === "" || rule === "/") return rule !== "";
  if (rule.includes("*")) {
    const regex = new RegExp(
      "^" + rule.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*"),
    );
    return regex.test(path);
  }
  return path.startsWith(rule);
}

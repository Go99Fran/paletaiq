/**
 * Babolat (Demandware / Salesforce Commerce Cloud). Portado de ballgames.
 * Combina JSON-LD Product con el bloque "Technical Characteristics" del HTML.
 */
import * as cheerio from "cheerio";
import type { SourceSpec } from "../scrape-runner";
import type { ParsedPaddle } from "../types";
import { mapTipoJuego } from "./tipo-juego";

const LISTING_URL = "https://www.babolat.com/us/padel/racquets.html";

export const babolatSource: SourceSpec = {
  source: "babolat",
  brandSlug: "babolat",

  async discoverUrls(client, opts) {
    await client.checkRobots(LISTING_URL);
    const html = await client.fetchHtml(LISTING_URL, { noCache: opts.noCache });
    const { productUrls } = parseListing(html);
    return opts.limit ? productUrls.slice(0, opts.limit) : productUrls;
  },

  parseDetail,
};

function parseListing(html: string): { productUrls: string[] } {
  const $ = cheerio.load(html);
  const urls = new Set<string>();
  $("a").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const abs = href.startsWith("http")
      ? href
      : href.startsWith("/")
        ? `https://www.babolat.com${href}`
        : "";
    if (/^https:\/\/www\.babolat\.com\/[a-z]{2}\/[a-z0-9.-]+\/\d+\.html$/i.test(abs)) {
      urls.add(abs);
    }
  });
  return { productUrls: Array.from(urls) };
}

const FORMA_MAP: Record<string, ParsedPaddle["forma"]> = {
  DIAMOND: "diamante",
  ROUND: "redonda",
  TEARDROP: "lagrima",
  HYBRID: "hibrida",
};

const NIVEL_FROM_TYPOLOGY: Array<[RegExp, ParsedPaddle["categoria"]]> = [
  [/\b3\.0\b/, "pro"],
  [/\b2\.6\b/, "avanzado"],
  [/\b2\.0\b/, "intermedio"],
  [/\b1\.0\b/, "iniciacion"],
  [/\bjunior\b/i, "junior"],
];

const DUREZA_FROM_CORE: Record<string, ParsedPaddle["dureza"]> = {
  "HARD EVA": "dura",
  "MEDIUM EVA": "media",
  "SOFT EVA": "blanda",
  "BLACK EVA": "dura",
  "WHITE EVA": "media",
};

function parseDetail(html: string, url: string): ParsedPaddle {
  const $ = cheerio.load(html);

  let ldProduct: Record<string, unknown> | undefined;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html() ?? "";
      const parsed = JSON.parse(raw) as unknown;
      const values = Array.isArray(parsed) ? parsed : [parsed];
      for (const value of values) {
        if (
          typeof value === "object" &&
          value !== null &&
          "@type" in value &&
          (value as { [key: string]: unknown })["@type"] === "Product"
        ) {
          ldProduct = value as Record<string, unknown>;
          break;
        }
      }
    } catch {
      // ignore invalid JSON-LD blocks
    }
  });

  const fullText = $("body").text().replace(/\s+/g, " ");
  const techIdx = fullText.indexOf("Technical Characteristics");
  const techText = techIdx >= 0 ? fullText.substring(techIdx, techIdx + 1500) : "";
  const specs = parseSpecs(techText);

  const ld = ldProduct ?? undefined;
  const ldName = ld && typeof ld.name === "string" ? ld.name : undefined;
  const nombre = ldName ?? $("h1").first().text().trim();
  if (!nombre) throw new Error(`Sin h1 ni JSON-LD name: ${url}`);

  const slugRaw = extractSlugFromUrl(url);
  const offers = (ld?.offers ?? {}) as { price?: string; priceCurrency?: string };
  const priceNum = offers.price ? Number(offers.price) : undefined;
  const currency = offers.priceCurrency;
  const precioUsd = currency === "USD" ? priceNum : undefined;
  const precioEur = currency === "EUR" ? priceNum : undefined;
  const imagenesUrl = extractImagesFromLd(ld?.image);

  const forma = specs.shape ? FORMA_MAP[specs.shape.toUpperCase()] : undefined;
  const { pesoMinG, pesoMaxG } = parseWeight(specs.weight);
  const balanceCm = parseBalanceCm(specs.balance);
  const balance =
    balanceCm !== undefined ? (balanceCm < 25 ? "bajo" : balanceCm <= 26 ? "medio" : "alto") : undefined;
  const dureza = specs.core ? DUREZA_FROM_CORE[specs.core.toUpperCase().trim()] : undefined;
  const categoria = matchPattern(nombre, NIVEL_FROM_TYPOLOGY);
  const tipoJuego = mapTipoJuego(specs.typology);
  const descripcionOficial =
    (ld?.description as string | undefined) ?? $('[itemprop="description"]').first().text().trim() ?? undefined;

  return {
    slugRaw,
    nombre,
    forma,
    balance,
    pesoMinG,
    pesoMaxG,
    dureza,
    categoria,
    tipoJuego,
    nucleo: specs.core,
    cara: specs.surface,
    marco: specs.frame,
    precioEur,
    precioUsd,
    enStock: precioUsd !== undefined || precioEur !== undefined,
    imagenPrincipalUrl: imagenesUrl[0],
    descripcionOficial,
    sourceUrl: url,
    rawData: {
      specs,
      sku: ld?.sku as string | undefined,
      currency,
      images: imagenesUrl,
      balance_cm: balanceCm,
      profile: specs.profile,
      cover: specs.cover,
      grip: specs.grip,
    },
  };
}

function extractSlugFromUrl(url: string): string {
  const m = url.match(/\/([a-z0-9.-]+)\/\d+\.html$/i);
  return m ? m[1] : url.split("/").pop() ?? "";
}

function parseSpecs(text: string): {
  typology?: string;
  shape?: string;
  surface?: string;
  frame?: string;
  core?: string;
  weight?: string;
  balance?: string;
  profile?: string;
  cover?: string;
  grip?: string;
} {
  const out: Record<string, string> = {};
  const keys = [
    { name: "typology", re: /Player Typology\s+(.+?)(?=Head Shape|Composition|SURFACE|Weight|$)/ },
    { name: "shape", re: /Head Shape\s+(.+?)(?=Composition|SURFACE|Weight|$)/ },
    { name: "surface", re: /SURFACE:\s*(.+?)(?=FRAME|CORE|Weight|$)/ },
    { name: "frame", re: /FRAME:\s*(.+?)(?=CORE|Weight|$)/ },
    { name: "core", re: /CORE:\s*(.+?)(?=Weight|$)/ },
    { name: "weight", re: /Weight\s+(.+?)(?=Thickness|Profile|Balance|$)/ },
    { name: "profile", re: /(?:Thickness|Profile)\s+(.+?)(?=Balance|Recommended|$)/ },
    { name: "balance", re: /Balance\s+(.+?)(?=Recommended|Cover|$)/ },
    { name: "grip", re: /Recommended Grip\s+(.+?)(?=Cover|$)/ },
    { name: "cover", re: /Cover\s+(.+?)$/ },
  ];

  for (const { name, re } of keys) {
    const match = text.match(re);
    if (match) {
      const value = match[1].trim().replace(/\s+/g, " ");
      if (value) out[name] = value;
    }
  }

  return out;
}

function parseWeight(spec: string | undefined): { pesoMinG?: number; pesoMaxG?: number } {
  if (!spec) return {};
  const tol = spec.match(/(\d{3})\s*g\s*\+\/?-\s*(\d+)\s*g/i);
  if (tol) {
    const center = Number(tol[1]);
    const range = Number(tol[2]);
    return { pesoMinG: center - range, pesoMaxG: center + range };
  }
  const single = spec.match(/(\d{3})\s*g/i);
  if (single) {
    const n = Number(single[1]);
    return { pesoMinG: n, pesoMaxG: n };
  }
  return {};
}

function parseBalanceCm(spec: string | undefined): number | undefined {
  if (!spec) return undefined;
  const mm = spec.match(/(\d{2,3})\s*mm/i);
  if (mm) return Number(mm[1]) / 10;
  const cm = spec.match(/(\d{2})[,.]?(\d*)\s*cm/i);
  if (cm) {
    const intPart = Number(cm[1]);
    const decPart = cm[2] ? Number(`0.${cm[2]}`) : 0;
    return intPart + decPart;
  }
  return undefined;
}

function matchPattern<T>(text: string, patterns: Array<[RegExp, T]>): T | undefined {
  for (const [re, value] of patterns) {
    if (re.test(text)) return value;
  }
  return undefined;
}

function extractImagesFromLd(image: unknown): string[] {
  if (!image) return [];
  if (Array.isArray(image)) {
    return (image as string[]).flatMap((value) => parseSrcset(String(value)));
  }
  return parseSrcset(String(image));
}

function parseSrcset(value: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const part of value.split(",")) {
    const trimmed = part.trim();
    const url = trimmed.split(/\s+/)[0];
    if (url && url.startsWith("http") && !seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }
  return urls;
}

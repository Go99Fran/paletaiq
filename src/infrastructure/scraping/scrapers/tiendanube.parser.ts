/**
 * Adapter genérico para Tiendanube. Portado de ballgames y adaptado a ParsedPaddle.
 */
import * as cheerio from "cheerio";
import type { ParsedPaddle } from "../types";

export type TiendanubeConfig = {
  domain: string;
  excludeSlugs?: RegExp[];
  nivelFromTitle?: Array<[RegExp, ParsedPaddle["categoria"]]>;
  stripRandomSuffix?: boolean;
};

export function parseTiendanubeListing(
  html: string,
  config: TiendanubeConfig,
): { productUrls: string[] } {
  const $ = cheerio.load(html);
  const baseUrl = `https://${config.domain}`;
  const urls = new Set<string>();

  $("a").each((_, el) => {
    const hrefAttr = $(el).attr("href") ?? "";
    const href = hrefAttr.startsWith("http")
      ? hrefAttr
      : hrefAttr.startsWith("/")
        ? `${baseUrl}${hrefAttr}`
        : "";

    if (/^https?:\/\/[^/]+\/productos\/[a-z0-9-]+\/?$/i.test(href)) {
      const slugMatch = href.match(/\/productos\/([^/]+)\/?$/);
      const slug = slugMatch ? slugMatch[1] : "";
      if (config.excludeSlugs?.some((re) => re.test(slug))) return;
      urls.add(href);
    }
  });

  return { productUrls: Array.from(urls) };
}

const FORMA_PATTERNS: Array<[RegExp, ParsedPaddle["forma"]]> = [
  [/\bforma\s+de\s+diamante\b/i, "diamante"],
  [/\bforma\s+redonda\b/i, "redonda"],
  [/\bforma\s+l[áa]grima\b/i, "lagrima"],
  [/\bforma\s+h[íi]brida\b/i, "hibrida"],
  [/\bdiamante\b/i, "diamante"],
  [/\bredonda\b/i, "redonda"],
  [/\bl[áa]grima\b/i, "lagrima"],
  [/\bh[íi]brida\b/i, "hibrida"],
];

const BALANCE_PATTERNS: Array<[RegExp, ParsedPaddle["balance"]]> = [
  [/\bbalance\s+alto\b/i, "alto"],
  [/\bbalance\s+medio\b/i, "medio"],
  [/\bbalance\s+bajo\b/i, "bajo"],
];

const DUREZA_PATTERNS: Array<[RegExp, ParsedPaddle["dureza"]]> = [
  [/\btacto\s+blando\b/i, "blanda"],
  [/\btacto\s+medio\b/i, "media"],
  [/\btacto\s+duro\b/i, "dura"],
  [/\bdureza\s+blanda\b/i, "blanda"],
  [/\bdureza\s+media\b/i, "media"],
  [/\bdureza\s+dura\b/i, "dura"],
];

export function parseTiendanubeDetail(
  html: string,
  url: string,
  config: TiendanubeConfig,
): ParsedPaddle {
  const $ = cheerio.load(html);

  const nombre = $("h1").first().text().trim();
  if (!nombre) throw new Error(`Sin H1: ${url}`);

  const slugRaw = extractSlugFromUrl(url, config);
  const priceText = $(".js-price-display").first().text().trim();
  const precioArs = parsePriceArs(priceText);

  const productDesc =
    $(".user-content").first().text().trim() ||
    $('[itemprop="description"]').first().text().trim() ||
    $(".js-product-description").first().text().trim() ||
    "";
  const metaDesc = $('meta[name="description"]').attr("content") ?? "";
  const text = [productDesc, metaDesc].join(" ").replace(/\s+/g, " ");

  const forma = matchPattern(text, FORMA_PATTERNS);
  const balance = matchPattern(text, BALANCE_PATTERNS);
  const dureza = matchPattern(text, DUREZA_PATTERNS);
  const peso = parseWeight(text);
  const categoria = config.nivelFromTitle ? matchPattern(nombre, config.nivelFromTitle) : undefined;

  const imagenesUrl: string[] = [];
  const seen = new Set<string>();
  $("img").each((_, el) => {
    let src = $(el).attr("src") || $(el).attr("data-src") || "";
    if (src.startsWith("//")) src = `https:${src}`;
    if (/mitiendanube\.com\/stores\/[\d/]+\/products\//.test(src) && !seen.has(src)) {
      seen.add(src);
      imagenesUrl.push(src);
    }
  });

  return {
    slugRaw,
    nombre,
    forma,
    balance,
    pesoMinG: peso.min,
    pesoMaxG: peso.max,
    dureza,
    categoria,
    nucleo: extractNucleo(text),
    cara: extractCara(text),
    precioArs,
    enStock: precioArs !== undefined,
    imagenPrincipalUrl: imagenesUrl[0],
    descripcionOficial: productDesc.slice(0, 4000),
    sourceUrl: url,
    rawData: {
      meta_description: metaDesc,
      domain: config.domain,
      images: imagenesUrl,
    },
  };
}

function extractSlugFromUrl(url: string, config: TiendanubeConfig): string {
  const m = url.match(/\/productos\/([^/]+)\/?$/);
  if (!m) return url.split("/").filter(Boolean).pop() ?? "";
  let slug = m[1];
  if (config.stripRandomSuffix) {
    slug = slug.replace(/-[a-z0-9]{5,6}$/i, "");
  }
  return slug;
}

function parsePriceArs(text: string): number | undefined {
  if (!text) return undefined;
  const cleaned = text.replace(/[^\d.,]/g, "");
  if (!cleaned) return undefined;
  if (cleaned.includes(",")) {
    const [intPart, decPart] = cleaned.split(",");
    return Number(`${intPart.replace(/\./g, "")}.${decPart}`);
  }
  return Number(cleaned.replace(/\./g, ""));
}

function parseWeight(text: string): { min?: number; max?: number } {
  const range = text.match(/(\d{3})\s*[-–]\s*(\d{3})\s*g(?:r|ramos)?/i);
  if (range) return { min: Number(range[1]), max: Number(range[2]) };
  const single = text.match(/\b(\d{3})\s*g(?:r|ramos)?\b/i);
  if (single) {
    const n = Number(single[1]);
    if (n >= 300 && n <= 400) return { min: n, max: n };
  }
  return {};
}

function matchPattern<T>(text: string, patterns: Array<[RegExp, T]>): T | undefined {
  for (const [re, value] of patterns) {
    if (re.test(text)) return value;
  }
  return undefined;
}

function extractNucleo(text: string): string | undefined {
  const m = text.match(
    /\bn[úu]cleo\s+(?:de\s+)?([A-Za-z0-9 ]{3,30}?)(?=[,.;]|$| garantiza| proporciona| aporta| de alta)/i,
  );
  return m ? m[1].trim() : undefined;
}

function extractCara(text: string): string | undefined {
  const m = text.match(/\bfibra\s+de\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,3})/i);
  return m ? `Fibra de ${m[1].trim()}` : undefined;
}

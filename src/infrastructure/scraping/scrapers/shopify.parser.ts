/**
 * Adapter genérico para tiendas Shopify (portado de ballgames).
 *
 * Funciona con cualquier tienda que exponga:
 *   GET <storeUrl>/collections/<handle>/products.json
 *   GET <storeUrl>/products/<handle>.json
 */
import type { ParsedPaddle } from "../types";

export type ShopifyProduct = {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  vendor: string;
  product_type: string;
  tags: string[];
  variants: Array<{
    id: number;
    sku: string | null;
    price: string;
    compare_at_price: string | null;
    grams: number;
    available: boolean;
  }>;
  images: Array<{ src: string; position: number }>;
};

export type ShopifyListing = { products: ShopifyProduct[] };

export type ShopifyConfig = {
  /** Prefijo de marca en el handle a remover (evita "siux-siux-gea"). */
  stripHandlePrefix?: RegExp;
  /** Mapeos título → categoría; aplica el primero que matchea. */
  nivelFromTitle?: Array<[RegExp, ParsedPaddle["categoria"]]>;
  /** Moneda del precio del listado. Default EUR. */
  currency?: "EUR" | "ARS" | "USD";
  /** Filtro para excluir productos que no son paletas (ropa, accesorios...). */
  productFilter?: (p: ShopifyProduct) => boolean;
};

const DEFAULT_FORMA: Array<[RegExp, ParsedPaddle["forma"]]> = [
  [/\bforma\s+redonda\b/i, "redonda"],
  [/\bforma\s+l[áa]grima\b/i, "lagrima"],
  [/\bforma\s+diamante\b/i, "diamante"],
  [/\bforma\s+h[íi]brida\b/i, "hibrida"],
  [/\bcabeza\s+redonda\b/i, "redonda"],
  [/\bdise[ñn]o\s+diamante\b/i, "diamante"],
  [/\bredonda\b/i, "redonda"],
  [/\bdiamante\b/i, "diamante"],
  [/\bh[íi]brida\b/i, "hibrida"],
  [/\bl[áa]grima\b/i, "lagrima"],
];

const DEFAULT_BALANCE: Array<[RegExp, ParsedPaddle["balance"]]> = [
  [/\bbalance\s+bajo\b/i, "bajo"],
  [/\bbalance\s+medio(?:-bajo|-alto)?\b/i, "medio"],
  [/\bbalance\s+(?:alto|extremo)\b/i, "alto"],
];

const DEFAULT_DUREZA: Array<[RegExp, ParsedPaddle["dureza"]]> = [
  [/\btacto\s+blando\b/i, "blanda"],
  [/\btacto\s+medio(?:-duro|-blando)?\b/i, "media"],
  [/\btacto\s+duro\b/i, "dura"],
  [/\bgoma\s+blanda\b/i, "blanda"],
  [/\bgoma\s+dura\b/i, "dura"],
  [/\balta\s+rigidez\b/i, "dura"],
];

const DEFAULT_SUPERFICIE: Array<[RegExp, ParsedPaddle["superficie"]]> = [
  [/\b(?:superficie|acabado)\s+rugos[oa]\b/i, "rugosa"],
  [/\brelieve\b/i, "rugosa"],
  [/\b(?:superficie|acabado)\s+lis[oa]\b/i, "lisa"],
];

export function parseShopifyListing(
  json: string,
  config: ShopifyConfig = {},
): { handles: string[] } {
  const data = JSON.parse(json) as ShopifyListing;
  const filtered = config.productFilter
    ? data.products.filter(config.productFilter)
    : data.products;
  return { handles: filtered.map((p) => p.handle) };
}

export function parseShopifyDetail(
  json: string,
  sourceUrl: string,
  config: ShopifyConfig = {},
): ParsedPaddle {
  const data = JSON.parse(json) as { product: ShopifyProduct } | ShopifyProduct;
  const p = "product" in data ? data.product : data;

  const cleanText = stripHtml(p.body_html);
  const variant = p.variants[0];

  const slugRaw = config.stripHandlePrefix
    ? p.handle.replace(config.stripHandlePrefix, "")
    : p.handle;

  const nombre = p.title.trim();
  const peso = variant?.grams && variant.grams > 0 ? variant.grams : undefined;
  const categoria = config.nivelFromTitle
    ? matchPattern(nombre, config.nivelFromTitle)
    : undefined;

  const priceNum = variant?.price ? Number(variant.price) : undefined;
  const currency = config.currency ?? "EUR";

  return {
    slugRaw,
    nombre,
    ano: extractYearFromTitle(nombre),
    forma: matchPattern(cleanText, DEFAULT_FORMA),
    balance: matchPattern(cleanText, DEFAULT_BALANCE),
    pesoMinG: peso,
    pesoMaxG: peso,
    dureza: matchPattern(cleanText, DEFAULT_DUREZA),
    superficie: matchPattern(cleanText, DEFAULT_SUPERFICIE),
    categoria,
    nucleo: extractNucleo(cleanText),
    cara: extractCara(cleanText),
    marco: extractMarco(cleanText),
    precioEur: currency === "EUR" ? priceNum : undefined,
    precioArs: currency === "ARS" ? priceNum : undefined,
    precioUsd: currency === "USD" ? priceNum : undefined,
    enStock: variant?.available ?? true,
    imagenPrincipalUrl: p.images[0]?.src,
    descripcionOficial: cleanText.slice(0, 4000),
    sourceUrl,
    rawData: {
      shopify_id: p.id,
      product_type: p.product_type,
      tags: p.tags,
      vendor: p.vendor,
    },
  };
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractYearFromTitle(title: string): number | undefined {
  const m = title.match(/\b(20\d{2})\b/);
  return m ? Number(m[1]) : undefined;
}

function matchPattern<T>(text: string, patterns: Array<[RegExp, T]>): T | undefined {
  for (const [re, value] of patterns) {
    if (re.test(text)) return value;
  }
  return undefined;
}

export function extractNucleo(text: string): string | undefined {
  const m = text.match(
    /\bn[úu]cleo\s+(?:de\s+)?([A-Za-z0-9 ]{3,30}?)(?=[,.;]|$| garantiza| aporta)/i,
  );
  return m ? m[1].trim() : undefined;
}

export function extractCara(text: string): string | undefined {
  const a = text.match(/\b([A-Z][A-Za-z0-9]+\s+\d+K)\s+en\s+las?\s+caras?\b/i);
  if (a) return a[1].trim();
  const b = text.match(
    /\b(?:caras?\s+de\s+|caras?:?\s+)([A-Za-z0-9 ]{3,40}?)(?=[,.;]|$| ofrec| aport| garantiz)/i,
  );
  return b ? b[1].trim() : undefined;
}

export function extractMarco(text: string): string | undefined {
  const m = text.match(
    /\bmarco\s+(?:de\s+|en\s+)?([A-Za-z0-9 ]{3,30}?)(?=[,.;]|$| aport| garantiz| confier)/i,
  );
  return m ? m[1].trim() : undefined;
}

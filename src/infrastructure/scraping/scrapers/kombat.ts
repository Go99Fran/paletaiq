/**
 * Kombat Padel (PrestaShop, marca argentina). Portado de ballgames.
 *
 * Estrategia: HTML server-rendered (PrestaShop). Specs narrados en la
 * descripción ("forma de diamante", "balance alto", "núcleo Blue EVA").
 * Listing en /es/palas-padel con paginación PrestaShop estándar.
 */
import * as cheerio from "cheerio";
import type { SourceSpec } from "../scrape-runner";
import type { ParsedPaddle } from "../types";

const LISTING_URL = "https://kombatpadel.com.ar/es/palas-padel";

export const kombatSource: SourceSpec = {
  source: "kombat",
  brandSlug: "kombat",

  async discoverUrls(client, opts) {
    await client.checkRobots(LISTING_URL);

    const urls = new Set<string>();
    const firstHtml = await client.fetchHtml(LISTING_URL, { noCache: opts.noCache });
    const first = parseListing(firstHtml);
    first.productUrls.forEach((u) => urls.add(u));

    // Detectar páginas adicionales
    const pageNumbers = new Set<number>();
    for (const u of first.pageUrls) {
      const m = u.match(/[?&]page=(\d+)/);
      if (m) pageNumbers.add(Number(m[1]));
    }
    const maxPage = Math.max(1, ...pageNumbers);

    for (let page = 2; page <= maxPage; page++) {
      const url = `${LISTING_URL}?page=${page}`;
      const html = await client.fetchHtml(url, { noCache: opts.noCache });
      const { productUrls } = parseListing(html);
      productUrls.forEach((u) => urls.add(u));
      if (opts.limit && urls.size >= opts.limit) break;
    }

    return Array.from(urls);
  },

  parseDetail,
};

function parseListing(html: string): {
  productUrls: string[];
  pageUrls: string[];
} {
  const resolvedHtml = unwrapPrestashopListing(html);
  const $ = cheerio.load(resolvedHtml);

  const productUrls: string[] = [];
  const seen = new Set<string>();
  $("a").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    // Kombat usa rutas tipo /es/palas-padel/kombat-xxx o /es/inicio/kombat-xxx
    if (
      /^https:\/\/kombatpadel\.com\.ar\/es\/(?:palas-padel|inicio)\/[a-z0-9-]+$/i.test(
        href,
      ) &&
      !seen.has(href)
    ) {
      seen.add(href);
      productUrls.push(href);
    }
  });

  const pageUrls: string[] = [];
  $(".page-list a, .pagination a").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (href && !pageUrls.includes(href)) pageUrls.push(href);
  });

  return { productUrls, pageUrls };
}

function unwrapPrestashopListing(body: string): string {
  try {
    const parsed = JSON.parse(body) as {
      rendered_products?: string;
      rendered_products_top?: string;
    };
    if (parsed.rendered_products || parsed.rendered_products_top) {
      return `${parsed.rendered_products_top ?? ""}\n${parsed.rendered_products ?? ""}`;
    }
  } catch {
    // HTML normal, seguir como está.
  }
  return body;
}

const FORMA_PATTERNS: Array<[RegExp, ParsedPaddle["forma"]]> = [
  [/\bforma\s+de\s+diamante\b/i, "diamante"],
  [/\bmolde\s+en\s+forma\s+de\s+diamante\b/i, "diamante"],
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
  [/\bdureza\s+media\b/i, "media"],
  [/\bdureza\s+blanda\b/i, "blanda"],
  [/\bdureza\s+dura\b/i, "dura"],
];

const NIVEL_FROM_TITLE: Array<[RegExp, ParsedPaddle["categoria"]]> = [
  [/\bPRO\b/i, "pro"],
  [/\bELITE\b/i, "avanzado"],
  [/\bJUNIOR\b/i, "junior"],
];

function parseDetail(html: string, url: string): ParsedPaddle {
  const $ = cheerio.load(html);

  const nombre =
    $("h1.page-title span").first().text().trim() ||
    $('h1[itemprop="name"]').first().text().trim() ||
    $("h1").first().text().trim();
  if (!nombre) throw new Error(`Sin H1: ${url}`);

  const slugRaw = extractSlugFromUrl(url);

  // PrestaShop: precio en .current-price
  const priceText = $(".current-price").first().text().trim();
  const precioArs = parsePriceArs(priceText);

  // Descripción larga (sin tabs separados como Bullpadel)
  const productDesc =
    $("#description").first().text().trim() ||
    $(".product-description").first().text().trim() ||
    $(".product-description-short").first().text().trim() ||
    "";
  const metaDesc = $('meta[name="description"]').attr("content") ?? "";

  const text = [productDesc, metaDesc].join(" ").replace(/\s+/g, " ");

  const forma = matchPattern(text, FORMA_PATTERNS);
  const balance = matchPattern(text, BALANCE_PATTERNS);
  const dureza = matchPattern(text, DUREZA_PATTERNS);

  const nucleo = extractNucleo(text);
  const cara = extractCara(text);
  const superficie = extractSuperficie(text);

  const categoria = matchPattern(nombre, NIVEL_FROM_TITLE);

  // Imágenes — PrestaShop usa selectors variados, busca todas las del CDN propio
  const imagenesUrl: string[] = [];
  const seenImg = new Set<string>();
  // Kombat usa rutas tipo `/1470-home_default/kombat-teide-25.jpg`. Filtramos
  // las que tengan slug coincidente con el de la pala actual para evitar
  // que se cuelen imágenes de productos relacionados (otras palas, mochilas).
  const slugForImages = slugRaw.toLowerCase();
  $("img").each((_, el) => {
    const src = $(el).attr("src") || "";
    if (!src.includes("kombatpadel.com.ar")) return;
    if (!/\/\d+-(home|large|medium|cart)_default\//.test(src)) return;
    if (seenImg.has(src)) return;
    // Solo imágenes cuyo filename incluya el slug de la pala actual.
    const lower = src.toLowerCase();
    if (lower.includes(slugForImages) || lower.includes(`kombat-${slugForImages}`)) {
      seenImg.add(src);
      imagenesUrl.push(src);
    }
  });
  const promoted = Array.from(
    new Set(imagenesUrl.map((u) => u.replace("home_default", "large_default"))),
  );

  return {
    slugRaw,
    nombre,
    forma,
    balance,
    dureza,
    categoria,
    nucleo,
    cara,
    superficie,
    precioArs,
    enStock: precioArs !== undefined,
    imagenPrincipalUrl: promoted[0],
    descripcionOficial: productDesc.slice(0, 4000),
    sourceUrl: url,
    rawData: { meta_description: metaDesc, imagenes_url: promoted },
  };
}

function extractSlugFromUrl(url: string): string {
  // /es/palas-padel/kombat-teide-25 → teide-25
  const m = url.match(/\/(?:palas-padel|inicio)\/kombat-([^/]+?)(?:\?|$)/i);
  if (m) return m[1];
  const last = url.split("/").pop() ?? "";
  return last.replace(/^kombat-/i, "").replace(/\?.*$/, "");
}

function parsePriceArs(text: string): number | undefined {
  if (!text) return undefined;
  // "$ 360.000" o "$360.000,00" — formato AR usa . para miles, , para decimales
  const cleaned = text.replace(/[^\d.,]/g, "");
  if (!cleaned) return undefined;
  // Si tiene coma decimal: "360.000,50" → 360000.50
  if (cleaned.includes(",")) {
    const [intPart, decPart] = cleaned.split(",");
    return Number(`${intPart.replace(/\./g, "")}.${decPart}`);
  }
  // Sin coma: "360.000" (mil-separator AR) → 360000
  return Number(cleaned.replace(/\./g, ""));
}

function matchPattern<T>(text: string, patterns: Array<[RegExp, T]>): T | undefined {
  for (const [re, value] of patterns) if (re.test(text)) return value;
  return undefined;
}

function extractNucleo(text: string): string | undefined {
  // "núcleo Blue EVA", "núcleo de FOAM HR3"
  const m = text.match(
    /\bn[úu]cleo\s+(?:de\s+)?([A-Za-z0-9 ]{3,30}?)(?=[,.;]|$| garantiza| proporciona| aporta| de alta)/i,
  );
  return m ? m[1].trim() : undefined;
}

function extractCara(text: string): string | undefined {
  // "planos de carbono Blue 18K"
  const m = text.match(
    /\bplanos?\s+de\s+([A-Za-z0-9 ]{3,40}?)(?=[,.;]|$| aport| garantiz)/i,
  );
  if (m) return m[1].trim();
  // "fibra de carbono"
  const m2 = text.match(/\bfibra\s+de\s+([A-Za-z0-9 ]{3,30}?)(?=[,.;]| garantiza)/i);
  return m2 ? m2[1].trim() : undefined;
}

function extractSuperficie(text: string): ParsedPaddle["superficie"] {
  if (/\bsuperficie\s+rugosa\b/i.test(text)) return "rugosa";
  if (/\bsuperficie\s+lisa\b/i.test(text)) return "lisa";
  return undefined;
}

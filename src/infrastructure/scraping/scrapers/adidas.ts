/**
 * Adidas Padel Argentina (WooCommerce). Portado de ballgames.
 *
 * Source: adidaspadelargentina.com (no es adidas.com global, que es SPA con anti-bot).
 * Esta tienda es WooCommerce con HTML server-rendered. Specs vienen narrados,
 * sin tabla estructurada — best-effort regex. Categorías/tags WooCommerce
 * los aprovechamos para inferir nivel y categoría.
 */
import * as cheerio from "cheerio";
import type { SourceSpec } from "../scrape-runner";
import type { ParsedPaddle } from "../types";

const LISTING_URL =
  "https://www.adidaspadelargentina.com/categoria-producto/paletas/";

export const adidasSource: SourceSpec = {
  source: "adidas",
  brandSlug: "adidas",

  async discoverUrls(client, opts) {
    await client.checkRobots(LISTING_URL);

    const urls = new Set<string>();
    // WooCommerce: paginación con /page/N/. 404 indica fin de paginación.
    for (let page = 1; page <= 6; page++) {
      const url = page === 1 ? LISTING_URL : `${LISTING_URL}page/${page}/`;
      let html: string;
      try {
        html = await client.fetchHtml(url, { noCache: opts.noCache });
      } catch (e) {
        if (e instanceof Error && e.message.includes("HTTP 404")) break;
        throw e;
      }
      const { productUrls } = parseListing(html);
      const before = urls.size;
      productUrls.forEach((u) => urls.add(u));
      if (urls.size === before) break;
      if (opts.limit && urls.size >= opts.limit) break;
    }

    return Array.from(urls);
  },

  parseDetail,
};

function parseListing(html: string): { productUrls: string[]; pageUrls: string[] } {
  const $ = cheerio.load(html);
  const urls = new Set<string>();
  $("a").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (
      /^https:\/\/www\.adidaspadelargentina\.com\/producto\/[a-z0-9-]+\/?$/i.test(
        href,
      ) &&
      !urls.has(href)
    ) {
      urls.add(href);
    }
  });

  const pageUrls: string[] = [];
  $("a.page-numbers, .nav-links a").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (
      href &&
      href.includes("/categoria-producto/paletas") &&
      !pageUrls.includes(href)
    ) {
      pageUrls.push(href);
    }
  });

  return { productUrls: Array.from(urls), pageUrls };
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
  [/\b(?:soft|blando|blanda)\b/i, "blanda"],
  [/\b(?:medium|medio|media)\s+(?:eva|foam|core)\b/i, "media"],
  [/\b(?:hard|duro|dura)\b/i, "dura"],
];

function parseDetail(html: string, url: string): ParsedPaddle {
  const $ = cheerio.load(html);

  const nombre = $("h1").first().text().trim();
  if (!nombre) throw new Error(`Sin H1: ${url}`);

  const slugRaw = extractSlugFromUrl(url);

  // WooCommerce price — el `<ins>` tiene el precio "actual" si hay sale, si no `.amount` simple
  const priceText =
    $("p.price ins .woocommerce-Price-amount").first().text().trim() ||
    $("p.price .woocommerce-Price-amount").first().text().trim() ||
    $(".woocommerce-Price-amount").first().text().trim();
  const precioArs = parsePriceArs(priceText);

  // Descripción
  const productDesc =
    $(".woocommerce-product-details__short-description").first().text().trim() ||
    $('[itemprop="description"]').first().text().trim() ||
    $("#tab-description").first().text().trim() ||
    "";
  const metaDesc = $('meta[name="description"]').attr("content") ?? "";
  const text = [productDesc, metaDesc].join(" ").replace(/\s+/g, " ");

  const forma = matchPattern(text, FORMA_PATTERNS);
  const balance = matchPattern(text, BALANCE_PATTERNS);
  const dureza = matchPattern(text, DUREZA_PATTERNS);

  // Categorías de WooCommerce → tags
  const wooTags: string[] = [];
  let categoriaFromWoo: ParsedPaddle["categoria"] | undefined;
  $(".posted_in a, .product_meta a").each((_, el) => {
    const t = $(el).text().trim().toLowerCase();
    if (t) wooTags.push(t);
    if (/\bpro\b/i.test(t)) categoriaFromWoo = "pro";
    else if (/\bteam\b/i.test(t) && !categoriaFromWoo) categoriaFromWoo = "avanzado";
    else if (/\bcontrol\b|\blight\b/i.test(t) && !categoriaFromWoo)
      categoriaFromWoo = "intermedio";
    else if (/\bjunior\b|\bkid/i.test(t) && !categoriaFromWoo)
      categoriaFromWoo = "junior";
  });

  const ano = extractYearFromText(`${nombre} ${wooTags.join(" ")}`);

  // Imágenes WooCommerce
  const imagenesUrl: string[] = [];
  const seenImg = new Set<string>();
  $(".woocommerce-product-gallery__image img, .wp-post-image, img").each(
    (_, el) => {
      const src =
        $(el).attr("data-large_image") ||
        $(el).attr("data-src") ||
        $(el).attr("src") ||
        "";
      if (
        /adidaspadelargentina\.com\/wp-content\/uploads\//.test(src) &&
        !seenImg.has(src)
      ) {
        seenImg.add(src);
        imagenesUrl.push(src);
      }
    },
  );

  return {
    slugRaw,
    nombre,
    ano,
    forma,
    balance,
    dureza,
    categoria: categoriaFromWoo,
    nucleo: extractNucleo(text),
    cara: extractCara(text),
    precioArs,
    enStock: precioArs !== undefined,
    imagenPrincipalUrl: imagenesUrl[0],
    descripcionOficial: productDesc.slice(0, 4000),
    sourceUrl: url,
    rawData: {
      woo_tags: wooTags,
      meta_description: metaDesc,
      imagenes_url: imagenesUrl,
    },
  };
}

function extractSlugFromUrl(url: string): string {
  const m = url.match(/\/producto\/([^/]+)\/?$/);
  if (!m) return url.split("/").filter(Boolean).pop() ?? "";
  return m[1].replace(/^adidas-/, "");
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

function extractYearFromText(s: string): number | undefined {
  const m = s.match(/\b(20\d{2})\b/);
  return m ? Number(m[1]) : undefined;
}

function matchPattern<T>(text: string, patterns: Array<[RegExp, T]>): T | undefined {
  for (const [re, value] of patterns) if (re.test(text)) return value;
  return undefined;
}

function extractNucleo(text: string): string | undefined {
  // "Soft Performance EVA", "Foam"
  const m = text.match(
    /\b((?:soft|hard|medium)\s+(?:performance\s+)?(?:eva|foam))\b/i,
  );
  if (m) return m[1].trim();
  const m2 = text.match(/\bn[úu]cleo\s+(?:de\s+)?([A-Za-z0-9 ]{3,30}?)(?=[,.;]|$)/i);
  return m2 ? m2[1].trim() : undefined;
}

function extractCara(text: string): string | undefined {
  // "Carbon Aluminized 16K", "Carbono 12K"
  const m = text.match(/\b((?:carbon|carbono)\s+(?:aluminized\s+)?\d+K)\b/i);
  if (m) return m[1].trim();
  return undefined;
}

/**
 * Black Crown (WooCommerce, marca española premium). Portado de ballgames.
 * Specs en formato "Forma: redonda  Peso: 355 a 370 grs ..."
 */
import * as cheerio from "cheerio";
import type { SourceSpec } from "../scrape-runner";
import type { ParsedPaddle } from "../types";

const LISTING_URL = "https://blackcrown.es/categoria-producto/palas-de-padel/";

export const blackcrownSource: SourceSpec = {
  source: "blackcrown",
  brandSlug: "blackcrown",

  async discoverUrls(client, opts) {
    await client.checkRobots(LISTING_URL);
    const urls = new Set<string>();
    for (let page = 1; page <= 5; page++) {
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

function parseListing(html: string): { productUrls: string[] } {
  const $ = cheerio.load(html);
  const urls = new Set<string>();
  $("a").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (
      /^https:\/\/blackcrown\.es\/product\/[a-z0-9-]+\/?$/i.test(href) &&
      !urls.has(href) &&
      !/camiseta|gorra|bolsa|mochila|grip|overgrip|protector/i.test(href)
    ) {
      urls.add(href);
    }
  });
  return { productUrls: Array.from(urls) };
}

const FORMA_MAP: Record<string, ParsedPaddle["forma"]> = {
  REDONDA: "redonda",
  LAGRIMA: "lagrima",
  LÁGRIMA: "lagrima",
  DIAMANTE: "diamante",
  HIBRIDA: "hibrida",
  HÍBRIDA: "hibrida",
};

const NIVEL_MAP: Record<string, ParsedPaddle["categoria"]> = {
  PRO: "pro",
  PROFESIONAL: "pro",
  AVANZADO: "avanzado",
  INTERMEDIO: "intermedio",
  INICIACION: "iniciacion",
};

function parseDetail(html: string, url: string): ParsedPaddle {
  const $ = cheerio.load(html);
  const nombre = $("h1").first().text().trim();
  if (!nombre) throw new Error(`Sin H1: ${url}`);

  const slugRaw = extractSlugFromUrl(url);

  const priceText = $(".woocommerce-Price-amount").first().text().trim();
  const precioEur = parsePriceEur(priceText);

  const productDesc =
    $(".woocommerce-product-details__short-description").first().text().trim() ||
    $('[itemprop="description"]').first().text().trim() ||
    "";
  const metaDesc = $('meta[name="description"]').attr("content") ?? "";
  const text = `${productDesc} ${metaDesc} ${$("body").text()}`.replace(/\s+/g, " ");

  // Black Crown usa "Forma: X  Peso: Y a Z grs Núcleo exterior: ... Goma: ..."
  const formaRaw = (text.match(/\bForma:\s*([A-Za-zñáéíóú]+)/i) || [])[1];
  const peso = text.match(/\bPeso:\s*(\d{3})\s*a\s*(\d{3})/i);
  const balanceRaw = (text.match(/\bBalance:\s*([A-Za-z-]+)/i) || [])[1];
  const nivelRaw = (text.match(/\bNivel(?:\s+de\s+juego)?:\s*([A-Za-zñ]+)/i) || [])[1];
  const nucleo =
    (text.match(
      /\bGoma:\s*([A-Za-z0-9 ]{3,30}?)(?=\s+(?:Marco|Forma|Peso|Nivel)|$)/i,
    ) || [])[1]?.trim() ||
    (text.match(
      /\bNúcleo\s*(?:exterior)?:?\s*([A-Za-z0-9 ]{3,30}?)(?=\s+(?:Marco|Goma|Forma|Peso)|$)/i,
    ) || [])[1]?.trim();
  const cara = (text.match(
    /\bCara:\s*([A-Za-z0-9 ]{3,30}?)(?=\s+(?:Marco|Goma|Forma|Peso)|$)/i,
  ) || [])[1]?.trim();
  const marco = (text.match(
    /\bMarco(?:\s+tubular)?:?\s*([A-Za-z0-9 ]{3,30}?)(?=\s+(?:Núcleo|Goma|Cara|Forma|Peso)|$)/i,
  ) || [])[1]?.trim();

  const forma = formaRaw
    ? FORMA_MAP[formaRaw.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "")]
    : undefined;
  const balance: ParsedPaddle["balance"] = balanceRaw
    ? balanceRaw.toLowerCase().includes("alto")
      ? "alto"
      : balanceRaw.toLowerCase().includes("medio")
        ? "medio"
        : balanceRaw.toLowerCase().includes("bajo")
          ? "bajo"
          : undefined
    : undefined;
  const categoria = nivelRaw
    ? NIVEL_MAP[nivelRaw.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "")]
    : undefined;

  const ano = extractYearFromTitle(nombre);

  // Imágenes (CDN WooCommerce)
  const imagenesUrl: string[] = [];
  const seenImg = new Set<string>();
  $(".woocommerce-product-gallery__image img, .wp-post-image, img").each(
    (_, el) => {
      const src =
        $(el).attr("data-large_image") ||
        $(el).attr("data-src") ||
        $(el).attr("src") ||
        "";
      if (/blackcrown\.es\/wp-content\/uploads\//.test(src) && !seenImg.has(src)) {
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
    pesoMinG: peso ? Number(peso[1]) : undefined,
    pesoMaxG: peso ? Number(peso[2]) : undefined,
    categoria,
    nucleo,
    cara,
    marco,
    precioEur,
    enStock: precioEur !== undefined,
    imagenPrincipalUrl: imagenesUrl[0],
    descripcionOficial: productDesc.slice(0, 4000),
    sourceUrl: url,
    rawData: { meta_description: metaDesc, imagenes_url: imagenesUrl },
  };
}

function extractSlugFromUrl(url: string): string {
  const m = url.match(/\/product\/([^/?]+)\/?$/);
  return m ? m[1] : url.split("/").filter(Boolean).pop() ?? "";
}

function extractYearFromTitle(s: string): number | undefined {
  const m = s.match(/\b(20\d{2})\b/);
  return m ? Number(m[1]) : undefined;
}

function parsePriceEur(text: string): number | undefined {
  if (!text) return undefined;
  const cleaned = text.replace(/[^\d,]/g, "");
  if (!cleaned) return undefined;
  if (cleaned.includes(",")) {
    const [i, d] = cleaned.split(",");
    const v = Number(`${i}.${d}`);
    return v > 0 ? v : undefined;
  }
  const v = Number(cleaned);
  return v > 0 ? v : undefined;
}

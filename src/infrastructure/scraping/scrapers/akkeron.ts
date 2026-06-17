/**
 * Akkeron (WooCommerce, fabricación española en Madrid). Portado de ballgames.
 *
 * Específico: las palas tienen specs estructurados en formato narrativo
 * pero ordenados — "Forma Molde Redonda Peso 350-375grs Núcleo EV40 Black
 * Marco 100% Full Carbon Cara Carbono 3K Barniz X Balance Medio-Alto Nivel Pro"
 */
import * as cheerio from "cheerio";
import type { SourceSpec } from "../scrape-runner";
import type { ParsedPaddle } from "../types";

const LISTING_URL = "https://akkeron.com/palas-2025/";

export const akkeronSource: SourceSpec = {
  source: "akkeron",
  brandSlug: "akkeron",

  async discoverUrls(client, opts) {
    await client.checkRobots(LISTING_URL);
    const html = await client.fetchHtml(LISTING_URL, { noCache: opts.noCache });
    const { productUrls } = parseListing(html);
    if (opts.limit) return productUrls.slice(0, opts.limit);
    return productUrls;
  },

  parseDetail,
};

function parseListing(html: string): { productUrls: string[] } {
  const $ = cheerio.load(html);
  const urls = new Set<string>();
  $("a").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    // /tienda-akkeron-palas-de-padel/{categoria}/{slug}/
    if (
      /^https:\/\/akkeron\.com\/tienda-akkeron-palas-de-padel\/[a-z0-9_-]+\/[a-z0-9-]+\/?$/i.test(
        href,
      ) &&
      !urls.has(href) &&
      !/sin-categoria|cambio-a-barniz|loteria|personalizada/i.test(href)
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

const BALANCE_MAP: Record<string, ParsedPaddle["balance"]> = {
  BAJO: "bajo",
  MEDIO: "medio",
  "MEDIO-BAJO": "medio",
  "MEDIO-ALTO": "medio",
  ALTO: "alto",
};

const NIVEL_MAP: Record<string, ParsedPaddle["categoria"]> = {
  PRO: "pro",
  PROFESIONAL: "pro",
  AVANZADO: "avanzado",
  INTERMEDIO: "intermedio",
  INICIACION: "iniciacion",
  INICIACIÓN: "iniciacion",
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

  // Akkeron usa formato "Forma Molde {valor} Peso {valor} ..." sin separadores claros
  const formaRaw = (text.match(/\bForma(?:\s+Molde)?\s+([A-Za-zÁÉÍÓÚñáéíóú]+)/i) ||
    [])[1];
  const peso = text.match(/\bPeso\s+(\d{3})\s*-?\s*(\d{3})?\s*g/i) || [];
  const balanceRaw = (text.match(
    /\bBalance\s+([A-Za-z-]+(?:\s*-\s*[A-Za-z]+)?)/i,
  ) || [])[1];
  const nucleo = (text.match(
    /\bNúcleo\s+([A-Za-z0-9 ]{3,30}?)(?=\s+Marco|\s+Cara|\s+Barniz|$)/i,
  ) || [])[1]?.trim();
  const cara = (text.match(
    /\bCara\s+([A-Za-z0-9 ]{3,30}?)(?=\s+Barniz|\s+Balance|\s+Nivel|$)/i,
  ) || [])[1]?.trim();
  const marco = (text.match(
    /\bMarco\s+([A-Za-z0-9% ]{3,30}?)(?=\s+Cara|\s+Núcleo|\s+Barniz|$)/i,
  ) || [])[1]?.trim();
  const nivelRaw = (text.match(/\bNivel\s+([A-Za-zñáéíóú]+)/i) || [])[1];

  const forma = formaRaw
    ? FORMA_MAP[formaRaw.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "")]
    : undefined;
  const balance = balanceRaw ? BALANCE_MAP[balanceRaw.toUpperCase().trim()] : undefined;
  const pesoMinG = peso[1] ? Number(peso[1]) : undefined;
  const pesoMaxG = peso[2] ? Number(peso[2]) : pesoMinG;
  const categoria = nivelRaw
    ? NIVEL_MAP[nivelRaw.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "")]
    : undefined;

  // Año del slug (a25 → 2025)
  const ano = (() => {
    const m = nombre.toLowerCase().match(/\ba(\d{2})\b/);
    if (m) return 2000 + Number(m[1]);
    const y = nombre.match(/\b(20\d{2})\b/);
    return y ? Number(y[1]) : undefined;
  })();

  // Imágenes
  const imagenesUrl: string[] = [];
  const seenImg = new Set<string>();
  $(".woocommerce-product-gallery__image img, .wp-post-image, img").each(
    (_, el) => {
      const src =
        $(el).attr("data-large_image") ||
        $(el).attr("data-src") ||
        $(el).attr("src") ||
        "";
      if (/akkeron\.com\/wp-content\/uploads\//.test(src) && !seenImg.has(src)) {
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
    pesoMinG,
    pesoMaxG,
    categoria,
    nucleo,
    cara,
    marco,
    precioEur,
    enStock: precioEur !== undefined,
    imagenPrincipalUrl: imagenesUrl[0],
    descripcionOficial: productDesc.slice(0, 4000),
    sourceUrl: url,
    rawData: {
      meta_description: metaDesc,
      raw_specs_text: text.match(/Forma[\s\S]{0,300}/)?.[0]?.trim() ?? null,
      imagenes_url: imagenesUrl,
    },
  };
}

function extractSlugFromUrl(url: string): string {
  const m = url.match(/\/tienda-akkeron-palas-de-padel\/[^/]+\/([^/?]+)\/?/);
  return m ? m[1] : url.split("/").filter(Boolean).pop() ?? "";
}

function parsePriceEur(text: string): number | undefined {
  if (!text) return undefined;
  const cleaned = text.replace(/[^\d,]/g, "");
  if (!cleaned) return undefined;
  if (cleaned.includes(",")) {
    const [intPart, decPart] = cleaned.split(",");
    const v = Number(`${intPart}.${decPart}`);
    return v > 0 ? v : undefined;
  }
  const v = Number(cleaned);
  return v > 0 ? v : undefined;
}

/**
 * Bullpadel (PrestaShop). Portado de ballgames.
 * Parser de detalle de pala + listado. Funciones puras (HTML in, objeto out).
 */
import * as cheerio from "cheerio";
import type { SourceSpec } from "../scrape-runner";
import type { ParsedPaddle } from "../types";
import { mapTipoJuego } from "./tipo-juego";

const LISTING_URL = "https://www.bullpadel.com/es/28-palas";

export const bullpadelSource: SourceSpec = {
  source: "bullpadel",
  brandSlug: "bullpadel",

  async discoverUrls(client, opts) {
    await client.checkRobots(LISTING_URL);

    // Page 1
    const firstHtml = await client.fetchHtml(LISTING_URL, { noCache: opts.noCache });
    const first = parseListing(firstHtml);

    const allProducts = new Set<string>(first.productUrls);

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
      productUrls.forEach((u) => allProducts.add(u));
      // Si llegamos al limit, cortar para no fetchear de más
      if (opts.limit && allProducts.size >= opts.limit) break;
    }

    return Array.from(allProducts);
  },

  parseDetail,
};

type ListingResult = {
  productUrls: string[];
  /** URLs de las páginas de paginación (incluye la actual). */
  pageUrls: string[];
  /** "Hay 112 productos." */
  totalProducts?: number;
};

function parseListing(html: string): ListingResult {
  const resolvedHtml = unwrapPrestashopListing(html);
  const $ = cheerio.load(resolvedHtml);

  const productUrls: string[] = [];
  const productLinkPattern =
    /^https:\/\/www\.bullpadel\.com\/es\/[a-z0-9-]+\/\d+-pala-bullpadel-[a-z0-9-]+\.html$/i;
  $("a").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (productLinkPattern.test(href) && !productUrls.includes(href)) {
      productUrls.push(href);
    }
  });

  const pageUrls: string[] = [];
  const seen = new Set<string>();
  $(".page-list a, .pagination a").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (href.includes("/es/28-palas") && !seen.has(href)) {
      seen.add(href);
      pageUrls.push(href);
    }
  });

  const totalText = $(".total-products").first().text().trim();
  const totalMatch = totalText.match(/(\d+)/);
  const totalProducts = totalMatch ? Number(totalMatch[1]) : undefined;

  return { productUrls, pageUrls, totalProducts };
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

const FORMA_MAP: Record<string, ParsedPaddle["forma"]> = {
  REDONDA: "redonda",
  LAGRIMA: "lagrima",
  LÁGRIMA: "lagrima",
  DIAMANTE: "diamante",
  HIBRIDA: "hibrida",
  HÍBRIDA: "hibrida",
  // Bullpadel a veces dice "Geométrica" cuando es híbrida con cabeza ancha.
  GEOMETRICA: "hibrida",
  GEOMÉTRICA: "hibrida",
  GEO: "hibrida",
};

const DUREZA_MAP: Record<string, ParsedPaddle["dureza"]> = {
  BLANDO: "blanda",
  BLANDA: "blanda",
  INTERMEDIO: "media",
  MEDIA: "media",
  MEDIO: "media",
  DURO: "dura",
  DURA: "dura",
};

const NIVEL_MAP: Record<string, ParsedPaddle["categoria"]> = {
  PRO: "pro",
  PROFESIONAL: "pro",
  PROFESIONA: "pro",
  AVANZADO: "avanzado",
  AVANZADA: "avanzado",
  INTERMEDIO: "intermedio",
  INTERMEDIA: "intermedio",
  INICIACION: "iniciacion",
  INICIACIÓN: "iniciacion",
  PRINCIPIANTE: "iniciacion",
  JUNIOR: "junior",
};

function parseDetail(html: string, url: string): ParsedPaddle {
  const $ = cheerio.load(html);

  // Nombre
  const nombre =
    $("h1.product-detail-name").first().text().trim() ||
    $('h1[itemprop="name"]').first().text().trim() ||
    $("h1").first().text().trim();
  if (!nombre) throw new Error("No se encontró h1 con el nombre de la pala");

  // Slug crudo: del path final del URL.
  const slugRaw = extractSlugFromUrl(url);

  // Año: detectar 25 / 26 / 2026 al final del nombre
  const ano = extractYear(nombre);

  // Specs: combinamos meta description + descripción larga + <p> sueltos.
  const metaDesc = $('meta[name="description"]').attr("content") ?? "";
  const productDesc =
    $(".product-description").first().text() ||
    $("#description").first().text() ||
    $(".tab-pane#description").first().text() ||
    "";
  const ptext = $("p")
    .map((_, el) => $(el).text().trim())
    .get()
    .join("\n");

  const specs = {
    ...parseSpecsFromText([metaDesc, productDesc, ptext].join("\n")),
  };

  // Precio: .current-price (texto "179,99 €")
  const priceText = $(".current-price").first().text().trim();
  const precioEur = parsePriceEur(priceText);

  // Imágenes: gallery con `_default` o `_large_default`
  const imagenesUrl: string[] = [];
  const seenImg = new Set<string>();
  $("img").each((_, el) => {
    const src = $(el).attr("src") || "";
    if (
      src.includes("bullpadel.com") &&
      /home_default|large_default|product/.test(src) &&
      !seenImg.has(src)
    ) {
      seenImg.add(src);
      imagenesUrl.push(src);
    }
  });
  // Promover a large_default donde se pueda
  const promoted = imagenesUrl.map((u) => u.replace("home_default", "large_default"));
  const uniquePromoted = Array.from(new Set(promoted));
  const imagenPrincipalUrl = uniquePromoted[0];

  // Descripción larga: .product-description o #description
  const descripcionOficial =
    $(".product-description").first().text().trim() ||
    $("#description").first().text().trim() ||
    undefined;

  // Categoría inferida del path o del nivel
  const pathCategory = extractPathCategory(url);
  const nivelKey = (specs.NIVEL ?? "").toUpperCase().trim();
  const categoria = inferCategoria(pathCategory, nivelKey);

  // Forma — normaliza Title Case y diacríticos
  const formaRaw = (specs.FORMA ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .trim();
  const forma = formaRaw ? FORMA_MAP[formaRaw] : undefined;

  // Balance: puede venir como "MEDIO" (texto) o "25,4 cms" (numérico).
  const { balance, balanceCm } = parseBalance(specs.BALANCE);

  // Peso (rango)
  const { pesoMinG, pesoMaxG } = parseWeight(specs.PESO);

  // Dureza desde TACTO (normalizar diacríticos)
  const tactoKey = (specs.TACTO ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .trim();
  const dureza = tactoKey ? DUREZA_MAP[tactoKey] : undefined;

  // Núcleo / cara
  const nucleo = specs.NUCLEO;
  const cara = specs.CARA;

  // Tipo de juego (enum)
  const tipoJuego = mapTipoJuego(specs.ESTILO);

  return {
    slugRaw,
    nombre,
    ano,
    forma,
    balance,
    pesoMinG,
    pesoMaxG,
    dureza,
    categoria,
    tipoJuego,
    nucleo,
    cara,
    marco: undefined, // Bullpadel no separa "marco" del núcleo
    precioEur,
    enStock: precioEur !== undefined,
    imagenPrincipalUrl,
    descripcionOficial,
    sourceUrl: url,
    rawData: {
      specs,
      pathCategory,
      priceText,
      balance_cm: balanceCm,
      superficie: specs.SUPERFICIE,
      imagenes_url: uniquePromoted,
    },
  };
}

function extractSlugFromUrl(url: string): string {
  // /es/{cat}/{id}-pala-bullpadel-{slug}.html → {slug}
  const m = url.match(/\/(\d+)-pala-bullpadel-([^.]+)\.html/);
  if (!m) {
    const last = url.split("/").pop() ?? "";
    return last
      .replace(/^\d+-/, "")
      .replace(/^pala-bullpadel-/, "")
      .replace(/\.html$/, "");
  }
  return m[2];
}

function extractYear(name: string): number | undefined {
  const m = name.match(/(?<![\w])(\d{4}|\d{2})\s*$/);
  if (!m) return undefined;
  const n = Number(m[1]);
  if (n >= 2020 && n <= 2099) return n;
  if (n >= 20 && n <= 99) return 2000 + n;
  return undefined;
}

const KEY_ALIASES: Record<string, string[]> = {
  PESO: ["PESO", "PESO APROX"],
  PERFIL: ["PERFIL"],
  BALANCE: ["BALANCE"],
  FORMA: ["FORMA"],
  CARA: ["COMP EXT", "COMP EXTERIOR", "COMPOSICION EXTERIOR", "CARA"],
  NUCLEO: ["COMP INT", "COMP INTERIOR", "COMPOSICION INTERIOR", "NUCLEO"],
  NIVEL: ["JUGADOR", "JUGADORA", "NIVEL", "NIVEL DE JUEGO"],
  ESTILO: ["ESTILO", "TIPO DE JUEGO", "IDEAL PARA"],
  TACTO: ["TACTO", "DUREZA"],
  SUPERFICIE: ["SUPERFICIE DE JUEGO", "SUPERFICIE"],
  ACABADO: ["ACABADO RUGOSO", "ACABADO"],
};

function canonicalKey(rawKey: string): string | undefined {
  const normalized = rawKey
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  for (const [canonical, aliases] of Object.entries(KEY_ALIASES)) {
    if (aliases.includes(normalized)) return canonical;
  }
  return undefined;
}

function parseSpecsFromText(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = text.split(/[\r\n•·]+/);
  for (const raw of lines) {
    const line = raw.replace(/^[\s•·*\-–—]+/, "").trim();
    let m = line.match(/^([A-Za-zÁÉÍÓÚÑáéíóúñ. ]{3,40}):\s*(.+)$/);
    if (!m) m = line.match(/^([A-Za-zÁÉÍÓÚÑáéíóúñ. ]{3,40})\s*~\s*(.+)$/);
    if (!m) continue;

    const canonical = canonicalKey(m[1]);
    if (!canonical) continue;

    const value = m[2].trim().replace(/\.$/, "");
    if (!value) continue;

    if (!(canonical in out)) out[canonical] = value;
  }
  return out;
}

function parseBalance(spec: string | undefined): {
  balance?: ParsedPaddle["balance"];
  balanceCm?: number;
} {
  if (!spec) return {};
  const upper = spec.toUpperCase();
  if (upper.includes("ALTO")) return { balance: "alto" };
  if (upper.includes("BAJO")) return { balance: "bajo" };
  if (upper.includes("MEDIO")) return { balance: "medio" };

  const cmMatch = spec.match(/(\d+)[,.]?(\d*)\s*cm/i);
  if (cmMatch) {
    const intPart = Number(cmMatch[1]);
    const decPart = cmMatch[2] ? Number(`0.${cmMatch[2]}`) : 0;
    const cm = intPart + decPart;
    let balance: ParsedPaddle["balance"];
    if (cm < 25) balance = "bajo";
    else if (cm <= 26) balance = "medio";
    else balance = "alto";
    return { balance, balanceCm: cm };
  }

  return {};
}

function parsePriceEur(text: string): number | undefined {
  if (!text) return undefined;
  const m = text.match(/([\d.]+),(\d{2})/);
  if (!m) return undefined;
  const intPart = m[1].replace(/\./g, "");
  return Number(`${intPart}.${m[2]}`);
}

function parseWeight(spec: string | undefined): {
  pesoMinG?: number;
  pesoMaxG?: number;
} {
  if (!spec) return {};
  const range = spec.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (range) {
    return { pesoMinG: Number(range[1]), pesoMaxG: Number(range[2]) };
  }
  const single = spec.match(/(\d+)/);
  if (single) {
    const n = Number(single[1]);
    return { pesoMinG: n, pesoMaxG: n };
  }
  return {};
}

function extractPathCategory(url: string): string | undefined {
  const m = url.match(/\/es\/([^/]+)\/\d+-pala-/);
  return m ? m[1] : undefined;
}

function inferCategoria(
  pathCategory: string | undefined,
  nivelKey: string,
): ParsedPaddle["categoria"] | undefined {
  const cleanKey = nivelKey.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  const fromNivel = cleanKey ? NIVEL_MAP[cleanKey] : undefined;
  if (fromNivel) return fromNivel;

  if (!pathCategory) return undefined;
  const p = pathCategory.toLowerCase();
  if (p.includes("pro-line") || p.includes("ltd")) return "pro";
  if (p.includes("performance") || p.includes("tour")) return "avanzado";
  if (p.includes("next") || p.includes("cloud")) return "intermedio";
  if (p.includes("junior")) return "junior";
  return undefined;
}

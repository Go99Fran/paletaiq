/**
 * Fuentes Shopify (portadas de ballgames): cada marca instancia el adapter
 * genérico con su config. Vairo y Drop Shot AR publican precios en ARS.
 */
import type { SourceSpec } from "../scrape-runner";
import {
  parseShopifyDetail,
  parseShopifyListing,
  type ShopifyConfig,
} from "./shopify.parser";

function shopifySource(args: {
  source: string;
  brandSlug: string;
  listingUrl: string;
  productsBaseUrl: string;
  config: ShopifyConfig;
  paginated?: boolean;
}): SourceSpec {
  return {
    source: args.source,
    brandSlug: args.brandSlug,

    async discoverUrls(client, opts) {
      await client.checkRobots(args.listingUrl);
      const handles = new Set<string>();

      if (args.paginated) {
        for (let page = 1; page <= 10; page++) {
          const url = `${args.listingUrl}&page=${page}`;
          const json = await client.fetchBody(url, { noCache: opts.noCache });
          const parsed = parseShopifyListing(json, args.config);
          if (parsed.handles.length === 0) break;
          parsed.handles.forEach((h) => handles.add(h));
          if (opts.limit && handles.size >= opts.limit) break;
        }
      } else {
        const json = await client.fetchBody(args.listingUrl, { noCache: opts.noCache });
        parseShopifyListing(json, args.config).handles.forEach((h) => handles.add(h));
      }

      return Array.from(handles).map((h) => `${args.productsBaseUrl}/${h}.json`);
    },

    parseDetail: (body, url) => parseShopifyDetail(body, url, args.config),
  };
}

export const siuxSource = shopifySource({
  source: "siux",
  brandSlug: "siux",
  listingUrl: "https://www.siuxpadel.com/collections/palas/products.json?limit=250",
  productsBaseUrl: "https://www.siuxpadel.com/products",
  config: {
    stripHandlePrefix: /^siux-/,
    nivelFromTitle: [
      [/\bPRO\b/i, "pro"],
      [/\bELITE\b/i, "avanzado"],
      [/\bGO\b/i, "intermedio"],
      [/\bLITE\b/i, "intermedio"],
      [/\bPLAY\b/i, "iniciacion"],
    ],
    currency: "EUR",
  },
});

export const noxSource = shopifySource({
  source: "nox",
  brandSlug: "nox",
  listingUrl:
    "https://www.noxsport.com/collections/palas-de-padel-nox/products.json?limit=250",
  productsBaseUrl: "https://www.noxsport.com/products",
  paginated: true,
  config: {
    stripHandlePrefix: /^pala-/,
    nivelFromTitle: [
      [/\bSIGNATURE\b/i, "pro"],
      [/\bAT10\b/i, "pro"],
      [/\bLUXURY\b/i, "pro"],
      [/\bEXCLUSIVE\b/i, "avanzado"],
      [/\bCLASSIC\b/i, "avanzado"],
      [/\bADVANCE\b/i, "intermedio"],
      [/\bESSENTIAL\b/i, "intermedio"],
      [/\bULTRALIGHT\b/i, "iniciacion"],
      [/\bJR\b/i, "junior"],
    ],
    currency: "EUR",
  },
});

export const vairoSource = shopifySource({
  source: "vairo",
  brandSlug: "vairo",
  listingUrl: "https://padel.vairo.com/collections/all/products.json?limit=250",
  productsBaseUrl: "https://padel.vairo.com/products",
  config: {
    productFilter: (p) => {
      if (["Indumentaria", "Accesorios", "Lentes"].includes(p.product_type)) return false;
      if (p.product_type === "Palas") return true;
      return p.tags.some((t) => /palas?\s+de\s+padel/i.test(t));
    },
    nivelFromTitle: [
      [/\bPRO\b/i, "pro"],
      [/\bPREMIUM\b/i, "avanzado"],
      [/\bADVANCED\b/i, "avanzado"],
      [/\bCARBON\b/i, "intermedio"],
      [/\bGRAPHENO\b/i, "intermedio"],
    ],
    currency: "ARS",
  },
});

export const starvieSource = shopifySource({
  source: "starvie",
  brandSlug: "starvie",
  listingUrl: "https://starvie.com/collections/palas/products.json?limit=250",
  productsBaseUrl: "https://starvie.com/products",
  config: {
    nivelFromTitle: [
      [/\bPRO\b/i, "pro"],
      [/\bDPR\b/i, "pro"],
      [/\bSOFT\b/i, "intermedio"],
      [/\bjr|junior\b/i, "junior"],
    ],
    currency: "EUR",
  },
});

export const dropshotSource = shopifySource({
  source: "dropshot",
  brandSlug: "dropshot",
  listingUrl: "https://ar.dropshotstore.com/collections/all-levels/products.json?limit=250",
  productsBaseUrl: "https://ar.dropshotstore.com/products",
  config: {
    stripHandlePrefix: /^pala-/,
    productFilter: (p) => /^PALA\s+DROP\s+SHOT/i.test(p.title),
    nivelFromTitle: [
      [/\bPRO\b/i, "pro"],
      [/\bATTACK\b/i, "avanzado"],
      [/\bCONTROL\b/i, "intermedio"],
    ],
    currency: "ARS",
  },
});

import type { SourceSpec } from "../scrape-runner";
import {
  parseTiendanubeDetail,
  parseTiendanubeListing,
  type TiendanubeConfig,
} from "./tiendanube.parser";

const LISTING_URL = "https://www.royalpadel.com.ar/productos/";

const ROYAL_CONFIG: TiendanubeConfig = {
  domain: "www.royalpadel.com.ar",
  stripRandomSuffix: true,
  excludeSlugs: [
    /^cubregrip/i,
    /^tubo-de-pelota/i,
    /^medias/i,
    /^protectores/i,
    /^bolsa/i,
    /^paletero/i,
    /^remera/i,
    /^buzo/i,
    /^termo/i,
    /^botella/i,
    /^pelota/i,
    /^grip/i,
    /^overgrip/i,
    /^muñequera/i,
    /^banda/i,
  ],
  nivelFromTitle: [
    [/\bPRO\b/i, "pro"],
    [/\bELITE\b/i, "avanzado"],
    [/\bKIDS\b/i, "junior"],
    [/\bJUNIOR\b/i, "junior"],
  ],
};

export const royalSource: SourceSpec = {
  source: "royal",
  brandSlug: "royal",

  async discoverUrls(client, opts) {
    await client.checkRobots(LISTING_URL);

    const urls = new Set<string>();
    for (let page = 1; page <= 8; page++) {
      const url = page === 1 ? LISTING_URL : `${LISTING_URL}?mpage=${page}`;
      const html = await client.fetchHtml(url, { noCache: opts.noCache });
      const { productUrls } = parseTiendanubeListing(html, ROYAL_CONFIG);
      const before = urls.size;
      productUrls.forEach((productUrl) => urls.add(productUrl));
      if (urls.size === before) break;
      if (opts.limit && urls.size >= opts.limit) break;
    }

    return Array.from(urls);
  },

  parseDetail: (html, url) => parseTiendanubeDetail(html, url, ROYAL_CONFIG),
};

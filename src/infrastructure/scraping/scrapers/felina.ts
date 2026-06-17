import type { SourceSpec } from "../scrape-runner";
import {
  parseTiendanubeDetail,
  parseTiendanubeListing,
  type TiendanubeConfig,
} from "./tiendanube.parser";

const LISTING_URL = "https://felinapadel.com.ar/palas/";

const FELINA_CONFIG: TiendanubeConfig = {
  domain: "felinapadel.com.ar",
  stripRandomSuffix: true,
  excludeSlugs: [/^paletero/i, /^bolsa/i, /^termo/i, /^remera/i, /^grip/i, /^overgrip/i],
  nivelFromTitle: [],
};

export const felinaSource: SourceSpec = {
  source: "felina",
  brandSlug: "felina",

  async discoverUrls(client, opts) {
    await client.checkRobots(LISTING_URL);

    const urls = new Set<string>();
    for (let page = 1; page <= 6; page++) {
      const url = page === 1 ? LISTING_URL : `${LISTING_URL}?mpage=${page}`;
      const html = await client.fetchHtml(url, { noCache: opts.noCache });
      const { productUrls } = parseTiendanubeListing(html, FELINA_CONFIG);
      const before = urls.size;
      productUrls.forEach((productUrl) => urls.add(productUrl));
      if (urls.size === before) break;
      if (opts.limit && urls.size >= opts.limit) break;
    }

    return Array.from(urls);
  },

  parseDetail: (html, url) => parseTiendanubeDetail(html, url, FELINA_CONFIG),
};

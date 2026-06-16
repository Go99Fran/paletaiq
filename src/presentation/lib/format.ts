/** Formatea un precio en la moneda dada para el locale activo. */
export function formatPrice(value: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale === "es" ? "es-AR" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === "es" ? "es-AR" : "en-US", {
    dateStyle: "medium",
  }).format(date);
}

/** Umbral (días) a partir del cual un precio scrapeado se considera desactualizado. */
export const STALE_PRICE_DAYS = 14;

/** True si la fecha de scrapeo supera el umbral de frescura (BR-07). */
export function isPriceStale(scrapedAt: Date, thresholdDays = STALE_PRICE_DAYS): boolean {
  const ageMs = Date.now() - new Date(scrapedAt).getTime();
  return ageMs > thresholdDays * 24 * 60 * 60 * 1000;
}

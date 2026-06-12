/** Precio vigente de una paleta en una tienda. */
export interface CurrentPrice {
  paddleId: number;
  storeId: number;
  storeName: string;
  storeSlug: string;
  price: number;
  currency: string;
  inStock: boolean;
  productUrl: string | null;
  scrapedAt: Date;
}

/** Punto del historial de precios (para el gráfico / alertas a futuro). */
export interface PricePoint {
  storeId: number;
  storeName: string;
  price: number;
  currency: string;
  inStock: boolean;
  scrapedAt: Date;
}

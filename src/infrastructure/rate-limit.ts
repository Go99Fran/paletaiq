import { headers } from "next/headers";

/**
 * Rate limiter simple en memoria (ventana deslizante por clave). Protege los server
 * actions que disparan llamadas pagas a la IA contra abuso básico / denial-of-wallet.
 * No es distribuido: con varias instancias cada proceso tiene su ventana, pero igual
 * sube mucho el costo de abusar. Sin dependencias externas (anti sobre-ingeniería).
 */
const hits = new Map<string, number[]>();

export interface RateLimitResult {
  ok: boolean;
  retryAfterMs: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    hits.set(key, recent);
    return { ok: false, retryAfterMs: windowMs - (now - recent[0]) };
  }

  recent.push(now);
  hits.set(key, recent);

  // Limpieza oportunista para que el Map no crezca sin límite.
  if (hits.size > 5000) {
    for (const [k, ts] of hits) {
      if (ts.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }

  return { ok: true, retryAfterMs: 0 };
}

/** Mejor estimación de IP del cliente desde los headers del proxy (Vercel/Railway). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

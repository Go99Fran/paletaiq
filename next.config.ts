import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Hosts reales de los CDNs de marcas/tiendas que sirven imágenes de paletas.
// Si una fuente nueva trae imágenes de otro host, agregarlo acá (sino Next
// rechaza la optimización y la imagen no carga).
const IMAGE_HOSTS = [
  "cdn.shopify.com",
  "www.adidaspadelargentina.com",
  "www.bullpadel.com",
  "blackcrown.es",
  "kombatpadel.com.ar",
  "acdn-us.mitiendanube.com",
  "media.babolat.com",
  "akkeron.com",
  "www.starvie.com",
  "siux.com",
  "www.nox.com",
  "vairo.com.ar",
];

// Headers de seguridad base, no disruptivos (sin CSP estricta todavía para no
// romper estilos inline ni el optimizador de imágenes).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: IMAGE_HOSTS.map((hostname) => ({ protocol: "https" as const, hostname })),
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);

import { Link } from "@/i18n/navigation";

/**
 * Ícono de marca PaletaIQ: una paleta de pádel estilizada (cara con sus huecos
 * característicos + mango) sobre el gradiente teal→lima. SVG, escala a cualquier
 * tamaño. `gradientId` debe ser único por instancia para no colisionar en el DOM.
 */
export function PaletaIcon({
  size = 32,
  className,
  gradientId = "paleta-grad",
}: {
  size?: number;
  className?: string;
  gradientId?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="PaletaIQ"
    >
      <defs>
        <linearGradient id={gradientId} x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--primary, #0ea5a3)" />
          <stop offset="1" stopColor="var(--tertiary, #84cc16)" />
        </linearGradient>
      </defs>
      {/* Cabeza de la paleta */}
      <path
        d="M24 3C14.6 3 7 10.4 7 19.6c0 7.1 4.6 13.2 11 15.6V41a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-5.8c6.4-2.4 11-8.5 11-15.6C41 10.4 33.4 3 24 3Z"
        fill={`url(#${gradientId})`}
      />
      {/* Mango */}
      <rect x="21.5" y="40" width="5" height="5" rx="1.5" fill={`url(#${gradientId})`} />
      {/* Huecos de la cara (patrón de paleta) */}
      <circle cx="24" cy="13" r="2.1" fill="#fff" fillOpacity="0.92" />
      <circle cx="17.5" cy="19" r="2.1" fill="#fff" fillOpacity="0.92" />
      <circle cx="30.5" cy="19" r="2.1" fill="#fff" fillOpacity="0.92" />
      <circle cx="24" cy="25" r="2.1" fill="#fff" fillOpacity="0.92" />
      <circle cx="17.5" cy="31" r="2.1" fill="#fff" fillOpacity="0.92" />
      <circle cx="30.5" cy="31" r="2.1" fill="#fff" fillOpacity="0.92" />
    </svg>
  );
}

/**
 * Logo completo: ícono + wordmark "PaletaIQ" (con IQ en gradiente). Es un link al
 * home. Estándar de marca usado en header y footer.
 */
export function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  const iconSize = size === "sm" ? 28 : 32;
  const textClass = size === "sm" ? "text-base" : "text-lg";

  return (
    <Link href="/" className="group inline-flex items-center gap-2 font-bold text-text">
      <PaletaIcon
        size={iconSize}
        gradientId="logo-grad"
        className="transition-transform group-hover:scale-105"
      />
      <span className={textClass}>
        Paleta<span className="text-gradient">IQ</span>
      </span>
    </Link>
  );
}

/**
 * Fondo animado de auroras (blobs de gradiente en movimiento) detrás de toda la app.
 * Server component: es puro CSS, sin JS en el cliente. Fijo y no interactivo.
 *
 * En mobile (<768px) el blur baja a 2xl y la opacidad ~-10% (clases sm: suben el
 * detalle en desktop) para cuidar la batería y evitar jank en gama baja.
 */

// Textura de ruido muy sutil (SVG fractal) sobre los blobs, para que no se vea plano.
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Velo base para suavizar el contraste de los blobs */}
      <div className="absolute inset-0 bg-background" />

      <div
        className="animate-blob absolute -left-32 -top-40 h-[42rem] w-[42rem] rounded-full opacity-40 blur-2xl sm:opacity-50 sm:blur-3xl"
        style={{ background: "radial-gradient(circle at 30% 30%, var(--aurora-1), transparent 65%)" }}
      />
      <div
        className="animate-blob absolute -right-40 top-10 h-[38rem] w-[38rem] rounded-full opacity-35 blur-2xl sm:opacity-45 sm:blur-3xl"
        style={{
          background: "radial-gradient(circle at 60% 40%, var(--aurora-3), transparent 65%)",
          animationDelay: "-7s",
        }}
      />
      <div
        className="animate-blob absolute bottom-[-12rem] left-1/3 h-[40rem] w-[40rem] rounded-full opacity-30 blur-2xl sm:opacity-40 sm:blur-3xl"
        style={{
          background: "radial-gradient(circle at 50% 50%, var(--aurora-2), transparent 65%)",
          animationDelay: "-14s",
        }}
      />
      <div
        className="animate-blob absolute right-1/4 top-1/2 h-[26rem] w-[26rem] rounded-full opacity-25 blur-2xl sm:opacity-30 sm:blur-3xl"
        style={{
          background: "radial-gradient(circle at 40% 60%, var(--aurora-4), transparent 65%)",
          animationDelay: "-3s",
        }}
      />
      {/* 5ta capa: más grande y mucho más lenta (30s), da profundidad de fondo. */}
      <div
        className="animate-blob absolute -bottom-40 right-[-10rem] h-[46rem] w-[46rem] rounded-full opacity-25 blur-2xl sm:opacity-35 sm:blur-3xl"
        style={{
          background: "radial-gradient(circle at 55% 45%, var(--aurora-4), transparent 68%)",
          animationDuration: "30s",
          animationDelay: "-10s",
        }}
      />

      {/* Grid sutil para textura tech */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(var(--text) 1px, transparent 1px), linear-gradient(90deg, var(--text) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Noise muy tenue para textura cinematográfica */}
      <div
        className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
        style={{ backgroundImage: NOISE, backgroundSize: "160px 160px" }}
      />
    </div>
  );
}

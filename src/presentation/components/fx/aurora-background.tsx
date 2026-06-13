/**
 * Fondo animado de auroras (blobs de gradiente en movimiento) detrás de toda la app.
 * Server component: es puro CSS, sin JS en el cliente. Fijo y no interactivo.
 */
export function AuroraBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Velo base para suavizar el contraste de los blobs */}
      <div className="absolute inset-0 bg-background" />

      <div
        className="absolute -left-32 -top-40 h-[42rem] w-[42rem] rounded-full opacity-50 blur-3xl animate-blob"
        style={{ background: "radial-gradient(circle at 30% 30%, var(--aurora-1), transparent 65%)" }}
      />
      <div
        className="absolute -right-40 top-10 h-[38rem] w-[38rem] rounded-full opacity-45 blur-3xl animate-blob"
        style={{
          background: "radial-gradient(circle at 60% 40%, var(--aurora-3), transparent 65%)",
          animationDelay: "-7s",
        }}
      />
      <div
        className="absolute bottom-[-12rem] left-1/3 h-[40rem] w-[40rem] rounded-full opacity-40 blur-3xl animate-blob"
        style={{
          background: "radial-gradient(circle at 50% 50%, var(--aurora-2), transparent 65%)",
          animationDelay: "-14s",
        }}
      />
      <div
        className="absolute right-1/4 top-1/2 h-[26rem] w-[26rem] rounded-full opacity-30 blur-3xl animate-blob"
        style={{
          background: "radial-gradient(circle at 40% 60%, var(--aurora-4), transparent 65%)",
          animationDelay: "-3s",
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
    </div>
  );
}

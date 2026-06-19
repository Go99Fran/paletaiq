import type { Paddle } from "./paddle.entity";

/**
 * Traduce las specs técnicas de una paleta a 4 sensaciones de juego (0–100) que
 * un comprador entiende sin jerga: potencia, control, manejo (manejabilidad) y
 * tolerancia (perdón en golpes descentrados). Heurística simple y explicable a
 * partir de forma, balance, dureza y peso. No pretende exactitud física, sino dar
 * una lectura comparativa coherente entre paletas.
 */
export interface PaddleFeel {
  power: number;
  control: number;
  maneuver: number;
  tolerance: number;
}

const clamp = (n: number) => Math.max(5, Math.min(100, Math.round(n)));

export function computePaddleFeel(paddle: Paddle): PaddleFeel {
  // Base neutra; cada spec empuja las barras en una dirección.
  let power = 50;
  let control = 50;
  let maneuver = 50;
  let tolerance = 50;

  // Forma: redonda = control/tolerancia; diamante = potencia; lágrima/híbrida = mixto.
  switch (paddle.shape) {
    case "round":
      control += 20; tolerance += 22; maneuver += 12; power -= 18;
      break;
    case "teardrop":
      power += 10; control += 6; tolerance += 4;
      break;
    case "diamond":
      power += 24; tolerance -= 20; control -= 10; maneuver -= 8;
      break;
    case "hybrid":
      power += 14; control += 2; tolerance -= 6;
      break;
  }

  // Balance: alto = potencia (y menos manejo); bajo = manejo/control.
  switch (paddle.balance) {
    case "high":
      power += 16; maneuver -= 16; control -= 6;
      break;
    case "low":
      maneuver += 16; control += 10; power -= 10;
      break;
  }

  // Dureza: dura = potencia con menos tolerancia; blanda = tolerancia/control.
  switch (paddle.hardness) {
    case "hard":
      power += 12; tolerance -= 12; control -= 4;
      break;
    case "soft":
      tolerance += 14; control += 8; power -= 8;
      break;
  }

  // Peso: más pesada = potencia/menos manejo; más liviana = manejo.
  const w = paddle.weightMax ?? paddle.weightMin;
  if (w !== null) {
    if (w >= 370) { power += 6; maneuver -= 8; }
    else if (w <= 360) { maneuver += 8; power -= 4; }
  }

  return {
    power: clamp(power),
    control: clamp(control),
    maneuver: clamp(maneuver),
    tolerance: clamp(tolerance),
  };
}

/** True si hay specs suficientes para que las barras sean significativas. */
export function hasFeelData(paddle: Paddle): boolean {
  return Boolean(paddle.shape || paddle.balance || paddle.hardness);
}

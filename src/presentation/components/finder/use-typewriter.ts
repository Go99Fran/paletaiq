"use client";

import { useEffect, useRef, useState } from "react";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Efecto máquina de escribir. Devuelve el texto parcial, si terminó, y si ya
 * arrancó a escribir (tras `startDelay`). Respeta prefers-reduced-motion:
 * en ese caso muestra el texto completo de una.
 *
 * @param text        texto final a escribir
 * @param speed       ms por carácter
 * @param startDelay  ms a esperar antes de empezar (simula "escribiendo…")
 */
export function useTypewriter(text: string, speed = 18, startDelay = 450) {
  // Estado inicial derivado: si hay reduce-motion, arranca completo (sin tocar
  // estado dentro del effect, que es lo que el linter desaconseja).
  const reduce = prefersReducedMotion();
  const [shown, setShown] = useState(reduce ? text : "");
  const [done, setDone] = useState(reduce);
  const [started, setStarted] = useState(reduce);
  const charsRef = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    let interval: ReturnType<typeof setInterval> | undefined;
    charsRef.current = 0;

    const startTimer = setTimeout(() => {
      setStarted(true);
      interval = setInterval(() => {
        charsRef.current += 1;
        setShown(text.slice(0, charsRef.current));
        if (charsRef.current >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
    }, startDelay);

    return () => {
      clearTimeout(startTimer);
      if (interval) clearInterval(interval);
    };
  }, [text, speed, startDelay]);

  return { shown, done, started };
}

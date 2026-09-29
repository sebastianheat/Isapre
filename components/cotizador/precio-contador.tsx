"use client";

import { useEffect, useRef, useState } from "react";
import { fmtPesos } from "@/lib/pricing";

// El "conteo" de precios es la firma visual del cotizador (ver DESIGN.md,
// sección 6 — Motion & Animation): comunica que el cálculo es real y en
// vivo, no un número estático. Solo anima el valor mostrado (no layout),
// y respeta prefers-reduced-motion.
export function PrecioContador({ valor, duracionMs = 500 }: { valor: number; duracionMs?: number }) {
  const [valorMostrado, setValorMostrado] = useState(valor);
  const valorAnterior = useRef(valor);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const prefiereMenosMovimiento =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefiereMenosMovimiento) {
      setValorMostrado(valor);
      valorAnterior.current = valor;
      return;
    }

    const inicio = valorAnterior.current;
    const delta = valor - inicio;
    const inicioTiempo = performance.now();

    function easeOutExpo(t: number): number {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    function tick(ahora: number) {
      const progreso = Math.min(1, (ahora - inicioTiempo) / duracionMs);
      const t = easeOutExpo(progreso);
      setValorMostrado(Math.round(inicio + delta * t));
      if (progreso < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        valorAnterior.current = valor;
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor, duracionMs]);

  return (
    <span className="tabular-nums" aria-live="polite">
      {fmtPesos(valorMostrado)}
    </span>
  );
}

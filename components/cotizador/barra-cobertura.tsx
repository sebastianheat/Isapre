"use client";

import { useEffect, useRef, useState } from "react";

// Barra de cobertura que se llena de 0 al valor real (DESIGN.md, sección 6).
// Anima `transform: scaleX()`, nunca `width` — mantiene la animación en
// GPU y no dispara reflow.
export function BarraCobertura({ label, porcentaje }: { label: string; porcentaje: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="mb-2.5">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold text-pizarra-media">{label}</span>
        <span className="text-[13px] font-bold text-tinta-azul">{porcentaje}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-niebla/50">
        <div
          className="h-full origin-left rounded-full bg-azul-cotizacion transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            transform: visible ? `scaleX(${porcentaje / 100})` : "scaleX(0)",
            width: "100%",
          }}
        />
      </div>
    </div>
  );
}

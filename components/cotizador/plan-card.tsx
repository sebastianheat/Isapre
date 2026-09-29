"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarraCobertura } from "./barra-cobertura";
import { PrecioContador } from "./precio-contador";
import type { PlanCatalogo } from "@/lib/cotizador-mock-data";
import type { ResultadoCotizacion } from "@/lib/pricing";

const TIER_LABEL: Record<PlanCatalogo["tier"], string> = {
  economica: "Económica",
  recomendada: "Recomendada",
  premium: "Premium",
};

interface PlanCardProps {
  plan: PlanCatalogo;
  resultado: ResultadoCotizacion;
  onVerDesglose: () => void;
  nombreProspecto?: string;
}

export function PlanCard({ plan, resultado, onVerDesglose, nombreProspecto }: PlanCardProps) {
  const destacada = plan.tier === "recomendada";
  const mensajeWhatsApp = encodeURIComponent(
    `Hola, soy ${nombreProspecto || ""}. Vi mi cotización y me interesa el plan ${plan.codigo} de ${plan.isapreNombre} (${resultado.totalPesos.toLocaleString("es-CL")} pesos/mes). ¿Podemos avanzar?`,
  );

  return (
    <article
      className={`relative flex flex-col rounded-card bg-white p-6 shadow-soft transition-all duration-150 hover:-translate-y-0.5 hover:shadow-soft-lg ${
        destacada ? "ring-2 ring-dorado-uf" : ""
      }`}
    >
      {destacada && (
        <span className="absolute -top-3 right-5">
          <Badge variant="acento">Más elegida</Badge>
        </span>
      )}

      <span className="mb-3 self-start text-[11px] font-bold uppercase tracking-[0.06em] text-pizarra-media">
        {TIER_LABEL[plan.tier]} · {plan.isapreNombre}
      </span>

      <div className="mb-1 font-mono text-xs text-pizarra-media">{plan.codigo}</div>

      <div className="mb-1 font-display text-[32px] font-semibold leading-none text-tinta-azul">
        <PrecioContador valor={resultado.totalPesos} />
      </div>
      <div className="mb-4 text-[13px] font-medium text-pizarra-media">
        {resultado.esDesde ? "por mes, desde" : "por mes"}
      </div>

      <BarraCobertura label="Cobertura hospitalaria" porcentaje={plan.coberturaHospitalaria} />
      <BarraCobertura label="Cobertura ambulatoria" porcentaje={plan.coberturaAmbulatoria} />

      <button
        onClick={onVerDesglose}
        className="mt-3 self-start text-[13px] font-bold text-azul-cotizacion underline decoration-dorado-uf decoration-2 underline-offset-4"
      >
        Ver desglose de este precio
      </button>

      <div className="mt-5">
        <a
          href={`https://wa.me/56962924609?text=${mensajeWhatsApp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Button variant="whatsapp" className="w-full">
            Hablar con asesor
          </Button>
        </a>
      </div>
    </article>
  );
}

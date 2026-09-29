"use client";

import { X } from "@phosphor-icons/react";
import { fmtPesos } from "@/lib/pricing";
import type { ResultadoCotizacion } from "@/lib/pricing";

// Resuelve la violación de usabilidad Severidad 2 encontrada en el Skill #6
// (docs/ux-design/usability-evaluation/cotizador-publico.md): la sigla "GES"
// nunca aparece sola en la versión pública del desglose — siempre en
// lenguaje simple, con la sigla entre paréntesis para quien la reconozca.
export function DesgloseModal({
  resultado,
  ufValor,
  onClose,
}: {
  resultado: ResultadoCotizacion;
  ufValor: number;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-tinta-azul/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-card bg-white p-6 shadow-soft-lg sm:rounded-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-tinta-azul">
            ¿Por qué cuesta esto?
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-1.5 text-pizarra-media hover:bg-papel-calido"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        <p className="mb-4 text-sm text-pizarra-media">
          Valores al día de hoy · UF {fmtPesos(ufValor)}. Referenciales, pueden variar según
          preexistencias declaradas.
        </p>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-niebla text-left text-xs uppercase tracking-wide text-pizarra-media">
              <th className="pb-2 font-semibold">Beneficiario</th>
              <th className="pb-2 font-semibold">Edad</th>
              <th className="pb-2 font-semibold">Factor</th>
              <th className="pb-2 text-right font-semibold">Total mensual</th>
            </tr>
          </thead>
          <tbody>
            {resultado.detalle.map((d, i) => (
              <tr key={i} className="border-b border-niebla/60">
                <td className="py-2">{d.tipo === "cotizante" ? "Titular" : `Carga ${i}`}</td>
                <td className="py-2">{d.edad} años</td>
                <td className="py-2 font-mono">{d.factor.toFixed(2)}</td>
                <td className="py-2 text-right font-bold tabular-nums">
                  {fmtPesos(d.totalUf * ufValor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 rounded-control bg-papel-calido p-4 text-sm">
          <div className="mb-1 flex justify-between">
            <span className="text-pizarra-media">Aporte adicional de tu isapre (GES)</span>
          </div>
          <div className="mt-3 flex justify-between border-t border-dashed border-niebla pt-3">
            <span className="font-semibold text-tinta-azul">Total mensual</span>
            <span className="font-display text-lg font-semibold text-azul-cotizacion">
              {fmtPesos(resultado.totalPesos)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

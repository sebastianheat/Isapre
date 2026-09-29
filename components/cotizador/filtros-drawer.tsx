"use client";

import { useState } from "react";
import { FunnelSimple, X } from "@phosphor-icons/react";
import { useCotizadorStore } from "@/lib/cotizador-store";
import type { PlanCatalogo } from "@/lib/cotizador-mock-data";

// Resuelve la violación de usabilidad Severidad 2 del Skill #6
// (docs/ux-design/usability-evaluation/cotizador-publico.md): en mobile los
// filtros viven en un drawer colapsable, nunca un sidebar fijo que empuja
// los resultados fuera de vista.
function ContenidoFiltros({ planes }: { planes: PlanCatalogo[] }) {
  const { isapreFiltro, toggleIsapreFiltro, limpiarFiltros } = useCotizadorStore();
  const isapres = Array.from(new Set(planes.map((p) => p.isapreNombre)));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-tinta-azul">Isapre</h3>
        {isapreFiltro.length > 0 && (
          <button onClick={limpiarFiltros} className="text-xs font-bold text-azul-cotizacion">
            Limpiar
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {isapres.map((isapre) => {
          const count = planes.filter((p) => p.isapreNombre === isapre).length;
          const activo = isapreFiltro.includes(isapre);
          return (
            <button
              key={isapre}
              onClick={() => toggleIsapreFiltro(isapre)}
              className={`flex items-center justify-between rounded-control border-[1.5px] px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                activo
                  ? "border-azul-cotizacion bg-azul-cotizacion/5 text-azul-cotizacion"
                  : "border-niebla text-tinta-azul hover:border-pizarra-media"
              }`}
            >
              <span>{isapre}</span>
              <span className="text-xs font-bold text-pizarra-media">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FiltrosCotizador({ planes }: { planes: PlanCatalogo[] }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      {/* Mobile: botón que abre el drawer */}
      <button
        onClick={() => setAbierto(true)}
        className="mb-4 flex items-center gap-2 rounded-control border-[1.5px] border-niebla px-4 py-2.5 text-sm font-bold text-tinta-azul lg:hidden"
      >
        <FunnelSimple size={16} weight="bold" />
        Filtros
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-tinta-azul/40 lg:hidden"
          onClick={() => setAbierto(false)}
        >
          <div
            className="max-h-[75vh] w-full overflow-y-auto rounded-t-card bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display text-lg font-semibold">Filtros</span>
              <button onClick={() => setAbierto(false)} aria-label="Cerrar filtros">
                <X size={20} weight="bold" />
              </button>
            </div>
            <ContenidoFiltros planes={planes} />
          </div>
        </div>
      )}

      {/* Desktop: sidebar siempre visible */}
      <div className="hidden lg:block lg:w-56 lg:shrink-0">
        <ContenidoFiltros planes={planes} />
      </div>
    </>
  );
}

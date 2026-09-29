"use client";

import { useMemo, useState } from "react";
import { useCotizadorStore } from "@/lib/cotizador-store";
import { cotizar } from "@/lib/pricing";
import { PLANES_MUESTRA, TABLA_FACTORES_2026, UF_HOY } from "@/lib/cotizador-mock-data";
import { Button } from "@/components/ui/button";
import { PlanCard } from "./plan-card";
import { FiltrosCotizador } from "./filtros-drawer";
import { DesgloseModal } from "./desglose-modal";
import { LeadGateModal } from "./lead-gate-modal";
import type { ResultadoCotizacion } from "@/lib/pricing";

const REGIONES = [
  "Metropolitana",
  "Valparaíso",
  "Biobío",
  "Coquimbo",
  "O'Higgins",
  "Los Lagos",
  "Otra región",
];

export function CotizadorShell() {
  const { edad, cargas, isapreFiltro, setDatosBasicos, agregarCarga, beneficiarios } =
    useCotizadorStore();

  const [formEdad, setFormEdad] = useState("");
  const [formRenta, setFormRenta] = useState("");
  const [formRegion, setFormRegion] = useState("");
  const [errorEdad, setErrorEdad] = useState<string | null>(null);
  const [mostroResultados, setMostroResultados] = useState(false);
  const [desgloseAbierto, setDesgloseAbierto] = useState<string | null>(null);
  const [leadGateAbierto, setLeadGateAbierto] = useState(false);
  const [nombreProspecto, setNombreProspecto] = useState<string>("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const edadNum = Number(formEdad);
    if (!Number.isFinite(edadNum) || edadNum < 0 || edadNum > 100) {
      setErrorEdad("Ingresa una edad entre 0 y 100 años.");
      return;
    }
    setErrorEdad(null);
    setDatosBasicos({ edad: edadNum, rentaBruta: Number(formRenta) || 0, region: formRegion });
    setMostroResultados(true);
  }

  const planesFiltrados = useMemo(() => {
    if (isapreFiltro.length === 0) return PLANES_MUESTRA;
    return PLANES_MUESTRA.filter((p) => isapreFiltro.includes(p.isapreNombre));
  }, [isapreFiltro]);

  const resultados = useMemo(() => {
    const map = new Map<string, ResultadoCotizacion>();
    for (const plan of planesFiltrados) {
      map.set(plan.id, cotizar(plan, beneficiarios(), TABLA_FACTORES_2026, UF_HOY));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planesFiltrados, edad, cargas]);

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-8 sm:px-7 sm:py-12">
      <header className="mb-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-dorado-uf">
          UF al día · ${UF_HOY.toLocaleString("es-CL")}
        </p>
        <h1 className="font-display text-[clamp(26px,4vw,40px)] font-semibold leading-tight text-tinta-azul">
          Cotiza tu plan de isapre <span className="text-azul-cotizacion">en 30 segundos</span>
        </h1>
        <p className="mt-2 max-w-xl text-[15px] text-pizarra-media">
          Sin RUT, sin compromiso. Compara planes reales de las 7 isapres y entiende exactamente
          por qué cuestan lo que cuestan.
        </p>
      </header>

      {!mostroResultados ? (
        <form
          onSubmit={handleSubmit}
          className="max-w-md rounded-card bg-white p-6 shadow-soft sm:p-8"
        >
          <div className="mb-4">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-pizarra-media">
              Tu edad
            </label>
            <input
              required
              inputMode="numeric"
              value={formEdad}
              onChange={(e) => setFormEdad(e.target.value)}
              className="w-full rounded-control border-[1.5px] border-niebla bg-papel-calido/60 px-3.5 py-2.5 text-sm outline-none focus:border-azul-cotizacion focus:ring-[3px] focus:ring-azul-cotizacion/15"
              placeholder="Ej: 34"
            />
            {errorEdad && <p className="mt-1 text-xs font-semibold text-rojo-terracota">{errorEdad}</p>}
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-pizarra-media">
              Tu renta bruta mensual
            </label>
            <input
              required
              inputMode="numeric"
              value={formRenta}
              onChange={(e) => setFormRenta(e.target.value)}
              className="w-full rounded-control border-[1.5px] border-niebla bg-papel-calido/60 px-3.5 py-2.5 text-sm outline-none focus:border-azul-cotizacion focus:ring-[3px] focus:ring-azul-cotizacion/15"
              placeholder="$ 800.000"
            />
          </div>

          <div className="mb-5">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-pizarra-media">
              Región
            </label>
            <select
              required
              value={formRegion}
              onChange={(e) => setFormRegion(e.target.value)}
              className="w-full rounded-control border-[1.5px] border-niebla bg-papel-calido/60 px-3.5 py-2.5 text-sm outline-none focus:border-azul-cotizacion focus:ring-[3px] focus:ring-azul-cotizacion/15"
            >
              <option value="">Selecciona…</option>
              {REGIONES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => agregarCarga(10)}
            className="mb-5 text-sm font-bold text-azul-cotizacion"
          >
            + Agregar carga familiar
          </button>

          <Button type="submit" className="w-full">
            Ver mis planes
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row">
          <FiltrosCotizador planes={PLANES_MUESTRA} />

          <div className="flex-1">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <h2 className="font-display text-2xl font-semibold text-tinta-azul">
                  Tus 3 mejores planes
                </h2>
                <p className="text-[13px] text-pizarra-media">
                  Comparados con tu perfil. Toca &ldquo;Hablar con asesor&rdquo; para avanzar por
                  WhatsApp.
                </p>
              </div>
              <button
                onClick={() => setMostroResultados(false)}
                className="hidden text-sm font-bold text-azul-cotizacion sm:block"
              >
                Recotizar
              </button>
            </div>

            {planesFiltrados.length === 0 ? (
              <div className="rounded-card bg-white p-8 text-center shadow-soft">
                <p className="mb-3 text-sm text-pizarra-media">
                  No hay planes con estos filtros. Prueba ajustando la cobertura o la zona.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {planesFiltrados.map((plan, i) => {
                  const resultado = resultados.get(plan.id);
                  if (!resultado) return null;
                  return (
                    <div
                      key={plan.id}
                      className="animate-[fadeUp_0.4s_ease-out_backwards]"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <PlanCard
                        plan={plan}
                        resultado={resultado}
                        nombreProspecto={nombreProspecto}
                        onVerDesglose={() => setDesgloseAbierto(plan.id)}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-card bg-white p-6 shadow-soft sm:flex-row sm:items-center">
              <div>
                <h3 className="font-display text-base font-semibold text-tinta-azul">
                  ¿Quieres revisar otras opciones?
                </h3>
                <p className="text-[13px] text-pizarra-media">
                  Recotiza con datos distintos o habla directo con tu asesor.
                </p>
              </div>
              <Button variant="acento" onClick={() => setLeadGateAbierto(true)}>
                Enviar propuesta
              </Button>
            </div>
          </div>
        </div>
      )}

      {desgloseAbierto &&
        (() => {
          const plan = PLANES_MUESTRA.find((p) => p.id === desgloseAbierto);
          const resultado = resultados.get(desgloseAbierto);
          if (!plan || !resultado) return null;
          return (
            <DesgloseModal
              resultado={resultado}
              ufValor={UF_HOY}
              onClose={() => setDesgloseAbierto(null)}
            />
          );
        })()}

      {leadGateAbierto && (
        <LeadGateModal
          onClose={() => setLeadGateAbierto(false)}
          onEnviado={({ nombre }) => setNombreProspecto(nombre)}
        />
      )}
    </main>
  );
}

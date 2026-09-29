"use client";

import { useState } from "react";
import { X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

const CONSENTIMIENTO_VERSION = "2026-09-v1";
const CONSENTIMIENTO_TEXTO =
  "Autorizo a nuevaisapre.cl a compartir esta cotización y mis datos de contacto con un ejecutivo asesor de isapres para que me contacte por WhatsApp. Puedo solicitar la eliminación de mis datos en cualquier momento.";

function normalizarTelefono(raw: string): string {
  const digitos = raw.replace(/\D/g, "");
  return digitos.startsWith("56") ? digitos : "56" + digitos;
}

function esWhatsappChilenoValido(telefono: string): boolean {
  return /^569\d{8}$/.test(telefono);
}

export function LeadGateModal({
  onClose,
  onEnviado,
}: {
  onClose: () => void;
  onEnviado: (datos: { nombre: string; telefono: string }) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [aceptaConsentimiento, setAceptaConsentimiento] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const telefonoNormalizado = normalizarTelefono(telefono);
    if (!esWhatsappChilenoValido(telefonoNormalizado)) {
      setError("Ingresa un WhatsApp chileno válido (+56 9 XXXXXXXX).");
      return;
    }
    setError(null);
    // En producción: POST /api/cotizaciones con { nombre, telefono, consentimientoVersion }
    // (US-021, US-043) — acá solo se demuestra la interacción de la pantalla insignia.
    setEnviado(true);
    onEnviado({ nombre, telefono: telefonoNormalizado });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-tinta-azul/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-card bg-white p-6 shadow-soft-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-tinta-azul">
            {enviado ? "¡Listo!" : "Habla con un asesor"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-1.5 text-pizarra-media hover:bg-papel-calido"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {enviado ? (
          <p className="text-sm text-pizarra-media">
            Un ejecutivo te contactará por WhatsApp con tu cotización lista. Gracias por confiar
            en nuevaisapre.cl.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-pizarra-media">
                Tu nombre
              </label>
              <input
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-control border-[1.5px] border-niebla bg-papel-calido/60 px-3.5 py-2.5 text-sm outline-none focus:border-azul-cotizacion focus:ring-[3px] focus:ring-azul-cotizacion/15"
                placeholder="Ej: María González"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-pizarra-media">
                Tu WhatsApp
              </label>
              <input
                required
                inputMode="numeric"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full rounded-control border-[1.5px] border-niebla bg-papel-calido/60 px-3.5 py-2.5 text-sm outline-none focus:border-azul-cotizacion focus:ring-[3px] focus:ring-azul-cotizacion/15"
                placeholder="+56 9 1234 5678"
              />
              {error && <p className="mt-1 text-xs font-semibold text-rojo-terracota">{error}</p>}
            </div>

            <label className="mt-1 flex items-start gap-2 text-xs text-pizarra-media">
              <input
                type="checkbox"
                checked={aceptaConsentimiento}
                onChange={(e) => setAceptaConsentimiento(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                {CONSENTIMIENTO_TEXTO}{" "}
                <a href="/privacidad" className="font-semibold text-azul-cotizacion underline">
                  Ver política de privacidad
                </a>
                . <span className="text-pizarra-media/70">(versión {CONSENTIMIENTO_VERSION})</span>
              </span>
            </label>

            <Button type="submit" disabled={!aceptaConsentimiento} className="mt-2">
              Enviar
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

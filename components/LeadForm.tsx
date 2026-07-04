"use client";

import { useState, useRef, useEffect } from "react";
import { CLINICAS_POR_REGION } from "@/lib/clinicasPorRegion";
import { capturarGclidDeUrl, obtenerGclid, obtenerFbclid } from "@/lib/gclid";
import { dispararConversionEnhanced } from "@/lib/enhancedConversions";

const REGIONES = [
  "Arica y Parinacota",
  "Tarapacá",
  "Antofagasta",
  "Atacama",
  "Coquimbo",
  "Valparaíso",
  "Metropolitana",
  "O'Higgins",
  "Maule",
  "Ñuble",
  "Biobío",
  "Araucanía",
  "Los Ríos",
  "Los Lagos",
  "Aysén",
  "Magallanes",
];

const PREVISIONES = [
  "Fonasa",
  "Nueva Masvida",
  "Banmédica",
  "Consalud",
  "Colmena",
  "Cruz Blanca",
  "Vida Tres",
  "Esencial",
  "Soy carga",
  "Otro",
];

const MAX_CLINICAS = 3;

export default function LeadForm() {
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");
  const [clinicasOpen, setClinicasOpen] = useState(false);
  const clinicasRef = useRef<HTMLDivElement>(null);
  const [f, setF] = useState({
    nombre: "",
    rut: "",
    telefono: "",
    email: "",
    region: "Metropolitana",
    edad: "",
    sueldo_liquido: "",
    prevision_actual: "Fonasa",
    cargas_cantidad: "",
    cargas_edades: "",
    clinicas_preferidas: [] as string[],
  });

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF((s) => ({ ...s, [k]: v }));
  }

  // Al cambiar de región, filtra clínicas para dejar solo las que aplican.
  function cambiarRegion(nuevaRegion: string) {
    const validas = new Set(CLINICAS_POR_REGION[nuevaRegion] ?? []);
    setF((s) => ({
      ...s,
      region: nuevaRegion,
      clinicas_preferidas: s.clinicas_preferidas.filter((c) => validas.has(c)),
    }));
  }

  function toggleClinica(clinica: string) {
    setF((s) => {
      const ya = s.clinicas_preferidas.includes(clinica);
      if (ya) {
        return { ...s, clinicas_preferidas: s.clinicas_preferidas.filter((c) => c !== clinica) };
      }
      if (s.clinicas_preferidas.length >= MAX_CLINICAS) return s;
      return { ...s, clinicas_preferidas: [...s.clinicas_preferidas, clinica] };
    });
  }

  // Cerrar dropdown al click fuera.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!clinicasRef.current) return;
      if (!clinicasRef.current.contains(e.target as Node)) setClinicasOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Captura el gclid de la URL al montar (si vino de Google Ads) y lo persiste
  // en sessionStorage para que sobreviva navegación dentro de la sesión.
  useEffect(() => {
    capturarGclidDeUrl();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!f.nombre.trim() || !f.rut.trim() || !f.telefono.trim() || !f.email.trim()) {
      setError("Completa nombre, RUT, teléfono y email.");
      return;
    }
    if (!f.edad || !f.sueldo_liquido) {
      setError("Completa tu edad y sueldo líquido.");
      return;
    }
    setEnviando(true);
    try {
      const gclid = obtenerGclid();
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: f.nombre,
          rut: f.rut,
          telefono: f.telefono,
          email: f.email,
          region: f.region,
          edad: Number(f.edad),
          sueldo_liquido: Number(f.sueldo_liquido),
          prevision_actual: f.prevision_actual,
          cargas_cantidad: Number(f.cargas_cantidad) || 0,
          cargas_edades: f.cargas_edades,
          clinica_preferida: f.clinicas_preferidas.join(", "),
          origen: "landing-form",
          gclid,
          fbclid: obtenerFbclid(),
        }),
      });
      const jr = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(jr.error || `Error ${res.status}`);
      }
      // Solo dispara la conversión de Google Ads si el backend confirmó que
      // es un lead NUEVO (no un cliente ya conocido que está re-llenando el
      // form). Evita inflar artificialmente la métrica con duplicados.
      if (jr.esNuevo !== false) {
        const sendTo = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_SEND_TO;
        if (sendTo) {
          await dispararConversionEnhanced(sendTo, {
            email: f.email,
            telefono: f.telefono,
            nombre: f.nombre,
            region: f.region,
          }, 1, "CLP").catch(() => {});
        }
      }
      setEnviado(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      setError(msg);
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div className="lead-form lead-form-success">
        <div className="success-check">✓</div>
        <h3>¡Listo, {f.nombre.split(" ")[0]}!</h3>
        <p>
          Recibimos tus datos. Nuestros ejecutivos se pondrán en contacto contigo para brindarte
          la mejor opción de plan ajustada a tu presupuesto.
        </p>
        <p className="small">
          ¿Quieres adelantar la conversación? Abre el chat de Romina abajo a la derecha y te
          mostramos opciones al toque.
        </p>
      </div>
    );
  }

  const clinicasRegion = CLINICAS_POR_REGION[f.region] ?? [];
  const seleccionadas = f.clinicas_preferidas;

  return (
    <form className="lead-form" onSubmit={submit}>
      <h2>Cotiza tu plan en 30 segundos</h2>
      <p className="lead-sub">Comparamos las 7 isapres para encontrar el mejor plan para tu bolsillo. Asesoría 100% gratis.</p>

      <div className="form-grid">
        <input
          type="text"
          placeholder="Nombre completo *"
          value={f.nombre}
          onChange={(e) => set("nombre", e.target.value)}
          autoComplete="name"
          required
        />
        <input
          type="text"
          placeholder="RUT (ej. 12345678-9) *"
          value={f.rut}
          onChange={(e) => set("rut", e.target.value)}
          required
        />
        <input
          type="tel"
          placeholder="WhatsApp (ej. +56 9 1234 5678) *"
          value={f.telefono}
          onChange={(e) => set("telefono", e.target.value)}
          autoComplete="tel"
          required
        />
        <input
          type="email"
          placeholder="Email *"
          value={f.email}
          onChange={(e) => set("email", e.target.value)}
          autoComplete="email"
          required
        />
        <select value={f.region} onChange={(e) => cambiarRegion(e.target.value)} required>
          {REGIONES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select
          value={f.prevision_actual}
          onChange={(e) => set("prevision_actual", e.target.value)}
        >
          {PREVISIONES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Edad *"
          min={18}
          max={99}
          value={f.edad}
          onChange={(e) => set("edad", e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Sueldo líquido mensual (CLP) *"
          min={300000}
          step={50000}
          value={f.sueldo_liquido}
          onChange={(e) => set("sueldo_liquido", e.target.value)}
          required
        />
        <label className="field">
          <span className="field-label">Cargas (hijos/pareja)</span>
          <input
            type="number"
            placeholder="0"
            min={0}
            max={10}
            value={f.cargas_cantidad}
            onChange={(e) => set("cargas_cantidad", e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">Edades de las cargas</span>
          <input
            type="text"
            placeholder="Ej. 10, 7"
            value={f.cargas_edades}
            onChange={(e) => set("cargas_edades", e.target.value)}
          />
        </label>

        <div className="field full" ref={clinicasRef}>
          <span className="field-label">
            Clínicas preferidas en {f.region} (hasta {MAX_CLINICAS} · opcional)
          </span>
          <button
            type="button"
            className="multi-trigger"
            onClick={() => setClinicasOpen((o) => !o)}
          >
            {seleccionadas.length === 0 ? (
              <span className="multi-placeholder">Selecciona tus clínicas preferidas</span>
            ) : (
              <span className="multi-chips">
                {seleccionadas.map((c) => (
                  <span key={c} className="chip">
                    {c}
                    <span
                      className="chip-x"
                      role="button"
                      tabIndex={0}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        toggleClinica(c);
                      }}
                    >
                      ×
                    </span>
                  </span>
                ))}
              </span>
            )}
            <span className="multi-caret">{clinicasOpen ? "▴" : "▾"}</span>
          </button>
          {clinicasOpen && (
            <div className="multi-menu">
              {clinicasRegion.length === 0 ? (
                <div className="multi-empty">No tenemos clínicas listadas para esta región.</div>
              ) : (
                clinicasRegion.map((c) => {
                  const checked = seleccionadas.includes(c);
                  const disabled = !checked && seleccionadas.length >= MAX_CLINICAS;
                  return (
                    <label
                      key={c}
                      className={`multi-option ${disabled ? "disabled" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggleClinica(c)}
                      />
                      <span>{c}</span>
                    </label>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <button type="submit" className="cta" disabled={enviando}>
        {enviando ? "Enviando…" : "Cotizar gratis"}
      </button>
      <p className="legal">
        Al enviar aceptas que te contactemos para entregarte tus opciones de plan.
      </p>
    </form>
  );
}

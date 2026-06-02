"use client";

import { useState } from "react";

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

export default function LeadForm() {
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");
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
    clinica_preferida: "",
  });

  function set<K extends keyof typeof f>(k: K, v: string) {
    setF((s) => ({ ...s, [k]: v }));
  }

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
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...f,
          edad: Number(f.edad),
          sueldo_liquido: Number(f.sueldo_liquido),
          cargas_cantidad: Number(f.cargas_cantidad) || 0,
          origen: "landing-beta",
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Error ${res.status}`);
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
          Recibimos tus datos. <strong>Cynthia</strong>, nuestra ejecutiva, te va a contactar por
          WhatsApp al <strong>{f.telefono}</strong> con las mejores opciones de plan ajustadas a
          tu presupuesto.
        </p>
        <p className="small">
          ¿Quieres adelantar la conversación? Abre el chat de Romina abajo a la derecha y te
          mostramos opciones al toque.
        </p>
      </div>
    );
  }

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
        <select value={f.region} onChange={(e) => set("region", e.target.value)} required>
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
        <input
          className="full"
          type="text"
          placeholder="Clínica preferida (opcional)"
          value={f.clinica_preferida}
          onChange={(e) => set("clinica_preferida", e.target.value)}
        />
      </div>

      {error && <div className="form-error">{error}</div>}

      <button type="submit" className="cta" disabled={enviando}>
        {enviando ? "Enviando…" : "Cotizar gratis"}
      </button>
      <p className="legal">
        Al enviar aceptas que te contactemos por WhatsApp para entregarte tus opciones de plan.
      </p>
    </form>
  );
}

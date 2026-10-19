"use client";

import { useState } from "react";

// Interruptor global del reparto automático round robin (/admin/reparto).
interface Prioridad {
  email: string;
  restantes: number;
}

export default function RepartoAutomaticoToggle({
  inicial,
  enRueda,
  prioridadInicial,
  ejecutivos,
}: {
  inicial: boolean;
  enRueda: string[];
  prioridadInicial: Prioridad | null;
  ejecutivos: { email: string; nombre: string }[];
}) {
  const [activo, setActivo] = useState(inicial);
  const [prioridad, setPrioridad] = useState(prioridadInicial);
  const [prioEmail, setPrioEmail] = useState("");
  const [prioCantidad, setPrioCantidad] = useState(1);
  const nombreDe = (email: string) => ejecutivos.find((e) => e.email === email)?.nombre || email;

  async function guardarPrioridad(email: string, cantidad: number) {
    setEnCurso(true);
    setError("");
    try {
      const res = await fetch("/api/admin/reparto/prioridad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, cantidad }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setError(j.error || "No se pudo guardar la prioridad.");
      else setPrioridad(j.prioridad);
    } catch {
      setError("Sin conexión.");
    } finally {
      setEnCurso(false);
    }
  }
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState("");

  async function cambiar(nuevo: boolean) {
    setEnCurso(true);
    setError("");
    try {
      const res = await fetch("/api/admin/reparto/auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: nuevo }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "No se pudo cambiar.");
        return;
      }
      setActivo(nuevo);
    } catch {
      setError("Sin conexión.");
    } finally {
      setEnCurso(false);
    }
  }

  return (
    <div className="admin-card" style={{ marginBottom: 16 }}>
      <label className="usuario-toggle">
        <input type="checkbox" checked={activo} disabled={enCurso} onChange={(e) => cambiar(e.target.checked)} />
        Reparto automático (round robin)
        <span className={`tag ${activo ? "green" : "gray"}`}>{activo ? "Activo" : "Apagado"}</span>
      </label>
      <p style={{ fontSize: 13, color: "var(--admin-text-soft)", marginTop: 8 }}>
        Cada lead nuevo se asigna solo, por turnos, a los ejecutivos con cupo disponible.
        Quien completa su cupo sale de la rueda hasta que le reactives el cupo en Usuarios.
        {" "}
        {enRueda.length === 0
          ? "Ahora no hay nadie con cupo: los leads nuevos quedan en la cola de abajo."
          : `En la rueda ahora: ${enRueda.length} ejecutivo${enRueda.length === 1 ? "" : "s"}.`}
      </p>
      <div style={{ marginTop: 12, fontSize: 13 }}>
        {prioridad ? (
          <div className="admin-msg warn" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span>
              Prioridad: los próximos <strong>{prioridad.restantes}</strong> lead{prioridad.restantes === 1 ? "" : "s"} van
              a <strong>{nombreDe(prioridad.email)}</strong>; después sigue la rueda.
            </span>
            <button className="admin-btn secondary small" disabled={enCurso} onClick={() => guardarPrioridad("", 0)}>
              Quitar
            </button>
          </div>
        ) : (
          <form
            className="creditos-form"
            style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
            onSubmit={(e) => { e.preventDefault(); if (prioEmail) guardarPrioridad(prioEmail, prioCantidad); }}
          >
            <span>Dar prioridad: los próximos</span>
            <input type="number" min={1} max={50} value={prioCantidad} style={{ width: 70 }}
              onChange={(e) => setPrioCantidad(Number(e.target.value))} />
            <span>leads a</span>
            <select value={prioEmail} onChange={(e) => setPrioEmail(e.target.value)} style={{ width: "auto" }}>
              <option value="">Elige ejecutivo…</option>
              {ejecutivos.map((e) => <option key={e.email} value={e.email}>{e.nombre}</option>)}
            </select>
            <button type="submit" className="admin-btn small" disabled={enCurso || !prioEmail}>Aplicar</button>
          </form>
        )}
      </div>
      {error && <div className="creditos-campo-error">{error}</div>}
    </div>
  );
}

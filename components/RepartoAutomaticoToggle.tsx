"use client";

import { useState } from "react";

// Interruptor global del reparto automático round robin (/admin/reparto).
export default function RepartoAutomaticoToggle({
  inicial,
  enRueda,
}: {
  inicial: boolean;
  enRueda: string[];
}) {
  const [activo, setActivo] = useState(inicial);
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
      {error && <div className="creditos-campo-error">{error}</div>}
    </div>
  );
}

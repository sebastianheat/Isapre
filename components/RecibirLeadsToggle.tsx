"use client";

import { useState } from "react";

// Interruptor "Recibir leads" (US-007). Llama a PATCH /api/admin/usuarios/[email].
export default function RecibirLeadsToggle({
  email,
  inicial,
  onChange,
}: {
  email: string;
  inicial: boolean;
  onChange?: (valor: boolean) => void;
}) {
  const [valor, setValor] = useState(inicial);
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState("");

  async function cambiar(nuevo: boolean) {
    setEnCurso(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/usuarios/${encodeURIComponent(email)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recibiendoLeads: nuevo }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "No se pudo cambiar.");
        return;
      }
      setValor(nuevo);
      onChange?.(nuevo);
    } catch {
      setError("Sin conexión.");
    } finally {
      setEnCurso(false);
    }
  }

  return (
    <div>
      <label className="usuario-toggle">
        <input
          type="checkbox"
          checked={valor}
          disabled={enCurso}
          onChange={(e) => cambiar(e.target.checked)}
        />
        Recibir leads
        <span className={`tag ${valor ? "green" : "gray"}`}>{valor ? "Activo" : "En pausa"}</span>
      </label>
      {error && <div className="creditos-campo-error">{error}</div>}
    </div>
  );
}

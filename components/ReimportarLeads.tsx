"use client";

import { useState } from "react";

interface Resultado {
  encontrados: number;
  restaurados: string[];
  yaExistian: string[];
  descartados: string[];
  repartidos: string[];
}

// Pegar líneas "LEAD nuevo: {...}" / "LEAD SIN GUARDAR: {...}" de los logs de
// Vercel (o un arreglo JSON) y devolverlas al panel.
export default function ReimportarLeads() {
  const [texto, setTexto] = useState("");
  const [repartir, setRepartir] = useState(false);
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function reimportar() {
    setEnCurso(true);
    setError("");
    setResultado(null);
    try {
      const res = await fetch("/api/admin/reimportar-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, repartir }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "No se pudo reimportar.");
      else setResultado(data as Resultado);
    } catch {
      setError("Error de red.");
    } finally {
      setEnCurso(false);
    }
  }

  return (
    <div className="admin-card" style={{ display: "grid", gap: 12 }}>
      <p style={{ margin: 0 }}>
        Pega aquí las líneas de los logs de Vercel que dicen <code>LEAD nuevo:</code> o{" "}
        <code>LEAD SIN GUARDAR:</code>. Los leads que ya están en el panel no se tocan, no se
        manda ningún correo y se conserva la fecha original.
      </p>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={12}
        placeholder='LEAD nuevo: {"nombre":"…","telefono":"…"}'
        style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }}
      />
      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" checked={repartir} onChange={(e) => setRepartir(e.target.checked)} />
        Repartirlos automáticamente entre los ejecutivos (si no, quedan en Reparto)
      </label>
      <button className="admin-btn" onClick={reimportar} disabled={enCurso || !texto.trim()}>
        {enCurso ? "Reimportando…" : "Reimportar leads"}
      </button>
      {error && <p className="admin-msg error">{error}</p>}
      {resultado && (
        <div style={{ display: "grid", gap: 6 }}>
          <strong>
            {resultado.restaurados.length} de {resultado.encontrados} leads devueltos al panel.
          </strong>
          {resultado.restaurados.length > 0 && <p style={{ margin: 0 }}>Restaurados: {resultado.restaurados.join(", ")}</p>}
          {resultado.yaExistian.length > 0 && <p style={{ margin: 0 }}>Ya estaban: {resultado.yaExistian.join(", ")}</p>}
          {resultado.descartados.length > 0 && <p style={{ margin: 0 }}>Descartados: {resultado.descartados.join("; ")}</p>}
          {resultado.repartidos.length > 0 && <p style={{ margin: 0 }}>Repartidos: {resultado.repartidos.join("; ")}</p>}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";

const fecha = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("es-CL", { timeZone: "America/Santiago", dateStyle: "short", timeStyle: "short" }) : "";

// Google Ads manda solo el ID de la campaña de cada lead. Aquí el superadmin
// le pone nombre a cada ID (PMax, Search…), y ese nombre aparece en los leads.
export default function CampanasGoogleAds({
  campanas,
  nombresIniciales,
}: {
  campanas: { id: string; leads: number; ultimo?: string }[];
  nombresIniciales: Record<string, string>;
}) {
  const [nombres, setNombres] = useState(nombresIniciales);
  const [borrador, setBorrador] = useState<Record<string, string>>(nombresIniciales);
  const [msg, setMsg] = useState("");

  async function guardar(id: string) {
    setMsg("");
    const res = await fetch("/api/admin/campanas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, nombre: borrador[id] ?? "" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setMsg(data.error || "No se pudo guardar.");
    else {
      setNombres(data.nombres);
      setMsg("Guardado: los leads de esa campaña ya muestran el nombre.");
    }
  }

  return (
    <div className="admin-card admin-form" style={{ display: "grid", gap: 10 }}>
      <p style={{ margin: 0, fontSize: 13 }}>
        Google solo manda el <strong>número (ID)</strong> de la campaña. Ponle nombre a cada una para verlo en los
        leads. Para saber cuál es cuál: en Google Ads, columna <strong>&ldquo;ID de campaña&rdquo;</strong>.
      </p>
      {campanas.length === 0 && <div>Todavía no llegan leads con ID de campaña.</div>}
      {campanas.map((c) => (
        <div key={c.id} style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 13 }}>
            <strong>ID {c.id}</strong> · {c.leads} lead{c.leads === 1 ? "" : "s"} · último {fecha(c.ultimo)}
            {nombres[c.id] ? ` · ✅ ${nombres[c.id]}` : " · sin nombre"}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={borrador[c.id] ?? ""}
              onChange={(e) => setBorrador((b) => ({ ...b, [c.id]: e.target.value }))}
              placeholder="Ej. PMax - Leads Chile"
              style={{ flex: 1 }}
            />
            <button className="admin-btn small" onClick={() => guardar(c.id)}>Guardar</button>
          </div>
        </div>
      ))}
      {msg && <div style={{ fontSize: 13 }}>{msg}</div>}
    </div>
  );
}

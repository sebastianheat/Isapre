"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Lead } from "@/lib/leads";

// Formulario colapsable para editar los datos del cliente desde el panel.
// Solo manda los campos que cambiaron (PATCH parcial).
export default function LeadEditForm({ initialLead }: { initialLead: Lead }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [f, setF] = useState({
    nombre: initialLead.nombre ?? "",
    telefono: initialLead.telefono ?? "",
    email: initialLead.email ?? "",
    rut: initialLead.rut ?? "",
    region: initialLead.region ?? "",
    edad: initialLead.edad ? String(initialLead.edad) : "",
    sueldoLiquido: initialLead.sueldoLiquido ? String(initialLead.sueldoLiquido) : "",
    previsionActual: initialLead.previsionActual ?? "",
    clinicaPreferida: initialLead.clinicaPreferida ?? "",
    cargasResumen: initialLead.cargasResumen ?? "",
  });

  function set<K extends keyof typeof f>(k: K, v: string) {
    setF((s) => ({ ...s, [k]: v }));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setMsg(null);
    try {
      const body: Record<string, unknown> = {
        nombre: f.nombre,
        telefono: f.telefono,
        email: f.email,
        rut: f.rut,
        region: f.region,
        previsionActual: f.previsionActual,
        clinicaPreferida: f.clinicaPreferida,
        cargasResumen: f.cargasResumen,
      };
      if (f.edad) body.edad = Number(f.edad);
      if (f.sueldoLiquido) body.sueldoLiquido = Number(f.sueldoLiquido);
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(initialLead.id ?? "")}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      setMsg({ tipo: "ok", texto: "Datos guardados." });
      router.refresh();
    } catch (err) {
      setMsg({ tipo: "error", texto: err instanceof Error ? err.message : "Error" });
    } finally {
      setGuardando(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 11px",
    fontSize: 15,
    border: "1px solid var(--admin-border)",
    borderRadius: 8,
    fontFamily: "inherit",
  };
  const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
  const spanStyle: React.CSSProperties = { fontSize: 12, color: "var(--admin-text-soft)" };

  return (
    <div className="lead-detail-section">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="admin-btn secondary"
        style={{ marginBottom: abierto ? 10 : 0 }}
      >
        ✏️ {abierto ? "Cerrar edición" : "Editar datos del cliente"}
      </button>
      {abierto && (
        <form onSubmit={guardar} className="admin-card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {msg && (
            <div className={`admin-msg ${msg.tipo}`} style={{ gridColumn: "1 / -1", marginBottom: 0 }}>
              {msg.texto}
            </div>
          )}
          <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
            <span style={spanStyle}>Nombre completo</span>
            <input style={inputStyle} value={f.nombre} onChange={(e) => set("nombre", e.target.value)} />
          </label>
          <label style={labelStyle}>
            <span style={spanStyle}>WhatsApp</span>
            <input style={inputStyle} value={f.telefono} onChange={(e) => set("telefono", e.target.value)} />
          </label>
          <label style={labelStyle}>
            <span style={spanStyle}>Email</span>
            <input style={inputStyle} type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
          </label>
          <label style={labelStyle}>
            <span style={spanStyle}>RUT</span>
            <input style={inputStyle} value={f.rut} onChange={(e) => set("rut", e.target.value)} />
          </label>
          <label style={labelStyle}>
            <span style={spanStyle}>Región</span>
            <input style={inputStyle} value={f.region} onChange={(e) => set("region", e.target.value)} />
          </label>
          <label style={labelStyle}>
            <span style={spanStyle}>Edad</span>
            <input style={inputStyle} type="number" min={18} max={110} value={f.edad} onChange={(e) => set("edad", e.target.value)} />
          </label>
          <label style={labelStyle}>
            <span style={spanStyle}>Sueldo líquido (CLP)</span>
            <input style={inputStyle} type="number" min={0} step={50000} value={f.sueldoLiquido} onChange={(e) => set("sueldoLiquido", e.target.value)} />
          </label>
          <label style={labelStyle}>
            <span style={spanStyle}>Previsión actual</span>
            <input style={inputStyle} value={f.previsionActual} onChange={(e) => set("previsionActual", e.target.value)} />
          </label>
          <label style={labelStyle}>
            <span style={spanStyle}>Clínica preferida</span>
            <input style={inputStyle} value={f.clinicaPreferida} onChange={(e) => set("clinicaPreferida", e.target.value)} />
          </label>
          <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
            <span style={spanStyle}>Cargas (texto libre)</span>
            <input style={inputStyle} value={f.cargasResumen} onChange={(e) => set("cargasResumen", e.target.value)} placeholder="Ej. 2 cargas — edades: 10, 7" />
          </label>
          <button type="submit" className="admin-btn" disabled={guardando} style={{ gridColumn: "1 / -1" }}>
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Lead } from "@/lib/leads";
import type { NotaLead, RecordatorioLead, EtapaLead, CalidadLead } from "@/lib/pipeline";
import { ETAPAS, CALIDADES } from "@/lib/pipeline";
import type { UsuarioPublico } from "@/lib/usuarios";

function formatearFecha(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("es-CL", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Santiago",
    });
  } catch {
    return iso;
  }
}

// Devuelve un input datetime-local con valor por defecto = ahora + 1h.
function proximaHora(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1);
  d.setMinutes(0);
  // datetime-local espera YYYY-MM-DDTHH:MM
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function LeadPipeline({
  initialLead,
  usuarios,
  miEmail,
}: {
  initialLead: Lead;
  usuarios: UsuarioPublico[];
  miEmail: string;
}) {
  const router = useRouter();
  const [lead, setLead] = useState<Lead>(initialLead);
  const [guardando, setGuardando] = useState(false);
  const [notaTexto, setNotaTexto] = useState("");
  const [recFecha, setRecFecha] = useState(proximaHora());
  const [recMensaje, setRecMensaje] = useState("");
  const [error, setError] = useState("");

  const leadId = encodeURIComponent(lead.id ?? "");

  async function cambiarEtapa(etapa: EtapaLead) {
    setGuardando(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etapa }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo actualizar");
      setLead(data.lead);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarCalidad(calidad: CalidadLead) {
    setGuardando(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calidad }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo actualizar");
      setLead(data.lead);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarAsignado(asignadoA: string) {
    setGuardando(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asignadoA: asignadoA || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo actualizar");
      setLead(data.lead);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  async function agregarNota(e: React.FormEvent) {
    e.preventDefault();
    if (!notaTexto.trim()) return;
    setGuardando(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/notas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: notaTexto }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo agregar");
      setLead(data.lead);
      setNotaTexto("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarNota(notaId: string) {
    if (!confirm("¿Eliminar esta nota?")) return;
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/notas?notaId=${notaId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) setLead(data.lead);
    } catch { /* no-op */ }
  }

  async function agregarRecordatorio(e: React.FormEvent) {
    e.preventDefault();
    if (!recFecha || !recMensaje.trim()) return;
    setGuardando(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/recordatorios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: new Date(recFecha).toISOString(),
          mensaje: recMensaje,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo agregar");
      setLead(data.lead);
      setRecMensaje("");
      setRecFecha(proximaHora());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarRecordatorio(recId: string) {
    if (!confirm("¿Eliminar este recordatorio?")) return;
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/recordatorios?recId=${recId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) setLead(data.lead);
    } catch { /* no-op */ }
  }

  const etapaActual = ETAPAS.find((e) => e.id === lead.etapa) ?? ETAPAS[0];
  const notas = [...(lead.notas ?? [])].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const recordatorios = [...(lead.recordatorios ?? [])].sort((a, b) => a.fecha.localeCompare(b.fecha));

  return (
    <>
      {error && <div className="admin-msg error">{error}</div>}

      <div className="lead-detail-section">
        <h3>Pipeline</h3>
        <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ color: "var(--admin-text-soft)", fontSize: 13 }}>Etapa actual</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                className="tag"
                style={{ background: etapaActual.color + "22", color: etapaActual.color, fontSize: 13 }}
              >
                {etapaActual.icon} {etapaActual.label}
              </span>
              <select
                value={lead.etapa ?? "nuevo"}
                onChange={(e) => cambiarEtapa(e.target.value as EtapaLead)}
                disabled={guardando}
                style={{
                  flex: 1, padding: "8px 10px", fontSize: 15,
                  border: "1px solid var(--admin-border)", borderRadius: 8,
                  background: "#fff", fontFamily: "inherit",
                }}
              >
                {ETAPAS.map((e) => (
                  <option key={e.id} value={e.id}>{e.icon} {e.label}</option>
                ))}
              </select>
            </div>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ color: "var(--admin-text-soft)", fontSize: 13 }}>Asignado a</span>
            <select
              value={lead.asignadoA ?? ""}
              onChange={(e) => cambiarAsignado(e.target.value)}
              disabled={guardando}
              style={{
                width: "100%", padding: "8px 10px", fontSize: 15,
                border: "1px solid var(--admin-border)", borderRadius: 8,
                background: "#fff", fontFamily: "inherit",
              }}
            >
              <option value="">Sin asignar</option>
              {usuarios.map((u) => (
                <option key={u.email} value={u.email}>
                  {u.nombre ? `${u.nombre} (${u.email})` : u.email}
                  {u.email === miEmail ? " · yo" : ""}
                </option>
              ))}
            </select>
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ color: "var(--admin-text-soft)", fontSize: 13 }}>
              Calidad del lead (alimenta la optimización de Google Ads)
            </span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CALIDADES.map((c) => {
                const activa = lead.calidad === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={guardando}
                    onClick={() => cambiarCalidad(c.id)}
                    style={{
                      padding: "7px 12px",
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      border: `1.5px solid ${activa ? c.color : "var(--admin-border)"}`,
                      background: activa ? c.color + "22" : "#fff",
                      color: activa ? c.color : "var(--admin-text-soft)",
                    }}
                  >
                    {c.icon} {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="lead-detail-section">
        <h3>Recordatorios ({recordatorios.filter((r) => !r.notificado).length} pendientes)</h3>
        <form onSubmit={agregarRecordatorio} className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="datetime-local"
            value={recFecha}
            onChange={(e) => setRecFecha(e.target.value)}
            style={{
              padding: "8px 10px", fontSize: 15,
              border: "1px solid var(--admin-border)", borderRadius: 8,
              fontFamily: "inherit",
            }}
          />
          <input
            type="text"
            placeholder="Ej. Llamar para confirmar plan"
            value={recMensaje}
            onChange={(e) => setRecMensaje(e.target.value)}
            style={{
              padding: "8px 10px", fontSize: 15,
              border: "1px solid var(--admin-border)", borderRadius: 8,
              fontFamily: "inherit",
            }}
          />
          <button type="submit" className="admin-btn small" disabled={guardando}>
            + Agregar recordatorio
          </button>
        </form>
        {recordatorios.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {recordatorios.map((r) => (
              <RecordatorioItem key={r.id} rec={r} onEliminar={() => eliminarRecordatorio(r.id)} />
            ))}
          </div>
        )}
      </div>

      <div className="lead-detail-section">
        <h3>Notas ({notas.length})</h3>
        <form onSubmit={agregarNota} className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <textarea
            placeholder="Ej. Cliente pide llamarlo el viernes 15hs"
            value={notaTexto}
            onChange={(e) => setNotaTexto(e.target.value)}
            rows={3}
            style={{
              padding: "8px 10px", fontSize: 15,
              border: "1px solid var(--admin-border)", borderRadius: 8,
              fontFamily: "inherit", resize: "vertical",
            }}
          />
          <button type="submit" className="admin-btn small" disabled={guardando || !notaTexto.trim()}>
            + Agregar nota
          </button>
        </form>
        {notas.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {notas.map((n) => (
              <NotaItem key={n.id} nota={n} onEliminar={() => eliminarNota(n.id)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function NotaItem({ nota, onEliminar }: { nota: NotaLead; onEliminar: () => void }) {
  return (
    <div className="admin-card" style={{ padding: "12px 14px", background: "#FAFBFD" }}>
      <div style={{ whiteSpace: "pre-wrap" }}>{nota.texto}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
        <span style={{ fontSize: 11, color: "var(--admin-text-soft)" }}>
          {nota.autor} · {formatearFecha(nota.fecha)}
        </span>
        <button
          onClick={onEliminar}
          style={{
            background: "transparent", border: "none", color: "var(--admin-red)",
            fontSize: 11, cursor: "pointer",
          }}
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}

function RecordatorioItem({ rec, onEliminar }: { rec: RecordatorioLead; onEliminar: () => void }) {
  const vencido = new Date(rec.fecha) < new Date() && !rec.notificado;
  const notificado = rec.notificado;
  return (
    <div
      className="admin-card"
      style={{
        padding: "12px 14px",
        background: vencido ? "#FEF3C7" : notificado ? "#F0FDF4" : "#FAFBFD",
        borderColor: vencido ? "#F59E0B" : notificado ? "#10B981" : undefined,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: vencido ? "#B45309" : "inherit" }}>
            {vencido && "⚠️ "}{notificado && "✓ "}{formatearFecha(rec.fecha)}
          </div>
          <div style={{ marginTop: 4 }}>{rec.mensaje}</div>
        </div>
        <button
          onClick={onEliminar}
          style={{
            background: "transparent", border: "none", color: "var(--admin-red)",
            fontSize: 11, cursor: "pointer",
          }}
        >
          Eliminar
        </button>
      </div>
      <div style={{ fontSize: 11, color: "var(--admin-text-soft)", marginTop: 6 }}>
        Creado por {rec.creadoPor}
      </div>
    </div>
  );
}

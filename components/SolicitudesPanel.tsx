"use client";

import { useState } from "react";
import { NOMBRE_TIPO, type Solicitud } from "@/lib/solicitudes-tipos";

const fecha = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("es-CL", { timeZone: "America/Santiago", dateStyle: "short", timeStyle: "short" }) : "";
const ESTADO: Record<string, string> = { aprobada: "✅ Aprobada", rechazada: "❌ Rechazada", pendiente: "⏳ Pendiente" };

// Solicitudes del administrador (jefe de equipo). El superadmin aprueba o
// rechaza; el admin las ve en modo lectura.
export default function SolicitudesPanel({
  pendientesIniciales,
  resueltasIniciales,
  nombres,
  puedeResolver,
}: {
  pendientesIniciales: Solicitud[];
  resueltasIniciales: Solicitud[];
  nombres: Record<string, string>;
  puedeResolver: boolean;
}) {
  const [pendientes, setPendientes] = useState(pendientesIniciales);
  const [resueltas, setResueltas] = useState(resueltasIniciales);
  const [respuesta, setRespuesta] = useState<Record<string, string>>({});
  const [enCurso, setEnCurso] = useState("");
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const nombre = (email: string) => nombres[email.toLowerCase()] ?? email;

  async function resolver(s: Solicitud, aprobar: boolean) {
    setEnCurso(s.id);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: s.id, aprobar, respuesta: respuesta[s.id] ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ tipo: "error", texto: data.error || "No se pudo resolver." });
        return;
      }
      setPendientes((ps) => ps.filter((p) => p.id !== s.id));
      setResueltas((rs) => [data.solicitud, ...rs]);
      window.dispatchEvent(new Event("admin:impugnaciones")); // refresca el aviso del panel
      setMsg({ tipo: "ok", texto: aprobar ? `Aprobada: ${nombre(s.email)} quedó ${s.tipo === "pausar" ? "en pausa" : "recibiendo leads"}.` : "Solicitud rechazada." });
    } catch {
      setMsg({ tipo: "error", texto: "Error de red." });
    } finally {
      setEnCurso("");
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <h1 className="admin-h1">Solicitudes del administrador</h1>
      <p style={{ margin: 0, fontSize: 13 }}>
        Lo que pide el jefe de equipo no se aplica hasta que el superadmin lo aprueba.
      </p>
      {msg && <div className={`admin-msg ${msg.tipo === "error" ? "error" : "ok"}`} style={{ margin: 0 }}>{msg.texto}</div>}

      <h2 className="admin-h2">Por aprobar ({pendientes.length})</h2>
      {pendientes.length === 0 && <div className="admin-card">No hay solicitudes pendientes.</div>}
      {pendientes.map((s) => (
        <div key={s.id} className="admin-card admin-form" style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <strong>{NOMBRE_TIPO[s.tipo]}: {nombre(s.email)}</strong>
            <span style={{ fontSize: 12 }}>{nombre(s.por)} · {fecha(s.fecha)}</span>
          </div>
          <div style={{ fontSize: 14 }}>Motivo: {s.motivo}</div>
          {puedeResolver && (
            <>
              <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                Respuesta (obligatoria si rechazas)
                <textarea rows={2} value={respuesta[s.id] ?? ""} onChange={(e) => setRespuesta((r) => ({ ...r, [s.id]: e.target.value }))} />
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="admin-btn small" onClick={() => resolver(s, true)} disabled={enCurso !== ""}>
                  {enCurso === s.id ? "…" : "Aprobar"}
                </button>
                <button className="admin-btn small secondary" onClick={() => resolver(s, false)} disabled={enCurso !== ""}>
                  Rechazar
                </button>
              </div>
            </>
          )}
        </div>
      ))}

      {resueltas.length > 0 && (
        <>
          <h2 className="admin-h2">Últimas resueltas</h2>
          <div className="admin-card" style={{ overflowX: "auto" }}>
            <table className="creditos-tabla">
              <thead>
                <tr><th>Solicitud</th><th>Pedida por</th><th>Resultado</th><th>Fecha</th></tr>
              </thead>
              <tbody>
                {resueltas.map((s) => (
                  <tr key={s.id}>
                    <td>{NOMBRE_TIPO[s.tipo]}: {nombre(s.email)}</td>
                    <td>{nombre(s.por)}</td>
                    <td>
                      {ESTADO[s.estado]}
                      {s.respuesta ? <div style={{ fontSize: 12 }}>{s.respuesta}</div> : null}
                    </td>
                    <td>{fecha(s.resueltaEn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

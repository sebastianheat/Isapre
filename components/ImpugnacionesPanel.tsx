"use client";

import Link from "next/link";
import { useState } from "react";
import type { Lead } from "@/lib/leads";
import { MOTIVOS_IMPUGNACION } from "@/lib/pipeline";

const fecha = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("es-CL", { timeZone: "America/Santiago", dateStyle: "short", timeStyle: "short" }) : "";
const MOTIVO = Object.fromEntries(MOTIVOS_IMPUGNACION.map((m) => [m.id, m.id === "telefono" ? "teléfono" : m.id]));
const ESTADO: Record<string, string> = { aceptada: "✅ Aceptada", rechazada: "❌ Rechazada", retirada: "↩️ Retirada" };

// Impugnaciones de leads falsos: el superadmin acepta (devuelve el crédito y
// marca el lead como falso) o rechaza con un motivo que ve el ejecutivo.
export default function ImpugnacionesPanel({
  pendientesIniciales,
  resueltasIniciales,
  nombres,
}: {
  pendientesIniciales: Lead[];
  resueltasIniciales: Lead[];
  nombres: Record<string, string>;
}) {
  const [pendientes, setPendientes] = useState(pendientesIniciales);
  const [resueltas, setResueltas] = useState(resueltasIniciales);
  const [respuesta, setRespuesta] = useState<Record<string, string>>({});
  const [enCurso, setEnCurso] = useState("");
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const nombre = (email?: string) => (email ? nombres[email.toLowerCase()] ?? email : "");

  async function resolver(lead: Lead, aceptar: boolean) {
    const id = lead.id ?? "";
    setEnCurso(id);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/impugnaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: id, aceptar, respuesta: respuesta[id] ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ tipo: "error", texto: data.error || "No se pudo resolver." });
        return;
      }
      const l = data.lead as Lead;
      setPendientes((ps) => ps.filter((p) => p.id !== id));
      setResueltas((rs) => [l, ...rs]);
      setMsg({
        tipo: "ok",
        texto: aceptar
          ? `${l.nombre}: marcado como falso${l.impugnacion?.creditoDevuelto ? ` y crédito devuelto a ${nombre(l.impugnacion.por)}` : " (sin devolución: el lead ya no era suyo)"}.`
          : `${l.nombre}: impugnación rechazada.`,
      });
    } catch {
      setMsg({ tipo: "error", texto: "Error de red." });
    } finally {
      setEnCurso("");
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <h1 className="admin-h1">Impugnaciones de leads falsos</h1>
      <p style={{ margin: 0, fontSize: 13 }}>
        Un ejecutivo puede impugnar un lead solo si el teléfono es falso y además el nombre o el correo.
        Al <strong>aceptar</strong>, el lead queda como falso (perdido) y se le devuelve el crédito. Al{" "}
        <strong>rechazar</strong>, el lead sigue igual y el ejecutivo ve tu motivo.
      </p>
      {msg && <div className={`admin-msg ${msg.tipo === "error" ? "error" : "ok"}`} style={{ margin: 0 }}>{msg.texto}</div>}

      <h2 className="admin-h2">Por revisar ({pendientes.length})</h2>
      {pendientes.length === 0 && <div className="admin-card">No hay impugnaciones pendientes.</div>}
      {pendientes.map((l) => {
        const imp = l.impugnacion!;
        const id = l.id ?? "";
        const wa = (l.telefono ?? "").replace(/[^0-9]/g, "");
        return (
          <div key={id} className="admin-card" style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <strong>
                <Link href={`/admin/leads/${encodeURIComponent(id)}`}>{l.nombre || "Sin nombre"}</Link>
              </strong>
              <span style={{ fontSize: 12 }}>
                {nombre(imp.por)} · {fecha(imp.fecha)}
              </span>
            </div>
            <div style={{ fontSize: 14, display: "grid", gap: 2 }}>
              <div>
                Teléfono: {wa ? <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener">{l.telefono}</a> : "—"}
              </div>
              <div>Correo: {l.email || "—"}</div>
              <div>RUT: {l.rut || "—"} · Llegó: {fecha(l.fecha)}</div>
              <div>
                Dice que es falso: <strong>{imp.motivos.map((m) => MOTIVO[m] ?? m).join(", ")}</strong>
              </div>
              <div>Comentario: {imp.comentario}</div>
            </div>
            <input
              placeholder="Motivo (obligatorio si rechazas; lo ve el ejecutivo)"
              value={respuesta[id] ?? ""}
              onChange={(e) => setRespuesta((r) => ({ ...r, [id]: e.target.value }))}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="admin-btn small" onClick={() => resolver(l, true)} disabled={enCurso !== ""}>
                {enCurso === id ? "…" : "Aceptar: es falso"}
              </button>
              <button className="admin-btn small secondary" onClick={() => resolver(l, false)} disabled={enCurso !== ""}>
                Rechazar
              </button>
            </div>
          </div>
        );
      })}

      {resueltas.length > 0 && (
        <>
          <h2 className="admin-h2">Últimas resueltas</h2>
          <div className="admin-card" style={{ overflowX: "auto" }}>
            <table className="creditos-tabla">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Ejecutivo</th>
                  <th>Resultado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {resueltas.map((l) => (
                  <tr key={`${l.id}-${l.impugnacion?.resueltaEn}`}>
                    <td>
                      <Link href={`/admin/leads/${encodeURIComponent(l.id ?? "")}`}>{l.nombre}</Link>
                    </td>
                    <td>{nombre(l.impugnacion?.por)}</td>
                    <td>
                      {ESTADO[l.impugnacion?.estado ?? ""] ?? l.impugnacion?.estado}
                      {l.impugnacion?.creditoDevuelto ? " · crédito devuelto" : ""}
                      {l.impugnacion?.respuesta ? <div style={{ fontSize: 12 }}>{l.impugnacion.respuesta}</div> : null}
                    </td>
                    <td>{fecha(l.impugnacion?.resueltaEn)}</td>
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

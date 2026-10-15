"use client";

import { useState } from "react";
import type { Lead } from "@/lib/leads";
import { estadoAsignacion } from "@/lib/pipeline";

export interface EjecutivoElegible {
  email: string;
  nombre?: string;
}

interface Props {
  lead: Lead;
  // Para mostrar el nombre del asignado actual (puede no estar entre los elegibles).
  nombres: Record<string, string>;
  // Ejecutivos que pueden recibir leads (activos y con el interruptor prendido).
  ejecutivos: EjecutivoElegible[];
  miEmail: string;
  puedeAsignar: boolean;
  onLeadChange: (lead: Lead) => void;
}

// Bloque "Asignado a" de la ficha: muestra el ejecutivo y, para el superadmin,
// el botón Asignar (lead sin asignar) o Reasignar (US-006b). Ambos pasan por
// la API de reparto, que mueve los créditos y toma el lock.
export default function LeadAsignacion({
  lead, nombres, ejecutivos, miEmail, puedeAsignar, onLeadChange,
}: Props) {
  const asignado = estadoAsignacion(lead) === "asignado" && !!lead.asignadoA;
  const [abierto, setAbierto] = useState(false);
  const [elegido, setElegido] = useState("");
  const [enCurso, setEnCurso] = useState(false);
  const [sinSaldo, setSinSaldo] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const nombreActual = lead.asignadoA ? nombres[lead.asignadoA] || lead.asignadoA : "";
  // Al reasignar no se ofrece el ejecutivo actual.
  const opciones = ejecutivos.filter((e) => e.email !== lead.asignadoA);

  async function confirmar(permitirSinSaldo = false) {
    if (!elegido || !lead.id) return;
    setEnCurso(true);
    setAviso(null);
    try {
      const url = asignado
        ? `/api/admin/leads/${encodeURIComponent(lead.id)}/reasignar`
        : "/api/admin/reparto/asignar";
      const body = asignado
        ? { ejecutivo: elegido, permitirSinSaldo }
        : { leadId: lead.id, ejecutivo: elegido, permitirSinSaldo };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        const nuevo = ejecutivos.find((e) => e.email === elegido);
        setAviso({
          tipo: "ok",
          texto: `${asignado ? "Reasignado" : "Asignado"} a ${nuevo?.nombre || elegido}`,
        });
        onLeadChange(data.lead);
        setAbierto(false);
        setElegido("");
        setSinSaldo(false);
      } else if (data.code === "sin_saldo") {
        setSinSaldo(true);
      } else {
        setAviso({ tipo: "error", texto: data.error || "No se pudo completar." });
        // Si otra acción cambió el lead, la ficha mostrada quedó vieja.
        if (data.code === "ya_asignado" || data.code === "no_asignado") setAbierto(false);
      }
    } catch {
      setAviso({ tipo: "error", texto: "Sin conexión." });
    } finally {
      setEnCurso(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ color: "var(--admin-text-soft)", fontSize: 13 }}>Asignado a</span>
      <div className="leadasig-fila">
        <span
          className="tag"
          style={{ background: "#0D47A122", color: "#0D47A1", fontSize: 13 }}
        >
          👤 {asignado ? (lead.asignadoA === miEmail ? "Tú" : nombreActual) : "Sin asignar"}
        </span>
        {puedeAsignar && !abierto && (
          <button
            type="button"
            className="admin-btn small secondary"
            onClick={() => { setAbierto(true); setAviso(null); }}
          >
            {asignado ? "Reasignar" : "Asignar"}
          </button>
        )}
      </div>

      {abierto && (
        <div className="leadasig-fila">
          <select
            aria-label={asignado ? "Nuevo ejecutivo" : "Ejecutivo"}
            value={elegido}
            disabled={enCurso}
            onChange={(e) => { setElegido(e.target.value); setSinSaldo(false); }}
          >
            <option value="">Elegir ejecutivo…</option>
            {opciones.map((e) => (
              <option key={e.email} value={e.email}>{e.nombre || e.email}</option>
            ))}
          </select>
          <button
            type="button"
            className="admin-btn small"
            disabled={!elegido || enCurso}
            onClick={() => confirmar()}
          >
            {enCurso ? "Guardando…" : asignado ? "Confirmar reasignación" : "Asignar"}
          </button>
          <button
            type="button"
            className="admin-btn small secondary"
            disabled={enCurso}
            onClick={() => { setAbierto(false); setSinSaldo(false); }}
          >
            Cancelar
          </button>
          {asignado && (
            <span style={{ fontSize: 12, color: "var(--admin-text-soft)", flexBasis: "100%" }}>
              Motivo: corrección de asignación. Se devuelve 1 crédito a {nombreActual} y se descuenta 1 al nuevo ejecutivo.
            </span>
          )}
        </div>
      )}

      {sinSaldo && (
        <div className="admin-msg warn reparto-sinsaldo" role="alert">
          <span>Este ejecutivo no tiene créditos. ¿Asignar igual como regalo?</span>
          <span className="reparto-sinsaldo-botones">
            <button type="button" className="admin-btn small" disabled={enCurso} onClick={() => confirmar(true)}>
              Confirmar
            </button>
            <button type="button" className="admin-btn small secondary" onClick={() => setSinSaldo(false)}>
              Cancelar
            </button>
          </span>
        </div>
      )}
      {aviso && <div className={`admin-msg ${aviso.tipo}`} role="status" style={{ margin: 0 }}>{aviso.texto}</div>}
    </div>
  );
}

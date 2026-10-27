"use client";

import Link from "next/link";
import { useState } from "react";
import {
  MOTIVOS_IMPUGNACION,
  motivosValidos,
  type ImpugnacionLead,
  type MotivoImpugnacion,
} from "@/lib/pipeline";

// Bloque de impugnación en la ficha del lead: el ejecutivo asignado puede
// impugnar un lead falso; todos ven en qué quedó.
export default function ImpugnarLead({
  leadId,
  asignadoA,
  impugnacionInicial,
  falsoInicial,
  miEmail,
  esSuperadmin,
}: {
  leadId: string;
  asignadoA?: string;
  impugnacionInicial?: ImpugnacionLead;
  falsoInicial?: boolean;
  miEmail: string;
  esSuperadmin: boolean;
}) {
  const [imp, setImp] = useState(impugnacionInicial);
  const [falso, setFalso] = useState(!!falsoInicial);
  const [abierto, setAbierto] = useState(false);
  const [motivos, setMotivos] = useState<MotivoImpugnacion[]>([]);
  const [comentario, setComentario] = useState("");
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState("");

  const esMio = (asignadoA ?? "").toLowerCase() === miEmail.toLowerCase();
  const url = `/api/admin/leads/${encodeURIComponent(leadId)}/impugnar`;

  async function enviar(metodo: "POST" | "DELETE") {
    setEnCurso(true);
    setError("");
    try {
      const res = await fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: metodo === "POST" ? JSON.stringify({ motivos, comentario }) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo completar.");
        return;
      }
      setImp(data.lead.impugnacion);
      setFalso(!!data.lead.falso);
      setAbierto(false);
    } catch {
      setError("Error de red.");
    } finally {
      setEnCurso(false);
    }
  }

  if (falso) {
    return (
      <div className="admin-msg error">
        🚩 <strong>Lead falso</strong>: la impugnación fue aceptada
        {imp?.creditoDevuelto ? " y se devolvió el crédito." : "."}
      </div>
    );
  }
  if (imp?.estado === "pendiente") {
    return (
      <div className="admin-msg warn" style={{ display: "grid", gap: 8 }}>
        <div>🚩 <strong>Impugnación enviada</strong>: está esperando que el administrador la revise.</div>
        <div style={{ fontSize: 13 }}>Comentario: {imp.comentario}</div>
        {esSuperadmin && <Link href="/admin/impugnaciones">Revisar impugnaciones →</Link>}
        {esMio && (
          <div>
            <button className="admin-btn small secondary" onClick={() => enviar("DELETE")} disabled={enCurso}>
              Retirar impugnación (el cliente sí respondió)
            </button>
          </div>
        )}
        {error && <div className="admin-msg error" style={{ margin: 0 }}>{error}</div>}
      </div>
    );
  }
  if (imp?.estado === "rechazada") {
    return (
      <div className="admin-msg warn">
        🚩 Impugnación <strong>rechazada</strong>: {imp.respuesta}
      </div>
    );
  }
  if (!esMio) return null;

  if (!abierto) {
    return (
      <div style={{ marginBottom: 12 }}>
        <button className="admin-btn small secondary" onClick={() => setAbierto(true)}>
          🚩 Impugnar lead falso
        </button>
      </div>
    );
  }

  const valido = motivosValidos(motivos) && comentario.trim().length >= 10;
  return (
    <div className="admin-card admin-form" style={{ display: "grid", gap: 10 }}>
      <strong>🚩 Impugnar lead falso</strong>
      <p style={{ margin: 0, fontSize: 13 }}>
        Solo vale si <strong>el teléfono es falso</strong> y además <strong>el nombre o el correo</strong>.
        Si el teléfono es real pero el cliente no contesta, no es un lead falso: no se puede impugnar.
      </p>
      {MOTIVOS_IMPUGNACION.map((m) => (
        <label key={m.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            style={{ width: 20, height: 20, flex: "none" }}
            checked={motivos.includes(m.id)}
            onChange={(e) =>
              setMotivos((ms) => (e.target.checked ? [...ms, m.id] : ms.filter((x) => x !== m.id)))
            }
          />
          {m.label}
        </label>
      ))}
      <label style={{ display: "grid", gap: 4 }}>
        ¿Cómo lo comprobaste?
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={3}
          placeholder="Ej.: el número no tiene WhatsApp y al llamar dice que no existe; el nombre es “jajaja”."
        />
      </label>
      {motivos.length > 0 && !motivosValidos(motivos) && (
        <div className="admin-msg warn" style={{ margin: 0 }}>
          Para impugnar, marca el teléfono y además el nombre o el correo.
        </div>
      )}
      {error && <div className="admin-msg error" style={{ margin: 0 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="admin-btn small" onClick={() => enviar("POST")} disabled={!valido || enCurso}>
          {enCurso ? "Enviando…" : "Enviar impugnación"}
        </button>
        <button className="admin-btn small secondary" onClick={() => setAbierto(false)} disabled={enCurso}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { fechaRelativa } from "@/lib/fecha-relativa";

export interface LeadCola {
  id: string;
  nombre: string;
  canal: string;
  fecha: string;
}

export interface EjecutivoOpcion {
  email: string;
  nombre: string;
  saldo: number;
}

const CANALES: Record<string, { label: string; clase: string }> = {
  "google-ads": { label: "📢 Google Ads", clase: "green" },
  "meta-ads": { label: "📘 Meta Ads", clase: "orange" },
  whatsapp: { label: "💬 WhatsApp", clase: "green" },
  "web-organico": { label: "🌐 Web orgánico", clase: "gray" },
};

interface Aviso {
  tipo: "ok" | "error" | "warn";
  texto: string;
}

export default function RepartoCola({
  leadsIniciales,
  ejecutivosIniciales,
}: {
  leadsIniciales: LeadCola[];
  ejecutivosIniciales: EjecutivoOpcion[];
}) {
  const [leads, setLeads] = useState(leadsIniciales);
  const [ejecutivos, setEjecutivos] = useState(ejecutivosIniciales);
  const [elegido, setElegido] = useState<Record<string, string>>({});
  const [enCurso, setEnCurso] = useState<string | null>(null);
  // Lead cuyo ejecutivo no tiene saldo y espera la confirmación "como regalo".
  const [sinSaldo, setSinSaldo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  function quitar(leadId: string) {
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
  }

  async function asignar(leadId: string, permitirSinSaldo = false) {
    const ejecutivo = elegido[leadId];
    if (!ejecutivo) return;
    setEnCurso(leadId);
    setAviso(null);
    try {
      const res = await fetch("/api/admin/reparto/asignar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, ejecutivo, permitirSinSaldo }),
      });
      const data = await res.json();
      if (res.ok) {
        const nombre = ejecutivos.find((e) => e.email === ejecutivo)?.nombre ?? ejecutivo;
        setEjecutivos((prev) =>
          prev.map((e) => (e.email === ejecutivo ? { ...e, saldo: data.saldo } : e)),
        );
        quitar(leadId);
        setSinSaldo(null);
        setAviso({ tipo: "ok", texto: `Asignado a ${nombre}` });
      } else if (data.code === "sin_saldo") {
        setSinSaldo(leadId);
      } else if (data.code === "ya_asignado") {
        quitar(leadId); // ya no pertenece a la cola
        setSinSaldo(null);
        setAviso({ tipo: "warn", texto: data.error });
      } else {
        setAviso({ tipo: "error", texto: data.error || "No se pudo asignar." });
      }
    } catch {
      setAviso({ tipo: "error", texto: "Sin conexión." });
    } finally {
      setEnCurso(null);
    }
  }

  return (
    <>
      <h1 className="admin-h1">Reparto · Sin asignar ({leads.length})</h1>
      {aviso && (
        <div className={`admin-msg ${aviso.tipo}`} role="status">
          {aviso.texto}
        </div>
      )}

      {leads.length === 0 ? (
        <div className="admin-card reparto-vacio">Todos los leads están asignados 🎉</div>
      ) : (
        leads.map((l) => {
          const canal = CANALES[l.canal] ?? CANALES["web-organico"];
          const ocupado = enCurso === l.id;
          return (
            <div key={l.id} className="admin-card reparto-fila">
              <div className="reparto-fila-main">
                <Link href={`/admin/leads/${encodeURIComponent(l.id)}`} className="reparto-nombre">
                  {l.nombre}
                </Link>
                <div className="reparto-meta">
                  <span className={`tag ${canal.clase}`}>{canal.label}</span>
                  <span suppressHydrationWarning>{fechaRelativa(l.fecha)}</span>
                </div>
              </div>
              <div className="reparto-fila-accion">
                <select
                  aria-label={`Ejecutivo para ${l.nombre}`}
                  value={elegido[l.id] ?? ""}
                  disabled={ocupado}
                  onChange={(e) => {
                    setElegido((prev) => ({ ...prev, [l.id]: e.target.value }));
                    if (sinSaldo === l.id) setSinSaldo(null);
                  }}
                >
                  <option value="">Elegir ejecutivo…</option>
                  {ejecutivos.map((e) => (
                    <option key={e.email} value={e.email}>
                      {e.nombre} ({e.saldo})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="admin-btn small"
                  disabled={!elegido[l.id] || ocupado}
                  onClick={() => asignar(l.id)}
                >
                  {ocupado ? "Asignando…" : "Asignar"}
                </button>
              </div>
              {sinSaldo === l.id && (
                <div className="admin-msg warn reparto-sinsaldo" role="alert">
                  <span>Este ejecutivo no tiene créditos. ¿Asignar igual como regalo?</span>
                  <span className="reparto-sinsaldo-botones">
                    <button
                      type="button"
                      className="admin-btn small"
                      disabled={ocupado}
                      onClick={() => asignar(l.id, true)}
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      className="admin-btn small secondary"
                      onClick={() => setSinSaldo(null)}
                    >
                      Cancelar
                    </button>
                    <Link href="/admin/creditos" className="admin-btn small secondary">
                      Regalar créditos
                    </Link>
                  </span>
                </div>
              )}
            </div>
          );
        })
      )}
    </>
  );
}

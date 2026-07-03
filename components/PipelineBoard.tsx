"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Lead } from "@/lib/leads";
import type { EtapaLead } from "@/lib/pipeline";
import { ETAPAS, CALIDADES } from "@/lib/pipeline";

function formatearFechaCorta(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}

// Detecta si el lead tiene algún recordatorio vencido y no notificado.
function tieneVencido(lead: Lead): boolean {
  const now = Date.now();
  return (lead.recordatorios ?? []).some(
    (r) => !r.notificado && Date.parse(r.fecha) <= now,
  );
}

function proximoRecordatorio(lead: Lead): string | null {
  const recs = (lead.recordatorios ?? [])
    .filter((r) => !r.notificado)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  return recs[0]?.fecha ?? null;
}

export default function PipelineBoard({
  initialLeads,
  miEmail: _miEmail,
}: {
  initialLeads: Lead[];
  miEmail: string;
}) {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [filtroMios, setFiltroMios] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return leads.filter((l) => {
      if (filtroMios && l.asignadoA !== _miEmail) return false;
      if (!q) return true;
      return (
        (l.nombre ?? "").toLowerCase().includes(q) ||
        (l.rut ?? "").toLowerCase().includes(q) ||
        (l.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [leads, filtroMios, busqueda, _miEmail]);

  // Agrupar por etapa. Los que no tienen etapa caen en "nuevo".
  const porEtapa = useMemo(() => {
    const map = new Map<EtapaLead, Lead[]>();
    for (const e of ETAPAS) map.set(e.id, []);
    for (const l of filtrados) {
      const etapa = (l.etapa ?? "nuevo") as EtapaLead;
      map.get(etapa)?.push(l);
    }
    return map;
  }, [filtrados]);

  async function moverLead(leadId: string, nuevaEtapa: EtapaLead) {
    // Optimista: cambio inmediato en el UI y luego confirmo con backend.
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, etapa: nuevaEtapa } : l)),
    );
    try {
      await fetch(`/api/admin/leads/${encodeURIComponent(leadId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etapa: nuevaEtapa }),
      });
      router.refresh();
    } catch {
      // Si falla, revertimos.
      setLeads(initialLeads);
    }
  }

  return (
    <>
      <h1 className="admin-h1">Pipeline · {filtrados.length} lead{filtrados.length === 1 ? "" : "s"}</h1>
      <input
        className="admin-search"
        type="search"
        placeholder="Buscar por nombre, RUT o email…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />
      <div className="admin-filters" style={{ marginBottom: 14 }}>
        <button
          className={`pill ${filtroMios ? "active" : ""}`}
          onClick={() => setFiltroMios((v) => !v)}
        >
          {filtroMios ? "Mostrar todos" : "Solo mis leads"}
        </button>
      </div>

      <div className="pipeline-board">
        {ETAPAS.map((etapa) => {
          const items = porEtapa.get(etapa.id) ?? [];
          const total = items.reduce((sum, l) => sum + (l.sueldoLiquido ?? 0), 0);
          return (
            <div key={etapa.id} className="pipeline-column">
              <div
                className="pipeline-column-header"
                style={{ borderTopColor: etapa.color }}
              >
                <span>
                  <span style={{ marginRight: 6 }}>{etapa.icon}</span>
                  <strong>{etapa.label}</strong>
                </span>
                <span className="pipeline-column-count">{items.length}</span>
              </div>
              <div className="pipeline-column-body">
                {items.length === 0 && (
                  <div className="pipeline-empty">Sin leads en esta etapa</div>
                )}
                {items.map((lead) => (
                  <PipelineCard
                    key={lead.id}
                    lead={lead}
                    onMover={(nueva) => lead.id && moverLead(lead.id, nueva)}
                  />
                ))}
              </div>
              {total > 0 && (
                <div className="pipeline-column-footer">
                  Σ sueldos: ${total.toLocaleString("es-CL")}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function PipelineCard({
  lead,
  onMover,
}: {
  lead: Lead;
  onMover: (nueva: EtapaLead) => void;
}) {
  const vencido = tieneVencido(lead);
  const proxRec = proximoRecordatorio(lead);
  const proxRecFmt = proxRec ? formatearFechaCorta(proxRec) : null;
  const calidad = CALIDADES.find((c) => c.id === lead.calidad);
  return (
    <div className="pipeline-card">
      <Link
        href={`/admin/leads/${encodeURIComponent(lead.id ?? "")}`}
        className="pipeline-card-link"
      >
        <div className="pipeline-card-name">
          {calidad && <span title={calidad.label}>{calidad.icon}</span>}
          {lead.nombre || "Sin nombre"}
          {vencido && <span className="pipeline-card-badge">⚠️</span>}
        </div>
        {lead.telefono && (
          <div className="pipeline-card-meta">📞 {lead.telefono}</div>
        )}
        {lead.email && (
          <div className="pipeline-card-meta">✉ {lead.email}</div>
        )}
        {lead.isapre && (
          <div className="pipeline-card-tag">{lead.isapre}</div>
        )}
        {proxRecFmt && (
          <div className="pipeline-card-recordatorio" style={{ color: vencido ? "#B45309" : "#0369A1" }}>
            🔔 {proxRecFmt}
          </div>
        )}
        {lead.asignadoA && (
          <div className="pipeline-card-asignado">👤 {lead.asignadoA}</div>
        )}
      </Link>
      <select
        className="pipeline-card-select"
        value={lead.etapa ?? "nuevo"}
        onChange={(e) => onMover(e.target.value as EtapaLead)}
        aria-label="Mover a etapa"
      >
        {ETAPAS.map((e) => (
          <option key={e.id} value={e.id}>{e.icon} {e.label}</option>
        ))}
      </select>
    </div>
  );
}

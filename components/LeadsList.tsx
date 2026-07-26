"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Lead, CanalLead } from "@/lib/leads";
import { ETAPAS, CALIDADES } from "@/lib/pipeline";

type Filtro = "todos" | CanalLead;

function tagEtapa(etapa?: string) {
  const e = ETAPAS.find((x) => x.id === (etapa ?? "nuevo")) ?? ETAPAS[0];
  return (
    <span className="tag" style={{ background: e.color + "22", color: e.color }}>
      {e.icon} {e.label}
    </span>
  );
}

function tagCalidad(calidad?: string) {
  const c = CALIDADES.find((x) => x.id === calidad);
  if (!c) return null;
  return (
    <span className="tag" style={{ background: c.color + "22", color: c.color }}>
      {c.icon} {c.label}
    </span>
  );
}

const FILTROS: { id: Filtro; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "google-ads", label: "Google Ads" },
  { id: "meta-ads", label: "Meta Ads" },
  { id: "web-organico", label: "Web orgánico" },
  { id: "whatsapp", label: "WhatsApp" },
];

function tagCanal(canal?: string) {
  if (canal === "google-ads") return <span className="tag green">📢 Google Ads</span>;
  if (canal === "meta-ads")
    return <span className="tag" style={{ background: "#1877F222", color: "#1877F2" }}>📘 Meta Ads</span>;
  if (canal === "whatsapp") return <span className="tag green">💬 WhatsApp</span>;
  return <span className="tag gray">🌐 Web orgánico</span>;
}

function tagOrigen(origen?: string) {
  if (origen === "landing-form") return <span className="tag">📋 Formulario</span>;
  if (origen === "web-chat") return <span className="tag">💭 Chat Romina</span>;
  if (origen === "whatsapp-chat") return <span className="tag">📱 WhatsApp</span>;
  if (origen === "meta-leadform") return <span className="tag">📘 Form instantáneo</span>;
  return origen ? <span className="tag gray">{origen}</span> : null;
}

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

export default function LeadsList({
  leads,
  mostrarAsignado = false,
  nombresUsuarios = {},
}: {
  leads: Lead[];
  mostrarAsignado?: boolean;
  nombresUsuarios?: Record<string, string>;
}) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [query, setQuery] = useState("");

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (filtro !== "todos" && (l.canal ?? "web-organico") !== filtro) return false;
      if (!q) return true;
      return (
        l.nombre?.toLowerCase().includes(q) ||
        l.rut?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.telefono?.toLowerCase().includes(q)
      );
    });
  }, [leads, filtro, query]);

  return (
    <>
      <h1 className="admin-h1">{leads.length} lead{leads.length === 1 ? "" : "s"}</h1>
      <input
        className="admin-search"
        type="search"
        placeholder="Buscar por nombre, RUT, email o teléfono…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="admin-filters">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            className={`pill ${filtro === f.id ? "active" : ""}`}
            onClick={() => setFiltro(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <div className="admin-empty">
          {leads.length === 0
            ? "Todavía no hay leads. Cuando llegue el primero aparece acá."
            : "No hay leads que coincidan con el filtro."}
        </div>
      ) : (
        filtrados.map((lead) => (
          <Link
            key={lead.id}
            href={`/admin/leads/${encodeURIComponent(lead.id || "")}`}
            className="admin-card admin-card-link"
          >
            <div className="lead-card-row">
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="lead-card-name">{lead.nombre || "Sin nombre"}</div>
                <div className="lead-card-meta">
                  {lead.region || "—"}
                  {lead.edad ? ` · ${lead.edad} años` : ""}
                  {lead.telefono ? ` · ${lead.telefono}` : ""}
                </div>
              </div>
              <div className="lead-card-date">{formatearFecha(lead.fecha)}</div>
            </div>
            <div className="lead-card-tags">
              {tagEtapa(lead.etapa)}
              {tagCalidad(lead.calidad)}
              {tagCanal(lead.canal)}
              {tagOrigen(lead.origen)}
              {lead.isapre && <span className="tag orange">{lead.isapre}</span>}
              {mostrarAsignado && lead.asignadoA && (
                <span className="tag" style={{ background: "#0D47A122", color: "#0D47A1" }}>
                  👤 {nombresUsuarios[lead.asignadoA] || lead.asignadoA}
                </span>
              )}
              {mostrarAsignado && !lead.asignadoA && (
                <span className="tag gray">👤 Sin asignar</span>
              )}
            </div>
          </Link>
        ))
      )}
    </>
  );
}

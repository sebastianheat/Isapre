import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { listarLeads, type Lead } from "@/lib/leads";
import { ETAPAS, CALIDADES, type EtapaLead, type CalidadLead } from "@/lib/pipeline";
import AdminShell from "@/components/AdminShell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Colores de marca por etapa en su paso oscuro (mismo hue que el pipeline,
// validado para barras sobre superficie clara: L 0.43-0.77, CVD ΔE≥23).
// Cada barra lleva además icono + nombre + conteo en texto (nunca solo color).
const CHART_ETAPA: Record<EtapaLead, string> = {
  nuevo: "#2563EB",
  contactando: "#D97706",
  cotizado: "#7C3AED",
  pendiente: "#CA8A04",
  agendado: "#0891B2",
  ganado: "#059669",
  perdido: "#DC2626",
};
const CHART_CALIDAD: Record<CalidadLead, string> = {
  calificado: "#059669",
  marginal: "#D97706",
  no_calificado: "#DC2626",
};

const DIA_MS = 24 * 60 * 60 * 1000;

function clp(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-CL");
}

// Clave y etiqueta de día en zona Santiago.
function diaSantiago(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export default async function MetricasPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/admin");

  const leads = await listarLeads(500);
  const ahora = Date.now();
  const hace14 = ahora - 14 * DIA_MS;
  const hace28 = ahora - 28 * DIA_MS;

  const en14 = leads.filter((l) => l.fecha && Date.parse(l.fecha) >= hace14);
  const en14a28 = leads.filter(
    (l) => l.fecha && Date.parse(l.fecha) >= hace28 && Date.parse(l.fecha) < hace14,
  );

  // Tiles
  const totales14 = en14.length;
  const delta = en14a28.length > 0 ? totales14 - en14a28.length : null;
  const conCalidad = leads.filter((l) => l.calidad);
  const calificados = conCalidad.filter((l) => l.calidad === "calificado").length;
  const tasaCalif = conCalidad.length > 0 ? Math.round((calificados / conCalidad.length) * 100) : null;
  const deAds = leads.filter((l) => (l.canal ?? "web-organico") === "google-ads").length;
  const pctAds = leads.length > 0 ? Math.round((deAds / leads.length) * 100) : 0;
  // Valor potencial: 7% × 24 meses de los leads que siguen vivos.
  const valorCartera = leads
    .filter((l) => l.etapa !== "perdido")
    .reduce((s, l) => s + (l.sueldoLiquido ? (l.sueldoLiquido / 0.8) * 0.07 * 24 : 0), 0);

  // Serie diaria (14 días, Santiago)
  const dias: { clave: string; label: string; n: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(ahora - i * DIA_MS);
    const clave = diaSantiago(d.toISOString());
    const label = new Intl.DateTimeFormat("es-CL", {
      timeZone: "America/Santiago",
      weekday: "short",
      day: "numeric",
    }).format(d);
    dias.push({ clave, label, n: 0 });
  }
  const porDia = new Map(dias.map((d) => [d.clave, d]));
  for (const l of en14) {
    if (!l.fecha) continue;
    const e = porDia.get(diaSantiago(l.fecha));
    if (e) e.n += 1;
  }
  const maxDia = Math.max(1, ...dias.map((d) => d.n));

  // Distribuciones
  const canales = [
    { id: "google-ads", label: "📢 Google Ads", color: "#2563EB" },
    { id: "meta-ads", label: "📘 Meta Ads", color: "#7C3AED" },
    { id: "web-organico", label: "🌐 Web orgánico", color: "#0891B2" },
    { id: "whatsapp", label: "💬 WhatsApp", color: "#059669" },
  ].map((c) => ({
    ...c,
    n: leads.filter((l) => (l.canal ?? "web-organico") === c.id).length,
  }));
  const maxCanal = Math.max(1, ...canales.map((c) => c.n));

  const etapas = ETAPAS.map((e) => ({
    ...e,
    chartColor: CHART_ETAPA[e.id],
    n: leads.filter((l) => (l.etapa ?? "nuevo") === e.id).length,
  }));
  const maxEtapa = Math.max(1, ...etapas.map((e) => e.n));

  const calidades = [
    ...CALIDADES.map((c) => ({
      label: `${c.icon} ${c.label}`,
      color: CHART_CALIDAD[c.id],
      n: leads.filter((l) => l.calidad === c.id).length,
    })),
    {
      label: "⚪ Sin marcar",
      color: "#94A3B8",
      n: leads.filter((l) => !l.calidad).length,
    },
  ];
  const maxCalidad = Math.max(1, ...calidades.map((c) => c.n));

  return (
    <AdminShell title="Métricas" userEmail={sesion.email} role={sesion.role}>
      <h1 className="admin-h1">Métricas</h1>

      <div className="metric-tiles">
        <div className="metric-tile">
          <span className="metric-tile-label">Leads · 14 días</span>
          <span className="metric-tile-value">{totales14}</span>
          {delta !== null && (
            <span className="metric-tile-delta" style={{ color: delta >= 0 ? "#059669" : "#DC2626" }}>
              {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)} vs 14 días previos
            </span>
          )}
        </div>
        <div className="metric-tile">
          <span className="metric-tile-label">Tasa de calificación</span>
          <span className="metric-tile-value">{tasaCalif !== null ? `${tasaCalif}%` : "—"}</span>
          <span className="metric-tile-delta">
            {conCalidad.length > 0
              ? `${calificados} de ${conCalidad.length} marcados`
              : "marca la calidad de los leads"}
          </span>
        </div>
        <div className="metric-tile">
          <span className="metric-tile-label">Desde Google Ads</span>
          <span className="metric-tile-value">{pctAds}%</span>
          <span className="metric-tile-delta">{deAds} de {leads.length} leads</span>
        </div>
        <div className="metric-tile">
          <span className="metric-tile-label">Valor potencial cartera</span>
          <span className="metric-tile-value" style={{ fontSize: 22 }}>{clp(valorCartera)}</span>
          <span className="metric-tile-delta">7% × 24 meses · sin perdidos</span>
        </div>
      </div>

      <h2 className="admin-h2">Leads por día · últimos 14 días</h2>
      <div className="admin-card">
        <div className="metric-colchart" role="img" aria-label="Leads por día, últimos 14 días">
          {dias.map((d) => (
            <div key={d.clave} className="metric-col" title={`${d.label}: ${d.n} lead${d.n === 1 ? "" : "s"}`}>
              {d.n > 0 && d.n === maxDia && <span className="metric-col-top">{d.n}</span>}
              <div
                className="metric-col-bar"
                style={{ height: `${Math.max(4, (d.n / maxDia) * 100)}%`, opacity: d.n === 0 ? 0.15 : 1 }}
              />
              <span className="metric-col-label">{d.label.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      </div>

      <h2 className="admin-h2">Por canal</h2>
      <div className="admin-card">
        {canales.map((c) => (
          <div key={c.id} className="metric-row" title={`${c.label}: ${c.n}`}>
            <span className="metric-row-label">{c.label}</span>
            <div className="metric-row-track">
              <div className="metric-row-bar" style={{ width: `${(c.n / maxCanal) * 100}%`, background: c.color }} />
            </div>
            <span className="metric-row-n">{c.n}</span>
          </div>
        ))}
      </div>

      <h2 className="admin-h2">Por etapa del pipeline</h2>
      <div className="admin-card">
        {etapas.map((e) => (
          <div key={e.id} className="metric-row" title={`${e.label}: ${e.n}`}>
            <span className="metric-row-label">{e.icon} {e.label}</span>
            <div className="metric-row-track">
              <div className="metric-row-bar" style={{ width: `${(e.n / maxEtapa) * 100}%`, background: e.chartColor, opacity: e.n === 0 ? 0.15 : 1 }} />
            </div>
            <span className="metric-row-n">{e.n}</span>
          </div>
        ))}
      </div>

      <h2 className="admin-h2">Por calidad (alimenta Google Ads)</h2>
      <div className="admin-card">
        {calidades.map((c) => (
          <div key={c.label} className="metric-row" title={`${c.label}: ${c.n}`}>
            <span className="metric-row-label">{c.label}</span>
            <div className="metric-row-track">
              <div className="metric-row-bar" style={{ width: `${(c.n / maxCalidad) * 100}%`, background: c.color, opacity: c.n === 0 ? 0.15 : 1 }} />
            </div>
            <span className="metric-row-n">{c.n}</span>
          </div>
        ))}
        <p style={{ fontSize: 12, color: "var(--admin-text-soft)", marginTop: 10 }}>
          Los ✅ calificados con gclid se reportan a Google Ads (CSV del lunes o botón de export).
          Mientras más rápido se marque la calidad, mejor optimiza la campaña.
        </p>
      </div>
    </AdminShell>
  );
}

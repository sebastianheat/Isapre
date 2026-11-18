import type { Lead } from "@/lib/leads";

// Etiquetas de los leads traspasados al jefe de equipo:
// roja "Antiguo" (lead antiguo sin dueño) y amarilla "Impugnado".
export function esAntiguo(l: Lead): boolean {
  return (l.notas ?? []).some((n) => n.texto.includes("Lead antiguo sin dueño"));
}

export function esImpugnado(l: Lead): boolean {
  return l.falso === true || l.etapa === "impugnado";
}

export default function EtiquetasTraspaso({ lead }: { lead: Lead }) {
  return (
    <>
      {esAntiguo(lead) && (
        <span className="tag" style={{ background: "#DC2626", color: "#fff", fontWeight: 700 }}>Antiguo</span>
      )}
      {esImpugnado(lead) && (
        <span className="tag" style={{ background: "#FACC15", color: "#422006", fontWeight: 700 }}>Impugnado</span>
      )}
    </>
  );
}

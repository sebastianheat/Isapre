"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LeadDetailActions({
  leadId,
  role,
}: {
  leadId: string;
  role: "superadmin" | "ejecutivo";
}) {
  const router = useRouter();
  const [eliminando, setEliminando] = useState(false);

  if (role !== "superadmin") return null;

  async function eliminar() {
    if (!confirm("¿Eliminar este lead? Esta acción no se puede deshacer.")) return;
    setEliminando(true);
    try {
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(leadId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.replace("/admin/leads");
        router.refresh();
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j.error || "No se pudo eliminar.");
        setEliminando(false);
      }
    } catch {
      alert("Sin conexión.");
      setEliminando(false);
    }
  }

  return (
    <button onClick={eliminar} className="admin-btn danger" disabled={eliminando} style={{ marginTop: 12 }}>
      {eliminando ? "Eliminando…" : "Eliminar lead"}
    </button>
  );
}

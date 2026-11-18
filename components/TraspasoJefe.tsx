"use client";

import { useState } from "react";

interface Fila {
  id?: string;
  nombre: string;
  fecha?: string;
  asignadoA: string | null;
  etapa: string;
}

const fecha = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("es-CL", { timeZone: "America/Santiago" }) : "";

// Leads sin dueño del equipo actual (y los impugnados) → al jefe de equipo,
// sin costo. Muestra la lista antes de traspasar.
export default function TraspasoJefe({
  jefe,
  sinDueno,
  impugnados,
}: {
  jefe: { email: string; nombre?: string } | null;
  sinDueno: Fila[];
  impugnados: Fila[];
}) {
  const [hecho, setHecho] = useState("");
  const [enCurso, setEnCurso] = useState(false);
  const total = sinDueno.length + impugnados.length;
  if (!jefe) return <div className="admin-card">Crea un usuario Administrador para usar el traspaso.</div>;

  async function traspasar() {
    if (!confirm(`¿Traspasar ${total} leads a ${jefe!.nombre || jefe!.email}? No le descuenta créditos.`)) return;
    setEnCurso(true);
    const r = await fetch("/api/admin/traspaso", { method: "POST" }).then((x) => x.json()).catch(() => null);
    setEnCurso(false);
    setHecho(
      r?.error
        ? r.error
        : `Listo: ${r?.sinDueno ?? 0} sin dueño y ${r?.impugnados ?? 0} impugnados pasaron a ${jefe!.nombre || jefe!.email}.${
            r?.fallidos?.length ? ` No se pudieron: ${r.fallidos.join(", ")}.` : ""
          }`,
    );
  }

  const lista = (filas: Fila[]) => (
    <div style={{ maxHeight: 260, overflowY: "auto", fontSize: 13 }}>
      {filas.map((f) => (
        <div key={f.id} style={{ padding: "4px 0", borderBottom: "1px solid var(--admin-border)" }}>
          <strong>{f.nombre}</strong> · {fecha(f.fecha)} · {f.etapa} · {f.asignadoA ? `de ${f.asignadoA}` : "sin asignar"}
        </div>
      ))}
    </div>
  );

  return (
    <div className="admin-card" style={{ display: "grid", gap: 10 }}>
      <p style={{ margin: 0, fontSize: 13 }}>
        Pasan a <strong>{jefe.nombre || jefe.email}</strong>, sin descontarle créditos: los leads sin dueño del equipo
        actual (sin asignar, de Cynthia, de info@ o de usuarios borrados; no los Ganados) y los impugnados, que quedan
        en la etapa <strong>Impugnado</strong>.
      </p>
      {hecho ? (
        <div className="admin-msg ok" style={{ margin: 0 }}>{hecho}</div>
      ) : total === 0 ? (
        <div>No hay leads para traspasar.</div>
      ) : (
        <>
          <strong>Sin dueño del equipo: {sinDueno.length}</strong>
          {sinDueno.length > 0 && lista(sinDueno)}
          <strong>Impugnados: {impugnados.length}</strong>
          {impugnados.length > 0 && lista(impugnados)}
          <button className="admin-btn" onClick={traspasar} disabled={enCurso}>
            {enCurso ? "Traspasando…" : `Traspasar ${total} leads a ${jefe.nombre || jefe.email}`}
          </button>
        </>
      )}
    </div>
  );
}

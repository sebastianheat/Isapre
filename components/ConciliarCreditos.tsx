"use client";

import { useState } from "react";
import type { FilaConciliacion } from "@/lib/conciliar-creditos";

// Tabla de conciliación: saldo que muestra el panel vs. el que corresponde
// según los leads cobrados. "Ajustar" deja el saldo en el número de la columna
// "Dejar en" y lo registra como Ajuste en el historial del ejecutivo.
export default function ConciliarCreditos({ filasIniciales }: { filasIniciales: FilaConciliacion[] }) {
  const [filas, setFilas] = useState(filasIniciales);
  const [objetivo, setObjetivo] = useState<Record<string, string>>(
    Object.fromEntries(filasIniciales.map((f) => [f.email, String(f.saldoCorrecto)])),
  );
  const [motivo, setMotivo] = useState("Conciliación tras la caída de la base del 24-10");
  const [enCurso, setEnCurso] = useState("");
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const descuadradas = filas.filter((f) => f.diferencia !== 0).length;

  async function ajustar(f: FilaConciliacion) {
    setEnCurso(f.email);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/creditos/ajustar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: f.email, saldo: Number(objetivo[f.email]), motivo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ tipo: "error", texto: data.error || "No se pudo ajustar." });
        return;
      }
      setFilas((fs) =>
        fs.map((x) =>
          x.email === f.email
            ? { ...x, saldoGuardado: data.saldo, saldoHistorial: data.saldo, diferencia: x.saldoCorrecto - data.saldo }
            : x,
        ),
      );
      setMsg({ tipo: "ok", texto: `${f.nombre} quedó con ${data.saldo} créditos.` });
    } catch {
      setMsg({ tipo: "error", texto: "Error de red." });
    } finally {
      setEnCurso("");
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="admin-card" style={{ display: "grid", gap: 8 }}>
        <p style={{ margin: 0 }}>
          <strong>Corresponde</strong> = créditos que recibió (regalos y ajustes a favor) menos los leads
          que hoy tiene asignados y que se le cobraron. Las asignaciones como regalo no descuentan.
        </p>
        <p style={{ margin: 0 }}>
          {descuadradas === 0
            ? "Todos los saldos cuadran."
            : `${descuadradas} ejecutivo(s) con el saldo distinto a lo que corresponde.`}
        </p>
        <label style={{ display: "grid", gap: 4 }}>
          Motivo del ajuste (queda en el historial)
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </label>
        {msg && <p className={`admin-msg ${msg.tipo === "error" ? "error" : ""}`} style={{ margin: 0 }}>{msg.texto}</p>}
      </div>
      <div className="admin-card" style={{ overflowX: "auto" }}>
        <table className="creditos-tabla">
          <thead>
            <tr>
              <th>Ejecutivo</th>
              <th className="num">Saldo hoy</th>
              <th className="num">Recibidos</th>
              <th className="num">Leads asignados</th>
              <th className="num">Cobrados</th>
              <th className="num">Corresponde</th>
              <th>Dejar en</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.email}>
                <td>
                  <a href={`/admin/creditos/${encodeURIComponent(f.email)}`}>{f.nombre}</a>
                  {f.saldoHistorial !== f.saldoGuardado && (
                    <div style={{ fontSize: 12 }}>historial dice {f.saldoHistorial}</div>
                  )}
                  {f.cobrosHistorial !== f.leadsCobrados && (
                    <div style={{ fontSize: 12 }}>historial registra {f.cobrosHistorial} cobro(s)</div>
                  )}
                </td>
                <td className="num">{f.saldoGuardado}</td>
                <td className="num">{f.recibidos}</td>
                <td className="num">{f.leadsAsignados}</td>
                <td className="num">{f.leadsCobrados}</td>
                <td className="num">
                  <strong>{f.saldoCorrecto}</strong>
                  {f.diferencia !== 0 && <div style={{ fontSize: 12 }}>({f.diferencia > 0 ? "+" : ""}{f.diferencia})</div>}
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    value={objetivo[f.email] ?? ""}
                    onChange={(e) => setObjetivo((o) => ({ ...o, [f.email]: e.target.value }))}
                    style={{ width: 70 }}
                  />
                </td>
                <td>
                  <button
                    className="admin-btn small"
                    onClick={() => ajustar(f)}
                    disabled={enCurso !== "" || Number(objetivo[f.email]) === f.saldoGuardado}
                  >
                    {enCurso === f.email ? "Ajustando…" : "Ajustar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

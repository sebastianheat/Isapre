"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export interface FilaSaldo {
  email: string;
  nombre: string;
  saldo: number;
  impugnados?: { pendientes: number; total: number };
}

export default function CreditosPanel({
  filasIniciales,
  ejecutivoInicial,
}: {
  filasIniciales: FilaSaldo[];
  ejecutivoInicial?: string;
}) {
  const router = useRouter();
  const [filas, setFilas] = useState(filasIniciales);
  const [email, setEmail] = useState(ejecutivoInicial ?? "");
  const [cantidad, setCantidad] = useState("1");
  const [motivo, setMotivo] = useState("");
  const [errorMotivo, setErrorMotivo] = useState("");
  const [error, setError] = useState("");
  const [enCurso, setEnCurso] = useState(false);

  async function regalar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setErrorMotivo("");
    if (!email) return setError("Elige un ejecutivo");
    if (!motivo.trim()) return setErrorMotivo("Escribe un motivo para este movimiento");
    const n = Number(cantidad);
    if (!Number.isInteger(n) || n <= 0) return setError("La cantidad debe ser un entero positivo");

    setEnCurso(true);
    try {
      const res = await fetch("/api/admin/creditos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, cantidad: n, motivo }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.campo === "motivo") setErrorMotivo(data.error);
        else setError(data.error || "No se pudo regalar.");
        return;
      }
      setFilas((prev) => prev.map((f) => (f.email === email ? { ...f, saldo: data.saldo } : f)));
      // Tras confirmar se muestra el historial con el movimiento recién creado.
      router.push(`/admin/creditos/${encodeURIComponent(email)}`);
    } catch {
      setError("Sin conexión.");
    } finally {
      setEnCurso(false);
    }
  }

  return (
    <>
      <h1 className="admin-h1">Créditos</h1>

      <form className="admin-card creditos-form" onSubmit={regalar} noValidate>
        <h2 className="admin-h2" style={{ margin: 0 }}>Regalar créditos</h2>
        {error && <div className="admin-msg error" role="alert" style={{ margin: 0 }}>{error}</div>}
        <label>
          <span>Ejecutivo</span>
          <select value={email} onChange={(e) => setEmail(e.target.value)} disabled={enCurso}>
            <option value="">Elegir ejecutivo…</option>
            {filas.map((f) => (
              <option key={f.email} value={f.email}>{f.nombre}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Cantidad</span>
          <input
            type="number" min={1} step={1} inputMode="numeric"
            value={cantidad} onChange={(e) => setCantidad(e.target.value)} disabled={enCurso}
          />
        </label>
        <label>
          <span>Motivo (obligatorio)</span>
          <textarea
            rows={2} value={motivo} disabled={enCurso}
            placeholder="Ej. Créditos de arranque de la Fase 1"
            onChange={(e) => { setMotivo(e.target.value); setErrorMotivo(""); }}
          />
          {errorMotivo && <div className="creditos-campo-error" role="alert">{errorMotivo}</div>}
        </label>
        <button type="submit" className="admin-btn" disabled={enCurso}>
          {enCurso ? "Regalando…" : "Regalar"}
        </button>
      </form>

      <h2 className="admin-h2">Saldos</h2>
      <p style={{ marginTop: 0 }}>
        <Link href="/admin/creditos/conciliar">Revisar si los saldos cuadran con los leads entregados →</Link>
      </p>
      <div className="admin-card">
        <table className="creditos-tabla">
          <thead>
            <tr><th>Ejecutivo</th><th className="num">Saldo</th><th>Impugnados</th></tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.email}>
                <td><Link href={`/admin/creditos/${encodeURIComponent(f.email)}`}>{f.nombre}</Link></td>
                <td className="num"><strong>{f.saldo}</strong></td>
                <td>
                  {f.impugnados && f.impugnados.total > 0 ? (
                    <Link href={`/admin/creditos/${encodeURIComponent(f.email)}#impugnaciones`}>
                      {f.impugnados.pendientes > 0 ? (
                        <span className="tag orange">🚩 {f.impugnados.pendientes} pendiente{f.impugnados.pendientes === 1 ? "" : "s"} · Ver</span>
                      ) : (
                        "Ver"
                      )}
                    </Link>
                  ) : (
                    <span style={{ color: "var(--admin-text-soft)" }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

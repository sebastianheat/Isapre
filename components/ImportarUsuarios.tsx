"use client";

import { useState } from "react";

interface Resultado {
  creados: string[];
  existentes: string[];
  errores: { email: string; error: string }[];
}

// Importación en lote: el superadmin copia las filas de la planilla (Nombre,
// RUT, Correo, Teléfono) y las pega aquí. Cada uno nace como ejecutivo con la
// clave temporal 123456 y 20 leads de cupo.
export default function ImportarUsuarios({ onImportado }: { onImportado: () => void }) {
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function importar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResultado(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/usuarios/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "No se pudo importar.");
      else {
        setResultado(data);
        setTexto("");
      }
    } catch {
      setError("Sin conexión.");
    } finally {
      setLoading(false);
    }
  }

  function cerrar() {
    const huboCambios = !!resultado?.creados.length;
    setOpen(false);
    setResultado(null);
    setError("");
    if (huboCambios) onImportado();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="admin-btn secondary">
        Importar lista
      </button>
    );
  }

  return (
    <div className="admin-card" style={{ width: "100%" }}>
      {resultado ? (
        <>
          <div className="admin-msg ok">
            {resultado.creados.length} usuario{resultado.creados.length === 1 ? "" : "s"} creado
            {resultado.creados.length === 1 ? "" : "s"} con clave temporal 123456 y 20 leads de cupo.
          </div>
          {resultado.existentes.length > 0 && (
            <div className="admin-msg warn">
              Ya existían (no se tocaron): {resultado.existentes.join(", ")}
            </div>
          )}
          {resultado.errores.map((e) => (
            <div key={e.email} className="admin-msg error">{e.email}: {e.error}</div>
          ))}
          <button onClick={cerrar} className="admin-btn">Listo</button>
        </>
      ) : (
        <form className="admin-form" onSubmit={importar} style={{ maxWidth: "none", padding: 0, boxShadow: "none", background: "transparent", border: "none" }}>
          <label>
            <span>Pega las filas copiadas desde Excel (Nombre, RUT, Correo, Teléfono)</span>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={8}
              required
              style={{ width: "100%", fontFamily: "inherit", fontSize: 13 }}
              placeholder={"1\tMaría Pérez\t12.345.678-9\tmaria@correo.cl\t+56 9 1234 5678"}
            />
          </label>
          <p style={{ fontSize: 13, color: "var(--admin-text-soft)", marginBottom: 12 }}>
            Todos se crean como ejecutivos con la clave temporal <strong>123456</strong> (deben
            cambiarla al entrar) y un cupo de <strong>20 leads</strong>.
          </p>
          {error && <div className="admin-msg error">{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="admin-btn" disabled={loading}>
              {loading ? "Creando usuarios…" : "Crear usuarios"}
            </button>
            <button type="button" onClick={cerrar} className="admin-btn secondary">Cancelar</button>
          </div>
        </form>
      )}
    </div>
  );
}

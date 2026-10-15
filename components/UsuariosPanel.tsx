"use client";

import { useState } from "react";
import type { UsuarioPublico } from "@/lib/usuarios";
import RecibirLeadsToggle from "./RecibirLeadsToggle";
import ImportarUsuarios from "./ImportarUsuarios";

// Cupo que suma el botón "Reactivar cupo" (mismo que el cupo inicial).
const CUPO_REACTIVACION = 20;

export default function UsuariosPanel({
  initialUsuarios,
  saldosIniciales,
  miEmail,
}: {
  initialUsuarios: UsuarioPublico[];
  saldosIniciales: Record<string, number>;
  miEmail: string;
}) {
  const [usuarios, setUsuarios] = useState<UsuarioPublico[]>(initialUsuarios);
  const [saldos, setSaldos] = useState<Record<string, number>>(saldosIniciales);
  const [reactivando, setReactivando] = useState("");
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ejecutivo" | "superadmin">("ejecutivo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role, nombre }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "No se pudo crear.");
      else {
        setUsuarios((prev) => [data.usuario, ...prev]);
        if (data.usuario.role === "ejecutivo") setSaldos((prev) => ({ ...prev, [data.usuario.email]: CUPO_REACTIVACION }));
        setOk(`Usuario ${data.usuario.email} creado.`);
        setEmail(""); setPassword(""); setNombre(""); setRole("ejecutivo");
        setOpen(false);
      }
    } catch {
      setError("Sin conexión.");
    } finally {
      setLoading(false);
    }
  }

  async function reactivarCupo(u: UsuarioPublico) {
    const quien = u.nombre || u.email;
    if (!confirm(`¿Reactivar el cupo de ${quien}? Recibirá ${CUPO_REACTIVACION} leads más por turno.`)) return;
    setReactivando(u.email);
    setError("");
    setOk("");
    try {
      const res = await fetch("/api/admin/creditos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: u.email,
          cantidad: CUPO_REACTIVACION,
          motivo: `Reactivación de cupo (+${CUPO_REACTIVACION} leads)`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "No se pudo reactivar el cupo.");
      else {
        setSaldos((prev) => ({ ...prev, [u.email]: data.saldo }));
        setOk(`Cupo de ${quien} reactivado: ${data.saldo} leads disponibles.`);
      }
    } catch {
      setError("Sin conexión.");
    } finally {
      setReactivando("");
    }
  }

  async function eliminar(emailObjetivo: string) {
    if (!confirm(`¿Eliminar al usuario ${emailObjetivo}?`)) return;
    const res = await fetch(`/api/admin/usuarios/${encodeURIComponent(emailObjetivo)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setUsuarios((prev) => prev.filter((u) => u.email !== emailObjetivo));
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "No se pudo eliminar.");
    }
  }

  return (
    <>
      <h1 className="admin-h1">Usuarios ({usuarios.length})</h1>
      {ok && <div className="admin-msg ok">{ok}</div>}
      {error && <div className="admin-msg error">{error}</div>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button onClick={() => setOpen((o) => !o)} className="admin-btn">
          {open ? "Cancelar" : "+ Nuevo usuario"}
        </button>
        <ImportarUsuarios onImportado={() => window.location.reload()} />
      </div>

      {open && (
        <form className="admin-form" onSubmit={crear} style={{ marginBottom: 18 }}>
          <label>
            <span>Nombre</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. María Pérez" />
          </label>
          <label>
            <span>Email *</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" />
          </label>
          <label>
            <span>Contraseña temporal * (deberá cambiarla al entrar)</span>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
            />
          </label>
          <label>
            <span>Rol</span>
            <select value={role} onChange={(e) => setRole(e.target.value as "ejecutivo" | "superadmin")}>
              <option value="ejecutivo">Ejecutivo (solo ver leads)</option>
              <option value="superadmin">Superadmin (puede crear/eliminar usuarios y leads)</option>
            </select>
          </label>
          <button type="submit" className="admin-btn" disabled={loading}>
            {loading ? "Creando…" : "Crear usuario"}
          </button>
        </form>
      )}

      {usuarios.map((u) => (
        <div key={u.email} className="admin-card">
          <div className="usuario-row">
            <div className="info">
              <div className="email">{u.nombre ? `${u.nombre} · ` : ""}{u.email}</div>
              <div className="role">
                {u.role === "superadmin" ? "👑 Superadmin" : "👤 Ejecutivo"}
                {u.passwordEsSemilla && " · ⚠️ clave temporal sin cambiar"}
              </div>
              {u.role === "ejecutivo" && (
                <div className="role">
                  Cupo: {saldos[u.email] ?? 0} lead{(saldos[u.email] ?? 0) === 1 ? "" : "s"} disponible
                  {(saldos[u.email] ?? 0) === 1 ? "" : "s"}
                  {(saldos[u.email] ?? 0) <= 0 && " · fuera de la rueda"}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {u.role === "ejecutivo" && (
                <button
                  onClick={() => reactivarCupo(u)}
                  className="admin-btn small"
                  disabled={reactivando === u.email}
                >
                  {reactivando === u.email ? "Reactivando…" : `Reactivar cupo (+${CUPO_REACTIVACION})`}
                </button>
              )}
              {u.email !== miEmail && (
                <button onClick={() => eliminar(u.email)} className="admin-btn danger small">
                  Eliminar
                </button>
              )}
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <RecibirLeadsToggle email={u.email} inicial={u.recibiendoLeads} />
          </div>
        </div>
      ))}
    </>
  );
}

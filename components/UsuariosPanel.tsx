"use client";

import { useState } from "react";
import type { UsuarioPublico } from "@/lib/usuarios";

export default function UsuariosPanel({
  initialUsuarios,
  miEmail,
}: {
  initialUsuarios: UsuarioPublico[];
  miEmail: string;
}) {
  const [usuarios, setUsuarios] = useState<UsuarioPublico[]>(initialUsuarios);
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

      <button onClick={() => setOpen((o) => !o)} className="admin-btn" style={{ marginBottom: 12 }}>
        {open ? "Cancelar" : "+ Nuevo usuario"}
      </button>

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
            <span>Contraseña inicial *</span>
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
                {u.passwordEsSemilla && " · ⚠️ password por defecto"}
              </div>
            </div>
            {u.email !== miEmail && (
              <button onClick={() => eliminar(u.email)} className="admin-btn danger small">
                Eliminar
              </button>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CambiarPassword() {
  const router = useRouter();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    if (nueva !== confirm) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }
    if (nueva.length < 6) {
      setError("La contraseña nueva debe tener al menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/perfil/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwordActual: actual, passwordNueva: nueva }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "No se pudo cambiar.");
      else {
        setOk("Contraseña actualizada.");
        setActual(""); setNueva(""); setConfirm("");
        router.refresh();
      }
    } catch {
      setError("Sin conexión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      {error && <div className="admin-msg error">{error}</div>}
      {ok && <div className="admin-msg ok">{ok}</div>}
      <label>
        <span>Contraseña actual</span>
        <input type="password" value={actual} onChange={(e) => setActual(e.target.value)} required autoComplete="current-password" />
      </label>
      <label>
        <span>Contraseña nueva</span>
        <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} required minLength={6} autoComplete="new-password" />
      </label>
      <label>
        <span>Repetir contraseña nueva</span>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} autoComplete="new-password" />
      </label>
      <button type="submit" className="admin-btn" disabled={loading}>
        {loading ? "Guardando…" : "Guardar nueva contraseña"}
      </button>
    </form>
  );
}

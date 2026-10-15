"use client";

import Link from "next/link";
import { useState } from "react";

function Encabezado({ titulo }: { titulo: string }) {
  return (
    <>
      <div className="admin-login-logo">N</div>
      <h1>{titulo}</h1>
    </>
  );
}

const volver = (
  <p style={{ textAlign: "center", marginTop: 14, fontSize: 13 }}>
    <Link href="/admin" style={{ color: "var(--admin-text-soft)" }}>Volver al ingreso</Link>
  </p>
);

// Paso 1: el usuario escribe su email y le mandamos el link.
export function PedirLink() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No pudimos enviar el correo.");
      } else setEnviado(true);
    } catch {
      setError("Sin conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (enviado) {
    return (
      <div className="admin-form">
        <Encabezado titulo="Revisa tu correo" />
        <div className="admin-msg ok">
          Si {email} tiene una cuenta, le enviamos un link para crear una contraseña nueva.
          Vence en 1 hora. Revisa también la carpeta de spam.
        </div>
        {volver}
      </div>
    );
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <Encabezado titulo="Recuperar contraseña" />
      <p style={{ textAlign: "center", color: "var(--admin-text-soft)", fontSize: 13, marginBottom: 16 }}>
        Te enviaremos un link a tu correo.
      </p>
      {error && <div className="admin-msg error">{error}</div>}
      <label>
        <span>Email</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </label>
      <button type="submit" className="admin-btn" disabled={loading}>
        {loading ? "Enviando…" : "Enviar link"}
      </button>
      {volver}
    </form>
  );
}

// Paso 2: desde el link del correo, define la contraseña nueva.
export function NuevaClave({ token, valido }: { token: string; valido: boolean }) {
  const [nueva, setNueva] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState("");

  if (!valido) {
    return (
      <div className="admin-form">
        <Encabezado titulo="Link no válido" />
        <div className="admin-msg error">Este link venció o ya fue usado.</div>
        <p style={{ textAlign: "center", fontSize: 14 }}>
          <Link href="/admin/recuperar">Pedir un link nuevo</Link>
        </p>
      </div>
    );
  }

  if (listo) {
    return (
      <div className="admin-form">
        <Encabezado titulo="Contraseña actualizada" />
        <div className="admin-msg ok">Ya puedes entrar con tu contraseña nueva.</div>
        <Link href="/admin" className="admin-btn" style={{ display: "block", textAlign: "center" }}>
          Ir al ingreso
        </Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (nueva !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/restablecer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: nueva }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "No se pudo cambiar la contraseña.");
      else setListo(true);
    } catch {
      setError("Sin conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <Encabezado titulo="Crea tu contraseña nueva" />
      {error && <div className="admin-msg error">{error}</div>}
      <label>
        <span>Contraseña nueva</span>
        <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)}
          autoComplete="new-password" minLength={6} required placeholder="Mínimo 6 caracteres" />
      </label>
      <label>
        <span>Repite la contraseña</span>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password" minLength={6} required />
      </label>
      <button type="submit" className="admin-btn" disabled={loading}>
        {loading ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}

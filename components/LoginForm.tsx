"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "No pudimos iniciar sesión.");
      } else {
        router.replace("/admin/leads");
        router.refresh();
      }
    } catch {
      setError("Sin conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <div className="admin-login-logo">N</div>
      <h1>Panel de ejecutivos</h1>
      <p style={{ textAlign: "center", color: "var(--admin-text-soft)", fontSize: 13, marginBottom: 16 }}>
        Nueva Isapre · Acceso interno
      </p>
      {error && <div className="admin-msg error">{error}</div>}
      <label>
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </label>
      <label>
        <span>Contraseña</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </label>
      <button type="submit" className="admin-btn" disabled={loading}>
        {loading ? "Ingresando…" : "Entrar"}
      </button>
    </form>
  );
}

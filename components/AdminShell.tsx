"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

interface Props {
  title: string;
  userEmail: string;
  role: "superadmin" | "ejecutivo";
  children: ReactNode;
}

const NAV = [
  { href: "/admin/pipeline", label: "Pipeline", ico: "📊" },
  { href: "/admin/leads", label: "Leads", ico: "📋" },
  { href: "/admin/reparto", label: "Reparto", ico: "🎯", superadminOnly: true },
  { href: "/admin/creditos", label: "Créditos", ico: "🪙", superadminOnly: true },
  { href: "/admin/metricas", label: "Métricas", ico: "📈" },
  { href: "/admin/usuarios", label: "Usuarios", ico: "👥", superadminOnly: true },
  { href: "/admin/perfil", label: "Perfil", ico: "👤" },
];

export default function AdminShell({ title, userEmail, role, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [usaSemilla, setUsaSemilla] = useState(false);

  // Verifica si la password actual sigue siendo la semilla (temporal). Si lo
  // es, el panel queda bloqueado en /admin/perfil hasta que la cambie. Se hace
  // en cliente para no acoplar el render del page al KV.
  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((d) => setUsaSemilla(!!d?.user?.passwordEsSemilla))
      .catch(() => {});
    const alCambiar = () => setUsaSemilla(false);
    window.addEventListener("admin:password-cambiada", alCambiar);
    return () => window.removeEventListener("admin:password-cambiada", alCambiar);
  }, []);

  const enPerfil = pathname === "/admin/perfil";
  useEffect(() => {
    if (usaSemilla && !enPerfil) router.replace("/admin/perfil");
  }, [usaSemilla, enPerfil, router]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin");
    router.refresh();
  }

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-topbar-brand">
          <span className="admin-brand-mark">N</span>
          <div className="admin-topbar-titles">
            <span className="admin-topbar-title">{title}</span>
            <span className="admin-topbar-sub">Nueva Isapre · Panel</span>
          </div>
        </div>
        <button
          onClick={logout}
          aria-label="Cerrar sesión"
          style={{
            background: "rgba(255,255,255,.12)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,.3)",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Salir
        </button>
      </header>

      <main className="admin-content">
        {usaSemilla && (
          <div className="admin-msg warn">
            ⚠️ Estás usando una contraseña temporal. Debes cambiarla para seguir usando el panel.
          </div>
        )}
        <div style={{ fontSize: 12, color: "var(--admin-text-soft)", marginBottom: 8 }}>
          Sesión: <strong>{userEmail}</strong> · {role === "superadmin" ? "Superadmin" : "Ejecutivo"}
        </div>
        {(!usaSemilla || enPerfil) && children}
      </main>

      {!usaSemilla && <nav className="admin-bottomnav">
        {NAV.filter((n) => !n.superadminOnly || role === "superadmin").map((n) => {
          const active = pathname === n.href || pathname?.startsWith(n.href + "/");
          return (
            <Link key={n.href} href={n.href} className={active ? "active" : ""}>
              <span className="ico">{n.ico}</span>
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>}
    </div>
  );
}

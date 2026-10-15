import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { getUsuario, listarUsuarios } from "@/lib/usuarios";
import { listarMovimientos, obtenerSaldo, type TipoMovimiento } from "@/lib/credits-kv";
import AdminShell from "@/components/AdminShell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPOS: Record<TipoMovimiento, { label: string; clase: string }> = {
  regalo: { label: "Regalo", clase: "green" },
  asignacion: { label: "Asignación", clase: "orange" },
  devolucion: { label: "Devolución", clase: "gray" },
};

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default async function HistorialCreditosPage({
  params,
}: {
  params: Promise<{ email: string }>;
}) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/admin");
  if (sesion.role !== "superadmin") redirect("/admin/leads");

  const email = decodeURIComponent((await params).email).toLowerCase();
  const [usuario, movimientos, saldoGuardado, usuarios] = await Promise.all([
    getUsuario(email),
    listarMovimientos(email),
    obtenerSaldo(email),
    listarUsuarios(),
  ]);
  if (!usuario && movimientos.length === 0) notFound();

  const nombres = Object.fromEntries(usuarios.map((u) => [u.email, u.nombre || u.email]));
  // El saldo mostrado se recalcula desde el historial (auditable); si el
  // contador guardado difiere, se avisa en vez de ocultarlo.
  const saldo = movimientos.reduce((acc, m) => acc + m.cantidad, 0);

  return (
    <AdminShell title="Historial de créditos" userEmail={sesion.email} role={sesion.role}>
      <Link href="/admin/creditos" className="admin-back">← Volver a créditos</Link>
      <h1 className="admin-h1" style={{ marginBottom: 4 }}>{usuario?.nombre || email}</h1>
      <div style={{ color: "var(--admin-text-soft)", fontSize: 13, marginBottom: 12 }}>{email}</div>

      <div className="admin-card">
        <div style={{ color: "var(--admin-text-soft)", fontSize: 13 }}>Saldo actual</div>
        <div className="creditos-saldo-grande">{saldo}</div>
        {saldo !== saldoGuardado && (
          <div className="admin-msg warn" style={{ marginTop: 10, marginBottom: 0 }}>
            El contador guardado ({saldoGuardado}) no coincide con el historial ({saldo}). Revisar.
          </div>
        )}
      </div>

      {movimientos.length === 0 ? (
        <div className="admin-card reparto-vacio">
          <p style={{ marginBottom: 12 }}>Sin créditos registrados todavía</p>
          <Link href={`/admin/creditos?ejecutivo=${encodeURIComponent(email)}`} className="admin-btn small">
            Regalar créditos
          </Link>
        </div>
      ) : (
        <>
          <h2 className="admin-h2">Movimientos ({movimientos.length})</h2>
          {movimientos.map((m) => {
            const tipo = TIPOS[m.tipo];
            const signo = m.cantidad > 0 ? "pos" : m.cantidad < 0 ? "neg" : "cero";
            return (
              <div key={m.id} className="admin-card">
                <div className="creditos-mov">
                  <div>
                    <span className={`tag ${tipo.clase}`}>{tipo.label}</span>
                    <div style={{ marginTop: 6 }}>{m.motivo}</div>
                    <div style={{ fontSize: 12, color: "var(--admin-text-soft)", marginTop: 4 }}>
                      {formatearFecha(m.fecha)} · por {nombres[m.por] || m.por}
                      {m.leadId && (
                        <>
                          {" · "}
                          <Link href={`/admin/leads/${encodeURIComponent(m.leadId)}`} style={{ color: "var(--admin-blue-dark)" }}>
                            ver lead
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                  <span className={`creditos-cantidad ${signo}`}>
                    {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                  </span>
                </div>
              </div>
            );
          })}
        </>
      )}
    </AdminShell>
  );
}

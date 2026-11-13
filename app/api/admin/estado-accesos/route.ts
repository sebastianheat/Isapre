// Estado de acceso de los ejecutivos: quién ya entró y cambió su clave
// temporal. Para monitoreo externo: se autentica con
// `Authorization: Bearer ${ESTADO_ACCESOS_TOKEN}` (no con la sesión del panel).

import { getUsuario, listarUsuarios } from "@/lib/usuarios";
import { listarMovimientos, obtenerSaldo } from "@/lib/credits-kv";
import { listarLeads } from "@/lib/leads";
import { autorizadoPorToken } from "@/lib/token-operacion";
import { obtenerPrioridad } from "@/lib/reparto-auto";
import { vende } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!autorizadoPorToken(req)) return Response.json({ error: "No autorizado" }, { status: 401 });
  const ejecutivos = (await listarUsuarios()).filter((u) => vende(u.role));
  const leads = await listarLeads(5000);
  const estado = await Promise.all(
    ejecutivos.map(async (p) => {
      const u = await getUsuario(p.email);
      const email = p.email.toLowerCase();
      const suyos = leads.filter((l) => (l.asignadoA ?? "").toLowerCase() === email);
      const movs = await listarMovimientos(email);
      return {
        rol: p.role,
        creado: p.createdAt,
        recibiendoLeads: p.recibiendoLeads,
        // Leads que hoy tiene a su nombre (sin los marcados falsos) y
        // asignaciones cobradas según su historial (neto de devoluciones).
        leadsAsignados: suyos.filter((l) => !l.falso).length,
        asignacionesNetas: -movs
          .filter((m) => m.tipo === "asignacion" || m.tipo === "devolucion")
          .reduce((a, m) => a + m.cantidad, 0),
        ultimaAsignacion: movs.find((m) => m.tipo === "asignacion")?.fecha ?? null,
        nombre: p.nombre || p.email,
        email: p.email,
        claveCambiada: !u?.passwordEsSemilla,
        passwordCambiadaEn: u?.passwordCambiadaEn ?? null,
        ultimoIngreso: u?.ultimoIngreso ?? null,
        cupo: await obtenerSaldo(p.email),
      };
    }),
  );
  estado.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return Response.json({
    total: estado.length,
    listos: estado.filter((e) => e.claveCambiada).length,
    prioridad: await obtenerPrioridad(),
    ejecutivos: estado,
  });
}

// Estado de acceso de los ejecutivos: quién ya entró y cambió su clave
// temporal. Para monitoreo externo: se autentica con
// `Authorization: Bearer ${ESTADO_ACCESOS_TOKEN}` (no con la sesión del panel).

import { getUsuario, listarUsuarios } from "@/lib/usuarios";
import { obtenerSaldo } from "@/lib/credits-kv";
import { autorizadoPorToken } from "@/lib/token-operacion";
import { obtenerPrioridad } from "@/lib/reparto-auto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!autorizadoPorToken(req)) return Response.json({ error: "No autorizado" }, { status: 401 });
  const ejecutivos = (await listarUsuarios()).filter((u) => u.role === "ejecutivo");
  const estado = await Promise.all(
    ejecutivos.map(async (p) => {
      const u = await getUsuario(p.email);
      return {
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

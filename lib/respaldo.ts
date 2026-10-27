// Respaldo diario del panel en Excel: todos los leads (con ejecutivo, etapa,
// notas y recordatorios), los ejecutivos con su saldo y el historial de
// créditos. Lo genera el cron /api/cron/respaldo-diario (y lo manda a info@)
// y lo descarga el superadmin desde /api/admin/respaldo.
//
// Nació de la caída del 24-10-2026: con este archivo, aunque la base se
// pierda, queda el estado del día anterior completo y legible.

import { listarMovimientos, obtenerSaldo, type MovimientoCredito } from "./credits-kv";
import { listarLeads, type Lead } from "./leads";
import { CALIDADES, ETAPAS, estadoAsignacion } from "./pipeline";
import { getUsuario, listarUsuarios, type Usuario } from "./usuarios";
import { generarXlsx, type Celda, type Hoja } from "./xlsx";

export interface DatosRespaldo {
  leads: Lead[];
  usuarios: (Usuario & { saldo: number })[];
  movimientos: (MovimientoCredito & { email: string })[];
  generado: Date;
}

const fechaCl = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("es-CL", { timeZone: "America/Santiago" }) : "";

export function construirHojas(d: DatosRespaldo): Hoja[] {
  const nombreDe = new Map(d.usuarios.map((u) => [u.email.toLowerCase(), u.nombre || u.email]));
  const etapa = new Map(ETAPAS.map((e) => [e.id, e.label]));
  const calidad = new Map(CALIDADES.map((c) => [c.id, c.label]));
  const leads = [...d.leads].sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""));
  const ejecutivos = d.usuarios.filter((u) => u.role === "ejecutivo");

  const hojaLeads: Celda[][] = [
    [
      "Fecha", "Nombre", "RUT", "Teléfono", "Email", "Región", "Edad", "Sueldo líquido",
      "Previsión actual", "Cargas", "Clínicas preferidas", "Isapre", "Plan", "Canal", "Origen",
      "Etapa", "Calidad", "Ejecutivo", "Correo ejecutivo", "Estado reparto", "Crédito cobrado",
      "Veces que llegó", "Notas", "Recordatorios pendientes", "Impugnación", "Última actualización", "ID",
    ],
    ...leads.map((l) => {
      const asignado = (l.asignadoA ?? "").toLowerCase();
      const pendientes = (l.recordatorios ?? []).filter((r) => !r.notificado);
      return [
        fechaCl(l.fecha), l.nombre, l.rut, l.telefono, l.email, l.region, l.edad, l.sueldoLiquido,
        l.previsionActual, l.cargasResumen, l.clinicaPreferida, l.isapre, l.plan, l.canal, l.origen,
        etapa.get(l.etapa ?? "nuevo") ?? l.etapa, l.calidad ? calidad.get(l.calidad) ?? l.calidad : "",
        asignado ? nombreDe.get(asignado) ?? asignado : "", l.asignadoA,
        estadoAsignacion(l) === "asignado" ? "Asignado" : "Sin asignar",
        estadoAsignacion(l) === "asignado" ? l.asignacionCobrada === true : "",
        l.contactos,
        (l.notas ?? []).map((n) => `[${fechaCl(n.fecha)} · ${nombreDe.get(n.autor.toLowerCase()) ?? n.autor}] ${n.texto}`).join("\n"),
        pendientes.map((r) => `${fechaCl(r.fecha)}: ${r.mensaje}`).join("\n"),
        l.falso ? "Lead falso (aceptada)" : l.impugnacion ? `${l.impugnacion.estado}: ${l.impugnacion.comentario}` : "",
        fechaCl(l.actualizado), l.id,
      ];
    }),
  ];

  const hojaEjecutivos: Celda[][] = [
    ["Nombre", "Email", "Rol", "RUT", "Teléfono", "Recibe leads", "Saldo de créditos", "Leads asignados", "Último ingreso", "Creado"],
    ...[...d.usuarios]
      .sort((a, b) => (a.nombre || a.email).localeCompare(b.nombre || b.email, "es"))
      .map((u) => [
        u.nombre, u.email, u.role === "superadmin" ? "Superadmin" : "Ejecutivo", u.rut, u.telefono,
        u.recibiendoLeads !== false, u.saldo,
        leads.filter((l) => (l.asignadoA ?? "").toLowerCase() === u.email.toLowerCase()).length,
        fechaCl(u.ultimoIngreso), fechaCl(u.createdAt),
      ]),
  ];

  const tipos: Record<string, string> = { regalo: "Regalo", asignacion: "Asignación", devolucion: "Devolución", ajuste: "Ajuste" };
  const leadPorId = new Map(leads.map((l) => [l.id, l.nombre]));
  const hojaCreditos: Celda[][] = [
    ["Fecha", "Ejecutivo", "Tipo", "Cantidad", "Motivo", "Hecho por", "Lead"],
    ...[...d.movimientos]
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .map((m) => [
        fechaCl(m.fecha), nombreDe.get(m.email) ?? m.email, tipos[m.tipo] ?? m.tipo, m.cantidad, m.motivo,
        nombreDe.get(m.por.toLowerCase()) ?? m.por, m.leadId ? leadPorId.get(m.leadId) ?? m.leadId : "",
      ]),
  ];

  const sinAsignar = leads.filter((l) => estadoAsignacion(l) !== "asignado").length;
  const resumen: Celda[][] = [
    ["Respaldo nuevaisapre.cl", ""],
    ["Generado", fechaCl(d.generado.toISOString())],
    ["Leads", leads.length],
    ["Leads sin asignar", sinAsignar],
    ["Ejecutivos", ejecutivos.length],
    ["Créditos disponibles (total)", ejecutivos.reduce((a, u) => a + u.saldo, 0)],
    ["Nota", "Los leads se conservan 60 días en el panel; este archivo es una foto del día."],
  ];

  return [
    { nombre: "Resumen", filas: resumen },
    { nombre: "Leads", filas: hojaLeads },
    { nombre: "Ejecutivos", filas: hojaEjecutivos },
    { nombre: "Créditos", filas: hojaCreditos },
  ];
}

export async function recolectarDatos(): Promise<DatosRespaldo> {
  const [leads, publicos] = await Promise.all([listarLeads(5000), listarUsuarios()]);
  const usuarios: DatosRespaldo["usuarios"] = [];
  const movimientos: DatosRespaldo["movimientos"] = [];
  for (const p of publicos) {
    const u = (await getUsuario(p.email)) ?? { ...p, passwordHash: "" };
    const email = p.email.toLowerCase();
    usuarios.push({ ...u, passwordHash: "", saldo: await obtenerSaldo(email) });
    for (const m of await listarMovimientos(email)) movimientos.push({ ...m, email });
  }
  return { leads, usuarios, movimientos, generado: new Date() };
}

export function nombreArchivoRespaldo(fecha = new Date()): string {
  const dia = fecha.toLocaleDateString("sv-SE", { timeZone: "America/Santiago" }); // AAAA-MM-DD
  return `respaldo-nuevaisapre-${dia}.xlsx`;
}

export async function generarRespaldo(): Promise<{ archivo: Buffer; nombre: string; datos: DatosRespaldo }> {
  const datos = await recolectarDatos();
  return { archivo: generarXlsx(construirHojas(datos)), nombre: nombreArchivoRespaldo(datos.generado), datos };
}

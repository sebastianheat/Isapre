// Roles del panel. Módulo client-safe (sin servidor).
//
// superadmin: el dueño. Hace y aprueba todo.
// admin: jefe de equipo. Ve TODA la cuenta (leads, pipeline, métricas,
//   usuarios, créditos), deja notas en leads ajenos y trabaja los suyos.
//   Lo que cambia la cuenta lo PIDE y lo aprueba el superadmin (solicitudes),
//   y da la primera aprobación de las impugnaciones. También vende: recibe
//   leads de la rueda con su cupo, igual que un ejecutivo.
// ejecutivo: solo sus leads.
export type Rol = "superadmin" | "admin" | "ejecutivo";

export const NOMBRE_ROL: Record<Rol, string> = {
  superadmin: "Superadmin",
  admin: "Administrador",
  ejecutivo: "Ejecutivo",
};

export function normalizarRol(x: unknown): Rol {
  return x === "superadmin" || x === "admin" ? x : "ejecutivo";
}

// Ve todos los leads y la cuenta completa.
export const veTodo = (rol: Rol) => rol === "superadmin" || rol === "admin";

// Vende planes: recibe leads de la rueda y tiene cupo de créditos.
export const vende = (rol: Rol) => rol === "ejecutivo" || rol === "admin";

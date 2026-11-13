// Tipos de las solicitudes del admin. Módulo client-safe (sin servidor).

export type TipoSolicitud = "pausar" | "reactivar";
export type EstadoSolicitud = "pendiente" | "aprobada" | "rechazada";

export interface Solicitud {
  id: string;
  tipo: TipoSolicitud;
  email: string; // vendedor al que se aplica
  motivo: string;
  por: string; // admin que la pidió
  fecha: string; // ISO
  estado: EstadoSolicitud;
  resueltaPor?: string;
  resueltaEn?: string;
  respuesta?: string;
}

export const NOMBRE_TIPO: Record<TipoSolicitud, string> = {
  pausar: "Pausar (dejar de recibir leads)",
  reactivar: "Reactivar (volver a recibir leads)",
};

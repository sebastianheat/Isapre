// Importación en lote de ejecutivos: el superadmin pega las filas copiadas
// desde Excel (N°, Nombre, RUT, Correo, Teléfono — en cualquier orden) y cada
// uno queda creado con la clave temporal y un cupo inicial de leads.

import { CLAVE_TEMPORAL, crearUsuario, getUsuario } from "./usuarios";
import { regalarCreditos } from "./credits-kv";

export const CUPO_INICIAL = 20;

export interface FilaUsuario {
  nombre?: string;
  email: string;
  rut?: string;
  telefono?: string;
}

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RE_RUT = /^\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]$/;
const RE_TELEFONO = /^\+?[\d\s()-]{8,}$/;
const RE_NUMERO_FILA = /^\d{1,4}$/;

// Clasifica cada celda por su forma en vez de depender del orden de las
// columnas. Las filas sin email (encabezados, líneas vacías) se ignoran.
export function parsearFilas(texto: string): FilaUsuario[] {
  const filas: FilaUsuario[] = [];
  const vistos = new Set<string>();
  for (const linea of texto.split(/\r?\n/)) {
    const celdas = linea.split(/\t|;|,(?=\s*\S+@)|\s{2,}/).map((c) => c.trim()).filter(Boolean);
    const fila: Partial<FilaUsuario> = {};
    for (const c of celdas) {
      if (RE_EMAIL.test(c)) fila.email ??= c.toLowerCase();
      else if (RE_RUT.test(c)) fila.rut ??= c;
      else if (RE_NUMERO_FILA.test(c)) continue;
      else if (RE_TELEFONO.test(c)) fila.telefono ??= c;
      else fila.nombre ??= c;
    }
    if (!fila.email || vistos.has(fila.email)) continue;
    vistos.add(fila.email);
    filas.push(fila as FilaUsuario);
  }
  return filas;
}

export interface ResultadoImportacion {
  creados: string[];
  existentes: string[];
  errores: { email: string; error: string }[];
}

export async function importarUsuarios(
  filas: FilaUsuario[],
  por: string,
  cupo = CUPO_INICIAL,
): Promise<ResultadoImportacion> {
  const r: ResultadoImportacion = { creados: [], existentes: [], errores: [] };
  for (const f of filas) {
    try {
      if (await getUsuario(f.email)) {
        r.existentes.push(f.email);
        continue;
      }
      await crearUsuario({
        email: f.email,
        password: CLAVE_TEMPORAL,
        role: "ejecutivo",
        nombre: f.nombre,
        rut: f.rut,
        telefono: f.telefono,
      });
      if (cupo > 0) {
        await regalarCreditos({
          email: f.email,
          cantidad: cupo,
          motivo: `Cupo inicial de ${cupo} leads`,
          por,
        });
      }
      r.creados.push(f.email);
    } catch (e) {
      r.errores.push({ email: f.email, error: e instanceof Error ? e.message : "Error al crear" });
    }
  }
  return r;
}

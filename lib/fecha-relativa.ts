// "hace 12 min", "hace 2h", "hace 3 días". Módulo puro (sin dependencias de
// servidor) para usarlo desde componentes client.

export function fechaRelativa(iso: string | undefined, ahora: number = Date.now()): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const min = Math.floor((ahora - t) / 60000);
  if (min < 1) return "hace instantes";
  if (min < 60) return `hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `hace ${horas}h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "hace 1 día" : `hace ${dias} días`;
}

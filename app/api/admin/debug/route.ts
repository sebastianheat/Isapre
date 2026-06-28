// Endpoint de diagnóstico: verifica el estado de KV y dónde están los datos.
// Solo accesible para superadmin.

import { obtenerSesion } from "@/lib/auth";
import { kvGet, kvSet, kvScanKeys, kvZRevRange } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (sesion.role !== "superadmin") {
    return Response.json({ error: "Solo superadmin" }, { status: 403 });
  }

  // 1) ¿KV remoto está configurado?
  const env = {
    UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
    KV_REST_API_URL: !!process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
  };

  // 2) Round-trip de escritura/lectura
  const testKey = `debug:test:${Date.now()}`;
  const testValue = `value-${Date.now()}`;
  let rtError: string | null = null;
  let rtValue: string | null = null;
  try {
    await kvSet(testKey, testValue, 60);
    rtValue = await kvGet(testKey);
  } catch (e) {
    rtError = e instanceof Error ? e.message : String(e);
  }
  const writeReadOk = rtValue === testValue;

  // 3) Conteo de keys por tipo
  const userKeys = await kvScanKeys("user:*", 100).catch(() => []);
  const leadKeys = await kvScanKeys("lead:*", 500).catch(() => []);
  const indexMembers = await kvZRevRange("leads:by-date", 0, 500).catch(() => []);

  // 4) Sample de los primeros lead keys (sin leer el value)
  return Response.json({
    env,
    roundTrip: { writeReadOk, rtError, rtValue, testKey, testValue },
    counts: {
      users: userKeys.length,
      leads_by_scan: leadKeys.length,
      leads_in_zset_index: indexMembers.length,
    },
    sampleLeadKeys: leadKeys.slice(0, 10),
    sampleIndexMembers: indexMembers.slice(0, 10),
    sampleUserKeys: userKeys.slice(0, 10),
  });
}

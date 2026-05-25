// Almacén simple (KV). Usa Upstash/Vercel KV por REST si está configurado;
// si no, cae a memoria (sirve para pruebas con un solo proceso).

const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "";
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";
const remoto = !!(URL_ && TOKEN);

const mem = new Map<string, string>();

async function cmd(args: string[]): Promise<unknown> {
  const res = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`KV error ${res.status}`);
  return (await res.json()).result;
}

export async function kvGet(key: string): Promise<string | null> {
  if (!remoto) return mem.get(key) ?? null;
  try {
    return ((await cmd(["GET", key])) as string | null) ?? null;
  } catch {
    return mem.get(key) ?? null;
  }
}

export async function kvSet(key: string, value: string, ttlSeconds = 86400): Promise<void> {
  if (!remoto) {
    mem.set(key, value);
    return;
  }
  try {
    await cmd(["SET", key, value, "EX", String(ttlSeconds)]);
  } catch {
    mem.set(key, value);
  }
}

// Marca una clave una sola vez (para deduplicar webhooks). Devuelve true si es nueva.
export async function kvMarcarUnaVez(key: string, ttlSeconds = 3600): Promise<boolean> {
  if (await kvGet(key)) return false;
  await kvSet(key, "1", ttlSeconds);
  return true;
}

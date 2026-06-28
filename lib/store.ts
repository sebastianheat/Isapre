// Almacén simple (KV). Usa Upstash/Vercel KV por REST si está configurado;
// si no, cae a memoria (sirve para pruebas con un solo proceso).

const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "";
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";
const remoto = !!(URL_ && TOKEN);

// Estado en-memoria para el fallback. Soporta strings, sets y sorted sets.
const memStrings = new Map<string, string>();
const memSets = new Map<string, Set<string>>();
const memZSets = new Map<string, Map<string, number>>();

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
  if (!remoto) return memStrings.get(key) ?? null;
  try {
    return ((await cmd(["GET", key])) as string | null) ?? null;
  } catch {
    return memStrings.get(key) ?? null;
  }
}

// ttlSeconds=0 → sin expiración (para usuarios y leads persistentes).
export async function kvSet(key: string, value: string, ttlSeconds = 86400): Promise<void> {
  if (!remoto) {
    memStrings.set(key, value);
    return;
  }
  try {
    if (ttlSeconds > 0) await cmd(["SET", key, value, "EX", String(ttlSeconds)]);
    else await cmd(["SET", key, value]);
  } catch {
    memStrings.set(key, value);
  }
}

export async function kvDel(key: string): Promise<void> {
  if (!remoto) {
    memStrings.delete(key);
    memSets.delete(key);
    memZSets.delete(key);
    return;
  }
  try {
    await cmd(["DEL", key]);
  } catch {
    memStrings.delete(key);
  }
}

// Marca una clave una sola vez (para deduplicar webhooks). Devuelve true si es nueva.
export async function kvMarcarUnaVez(key: string, ttlSeconds = 3600): Promise<boolean> {
  if (await kvGet(key)) return false;
  await kvSet(key, "1", ttlSeconds);
  return true;
}

// ===== Sets =====
export async function kvSAdd(key: string, member: string): Promise<void> {
  if (!remoto) {
    let s = memSets.get(key);
    if (!s) { s = new Set(); memSets.set(key, s); }
    s.add(member);
    return;
  }
  try { await cmd(["SADD", key, member]); }
  catch {
    let s = memSets.get(key);
    if (!s) { s = new Set(); memSets.set(key, s); }
    s.add(member);
  }
}

export async function kvSRem(key: string, member: string): Promise<void> {
  if (!remoto) { memSets.get(key)?.delete(member); return; }
  try { await cmd(["SREM", key, member]); }
  catch { memSets.get(key)?.delete(member); }
}

export async function kvSMembers(key: string): Promise<string[]> {
  if (!remoto) return [...(memSets.get(key) ?? [])];
  try {
    const r = await cmd(["SMEMBERS", key]);
    return Array.isArray(r) ? (r as string[]) : [];
  } catch {
    return [...(memSets.get(key) ?? [])];
  }
}

// ===== Sorted Sets (para índices ordenados por timestamp) =====
export async function kvZAdd(key: string, score: number, member: string): Promise<void> {
  if (!remoto) {
    let z = memZSets.get(key);
    if (!z) { z = new Map(); memZSets.set(key, z); }
    z.set(member, score);
    return;
  }
  try { await cmd(["ZADD", key, String(score), member]); }
  catch {
    let z = memZSets.get(key);
    if (!z) { z = new Map(); memZSets.set(key, z); }
    z.set(member, score);
  }
}

export async function kvZRem(key: string, member: string): Promise<void> {
  if (!remoto) { memZSets.get(key)?.delete(member); return; }
  try { await cmd(["ZREM", key, member]); }
  catch { memZSets.get(key)?.delete(member); }
}

// SCAN para listar todas las keys que coincidan con un pattern (ej. "lead:*").
// Usa SCAN con cursor para iterar — no bloquea el server como KEYS *.
// Devuelve todas las keys que matchean.
export async function kvScanKeys(pattern: string, max = 1000): Promise<string[]> {
  if (!remoto) {
    return [...memStrings.keys()].filter((k) => {
      // Match simple de glob: solo "*" al final.
      if (pattern.endsWith("*")) return k.startsWith(pattern.slice(0, -1));
      return k === pattern;
    });
  }
  const keys: string[] = [];
  let cursor = "0";
  try {
    do {
      const r = (await cmd(["SCAN", cursor, "MATCH", pattern, "COUNT", "200"])) as
        | [string, string[]]
        | null;
      if (!r) break;
      cursor = r[0];
      keys.push(...(r[1] ?? []));
      if (keys.length >= max) break;
    } while (cursor !== "0");
  } catch {
    // fallback in-memory
    return [...memStrings.keys()].filter((k) => {
      if (pattern.endsWith("*")) return k.startsWith(pattern.slice(0, -1));
      return k === pattern;
    });
  }
  return keys;
}

// Devuelve los miembros del ZSET ordenados de mayor a menor score (más reciente primero).
export async function kvZRevRange(key: string, start = 0, stop = -1): Promise<string[]> {
  if (!remoto) {
    const z = memZSets.get(key);
    if (!z) return [];
    const sorted = [...z.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);
    return sorted.slice(start, stop === -1 ? undefined : stop + 1);
  }
  try {
    const r = await cmd(["ZREVRANGE", key, String(start), String(stop)]);
    return Array.isArray(r) ? (r as string[]) : [];
  } catch {
    return [];
  }
}

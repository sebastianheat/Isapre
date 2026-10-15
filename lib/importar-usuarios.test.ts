import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  process.env.RESEND_API_KEY = "test";
  process.env.NEXT_PUBLIC_SITE_URL = "https://www.nuevaisapre.cl";
});

const enviados = vi.hoisted(() => [] as { to: string; link: string }[]);
vi.mock("./email", () => ({
  enviarRecuperacionClave: async (to: string, _nombre: string | undefined, link: string) => {
    enviados.push({ to, link });
  },
  enviarLeadPorEmail: async () => {},
}));

async function cargar() {
  vi.resetModules();
  const [usuarios, credits, importar, recuperar] = await Promise.all([
    import("./usuarios"),
    import("./credits-kv"),
    import("./importar-usuarios"),
    import("./recuperar-clave"),
  ]);
  return { usuarios, credits, importar, recuperar };
}
type Ctx = Awaited<ReturnType<typeof cargar>>;

// Tal cual sale al copiar filas desde Excel (separadas por tabulador).
const PEGADO = [
  "N°\tNombre\tRUT\tCorreo\tTeléfono",
  "1\tEliecer Rojas\t16.279.077-3\teliecer_rojas@live.cl\t+56 9 8647 1635",
  "2\tElizabeth Cantillana\t15.409.840-2\tEliiCantillana@gmail.com\t+56 9 5879 1124",
  "",
  "3\tFrancis Méndez Muñoz\t13.343.994-3\tmendezfrancis0107@gmail.com\t+56 9 6680 2172",
].join("\n");

describe("parsearFilas", () => {
  it("lee las columnas de la planilla e ignora encabezado y líneas vacías", async () => {
    const { importar } = await cargar();
    const filas = importar.parsearFilas(PEGADO);
    expect(filas).toHaveLength(3);
    expect(filas[0]).toEqual({
      nombre: "Eliecer Rojas", rut: "16.279.077-3", email: "eliecer_rojas@live.cl", telefono: "+56 9 8647 1635",
    });
    expect(filas[1].email).toBe("eliicantillana@gmail.com");
    expect(filas[2].nombre).toBe("Francis Méndez Muñoz");
  });

  it("no duplica un correo repetido", async () => {
    const { importar } = await cargar();
    expect(importar.parsearFilas("Ana\ta@x.cl\nAna otra vez\ta@x.cl")).toHaveLength(1);
  });
});

describe("importarUsuarios", () => {
  let c: Ctx;
  beforeEach(async () => {
    c = await cargar();
  });

  it("crea ejecutivos con clave temporal obligatoria y 20 de cupo", async () => {
    const r = await c.importar.importarUsuarios(c.importar.parsearFilas(PEGADO), "info@nuevaisapre.cl");
    expect(r.creados).toHaveLength(3);
    const u = await c.usuarios.getUsuario("eliecer_rojas@live.cl");
    expect(u?.role).toBe("ejecutivo");
    expect(u?.passwordEsSemilla).toBe(true);
    expect(u?.rut).toBe("16.279.077-3");
    expect(await c.usuarios.autenticar("eliecer_rojas@live.cl", "123456")).not.toBeNull();
    expect(await c.credits.obtenerSaldo("eliecer_rojas@live.cl")).toBe(20);
  });

  it("no toca a los que ya existían", async () => {
    await c.importar.importarUsuarios([{ email: "a@x.cl" }], "admin");
    await c.usuarios.cambiarPassword("a@x.cl", "123456", "clave-propia");
    const r = await c.importar.importarUsuarios([{ email: "a@x.cl" }, { email: "b@x.cl" }], "admin");
    expect(r.existentes).toEqual(["a@x.cl"]);
    expect(r.creados).toEqual(["b@x.cl"]);
    expect(await c.usuarios.autenticar("a@x.cl", "clave-propia")).not.toBeNull();
    expect(await c.credits.obtenerSaldo("a@x.cl")).toBe(20);
  });
});

describe("recuperación de clave por correo", () => {
  let c: Ctx;
  beforeEach(async () => {
    c = await cargar();
    enviados.length = 0;
    await c.importar.importarUsuarios([{ email: "a@x.cl", nombre: "Ana" }], "admin");
  });

  const tokenDe = (link: string) => new URL(link).searchParams.get("token")!;

  it("manda un link de un solo uso que fija la clave nueva", async () => {
    await c.recuperar.solicitarRecuperacion("A@x.cl");
    expect(enviados).toHaveLength(1);
    expect(enviados[0].link).toMatch(/^https:\/\/www\.nuevaisapre\.cl\/admin\/restablecer\?token=/);
    const token = tokenDe(enviados[0].link);
    expect(await c.recuperar.tokenValido(token)).toBe(true);

    await c.recuperar.restablecerConToken(token, "nueva-clave");
    expect(await c.usuarios.autenticar("a@x.cl", "nueva-clave")).not.toBeNull();
    expect(await c.usuarios.autenticar("a@x.cl", "123456")).toBeNull();
    expect((await c.usuarios.getUsuario("a@x.cl"))?.passwordEsSemilla).toBe(false);

    expect(await c.recuperar.tokenValido(token)).toBe(false);
    await expect(c.recuperar.restablecerConToken(token, "otra-clave")).rejects.toThrow(/venció/);
  });

  it("no manda nada a un email que no existe", async () => {
    await c.recuperar.solicitarRecuperacion("nadie@x.cl");
    expect(enviados).toHaveLength(0);
  });

  it("no manda dos correos seguidos al mismo usuario", async () => {
    await c.recuperar.solicitarRecuperacion("a@x.cl");
    await c.recuperar.solicitarRecuperacion("a@x.cl");
    expect(enviados).toHaveLength(1);
  });

  it("rechaza un token inventado y la clave temporal como clave nueva", async () => {
    await expect(c.recuperar.restablecerConToken("inventado", "nueva-clave")).rejects.toThrow();
    await c.recuperar.solicitarRecuperacion("a@x.cl");
    const token = tokenDe(enviados[0].link);
    await expect(c.recuperar.restablecerConToken(token, "123456")).rejects.toThrow(/temporal/);
    expect(await c.recuperar.tokenValido(token)).toBe(true);
  });
});

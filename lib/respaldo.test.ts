import { inflateRawSync } from "node:zlib";
import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.RESEND_API_KEY;
  delete process.env.HEAT_API_KEY;
});

// Lee las entradas de un ZIP (formato simple, como el que genera lib/xlsx).
function leerZip(buf: Buffer): Map<string, string> {
  const out = new Map<string, string>();
  let p = 0;
  while (buf.readUInt32LE(p) === 0x04034b50) {
    const tam = buf.readUInt32LE(p + 18);
    const largoNombre = buf.readUInt16LE(p + 26);
    const nombre = buf.subarray(p + 30, p + 30 + largoNombre).toString("utf-8");
    const datos = buf.subarray(p + 30 + largoNombre, p + 30 + largoNombre + tam);
    out.set(nombre, inflateRawSync(datos).toString("utf-8"));
    p += 30 + largoNombre + tam;
  }
  return out;
}

describe("respaldo en Excel", () => {
  it("genera un xlsx con las 4 hojas y los datos del panel", async () => {
    const { construirHojas } = await import("./respaldo");
    const { generarXlsx } = await import("./xlsx");
    const hojas = construirHojas({
      generado: new Date("2026-10-28T05:00:00Z"),
      leads: [
        {
          id: "lead:1", nombre: "Ana <Prueba> & Co", rut: "1-9", email: "ana@x.cl", telefono: "+56900000001",
          fecha: "2026-10-27T13:00:00Z", asignadoA: "eje@x.cl", assignmentStatus: "asignado", asignacionCobrada: true,
          etapa: "cotizado", sueldoLiquido: 1500000,
          notas: [{ id: "n", texto: "Llamar mañana", fecha: "2026-10-27T14:00:00Z", autor: "eje@x.cl" }],
        },
        { id: "lead:2", nombre: "Beto", rut: "2-7", fecha: "2026-10-26T13:00:00Z" },
      ],
      usuarios: [
        { email: "eje@x.cl", nombre: "Eje Uno", role: "ejecutivo", passwordHash: "", createdAt: "2026-10-15T00:00:00Z", saldo: 12 },
      ],
      movimientos: [
        { id: "m", email: "eje@x.cl", fecha: "2026-10-27T13:00:01Z", tipo: "asignacion", cantidad: -1, motivo: "Asignación de lead", por: "reparto-automatico", leadId: "lead:1" },
      ],
    });
    expect(hojas.map((h) => h.nombre)).toEqual(["Resumen", "Leads", "Ejecutivos", "Créditos"]);
    const leads = hojas[1].filas;
    expect(leads).toHaveLength(3);
    const col = (n: string) => leads[0].indexOf(n);
    expect(leads[1][col("Nombre")]).toBe("Ana <Prueba> & Co");
    expect(leads[1][col("Ejecutivo")]).toBe("Eje Uno");
    expect(leads[1][col("Etapa")]).toBe("Cotización enviada");
    expect(leads[1][col("Sueldo líquido")]).toBe(1500000);
    expect(String(leads[1][col("Notas")])).toContain("Eje Uno] Llamar mañana");
    expect(leads[2][col("Estado reparto")]).toBe("Sin asignar");
    expect(hojas[2].filas[1]).toContain(12);
    expect(hojas[3].filas[1]).toContain("Ana <Prueba> & Co");

    const zip = leerZip(generarXlsx(hojas));
    expect([...zip.keys()]).toContain("xl/worksheets/sheet4.xml");
    expect(zip.get("xl/workbook.xml")).toContain('name="Créditos"');
    expect(zip.get("xl/worksheets/sheet2.xml")).toContain("Ana &lt;Prueba&gt; &amp; Co");
    expect(zip.get("xl/worksheets/sheet2.xml")).toContain("<v>1500000</v>");
  });
});

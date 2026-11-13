import { describe, expect, it } from "vitest";
import { leadsPorCampana } from "./metricas-campanas";

const AHORA = Date.parse("2026-11-14T12:00:00Z");
const hace = (dias: number) => new Date(AHORA - dias * 86400000).toISOString();

describe("leads por campaña", () => {
  it("cuenta por campaña (primero) y deja los demás canales como referencia", () => {
    const filas = leadsPorCampana(
      [
        { nombre: "a", rut: "", canal: "google-ads", campanaId: "24455995585", fecha: hace(1), calidad: "calificado" },
        { nombre: "b", rut: "", canal: "google-ads", campanaId: "24455995585", fecha: hace(20), etapa: "ganado" },
        { nombre: "c", rut: "", canal: "google-ads", campanaId: "23868580486", fecha: hace(2), falso: true },
        { nombre: "d", rut: "", canal: "google-ads", fecha: hace(40) },
        { nombre: "e", rut: "", canal: "meta-ads", fecha: hace(3) },
      ],
      {},
      AHORA,
    );
    expect(filas.map((f) => f.nombre)).toEqual([
      "Isapre Nueva - PMax - Leads Chile",
      "Isapre Nueva - Search - Chile",
      "Meta Ads",
      "Google Ads (sin campaña registrada)",
    ]);
    expect(filas[0]).toMatchObject({ total: 2, ultimos7: 1, ultimos30: 2, calificados: 1, ganados: 1, esCampana: true });
    expect(filas[1]).toMatchObject({ total: 1, falsos: 1 });
    expect(filas[3]).toMatchObject({ total: 1, ultimos30: 0, esCampana: false });
  });
});

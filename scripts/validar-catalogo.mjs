#!/usr/bin/env node
// Valida un catalogos.json nuevo ANTES de reemplazar lib/catalogos.json.
// Uso: node scripts/validar-catalogo.mjs <ruta-al-catalogos.json>
//
// Chequea estructura, slugs, GES, tipos de plan, campos obligatorios y
// entrega un resumen por isapre (planes, series, PDFs verificados vs null)
// para comparar contra lo que reportó la extracción.

import { readFileSync } from "node:fs";

const ruta = process.argv[2];
if (!ruta) {
  console.error("Uso: node scripts/validar-catalogo.mjs <catalogos.json>");
  process.exit(1);
}

const SLUGS = [
  "nuevamasvida",
  "banmedica",
  "consalud",
  "colmena",
  "cruzblanca",
  "vidatres",
  "esencial",
];
// GES vigentes del catálogo actual; si la fuente trae otros, es un cambio
// real de precio y hay que confirmarlo, no un error de formato.
const GES_ACTUAL = {
  banmedica: 0.778,
  consalud: 0.731,
  colmena: 1.036,
  cruzblanca: 0.971,
  vidatres: 0.712,
  nuevamasvida: 0.854,
  esencial: 0.91,
};
const TIPOS_OK = new Set(["Preferente", "Libre Elección", "Libre Eleccion"]);

const errores = [];
const avisos = [];

let cat;
try {
  cat = JSON.parse(readFileSync(ruta, "utf8"));
} catch (e) {
  console.error("❌ No se pudo parsear el JSON:", e.message);
  process.exit(1);
}

const slugsPresentes = Object.keys(cat);
for (const s of SLUGS) {
  if (!slugsPresentes.includes(s)) errores.push(`Falta la isapre "${s}"`);
}
for (const s of slugsPresentes) {
  if (!SLUGS.includes(s)) avisos.push(`Slug inesperado: "${s}"`);
}

let totalPlanes = 0;
let totalConPdf = 0;
let totalSinPdf = 0;
const codigosVistos = new Set();

console.log("isapre          planes  series                    pdf✓   pdf∅");
console.log("─".repeat(66));

for (const [slug, c] of Object.entries(cat)) {
  if (typeof c.label !== "string" || !c.label) errores.push(`${slug}: falta label`);
  if (typeof c.ges_uf !== "number" || c.ges_uf <= 0)
    errores.push(`${slug}: ges_uf inválido (${c.ges_uf})`);
  else if (GES_ACTUAL[slug] !== undefined && c.ges_uf !== GES_ACTUAL[slug])
    avisos.push(
      `${slug}: GES cambió ${GES_ACTUAL[slug]} → ${c.ges_uf} UF (verificar que sea real)`,
    );
  if (!Array.isArray(c.planes) || c.planes.length === 0) {
    errores.push(`${slug}: sin planes`);
    continue;
  }

  const series = new Map();
  let conPdf = 0;
  let sinPdf = 0;

  for (const p of c.planes) {
    const id = `${slug}/${p.codigo}`;
    if (!p.codigo || typeof p.codigo !== "string") errores.push(`${id}: codigo inválido`);
    if (codigosVistos.has(id)) errores.push(`${id}: código duplicado`);
    codigosVistos.add(id);
    if (typeof p.serie !== "string") errores.push(`${id}: serie debe ser string (puede ser "")`);
    if (!p.nombre) avisos.push(`${id}: sin nombre`);
    if (!TIPOS_OK.has(p.tipo)) errores.push(`${id}: tipo "${p.tipo}" no permitido (¿quedó un "Cerrado"?)`);
    if (typeof p.uf_base !== "number" || p.uf_base <= 0)
      errores.push(`${id}: uf_base inválido (${p.uf_base})`);
    if (!Number.isInteger(p.hosp_pct) || p.hosp_pct < 0 || p.hosp_pct > 100)
      errores.push(`${id}: hosp_pct inválido (${p.hosp_pct})`);
    if (!Number.isInteger(p.amb_pct) || p.amb_pct < 0 || p.amb_pct > 100)
      errores.push(`${id}: amb_pct inválido (${p.amb_pct})`);
    if (!Array.isArray(p.prest_hosp)) errores.push(`${id}: prest_hosp no es array`);
    if (!Array.isArray(p.prest_amb)) errores.push(`${id}: prest_amb no es array`);
    if (p.pdf === undefined) errores.push(`${id}: falta el campo pdf (string o null)`);
    else if (p.pdf === null) sinPdf++;
    else if (typeof p.pdf === "string" && p.pdf.toLowerCase().endsWith(".pdf")) conPdf++;
    else errores.push(`${id}: pdf inválido (${JSON.stringify(p.pdf)})`);

    series.set(p.serie, (series.get(p.serie) ?? 0) + 1);
  }

  totalPlanes += c.planes.length;
  totalConPdf += conPdf;
  totalSinPdf += sinPdf;

  const seriesTxt = [...series.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([s, n]) => `${s || '""'}:${n}`)
    .join(" ");
  console.log(
    `${slug.padEnd(15)} ${String(c.planes.length).padStart(6)}  ${seriesTxt.padEnd(24).slice(0, 24)}  ${String(conPdf).padStart(5)}  ${String(sinPdf).padStart(5)}`,
  );
}

console.log("─".repeat(66));
console.log(
  `TOTAL           ${String(totalPlanes).padStart(6)}${" ".repeat(28)}${String(totalConPdf).padStart(5)}  ${String(totalSinPdf).padStart(5)}`,
);
console.log(`\nEsperado según extracción: 2.183 planes · 1.166 con pdf null`);

if (avisos.length) {
  console.log(`\n⚠️  Avisos (${avisos.length}):`);
  for (const a of avisos.slice(0, 30)) console.log("  - " + a);
  if (avisos.length > 30) console.log(`  … y ${avisos.length - 30} más`);
}
if (errores.length) {
  console.log(`\n❌ Errores (${errores.length}):`);
  for (const e of errores.slice(0, 50)) console.log("  - " + e);
  if (errores.length > 50) console.log(`  … y ${errores.length - 50} más`);
  process.exit(1);
}
console.log("\n✅ Estructura válida. Listo para reemplazar lib/catalogos.json");

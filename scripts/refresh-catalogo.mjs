// scripts/refresh-catalogo.mjs
// Regenera catalogos.json desde la API de tu7.cl
//
// Uso: TU7_COOKIE="nombre=valor; ..." node scripts/refresh-catalogo.mjs > catalogos.json
// (La cookie de sesión de tu7.cl expira sola; no es la contraseña. NUNCA la commitees.)
//
// Flujo mensual completo:
//   1. Loguearse en tu7.cl y copiar la cookie de sesión del navegador.
//   2. TU7_COOKIE="..." node scripts/refresh-catalogo.mjs > /tmp/catalogos.json
//      (mirar SIEMPRE el reporte de stderr: anomalías = nombres de isapre
//       que cambiaron de grafía en tu7 y quedaron fuera).
//   3. node scripts/validar-catalogo.mjs /tmp/catalogos.json
//      (chequea estructura, GES vs los hardcodeados acá, duplicados, etc.)
//   4. Si valida: reemplazar lib/catalogos.json, actualizar el número de
//      planes en app/page.tsx, app/layout.tsx y lib/prompt.ts, build y push.
//
// Proceso de extracción documentado:
//   POST https://tu7.cl/Api/data/planes/ con Content-Type: application/json
//   y body {"METHOD":"LIST"} (otros METHOD devuelven 400). Requiere cookie
//   de sesión. Respuesta: array plano de ~2.255 planes. Los "Cerrado"
//   (TIPO_PLAN) no se venden y se excluyen; "preferente" en minúscula se
//   normaliza a "Preferente". Los % salen del mayor "NN%" de los textos
//   HOSPITALARIA_PLAN / AMBULATORIA_PLAN; los prestadores, de esos mismos
//   textos quitando los porcentajes. Los PDFs se verifican con Range de
//   1 byte contra el hosting y solo se guardan si existen (si no: null).

const TU7_ENDPOINT = 'https://tu7.cl/Api/data/planes/';
const PDF_BASE     = 'https://nuevamas.netlify.app/pdfs/';
const COOKIE       = process.env.TU7_COOKIE || '';

const SLUG = {
  'Banmedica':'banmedica', 'Consalud':'consalud', 'Colmena':'colmena',
  'Cruz Blanca':'cruzblanca', 'Vidatres':'vidatres',
  'Nueva Masvida':'nuevamasvida', 'Esencial':'esencial'
};
// Labels user-facing (los ve el cliente en el chat) — no siempre coinciden
// con la grafía de tu7: "Vidatres" allá, "Vida Tres" acá.
const LABEL = {
  banmedica:'Banmédica', consalud:'Consalud', colmena:'Colmena',
  cruzblanca:'Cruz Blanca', vidatres:'Vida Tres',
  nuevamasvida:'Nueva Masvida', esencial:'Esencial'
};
// GES en UF por beneficiario. Si cambian, actualizarlos acá a mano;
// validar-catalogo.mjs avisa si el JSON generado difiere de lo esperado.
const GES = {
  banmedica:0.778, consalud:0.731, colmena:1.036, cruzblanca:0.971,
  vidatres:0.712, nuevamasvida:0.854, esencial:0.91
};

// Porcentaje máximo de cobertura (mayor "NN%" en el texto libre; null si no hay).
function maxPct(txt){
  if(!txt || typeof txt!=='string') return null;
  const m = txt.match(/(\d+)\s*%/g);
  return (m && m.length) ? Math.max(...m.map(x=>parseInt(x,10))) : null;
}
// Prestadores: se eliminan los "NN%" y se separa por coma. Nombres TAL CUAL (con tildes).
function prestadores(txt){
  if(!txt || typeof txt!=='string') return [];
  return txt.replace(/\d+\s*%/g, ',').split(',').map(s=>s.trim()).filter(Boolean);
}
// Serie: letras iniciales alfabéticas en mayúscula; "" si el código empieza con número.
function serie(codigo){
  const m = String(codigo).match(/^([A-Za-z]+)/);
  return m ? m[1].toUpperCase() : '';
}

// Verificación de PDF: Range de 1 byte; 200/206 + content-type pdf = existe.
async function pdfExists(url){
  try{
    const r = await fetch(url, { headers:{ 'Range':'bytes=0-0' } });
    const ct = r.headers.get('content-type') || '';
    return (r.status===200 || r.status===206) && ct.includes('pdf');
  }catch{ return false; }
}
async function runPool(items, worker, concurrency=25){
  let i = 0;
  const next = async () => { while(i < items.length){ const idx = i++; await worker(items[idx]); } };
  await Promise.all(Array.from({length:concurrency}, next));
}

// Extracción: POST con body {"METHOD":"LIST"} devuelve el array de planes.
// Otros valores de METHOD devuelven 400 ("METHOD no válido").
async function fetchPlanes(){
  const r = await fetch(TU7_ENDPOINT, {
    method:'POST',
    headers:{ 'Content-Type':'application/json', 'Cookie': COOKIE },
    body: JSON.stringify({ METHOD:'LIST' })
  });
  if(!r.ok) throw new Error(`tu7 respondió ${r.status}`);
  const data = await r.json();
  if(!Array.isArray(data)) throw new Error('Respuesta inesperada (no es array)');
  return data;
}

async function main(){
  if(!COOKIE){ console.error('Falta TU7_COOKIE (cookie de sesión de tu7.cl)'); process.exit(1); }

  const data = await fetchPlanes();
  const now  = new Date().toISOString();

  const cat = {};
  for(const slug of Object.keys(LABEL)){
    cat[slug] = { label:LABEL[slug], ges_uf:GES[slug], generado:now, fuente:'tu7.cl', planes:[] };
  }

  const report = {}; const anomalies = [];
  for(const slug of Object.keys(LABEL)) report[slug] = { origen:0, incluidos:0, cerrado:0, pct_faltante:0 };

  const toVerify = [];
  for(const p of data){
    const slug = SLUG[p.NOMBRE_ISAPRE];
    if(!slug){ anomalies.push(`Isapre desconocida: ${p.NOMBRE_ISAPRE} (${p.CODIGO_PLAN})`); continue; }
    report[slug].origen++;

    // "preferente" (minúscula, typo de origen) -> "Preferente".
    let tipo = p.TIPO_PLAN === 'preferente' ? 'Preferente' : p.TIPO_PLAN;

    // Los "Cerrado" no se venden -> excluidos del catálogo.
    if(tipo === 'Cerrado'){ report[slug].cerrado++; continue; }

    const hosp = maxPct(p.HOSPITALARIA_PLAN);
    const amb  = maxPct(p.AMBULATORIA_PLAN);
    if(hosp===null || amb===null) report[slug].pct_faltante++;

    const uf = parseFloat(p.BASE_PLAN);
    if(Number.isNaN(uf)) anomalies.push(`BASE_PLAN no numérico: "${p.BASE_PLAN}" (${p.CODIGO_PLAN})`);

    const plan = {
      codigo: p.CODIGO_PLAN,
      serie:  serie(p.CODIGO_PLAN),
      tipo,
      uf_base: Number.isNaN(uf) ? null : uf,
      hosp_pct: hosp===null ? 0 : hosp,
      amb_pct:  amb===null  ? 0 : amb,
      prest_hosp: prestadores(p.HOSPITALARIA_PLAN),
      prest_amb:  prestadores(p.AMBULATORIA_PLAN),
      nombre: p.NOMBRE_PLAN,
      pdf: null
    };
    cat[slug].planes.push(plan);
    report[slug].incluidos++;
    toVerify.push({ slug, plan, pdfPlan: p.PDF_PLAN });
  }

  // Verificación de PDFs. Candidato 1: {slug}/{codigo}.pdf.
  // Candidato 2: {slug}/{PDF_PLAN} solo si difiere del código (robustez a futuro).
  await runPool(toVerify, async ({slug, plan, pdfPlan})=>{
    if(await pdfExists(`${PDF_BASE}${slug}/${plan.codigo}.pdf`)){
      plan.pdf = `${plan.codigo}.pdf`; return;
    }
    if(pdfPlan && pdfPlan !== `${plan.codigo}.pdf`){
      if(await pdfExists(`${PDF_BASE}${slug}/${pdfPlan}`)) plan.pdf = pdfPlan;
    }
  }, 25);

  // Reporte a stderr (para no ensuciar el JSON de stdout).
  let tot=0, pdfOk=0, pdfNull=0;
  for(const slug of Object.keys(cat)){
    for(const pl of cat[slug].planes){ tot++; pl.pdf ? pdfOk++ : pdfNull++; }
  }
  console.error('--- REPORTE ---');
  console.error(JSON.stringify(report, null, 2));
  console.error(`TOTAL incluidos: ${tot} | con PDF: ${pdfOk} | pdf null: ${pdfNull}`);
  if(anomalies.length) console.error('ANOMALÍAS:\n' + anomalies.join('\n'));

  process.stdout.write(JSON.stringify(cat, null, 2));
}
main().catch(e=>{ console.error(e); process.exit(1); });

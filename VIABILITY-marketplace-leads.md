# VIABILITY-marketplace-leads

> Análisis de viabilidad generado por Forge · 2026-09-07

## Resumen Ejecutivo

**Idea:** Convertir el panel de nuevaisapre.cl en un marketplace donde ejecutivos de isapre compran créditos ($10.000 c/u, packs de 10) y reciben automáticamente los leads de Google Ads, en vez de que el equipo interno los trabaje todos.

**Veredicto:** 🟡 **CAUTION**
**Score:** 3.4 / 5.0
**Ruta recomendada:** 🏗️ SaaS Completo para la documentación (el diseño técnico lo exige: dinero, roles, seguridad) — pero con un **Fase 0 interna sin Mercado Pago** para el lanzamiento en 2 días, y la automatización completa como fase posterior validada.

---

## Análisis por Dimensión

### Viabilidad Técnica: 3.4/5
- **Golden Path Fit:** Parcial. Next.js está, pero la capa de datos hoy es Upstash KV con leads que expiran a los 60 días y fallback silencioso a memoria — incompatible con un ledger de créditos. Migrar a Postgres/Supabase es casi obligatorio, no es un simple "usar lo que ya hay".
- **APIs Externas:** Mercado Pago es una integración estándar y bien documentada (checkout + webhook), pero exige idempotencia y validación de firma correctas desde el día uno porque mueve dinero real.
- **Complejidad:** Alta. No es 1-3 features core: son roles multiusuario, ledger append-only, motor de reparto con concurrencia, checkout, panel ejecutivo nuevo, y cumplimiento Ley 21.719 — todo en paralelo.
- **Datos:** Ya existen (245 leads, catálogos de coberturas, usuarios) — no hay que conseguir datos externos.

### Viabilidad de Negocio: 3.5/5
- **Problema:** Claro y con referencia de precio real: un lead suelto costaba $11.000 antes de que armaran Google Ads propio. Vender a $10.000/lead está justo bajo esa referencia.
- **Mercado:** Identificable (ejecutivos/corredores de isapre) pero **sin validar fuera del equipo interno** — no hay evidencia de que un ejecutivo externo ya haya dicho que compraría. Marca como "requiere validación", no como asumido.
- **Monetización:** Modelo definido (packs de 10 a $10.000/lead), pero sin estrategia de precio por volumen todavía — se puede resolver más adelante con `/precio`.
- **Diferenciación:** Real frente al competidor directo (ver abajo) — cobrar por lead entregado en vez de una suscripción fija es una propuesta distinta y potencialmente más atractiva para un ejecutivo que recién empieza.

### Viabilidad de Marketing: 3.35/5
- **Canal de adquisición:** Para el equipo interno (Cynthia, Ingrid) ya existe. Para ejecutivos externos, todavía no hay canal probado — **tu7.cl ya lo resolvió con años de operación**.
- **Explicabilidad:** Alta — "compra créditos, recibe leads" se entiende en una frase.
- **Timing:** Bueno. Vi en tu7.cl un aviso activo de Consalud reclutando "Ejecutivos de Ventas de Isapres" — confirma que hay demanda real de canales de leads para ese perfil ahora mismo.
- **Viral potential:** Bajo — es B2B nicho, el crecimiento será por reclutamiento directo o boca a boca entre ejecutivos.

---

## Investigación de Competencia (hecha mientras el usuario estaba desconectado)

**tu7.cl — competidor directo y en operación:**
- Comparador de isapres público casi idéntico en propuesta (7 isapres, cotización gratis, WhatsApp).
- Tiene una sección **"Ejecutivos"** ya construida — pero el modelo de negocio es **suscripción**, no créditos por lead: el login de ejecutivo muestra un botón "Activa o renueva tu suscripción". Esto es una diferencia de modelo importante a tener en cuenta para `/precio` más adelante — cobrar por lead entregado (como se decidió acá) es una apuesta distinta a cobrar una mensualidad fija.
- El botón "Asistente" en su home **no abre un chat conversacional real** — abre el mismo formulario estático de cotización que "Necesitas un asesor". No encontré un chat IA público en la superficie de marketing de tu7.cl. Es posible que el "chat pro" que mencionas viva detrás del login de ejecutivos (al que no tengo ni debo tener acceso) — cuando mandes el resumen de su back/front, lo cruzo con esto.
- Vi un aviso publicitario en vivo de Consalud reclutando ejecutivos de ventas de isapre en Santiago — señal de mercado real y actual.

**nuevamas.netlify.app / el zip que enviaste:**
- Es una versión anterior de tu propio comparador (Next steps: mismo copy "Cotiza tu plan de salud en 30 segundos", 7 isapres, 5.000+ prestadores). Su "Acceso usuarios" es solo **recuperar cotización por WhatsApp** para el cliente final — no es un login de ejecutivos ni tiene chat IA.
- Sirve como **referencia de diseño** (paleta azul/dorado, tarjetas de plan con barras de cobertura, CTA WhatsApp) para las pantallas nuevas del marketplace (`/panel`, resultados), no como referencia arquitectónica.

---

## Riesgos Identificados

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|--------|-------------|---------|------------|
| 1 | Lanzar en 2 días es incompatible con Mercado Pago + migración de BD + motor de reparto atómico hechos bien | Alta | Alto | Fase 0 interna: reparto manual/asistido con créditos regalados al equipo interno (Cynthia, Ingrid), sin checkout real, mientras se construye la base de datos y el motor en paralelo |
| 2 | Sin validación de que un ejecutivo externo pagaría $10.000/lead | Media | Alto | Vender primero al equipo interno (con créditos regalados) para probar el flujo; recién después abrir a externos con el checkout ya probado |
| 3 | Migrar de Upstash KV a Postgres sin script reversible podría perder los 245 leads existentes | Baja si se planea, Alta si se apura | Alto | Exigir migración con respaldo previo y script reversible, tal como pide el prompt original — no negociable |
| 4 | El export de conversiones para Google Ads (crítico para la campaña activa) se rompe durante la migración | Baja | Alto | Congelar y testear el export como criterio de aceptación antes de cualquier merge a producción |
| 5 | tu7.cl ya tiene el canal de ejecutivos externos resuelto — competir ahí de entrada es cuesta arriba | Media | Medio | Empezar el marketplace puertas adentro (interno) y con corredores conocidos, no con adquisición fría, al menos en la primera fase |

---

## Recomendación

**CAUTION, no NO-GO ni GO directo.** La idea tiene fundamento real (precio de referencia conocido, demanda de mercado confirmada por el aviso de Consalud, diferenciación clara frente a tu7.cl) pero el plazo de 2 días choca de frente con la complejidad técnica real (ledger de dinero, concurrencia, checkout, migración de base de datos). Forzar todo en 2 días es la receta para perder un lead sin cobrar el crédito, o cobrar y no asignar — exactamente lo que el prompt original quiere evitar.

Sugiero separar en dos pistas que corren en paralelo:

1. **Lo que sale en 2 días** (sin código nuevo de pagos): activar el reparto **manual/asistido** entre el equipo interno con créditos regalados por el superadmin — esto ya es posible hoy con el modelo de roles/asignación que existe en `lib/usuarios.ts` y `lib/leads.ts`, casi sin cambios.
2. **Lo que se planifica con el pipeline completo** (BMC → Blueprint): el marketplace real con Mercado Pago, ejecutivos externos, ledger, y migración de base de datos — se construye con cuidado y se abre a ejecutivos externos solo cuando el flujo interno ya se probó.

### Si CAUTION → Qué validar primero
1. Confirmar con al menos 1-2 ejecutivos externos (no del equipo interno) si comprarían créditos a $10.000/lead antes de invertir en el checkout de Mercado Pago.
2. Definir con el usuario si el "lanzamiento en 2 días" se refiere a la Fase 0 interna (factible) o al marketplace completo con cobro (no factible en ese plazo sin arriesgar la integridad de los créditos).
3. Obtener del usuario el resumen del back/front de tu7.cl prometido, para confirmar si el "chat inteligente" vive en un lugar específico que cambie el alcance de la Fase 6 (chat interno gratis para ejecutivos).

---

## Actualización de alcance (post análisis de tu7.cl)

Tras revisar `analisis-tu7cl-cotizador.md` (ingeniería inversa completa de tu7.cl: motor de cálculo, BD de 2.346 planes, filtros con facetas, dashboard ejecutivo), el usuario confirmó:

1. **Alcance ampliado, todo junto:** el Blueprint cubre tanto el **marketplace de créditos** (prompt original) como el **motor de cotización completo** (réplica mejorada de tu7.cl: BD normalizada de isapres/planes/coberturas/factores, cálculo instantáneo, filtros con contadores vivos, cotizador público `/cotizador` + versión ejecutivo `/admin/cotizador`). Estimación propia del análisis: ~8-10 semanas solo para el motor de cotización, aparte del marketplace.
2. **Romina se reorienta:** deja de ser (o se reduce como) bot público de WhatsApp y se convierte en **herramienta interna gratuita para ejecutivos** — diferenciador frente a tu7.cl, que no ofrece nada equivalente incluido en su suscripción.

Esto **no cambia el veredicto CAUTION** — lo refuerza. El proyecto combinado es considerablemente más grande que lo evaluado en el score original (3.4/5), así que la recomendación de separar en dos pistas se mantiene con más razón:

- **Fase 0 (sale en ~2 días):** reparto manual/asistido de leads con créditos regalados al equipo interno, sobre el sistema de leads actual (sin tocar el cotizador todavía).
- **Todo lo demás** (motor de cotización, Mercado Pago, Romina interna, migración de BD): se planifica con el resto del pipeline SaaS Completo y se construye por fases, tal como sugiere el propio roadmap del análisis de tu7.cl (sección 8.9).

## Siguiente paso

Con esto documentado, sigue el **Step 1 (Business Model Canvas)** del pipeline 🏗️ SaaS Completo — ahí formalizamos el modelo de negocio combinado (marketplace + motor de cotización) y quedamos listos para el PDR.

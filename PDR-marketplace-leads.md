# 📋 PDR: Marketplace de Leads + Cotizador Gratis nuevaisapre.cl

> **Product Definition Report**
> **Estado**: BORRADOR
> **Fecha**: 2026-09-07
> **Versión**: 1.0

---

## 1. Problema de Negocio

### El Dolor
Hoy nuevaisapre.cl genera un flujo constante de leads vía Google Ads, pero solo dos personas (Cynthia e Ingrid) los trabajan manualmente — la capacidad de venta interna es muy inferior al volumen de leads que la campaña puede producir si se escala. Al mismo tiempo, los ejecutivos/corredores de isapre externos en Chile (más de 5.000) hoy solo tienen dos malas alternativas para conseguir el flujo de leads y las herramientas que necesitan para vender:
1. Comprar leads sueltos y caros a proveedores externos, sin garantía de calidad ni exclusividad.
2. Pagar una suscripción mensual fija a **tu7.cl** ($19.990–$21.990 CLP/mes) para acceder a un cotizador profesional — sin que eso les garantice recibir ni un solo lead nuevo.

### El Costo
- Un lead suelto costaba ~$11.000 antes de que nuevaisapre.cl armara su propia campaña de Google Ads (CPA actual: $7.441/lead, ~3 leads/día).
- Un ejecutivo externo paga entre $240.000 y $264.000 al año solo en suscripción a tu7.cl, por una herramienta que no le entrega ni un lead — el costo de adquisición de clientes queda 100% sobre sus hombros.
- El excedente de capacidad del equipo interno (leads generados que no alcanzan a trabajarse a tiempo) se enfría y pierde valor: el análisis de tu7.cl y el propio proceso interno confirman que la ventana de alta intención del prospecto dura minutos, no días.

### Situación Actual
El equipo interno usa el panel `/admin` actual (roles superadmin/ejecutivo ya implementados, asignación manual de leads por email) para trabajar los leads que entran del formulario de cotización simple. No existe hoy ningún canal para vender el excedente de leads a ejecutivos externos, ni una herramienta de cotización propia — quien quiere cotizar rápido y bien hoy depende de tu7.cl.

---

## 2. Propuesta de Valor

### En Una Frase
> Un marketplace que le da a cualquier ejecutivo de isapre en Chile el mismo cotizador profesional que hoy solo consigue pagando una suscripción a tu7.cl — **gratis** — y le permite además comprar leads exclusivos y calificados por crédito, sin mensualidad.

**Corrección clave de alcance (importante):** el sistema **no vende "leads ya cotizados" como producto empaquetado**. Son dos cosas separadas:
1. **El cotizador (motor de cálculo + comparador) es gratis** para todo ejecutivo con cuenta aprobada, se compren créditos o no — es lo que reemplaza la necesidad de pagarle a tu7.cl.
2. **La compra de créditos para recibir leads exclusivos** es un producto de pago aparte, independiente de si el ejecutivo usa el cotizador o no.

### Flujo Principal (Happy Path)

**Lado prospecto/consumidor:**
1. El prospecto llega desde Google Ads u orgánico y cotiza gratis en `/cotizador` (sin RUT).
2. Ve 3 planes comparados con precio real y desglose transparente.
3. Al pedir contacto (alto intento), se crea un `lead` enlazado a esa cotización, con `gclid`/UTMs.
4. El motor de reparto sortea el lead entre ejecutivos activos con saldo (ponderado por menor carga reciente) y descuenta 1 crédito de quien lo recibe.
5. El ejecutivo asignado recibe notificación inmediata (email/WhatsApp) y ve el lead en su `/panel` con la cotización adjunta.
6. El ejecutivo contacta al prospecto por WhatsApp, usando Romina si quiere ayuda para redactar o resolver dudas de cobertura, y cierra la venta o actualiza etapa/calidad.

**Lado ejecutivo (uso del cotizador, independiente de si compró créditos):**
1. El ejecutivo (interno o externo, con cuenta aprobada) entra a `/panel/cotizador`.
2. Cotiza para cualquier cliente propio (no necesariamente un lead comprado en la plataforma).
3. Genera el PDF/comparativo y lo envía por WhatsApp o correo — reemplaza el uso de tu7.cl.

### Flujos Alternativos
- **Sin candidatos con saldo:** el lead queda `sin_asignar`; Cynthia (superadmin) lo ve y puede asignarlo a mano gratis a quien quiera, o se reparte automáticamente al backlog cuando alguien recarga créditos (límite de antigüedad configurable, ej. 72h).
- **Regalo de créditos:** Cynthia, como superadmin, puede regalar créditos a cualquier ejecutivo (empezando por sí misma e Ingrid) sin pasar por Mercado Pago, con motivo registrado en el ledger.
- **Lead inválido:** el ejecutivo reclama dentro de 48h (teléfono falso, duplicado); Cynthia aprueba o rechaza, y si aprueba se devuelve el crédito.

---

## 3. Usuario Objetivo

### Persona Principal
- **Rol**: Ejecutivo/corredor de venta de isapre (interno o externo).
- **Contexto**: Trabaja leads y clientes propios por WhatsApp y teléfono, necesita cotizar rápido durante o justo después de una llamada.
- **Nivel técnico**: No-tech a intermedio (asunción — no validada con ejecutivos externos reales; el diseño debe priorizar simplicidad sobre potencia).
- **Dispositivo principal**: Mixto — desktop en horario de oficina, mobile el resto del día.
- **Frecuencia de uso**: Diaria.

### Personas Secundarias
- **Cynthia (`info@nuevaisapre.cl`) — Superadmin + Ejecutiva:** cumple ambos roles a la vez. Aprueba cuentas nuevas, regala créditos y asigna leads manualmente cuando el pool está vacío, y también trabaja sus propios leads como cualquier ejecutivo.
- **Ingrid — Ejecutiva interna:** primera usuaria de prueba junto a Cynthia, recibe créditos regalados.
- **Sebastián — Dueño de producto/desarrollo:** no opera el día a día del panel, pero define reglas de negocio y prioriza el roadmap.

### TAM Estimado
Más de 5.000 ejecutivos/corredores de isapre en Chile. Meta inicial realista: **al menos 500 ejecutivos activos** en la plataforma (cifra del usuario, no validada aún con adquisición real — ver Gaps).

---

## 4. Arquitectura de Datos

### Input — Qué entra al sistema
| Dato | Tipo | Fuente | Obligatorio |
|------|------|--------|-------------|
| Datos de cotización (edad, renta, región, cargas, isapre actual, clínica preferida) | Formulario | Prospecto en `/cotizador` público | Sí |
| Registro de ejecutivo (nombre, email, teléfono, RUT, isapre que representa) | Formulario | Ejecutivo en `/registro` | Sí |
| Pago de créditos | Checkout Mercado Pago | Ejecutivo en `/panel/creditos` | Solo para compra, no para uso del cotizador |
| Aprobación/rechazo de cuenta y regalo de créditos | Acción manual | Superadmin (Cynthia) | Sí |
| Catálogo de planes/coberturas de las 7 isapres | Carga/actualización periódica | Datos oficiales de isapres (PDFs) | Sí |

### Output — Qué sale del sistema
| Dato | Tipo | Destino | Formato |
|------|------|---------|---------|
| Cotización comparada | Pantalla + PDF | Prospecto / ejecutivo | Web + PDF |
| Notificación de lead asignado | Email + WhatsApp | Ejecutivo | Mensaje directo |
| Export de conversiones calificadas | CSV | Google Ads (subida manual, ya existente) | CSV con `gclid` |
| Comprobante de compra de créditos | Registro en panel | Ejecutivo | Historial en `/panel/creditos` |
| Ledger de créditos | Registro interno | Superadmin | Tabla auditable |

### Entidades Principales (Modelo Conceptual)
| Entidad | Descripción | Relaciones |
|---------|-------------|------------|
| `usuario` | Ejecutivo o superadmin, con estado (pendiente/activo/suspendido) | Tiene créditos, recibe leads, hace cotizaciones |
| `lead` | Prospecto capturado, con canal, etapa, calidad, asignación | Se enlaza a 0 o 1 `cotizacion` |
| `cotizacion` | Cotización guardada (pública o de un ejecutivo), planes vistos, filtros | Puede generar un `lead`; puede pertenecer a un `usuario` (ejecutivo) o ser anónima |
| `credit_transactions` (ledger) | Movimiento de créditos: compra/regalo/consumo/reembolso/ajuste | Pertenece a un `usuario` |
| `plan`, `isapre`, `cobertura`, `factor_etario` | Catálogo normalizado para el motor de cotización | Alimentan `cotizacion` |
| `orden` | Compra de créditos vía Mercado Pago | Pertenece a un `usuario`, genera movimientos en el ledger |

---

## 5. KPIs de Éxito

### Métrica Principal (Fase 0 — interna, 2 días)
Los 2 ejecutivos internos (Cynthia, Ingrid) reciben y trabajan el 100% de los leads nuevos, sin que ninguno quede sin asignar por más de 15 minutos, durante la primera semana de operación.

### Métricas Secundarias
- Al menos 1 ejecutivo externo (fuera del equipo interno) crea cuenta y usa el cotizador gratis en el primer mes.
- 0 incidentes de crédito descontado sin lead asignado, o lead asignado sin crédito descontado (integridad del ledger).
- El export de conversiones para Google Ads sigue funcionando exactamente igual que hoy, sin interrupciones durante la migración de base de datos.

---

## 6. Modelo de Negocio

### Monetización
- **Único revenue stream:** venta de créditos prepago — $10.000 por crédito (= 1 lead exclusivo), en packs de 10 ($100.000). Sin precio por volumen todavía (pendiente de `/precio`).
- **El cotizador y Romina son gratuitos** para todo ejecutivo con cuenta aprobada — no se monetizan directamente; son el diferenciador que elimina la razón de pagarle a tu7.cl.

### Competencia
| Competidor | Qué hacen | Nuestra diferencia |
|------------|-----------|---------------------|
| **tu7.cl** | Cotizador profesional (2.346 planes, filtros con facetas, cálculo instantáneo) + CRM de ejecutivo, todo detrás de una suscripción mensual fija ($19.990–$21.990). No vende leads. | Cotizador equivalente **gratis**; el ingreso viene de vender leads exclusivos por crédito, no de cobrar por la herramienta. |
| Proveedores de leads sueltos | Venden contactos sin cotización adjunta, sin exclusividad garantizada, ~$11.000 c/u | Leads exclusivos (nunca revendidos), enriquecidos con la cotización del prospecto, mismo rango de precio |

### Pricing Tentativo
- Pack de 10 créditos = $100.000 CLP ($10.000/crédito).
- Sin descuento por volumen en esta fase — a definir con `/precio` una vez validado el modelo con ejecutivos externos reales.

---

## 7. Alcance del MVP (Fase 1)

### Features Core (Debe tener) — Fase 0, sale en ~2 días
1. **Reparto manual/asistido de leads** entre Cynthia e Ingrid, usando el modelo de roles y asignación que ya existe en `lib/usuarios.ts` / `lib/leads.ts` — sin Mercado Pago, sin motor automático todavía.
2. **Regalo de créditos por el superadmin** (Cynthia) — versión mínima del ledger, aunque sea manual al inicio.
3. **Visibilidad de leads por ejecutivo** — ya implementada, se reutiliza tal cual.

### Features Diferidas (Fase 2+)
- Motor de reparto automático (round-robin ponderado, transaccional, con notificación inmediata).
- Cotizador público y de ejecutivo completo (motor de cálculo, BD normalizada, filtros con facetas).
- Checkout de créditos con Mercado Pago (webhook, idempotencia, ledger append-only formal).
- Registro y aprobación de ejecutivos externos, landing `/ejecutivos`.
- Romina como herramienta interna de IA para el ejecutivo.
- SEO del cotizador público (`/planes/[isapre]`, páginas indexables).

### Explícitamente Fuera de Alcance
- Autocontratación 100% online sin ejecutivo humano — el modelo de negocio depende de que un ejecutivo cierre la venta.
- Facturación/boleta electrónica automática — solo se registran datos tributarios por ahora.
- Roles de `supervisor`/`agencia` (multi-ejecutivo bajo un mismo comprador) — se deja el modelo de roles preparado pero no se implementa aún.

---

## 8. Consideraciones Especiales

### Requisitos No Funcionales
- **Autenticación**: Sí — ya existe (JWT vía `jose` + bcrypt), se extiende para registro self-service de ejecutivos externos.
- **Roles/Permisos**: Sí — `superadmin` / `ejecutivo`, ya modelados; Cynthia ocupa ambos roles simultáneamente vía `info@nuevaisapre.cl`.
- **Pagos/Billing**: Sí — Mercado Pago Checkout Pro, en fase posterior a la Fase 0.
- **Datos Sensibles**: Sí — datos personales de terceros (Ley 21.719); requiere texto de consentimiento versionado y registro de accesos.
- **Integraciones**: Mercado Pago (pagos), catálogo oficial de planes de isapres (PDFs), Google Ads (conversión), WhatsApp/email (notificaciones).
- **Multi-idioma**: No.
- **Multi-tenant**: No en esta fase (todos los ejecutivos comparten la misma instancia; no hay aislamiento por agencia todavía).
- **Offline**: No.

### Restricciones Conocidas
- La base de datos actual (Upstash KV) tiene TTL de 60 días en los leads y fallback silencioso a memoria — **incompatible con un ledger de créditos**; requiere migración a Postgres/Supabase antes de automatizar cualquier transacción de dinero.
- El export de conversiones para Google Ads es crítico para la campaña activa y no puede romperse durante ningún cambio.
- Plazo de 2 días es real solo para la Fase 0 (sin pagos); el resto requiere semanas, según el propio roadmap del análisis de tu7.cl.

### Riesgos Identificados
| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Migrar la BD sin script reversible pierde los 245 leads existentes | Alto | Migración con respaldo previo y script reversible, no negociable |
| Vender créditos antes de validar que un ejecutivo externo realmente compraría | Alto | Validar primero con Cynthia/Ingrid (créditos regalados) antes de abrir compra real |
| El cotizador gratis canibaliza el único revenue stream si se percibe como "todo gratis" | Medio | Comunicar claramente que el cotizador es gratis pero los leads exclusivos se pagan — son productos distintos |
| Cynthia concentra rol de superadmin + ejecutiva sin separación de responsabilidades | Medio | Aceptable en esta escala; documentar como decisión consciente, revisar si el equipo crece |

---

## 9. Gaps Identificados y Recomendaciones

- **Nivel técnico real del ejecutivo externo**: asumido como no-tech/intermedio sin validar. Recomendación: confirmar con los primeros 5-10 ejecutivos externos que se registren antes de invertir en features avanzadas de UI.
- **TAM de 500 ejecutivos**: es una meta, no una cifra validada con datos de adquisición reales. Recomendación: tratarla como hipótesis a validar en `/roi` y `/metas`, no como compromiso.
- **Precio por volumen**: no definido todavía — se resuelve en el skill `/precio` más adelante, no bloquea este PDR.

---

## 10. Próximos Pasos (Pipeline)

Una vez aprobado este PDR, los siguientes skills del pipeline generarán:

1. ⬜ **Tech Spec** — Stack técnico, migración de BD, arquitectura del motor de cotización y del marketplace
2. ⬜ **User Stories** — Historias de usuario completas con criterios de aceptación
3. ⬜ **UX Research / Wireframes** — Personas, journeys, screen flows
4. ⬜ **UI Implementation** — Pantallas reales (`/panel`, `/cotizador`, `/registro`, extensiones a `/admin`)
5. ⬜ **Pre-Mortem + Security Audit** — Riesgos de producto y técnicos (créditos, pagos, Ley 21.719)
6. ⬜ **Master Blueprint** — Plan de implementación por fases

---

*PDR generado con el pipeline de SaaS La Herrería*
*Pendiente aprobación antes de avanzar al siguiente skill*

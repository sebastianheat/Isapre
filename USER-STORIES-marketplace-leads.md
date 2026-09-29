# Marketplace de Leads nuevaisapre.cl — User Stories

> **Versión**: 1.0
> **Estado**: BORRADOR
> **Fecha**: 2026-09-07
> **PDR**: PDR-marketplace-leads.md
> **Tech Spec**: TECH-SPEC-marketplace-leads.md
> **Total Stories**: 49 (P0: 10 | P1: 36 | P2: 3)
> **Actualizado tras UX Design (Skill #6):** +US-006b y +US-048, agregados por la Evaluación de Usabilidad para resolver 2 violaciones de severidad 3 (ver `docs/ux-design/usability-evaluation/`).

> **Nota de priorización:** al escribir los stories en detalle, ajusté el reparto de prioridades respecto al plan inicial. La Fase 0 (2 días) es más angosta de lo estimado a primera vista: solo cubre el reparto manual sobre el sistema actual (Upstash KV) y un ledger mínimo — la migración a Postgres, el motor automático, el cotizador y Mercado Pago son todos P1, porque dependen de la base de datos migrada. Esto es consistente con las advertencias del Viability Check sobre el plazo de 2 días.

---

## User Journey Map

```
[Prospecto] Cotiza (Epic 5) → pide contacto → nace el lead
        │
        ▼
[Sistema] Reparto manual Fase 0 (Epic 2) / Reparto automático (Epic 4)
        │
        ▼
[Ejecutivo] Notificado (Epic 4) → ve ficha con cotización (Epic 7)
        │                              → cotiza con su propio cliente (Epic 6)
        ▼
    Cierra venta / marca calidad (Epic 7)

[Ejecutivo externo] Registro (Epic 1) → Aprobación (Epic 8) → Compra créditos (Epic 9) → recibe leads
[Superadmin] Aprueba, regala créditos, configura reparto, resuelve reembolsos (Epic 8)
[Cumplimiento] Consentimiento y registro de accesos corren transversales (Epic 10)
```

## Resumen de Epics

| Epic | Stories | Prioridad | Descripción |
|------|---------|-----------|--------------|
| 1. Autenticación y Roles | US-001 a US-004 | P1 | Registro y aprobación de ejecutivos externos |
| 2. Reparto Manual de Leads (Fase 0) | US-005 a US-008 | **P0** | Cola de sin_asignar, asignación con 1 clic, sobre el sistema actual |
| 3. Ledger de Créditos | US-009 a US-012 | P0 (mínimo) / P1 (completo) | Regalo/consumo de créditos, historial auditable, ledger append-only en Postgres |
| 4. Motor de Reparto Automático | US-013 a US-017 | P1 | Asignación transaccional ponderada, notificación inmediata, backlog |
| 5. Cotizador Público | US-018 a US-023 | P1 | Motor de cálculo, filtros con facetas, LeadGate |
| 6. Cotizador del Ejecutivo | US-024 a US-026 | P1 | Versión desbloqueada, envío por WhatsApp/correo, PDF |
| 7. Panel del Ejecutivo (`/panel`) | US-027 a US-032 | P0 (parcial) / P1 | Dashboard, mis leads, ficha, calidad, reembolsos, perfil |
| 8. Panel del Superadmin | US-033 a US-037 | P0 (parcial) / P1 | Saldo de ejecutivos, packs, órdenes, reembolsos, métricas |
| 9. Compra de Créditos con Mercado Pago | US-038 a US-042 | P1 | Checkout, webhook, idempotencia, reembolsos/contracargos |
| 10. Cumplimiento Ley 21.719 | US-043 a US-045 | P1 | Consentimiento versionado, cláusulas, registro de accesos |
| Stories No-Funcionales | US-046, US-047 | P1 / **P0** | Migración de datos, validación del export de Google Ads |

---

## Epic 1: Autenticación y Roles

> Registro self-service de ejecutivos externos con aprobación manual del superadmin — el equipo interno ya tiene acceso vía el sistema actual.

### US-001: Registro de ejecutivo externo

**Como** corredor de isapre externo (ej. Rodrigo)
**Quiero** crear una cuenta con mis datos personales y la isapre que represento
**Para** poder acceder al cotizador gratis y eventualmente comprar créditos

**Acceptance Criteria:**

Funcionalidad:
- [ ] El formulario pide: nombre completo, email, teléfono/WhatsApp, RUT, isapre(s) que representa, código de agente/corredor (opcional)
- [ ] Al enviar, se crea un usuario con `estado = 'pendiente_aprobacion'`
- [ ] Se envía email de verificación al correo ingresado
- [ ] El usuario no puede iniciar sesión hasta verificar el email

Validaciones:
- [ ] Email con formato inválido: "Ingresa un email válido"
- [ ] RUT que no pasa el dígito verificador: "El RUT ingresado no es válido"
- [ ] Email ya registrado: "Ya existe una cuenta con este correo. ¿Olvidaste tu contraseña?"

Error Handling:
- [ ] Si falla el envío del email de verificación, se puede reenviar desde la pantalla de confirmación

UX:
- [ ] Formulario responsive, mobile-first
- [ ] Mensaje claro tras enviar: "Tu cuenta está en revisión, te avisaremos por correo"

**Prioridad:** P1
**Estimación:** M
**Dependencias:** Ninguna
**Notas técnicas:** Extiende la tabla `usuario` del Tech Spec (4.2); reutiliza `hashPassword` de `lib/auth.ts`.

---

### US-002: Verificación de email

**Como** ejecutivo recién registrado
**Quiero** confirmar mi correo con un link
**Para** activar mi cuenta y quedar en cola de aprobación

**Acceptance Criteria:**

Funcionalidad:
- [ ] Link de verificación válido por 24h
- [ ] Al hacer clic, el usuario queda verificado (independiente de `estado`, que sigue `pendiente_aprobacion`)

Error Handling:
- [ ] Link expirado: "Este link venció, solicita uno nuevo" con botón de reenvío
- [ ] Link ya usado: mensaje neutro, redirige a login

UX:
- [ ] Confirmación visual clara de "cuenta verificada, en espera de aprobación"

**Prioridad:** P1
**Estimación:** S
**Dependencias:** US-001

---

### US-003: Aprobar o rechazar cuenta de ejecutivo

**Como** superadmin (Cynthia)
**Quiero** revisar y aprobar o rechazar las cuentas de ejecutivos pendientes
**Para** evitar que cualquiera compre datos de personas

**Acceptance Criteria:**

Funcionalidad:
- [ ] Lista de ejecutivos `pendiente_aprobacion`, ordenada por fecha de registro
- [ ] Botones "Aprobar" y "Rechazar" con confirmación
- [ ] Al aprobar: `estado = 'activo'` + email de bienvenida
- [ ] Al rechazar: se pide motivo y se envía email explicando

Validaciones:
- [ ] No se puede aprobar una cuenta sin email verificado (US-002)

Error Handling:
- [ ] Si el email de notificación falla, la aprobación igual se aplica

UX:
- [ ] Vista compacta con datos clave (nombre, isapre, fecha) sin entrar a un detalle

**Prioridad:** P1
**Estimación:** S
**Dependencias:** US-001, US-002

---

### US-004: Suspender o reactivar cuenta de ejecutivo

**Como** superadmin
**Quiero** poder suspender la cuenta de un ejecutivo activo
**Para** bloquear a alguien que abusa del sistema sin borrar su historial

**Acceptance Criteria:**

Funcionalidad:
- [ ] "Suspender" cambia `estado` a `suspendido`; no puede iniciar sesión mientras esté así
- [ ] "Reactivar" vuelve a `activo`
- [ ] El historial de leads y créditos se conserva intacto

Error Handling:
- [ ] Un ejecutivo suspendido que intenta iniciar sesión ve: "Tu cuenta está suspendida. Contacta a soporte."

**Prioridad:** P1
**Estimación:** S
**Dependencias:** US-003

---

## Epic 2: Reparto Manual de Leads (Fase 0)

> Lo único que debe salir en ~2 días — sobre el sistema de roles y asignación que ya existe, sin tocar Postgres ni Mercado Pago.

### US-005: Ver cola de leads sin asignar

**Como** superadmin (Cynthia)
**Quiero** ver todos los leads que aún no tienen ejecutivo asignado
**Para** poder repartirlos a mano lo más rápido posible

**Acceptance Criteria:**

Funcionalidad:
- [ ] Lista de leads `assignment_status = 'sin_asignar'`, más antiguo primero
- [ ] Cada fila muestra: nombre, canal, fecha de ingreso, datos de contacto
- [ ] Selector rápido de ejecutivo activo junto a cada lead

Empty state:
- [ ] Sin leads pendientes: "Todos los leads están asignados 🎉"

UX:
- [ ] Usable en menos de 2 clics por lead — es la pantalla más usada del día (hallazgo del journey de Cynthia)

**Prioridad:** P0
**Estimación:** S
**Dependencias:** Ninguna
**Notas técnicas:** Sobre `lib/leads.ts` (Upstash KV) — no requiere la migración a Postgres.

---

### US-006: Asignar un lead a un ejecutivo con un clic

**Como** superadmin
**Quiero** asignar un lead eligiendo un ejecutivo de una lista
**Para** no tener que escribir el email a mano como hago hoy

**Acceptance Criteria:**

Funcionalidad:
- [ ] Selector muestra solo ejecutivos `estado = 'activo'`
- [ ] Al asignar: `assignment_status = 'asignado'` + descuento de 1 crédito + registro en el ledger mínimo (Epic 3)

Validaciones:
- [ ] Si el ejecutivo no tiene saldo: "Este ejecutivo no tiene créditos. ¿Asignar igual como regalo?"

Error Handling:
- [ ] Doble asignación casi simultánea: solo la primera acción tiene efecto; la segunda ve "Este lead ya fue asignado a [nombre]"

UX:
- [ ] El lead desaparece de la cola sin_asignar apenas se confirma

**Prioridad:** P0
**Estimación:** M
**Dependencias:** US-005
**Notas técnicas:** Usar una operación atómica tipo `kvMarcarUnaVez` sobre el ID del lead como lock simple — previene la doble asignación identificada en el journey de Cynthia, incluso en la versión manual.

---

### US-006b: Reasignar un lead recién asignado por error (Fase 0)

**Como** superadmin (Cynthia)
**Quiero** poder corregir una asignación equivocada eligiendo otro ejecutivo
**Para** no dejar un lead con la persona incorrecta durante días mientras se construye el motor completo

**Acceptance Criteria:**

Funcionalidad:
- [ ] Desde la ficha del lead recién asignado, opción "Reasignar" con selector de ejecutivo activo
- [ ] Devuelve 1 crédito al ejecutivo original y descuenta 1 del nuevo, con el mismo lock atómico de US-006
- [ ] Queda registrado en el ledger mínimo con motivo "corrección de asignación"

UX:
- [ ] Disponible sin límite de tiempo en la Fase 0 (no hay ventana de 48h como en el reembolso de lead inválido — esto es corregir un error operativo, no un reclamo)

**Prioridad:** P0
**Estimación:** S
**Dependencias:** US-006
**Notas técnicas:** Hallazgo de la Evaluación de Usabilidad (`docs/ux-design/usability-evaluation/reparto-manual-fase-0.md`) — Severidad 3, H3 (Control y libertad del usuario). Sin esto, la Fase 0 no tiene "salida de emergencia" ante un clic equivocado.

---

### US-007: Pausar "recibir leads"

**Como** ejecutivo interno (Cynthia o Ingrid)
**Quiero** pausar temporalmente si recibo leads nuevos
**Para** no recibir asignaciones cuando estoy con licencia o vacaciones

**Acceptance Criteria:**

Funcionalidad:
- [ ] Interruptor "recibir leads" en el perfil
- [ ] Un ejecutivo con el interruptor apagado no aparece en el selector de US-006

UX:
- [ ] Estado visible también para el superadmin en la lista de ejecutivos

**Prioridad:** P0
**Estimación:** S
**Dependencias:** Ninguna

---

### US-008: Ver mis leads asignados (regresión)

**Como** ejecutivo interno
**Quiero** ver solo los leads que me fueron asignados a mí
**Para** trabajarlos sin ver los de mi compañera

**Acceptance Criteria:**

Funcionalidad:
- [ ] Filtro por `asignado_a = mi email`, aplicado en el servidor
- [ ] Ya implementado — este story valida que no haya regresión al tocar el resto del sistema

Validaciones:
- [ ] Un ejecutivo que intenta ver un lead ajeno por URL directa recibe 403/404

**Prioridad:** P0
**Estimación:** S
**Dependencias:** Ninguna
**Notas técnicas:** Confirmar que el commit "Visibilidad de leads por asignación" sigue funcionando igual.

---

## Epic 3: Ledger de Créditos

### US-009: Regalar créditos con motivo (versión mínima, Fase 0)

**Como** superadmin
**Quiero** regalar créditos a un ejecutivo indicando un motivo
**Para** poder operar la Fase 0 sin pagos reales

**Acceptance Criteria:**

Funcionalidad:
- [ ] Formulario: ejecutivo, cantidad, motivo (obligatorio)
- [ ] Suma al saldo y queda registro con fecha, quién lo hizo y el motivo

Validaciones:
- [ ] Cantidad debe ser entero positivo
- [ ] Motivo vacío: "Escribe un motivo para este movimiento"

UX:
- [ ] Tras confirmar, mostrar el nuevo saldo y el registro recién creado

**Prioridad:** P0
**Estimación:** S
**Dependencias:** Ninguna
**Notas técnicas:** En Fase 0 puede vivir en Upstash KV; se migra 1:1 a `credit_transactions` en la Fase 1 (US-011).

---

### US-010: Ver saldo e historial de créditos de un ejecutivo

**Como** superadmin
**Quiero** ver el saldo actual y el historial de movimientos de cada ejecutivo
**Para** auditar el día y decidir a quién regalarle más créditos

**Acceptance Criteria:**

Funcionalidad:
- [ ] Saldo actual (recalculable desde el historial) + lista de movimientos (fecha, tipo, cantidad, motivo, quién)

Empty state:
- [ ] Sin movimientos: "Sin créditos registrados todavía"

UX:
- [ ] Auditar el día completo debe tomar menos de un minuto (hallazgo del journey de Cynthia)

**Prioridad:** P0
**Estimación:** S
**Dependencias:** US-009

---

### US-011: Ledger completo en Postgres

**Como** operador del sistema
**Quiero** que todo movimiento de crédito quede en una tabla append-only en Postgres
**Para** que el saldo siempre sea recalculable y auditable con garantías reales

**Acceptance Criteria:**

Funcionalidad:
- [ ] Tabla `credit_transactions` con los 5 tipos del Tech Spec (compra/regalo/consumo/reembolso/ajuste)
- [ ] Ninguna operación hace UPDATE ni DELETE sobre esta tabla
- [ ] Job de verificación compara `usuario.creditos_saldo` contra la suma del ledger

Error Handling:
- [ ] Discrepancia entre saldo cacheado y recalculado → se loguea como incidente crítico

**Prioridad:** P1
**Estimación:** M
**Dependencias:** US-046 (migración de datos)

---

### US-012: Consumir crédito al asignar un lead (transaccional)

**Como** sistema
**Quiero** descontar 1 crédito exactamente cuando se asigna un lead, en la misma transacción
**Para** que nunca exista un lead asignado sin crédito descontado ni viceversa

**Acceptance Criteria:**

Funcionalidad:
- [ ] Descuento y asignación ocurren en una sola transacción Postgres
- [ ] Cualquier falla → rollback completo, sin estado intermedio

Error Handling:
- [ ] Ejecutivo se queda sin saldo justo antes de confirmar (carrera con otra asignación) → falla limpiamente y el lead vuelve a la cola

**Prioridad:** P1
**Estimación:** M
**Dependencias:** US-011, Epic 4

---

## Epic 4: Motor de Reparto Automático

### US-013: Asignación automática ponderada por menor carga reciente

**Como** sistema
**Quiero** repartir cada lead nuevo entre ejecutivos activos con saldo, priorizando a quien ha recibido menos leads en 24h
**Para** que el reparto sea justo y no se produzcan rachas

**Acceptance Criteria:**

Funcionalidad:
- [ ] Candidatos: `activo`, `recibiendo_leads = true`, `creditos_saldo >= 1`, sin superar `daily_cap`
- [ ] Sorteo aleatorio dentro del grupo con menor conteo de leads en 24h
- [ ] Un lead asignado nunca se reasigna automáticamente

Error Handling:
- [ ] Sin candidatos → `assignment_status = 'sin_asignar'`, backlog (US-015)

**Prioridad:** P1
**Estimación:** L
**Dependencias:** US-011, US-012
**Notas técnicas:** `SELECT ... FOR UPDATE` sobre la fila del usuario candidato (Tech Spec 6.3; hallazgo del journey de Cynthia sobre doble asignación).

---

### US-014: Notificación inmediata al ejecutivo asignado

**Como** ejecutivo
**Quiero** recibir un aviso por email y WhatsApp apenas me asignan un lead
**Para** no perder la ventana de alta intención del prospecto

**Acceptance Criteria:**

Funcionalidad:
- [ ] Sale en el mismo flujo de la asignación, no en un cron diario
- [ ] Incluye nombre del prospecto, datos de cotización, y link directo a la ficha

Error Handling:
- [ ] Si falla el WhatsApp, el email igual se envía

**Prioridad:** P1
**Estimación:** M
**Dependencias:** US-013
**Notas técnicas:** Requisito no negociable — Pain Point #1 del journey de Rodrigo.

---

### US-015: Reintentar backlog de leads sin asignar

**Como** sistema
**Quiero** reintentar asignar los leads del backlog cuando un ejecutivo recarga créditos
**Para** no perder leads que quedaron sin asignar por falta de saldo

**Acceptance Criteria:**

Funcionalidad:
- [ ] Cron o hook post-acreditación revisa leads `sin_asignar` más recientes que `antiguedad_max_backlog_horas` (default 72h)
- [ ] Leads más antiguos quedan visibles para asignación manual, no se descartan

**Prioridad:** P1
**Estimación:** M
**Dependencias:** US-013

---

### US-016: Configuración global del motor de reparto

**Como** superadmin
**Quiero** prender/apagar el reparto automático y ajustar sus parámetros
**Para** controlar el sistema mientras se valida con el equipo interno

**Acceptance Criteria:**

Funcionalidad:
- [ ] Toggle reparto automático ON/OFF
- [ ] Configurar `antiguedad_max_backlog_horas`, `daily_cap_default`, `fuentes_repartidas`

Validaciones:
- [ ] `daily_cap_default` debe ser entero positivo o vacío

**Prioridad:** P1
**Estimación:** S
**Dependencias:** US-013

---

### US-017: Reasignación manual por el superadmin

**Como** superadmin
**Quiero** reasignar manualmente un lead ya asignado
**Para** corregir errores, devolviendo el crédito al ejecutivo original si corresponde

**Acceptance Criteria:**

Funcionalidad:
- [ ] Reasignar devuelve 1 crédito (`ajuste`) al ejecutivo original y descuenta del nuevo, en una transacción
- [ ] Queda registrado en el ledger con motivo

**Prioridad:** P1
**Estimación:** S
**Dependencias:** US-011, US-013

---

## Epic 5: Cotizador Público

### US-018: Ingresar datos básicos y ver 3 planes comparados

**Como** prospecto (ej. Marcela)
**Quiero** ver planes reales de isapre con precio en pesos sin dar mi RUT
**Para** saber si me conviene cambiarme antes de hablar con nadie

**Acceptance Criteria:**

Funcionalidad:
- [ ] Formulario pide solo: edad, renta bruta, región, cargas
- [ ] Muestra 3 planes comparados (Económica/Recomendada/Premium) con precio en pesos
- [ ] Recalcula al instante al cambiar cualquier dato, sin recargar

Validaciones:
- [ ] Edad entre 0-100; renta > 0

Error Handling:
- [ ] Catálogo no carga → estado de error con "reintentar", no pantalla en blanco

UX:
- [ ] Mobile-first, resultados visibles sin scroll excesivo

**Prioridad:** P1
**Estimación:** L
**Dependencias:** Ninguna (requiere catálogo poblado)
**Notas técnicas:** Motor en `lib/pricing.ts`; catálogo adelgazado para el cliente (Tech Spec 8.2) — no repetir el error de los 2,8 MB de tu7.cl.

---

### US-019: Filtrar por isapre, zona, tipo de plan y cobertura

**Como** prospecto
**Quiero** filtrar los planes por isapre, zona, tipo y cobertura
**Para** acotar las opciones a lo que realmente me interesa

**Acceptance Criteria:**

Funcionalidad:
- [ ] Cada filtro muestra un contador vivo de cuántos planes quedarían
- [ ] Los filtros combinan entre sí (AND)

Empty state:
- [ ] Sin resultados: "No hay planes con estos filtros. Prueba ajustando la cobertura o la zona."

**Prioridad:** P1
**Estimación:** M
**Dependencias:** US-018

---

### US-020: Ver desglose de cálculo por beneficiario

**Como** prospecto
**Quiero** entender por qué un plan cuesta lo que cuesta
**Para** confiar en que el precio no es arbitrario

**Acceptance Criteria:**

Funcionalidad:
- [ ] Modal con tabla: beneficiario, edad, factor, precio base, valor plan, +GES, total UF, total pesos
- [ ] Fórmula explicada en lenguaje simple

**Prioridad:** P1
**Estimación:** S
**Dependencias:** US-018

---

### US-021: Pedir contacto en momento de alto interés (LeadGate)

**Como** prospecto
**Quiero** poder pedir que un ejecutivo me contacte solo cuando yo decida avanzar
**Para** no sentirme presionada a dejar mis datos antes de ver algo de valor

**Acceptance Criteria:**

Funcionalidad:
- [ ] Aparece solo al hacer clic en "Enviar propuesta", "Descargar PDF" o "Hablar con asesor" — nunca antes
- [ ] Crea el `lead` enlazado a la `cotizacion`, con `gclid`/UTM si existen
- [ ] Incluye texto de consentimiento explícito y versionado (Ley 21.719)

Validaciones:
- [ ] Teléfono debe ser WhatsApp chileno válido (+56 9 XXXXXXXX)

**Prioridad:** P1
**Estimación:** M
**Dependencias:** US-018, US-043

---

### US-022: Recuperar cotización guardada

**Como** prospecto
**Quiero** volver a ver mi cotización más tarde sin rehacerla
**Para** revisarla con calma o mostrarla a mi familia

**Acceptance Criteria:**

Funcionalidad:
- [ ] `/mi-cotizacion` recupera la última cotización ingresando el WhatsApp usado
- [ ] Reutiliza el patrón visual ya validado en `nuevamas.netlify.app`

Error Handling:
- [ ] Sin cotización para ese número: "No encontramos una cotización para ese WhatsApp" + link para cotizar

**Prioridad:** P2
**Estimación:** S
**Dependencias:** US-018

---

### US-023: Página SEO indexable por isapre

**Como** visitante que busca en Google
**Quiero** encontrar información de planes de una isapre específica sin pasar por un anuncio
**Para** llegar por tráfico orgánico, no solo pagado

**Acceptance Criteria:**

Funcionalidad:
- [ ] `/planes/[isapre]` genera contenido indexable con datos estructurados y precio "desde"

**Prioridad:** P2
**Estimación:** M
**Dependencias:** US-018

---

## Epic 6: Cotizador del Ejecutivo

### US-024: Usar el cotizador desbloqueado en el panel

**Como** ejecutivo con cuenta activa
**Quiero** cotizar para cualquier cliente propio, no solo para leads comprados
**Para** no depender de pagar tu7.cl

**Acceptance Criteria:**

Funcionalidad:
- [ ] Mismo motor de `lib/pricing.ts`, sin límites de features, disponible para todo ejecutivo activo (compre créditos o no)
- [ ] Guarda la cotización asociada a `ejecutivo_id`

**Prioridad:** P1
**Estimación:** M
**Dependencias:** US-018, Epic 1

---

### US-025: Enviar cotización por WhatsApp o correo

**Como** ejecutivo
**Quiero** enviar la comparación de planes directamente por WhatsApp o correo
**Para** cerrar la conversación con el cliente sin salir de la app

**Acceptance Criteria:**

Funcionalidad:
- [ ] Botón de WhatsApp abre `wa.me` con mensaje precargado (plan + precio)
- [ ] Opción de enviar por correo vía Resend

**Prioridad:** P1
**Estimación:** S
**Dependencias:** US-024

---

### US-026: Generar PDF comparativo

**Como** ejecutivo
**Quiero** descargar un PDF con la comparación de planes
**Para** dejarle un documento formal al cliente

**Acceptance Criteria:**

Funcionalidad:
- [ ] PDF incluye fecha, valor UF del día, y disclaimer de valores referenciales

**Prioridad:** P2
**Estimación:** M
**Dependencias:** US-024

---

## Epic 7: Panel del Ejecutivo (`/panel`)

### US-027: Dashboard con saldo y resumen de leads

**Como** ejecutivo
**Quiero** ver mi saldo de créditos y mis leads del día/semana/mes de un vistazo
**Para** saber si necesito comprar más créditos

**Acceptance Criteria:**

Funcionalidad:
- [ ] Saldo actual, leads recibidos hoy/semana/mes, tasa de conversión por etapa
- [ ] Alerta visible cuando el saldo es ≤ 3 créditos, con CTA a comprar

**Prioridad:** P1
**Estimación:** M
**Dependencias:** US-011

---

### US-028: Ver mis leads con filtros y búsqueda

**Como** ejecutivo
**Quiero** ver y filtrar mis leads por etapa, calidad y canal
**Para** organizarme igual que en el panel actual

**Acceptance Criteria:**

Funcionalidad:
- [ ] Misma UX que el panel actual de leads, acotada a `asignado_a = mi id`

**Prioridad:** P1
**Estimación:** M
**Dependencias:** Epic 4

---

### US-029: Ficha completa del lead con cotización adjunta

**Como** ejecutivo
**Quiero** ver toda la información del prospecto incluida su cotización
**Para** no tener que preguntarle todo de nuevo

**Acceptance Criteria:**

Funcionalidad:
- [ ] Muestra edad, renta, región, cargas, isapre actual, clínica preferida, y planes vistos
- [ ] Botones de WhatsApp (mensaje precargado) y llamar
- [ ] Historial de notas, cambio de etapa y calidad

**Prioridad:** P1
**Estimación:** M
**Dependencias:** US-021, US-013

---

### US-030: Marcar calidad del lead (regresión)

**Como** ejecutivo
**Quiero** marcar si el lead es Calificado, Marginal o No calificado
**Para** que alimente el export de conversiones de Google Ads

**Acceptance Criteria:**

Funcionalidad:
- [ ] Selector visible en la ficha, con explicación breve de por qué importa marcarlo rápido
- [ ] Ya existe en el sistema actual — este story valida que no haya regresión

**Prioridad:** P0
**Estimación:** S
**Dependencias:** Ninguna

---

### US-031: Reportar lead inválido

**Como** ejecutivo
**Quiero** reportar un lead con datos falsos o duplicados
**Para** recuperar el crédito que gasté en él

**Acceptance Criteria:**

Funcionalidad:
- [ ] Botón "Reportar lead inválido" con motivo, visible en la ficha
- [ ] Ventana de reclamo de 48h desde la asignación
- [ ] Límite de reclamos por mes configurable (evita abuso)
- [ ] Superadmin aprueba/rechaza (US-036); si aprueba, devuelve 1 crédito y marca `invalidado`

Error Handling:
- [ ] Fuera de la ventana de 48h: "Ya pasó el plazo para reclamar este lead"

**Prioridad:** P1
**Estimación:** M
**Dependencias:** US-013

---

### US-032: Perfil del ejecutivo

**Como** ejecutivo
**Quiero** editar mis datos personales, de facturación y mi contraseña, y pausar "recibir leads"
**Para** mantener mi cuenta al día

**Acceptance Criteria:**

Funcionalidad:
- [ ] Edición de nombre, teléfono, datos tributarios (rut, razón social, giro, dirección)
- [ ] Cambio de contraseña con verificación de la actual
- [ ] Interruptor "recibir leads" (comparte lógica con US-007)

**Prioridad:** P1
**Estimación:** S
**Dependencias:** Ninguna

---

## Epic 8: Panel del Superadmin (extensión de `/admin`)

### US-033: Ver saldo y estado de todos los ejecutivos

**Como** superadmin
**Quiero** ver en una sola tabla el saldo, estado y leads asignados de cada ejecutivo
**Para** tomar decisiones rápido sin entrar a cada perfil

**Acceptance Criteria:**

Funcionalidad:
- [ ] Tabla con nombre, estado, saldo, leads recibidos hoy, `daily_cap`
- [ ] Acciones rápidas: aprobar, suspender, forzar pausa

**Prioridad:** P0 (versión mínima, equipo interno) / P1 (extendida a externos)
**Estimación:** M
**Dependencias:** US-009

---

### US-034: CRUD de packs de créditos

**Como** superadmin
**Quiero** crear y editar los packs de créditos disponibles
**Para** no tener precios hardcodeados en el código

**Acceptance Criteria:**

Funcionalidad:
- [ ] Formulario con nombre, créditos, precio CLP, activo/inactivo, orden, badge
- [ ] Toggle activo/inactivo sin borrar el pack (por historial de órdenes)

Validaciones:
- [ ] Precio > 0, créditos > 0

**Prioridad:** P1
**Estimación:** M
**Dependencias:** Ninguna

---

### US-035: Ver órdenes y pagos

**Como** superadmin
**Quiero** ver el listado de órdenes con estado, monto y `payment_id`
**Para** hacer seguimiento del dinero que entra

**Acceptance Criteria:**

Funcionalidad:
- [ ] Filtros por fecha y ejecutivo, total facturado del mes

**Prioridad:** P1
**Estimación:** M
**Dependencias:** Epic 9

---

### US-036: Cola de reembolsos — aprobar o rechazar

**Como** superadmin
**Quiero** revisar las solicitudes de reembolso de leads inválidos
**Para** decidir si se devuelve el crédito

**Acceptance Criteria:**

Funcionalidad:
- [ ] Lista de `reembolso_solicitud` pendientes con el motivo del ejecutivo
- [ ] Al aprobar, ejecuta la devolución de crédito en una transacción

**Prioridad:** P1
**Estimación:** S
**Dependencias:** US-031

---

### US-037: Métricas ampliadas del negocio

**Como** superadmin
**Quiero** ver ingresos por venta de créditos, créditos vendidos vs. consumidos vs. regalados, saldo total en circulación, y costo por lead vs. precio de venta
**Para** entender la salud financiera del marketplace

**Acceptance Criteria:**

Funcionalidad:
- [ ] Dashboard con las métricas listadas, además de lo que ya existe (leads/día, calificación, canal, etapa)
- [ ] Ranking de ejecutivos por tasa de cierre

**Prioridad:** P1
**Estimación:** L
**Dependencias:** US-011, US-035

---

## Epic 9: Compra de Créditos con Mercado Pago

### US-038: Ver packs disponibles y comprar

**Como** ejecutivo
**Quiero** ver los packs de créditos disponibles y elegir uno para comprar
**Para** recargar mi saldo

**Acceptance Criteria:**

Funcionalidad:
- [ ] Lista de packs activos con badge "más vendido" si corresponde
- [ ] Al elegir, se crea una `orden` en `pending` y una preferencia de pago

**Prioridad:** P1
**Estimación:** M
**Dependencias:** US-034

---

### US-039: Checkout con Mercado Pago

**Como** ejecutivo
**Quiero** pagar con Mercado Pago y ver el estado de mi compra
**Para** saber si mi compra fue exitosa sin dudas

**Acceptance Criteria:**

Funcionalidad:
- [ ] Redirige a Checkout Pro con `external_reference` = id de la orden
- [ ] `back_urls` a páginas de éxito/pendiente/error — **ninguna acredita créditos directamente**
- [ ] La orden muestra su estado real ("procesando" → "acreditado") reflejando el webhook

Error Handling:
- [ ] Usuario cierra la pestaña antes de volver → la orden sigue `pending`, se resuelve solo por el webhook

**Prioridad:** P1
**Estimación:** L
**Dependencias:** US-038
**Notas técnicas:** Verificar el shape exacto de la API de Mercado Pago contra la documentación oficial vigente antes de implementar.

---

### US-040: Webhook de Mercado Pago — acreditar créditos

**Como** sistema
**Quiero** acreditar créditos solo cuando el webhook confirma un pago aprobado, verificado y no duplicado
**Para** que el ingreso nunca se pierda ni se acredite dos veces

**Acceptance Criteria:**

Funcionalidad:
- [ ] Valida la firma `x-signature` con el secret del webhook antes de procesar
- [ ] Consulta el pago vía API de Mercado Pago con el `payment_id` recibido — nunca confía en el body
- [ ] Solo si `status === 'approved'` acredita (tipo `compra`), idempotente por `mp_payment_id` único
- [ ] Todo evento recibido se guarda en `payment_events`, procesado o no
- [ ] Responde 200 rápido; procesa en background si hace falta

Error Handling:
- [ ] Firma inválida → 401, sin procesar
- [ ] Pago duplicado → no acredita de nuevo, responde 200 igual

**Prioridad:** P1
**Estimación:** L
**Dependencias:** US-039, US-011

---

### US-041: Manejar reembolsos y contracargos de Mercado Pago

**Como** sistema
**Quiero** descontar créditos no usados y alertar al superadmin ante un `refunded`/`charged_back`
**Para** no quedar expuesto a fraude de pagos

**Acceptance Criteria:**

Funcionalidad:
- [ ] Descuenta los créditos no consumidos de esa orden
- [ ] Si el saldo queda negativo, suspende la cuenta y alerta al superadmin

**Prioridad:** P1
**Estimación:** M
**Dependencias:** US-040

---

### US-042: Historial de compras del ejecutivo

**Como** ejecutivo
**Quiero** ver mi historial de compras de créditos
**Para** llevar mi propio control de gasto

**Acceptance Criteria:**

Funcionalidad:
- [ ] Lista de órdenes propias: fecha, pack, monto, estado, medio de pago

**Prioridad:** P1
**Estimación:** S
**Dependencias:** US-038

---

### US-048: Verificar estado de mi orden manualmente

**Como** ejecutivo
**Quiero** poder verificar manualmente el estado de una compra que quedó "procesando"
**Para** no quedar esperando indefinidamente si el webhook de Mercado Pago se demora o falla

**Acceptance Criteria:**

Funcionalidad:
- [ ] Botón "Verificar estado" visible en toda orden `pending` de `/panel/creditos`
- [ ] Al presionarlo, consulta la API de Mercado Pago con el `payment_id` de la orden y actualiza el estado si corresponde
- [ ] Si Mercado Pago confirma `approved` y aún no se había acreditado, se acredita en ese momento (mismo camino idempotente del webhook, US-040)

Error Handling:
- [ ] Si Mercado Pago sigue sin resolver el pago, mostrar: "Tu pago sigue procesándose. Intenta de nuevo en unos minutos o contáctanos."

**Prioridad:** P1
**Estimación:** S
**Dependencias:** US-039, US-040
**Notas técnicas:** Hallazgo de la Evaluación de Usabilidad (`docs/ux-design/usability-evaluation/compra-creditos-mercado-pago.md`) — Severidad 3, H3. Reutiliza la misma lógica de acreditación idempotente de US-040, nunca acredita por fuera de ese camino.

---

## Epic 10: Cumplimiento Ley 21.719

### US-043: Consentimiento explícito y versionado en el cotizador público

**Como** prospecto
**Quiero** saber exactamente para qué se usarán mis datos antes de dejarlos
**Para** decidir con información si quiero avanzar

**Acceptance Criteria:**

Funcionalidad:
- [ ] Texto de consentimiento visible en el LeadGate, con link a política de privacidad
- [ ] Se guarda el texto exacto, su versión, y el timestamp junto al lead

**Prioridad:** P1
**Estimación:** S
**Dependencias:** US-021

---

### US-044: Cláusula de tratamiento de datos al registrar un ejecutivo

**Como** ejecutivo que se registra
**Quiero** saber las condiciones de uso de los datos de los leads que recibo
**Para** entender mis obligaciones (uso exclusivo, prohibición de reventa)

**Acceptance Criteria:**

Funcionalidad:
- [ ] Checkbox obligatorio de aceptación de términos en `/registro`, con texto legal versionado

**Prioridad:** P1
**Estimación:** S
**Dependencias:** US-001

---

### US-045: Registro de accesos a datos de leads

**Como** sistema
**Quiero** registrar quién vio qué lead y cuándo
**Para** poder responder auditorías o solicitudes de acceso del titular

**Acceptance Criteria:**

Funcionalidad:
- [ ] Cada vista de la ficha de un lead registra un evento en `acceso_log`
- [ ] Endpoint interno (solo superadmin) para consultar el historial de accesos de un lead

**Prioridad:** P1
**Estimación:** M
**Dependencias:** US-029

---

## Stories No-Funcionales

### US-046: Migrar usuarios y leads de Upstash KV a Postgres

**Como** equipo de desarrollo
**Quiero** migrar los 245 leads y los usuarios existentes a Postgres sin pérdida
**Para** poder construir el ledger y el motor automático sobre una base confiable

**Acceptance Criteria:**

Funcionalidad:
- [ ] Script exporta primero un dump completo de KV a JSON (respaldo)
- [ ] Inserta en Postgres validando conteo de registros antes/después
- [ ] Script reversible — puede deshacer la migración si algo falla en preview

Error Handling:
- [ ] Conteo no coincide → el script se detiene, no continúa a producción

**Prioridad:** P1
**Estimación:** L
**Dependencias:** Tech Spec sección 4.4

---

### US-047: Validar que el export de conversiones de Google Ads sigue funcionando igual

**Como** equipo de desarrollo
**Quiero** confirmar que el CSV de conversiones no cambia de formato ni contenido tras la migración
**Para** no romper la campaña activa

**Acceptance Criteria:**

Funcionalidad:
- [ ] Comparación automatizada del CSV generado antes y después de la migración, sobre el mismo set de leads
- [ ] Test E2E de este export es criterio de aceptación obligatorio antes de mergear a producción

**Prioridad:** P0
**Estimación:** S
**Dependencias:** US-046

---

## Resumen de Dependencias

```
US-046 (Migración) → US-047 (Validar export) [P0, bloquea cualquier merge a producción]
US-046 → US-011 (Ledger completo) → US-012 (Consumo transaccional) → US-013 (Reparto automático)
                                                                    → US-014 (Notificación)
                                                                    → US-015 (Backlog)
US-001 (Registro) → US-002 (Verificación) → US-003 (Aprobación) → US-004 (Suspensión)
US-018 (Cotizador público) → US-019 (Filtros) → US-020 (Desglose) → US-021 (LeadGate) → US-043 (Consentimiento)
US-021 → US-013 → US-029 (Ficha del lead) → US-030 (Calidad) / US-031 (Reembolso) → US-036 (Cola de reembolsos)
US-034 (Packs) → US-038 (Ver y comprar) → US-039 (Checkout MP) → US-040 (Webhook) → US-041 (Contracargos)
US-005 (Cola sin_asignar) → US-006 (Asignar 1 clic) → US-009 (Regalar créditos) → US-010 (Ver historial)
```

## Stories Diferidos (Post-MVP)

| Story | Epic | Razón de Diferimiento | Fase Tentativa |
|-------|------|------------------------|------------------|
| US-022 (Recuperar cotización) | Cotizador Público | Mejora de experiencia, no bloquea el comparador base | Fase posterior al lanzamiento del cotizador |
| US-023 (Páginas SEO por isapre) | Cotizador Público | Requiere contenido y estrategia SEO, no solo código | Fase 5 del roadmap del cotizador (Tech Spec) |
| US-026 (PDF comparativo) | Cotizador del Ejecutivo | Ya marcado como "opcional, fase posterior" en el PDR original | Post-lanzamiento del cotizador de ejecutivo |

---

*User Stories generados con el pipeline de SaaS La Herrería*
*Pendiente aprobación antes de avanzar al siguiente skill*

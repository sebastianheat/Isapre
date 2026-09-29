# Marketplace de Leads + Cotizador nuevaisapre.cl — Master Blueprint

> **Versión:** 1.0
> **Fecha:** 2026-09-08
> **Timeline Total:** ~2 días (Fase 1) + ~8.5 semanas (Fases 2-8) ≈ 9 semanas
> **Equipo:** Sebastián (desarrollo/producto) + Claude Code, con Cynthia e Ingrid como usuarias/validadoras de la Fase 1
> **Estado:** BORRADOR
>
> **Documentos Fuente** (todos en la raíz del proyecto o en `docs/`, este Blueprint los organiza y secuencia, no los repite palabra por palabra — cada fase abajo referencia el ID exacto a abrir):
> - Viability: `VIABILITY-marketplace-leads.md`
> - BMC/VPC: `BMC-marketplace-leads.md`, `VPC-marketplace-leads.md`
> - PDR: `PDR-marketplace-leads.md`
> - Tech Spec: `TECH-SPEC-marketplace-leads.md`
> - User Stories: `USER-STORIES-marketplace-leads.md` (49 stories)
> - UX Research: `docs/ux-research/` (personas, modelos mentales, journeys)
> - UX Design: `docs/ux-design/` (IA, interaction patterns, onboarding, usability evaluation)
> - UI Design Workflow: `docs/ui-design/screen-flows/` (5 flows) + `docs/ui-design/components/`
> - UI Implementation: `DESIGN.md` (portable) + `docs/ui-design/UI-marketplace-leads.md`
> - Pre-Mortem: `PRE-MORTEM-marketplace-leads.md`
> - Security Audit: `SECURITY-AUDIT-marketplace-leads.md`
>
> **Nota de método:** este Blueprint referencia el ID de cada User Story y Screen Flow en vez de repetir su contenido completo — ambos documentos ya viven en este mismo repo, a una carpeta de distancia. Repetirlos íntegros aquí duplicaría ~50 stories completos sin agregar valor. Cada fase sí incluye las tareas técnicas concretas, los archivos a tocar y los criterios de aceptación de la fase.

---

## ⚠️ Antes de la Fase 1 — Ya pendiente, fuera de este cronograma

Del Security Audit (`SECURITY-AUDIT-marketplace-leads.md`, SEC-1): verificar HOY en Vercel que `ADMIN_SEED_PASSWORD` no sea `123456` y que `ADMIN_SEED_FORCE` no siga activo. El usuario ya confirmó que lo resuelve en paralelo — no bloquea el inicio de la Fase 1.

---

## Visión del Producto

nuevaisapre.cl convierte su excedente de leads de Google Ads en un marketplace: ejecutivos de isapre (internos y externos) compran créditos prepago para recibir leads exclusivos y calificados, y usan gratis un cotizador propio (motor de cálculo + catálogo de las 7 isapres) que reemplaza la necesidad de pagar la suscripción de tu7.cl. El diferenciador central: **cotizador gratis + pago solo por lead recibido**, contra el modelo de tu7.cl de suscripción fija sin garantía de leads. (Detalle completo: `PDR-marketplace-leads.md`.)

---

## Stack Técnico (Referencia Rápida)

| Capa | Tecnología | Versión | Para qué |
|------|-----------|---------|----------|
| Framework | Next.js | 15.5.25 | App Router, ya en producción |
| Lenguaje | TypeScript | ^5.7.0, strict | Type safety |
| Estilos (superficies nuevas) | Tailwind CSS | 3.4, `preflight: false` | No rompe `admin.css` existente |
| Componentes | shadcn/ui (customizado) | — | `components/ui/` |
| State (solo cotizador) | Zustand | ^5 | `lib/cotizador-store.ts` |
| Validación | Zod | por instalar | Todo endpoint nuevo con dinero/PII |
| Backend | Route Handlers + Server Actions | — | Sin API separada |
| Base de datos | Postgres vía Supabase | — | Reemplaza Upstash KV para leads/usuarios/créditos |
| Auth | Custom (`jose` + `bcryptjs`) | ya existe | Sin reescribir, se extiende |
| Pagos | Mercado Pago Checkout Pro | API vigente — verificar docs oficiales al implementar | Chile/CLP |
| Email | Resend | ^4.0.1, ya integrado | — |
| AI | Anthropic SDK directo (Romina) | ya integrado | — |
| Hosting | Vercel | ya en uso | Preview obligatorio antes de producción |
| Testing | Vitest + Playwright | Vitest ya instalado | `lib/pricing.test.ts` ya en verde |

Detalle completo, decisiones y trade-offs: `TECH-SPEC-marketplace-leads.md`.

### Servicios Externos y Variables de Entorno Nuevas

| Variable | Para qué | Dónde configurar |
|----------|----------|-------------------|
| `DATABASE_URL` | Conexión Postgres (Supabase) | Vercel + `.env.local` |
| `MP_ACCESS_TOKEN` | Mercado Pago, server-only | Vercel (secreto) |
| `MP_WEBHOOK_SECRET` | Validar `x-signature` del webhook | Vercel (secreto) |
| `MP_MODE` | `test` \| `live` | Vercel + `.env.local` |
| `META_APP_SECRET` | Verificar firma de webhooks de Meta/WhatsApp (SEC-2) | Vercel (secreto) |
| `CRON_SECRET` | Ya existía pero no documentada (SEC-6) — agregar a `.env.example` | Vercel |

### Estructura de Carpetas (ya iniciada, ver Tech Spec 3.2)

```
app/
├── cotizador/          # ✅ layout + page ya implementados (pantalla insignia)
├── planes/[isapre]/    # Fase 8 (P2)
├── registro/           # Fase 6
├── panel/              # Fase 5
├── admin/              # Ya existe — se extiende en Fases 1, 3, 6
└── api/
    ├── cotizaciones/route.ts       # Fase 4
    ├── mercadopago/                # Fase 7
    └── cron/reparto-backlog/route.ts  # Fase 3

lib/
├── pricing.ts          # ✅ implementado + testeado (7 tests en verde)
├── cotizador-store.ts  # ✅ implementado
├── db/                 # Fase 2
├── credits.ts          # Fase 3
├── assignment.ts       # Fase 3
└── mercadopago.ts      # Fase 7

components/
├── ui/                 # ✅ Button, Badge implementados
├── cotizador/          # ✅ implementados (Shell, PlanCard, BarraCobertura, PrecioContador, DesgloseModal, FiltrosCotizador, LeadGateModal)
└── panel/              # Fase 5
```

---

## Database Schema

Schema SQL completo (11 tablas, índices, y el patrón de RLS con `SET LOCAL` sin Supabase Auth) ya está en `TECH-SPEC-marketplace-leads.md`, sección 4.2 — copy-paste-ready desde ahí. Se aplica en la Fase 2.

---

## Design System

Ya generado y aplicado a la pantalla insignia. Ver `DESIGN.md` (portable, root del proyecto) para el detalle completo: paleta Azul Cotización (#0F3D68) + Dorado UF (#C9973B), tipografía Fraunces + Public Sans, y el patrón de motion (conteo animado de precios). Se reutiliza tal cual en todas las fases siguientes — no se vuelve a definir.

---

## Resumen de Fases

| # | Fase | Duración | Stories | Pantallas nuevas | Entregable |
|---|------|----------|---------|-------------------|------------|
| 1 | Reparto Manual Interno | 2 días | 9 (P0) | 0 (extiende `/admin`) | Cynthia/Ingrid reparten leads con créditos regalados, sobre KV |
| 2 | Foundation: Postgres + Seguridad | 1.5 semanas | 2 (no-funcionales) + 7 fixes de seguridad | 0 | BD migrada, tests de aislamiento en verde, vulnerabilidades altas cerradas |
| 3 | Ledger + Motor de Reparto Automático | 1 semana | 5 | 0 | Leads se reparten solos, transaccional, con créditos reales |
| 4 | Cotizador Público (completo) | 2 semanas | 6 | 1 (ya con pantalla insignia parcial) | `/cotizador` con catálogo real conectado a Postgres |
| 5 | Panel del Ejecutivo + Cotizador Ejecutivo | 1.5 semanas | 9 | 1 (`/panel`, 5 sub-vistas) | `/panel` funcionando completo |
| 6 | Registro Externo + Admin Completo | 1 semana | 9 | 1 (`/registro`) + extensión `/admin` | Ejecutivos externos se registran y son aprobados |
| 7 | Compra de Créditos con Mercado Pago | 1 semana | 5 | 0 (dentro de `/panel/creditos`) | Checkout real funcionando, primero en modo test |
| 8 | Quality & Launch Polish | 1 semana | 3 (P2) + observabilidad | 0-2 (SEO, PDF) | Producto listo para abrir a ejecutivos externos reales |

**Total:** 49 stories cubiertas (ver Apéndice A) + 7 fixes de seguridad del Security Audit.

---

## FASE 1: Reparto Manual Interno

> **Duración:** 2 días
> **Depende de:** Nada (arranca sobre el sistema actual)
> **Entregable:** Cynthia e Ingrid reciben créditos regalados y reparten leads a mano desde `/admin/reparto` y `/admin/creditos`, sin tocar Postgres ni Mercado Pago.
> **Asignación:** Sebastián + Claude Code

### User Stories de Esta Fase

| ID | Título | Prioridad |
|----|--------|-----------|
| US-005 | Ver cola de leads sin asignar | P0 |
| US-006 | Asignar un lead a un ejecutivo con un clic | P0 |
| US-006b | Reasignar un lead recién asignado por error | P0 |
| US-007 | Pausar "recibir leads" | P0 |
| US-008 | Ver mis leads asignados (regresión) | P0 |
| US-009 | Regalar créditos con motivo (versión mínima) | P0 |
| US-010 | Ver saldo e historial de créditos de un ejecutivo | P0 |
| US-030 | Marcar calidad del lead (regresión) | P0 |
| US-047 | Validar que el export de Google Ads sigue funcionando igual | P0 |

Texto completo y acceptance criteria: `USER-STORIES-marketplace-leads.md`, Epic 2 y Epic 3 (parcial).

### Screen Flow de Esta Fase

`docs/ui-design/screen-flows/reparto-manual-fase-0.md` — completo, incluye el fix de reasignación (US-006b) de la evaluación de usabilidad. Sin componentes de Design System nuevos (se queda en el CSS actual de `/admin`, por decisión del Tech Spec).

### Subfases y Tareas

**1.1 — Extensión de `/admin` con la sección "Reparto"**
- [ ] **T-1.1.1** Crear `app/admin/reparto/page.tsx` — cola de leads `sin_asignar`, ordenada por antigüedad
- [ ] **T-1.1.2** Agregar campo `asignadoA` + estado `assignmentStatus` (`sin_asignar`/`asignado`) al modelo `Lead` en `lib/leads.ts` (aún sobre KV)
- [ ] **T-1.1.3** Implementar `asignarLead(leadId, ejecutivoEmail)` en `lib/leads.ts` usando `kvMarcarUnaVez` como lock simple contra doble asignación
- [ ] **T-1.1.4** Agregar botón "Reasignar" en `app/admin/leads/[id]/page.tsx` (ya existente) — implementa US-006b

**1.2 — Extensión de `/admin` con la sección "Créditos" (mínima)**
- [ ] **T-1.2.1** Crear `app/admin/creditos/page.tsx` — formulario de regalo de créditos + tabla de saldos
- [ ] **T-1.2.2** Crear `lib/credits-kv.ts` (versión mínima, sobre KV) — `regalarCreditos()`, `obtenerSaldo()`, `listarMovimientos()`
- [ ] **T-1.2.3** Crear `app/admin/creditos/[email]/page.tsx` — historial de movimientos de un ejecutivo

**1.3 — Interruptor "Recibir leads" y regresión de calidad**
- [ ] **T-1.3.1** Agregar campo `recibiendoLeads: boolean` a `Usuario` en `lib/usuarios.ts` + toggle en `app/admin/usuarios/page.tsx`
- [ ] **T-1.3.2** Verificar (sin cambios de código esperados) que el selector de "calidad" del lead sigue funcionando igual tras los cambios de esta fase — correr el flujo manual una vez

**1.4 — Validación crítica del export**
- [ ] **T-1.4.1** Correr el export de conversiones offline antes y después de los cambios de esta fase, comparar el CSV byte a byte sobre el mismo set de leads
- [ ] **T-1.4.2** Confirmar en preview que el cron semanal (`app/api/cron/export-semanal/route.ts`) no cambió de comportamiento

### Criterios de Aceptación de la Fase

- [ ] Cynthia puede asignar un lead a Ingrid (o a sí misma) en 2 clics desde `/admin/reparto`
- [ ] Un lead recién asignado se puede reasignar sin perder el crédito del ejecutivo original
- [ ] El saldo de créditos de cada ejecutivo es visible y auditable en menos de un minuto
- [ ] El CSV de export de conversiones es idéntico antes/después, verificado en preview
- [ ] Cero regresiones en `/admin/leads` (calidad, etapa, notas siguen funcionando)

### Notas Técnicas

- Todo sobre Upstash KV — **no** se toca Postgres en esta fase (Tech Spec, Fase 0 explícitamente sin migración).
- El lock de `kvMarcarUnaVez` es temporal — se reemplaza por `SELECT ... FOR UPDATE` en la Fase 3 cuando exista Postgres.

---

## FASE 2: Foundation — Migración a Postgres + Seguridad

> **Duración:** 1.5 semanas
> **Depende de:** Fase 1 completada y validada en producción
> **Entregable:** Base de datos Postgres con el schema completo, los 245 leads y usuarios migrados sin pérdida, y los hallazgos Altos del Security Audit resueltos.
> **Asignación:** Sebastián + Claude Code

### User Stories de Esta Fase

| ID | Título | Prioridad |
|----|--------|-----------|
| US-046 | Migrar usuarios y leads de Upstash KV a Postgres | P1 |
| US-047 | (repetido aquí como criterio de cierre de la migración, ya validado en Fase 1) | P0 |

Más las tareas de seguridad del `SECURITY-AUDIT-marketplace-leads.md` marcadas "Antes de construir el Blueprint" — se ejecutan aquí porque tocan el mismo código de auth/datos que se está migrando.

### Subfases y Tareas

**2.1 — Setup de Supabase (solo Postgres, sin Auth)**
- [ ] **T-2.1.1** Crear proyecto Supabase, guardar `DATABASE_URL` en Vercel y `.env.local`
- [ ] **T-2.1.2** Crear `lib/db/client.ts` — pool de conexión + helper de transacción con `SET LOCAL` (Tech Spec 6.3)
- [ ] **T-2.1.3** Crear `lib/db/schema.sql` con las 11 tablas del Tech Spec 4.2 (usuario, isapre, zona, tipo_plan, prestador, plan, plan_cobertura, factor_etario, uf_diaria, cotizacion, lead, credit_pack, orden, credit_transactions, payment_events, reembolso_solicitud, reparto_config, acceso_log)
- [ ] **T-2.1.4** Aplicar RLS con el patrón `current_setting('app.current_user_id')` sobre `lead`, `credit_transactions`, `orden`

**2.2 — Migración de datos**
- [ ] **T-2.2.1** Escribir script de export de KV a JSON (respaldo) — `scripts/migrar-kv-a-postgres.mjs`
- [ ] **T-2.2.2** Escribir el insert a Postgres + conteo de validación antes/después
- [ ] **T-2.2.3** Hacer el script reversible (rollback a KV si el conteo no coincide)
- [ ] **T-2.2.4** Correr en preview, validar conteo = 245 leads + usuarios existentes
- [ ] **T-2.2.5** Repetir US-047 (export de conversiones) contra los datos ya migrados

**2.3 — Seguridad (hallazgos Altos del Security Audit)**
- [ ] **T-2.3.1** SEC-5: agregar rate limiting a `app/api/admin/login/route.ts` (5 intentos / 15 min por IP)
- [ ] **T-2.3.2** SEC-2: verificar firma `X-Hub-Signature-256` en `app/api/whatsapp/route.ts` y `app/api/meta-leads/route.ts`
- [ ] **T-2.3.3** SEC-4: rate limiting + límite de tamaño de historial en `app/api/chat/route.ts`
- [ ] **T-2.3.4** SEC-3: eliminar el fallback hardcodeado `"nuevaisapre-meta-2026"` en `app/api/meta-leads/route.ts`
- [ ] **T-2.3.5** SEC-6: cambiar los cron endpoints a fail-closed si `CRON_SECRET` no está configurado + documentarla en `.env.example`
- [ ] **T-2.3.6** SEC-7: agregar headers de seguridad a `next.config.mjs` (template en `security-checklist.md`)

### Criterios de Aceptación de la Fase

- [ ] `SELECT count(*) FROM lead` en Postgres = conteo de leads en KV antes de migrar
- [ ] Tests E2E de aislamiento (ejecutivo A no ve leads de ejecutivo B) pasan contra Postgres + RLS
- [ ] Los 6 hallazgos de seguridad de esta fase están en estado ✅ Resuelto en `SECURITY-AUDIT-marketplace-leads.md`
- [ ] El export de conversiones sigue siendo idéntico tras la migración

### Notas Técnicas

- El patrón `SET LOCAL` **solo** funciona dentro de una transacción explícita (`sql.begin()`) — nunca en queries sueltas fuera de una transacción cuando dependan de RLS (Tech Spec, gotcha de la sección 13).
- No apagar Upstash KV hasta confirmar el conteo y el export funcionando igual en preview, con aprobación explícita antes de tocar producción (regla no negociable del alcance original).

---

## FASE 3: Ledger de Créditos + Motor de Reparto Automático

> **Duración:** 1 semana
> **Depende de:** Fase 2 (Postgres funcionando)
> **Entregable:** Un lead nuevo se asigna solo, transaccionalmente, a un ejecutivo con saldo — sin intervención manual de Cynthia.
> **Asignación:** Sebastián + Claude Code

### User Stories de Esta Fase

| ID | Título | Prioridad |
|----|--------|-----------|
| US-011 | Ledger completo en Postgres | P1 |
| US-012 | Consumir crédito al asignar un lead (transaccional) | P1 |
| US-013 | Asignación automática ponderada por menor carga reciente | P1 |
| US-014 | Notificación inmediata al ejecutivo asignado | P1 |
| US-015 | Reintentar backlog de leads sin asignar | P1 |
| US-016 | Configuración global del motor de reparto | P1 |
| US-017 | Reasignación manual por el superadmin | P1 |

Detalle completo: `USER-STORIES-marketplace-leads.md`, Epic 3 (resto) y Epic 4 completo.

### Subfases y Tareas

**3.1 — Ledger**
- [ ] **T-3.1.1** Implementar `lib/credits.ts`: `registrarMovimiento()`, `recalcularSaldo()`, job de verificación periódica saldo cacheado vs. ledger
- [ ] **T-3.1.2** Migrar los movimientos ya creados en la Fase 1 (KV) a `credit_transactions`

**3.2 — Motor de reparto**
- [ ] **T-3.2.1** Implementar `lib/assignment.ts`: `assignLead(leadId)` con `SELECT ... FOR UPDATE` sobre candidatos (Tech Spec 6.3)
- [ ] **T-3.2.2** Implementar el sorteo ponderado por menor conteo de leads en 24h
- [ ] **T-3.2.3** Implementar `lib/notify.ts`: notificación email (Resend) + WhatsApp en el mismo flujo de la asignación
- [ ] **T-3.2.4** Crear `app/api/cron/reparto-backlog/route.ts` — reintenta leads `sin_asignar` dentro de `antiguedad_max_backlog_horas`
- [ ] **T-3.2.5** Crear `app/admin/reparto/config/page.tsx` — toggle ON/OFF, parámetros globales
- [ ] **T-3.2.6** Extender `app/admin/leads/[id]/page.tsx` con reasignación transaccional completa (reemplaza la versión KV de US-006b)

### Criterios de Aceptación de la Fase

- [ ] Dos leads creados simultáneamente con un ejecutivo con 1 crédito de saldo → solo uno se asigna, el otro queda `sin_asignar` (test de concurrencia)
- [ ] La notificación (email + WhatsApp) sale en el mismo request que la asignación, no en un cron posterior
- [ ] Apagar el reparto automático desde `/admin/reparto/config` detiene nuevas asignaciones automáticas de inmediato

### Notas Técnicas

- Este es el componente de mayor riesgo técnico del proyecto según el Pre-Mortem (R-03, R-04 relacionados) — cobertura de tests de concurrencia no es opcional.

---

## FASE 4: Cotizador Público (completo)

> **Duración:** 2 semanas
> **Depende de:** Fase 2 (Postgres con catálogo)
> **Entregable:** `/cotizador` funcionando con el catálogo real de las 7 isapres (ya confirmado completo por el usuario), conectado a Postgres, con `LeadGate` creando leads reales.
> **Asignación:** Sebastián + Claude Code

### User Stories de Esta Fase

| ID | Título | Prioridad |
|----|--------|-----------|
| US-018 | Ingresar datos básicos y ver 3 planes comparados | P1 |
| US-019 | Filtrar por isapre, zona, tipo de plan y cobertura | P1 |
| US-020 | Ver desglose de cálculo por beneficiario | P1 |
| US-021 | Pedir contacto en momento de alto interés (LeadGate) | P1 |
| US-043 | Consentimiento explícito y versionado | P1 |
| US-045 | Registro de accesos a datos de leads | P1 |

### Ya Implementado (Skill #8 — pantalla insignia)

✅ `app/cotizador/layout.tsx`, `app/cotizador/page.tsx`, `components/cotizador/*` (Shell, PlanCard, BarraCobertura, PrecioContador, DesgloseModal, FiltrosCotizador, LeadGateModal), `lib/pricing.ts` (7 tests en verde), `lib/cotizador-store.ts` — **todo sobre datos de muestra** (`lib/cotizador-mock-data.ts`). Ver `docs/ui-design/UI-marketplace-leads.md` para el detalle de lo ya construido y verificado en navegador.

### Screen Flow de Esta Fase

`docs/ui-design/screen-flows/cotizador-publico.md` — ya incluye los 2 fixes de la evaluación de usabilidad (label "GES" en lenguaje simple, drawer de filtros mobile), ambos ya implementados en el código existente.

### Subfases y Tareas

**4.1 — Cargar el catálogo real**
- [ ] **T-4.1.1** Migrar `lib/catalogos.json` (2.182 PDFs / catálogo verificado ya existente) al schema de `plan`/`plan_cobertura`/`isapre`/`prestador` de Postgres — reutilizar `scripts/validar-catalogo.mjs` ya existente como base de validación
- [ ] **T-4.1.2** Poblar `factor_etario` con la tabla vigente (ya verificada en `lib/pricing.test.ts`)
- [ ] **T-4.1.3** Crear `app/api/catalogo/route.ts` — GET del catálogo adelgazado (Tech Spec 8.2: solo campos necesarios para la lista)
- [ ] **T-4.1.4** Reemplazar `lib/cotizador-mock-data.ts` por el fetch real en `CotizadorShell`

**4.2 — Conectar el LeadGate a datos reales**
- [ ] **T-4.2.1** Crear `app/api/cotizaciones/route.ts` — POST que guarda `cotizacion` + crea `lead` si hay `crearLead` en el body (Tech Spec 5.2)
- [ ] **T-4.2.2** Conectar `LeadGateModal` a este endpoint real (hoy solo simula en el cliente)
- [ ] **T-4.2.3** Implementar consentimiento versionado (US-043): guardar texto+versión+timestamp en `lead`
- [ ] **T-4.2.4** Implementar `acceso_log` (US-045) — se dispara desde la ficha del lead (Fase 5), pero la tabla y el helper se crean acá

**4.3 — Rendimiento**
- [ ] **T-4.3.1** Verificar que el catálogo adelgazado no repite el error de los 2,8MB de tu7.cl (Tech Spec 8.2) — medir tamaño real del payload

### Criterios de Aceptación de la Fase

- [ ] El cotizador muestra planes reales de las 7 isapres, no datos de muestra
- [ ] Enviar el LeadGate crea un `lead` real en Postgres, enlazado a su `cotizacion`
- [ ] El payload del catálogo al cliente es significativamente menor a 2,8MB (medir y documentar el número real)

### Notas Técnicas

- El motor de cálculo (`lib/pricing.ts`) y el componente de UI ya están construidos y probados — esta fase es principalmente de datos e integración, no de UI nueva.

---

## FASE 5: Panel del Ejecutivo + Cotizador del Ejecutivo

> **Duración:** 1.5 semanas
> **Depende de:** Fase 3 (motor de reparto) y Fase 4 (cotizador conectado a datos reales)
> **Entregable:** `/panel` completo — dashboard, bandeja de leads, ficha con cotización adjunta, cotizador desbloqueado, créditos (solo lectura de historial, la compra real es Fase 7), perfil.
> **Asignación:** Sebastián + Claude Code

### User Stories de Esta Fase

| ID | Título | Prioridad |
|----|--------|-----------|
| US-024 | Usar el cotizador desbloqueado en el panel | P1 |
| US-025 | Enviar cotización por WhatsApp o correo | P1 |
| US-027 | Dashboard con saldo y resumen de leads | P1 |
| US-028 | Ver mis leads con filtros y búsqueda | P1 |
| US-029 | Ficha completa del lead con cotización adjunta | P1 |
| US-031 | Reportar lead inválido | P1 |
| US-032 | Perfil del ejecutivo | P1 |
| US-044 | Cláusula de tratamiento de datos al registrarse | P1 (UI se usa en Fase 6, lógica de datos acá) |

### Screen Flow de Esta Fase

`docs/ui-design/screen-flows/panel-ejecutivo.md` — completo, incluye specs de `StatusBadge` y `CreditBalance` (`docs/ui-design/components/`), pendientes de implementar en código (solo especificados en el Skill #7).

### Subfases y Tareas

**5.1 — Layout y navegación**
- [ ] **T-5.1.1** Crear `app/panel/layout.tsx` con guard de sesión (rol `ejecutivo` o `superadmin`, estado `activo`)
- [ ] **T-5.1.2** Implementar Bottom Nav de 5 secciones (Tech Spec + `docs/ux-design/information-architecture.md`) — reutilizable como top bar en desktop
- [ ] **T-5.1.3** Implementar `components/ui/status-badge.tsx` y `components/ui/credit-balance.tsx` siguiendo sus specs

**5.2 — Dashboard y bandeja de leads**
- [ ] **T-5.2.1** Crear `app/panel/page.tsx` (Inicio) — saldo, alerta de saldo bajo, resumen de leads
- [ ] **T-5.2.2** Crear `app/panel/leads/page.tsx` — bandeja tipo inbox, filtrada por `asignado_a`
- [ ] **T-5.2.3** Crear `app/panel/leads/[id]/page.tsx` — ficha completa con cotización adjunta, WhatsApp/llamar, notas, etapa/calidad, reportar inválido
- [ ] **T-5.2.4** Disparar `acceso_log` al abrir la ficha (US-045)

**5.3 — Cotizador del ejecutivo**
- [ ] **T-5.3.1** Crear `app/panel/cotizador/page.tsx` — reutiliza `CotizadorShell` sin `LeadGate`, con envío por WhatsApp/correo
- [ ] **T-5.3.2** Implementar envío por correo vía Resend

**5.4 — Perfil**
- [ ] **T-5.4.1** Crear `app/panel/perfil/page.tsx` — datos personales, facturación, contraseña, interruptor "recibir leads"

### Criterios de Aceptación de la Fase

- [ ] Un ejecutivo solo ve sus propios leads — verificado con test E2E (URL directa a lead ajeno → 403/404)
- [ ] El botón "Reportar lead inválido" solo aparece dentro de la ventana de 48h
- [ ] El cotizador del panel funciona idéntico al público, sin el paso de LeadGate

### Notas Técnicas

- Reutilizar el Design System y los componentes del cotizador público al máximo — el 80% del trabajo visual ya está hecho en la Fase 4.

---

## FASE 6: Registro Externo + Panel Superadmin Completo

> **Duración:** 1 semana
> **Depende de:** Fase 2 (Postgres) y Fase 5 (roles/paneles ya funcionando para el equipo interno)
> **Entregable:** Un ejecutivo externo puede registrarse, ser aprobado por Cynthia, y operar igual que el equipo interno. El panel superadmin tiene control total (packs, órdenes, reembolsos, métricas).
> **Asignación:** Sebastián + Claude Code

### User Stories de Esta Fase

| ID | Título | Prioridad |
|----|--------|-----------|
| US-001 | Registro de ejecutivo externo | P1 |
| US-002 | Verificación de email | P1 |
| US-003 | Aprobar o rechazar cuenta de ejecutivo | P1 |
| US-004 | Suspender o reactivar cuenta de ejecutivo | P1 |
| US-033 | Ver saldo y estado de todos los ejecutivos (extensión completa) | P1 |
| US-034 | CRUD de packs de créditos | P1 |
| US-035 | Ver órdenes y pagos | P1 |
| US-036 | Cola de reembolsos — aprobar o rechazar | P1 |
| US-037 | Métricas ampliadas del negocio | P1 |

### Screen Flows de Esta Fase

`docs/ui-design/screen-flows/registro-ejecutivo.md` y `docs/ui-design/screen-flows/admin-marketplace.md`.

### Subfases y Tareas

**6.1 — Registro público**
- [ ] **T-6.1.1** Crear `app/registro/page.tsx` (Tailwind + Design System, es superficie pública nueva)
- [ ] **T-6.1.2** Implementar verificación de email (link con expiración de 24h)
- [ ] **T-6.1.3** Implementar cláusula de tratamiento de datos versionada (US-044)

**6.2 — Aprobación en `/admin`**
- [ ] **T-6.2.1** Extender `app/admin/usuarios/page.tsx` con filtro por estado y acciones de aprobar/rechazar/suspender
- [ ] **T-6.2.2** Emails de aprobación/rechazo/bienvenida vía Resend

**6.3 — Packs, órdenes, reembolsos, métricas**
- [ ] **T-6.3.1** Crear `app/admin/creditos/packs/page.tsx` — CRUD completo
- [ ] **T-6.3.2** Crear `app/admin/creditos/ordenes/page.tsx` — listado filtrable (depende del schema de `orden`, se llena de datos reales en la Fase 7)
- [ ] **T-6.3.3** Crear `app/admin/reparto/reembolsos/page.tsx` — cola de `reembolso_solicitud`
- [ ] **T-6.3.4** Extender `app/admin/metricas/page.tsx` con ingresos, créditos vendidos/consumidos/regalados, ranking de tasa de cierre

### Criterios de Aceptación de la Fase

- [ ] Un ejecutivo externo se registra, verifica su email, y prueba el cotizador gratis mientras espera aprobación (first success del onboarding)
- [ ] Cynthia aprueba/rechaza una cuenta en 2 clics desde `/admin/usuarios`
- [ ] `/admin/metricas` muestra las métricas de negocio nuevas sin romper las ya existentes

---

## FASE 7: Compra de Créditos con Mercado Pago

> **Duración:** 1 semana
> **Depende de:** Fase 6 (packs configurados, ejecutivos externos pueden existir)
> **Entregable:** Checkout de Mercado Pago funcionando en modo `test` end-to-end; recién después de validar, se activa `live`.
> **Asignación:** Sebastián + Claude Code

### User Stories de Esta Fase

| ID | Título | Prioridad |
|----|--------|-----------|
| US-038 | Ver packs disponibles y comprar | P1 |
| US-039 | Checkout con Mercado Pago | P1 |
| US-040 | Webhook de Mercado Pago — acreditar créditos | P1 |
| US-041 | Manejar reembolsos y contracargos de Mercado Pago | P1 |
| US-042 | Historial de compras del ejecutivo | P1 |
| US-048 | Verificar estado de mi orden manualmente | P1 |

### Subfases y Tareas

**7.1 — Antes de escribir código**
- [ ] **T-7.1.1** Consultar la documentación oficial vigente de Mercado Pago Checkout Pro (API de preferencias, webhooks, verificación de firma) — no implementar desde memoria, per el alcance original y el Tech Spec 7.1

**7.2 — Checkout**
- [ ] **T-7.2.1** Crear `app/panel/creditos/page.tsx` — packs + historial (extiende lo de la Fase 5)
- [ ] **T-7.2.2** Crear `app/api/mercadopago/preferencia/route.ts` — crea `orden` + preferencia de pago
- [ ] **T-7.2.3** Crear páginas `back_url` de éxito/pendiente/error — ninguna acredita créditos directamente

**7.3 — Webhook**
- [ ] **T-7.3.1** Crear `app/api/mercadopago/webhook/route.ts` con validación de firma (`MP_WEBHOOK_SECRET`)
- [ ] **T-7.3.2** Implementar idempotencia por `mp_payment_id` único + tabla `payment_events`
- [ ] **T-7.3.3** Implementar manejo de `refunded`/`charged_back` (US-041)
- [ ] **T-7.3.4** Implementar el botón "Verificar estado" (US-048) reutilizando el mismo camino de acreditación idempotente

**7.4 — Pruebas**
- [ ] **T-7.4.1** Probar el flujo completo en `MP_MODE=test` con credenciales de prueba, incluyendo un webhook duplicado simulado
- [ ] **T-7.4.2** Solo pasar a `MP_MODE=live` con aprobación explícita del usuario

### Criterios de Aceptación de la Fase

- [ ] Un pago de prueba aprobado acredita créditos exactamente una vez
- [ ] Un webhook duplicado no acredita dos veces
- [ ] Un pago rechazado muestra el motivo cuando la API de Mercado Pago lo entrega

### Notas Técnicas

- Este es el segundo componente de mayor riesgo (Pre-Mortem R-01, R-04) — no pasar a `live` sin validar primero con al menos un ejecutivo externo real que esté dispuesto a pagar (acción bloqueante del Pre-Mortem).

---

## FASE 8: Quality & Launch Polish

> **Duración:** 1 semana
> **Depende de:** Todas las fases anteriores
> **Entregable:** Producto listo para abrir la adquisición de ejecutivos externos más allá del círculo cercano.
> **Asignación:** Sebastián + Claude Code

### User Stories de Esta Fase

| ID | Título | Prioridad |
|----|--------|-----------|
| US-022 | Recuperar cotización guardada | P2 |
| US-023 | Página SEO indexable por isapre | P2 |
| US-026 | Generar PDF comparativo | P2 |

### Subfases y Tareas

**8.1 — Observabilidad (Security Audit, plan 30/60 días)**
- [ ] **T-8.1.1** SEC-8: extender `acceso_log` a acciones administrativas
- [ ] **T-8.1.2** SCALE-1: paginar o indexar la revisión de recordatorios (ya no `listarLeads(500)` fijo)
- [ ] **T-8.1.3** Logging estructurado (JSON, traceId) en el motor de reparto y el ledger

**8.2 — Polish P2**
- [ ] **T-8.2.1** `app/mi-cotizacion/page.tsx` — recuperar cotización por WhatsApp (US-022)
- [ ] **T-8.2.2** `app/planes/[isapre]/page.tsx` — páginas SEO indexables (US-023)
- [ ] **T-8.2.3** Generación de PDF comparativo (US-026)

**8.3 — Decisión de negocio pendiente**
- [ ] **T-8.3.1** Resolver SEC-10 / Pre-Mortem R-10: decidir la estrategia de fuente de datos del catálogo a mediano plazo (no depender indefinidamente de la sesión autenticada de tu7.cl)

### Criterios de Aceptación de la Fase

- [ ] `npm run test` y `npx playwright test` en verde
- [ ] `SECURITY-AUDIT-marketplace-leads.md` sin hallazgos 🔴 Open de severidad Alta o Crítica
- [ ] Demo end-to-end: un prospecto cotiza → un ejecutivo externo (de prueba) recibe el lead → lo trabaja con el cotizador y Romina → marca calidad → el export de Google Ads sigue funcionando igual que el primer día

---

## Apéndice A: Mapeo Completo US → Fase

| User Story | Prioridad | Fase |
|-----------|-----------|------|
| US-001 a US-004 | P1 | 6 |
| US-005 a US-010 | P0 | 1 |
| US-006b | P0 | 1 |
| US-011 a US-017 | P1 | 3 |
| US-018 a US-021 | P1 | 4 |
| US-022, US-023 | P2 | 8 |
| US-024, US-025 | P1 | 5 |
| US-026 | P2 | 8 |
| US-027 a US-032 | P1 | 5 |
| US-033 a US-037 | P1 | 6 |
| US-038 a US-042 | P1 | 7 |
| US-043 | P1 | 4 |
| US-044 | P1 | 6 |
| US-045 | P1 | 4/5 (tabla en 4, disparo en 5) |
| US-046, US-047 | P1/P0 | 2 (y validado en 1) |
| US-048 | P1 | 7 |

**Validación:** 49 stories asignados. 0 sin fase. 0 duplicados (US-045 y US-047 aparecen en dos fases por diseño — la tabla/infraestructura en una, el uso/validación en otra — no es duplicación de trabajo).

---

## Apéndice B: Mapeo Pantallas → Fase

| Pantalla | Screen Flow | Fase |
|----------|-------------|------|
| `/admin/reparto`, `/admin/creditos` (mínimo) | `reparto-manual-fase-0.md` | 1 |
| `/cotizador`, `/mi-cotizacion` | `cotizador-publico.md` | 4 (implementación insignia ya en Skill #8), 8 (mi-cotizacion) |
| `/panel/*` | `panel-ejecutivo.md` | 5 |
| `/registro` | `registro-ejecutivo.md` | 6 |
| `/admin/usuarios` (ext.), `/admin/creditos/packs`, `/admin/creditos/ordenes`, `/admin/reparto/reembolsos`, `/admin/reparto/config`, `/admin/metricas` (ext.) | `admin-marketplace.md` | 6 (packs/órdenes/reembolsos/métricas), 3 (config de reparto) |

**Validación:** 5 screen flows, todos asignados a al menos una fase. 0 huérfanos.

---

## Apéndice C: Dependencias Entre Fases

```
Fase 1 (Reparto Manual) ──→ Fase 2 (Postgres + Seguridad) ──→ Fase 3 (Ledger + Motor Auto)
                                                                        │
                                                    ┌───────────────────┘
                                                    ▼
                                            Fase 4 (Cotizador Público)
                                                    │
                                                    ▼
                                            Fase 5 (Panel Ejecutivo)
                                                    │
                                                    ▼
                                            Fase 6 (Registro + Admin)
                                                    │
                                                    ▼
                                            Fase 7 (Mercado Pago)
                                                    │
                                                    ▼
                                            Fase 8 (Polish + Launch)
```

Fase 4 y Fase 5 podrían correr con solapamiento parcial si hay 2 desarrolladores (Fase 5 no depende de que Fase 4 esté 100% terminada, solo de que el motor de reparto de Fase 3 exista) — con un solo desarrollador (el caso actual), se mantiene secuencial.

---

## Apéndice D: Estimaciones y Timeline

| Fase | Duración Estimada | Acumulado |
|------|---------------------|-----------|
| 1 — Reparto Manual | 2 días | 2 días |
| 2 — Foundation + Seguridad | 1.5 semanas | ~1.9 semanas |
| 3 — Ledger + Motor Automático | 1 semana | ~2.9 semanas |
| 4 — Cotizador Público | 2 semanas | ~4.9 semanas |
| 5 — Panel Ejecutivo | 1.5 semanas | ~6.4 semanas |
| 6 — Registro + Admin | 1 semana | ~7.4 semanas |
| 7 — Mercado Pago | 1 semana | ~8.4 semanas |
| 8 — Polish + Launch | 1 semana | **~9.4 semanas** |

Consistente con la advertencia del Viability Check y el Pre-Mortem: el plazo real de "2 días" cubre únicamente la Fase 1. El resto es un proyecto de ~2 meses, no de días.

---

## Changelog

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 2026-09-08 | 1.0 | Blueprint inicial generado, consolidando Viability → PDR → Tech Spec → User Stories → UX Research/Design → UI Design Workflow → UI (pantalla insignia) → Pre-Mortem → Security Audit |

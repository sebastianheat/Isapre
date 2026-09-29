# Marketplace de Leads nuevaisapre.cl — Technical Specifications

> **Tech Spec v1.0**
> **Estado**: BORRADOR
> **Fecha**: 2026-09-07
> **PDR de referencia**: PDR-marketplace-leads.md

---

## 1. Resumen Ejecutivo

### Problema (del PDR)
El equipo interno no alcanza a monetizar el excedente de leads de Google Ads, y los ejecutivos externos de isapre solo tienen dos malas opciones: comprar leads sueltos y caros, o pagar una suscripción fija a tu7.cl sin garantía de leads ni gratis.

### Solución Técnica
Un cotizador propio (motor de cálculo + BD normalizada de planes/coberturas, gratis para todo ejecutivo con cuenta) conectado a un marketplace de créditos prepago con reparto automático transaccional, migrando la capa de datos actual (Upstash KV) a Postgres para soportar el ledger de créditos con garantías reales de atomicidad.

### Complejidad Estimada
**Medio-Alta** — no requiere microservicios ni tiempo real pesado, pero combina: roles multiusuario, dinero real con Mercado Pago, un motor de cálculo con muchas entidades relacionadas, y requisitos legales (Ley 21.719) que no admiten atajos.

---

## 2. Stack Tecnológico

### 2.1 Tabla Resumen

| Capa | Tecnología | Versión | Justificación |
|------|-----------|---------|----------------|
| Framework | Next.js | 15.5.25 | Ya en producción; sin razón para migrar a v16 en medio del proyecto |
| UI Library | React | 19.1.1 | Ya en uso |
| Language | TypeScript | ^5.7.0, strict | Ya establecido en el proyecto |
| Styling (pantallas nuevas) | Tailwind CSS | 3.4.x | Cotizador con facetas y filtros se beneficia de utilidades; `/admin` actual se queda con `admin.css` |
| Components | shadcn/ui | latest (CLI) | Acelera formularios, tablas y tarjetas nuevas sin bloquear el `/admin` existente |
| State Mgmt | Zustand | ^4.x | Solo para el store del cotizador (beneficiarios, filtros, planes seleccionados) — nada más lo necesita |
| Validation | Zod | ^3.x | Todo endpoint nuevo con dinero o datos personales |
| Backend | Next.js Route Handlers + Server Actions | — | Sin API separada; el dominio no lo justifica |
| Database | Postgres vía Supabase | — | Transacciones reales para el ledger; RLS como defensa en profundidad (ver 6.2) |
| Auth | Custom (`jose` + `bcryptjs`, ya existe en `lib/auth.ts`) | — | Ya funciona, ya modela roles `superadmin`/`ejecutivo` — no se reescribe sin necesidad |
| Storage | Supabase Storage o Vercel Blob | — | Solo si se necesitan adjuntar comprobantes/PDFs de compra; N/A en Fase 0-1 |
| Payments | Mercado Pago Checkout Pro | API vigente — verificar contra docs oficiales antes de implementar | Chile/CLP, decisión ya fijada por el usuario |
| Email | Resend | ^4.0.1, ya integrado | Notificaciones de lead asignado, aprobación de cuenta |
| Hosting | Vercel | — | Ya en uso |
| Testing | Playwright + Vitest | — | Playwright para flujos E2E críticos; Vitest para `lib/pricing.ts` y el motor de reparto/ledger |
| Monitoring | Ninguno en Fase 0-1 | — | Se agrega cuando Mercado Pago esté en producción real |

### 2.2 Decisiones Técnicas Importantes

**Postgres vía Supabase, sin Supabase Auth**
- Razón: se necesitan transacciones ACID reales para el ledger de créditos (algo que Upstash KV no puede dar) sin reescribir un sistema de auth que ya funciona y ya tiene roles.
- Trade-off: no hay RLS "gratis" basada en `auth.uid()` de Supabase — hay que implementar el equivalente con variables de sesión de Postgres (ver 6.2). Es más trabajo manual, pero es el trade-off correcto dado que el auth actual no es negociable en este alcance.
- Reevaluar si: el proyecto crece a necesitar OAuth social o multi-dispositivo con refresh tokens — ahí sí conviene migrar a Supabase Auth completo.

**Dos sistemas de estilo conviven temporalmente**
- Razón: introducir Tailwind solo en las pantallas nuevas evita tocar código que ya funciona en `/admin`.
- Trade-off: inconsistencia visual temporal entre `/admin` (CSS plano) y `/cotizador`, `/panel`, `/registro` (Tailwind + shadcn).
- Reevaluar si: se decide normalizar todo el proyecto a un solo sistema — usar el skill `/normalize` cuando llegue ese momento, no ahora.

**Migración de datos en dos pasos, no en uno**
- Razón: los 245 leads y usuarios existentes en Upstash KV deben migrar a Postgres sin pérdida, pero el export de conversiones de Google Ads (crítico, en producción) no puede romperse durante la transición.
- Trade-off: durante la Fase 0 (2 días) NO se migra nada — se sigue usando Upstash KV con el modelo de roles ya existente para el reparto manual interno. La migración a Postgres ocurre en la Fase 1 del Blueprint, con script reversible y backup previo verificado en preview antes de tocar producción.

### 2.3 Lo Que NO Se Incluye (y por qué)

| Tecnología | Razón de exclusión | Agregar en |
|------------|---------------------|------------|
| Supabase Auth | El auth custom ya funciona y ya tiene roles | Solo si se necesita OAuth social a futuro |
| Sentry / error tracking | No hay pagos en producción todavía | Cuando Mercado Pago pase a modo `live` |
| Rate limiting (Upstash) | Volumen bajo en Fase 0-1 | Cuando se abra registro público de ejecutivos externos |
| Multi-tenancy real (aislamiento por agencia) | El PDR lo marca explícitamente fuera de alcance | Si se agrega el rol `supervisor`/`agencia` |
| React Query / SWR | Server Components + Server Actions cubren el fetching necesario | Si el panel necesita polling/realtime en el futuro |

---

## 3. Arquitectura

### 3.1 Diagrama de Alto Nivel

```
┌──────────────┐        ┌───────────────────────────┐        ┌─────────────────┐
│   Navegador  │───────▶│   Next.js 15 (Vercel)     │───────▶│   Postgres       │
│  Prospecto / │◀───────│   App Router              │◀───────│   (Supabase)     │
│  Ejecutivo   │        │   RSC + Server Actions    │        │   + RLS custom   │
└──────────────┘        └─────────────┬─────────────┘        └─────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┬─────────────────┐
                    ▼                  ▼                  ▼                 ▼
            ┌───────────────┐  ┌──────────────┐  ┌────────────────┐ ┌─────────────┐
            │ Mercado Pago  │  │   Resend     │  │  Anthropic SDK │ │ Upstash KV  │
            │ (checkout +   │  │  (emails)    │  │  (Romina)      │ │ (legacy —   │
            │  webhook)     │  │              │  │                │ │  Fase 0)    │
            └───────────────┘  └──────────────┘  └────────────────┘ └─────────────┘
```

### 3.2 Arquitectura de Carpetas

```
app/
├── cotizador/
│   ├── page.tsx                    # RSC — cotizador público, catálogo precargado
│   └── [slug]/page.tsx             # Cotización guardada, URL compartible + SEO
├── planes/[isapre]/page.tsx        # SEO — página indexable por isapre
├── registro/page.tsx               # Registro de ejecutivo externo
├── panel/                          # Superficie del ejecutivo (NUEVA, separada de /admin)
│   ├── layout.tsx                  # Guard de sesión + rol ejecutivo
│   ├── page.tsx                    # Dashboard: saldo, leads del día, alerta de saldo bajo
│   ├── leads/[id]/page.tsx         # Ficha del lead con cotización adjunta
│   ├── creditos/page.tsx           # Compra de créditos, historial de órdenes
│   ├── cotizador/page.tsx          # Cotizador del ejecutivo (mismo motor, versión desbloqueada)
│   └── perfil/page.tsx             # Datos personales, facturación, "recibir leads" on/off
├── admin/                          # YA EXISTE — se extiende, no se reescribe
│   ├── usuarios/page.tsx           # + aprobar/suspender ejecutivos, ver saldo
│   ├── creditos/page.tsx           # NUEVO — regalar créditos, CRUD de packs
│   └── reparto/page.tsx            # NUEVO — leads sin asignar, config del motor
└── api/
    ├── cotizaciones/route.ts               # POST — guarda cotización + crea/actualiza lead
    ├── mercadopago/
    │   ├── preferencia/route.ts            # POST — crea preferencia de pago
    │   └── webhook/route.ts                # POST — única fuente de verdad para acreditar
    ├── admin/creditos/route.ts             # Regalo/ajuste de créditos (server action preferible)
    └── cron/reparto-backlog/route.ts       # Reintenta asignar leads `sin_asignar` al recargar saldo

lib/
├── db/
│   ├── client.ts                   # Cliente Postgres (pool + helper de transacción con RLS)
│   ├── schema.sql                  # Fuente de verdad del schema (ver sección 4.2)
│   └── migrations/                 # Migraciones versionadas, con script de rollback
├── pricing.ts                      # Motor de cálculo puro del cotizador (testeado)
├── filters.ts                      # Facetas + conteos del cotizador
├── credits.ts                      # Ledger: comprar, regalar, consumir, reembolsar créditos
├── assignment.ts                   # assignLead() — motor de reparto transaccional
├── mercadopago.ts                  # Cliente de Mercado Pago (preferencia, verificación de pago)
├── auth.ts                         # YA EXISTE — sin cambios de fondo
├── leads.ts                        # Se migra de Upstash KV a Postgres (Fase 1 del Blueprint)
└── usuarios.ts                     # Se migra de Upstash KV a Postgres (Fase 1 del Blueprint)

components/
├── cotizador/
│   ├── cotizador-shell.tsx
│   ├── beneficiarios-panel.tsx
│   ├── filtro-facetas.tsx
│   ├── plan-card.tsx
│   ├── price-breakdown-modal.tsx
│   └── lead-gate.tsx               # Pide contacto en momento de alto intento (solo versión pública)
└── panel/
    ├── credit-balance.tsx
    ├── lead-list.tsx
    └── purchase-history.tsx
```

### 3.3 Componentes del Sistema

**Motor de Cotización (`lib/pricing.ts` + `lib/filters.ts`)**
- Propósito: calcular el precio de cada plan para un set de beneficiarios, y las facetas/conteos de filtros.
- Tecnología: TypeScript puro, sin dependencias de framework — testeable de forma aislada.
- Responsabilidades: fórmula `(base_uf × factor) + ges_uf` por beneficiario; agregación de facetas.
- Se comunica con: `app/api/cotizaciones/route.ts` (server) y el store de Zustand (client, para recálculo instantáneo).
- Escala: sin estado, se puede ejecutar miles de veces por segundo sin problema — el cuidado está en no mandar el catálogo completo al cliente sin adelgazar (ver 8.2).

**Motor de Reparto (`lib/assignment.ts`)**
- Propósito: asignar un lead nuevo a un ejecutivo con saldo, de forma atómica.
- Tecnología: transacción Postgres con `SELECT ... FOR UPDATE` sobre la fila del usuario candidato.
- Responsabilidades: seleccionar candidatos, sortear ponderado, descontar crédito, crear el movimiento en el ledger, notificar — todo en una sola transacción o con rollback completo si algo falla.
- Se comunica con: `lib/credits.ts` (ledger), `lib/leads.ts` (actualiza `asignado_a`), Resend (notificación).
- Escala: el `FOR UPDATE` serializa la asignación por usuario candidato, no por lead — dos leads simultáneos no pueden gastar el mismo último crédito del mismo ejecutivo.

**Ledger de Créditos (`lib/credits.ts`)**
- Propósito: única fuente de verdad del saldo — el saldo siempre se puede recalcular sumando `credit_transactions`.
- Tecnología: funciones puras sobre transacciones Postgres.
- Responsabilidades: registrar compra/regalo/consumo/reembolso/ajuste; nunca escribir un saldo "suelto" sin respaldo en el ledger.

### 3.4 Flujo de Datos (alta intención → lead vendido)

```
Prospecto cotiza (público)
        │
        ▼
POST /api/cotizaciones  →  guarda `cotizacion` (anónima, con gclid/UTM)
        │
        ▼
Prospecto pide contacto (LeadGate)
        │
        ▼
Se crea `lead` enlazado a la `cotizacion`
        │
        ▼
assignLead(leadId)  →  lib/assignment.ts
        │
        ├─ Hay candidato con saldo → transacción: descuenta crédito + asigna + notifica
        └─ No hay candidato → assignment_status = 'sin_asignar', backlog para cron de reintento
```

---

## 4. Base de Datos

### 4.1 Modelo de Datos (Diagrama ER simplificado)

```
usuario (1) ────< (many) credit_transactions
usuario (1) ────< (many) orden
usuario (1) ────< (many) lead [asignado_a]
usuario (1) ────< (many) cotizacion [ejecutivo_id, opcional]

lead (1) ──── (0..1) cotizacion
lead (1) ────< (many) reembolso_solicitud

isapre (1) ────< (many) plan
zona (1) ────< (many) plan
tipo_plan (1) ────< (many) plan
plan (1) ────< (many) plan_cobertura >──── (1) prestador

credit_pack (1) ────< (many) orden
```

### 4.2 Schema Completo

```sql
-- ============================================
-- Tabla: usuario
-- Propósito: ejecutivos y superadmin. Cynthia (info@nuevaisapre.cl) es
-- 'superadmin' y opera también como ejecutiva con el mismo registro —
-- no se duplica identidad.
-- ============================================
CREATE TABLE usuario (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT UNIQUE NOT NULL,
  password_hash     TEXT NOT NULL,
  role              TEXT NOT NULL CHECK (role IN ('superadmin', 'ejecutivo')),
  nombre            TEXT,
  telefono          TEXT,
  rut               TEXT,
  isapre_representa TEXT,
  estado            TEXT NOT NULL DEFAULT 'pendiente_aprobacion'
                      CHECK (estado IN ('pendiente_aprobacion', 'activo', 'suspendido')),
  creditos_saldo    INTEGER NOT NULL DEFAULT 0,     -- cache; siempre recalculable desde el ledger
  recibiendo_leads  BOOLEAN NOT NULL DEFAULT TRUE,
  daily_cap         INTEGER,                        -- NULL = sin límite
  datos_facturacion JSONB,                           -- { rut, razon_social, giro, direccion }
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX idx_usuario_role_estado ON usuario (role, estado);
COMMENT ON TABLE usuario IS 'Ejecutivos y superadmin. Migrado desde lib/usuarios.ts (Upstash KV).';

-- ============================================
-- Catálogo del motor de cotización (basado en el análisis de tu7.cl,
-- normalizado — a diferencia de tu7.cl, las coberturas NO viajan como texto)
-- ============================================
CREATE TABLE isapre (
  id       SERIAL PRIMARY KEY,
  nombre   TEXT NOT NULL,
  slug     TEXT UNIQUE NOT NULL,
  ges_uf   NUMERIC(6,3) NOT NULL,
  logo_url TEXT,
  activa   BOOLEAN DEFAULT TRUE
);

CREATE TABLE zona (
  id     SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  slug   TEXT UNIQUE NOT NULL
);

CREATE TABLE tipo_plan (
  id     SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL   -- Preferente | Cerrado | Libre Elección
);

CREATE TABLE prestador (
  id           SERIAL PRIMARY KEY,
  nombre       TEXT NOT NULL,
  logo_url     TEXT,
  hospitalaria BOOLEAN DEFAULT FALSE,
  ambulatoria  BOOLEAN DEFAULT FALSE
);

CREATE TABLE prestador_zona (
  prestador_id INT REFERENCES prestador(id),
  zona_id      INT REFERENCES zona(id),
  PRIMARY KEY (prestador_id, zona_id)
);

CREATE TABLE plan (
  id            SERIAL PRIMARY KEY,
  codigo        TEXT NOT NULL,
  nombre        TEXT NOT NULL,
  isapre_id     INT REFERENCES isapre(id),
  zona_id       INT REFERENCES zona(id),
  tipo_plan_id  INT REFERENCES tipo_plan(id),
  base_uf       NUMERIC(8,4) NOT NULL,
  pdf_url       TEXT,
  vigente_desde DATE,
  vigente_hasta DATE,                         -- NULL = vigente
  UNIQUE (codigo, vigente_desde)
);
CREATE INDEX idx_plan_vigente ON plan (isapre_id, zona_id, tipo_plan_id) WHERE vigente_hasta IS NULL;
CREATE INDEX idx_plan_base_uf ON plan (base_uf);

CREATE TABLE plan_cobertura (
  plan_id      INT REFERENCES plan(id) ON DELETE CASCADE,
  prestador_id INT REFERENCES prestador(id),
  ambito       TEXT CHECK (ambito IN ('hospitalaria', 'ambulatoria')),
  porcentaje   SMALLINT CHECK (porcentaje BETWEEN 0 AND 100),
  tope_uf      NUMERIC(8,2),
  PRIMARY KEY (plan_id, prestador_id, ambito, porcentaje)
);
CREATE INDEX idx_cobertura_filtro ON plan_cobertura (prestador_id, ambito, porcentaje);

CREATE TABLE factor_etario (
  id               SERIAL PRIMARY KEY,
  edad_desde       SMALLINT NOT NULL,
  edad_hasta       SMALLINT NOT NULL,
  factor_cotizante NUMERIC(4,2) NOT NULL,
  factor_carga     NUMERIC(4,2) NOT NULL,
  vigente_desde    DATE NOT NULL              -- versionado: cambian por normativa
);

CREATE TABLE uf_diaria (
  fecha DATE PRIMARY KEY,
  valor NUMERIC(12,2) NOT NULL
);

-- ============================================
-- Tabla: cotizacion
-- ============================================
CREATE TABLE cotizacion (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE,                  -- URL compartible, noindex
  ejecutivo_id  UUID REFERENCES usuario(id),  -- NULL si es cotización pública anónima
  beneficiarios JSONB NOT NULL,               -- [{edad, tipo:'cotizante'|'carga'}]
  filtros       JSONB NOT NULL,
  planes        JSONB NOT NULL,               -- ids seleccionados + precio congelado al momento
  uf_valor      NUMERIC(12,2) NOT NULL,
  gclid         TEXT,
  fbclid        TEXT,
  utm           JSONB,
  creada_en     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX idx_cotizacion_ejecutivo ON cotizacion (ejecutivo_id);

-- ============================================
-- Tabla: lead
-- Migrado desde lib/leads.ts (Upstash KV) — se agregan campos del
-- marketplace y del consentimiento Ley 21.719.
-- ============================================
CREATE TABLE lead (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                TEXT NOT NULL,
  rut                   TEXT,
  telefono              TEXT,
  email                 TEXT,
  edad                  SMALLINT,
  sueldo_liquido        NUMERIC(12,0),
  region                TEXT,
  isapre_actual         TEXT,
  clinica_preferida     TEXT,
  cargas_resumen        TEXT,
  canal                 TEXT CHECK (canal IN ('google-ads','meta-ads','web-organico','whatsapp')),
  gclid                 TEXT,
  fbclid                TEXT,
  meta_lead_id          TEXT,
  cotizacion_id         UUID REFERENCES cotizacion(id),
  etapa                 TEXT NOT NULL DEFAULT 'nuevo',
  calidad               TEXT,
  asignado_a            UUID REFERENCES usuario(id),
  assignment_status     TEXT NOT NULL DEFAULT 'sin_asignar'
                          CHECK (assignment_status IN ('sin_asignar', 'asignado', 'invalidado')),
  price_credits         INTEGER NOT NULL DEFAULT 1,
  assigned_at           TIMESTAMPTZ,
  consentimiento_texto  TEXT,
  consentimiento_version TEXT,
  consentimiento_ts     TIMESTAMPTZ,
  notas                 JSONB DEFAULT '[]',
  recordatorios         JSONB DEFAULT '[]',
  exportado_offline     TIMESTAMPTZ,
  contactos             INTEGER DEFAULT 1,
  fecha                 TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  actualizado           TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX idx_lead_asignado ON lead (asignado_a);
CREATE INDEX idx_lead_sin_asignar ON lead (assignment_status) WHERE assignment_status = 'sin_asignar';
CREATE INDEX idx_lead_fecha ON lead (fecha DESC);

-- ============================================
-- Tabla: credit_pack
-- ============================================
CREATE TABLE credit_pack (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT NOT NULL,
  creditos   INTEGER NOT NULL CHECK (creditos > 0),
  precio_clp NUMERIC(12,0) NOT NULL CHECK (precio_clp > 0),
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  orden      SMALLINT DEFAULT 0,
  badge      TEXT
);

-- ============================================
-- Tabla: orden (compra de créditos vía Mercado Pago)
-- ============================================
CREATE TABLE orden (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID NOT NULL REFERENCES usuario(id),
  pack_id         UUID NOT NULL REFERENCES credit_pack(id),
  monto_clp       NUMERIC(12,0) NOT NULL,
  estado          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (estado IN ('pending','approved','rejected','refunded','charged_back')),
  mp_payment_id   TEXT UNIQUE,     -- idempotencia: nunca acreditar dos veces el mismo pago
  mp_preference_id TEXT,
  invoice_status  TEXT DEFAULT 'pendiente',
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX idx_orden_usuario ON orden (usuario_id);

-- ============================================
-- Tabla: credit_transactions (LEDGER append-only)
-- El saldo de `usuario.creditos_saldo` SIEMPRE debe poder recalcularse
-- sumando esta tabla — nunca hay un número suelto sin respaldo.
-- ============================================
CREATE TABLE credit_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id        UUID NOT NULL REFERENCES usuario(id),
  tipo              TEXT NOT NULL CHECK (tipo IN ('compra','regalo','consumo','reembolso','ajuste')),
  cantidad          INTEGER NOT NULL,          -- positivo o negativo
  saldo_resultante  INTEGER NOT NULL,
  referencia        TEXT,                      -- lead_id u orden_id relacionado
  motivo            TEXT,
  created_by        UUID REFERENCES usuario(id), -- quién ejecutó la acción (regalos/ajustes)
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX idx_ledger_usuario ON credit_transactions (usuario_id, created_at DESC);
COMMENT ON TABLE credit_transactions IS 'Ledger append-only. Nunca se hace UPDATE ni DELETE sobre esta tabla.';

-- ============================================
-- Tabla: payment_events (auditoría de webhooks Mercado Pago)
-- ============================================
CREATE TABLE payment_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mp_payment_id TEXT NOT NULL,
  payload       JSONB NOT NULL,
  procesado     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX idx_payment_events_payment_id ON payment_events (mp_payment_id);

-- ============================================
-- Tabla: reembolso_solicitud
-- ============================================
CREATE TABLE reembolso_solicitud (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       UUID NOT NULL REFERENCES lead(id),
  usuario_id    UUID NOT NULL REFERENCES usuario(id),
  motivo        TEXT NOT NULL,
  estado        TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobado','rechazado')),
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  resuelto_at   TIMESTAMPTZ,
  resuelto_por  UUID REFERENCES usuario(id)
);

-- ============================================
-- Tabla: reparto_config (fila única — configuración global del motor)
-- ============================================
CREATE TABLE reparto_config (
  id                          BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),  -- fuerza una sola fila
  reparto_automatico          BOOLEAN NOT NULL DEFAULT FALSE,
  antiguedad_max_backlog_horas INTEGER NOT NULL DEFAULT 72,
  daily_cap_default           INTEGER DEFAULT 5,
  fuentes_repartidas          TEXT[] NOT NULL DEFAULT ARRAY['google-ads','web-organico']
);

-- ============================================
-- Tabla: acceso_log (Ley 21.719 — quién vio qué lead y cuándo)
-- ============================================
CREATE TABLE acceso_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuario(id),
  lead_id    UUID NOT NULL REFERENCES lead(id),
  accion     TEXT NOT NULL,      -- 'view', 'export', etc.
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### 4.3 Storage / Buckets

No se necesita storage de archivos en Fase 0-1. Si se agrega comprobante de compra en PDF (fase posterior, ya marcada como opcional en el PDR original), usar Vercel Blob — no Supabase Storage, para no introducir una segunda dependencia de storage sin necesidad.

### 4.4 Migrations Strategy

- Migraciones SQL secuenciales numeradas (`001_init.sql`, `002_...`), versionadas en `lib/db/migrations/`, aplicadas con un runner simple (no se justifica un ORM completo dado que el volumen de tablas es manejable con SQL directo + un cliente tipado como `postgres.js`).
- **Migración de datos existente (245 leads, usuarios):** script separado y **reversible** — exporta primero un dump de Upstash KV a JSON como respaldo, luego inserta en Postgres, y se valida con un conteo de registros antes de apagar la lectura desde KV. No se apaga Upstash KV hasta confirmar el conteo y el export de conversiones de Google Ads funcionando igual en preview.

---

## 5. API Specifications

### 5.1 Estilo de API

Server Actions para mutaciones internas del panel (aprobar ejecutivo, regalar créditos, cambiar etapa). Route Handlers solo donde se necesita un endpoint público o llamado por un tercero: `POST /api/cotizaciones`, `POST /api/mercadopago/webhook`, `POST /api/mercadopago/preferencia`, `GET /api/cron/reparto-backlog`.

### 5.2 Endpoints Clave

```typescript
/**
 * Crear preferencia de pago para comprar un pack de créditos
 *
 * POST /api/mercadopago/preferencia
 * Auth: Requerida (ejecutivo activo)
 * Rate Limit: 10 req/min por usuario
 */
interface CrearPreferenciaRequest {
  packId: string; // uuid de credit_pack
}
interface CrearPreferenciaResponse {
  preferenceId: string;
  initPoint: string; // URL de checkout de Mercado Pago
  ordenId: string;
}

/**
 * Webhook de Mercado Pago — única fuente de verdad para acreditar créditos.
 * NUNCA acreditar desde el back_url del checkout.
 *
 * POST /api/mercadopago/webhook
 * Auth: Pública, pero valida x-signature contra el secret del webhook
 * antes de procesar. Verificar el estado real del pago contra la API
 * de Mercado Pago con el payment_id recibido — nunca confiar en el body.
 *
 * IMPORTANTE: verificar el shape exacto de la notificación y el método
 * de validación de firma contra la documentación oficial vigente de
 * Mercado Pago antes de implementar — no asumir un formato de memoria.
 */
interface WebhookResponse {
  received: true; // responder 200 rápido; procesar en background si hace falta
}

/**
 * Guardar una cotización pública y, si el prospecto pide contacto,
 * crear/actualizar el lead enlazado.
 *
 * POST /api/cotizaciones
 * Auth: Pública
 * Rate Limit: 20 req/min por IP
 */
interface CrearCotizacionRequest {
  beneficiarios: { edad: number; tipo: "cotizante" | "carga" }[];
  filtros: Record<string, unknown>;
  planesSeleccionados: string[]; // ids de plan
  gclid?: string;
  utm?: Record<string, string>;
  crearLead?: {
    nombre: string;
    telefono: string;
    email?: string;
    consentimientoVersion: string;
  };
}
interface CrearCotizacionResponse {
  cotizacionId: string;
  slug: string;
  leadId?: string;
}
```

```typescript
/**
 * assignLead — núcleo del motor de reparto. Server-side only,
 * llamado tras crear un lead nuevo. NO es un endpoint HTTP público.
 */
async function assignLead(leadId: string): Promise<
  | { status: "asignado"; usuarioId: string; creditoRestante: number }
  | { status: "sin_asignar" }
>;
```

### 5.3 Validación

Todo Route Handler y Server Action que reciba input de red valida con Zod antes de tocar la base de datos. Los schemas viven junto a cada módulo (`lib/cotizaciones/schema.ts`, `lib/credits/schema.ts`) y se reexportan para uso client-side en los formularios (mismo schema, sin duplicar reglas).

---

## 6. Autenticación y Seguridad

### 6.1 Flujo de Auth

Sin cambios respecto al sistema actual: login con email/password → `signSession()` firma un JWT (HS256) → cookie httpOnly `isapre_admin_session` (7 días) → `obtenerSesion()` / `obtenerSesionDeReq()` leen y verifican en cada Server Action / Route Handler.

**Extensión para registro self-service:** nuevo flujo `POST /registro` → crea `usuario` con `estado = 'pendiente_aprobacion'` → Cynthia (superadmin) lo aprueba desde `/admin/usuarios` → recién ahí puede iniciar sesión y comprar créditos.

### 6.2 Roles y Permisos

| Rol | Puede hacer | No puede hacer |
|-----|------------|-----------------|
| `ejecutivo` | Ver y trabajar sus propios leads, comprar créditos, usar el cotizador, reclamar reembolso de lead inválido | Ver leads de otro ejecutivo, regalar créditos, aprobar cuentas |
| `superadmin` | Todo lo de `ejecutivo` (Cynthia opera como ambos con la misma cuenta) + aprobar/suspender ejecutivos, regalar/ajustar créditos, asignar leads a mano, configurar el motor de reparto, ver todos los leads | — |

### 6.3 RLS sin Supabase Auth — el patrón a usar

Como se mantiene el auth custom, no existe `auth.uid()` de Supabase. El patrón correcto es **RLS basada en variables de sesión de Postgres**, seteadas por el propio servidor en cada transacción:

```sql
-- Se ejecuta al inicio de cada transacción, con los datos ya verificados
-- por obtenerSesion() en el servidor (NUNCA con datos del cliente sin validar).
SELECT set_config('app.current_user_id', $1, true);   -- true = solo dura la transacción
SELECT set_config('app.current_role', $2, true);

-- Política de ejemplo sobre `lead`:
ALTER TABLE lead ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ejecutivo_ve_sus_propios_leads"
  ON lead FOR SELECT
  USING (
    current_setting('app.current_role', true) = 'superadmin'
    OR asignado_a = current_setting('app.current_user_id', true)::uuid
  );
```

**Gotcha crítico:** esto solo funciona si la conexión a Postgres usa `SET LOCAL` dentro de una transacción explícita por request (no una conexión pooled compartida sin transacción). Usar `postgres.js` con `sql.begin(async sql => { ... })` envolviendo cada operación, nunca queries sueltas fuera de una transacción cuando dependan de RLS.

**Esto es defensa en profundidad, no la única capa.** El filtro por `asignado_a` también debe aplicarse explícitamente en cada query desde el código de la Server Action — nunca confiar solo en RLS ni solo en el filtro de aplicación. Escribir tests que intenten acceder al lead de otro ejecutivo y verifiquen que la respuesta es 403/404 en ambas capas.

### 6.4 Protección de Rutas

| Ruta Pattern | Acceso | Redirect si no auth |
|--------------|--------|----------------------|
| `/panel/*` | Ejecutivo o superadmin, `estado = 'activo'` | `/login` |
| `/admin/*` | Solo `superadmin` | `/panel` (si es ejecutivo) o `/login` |
| `/cotizador`, `/planes/*` | Pública | — |
| `/api/mercadopago/webhook` | Pública, validada por firma | 401 si firma inválida |
| `/api/admin/*` | Solo `superadmin` | 403 |

### 6.5 Security Checklist

- [x] Passwords hasheados (bcrypt, cost 10 — ya implementado)
- [x] JWT con expiración (7 días — ya implementado)
- [ ] HTTPS enforced (Vercel lo da por defecto en producción)
- [ ] Rate limiting en `/registro`, `/login`, `/api/cotizaciones`, `/api/mercadopago/webhook`
- [ ] Validación de firma `x-signature` en el webhook de Mercado Pago
- [ ] Verificación del pago contra la API de Mercado Pago con el `payment_id` (nunca confiar en el body del webhook)
- [ ] Idempotencia del webhook por `mp_payment_id` único
- [ ] RLS habilitado en `lead`, `credit_transactions`, `orden` (patrón de 6.3)
- [ ] Secrets (`MP_ACCESS_TOKEN`, secret del webhook) solo server-side, documentados en `.env.example`
- [ ] Texto de consentimiento versionado y timestamp guardado junto al lead

---

## 7. Integraciones Externas

### 7.1 Mercado Pago

- **Propósito**: checkout de compra de créditos y confirmación de pago vía webhook.
- **API Docs**: verificar la documentación oficial vigente al momento de implementar — no asumir el shape de la API de memoria; esto ya lo pidió el usuario explícitamente en el alcance original.
- **Auth method**: Access Token server-side (`MP_ACCESS_TOKEN`), nunca expuesto al cliente.
- **Endpoints que usamos**: creación de preferencia (Checkout Pro), consulta de pago por `payment_id`.
- **Costo estimado**: comisión por transacción de Mercado Pago (variable, confirmar tasa vigente para Chile).
- **Gotchas conocidos**: el webhook puede llegar duplicado — la idempotencia por `mp_payment_id` único en `orden` no es opcional. Probar primero en modo test (`MP_MODE=test`) con credenciales de prueba antes de pasar a `live`.
- **Fallback si falla**: si el webhook no llega, el usuario ve su orden en `pending` — agregar un botón "verificar estado" que consulte la API de Mercado Pago manualmente como respaldo.

### 7.2 Google Ads (ya existente, sin cambios de integración)

- El export CSV de conversiones sigue funcionando igual — se valida como criterio de aceptación explícito antes de cualquier cambio a producción.

---

## 8. Performance

### 8.1 Targets

| Métrica | Target | Máximo Aceptable |
|---------|--------|--------------------|
| First Contentful Paint (`/cotizador`) | 1.5s | 2.5s |
| Time to Interactive (`/cotizador`) | 2.5s | 4s |
| Recalculo de precios al cambiar filtro | instantáneo (cliente) | 100ms |
| API Response (P95) | 300ms | 800ms |
| Webhook Mercado Pago (respuesta) | 200ms | 500ms (procesar el resto en background) |

### 8.2 Estrategias de Optimización

- **No repetir el error de los 2,8 MB de tu7.cl**: el catálogo servido al cliente para el cotizador se adelgaza a solo los campos necesarios para la lista (id, código, nombre, isapre, zona, tipo, `base_uf`, `ges_uf`, coberturas máximas hospitalaria/ambulatoria) — el detalle completo de coberturas se pide bajo demanda al expandir una tarjeta.
- Cache del catálogo con `revalidate` (ISR) — se invalida cuando se actualiza el catálogo de planes, no en cada request.
- `uf_diaria` se cachea 24h, refrescada por un cron de Vercel.
- Facetas y conteos calculados en servidor con `GROUP BY`, no recalculadas completas en cada filtro del cliente sobre el catálogo entero.

### 8.3 Escalabilidad

El diseño soporta 10x el volumen actual de leads sin cambios estructurales: los índices en `lead(asignado_a)` y `lead(assignment_status)` cubren las queries más frecuentes, y el ledger append-only escala linealmente. El primer cuello de botella esperable a mayor escala es la actividad manual de aprobación de ejecutivos — se resuelve con mejores herramientas de curaduría, no con más infraestructura.

---

## 9. Error Handling

### 9.1 Error Codes

```typescript
enum AppErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  RATE_LIMITED = "RATE_LIMITED",
  INSUFFICIENT_CREDITS = "INSUFFICIENT_CREDITS",
  PAYMENT_ALREADY_PROCESSED = "PAYMENT_ALREADY_PROCESSED",
  LEAD_ALREADY_ASSIGNED = "LEAD_ALREADY_ASSIGNED",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}
```

### 9.2 Logging Strategy

Logs estructurados (JSON) en cada operación del ledger y del motor de reparto (`console.log` con `{ evento, usuarioId, leadId, montoCreditos }` — suficiente en Vercel sin herramienta externa en esta fase). Todo evento del webhook de Mercado Pago se guarda íntegro en `payment_events`, procesado o no, para poder auditar después.

### 9.3 User-Facing Errors

Toasts inline en `/panel` para errores de acción (ej. "No tienes créditos suficientes"). Página de error dedicada para fallas del checkout de Mercado Pago con opción de reintentar.

---

## 10. Deployment

### 10.1 Environments

| Env | URL | Propósito | Deploy trigger |
|-----|-----|-----------|-----------------|
| Development | localhost:3000 | Dev local, Mercado Pago en `MP_MODE=test` | Manual |
| Preview | `*.vercel.app` por PR | QA de cada fase del Blueprint | Push a rama `feat/marketplace-leads` |
| Production | `nuevaisapre.cl` | Live | Merge a main, **solo con aprobación explícita** |

### 10.2 Environment Variables

**Públicas (client-safe):** ninguna nueva requerida por el marketplace.

**Secretas (server-only):**
```
DATABASE_URL              # conexión Postgres (Supabase)
MP_ACCESS_TOKEN           # Mercado Pago, server-only
MP_WEBHOOK_SECRET         # para validar x-signature
MP_MODE                   # test | live
ADMIN_SESSION_SECRET      # ya existe
ADMIN_SEED_EMAIL          # ya existe
ADMIN_SEED_PASSWORD       # ya existe
RESEND_API_KEY            # ya existe
ANTHROPIC_API_KEY         # ya existe (Romina)
```

### 10.3 CI/CD

Antes de cada deploy: `tsc --noEmit`, `next lint`, tests unitarios de `lib/pricing.ts` y `lib/credits.ts`/`lib/assignment.ts`, y el suite de Playwright de los flujos críticos. Ningún merge a `main` sin esto en verde.

### 10.4 Infrastructure

Vercel (hosting + cron jobs para `uf_diaria` y `reparto-backlog`), Supabase (Postgres administrado).

---

## 11. Testing Strategy

### 11.1 Approach

| Tipo | Herramienta | Coverage Target | Qué se testea |
|------|-------------|-------------------|-----------------|
| Unit | Vitest | Alto en `lib/pricing.ts`, `lib/credits.ts`, `lib/assignment.ts` | Fórmula de cálculo, ledger nunca queda inconsistente, reparto nunca asigna sin descontar |
| Integration | Vitest + DB de test | Flujos de escritura en Postgres | Transacciones del motor de reparto bajo concurrencia simulada |
| E2E | Playwright | Flujos críticos completos | Ver 11.3 |

### 11.2 Testing Commands

```bash
npm run test          # Vitest — unit + integration
npx playwright test   # E2E
npm run typecheck     # tsc --noEmit
```

### 11.3 E2E Flows Críticos

- Registro de ejecutivo → aprobación por superadmin → login → compra de créditos (modo test) → recibe lead asignado.
- Ejecutivo A intenta acceder al lead de Ejecutivo B → 403/404 en ambas capas (aplicación y RLS).
- Dos leads simultáneos con un solo ejecutivo con 1 crédito de saldo → solo uno se asigna, el otro queda `sin_asignar`.
- Webhook de Mercado Pago llega duplicado → créditos se acreditan una sola vez.
- Export de conversiones de Google Ads sigue generando el mismo CSV que hoy, sin cambios de formato.

---

## 12. Consideraciones Futuras (Post-MVP)

| Feature/Mejora | Impacto Técnico | Fase Estimada |
|-----------------|--------------------|-----------------|
| Rol `supervisor`/`agencia` | Nueva tabla de jerarquía + RLS adicional | Post-lanzamiento, si hay demanda |
| Boleta/factura electrónica automática | Integración con SII o proveedor de facturación | Fase posterior, ya marcada en el PDR |
| Páginas SEO completas (`/comparar/[a]-vs-[b]`) | Contenido generado + datos estructurados | Fase 5 del roadmap del cotizador |
| Rate limiting con Upstash | Reintroducir Upstash solo para esto, no como DB | Cuando se abra registro público masivo |

---

## 13. Gotchas y Auto-Blindaje

### Migración de KV a Postgres
- El fallback silencioso a memoria en `lib/store.ts` (cuando faltan las envs de Upstash) es la causa raíz de por qué no se puede confiar en el estado actual para dinero — verificar en cada ambiente (dev, preview, prod) que las envs de Postgres estén presentes antes de asumir que el ledger es confiable.

### RLS con auth custom
- `SET LOCAL` solo persiste dentro de la transacción que lo ejecutó — si el pool de conexiones reutiliza la conexión fuera de esa transacción, una request puede "heredar" el `current_setting` de otra por error. Usar siempre `sql.begin()` (o equivalente) y nunca setear la variable de sesión fuera de un bloque transaccional explícito.

### Motor de cotización (lección de tu7.cl)
- No servir el catálogo completo sin adelgazar (ver 8.2) — es la causa directa de los 2,8 MB que tu7.cl carga en cada visita.
- El "precio desde" con factor 0.9 sin beneficiarios es una decisión de UX intencional de tu7.cl (nunca mostrar $0) — replicarla en `lib/pricing.ts`.

### Mercado Pago
- Nunca acreditar créditos desde el `back_url` del checkout — el usuario puede cerrar la pestaña antes de volver, o manipular la URL. El webhook es la única fuente de verdad.

---

## 14. Convenciones de Código

| Aspecto | Convención |
|---------|------------|
| Variables/Funciones | camelCase |
| Componentes | PascalCase |
| Archivos/Carpetas | kebab-case |
| Constantes | UPPER_SNAKE_CASE |
| Commits | `feat(F1-T1): description`, ya establecido en el proyecto |
| Max file length | 500 líneas |
| Max function length | 50 líneas |
| TypeScript `any` | NUNCA — usar `unknown` |

---

*Tech Spec generado con el pipeline de SaaS La Herrería*
*Pendiente aprobación antes de avanzar al siguiente skill*

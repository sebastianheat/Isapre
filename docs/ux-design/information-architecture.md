# Information Architecture — Marketplace de Leads nuevaisapre.cl

**Navigation pattern:** Bottom Nav (mobile-first, se muestra como barra superior equivalente en desktop) — mismo patrón que ya usa `/admin` hoy ("nav inferior con pill activa"), extendido a `/panel`.
**Source:** Derivado de las personas Rodrigo (mobile-first, modelo mental "inbox") y Cynthia (modelo mental "caja chica"), y de los epics de USER-STORIES-marketplace-leads.md.

El producto tiene **tres superficies** con reglas de IA distintas:

1. **Público — `/cotizador`, `/mi-cotizacion`, `/registro`:** sin nav persistente, es un funnel de conversión, no una app de sesión larga.
2. **`/panel` — ejecutivo (Rodrigo):** app autenticada, Bottom Nav de 5 secciones.
3. **`/admin` — superadmin (Cynthia):** app autenticada ya existente, se **extiende** (no se rediseña) con 2 secciones nuevas, respetando su Bottom Nav actual.

---

## Navigation Structure

```
[PÚBLICO — sin nav persistente]
/cotizador                     → Cotizador público
/cotizador/[slug]              → Cotización compartible
/mi-cotizacion                 → Recuperar cotización guardada
/registro                      → Registro de ejecutivo externo
/planes/[isapre]               → Página SEO (P2)

[/panel — Ejecutivo]
Inicio (Dashboard)
├── Saldo de créditos + alerta de saldo bajo
└── Resumen: leads hoy/semana/mes, tasa de conversión

Mis Leads
├── Bandeja (nuevo / en seguimiento / cerrado)
└── Detail: Ficha del lead [con cotización adjunta]

Cotizador
└── (mismo motor que el público, desbloqueado, sin límites)

Créditos
├── Comprar (packs disponibles)
└── Historial de compras

Perfil
├── Datos personales y de facturación
├── Cambio de contraseña
└── Interruptor "Recibir leads"

[/admin — Superadmin, YA EXISTE + extensión]
Leads (ya existe)
Pipeline (ya existe)
Métricas (ya existe, se amplía con métricas de negocio del marketplace)
Usuarios (ya existe, se amplía con saldo/estado de ejecutivos y aprobación)
Créditos (NUEVO)
├── Regalar créditos
├── Historial / Ledger
└── Packs (CRUD)
Reparto (NUEVO)
├── Sin asignar
├── Configuración del motor
└── Reembolsos
Perfil (ya existe)
```

**Profundidad máxima respetada: 3 niveles** (Sección → Sub-sección → Detalle, ej. `Mis Leads → Bandeja → Ficha del lead`).

---

## Section Definitions

### `/panel` → Inicio
**Mental model source:** Cynthia/Rodrigo — "necesito ver mi situación de un vistazo" (dashboard)
**Backbone activity:** Epic 7 (US-027)
**Contains:** Saldo, alerta de saldo bajo, resumen de leads del día/semana/mes
**Entry point:** Primera pantalla tras login

### `/panel` → Mis Leads
**Mental model source:** Rodrigo — modelo de **inbox** (leads nuevos arriba, marcados, se abren y se actúa)
**Backbone activity:** Epic 7 (US-028, US-029, US-030, US-031)
**Contains:** Bandeja de leads propios, ficha individual con cotización adjunta, calidad, reembolso
**Entry point:** Ítem de nav "Mis Leads"; también al hacer clic en la notificación de lead asignado

### `/panel` → Cotizador
**Mental model source:** Rodrigo — modelo de **calculadora en vivo**
**Backbone activity:** Epic 6
**Contains:** El mismo motor del cotizador público, sin límites, para cotizar clientes propios
**Entry point:** Ítem de nav "Cotizador"; también un acceso directo desde la ficha de un lead

### `/panel` → Créditos
**Mental model source:** Compra tipo e-commerce (no B2B pesado)
**Backbone activity:** Epic 9
**Contains:** Packs disponibles, checkout, historial de órdenes
**Entry point:** Ítem de nav "Créditos"; también el CTA de la alerta de saldo bajo en Inicio

### `/panel` → Perfil
**Contains:** Datos personales, facturación, contraseña, interruptor "recibir leads"
**Entry point:** Ítem de nav "Perfil"

### `/admin` → Créditos (nuevo)
**Mental model source:** Cynthia — modelo de **caja chica** (cada movimiento con motivo, respaldo visible)
**Backbone activity:** Epic 3, Epic 8 (US-009, US-010, US-034)
**Contains:** Formulario de regalo de créditos, historial/ledger legible, CRUD de packs
**Entry point:** Nuevo ítem de nav en `/admin`

### `/admin` → Reparto (nuevo)
**Mental model source:** Cynthia — cola de trabajo, no una tabla plana
**Backbone activity:** Epic 2, Epic 4, Epic 8 (US-005, US-006, US-016, US-036)
**Contains:** Cola de leads sin asignar (asignación de 1 clic), configuración global del motor, cola de reembolsos
**Entry point:** Nuevo ítem de nav en `/admin` — **es la sección más usada durante la Fase 0**, debe ser accesible en el primer nivel de nav, no anidada

---

## Labeling Decisions

| Label usado | Por qué | Alternativa rechazada | Por qué se rechazó |
|---|---|---|---|
| "Mis Leads" | Coincide con el lenguaje ya usado en `/admin` actual | "Bandeja", "Inbox" | El equipo ya dice "leads", no romper el vocabulario existente |
| "Créditos" | Es literalmente cómo el usuario piensa el saldo (ej. VPC, PDR) | "Ledger", "Saldo y transacciones" | Términos técnicos que Cynthia y Rodrigo no usan en su día a día |
| "Reparto" | Es el término que ya usa el prompt original y el Tech Spec | "Asignación", "Distribución" | "Reparto" es más natural en español chileno para este dominio |
| "Cotizador" | Ya es el nombre usado en el proyecto (`lib/cotizador.ts`, landing actual) | "Calculadora", "Simulador" | Mantener el término ya establecido en el producto |

## Navigation Rules (product-specific)

- El público (`/cotizador`, `/registro`, `/mi-cotizacion`) **nunca** muestra el Bottom Nav de las apps autenticadas — es un funnel, no una sesión de trabajo.
- "Reparto" en `/admin` debe estar en el primer nivel de navegación (no dentro de un submenú de "Configuración") mientras dure la Fase 0, porque es la pantalla más usada del día según el journey de Cynthia.
- El ítem de nav activo siempre se distingue visualmente (pill activa, ya establecido en `/admin`).

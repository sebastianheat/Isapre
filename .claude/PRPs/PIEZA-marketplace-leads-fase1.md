# La Pieza: Marketplace de Leads — Fase 1 (Reparto Manual Interno)

> **Estado**: PENDIENTE
> **Blueprint origen**: `BLUEPRINT-marketplace-leads.md` (Fase 1 de 8)
> **Fecha**: 2026-10-02
> **Build Mode**: 🏗️ SaaS Completo (scope acotado a la Fase 1 del Blueprint)

---

## Objetivo

Que Cynthia e Ingrid puedan repartir los leads del día entre ellas con créditos regalados, desde `/admin`, en 2 clics por lead — sobre el sistema actual (Upstash KV), sin tocar Postgres ni Mercado Pago. Es la base mínima operativa del marketplace; el resto (ledger real, motor automático, cotizador, pagos) son las Fases 2-8 del Blueprint.

## Por Qué

| Problema del Usuario | Cómo lo Resuelve |
|---|---|
| Hoy no hay registro de quién recibió qué lead ni por qué — asignación informal por email/memoria | Cola de "sin asignar" + asignación con 1 clic + ledger mínimo con motivo obligatorio |
| Si Cynthia asigna mal un lead, no hay forma de corregirlo | Botón "Reasignar" que devuelve el crédito al ejecutivo original (US-006b, agregado por la evaluación de usabilidad) |
| Riesgo de que dos leads casi simultáneos se asignen al mismo crédito | Lock atómico (`kvMarcarUnaVez`) en la asignación, incluso en esta versión manual |
| El export de conversiones a Google Ads es crítico para la campaña activa | Validación explícita byte a byte antes/después de los cambios de esta fase |

**Impacto medible**: Cynthia e Ingrid operando el marketplace en 2 días, sin esperar a la migración de 9 semanas, y sin arriesgar el export que alimenta la campaña activa (~3 leads/día, CPA $7.441).

## Qué

### Criterios de Éxito (Definition of Done)
- [ ] Cynthia asigna un lead a Ingrid (o a sí misma) en 2 clics desde `/admin/reparto`
- [ ] Un lead recién asignado se puede reasignar sin perder el crédito del ejecutivo original
- [ ] El saldo de créditos de cada ejecutivo es visible y auditable en menos de un minuto desde `/admin/creditos`
- [ ] El CSV de export de conversiones es byte-idéntico antes/después de los cambios, verificado en preview
- [ ] Cero regresiones en `/admin/leads` (calidad, etapa, notas siguen funcionando igual)
- [ ] Dos asignaciones casi simultáneas al mismo lead nunca lo asignan dos veces

### Happy Path
1. Entra un lead nuevo por el formulario público (sin cambios — ya existe).
2. Cynthia abre `/admin/reparto`, ve el lead en la cola "sin asignar", elige a Ingrid en el selector y confirma.
3. El lead pasa a "asignado", se descuenta 1 crédito del saldo de Ingrid, y queda un registro en el ledger mínimo con motivo.
4. Si Cynthia se equivoca, entra a la ficha del lead (`/admin/leads/[id]`) y usa "Reasignar" — el crédito vuelve a Ingrid y se descuenta del nuevo ejecutivo elegido.
5. Cynthia revisa `/admin/creditos` para ver el saldo de todos y regalar más créditos cuando haga falta.

---

## Contexto

### Referencias de Código (ya existente — extender, no reescribir)
- `lib/leads.ts` → modelo `Lead` actual (KV), ya tiene `asignadoA`, `etapa`, `calidad` — agregar `assignmentStatus`
- `lib/usuarios.ts` → modelo `Usuario` actual (KV), roles `superadmin`/`ejecutivo` ya implementados — agregar `recibiendoLeads`
- `lib/store.ts` → `kvMarcarUnaVez` ya existe, es el lock atómico a reutilizar para la asignación
- `app/admin/leads/[id]/page.tsx` → ficha de lead ya existente, se extiende con el botón "Reasignar"
- `app/admin/usuarios/page.tsx` → tabla de usuarios ya existente, se extiende con el toggle "Recibir leads"
- `app/api/admin/leads/export-offline/route.ts` + `lib/offline.ts` → export de conversiones, **no tocar la lógica**, solo validar que el output no cambia
- `docs/ui-design/screen-flows/reparto-manual-fase-0.md` → spec exacta de las pantallas de esta fase (layout, data, actions, states, acceptance targets)
- `BLUEPRINT-marketplace-leads.md`, sección "FASE 1" → fuente de verdad del alcance
- `USER-STORIES-marketplace-leads.md`, Epic 2 (US-005 a US-008, US-006b) y Epic 3 parcial (US-009, US-010) → acceptance criteria completos

### Arquitectura Propuesta

Este proyecto **no usa `src/features/`** — la convención real es `app/`, `lib/`, `components/` en la raíz (ver `TECH-SPEC-marketplace-leads.md`, sección 3.2). Esta Pieza respeta esa convención, no el template genérico Feature-First:

```
app/admin/
├── reparto/
│   └── page.tsx           ← NUEVO: cola de sin_asignar + selector de asignación
├── creditos/
│   ├── page.tsx           ← NUEVO: regalar créditos + tabla de saldos
│   └── [email]/page.tsx   ← NUEVO: historial de movimientos de un ejecutivo
└── leads/[id]/page.tsx    ← EXTENDER: botón "Reasignar"

lib/
├── leads.ts                ← EXTENDER: assignmentStatus, asignarLead(), reasignarLead()
├── usuarios.ts              ← EXTENDER: campo recibiendoLeads
└── credits-kv.ts            ← NUEVO: regalarCreditos(), obtenerSaldo(), listarMovimientos() — versión mínima sobre KV, se migra a Postgres en la Fase 2
```

### Modelo de Datos (KV, no SQL — por decisión explícita de esta fase)

Esta fase **no crea tablas SQL** — el Tech Spec es explícito en que la Fase 1 se queda sobre Upstash KV y la migración a Postgres es la Fase 2. Claves nuevas en KV:

```
lead:{id}                     → agrega campo "assignmentStatus": "sin_asignar" | "asignado"
leads:sin-asignar              → set de IDs de leads sin asignar (índice)
usuario:{email}                → agrega campo "recibiendoLeads": boolean
credito:{email}:saldo          → entero, saldo actual del ejecutivo
credito:{email}:movimientos    → lista de movimientos (fecha, tipo, cantidad, motivo, quien)
lock:asignacion:{leadId}       → usado vía kvMarcarUnaVez como lock atómico (TTL corto)
```

---

## Blueprint (Fases de Construcción)

> Subtareas se generan al entrar a cada fase (El Yunque). Estas 4 fases son el desglose ya definido en `BLUEPRINT-marketplace-leads.md` (subfases 1.1-1.4), mantenido aquí para no duplicar el documento.

### Fase 1.1: Extensión de `/admin` con la sección "Reparto"
**Objetivo**: Cola de leads sin asignar + asignación con 1 clic + reasignación, con lock atómico contra doble asignación.
**Validación**: Asignar un lead en `/admin/reparto` lo saca de la cola; reasignar desde la ficha devuelve el crédito correctamente.
**Tiempo estimado**: ~4h

### Fase 1.2: Extensión de `/admin` con la sección "Créditos" (mínima)
**Objetivo**: Regalar créditos con motivo obligatorio + ver saldo e historial por ejecutivo.
**Validación**: Regalar créditos actualiza el saldo visible de inmediato; el historial muestra fecha, tipo, cantidad, motivo y quién lo hizo.
**Tiempo estimado**: ~3h

### Fase 1.3: Interruptor "Recibir leads" + regresión de calidad
**Objetivo**: Un ejecutivo puede pausar si recibe leads; el selector de asignación solo muestra ejecutivos activos que lo tengan prendido.
**Validación**: Apagar el interruptor de Ingrid la saca del selector de `/admin/reparto`; el selector de calidad del lead sigue funcionando igual que antes.
**Tiempo estimado**: ~1.5h

### Fase 1.4: Validación Final — Export de Google Ads intacto
**Objetivo**: Confirmar que ningún cambio de esta fase afectó el export de conversiones.
**Validación**:
- [ ] `npm run test` → 0 errores (si se agregan tests de `lib/credits-kv.ts` y `lib/leads.ts`)
- [ ] `npx tsc --noEmit` → 0 errores
- [ ] CSV de `app/api/admin/leads/export-offline/route.ts` generado antes y después de esta fase, comparado byte a byte sobre el mismo set de leads — idéntico
- [ ] Cron semanal (`app/api/cron/export-semanal/route.ts`) revisado — sin cambios de comportamiento
- [ ] Todos los criterios de éxito de la sección "Qué" cumplidos
- [ ] Validación visual en navegador de `/admin/reparto` y `/admin/creditos` (Playwright o Claude in Chrome)

---

## 🔒 Auto-Blindaje

> Esta sección crece durante la implementación. Se actualiza cada vez que se encuentra y resuelve un error.

### 2026-09-07: `node_modules` vacío al reanudar sesión tras varios días
- **Error**: `npx tsc` resolvió a un paquete npm no relacionado ("This is not the tsc command you are looking for") porque `node_modules/` estaba vacío en el entorno de esta sesión.
- **Fix**: `npm install` antes de cualquier verificación de tipos al retomar trabajo después de una pausa larga.
- **Aplicar en**: Todas las fases futuras — verificar `node_modules` antes de confiar en `tsc`/`vitest` al reanudar.

---

## Gotchas (Antes de Implementar)

- [ ] El lock de asignación (`kvMarcarUnaVez` sobre `lock:asignacion:{leadId}`) es temporal — se reemplaza por `SELECT ... FOR UPDATE` en Postgres en la Fase 3. No invertir tiempo en hacerlo más sofisticado de lo necesario.
- [ ] **No tocar** `lib/offline.ts` ni la lógica de `export-offline/route.ts` — solo agregar el test de comparación, nunca modificar el formato del CSV.
- [ ] El saldo de créditos en esta fase vive en KV como un número simple + una lista de movimientos — no es el ledger append-only completo del Tech Spec (eso es Postgres, Fase 2). No sobre-ingenierizar esta parte.
- [ ] Confirmar antes de empezar si `ADMIN_SESSION_SECRET` ya fue rotado (quedó sin confirmar en la sesión anterior) — no bloquea esta fase, pero es bueno saberlo.
- [ ] `/admin` usa CSS plano (`admin.css`) — las pantallas nuevas de esta fase (`/admin/reparto`, `/admin/creditos`) deben seguir ese mismo estilo, **no** Tailwind (Tailwind se reserva para el cotizador y `/panel`, por decisión del Tech Spec).

## Anti-Patrones Forge

- ❌ NO crear tablas SQL en esta fase — es explícitamente sobre KV
- ❌ NO usar Tailwind en las pantallas nuevas de `/admin` — mantener `admin.css`
- ❌ NO tocar la lógica del export de conversiones, solo validarla
- ❌ NO usar `any` en TypeScript — esto incluye los nuevos tipos de `credits-kv.ts`
- ❌ NO omitir el lock atómico en la asignación aunque "total, somos solo 2 personas" — es justamente el hallazgo de la evaluación de usabilidad (Severidad 3) que agregó US-006b

---

*La Pieza pendiente aprobación. Ninguna línea de código ha sido modificada.*

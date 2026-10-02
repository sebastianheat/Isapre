# RESUMEN — Fase 1 marketplace-leads (Reparto Manual Interno)

Rama `forja/fase1-equilibrado`. 4 commits (`fase-1.1` … `fase-1.4`). Todo sobre Upstash KV; sin Postgres ni Mercado Pago.
No se tocó `app/cotizador/`, `components/cotizador/`, `/panel`, `lib/offline.ts` ni el export.

## Qué se implementó

**1.1 Reparto** — `lib/leads.ts` (`assignmentStatus`, `asignacionCobrada`, `estadoAsignacion`, `listarLeadsSinAsignar`),
`lib/reparto.ts` (`asignarLead`, `reasignarLead`, lock `lock:asignacion:{id}` con `kvMarcarUnaVez`),
`/admin/reparto` (cola más antigua primero, selector con saldo, advertencia "sin créditos → ¿asignar como regalo?",
aviso de doble asignación), botón Asignar/Reasignar en `/admin/leads/[id]` (US-006b), APIs `reparto/asignar` y `leads/[id]/reasignar`.

**1.2 Créditos** — `lib/credits-kv.ts` (`regalarCreditos`, `obtenerSaldo`, `listarMovimientos`, `descontarCredito`, `devolverCredito`, `recalcularSaldo`),
`/admin/creditos` (formulario con motivo obligatorio + tabla de saldos), `/admin/creditos/[email]` (saldo recalculado + historial), API `POST /api/admin/creditos`.

**1.3 Interruptor** — `recibiendoLeads` en `lib/usuarios.ts` (ausente = prendido), toggle en `/admin/usuarios` y `/admin/perfil`,
selector de reparto/ficha solo con ejecutivos activos, y validación también en el servidor.

**1.4 Validación** — ver abajo.

## Decisiones (resumen; detalle en DECISIONES.md, 23 entradas)
- `kvMarcarUnaVez` pasó a `SET NX EX` (el original no era atómico); nuevos `kvIncrBy/kvLPush/kvLRange` que no caen a memoria.
- `asignarLead/reasignarLead` en `lib/reparto.ts` (leads.ts quedó en 499/500 líneas).
- Cola derivada de `listarLeads` (sin índice `leads:sin-asignar`); excluye ganado/perdido.
- `asignacionCobrada`: reasignar solo devuelve crédito si se cobró.
- `PATCH /leads/[id]` ya no acepta `asignadoA` (evitaba lock y créditos).
- Ledger sin PII (guarda `leadId`, no el nombre).

## Estado de verificación
| Check | Resultado |
|---|---|
| `npm run test` | 6 archivos, **53 tests OK** (credits-kv, reparto incl. carrera de doble asignación, usuarios, fecha-relativa, offline golden) |
| `npx tsc --noEmit` | 0 errores |
| `npm run build` (única vez, al final) | OK; `.next` = 309 MB |
| CSV export antes/después | **Idénticos byte a byte** (sha1 `c941a57aa4594084e9161c75c249b46a48dc6886` ambos; `cmp` sin diferencias). `lib/offline.ts`, `export-offline/route.ts` y `cron/export-semanal` sin diff vs. el commit base |
| Navegador (Playwright, build de producción, KV en memoria) | Cola, asignar (saldo 3→2), advertencia sin saldo + confirmar como regalo, reasignar (crédito devuelto: Ingrid 3), motivo vacío rechazado, selector de calidad funcionando, el lead calificado aparece en el export |

Disco: sandbox bien bajo 2 GB; no se ejecutó `npm install`.

## Deuda técnica / para la Fase 2
- Los datos de KV (saldos, movimientos, `assignmentStatus`, `asignacionCobrada`) migran a Postgres (T-3.1.2): mapear `cantidad` con signo a `credit_transactions` y `leadId`.
- Rollback no transaccional: si falla Upstash entre cobrar y guardar se compensa en código; si falla la devolución al original tras reasignar queda un error en log (el historial muestra la divergencia con el aviso de saldo). Postgres lo resuelve con transacción.
- El lock con TTL de 15 s y `kvDel` reemplaza `SELECT … FOR UPDATE` en la Fase 3.
- `listarLeads` limita a 500 y hace GET secuenciales: la cola crecerá en costo; el índice real llega con Postgres.
- Sin tests de las rutas API ni de componentes (requieren mock de sesión); la lógica vive en `lib/` y sí está cubierta.
- Pendiente (fuera de esta Fase, del Pieza): confirmar rotación de `ADMIN_SESSION_SECRET` y `ADMIN_SEED_PASSWORD`/`ADMIN_SEED_FORCE` en Vercel; el banner de "contraseña por defecto" apareció en las pruebas.
- Validación pendiente en preview real de Vercel (Upstash real): el CSV "antes/después" se verificó sobre KV en memoria con un set fijo de leads.
- Nav inferior con 7 ítems para superadmin: revisar en móvil real.
- Estado `activo/suspendido` del usuario (Epic 1) no existe aún: "ejecutivo activo" = existe + `recibiendoLeads`.

# Screen Flow: Extensión de `/admin` para el Marketplace

**Epic:** 1 (Aprobación de ejecutivos), 8 (resto: packs, órdenes, reembolsos, métricas, config de reparto)
**Persona objetivo:** Cynthia (superadmin)
**Dispositivo primario:** Desktop en horario de oficina, celular para revisar fuera de horario

```
/admin/usuarios (extendido) ──[filtro "pendiente_aprobacion"]──▶ Aprobar/Rechazar
        │
        └──[clic en ejecutivo]──▶ Detalle: saldo, leads, forzar pausa, daily_cap

/admin/reparto/config ──[ajustar parámetros]──▶ Guardado inline
/admin/creditos/packs ──[CRUD]──▶ Lista actualizada
/admin/creditos/ordenes ──[filtros]──▶ Detalle de orden
/admin/reparto/reembolsos ──[aprobar/rechazar]──▶ Crédito devuelto (si aprueba)
/admin/metricas (extendido) ──▶ Métricas de negocio del marketplace
```

---

### Pantalla: `/admin/usuarios` — Extensión con aprobación

**Entry from:** Ya existe; se extiende
**Story refs:** US-003, US-004, US-033

#### Layout
Se agrega un filtro por `estado` (Todos / Pendiente de aprobación / Activo / Suspendido) a la tabla ya existente, más columnas de saldo y `daily_cap`.

#### Data Displayed
| Elemento | Fuente | Formato |
|----------|--------|---------|
| Estado del ejecutivo | `usuario.estado` | Badge |
| Saldo | `usuario.creditos_saldo` | `CreditBalance` |
| Leads recibidos hoy | Conteo de `lead` | Número |

#### Actions
| Acción | Control | Resultado |
|--------|---------|-----------|
| Aprobar / Rechazar | Botones en la fila de un pendiente | `estado='activo'` o rechazo con motivo (US-003) |
| Suspender / Reactivar | Botón en la fila de un activo/suspendido | Cambia `estado` (US-004) |
| Editar `daily_cap` | Campo inline editable | Actualiza `usuario.daily_cap` |

#### States
- **Empty (sin pendientes):** al filtrar por "Pendiente de aprobación" y no haber ninguno: "No hay cuentas esperando aprobación."

---

### Pantalla: `/admin/creditos/packs` — CRUD de packs

**Entry from:** Nav "Créditos" → sub-sección "Packs"
**Story refs:** US-034

#### Layout
Tabla de packs existentes + botón "Nuevo pack" que abre un formulario inline/modal.

#### Data Displayed
| Elemento | Fuente | Formato |
|----------|--------|---------|
| Packs | `credit_pack` | Nombre, créditos, precio, activo/inactivo, orden, badge |

#### Actions
| Acción | Control | Resultado |
|--------|---------|-----------|
| Crear/editar pack | Formulario (nombre, créditos, precio, badge, orden) | Valida créditos>0 y precio>0 |
| Activar/desactivar | Toggle | No borra el pack (por historial de órdenes existentes) |

---

### Pantalla: `/admin/creditos/ordenes` — Ver órdenes y pagos

**Entry from:** Nav "Créditos" → sub-sección "Órdenes"
**Story refs:** US-035

#### Layout
Tabla filtrable por fecha y ejecutivo, con total facturado del mes destacado arriba.

#### Data Displayed
| Elemento | Fuente | Formato |
|----------|--------|---------|
| Órdenes | `orden` | Fecha, ejecutivo, pack, monto, estado, `payment_id` |
| Total facturado del mes | Suma de órdenes `approved` del mes | Número destacado |

---

### Pantalla: `/admin/reparto/reembolsos` — Cola de reembolsos

**Entry from:** Nav "Reparto" → sub-sección "Reembolsos"
**Story refs:** US-036

#### Layout
Lista de `reembolso_solicitud` pendientes, con el motivo del ejecutivo visible sin entrar al detalle.

#### Actions
| Acción | Control | Resultado |
|--------|---------|-----------|
| Aprobar | Botón | Devuelve 1 crédito al ejecutivo, marca lead `invalidado`, marca solicitud `aprobado` (transacción, US-036) |
| Rechazar | Botón con motivo opcional | Marca solicitud `rechazado`, no hay cambio de crédito |

#### States
- **Empty:** "No hay solicitudes de reembolso pendientes."

---

### Pantalla: `/admin/reparto/config` — Configuración global del motor

**Entry from:** Nav "Reparto" → sub-sección "Configuración"
**Story refs:** US-016

#### Layout
Formulario simple: toggle ON/OFF, campos numéricos, selector de fuentes repartidas.

#### Data Displayed
| Elemento | Fuente | Formato |
|----------|--------|---------|
| Config actual | `reparto_config` (fila única) | Formulario prellenado |

#### Actions
| Acción | Control | Resultado |
|--------|---------|-----------|
| Guardar cambios | Botón "Guardar" | Actualiza `reparto_config`, confirmación inline |

---

### Pantalla: `/admin/metricas` — Extensión con métricas de negocio

**Entry from:** Ya existe; se extiende
**Story refs:** US-037

#### Layout
Se agregan nuevas secciones a la vista ya existente: ingresos por venta de créditos, créditos vendidos vs. consumidos vs. regalados, saldo total en circulación, costo por lead vs. precio de venta, ranking de ejecutivos por tasa de cierre.

#### Data Displayed
| Elemento | Fuente | Formato |
|----------|--------|---------|
| Ingresos por créditos | Suma de `orden.monto_clp` aprobadas | Número + gráfico simple |
| Créditos vendidos/consumidos/regalados | Agregación de `credit_transactions` por tipo | Gráfico de barras |
| Ranking de ejecutivos | Tasa de cierre (`etapa='ganado'` / total) | Tabla ordenada |

---

## Component Selection

| Componente | Decisión | Dónde vive |
|---|---|---|
| `StatusBadge` | Reutilizado (ya especificado en `reparto-manual-fase-0.md`) | `docs/ui-design/components/status-badge.md` |
| `CreditBalance` | Reutilizado (ya especificado en `panel-ejecutivo.md`) | `docs/ui-design/components/credit-balance.md` |
| Tabla con filtros | Componer con `Table`/`Select` de shadcn/ui | Inline |

---

## Acceptance Targets: Extensión de `/admin`

### Usuarios
- [ ] Debo poder filtrar la tabla de usuarios por estado (pendiente/activo/suspendido)
- [ ] Al aprobar un ejecutivo pendiente, su estado debe cambiar a "activo" inmediatamente en la tabla

### Packs
- [ ] Debo poder crear un pack con créditos > 0 y precio > 0
- [ ] Un pack desactivado no debe aparecer en `/panel/creditos` pero sí en el historial de órdenes que ya lo usaron

### Reembolsos
- [ ] Al aprobar una solicitud, el crédito debe devolverse al ejecutivo y el lead debe marcarse "invalidado"
- [ ] Si no hay solicitudes pendientes, debo ver "No hay solicitudes de reembolso pendientes"

### Configuración de reparto
- [ ] Debo poder prender/apagar el reparto automático y ver el cambio reflejado de inmediato

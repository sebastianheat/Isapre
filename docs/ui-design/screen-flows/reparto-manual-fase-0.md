# Screen Flow: Reparto Manual de Leads (Fase 0)

**Epic:** 2 (Reparto Manual), parte de 3 (Ledger mínimo) y 8 (extensión `/admin`)
**Persona objetivo:** Cynthia (superadmin + ejecutiva)
**Dispositivo primario:** Desktop en horario de oficina, celular fuera de horario (persona Cynthia)

```
/admin/reparto (Sin asignar) ──[clic en selector]──▶ Confirmación inline ──▶ lead desaparece de la cola
        │
        └──[clic en "regalar créditos"]──▶ /admin/creditos (Regalar) ──▶ /admin/creditos (Historial)

/admin/leads/[id] (lead ya asignado) ──[clic "Reasignar"]──▶ Confirmación inline ──▶ saldo actualizado en ambos ejecutivos
```

---

### Pantalla: `/admin/reparto` — Sin asignar

**Entry from:** Nav "Reparto" en `/admin` (nuevo ítem, primer nivel)
**Story refs:** US-005 (ver cola), US-006 (asignar 1 clic)

#### Layout
Lista vertical, más antiguo primero. Cada fila: nombre del prospecto, canal (chip), fecha relativa ("hace 12 min"), selector de ejecutivo activo a la derecha. Sin sidebar de filtros — la cola completa siempre es corta y se revisa entera.

#### Data Displayed
| Elemento | Fuente | Formato |
|----------|--------|---------|
| Nombre del prospecto | `lead.nombre` | Texto |
| Canal | `lead.canal` | Chip de color (google-ads/meta-ads/web-organico/whatsapp) |
| Fecha de ingreso | `lead.fecha` | Relativa ("hace 12 min", "hace 2h") |
| Selector de ejecutivo | `usuario` donde `estado='activo'` y `recibiendo_leads=true` | Dropdown con nombre + saldo entre paréntesis |

#### Actions
| Acción | Control | Resultado |
|--------|---------|-----------|
| Elegir ejecutivo y confirmar | Dropdown + botón "Asignar" | Lead pasa a `asignado`, desaparece de la lista (US-006) |
| Ver ficha completa del lead | Clic en la fila (fuera del selector) | Navega a `/admin/leads/[id]` |

#### States
- **Default:** lista poblada, ordenada por antigüedad.
- **Empty:** "Todos los leads están asignados 🎉" (ver `docs/ux-design/onboarding.md`) — sin CTA, es un estado positivo.
- **Error (asignación falló por saldo insuficiente):** inline warning antes de confirmar: "Este ejecutivo no tiene créditos. ¿Asignar igual como regalo?" con botones Confirmar/Cancelar.
- **Error (doble asignación):** la fila ya no existe cuando se intenta confirmar → toast: "Este lead ya fue asignado a [nombre]".
- **Loading:** el botón "Asignar" muestra spinner inline mientras confirma (< 500ms esperado).

---

### Pantalla: `/admin/leads/[id]` — Ficha del lead (extensión para reasignar)

**Entry from:** Clic en fila de `/admin/reparto`, o desde la lista general de leads (ya existente)
**Story refs:** US-006b (reasignar)

#### Layout
Se extiende la ficha ya existente: se agrega un botón "Reasignar" junto al badge de ejecutivo asignado actual, visible solo para `superadmin`.

#### Data Displayed
| Elemento | Fuente | Formato |
|----------|--------|---------|
| Ejecutivo asignado actual | `lead.asignado_a` | Nombre + badge |

#### Actions
| Acción | Control | Resultado |
|--------|---------|-----------|
| Reasignar | Botón "Reasignar" → dropdown de ejecutivo activo → confirmar | Devuelve 1 crédito al ejecutivo original, descuenta 1 del nuevo, actualiza `asignado_a` (US-006b) |

#### States
- **Default:** botón "Reasignar" visible junto al ejecutivo actual.
- **Confirmación:** modal simple con el nuevo ejecutivo elegido y el motivo ya prellenado ("corrección de asignación").
- **Success:** toast "Reasignado a [nombre]" + badge actualizado inmediatamente.

---

### Pantalla: `/admin/creditos` — Regalar créditos

**Entry from:** Nav "Créditos" en `/admin`, o desde el warning de saldo insuficiente en `/admin/reparto`
**Story refs:** US-009

#### Layout
Formulario simple arriba (ejecutivo, cantidad, motivo), tabla de ejecutivos con su saldo actual debajo.

#### Data Displayed
| Elemento | Fuente | Formato |
|----------|--------|---------|
| Lista de ejecutivos + saldo | `usuario.creditos_saldo` | Tabla, ordenada alfabéticamente |

#### Actions
| Acción | Control | Resultado |
|--------|---------|-----------|
| Regalar créditos | Formulario (ejecutivo, cantidad, motivo obligatorio) + botón "Regalar" | Suma al saldo, crea registro en el ledger mínimo (US-009), navega a Historial del ejecutivo |

#### States
- **Validación:** motivo vacío → "Escribe un motivo para este movimiento" inline.
- **Success:** tras confirmar, la tabla de saldos se actualiza inmediatamente y se navega a la vista de Historial de ese ejecutivo mostrando el movimiento recién creado.

---

### Pantalla: `/admin/creditos/[usuarioId]` — Historial de un ejecutivo

**Entry from:** Clic en un ejecutivo de la tabla de `/admin/creditos`, o tras confirmar un regalo de créditos
**Story refs:** US-010

#### Layout
Encabezado con saldo actual grande, lista cronológica de movimientos debajo (más reciente primero).

#### Data Displayed
| Elemento | Fuente | Formato |
|----------|--------|---------|
| Saldo actual | Recalculado desde el historial | Número grande |
| Movimientos | Historial de créditos | Fecha, tipo (badge), cantidad (+/-), motivo, quién lo hizo |

#### States
- **Empty:** "Sin créditos registrados todavía" + CTA "Regalar créditos" (ver onboarding.md).
- **Default:** lista completa, auditable en menos de un minuto (criterio del journey de Cynthia).

---

## Component Selection

| Componente | Decisión | Dónde vive |
|---|---|---|
| `LeadQueueRow` | Nuevo — se repite en la cola sin_asignar | `docs/ui-design/components/lead-queue-row.md` |
| `StatusBadge` | Nuevo — se repite en lead, orden, cuenta de ejecutivo | `docs/ui-design/components/status-badge.md` |
| Dropdown de ejecutivo | Componer con `Select` de shadcn/ui | Inline, no requiere spec propio |
| Formulario de regalo de créditos | Componer con `Input`/`Textarea`/`Button` de shadcn/ui | Inline |

---

## Acceptance Targets: Reparto Manual de Leads (Fase 0)

### `/admin/reparto` — Sin asignar
- [ ] Debo ver la lista de leads sin asignar ordenada del más antiguo al más reciente
- [ ] Cada fila debe mostrar nombre, canal y fecha relativa
- [ ] El selector de ejecutivo debe mostrar solo ejecutivos con `estado='activo'` y `recibiendo_leads=true`
- [ ] Al confirmar una asignación, el lead debe desaparecer de la lista
- [ ] Si no hay leads sin asignar, debo ver "Todos los leads están asignados 🎉"
- [ ] Si el ejecutivo elegido no tiene saldo, debo ver la advertencia "Este ejecutivo no tiene créditos. ¿Asignar igual como regalo?" antes de confirmar
- [ ] Si el lead ya fue asignado por otra acción simultánea, debo ver "Este lead ya fue asignado a [nombre]"

### `/admin/leads/[id]` — Reasignar
- [ ] Debo ver un botón "Reasignar" junto al ejecutivo asignado actual (solo si soy superadmin)
- [ ] Al reasignar, el crédito debe devolverse al ejecutivo original y descontarse del nuevo
- [ ] Debo ver un toast de confirmación con el nombre del nuevo ejecutivo

### `/admin/creditos` — Regalar créditos
- [ ] Debo poder elegir un ejecutivo, ingresar una cantidad y un motivo
- [ ] Si el motivo está vacío, debo ver "Escribe un motivo para este movimiento" al intentar confirmar
- [ ] Tras confirmar, debo ver el nuevo saldo reflejado en la tabla de ejecutivos

### `/admin/creditos/[usuarioId]` — Historial
- [ ] Debo ver el saldo actual y la lista de movimientos ordenada del más reciente al más antiguo
- [ ] Si no hay movimientos, debo ver "Sin créditos registrados todavía" y un botón "Regalar créditos"

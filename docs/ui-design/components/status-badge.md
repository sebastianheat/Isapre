# Component: StatusBadge

**Usado en:** `/admin/reparto`, `/admin/leads/[id]`, `/panel/leads`, `/panel/leads/[id]`, `/admin/usuarios`, `/admin/creditos/ordenes`
**Regla de origen:** Component Selection — aparece en más de una pantalla → componente nuevo con spec propio.

## Propósito
Mostrar el estado de una entidad (lead, cuenta de ejecutivo, orden) de forma visualmente consistente en todo el producto — nunca el nombre técnico interno, siempre la etiqueta que coincide con el modelo mental del usuario (ver `docs/ux-design/interaction-patterns.md`, Patrón 5).

## Variantes por entidad

| Entidad | Estado interno | Label mostrado | Color semántico |
|---|---|---|---|
| Lead (`assignment_status`) | `sin_asignar` | "Sin asignar" | Neutro |
| Lead (`assignment_status`) | `asignado` | "Asignado" | Éxito |
| Lead (`assignment_status`) | `invalidado` | "Invalidado" | Advertencia |
| Usuario (`estado`) | `pendiente_aprobacion` | "Pendiente de aprobación" | Neutro |
| Usuario (`estado`) | `activo` | "Activo" | Éxito |
| Usuario (`estado`) | `suspendido` | "Suspendido" | Error |
| Orden (`estado`) | `pending` | "Procesando pago" | Neutro |
| Orden (`estado`) | `approved` | "Acreditado" | Éxito |
| Orden (`estado`) | `rejected` | "Rechazado" | Error |
| Orden (`estado`) | `refunded` / `charged_back` | "Reembolsado" | Advertencia |

## Comportamiento
- Solo lectura — no es interactivo por sí mismo (las acciones de cambio de estado viven en botones separados, nunca en el badge).
- El color es siempre semántico (nunca decorativo) — coincide con la regla de "Acceptance Targets: no testear colores exactos salvo que tengan significado semántico".

## Acceptance Targets
- [ ] El badge nunca debe mostrar el valor técnico interno (ej. `pending`), siempre el label en español definido arriba
- [ ] El color debe corresponder a la categoría semántica (neutro/éxito/advertencia/error) de la tabla

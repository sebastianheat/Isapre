# Interaction Patterns — Marketplace de Leads nuevaisapre.cl

Reglas de comportamiento válidas en todo el producto (público, `/panel`, `/admin`). Ningún formulario ni componente se comporta distinto de lo que aquí se define.

---

## 1. Feedback Loops

| Acción | Feedback esperado | Por qué |
|---|---|---|
| Cambiar edad/filtro en el cotizador | Instantáneo (< 100ms), sin spinner | Rodrigo y Marcela esperan una "calculadora en vivo" (modelo mental de ambos) — cualquier loading rompe la ilusión |
| Asignar lead a mano (`/admin/reparto`) | Inmediato — el lead desaparece de la cola sin_asignar apenas se confirma | Cynthia necesita confirmación instantánea, lo hace decenas de veces al día |
| Regalar créditos | Inmediato — nuevo saldo y registro visibles apenas se confirma | Refuerza el modelo de "caja chica" de Cynthia — sin esto, duda de si funcionó |
| Comprar créditos (checkout Mercado Pago) | Loading inmediato al confirmar → redirección → estado "procesando" visible hasta que el webhook confirme | Pain point del journey de Rodrigo: no saber si el pago "quedó en el limbo" |
| Notificación de lead asignado | Email + WhatsApp en el mismo flujo de la asignación (no cron diario) | Requisito no negociable — Pain Point #1 del journey de Rodrigo |
| Marcar calidad de un lead | Actualización visual inmediata del badge de calidad | Ya es el comportamiento actual, se mantiene |

**Regla:** ningún proceso de más de 5 segundos ocurre sin feedback visible — ni siquiera el checkout de Mercado Pago (se muestra "procesando", nunca una pantalla congelada).

---

## 2. Form Behavior

- **Validación:** on blur para campos individuales (email, RUT, teléfono); on submit para validación cruzada (ej. daily_cap > 0).
- **Errores inline**, debajo del campo, con mensaje específico: "El RUT ingresado no es válido", nunca "Campo inválido".
- Al fallar el submit, el foco va al primer campo con error y **los datos ya ingresados se conservan** — ningún formulario del producto limpia el formulario en un error (aplica especialmente al registro de ejecutivo, US-001, y al cotizador público, que Marcela abandonaría si tuviera que reingresar todo).
- **Éxito:** el formulario transiciona a la vista de resultado — el cotizador muestra los planes en la misma pantalla, el registro muestra "revisa tu correo", el regalo de créditos muestra el nuevo saldo.

---

## 3. Progressive Disclosure

| Contexto | Nivel 1 (default) | Nivel 2 (expandido) | Nivel 3 (avanzado) |
|---|---|---|---|
| Cotizador público | Edad, renta, región, cargas | Filtros por isapre/zona/tipo/cobertura (facetas) | — |
| Registro de ejecutivo | Nombre, email, teléfono, RUT | Isapre(s) que representa, código de agente (opcional) | — |
| `/admin/reparto` configuración | Toggle on/off del motor automático | `antiguedad_max_backlog_horas`, `daily_cap_default` | `fuentes_repartidas` (qué canales se reparten) |
| Ficha del lead | Datos de contacto + cotización adjunta | Notas y recordatorios | Historial de accesos (Ley 21.719, solo superadmin) |

**Regla:** el cotizador público nunca muestra los filtros avanzados antes de que Marcela vea al menos un resultado — mostrar 3 planes con el mínimo de datos es el nivel 1 obligatorio.

---

## 4. Error Recovery

| Categoría | Tratamiento en este producto |
|---|---|
| Validación (RUT/email/teléfono inválido) | Inline, datos conservados, foco en el campo — igual en todo el producto |
| Not found (lead ajeno, cotización inexistente) | "No encontramos [X]" + acción siguiente clara (ej. "Cotiza acá" en `/mi-cotizacion`) — nunca una página en blanco |
| Permission denied (ejecutivo intenta ver lead ajeno) | 403/404 explícito, no un error genérico — se testea explícitamente por requisito de seguridad del Tech Spec |
| Server error (falla la BD, falla Mercado Pago) | Mensaje humano + botón de reintentar; en el checkout, la orden queda visible en estado `pending` sin perder el intento de compra |
| Doble asignación (dos leads casi simultáneos) | La segunda acción ve "Este lead ya fue asignado a [nombre]" — nunca falla en silencio ni deja el lead en un estado ambiguo |
| Webhook de Mercado Pago duplicado | Invisible para el usuario — el sistema absorbe el duplicado por idempotencia, sin doble cobro visible |

**Regla transversal:** ningún error del producto culpa al usuario ni lo deja sin una acción siguiente clara — aplica igual a Marcela cotizando que a Cynthia asignando leads.

---

## 5. State Transitions

| Entidad | Estados visibles al usuario | Acción etiquetada con el resultado |
|---|---|---|
| Lead (`assignment_status`) | "Sin asignar" / "Asignado" / "Invalidado" | "Asignar a [nombre]", no solo "Confirmar" |
| Lead (`etapa`, ya existente) | Nuevo, Contactando, Cotización enviada, Pendiente respuesta, Agendado, Ganado, Perdido | Se mantiene el modelo actual, sin cambios |
| Cuenta de ejecutivo (`estado`) | Pendiente de aprobación / Activo / Suspendido | "Aprobar cuenta", "Suspender cuenta" |
| Orden de compra (`estado`) | Pendiente / Aprobado / Rechazado / Reembolsado / Contracargo | El ejecutivo ve "Procesando pago" mientras está `pending`, nunca el nombre técnico del estado |
| Solicitud de reembolso | Pendiente / Aprobado / Rechazado | "Aprobar reembolso" devuelve el crédito visiblemente en el mismo flujo |

**Regla:** el estado interno del sistema (ej. los 7 valores de `etapa`) no se le muestra completo a quien no lo necesita — Rodrigo ve solo lo accionable en su bandeja (nuevo/en seguimiento/cerrado), tal como reveló el modelo mental de "inbox" en el UX Research.

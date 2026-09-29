# Screen Flow: Panel del Ejecutivo (`/panel`)

**Epic:** 6 (Cotizador del Ejecutivo), 7 (Panel del Ejecutivo)
**Persona objetivo:** Rodrigo (primaria)
**Dispositivo primario:** Mobile-first, con expansión a desktop en horario de oficina (persona Rodrigo)

```
/panel (Inicio/Dashboard) ──[nav "Mis Leads"]──▶ /panel/leads (bandeja) ──[clic en un lead]──▶ /panel/leads/[id] (ficha)
        │                                                                                            │
        │                                                                                    [reportar inválido]──▶ confirmación
        │
        ├──[nav "Cotizador"]──▶ /panel/cotizador (mismo motor, desbloqueado) ──[enviar]──▶ WhatsApp/correo externo
        │
        ├──[nav "Créditos" o CTA de saldo bajo]──▶ /panel/creditos (packs) ──[comprar]──▶ Mercado Pago externo ──▶ vuelve a /panel/creditos (estado)
        │
        └──[nav "Perfil"]──▶ /panel/perfil
```

---

### Pantalla: `/panel` — Inicio (Dashboard)

**Entry from:** Login exitoso, primer ítem del Bottom Nav
**Story refs:** US-027

#### Layout
Mobile: tarjeta de saldo arriba (grande, con alerta si ≤3 créditos), debajo 3 números clave (leads hoy/semana/mes), debajo tasa de conversión por etapa.

#### Data Displayed
| Elemento | Fuente | Formato |
|----------|--------|---------|
| Saldo de créditos | `usuario.creditos_saldo` | Número grande + label |
| Leads hoy/semana/mes | Conteo de `lead` por `asignado_a` | 3 números en fila |
| Tasa de conversión | Agregación por `etapa` | Barra o porcentaje simple |

#### Actions
| Acción | Control | Resultado |
|--------|---------|-----------|
| Comprar créditos | CTA en la alerta de saldo bajo | Navega a `/panel/creditos` |
| Ver mis leads | Tarjeta de "Leads hoy" clickeable | Navega a `/panel/leads` |

#### States
- **Empty (sin leads todavía):** ver `docs/ux-design/onboarding.md` — CTA a "Cotizador", no a "Comprar créditos".
- **Alerta de saldo bajo:** visible solo si `creditos_saldo <= 3`, con color de advertencia (no error) y CTA directo.

---

### Pantalla: `/panel/leads` — Mis Leads (bandeja)

**Entry from:** Nav "Mis Leads", notificación de lead asignado, tarjeta de Inicio
**Story refs:** US-028

#### Layout
Bandeja tipo inbox (modelo mental de Rodrigo): leads nuevos destacados arriba con indicador, buscador + filtros por etapa/calidad/canal encima de la lista.

#### Data Displayed
| Elemento | Fuente | Formato |
|----------|--------|---------|
| Fila de lead | `lead` filtrado por `asignado_a = mi id` | Nombre, etapa (badge), fecha, indicador "nuevo" si no se ha abierto |

#### Actions
| Acción | Control | Resultado |
|--------|---------|-----------|
| Abrir lead | Clic en la fila | Navega a `/panel/leads/[id]`, registra evento en `acceso_log` (US-045) |
| Filtrar | Chips de etapa/calidad/canal | Lista se filtra |

#### States
- **Empty:** "Todavía no tienes leads asignados" + CTA "Cotizar para un cliente propio" (ver onboarding.md).
- **Permission denied (URL directa a lead ajeno):** 403/404 explícito — nunca redirige silenciosamente.

---

### Pantalla: `/panel/leads/[id]` — Ficha del lead

**Entry from:** Clic en la bandeja
**Story refs:** US-029, US-030, US-031

#### Layout
Header con datos del prospecto y botones de acción (WhatsApp, llamar). Debajo, sección "Cotización" con los planes que vio el prospecto. Debajo, notas/recordatorios y selector de etapa/calidad.

#### Data Displayed
| Elemento | Fuente | Formato |
|----------|--------|---------|
| Datos del prospecto | `lead` | Edad, renta, región, cargas, isapre actual, clínica preferida |
| Cotización adjunta | `lead.cotizacion_id` → `cotizacion` | Mismas tarjetas de plan que vio el prospecto (`PlanCard` reutilizado) |
| Etapa / Calidad | `lead.etapa`, `lead.calidad` | Selectores, con explicación breve de por qué importa marcar calidad rápido |

#### Actions
| Acción | Control | Resultado |
|--------|---------|-----------|
| Contactar por WhatsApp | Botón con mensaje precargado | Abre `wa.me` externo |
| Marcar calidad | Selector | Actualiza `lead.calidad` (US-030) |
| Reportar lead inválido | Botón "Reportar lead inválido" (visible solo dentro de 48h desde `assigned_at`) | Abre formulario de motivo → crea `reembolso_solicitud` (US-031) |

#### States
- **Fuera de la ventana de 48h:** botón "Reportar lead inválido" reemplazado por texto: "Ya pasó el plazo para reclamar este lead".
- **Reclamo ya enviado:** botón reemplazado por badge "Reclamo en revisión".

---

### Pantalla: `/panel/cotizador` — Cotizador del ejecutivo

**Entry from:** Nav "Cotizador", acceso directo desde la ficha de un lead
**Story refs:** US-024, US-025, US-026

#### Layout
Mismo layout que `/cotizador` público (reutiliza `CotizadorShell`), sin el LeadGate — todo desbloqueado desde el inicio, con botones adicionales de envío.

#### Actions
| Acción | Control | Resultado |
|--------|---------|-----------|
| Enviar por WhatsApp | Botón con mensaje precargado | Abre `wa.me` externo (US-025) |
| Enviar por correo | Botón | Envía vía Resend (US-025) |
| Descargar PDF | Botón (P2) | Genera y descarga PDF comparativo (US-026) |

#### States
- Igual que `/cotizador` público, sin el modal de LeadGate.

---

### Pantalla: `/panel/creditos` — Comprar créditos

**Entry from:** Nav "Créditos", CTA de saldo bajo
**Story refs:** US-038, US-039, US-048

#### Layout
Grid de packs (badge "más vendido" si aplica), historial de órdenes debajo.

#### Data Displayed
| Elemento | Fuente | Formato |
|----------|--------|---------|
| Packs activos | `credit_pack` donde `activo=true` | Tarjeta con créditos, precio, badge |
| Historial de órdenes | `orden` donde `usuario_id = mi id` | Fecha, pack, monto, estado |

#### Actions
| Acción | Control | Resultado |
|--------|---------|-----------|
| Comprar pack | Botón "Comprar" en la tarjeta | Crea orden `pending`, redirige a Mercado Pago (US-038, US-039) |
| Verificar estado | Botón visible solo en órdenes `pending` | Consulta la API de Mercado Pago y actualiza el estado (US-048) |

#### States
- **Empty (sin compras):** "Aún no has comprado créditos" + link "El cotizador es gratis, no necesitas créditos para usarlo" (onboarding.md).
- **Orden `pending`:** badge "Procesando pago" + botón "Verificar estado".
- **Orden rechazada:** muestra el motivo de rechazo de Mercado Pago cuando esté disponible + sugerencia "Intenta con otra tarjeta o medio de pago" (resuelve violación Severidad 2 del Skill #6).

---

### Pantalla: `/panel/perfil`

**Entry from:** Nav "Perfil"
**Story refs:** US-032, US-007

#### Data Displayed
| Elemento | Fuente | Formato |
|----------|--------|---------|
| Datos personales y de facturación | `usuario` | Formulario editable |
| Interruptor "Recibir leads" | `usuario.recibiendo_leads` | Toggle |

#### Actions
| Acción | Control | Resultado |
|--------|---------|-----------|
| Guardar cambios | Botón "Guardar" | Actualiza `usuario` |
| Cambiar contraseña | Sección aparte con verificación de contraseña actual | Actualiza `password_hash` |

---

## Component Selection

| Componente | Decisión | Dónde vive |
|---|---|---|
| `LeadInboxRow` | Nuevo — bandeja de leads, reutiliza `StatusBadge` | `docs/ui-design/components/status-badge.md` (badge) + inline (fila) |
| `CreditBalance` | Nuevo — se repite en Inicio, header del panel, y tabla admin de ejecutivos | `docs/ui-design/components/credit-balance.md` |
| `PlanCard` | Reutilizado del cotizador público (ver `cotizador-publico.md`) | Ya especificado |

---

## Acceptance Targets: Panel del Ejecutivo

### Inicio
- [ ] Debo ver mi saldo de créditos y el resumen de leads hoy/semana/mes
- [ ] Si mi saldo es ≤3 créditos, debo ver una alerta con un botón para comprar más

### Mis Leads
- [ ] Debo ver solo los leads asignados a mí, nunca los de otro ejecutivo
- [ ] Si intento acceder a un lead ajeno por URL, debo recibir 403/404
- [ ] Si no tengo leads, debo ver "Todavía no tienes leads asignados" con un botón al cotizador

### Ficha del lead
- [ ] Debo ver la cotización completa del prospecto adjunta a la ficha
- [ ] El botón "Reportar lead inválido" solo debe estar disponible dentro de 48h desde la asignación
- [ ] Fuera de esa ventana, debo ver "Ya pasó el plazo para reclamar este lead"

### Créditos
- [ ] Debo ver los packs activos con su precio en pesos
- [ ] Una orden en estado `pending` debe mostrar un botón "Verificar estado"
- [ ] Si Mercado Pago rechaza el pago, debo ver el motivo del rechazo cuando esté disponible

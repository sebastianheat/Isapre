# Onboarding Strategy — Marketplace de Leads nuevaisapre.cl

**Primary persona:** Rodrigo (ejecutivo externo)
**First success definition:** Generar su primera cotización gratis en el cotizador del panel, en menos de 1 minuto, **sin haber comprado créditos todavía**.
**Patterns used:** Empty State Design, Guided First Action, Contextual Tooltips

## Por qué el first success NO es "recibir un lead"

Podría parecer que el first success de un marketplace de leads es "recibir el primer lead comprado". Pero eso depende de que Rodrigo ya haya pagado, y el diferenciador central del producto es que **el cotizador es gratis, se compren créditos o no**. Llevar a Rodrigo al cotizador funcionando — sin pedirle tarjeta — es la forma más rápida de generar la confianza que el journey de Rodrigo identificó como el mayor obstáculo ("ya me sentí estafado pagando tu7.cl sin resultados"). Una vez que experimenta que el cotizador gratis realmente funciona, comprar créditos deja de sentirse como un salto de fe.

## First Success Flow

1. Rodrigo termina su registro (US-001) y verifica su email (US-002). Ve: "Tu cuenta está en revisión, te avisaremos por correo."
2. Mientras espera aprobación, un link en ese mismo mensaje dice: "Mientras esperamos, prueba el cotizador gratis →" — lleva al cotizador **público** (no necesita estar aprobado para esto, es la misma herramienta).
3. Cotiza con datos de ejemplo o de un cliente real: ve 3 planes comparados en segundos.
4. Cynthia lo aprueba (US-003) → email de bienvenida con link directo a `/panel`.
5. Entra a `/panel` por primera vez → **Inicio** muestra el empty state de "Mis Leads" con un CTA directo a "Cotizador" (no a "Comprar créditos" — ese CTA llega después).
6. Genera su primera cotización ya dentro del panel, para un cliente propio → **first success alcanzado**, sin haber pagado nada todavía.
7. Recién en este punto, un tooltip contextual introduce "Comprar créditos" como el siguiente paso natural para empezar a recibir leads exclusivos.

## Empty States

| Screen | Empty state message | Primary action | Secondary link |
|---|---|---|---|
| `/panel` → Mis Leads (sin leads todavía) | "Todavía no tienes leads asignados" | [Cotizar para un cliente propio] | "¿Cómo funciona el reparto de leads? →" |
| `/panel` → Créditos → Historial (sin compras) | "Aún no has comprado créditos" | [Ver packs disponibles] | "El cotizador es gratis, no necesitas créditos para usarlo →" |
| `/admin` → Reparto → Sin asignar (cola vacía) | "Todos los leads están asignados 🎉" | — (no aplica CTA, es un estado positivo) | — |
| `/admin` → Créditos → Historial de un ejecutivo (sin movimientos) | "Sin créditos registrados todavía" | [Regalar créditos] | — |
| `/admin` → Órdenes (sin compras registradas) | "Todavía no hay compras de créditos" | — | "Los packs se configuran en Créditos → Packs" |
| `/cotizador` (Marcela, primera visita) | No aplica empty state — el formulario mínimo ya es la acción principal desde el primer segundo | [Ver mis planes] | — |
| `/panel` → Reembolsos solicitados (sin reclamos) | "No tienes reclamos de leads en curso" | — | "¿Cuándo reportar un lead inválido? →" |

## Contextual Tooltips

| Ubicación | Disparador | Texto del tooltip | Por qué acá |
|---|---|---|---|
| Botón "Comprar créditos" en `/panel` | Primera vez que Rodrigo completa una cotización en el panel (first success ya alcanzado) | "Ya viste que el cotizador funciona. Compra créditos para empezar a recibir leads exclusivos, sin mensualidad." | Justo después del first success, cuando ya confía en la herramienta — no antes |
| Interruptor "Recibir leads" en Perfil | Primera visita a `/panel/perfil` | "Puedes pausar esto cuando quieras, por ejemplo si te vas de vacaciones." | Es la primera vez que ve el control, y no es obvio que existe |
| Botón "Reportar lead inválido" en la ficha del lead | Primera vez que Rodrigo abre la ficha de un lead comprado (no uno propio) | "Si este lead tiene datos falsos o duplicados, repórtalo dentro de 48h y te devolvemos el crédito." | Momento exacto donde la información es relevante — no antes, no en un manual aparte |
| Cola "Sin asignar" en `/admin/reparto` | Primer login de Cynthia tras el lanzamiento de la Fase 0 | "Asigna cada lead a Ingrid o a ti misma con un clic. El crédito se descuenta automáticamente." | Es su primer uso de una pantalla completamente nueva |

## Progress Steps

No aplica — ni el registro de ejecutivo (4 campos) ni la aprobación son un setup de 3+ pasos que justifique una barra de progreso. Mantener el onboarding sin fricción visual adicional.

## Secondary Persona Onboarding

**Cynthia (superadmin + ejecutiva interna):** su "first success" es distinto — no es descubrir el producto, es **operar la Fase 0 sin perder ningún lead el primer día**. Su onboarding es una sola conversación directa con Sebastián (no un flujo de producto) más un tooltip contextual en la cola "Sin asignar" la primera vez que la usa (ver tabla arriba). No necesita empty states de bienvenida ni CTAs de "primer éxito" — ya conoce el dominio, solo necesita confiar en que la pantalla nueva es más rápida que su hábito anterior.

**Marcela (prospecto):** no tiene cuenta ni "onboarding" en el sentido tradicional — su primera pantalla (el formulario del cotizador) ya es la acción principal, sin empty states ni tooltips. El único momento equivalente a onboarding es el mensaje de confianza inicial ("Cotiza en 30 segundos, sin RUT") que cumple su promesa mostrando resultados de inmediato.

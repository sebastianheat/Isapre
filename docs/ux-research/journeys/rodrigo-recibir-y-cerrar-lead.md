# Journey Map: Rodrigo — Recibir un lead pagado con créditos y cerrarlo

**Persona:** [docs/ux-research/personas/rodrigo.md](../personas/rodrigo.md)
**Goal:** Comprar créditos, recibir un lead exclusivo, cotizarlo gratis y cerrar la venta antes de que se enfríe.
**Current state:** Antes del producto (con tu7.cl + leads sueltos) / Con el producto (marketplace + cotizador gratis)

## Journey Summary
Hoy Rodrigo paga una suscripción fija sin saber si le va a llegar algo, y cuando cotiza usa una herramienta separada de donde le llegan sus contactos. Con el producto, comprar créditos y recibir un lead exclusivo es un solo flujo, y el cotizador gratis vive integrado en la misma ficha del lead — el mayor salto de experiencia está en la fase Act, donde hoy Rodrigo salta entre WhatsApp, tu7.cl y su memoria, y con el producto todo vive en un solo lugar.

---

## Phase 1: Become Aware

### Steps
1. Rodrigo nota que esta semana casi no le han llegado leads nuevos por sus canales habituales.
2. Busca alternativas o le comentan de nuevaisapre.cl (boca a boca, o un anuncio dirigido a corredores).

### Touchpoints
- WhatsApp (comentario de un colega), landing `/ejecutivos` (fase posterior)

### Thoughts
- "Necesito algo que me traiga leads de verdad, no otra suscripción sin garantía."

### Feelings
😤 → 😐

### Pain Points
- Desconfianza inicial — ya se sintió estafado pagando tu7.cl sin resultados.

### Opportunities
- Comunicar desde el primer contacto que "solo pagas por lead recibido" — el diferenciador central.

---

## Phase 2: Decide

### Steps
1. Se registra en `/registro` con sus datos y espera aprobación.
2. Mientras espera, explora el cotizador gratis para ver si es tan bueno como tu7.cl.

### Touchpoints
- Formulario de registro, email de confirmación, cotizador público/ejecutivo

### Thoughts
- "Si el cotizador gratis ya es bueno, esto vale la pena aunque no compre créditos todavía."

### Feelings
😐 → 😊

### Pain Points
- Esperar la aprobación manual de Cynthia puede sentirse lento si tarda más de un día.

### Opportunities
- Confirmar por email en cuanto se aprueba, y dejarlo usar el cotizador gratis incluso antes de comprar créditos — genera confianza sin pedir dinero primero.

---

## Phase 3: Act

### Steps
1. Aprobado, entra a `/panel/creditos` y compra un pack de 10 créditos ($100.000) vía Mercado Pago.
2. Recibe notificación inmediata (email + WhatsApp) de que le asignaron un lead.
3. Abre `/panel/leads/[id]` y ve la cotización completa que hizo el prospecto.
4. Usa Romina para redactar el primer mensaje de WhatsApp.
5. Contacta al prospecto, y si necesita ajustar algo, usa el cotizador para recalcular en vivo durante la llamada.

### Touchpoints
- Checkout Mercado Pago, notificación email/WhatsApp, `/panel/leads/[id]`, Romina, cotizador del ejecutivo, WhatsApp externo

### Thoughts
- "Esto llegó rápido y ya viene con la cotización lista, no tengo que preguntarle todo de cero."

### Feelings
😐 → 😊 → 😄

### Pain Points
- Si el checkout de Mercado Pago falla o tarda en confirmar, Rodrigo no sabe si ya tiene el crédito o no.
- Si la notificación llega tarde, pierde la ventana de alta intención del prospecto.

### Opportunities
- Mostrar el estado del pago en tiempo real en `/panel/creditos` ("procesando" → "acreditado") para que Rodrigo no dude.
- La notificación debe salir en el mismo flujo de la asignación, no en un cron diario — esto ya es un requisito no negociable del Tech Spec.

---

## Phase 4: Verify

### Steps
1. Actualiza la etapa del lead a medida que avanza la conversación.
2. Marca la calidad del lead (Calificado/Marginal/No calificado) cuando corresponde.

### Touchpoints
- `/panel/leads/[id]`, campo de etapa/calidad

### Thoughts
- "Quiero que quede claro que este lead sí valió la pena, o reclamar si era falso."

### Feelings
😊

### Pain Points
- Si el lead resulta inválido (teléfono falso), Rodrigo necesita un camino claro para reclamar sin perder el crédito para siempre.

### Opportunities
- Botón visible de "reportar lead inválido" directamente desde la ficha, con la ventana de 48h clara.

---

## Phase 5: Reflect

### Steps
1. Revisa su dashboard: leads recibidos, tasa de cierre.
2. Decide si compra otro pack de créditos.

### Touchpoints
- Dashboard de `/panel`

### Thoughts
- "Si esto convierte mejor que lo que pagaba antes en suscripción, sigo comprando."

### Feelings
😊 → 😄 (si el lead cerró) / 😐 (si no cerró, pero el proceso fue justo)

### Pain Points
- Si no hay forma de ver su propio desempeño, no tiene cómo justificar seguir comprando créditos.

### Opportunities
- Dashboard simple con tasa de cierre y comparación con el mes anterior — refuerza la decisión de recompra.

---

## Summary

### Top Pain Points (ranked)
1. Perder la ventana de alta intención si la notificación de lead asignado no es inmediata.
2. No saber si un pago de Mercado Pago ya se acreditó o sigue "en el limbo".
3. No tener un camino claro para reclamar un lead inválido sin perder el crédito injustamente.

### Top Delight Opportunities (ranked)
1. El lead llega con la cotización completa del prospecto ya adjunta — ahorra el primer minuto de la llamada.
2. Romina ayuda a redactar el primer mensaje sin esfuerzo.
3. Dashboard de tasa de cierre que justifica seguir comprando créditos.

### Story Map Impact
- Actividad "Recibir notificación de lead asignado" es Must Have inmediata (email + WhatsApp), por el Pain Point #1.
- Actividad "Ver estado del pago en tiempo real" es Must Have para el checkout de créditos, por el Pain Point #2.
- Actividad "Reportar lead inválido" es Must Have, ya estaba en el alcance original — este journey confirma que es crítica, no opcional.
- Actividad "Dashboard de tasa de cierre" es Should Have — mejora la retención pero no bloquea el flujo core.

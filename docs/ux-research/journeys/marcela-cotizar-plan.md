# Journey Map: Marcela — Cotizar mi plan de isapre y decidir si contacto a un ejecutivo

**Persona:** [docs/ux-research/personas/marcela.md](../personas/marcela.md)
**Goal:** Saber si le conviene cambiarse de isapre, viendo precios reales, y decidir si avanza con un ejecutivo.
**Current state:** Antes del producto (formulario simple actual) / Con el producto (cotizador completo estilo tu7.cl)

## Journey Summary
Hoy el formulario de nuevaisapre.cl pide varios datos y promete que "un asesor te contacta", sin mostrar precio en el momento. Con el cotizador nuevo, Marcela ve el resultado antes de dejar ningún dato de contacto — el salto más grande está en la fase Act, donde pasa de "formulario ciego" a "comparador interactivo".

---

## Phase 1: Become Aware

### Steps
1. Ve un anuncio de Google mientras busca "cotizar isapre" o "cambiarme de isapre".
2. Hace clic porque promete "cotiza en 30 segundos, sin RUT".

### Touchpoints
- Google Ads, landing `/cotizador`

### Thoughts
- "Espero que esto no sea otro formulario que termina en que me llamen sin darme un precio."

### Feelings
😐

### Pain Points
- Escepticismo por experiencias previas con sitios que prometen precio y no lo muestran.

### Opportunities
- Que el precio aparezca literalmente en los primeros 30 segundos, cumpliendo la promesa del anuncio.

---

## Phase 2: Decide

### Steps
1. Entra a `/cotizador` y ve el formulario mínimo (edad, renta, cargas) sin pedir RUT.
2. Decide completarlo porque no le piden nada sensible todavía.

### Touchpoints
- `/cotizador`

### Thoughts
- "Esto se ve simple, lo intento."

### Feelings
😐 → 😊

### Pain Points
- Si el formulario tuviera más de 4-5 campos, probablemente abandonaría acá.

### Opportunities
- Mantener el formulario inicial deliberadamente corto — es la razón de que llegue hasta acá.

---

## Phase 3: Act

### Steps
1. Completa edad, renta, región y cargas.
2. Ve instantáneamente 3 planes comparados con precio real en pesos.
3. Abre el desglose de cálculo por beneficiario para entender por qué cuesta eso.
4. Decide que quiere el detalle o hablar con alguien → aparece el LeadGate pidiendo nombre y WhatsApp.

### Touchpoints
- Resultados del cotizador, modal de desglose, LeadGate

### Thoughts
- "Ahora sí entiendo por qué cuesta esto, no es un número mágico."

### Feelings
😊

### Pain Points
- Si el LeadGate apareciera antes de ver los planes, Marcela probablemente abandonaría (como con el formulario actual).

### Opportunities
- El desglose transparente es el momento de mayor confianza del journey — vale la pena que sea visualmente claro y fácil de entender sin jerga.

---

## Phase 4: Verify

### Steps
1. Dan ganas de guardar la cotización para revisarla con calma o mostrársela a su pareja.
2. Vuelve más tarde a `/mi-cotizacion` ingresando su WhatsApp para recuperarla.

### Touchpoints
- `/mi-cotizacion`

### Thoughts
- "Qué bueno que no tengo que hacer todo de nuevo."

### Feelings
😊

### Pain Points
- Si no pudiera recuperar la cotización, tendría que empezar de cero — fricción que ya resolvió el diseño de referencia (`mi-cotizacion.html`).

### Opportunities
- Ya existe un patrón de diseño probado para esto (ver referencia de `nuevamas.netlify.app`) — reutilizarlo tal cual.

---

## Phase 5: Reflect

### Steps
1. Un ejecutivo (Rodrigo o quien haya recibido el lead) le escribe por WhatsApp con su cotización ya lista.
2. Decide si avanza con el cambio de isapre.

### Touchpoints
- WhatsApp

### Thoughts
- "Me contactaron rápido y ya sabían lo que había cotizado, se siente más serio que otros sitios."

### Feelings
😊 → 😄

### Pain Points
- Si el ejecutivo tarda mucho en contactarla, pierde la sensación de seriedad que el cotizador transmitió.

### Opportunities
- La rapidez del contacto (gracias a la notificación inmediata al ejecutivo) es lo que convierte la buena primera impresión del cotizador en confianza real.

---

## Summary

### Top Pain Points (ranked)
1. Pedir contacto antes de mostrar precio — ya resuelto por diseño (LeadGate solo en alto interés).
2. Formulario inicial largo o que pida RUT — ya resuelto por diseño (mínimo de datos).
3. Que el ejecutivo tarde en contactarla después de una buena experiencia de cotización — depende de la velocidad de notificación del motor de reparto (compartido con el journey de Rodrigo).

### Top Delight Opportunities (ranked)
1. Ver el precio real en menos de 30 segundos, cumpliendo la promesa del anuncio.
2. El desglose transparente del cálculo — genera confianza que ningún competidor con formulario ciego ofrece.
3. Recuperar la cotización después sin tener que rehacerla.

### Story Map Impact
- Actividad "Mostrar 3 planes comparados sin pedir contacto" es Must Have — es el corazón de la propuesta de valor frente a tu7.cl (que tampoco tiene cotizador público) y frente al formulario ciego actual.
- Actividad "Desglose de cálculo por beneficiario" es Must Have — pain reliever central identificado también en el VPC y en el análisis de tu7.cl.
- Actividad "Recuperar cotización por WhatsApp" es Should Have para el MVP del cotizador — mejora la experiencia pero no bloquea el lanzamiento del comparador base.

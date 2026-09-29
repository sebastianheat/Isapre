# Journey Map: Cynthia — Operar el reparto manual de la Fase 0

**Persona:** [docs/ux-research/personas/cynthia.md](../personas/cynthia.md)
**Goal:** Repartir los leads del día entre ella e Ingrid con créditos regalados, sin perder ninguno, en los primeros 2 días de operación.
**Current state:** Antes del producto (asignación informal por email) / Con el producto (reparto manual asistido con ledger)

## Journey Summary
Hoy Cynthia asigna leads "de memoria", sin registro de nada. Con el producto, el mismo trabajo se hace con un ledger detrás que le da trazabilidad, sin agregarle pasos — el riesgo principal de este journey es que la Fase 0 se construye rápido (2 días) y cualquier fricción extra en la fase Act hace que vuelva a los hábitos informales de siempre.

---

## Phase 1: Become Aware

### Steps
1. Sebastián le avisa que desde hoy el reparto de leads pasa por el nuevo sistema de créditos.

### Touchpoints
- Conversación directa con Sebastián

### Thoughts
- "Espero que esto no me haga más lento el día a día."

### Feelings
😐

### Pain Points
- Escepticismo ante cualquier cambio de proceso que le quite tiempo justo cuando más leads está manejando.

### Opportunities
- Que el primer uso sea obviamente más rápido que su método actual, no solo "más ordenado".

---

## Phase 2: Decide

### Steps
1. Sebastián le regala créditos a ella y a Ingrid desde `/admin/creditos`.
2. Revisa que el saldo de ambas se vea correcto.

### Touchpoints
- `/admin/creditos`

### Thoughts
- "Si esto queda mal configurado desde el día 1, voy a perder confianza en todo el sistema."

### Feelings
😐 → 😊

### Pain Points
- Si el saldo inicial no se ve claro o tarda en reflejarse, duda de si el sistema realmente funciona.

### Opportunities
- Confirmación visual inmediata del saldo tras regalar créditos, con el motivo visible en el historial.

---

## Phase 3: Act

### Steps
1. Un lead nuevo entra al sistema (formulario simple, como hoy).
2. Como el reparto automático aún no existe en la Fase 0, Cynthia ve el lead en "sin asignar" y lo asigna a mano a sí misma o a Ingrid.
3. El sistema descuenta 1 crédito de quien lo recibe y lo registra en el ledger.
4. Repite esto cada vez que entra un lead nuevo durante el día.

### Touchpoints
- `/admin/reparto` (cola de leads sin asignar), selector de ejecutivo

### Thoughts
- "Esto tiene que ser tan rápido como lo que hacía antes por email, o mejor."

### Feelings
😐 → 😊 (si es rápido) / 😤 (si toma más de 2-3 clics)

### Pain Points
- Si asignar a mano toma más pasos que "escribir un nombre en un Excel", Cynthia vuelve al hábito viejo.
- Si dos leads entran casi al mismo tiempo, teme asignar el mismo por error.

### Opportunities
- Cola de "sin asignar" con selector de un clic por ejecutivo activo — el diseño más simple posible para esta pantalla, ya que es la más usada en la Fase 0.

---

## Phase 4: Verify

### Steps
1. Al final del día, revisa el historial de créditos (ledger) para confirmar que todo cuadra: cuántos leads entraron, a quién se le asignó cada uno.
2. Verifica que el export de conversiones para Google Ads sigue funcionando igual que siempre.

### Touchpoints
- Historial de `credit_transactions`, exportador de CSV existente

### Thoughts
- "Si el export se rompe por este cambio, fue un error grave."

### Feelings
😊 (si todo cuadra) / 😤 (si algo no coincide)

### Pain Points
- Cualquier discrepancia entre "leads asignados" y "créditos descontados" rompe la confianza inmediatamente.

### Opportunities
- El ledger debe ser tan legible que Cynthia pueda auditar el día completo en menos de un minuto.

---

## Phase 5: Reflect

### Steps
1. Decide si el reparto manual asistido es suficiente para seguir así unas semanas más, o si urge pasar al motor automático.

### Touchpoints
- Conversación con Sebastián

### Thoughts
- "Si esto se vuelve tedioso al crecer el volumen, hay que automatizarlo antes de abrir a ejecutivos externos."

### Feelings
😊

### Pain Points
- El proceso manual no escala más allá del equipo interno — es un límite conocido y aceptado para la Fase 0.

### Opportunities
- Documentar explícitamente cuándo pasar del reparto manual al automático (ej. cuando el volumen diario supere lo que Cynthia puede asignar cómodamente a mano).

---

## Summary

### Top Pain Points (ranked)
1. Asignar a mano debe ser igual o más rápido que el hábito actual (email/memoria), o Cynthia abandona el flujo nuevo.
2. Riesgo de asignar el mismo lead dos veces si entran casi simultáneos, sin ningún tipo de lock.
3. Cualquier discrepancia entre leads asignados y créditos descontados destruye la confianza en el sistema completo.

### Top Delight Opportunities (ranked)
1. Confirmación visual inmediata y clara de cada movimiento de crédito, con motivo.
2. Cola de "sin asignar" con asignación de un clic.
3. Ledger auditable en menos de un minuto al final del día.

### Story Map Impact
- Actividad "Asignar lead a mano con 1 clic" es Must Have de la Fase 0 — es literalmente la actividad que Cynthia hará decenas de veces al día.
- Actividad "Ver historial de ledger legible" es Must Have, no Should Have — el Pain Point #3 es el que más rápido puede matar la confianza en todo el proyecto.
- Actividad "Prevenir doble asignación del mismo lead" (aunque sea con un lock simple) es Must Have incluso en la versión manual, no solo en el motor automático futuro.

# Mental Model: Rodrigo — Cotizador y bandeja de leads

**Persona:** [docs/ux-research/personas/rodrigo.md](../personas/rodrigo.md)
**Domain:** Cotizar durante una llamada y trabajar los leads que recibe

## Current Mental Model
Rodrigo piensa en el cotizador como una **calculadora de sucursal**: ingresa datos del cliente y espera ver un total al instante, sin pasos intermedios. Piensa en los leads que recibe como un **inbox**: llegan, los abre, actúa sobre ellos o los deja para después — no como registros en una base de datos con estados complejos.

## Source
- **Herramienta existente:** tu7.cl — su cotizador recalcula en vivo sin recargar la página, lo que entrenó a Rodrigo a esperar cero latencia al cambiar un dato.
- **Analogía física:** una calculadora de caja o cotizador de sucursal bancaria — se ingresan números, se ve un total, se le muestra al cliente ahí mismo.
- **Patrón de software común:** inbox de WhatsApp Business (mensajes nuevos arriba, con indicador de no leído) para los leads que le llegan.

## Key Expectations
- Espera que el precio se actualice al instante al cambiar la edad o un filtro, sin botón "calcular" ni spinner.
- Espera enviar la cotización por WhatsApp con un solo botón, como ya hace en tu7.cl.
- Espera ver los leads nuevos arriba de su bandeja, marcados como "nuevo", con un contador visible — igual que mensajes sin leer.

## Design Constraints
- El motor de cálculo debe vivir en el cliente (Zustand + `lib/pricing.ts` compartido) — cualquier round-trip al servidor por cada cambio de filtro rompe la sensación de "calculadora en vivo".
- El botón de WhatsApp debe ser una acción directa (`wa.me/...` con mensaje precargado), no un flujo de "compartir" genérico de varios pasos.
- `/panel` debe organizarse como una bandeja (leads nuevos destacados, contador, orden por fecha) en vez de una tabla plana sin jerarquía.

## Where the System Model Differs
- En el sistema real, un lead puede llegar por dos caminos distintos: comprado con créditos del marketplace, o un cliente propio que Rodrigo cotiza por su cuenta con el cotizador gratis. Para Rodrigo estos son simplemente "gente a la que le estoy vendiendo" — la UI no debe forzarlo a pensar en el origen técnico del lead salvo cuando sea relevante (ej. créditos consumidos).
- El sistema modela el lead con estados técnicos (`etapa`, `calidad`, `assignment_status`) que Rodrigo no necesita ver todos a la vez — la bandeja debe mostrarle solo lo accionable ("nuevo", "en seguimiento", "cerrado"), no los siete valores internos de `etapa`.

# Mental Model: Marcela — Cotizar antes de comprometerse

**Persona:** [docs/ux-research/personas/marcela.md](../personas/marcela.md)
**Domain:** Cotizar un plan de isapre en el cotizador público

## Current Mental Model
Marcela piensa en cotizar como **"probarse algo antes de comprar"**: quiere ver opciones y precios reales antes de hablar con un vendedor, tal como compara vuelos o seguros de auto online. No piensa en "enviar un formulario y esperar que la llamen" — eso lo asocia con sitios poco transparentes.

## Source
- **Herramienta existente:** comparadores de vuelos/seguros online (Despegar, comparadores de seguros de auto) — la entrenaron a esperar filtros y resultados instantáneos.
- **Analogía física:** probarse ropa en una tienda — ve opciones, compara, decide si quiere ayuda de un vendedor recién al final.
- **Patrón de software común:** buscador de e-commerce (ingresar criterios → ver resultados → filtrar → decidir).

## Key Expectations
- Espera ver resultados en la misma pantalla apenas ingresa sus datos básicos, no un mensaje de "te contactaremos pronto".
- Espera poder comparar 2-3 opciones lado a lado antes de decidir algo.
- Espera que pedirle contacto ocurra solo si ella quiere avanzar, no como condición para ver el precio.

## Design Constraints
- El cotizador público debe mostrar precios reales apenas se completan los datos mínimos (edad, renta, cargas) — sin paso de "enviar y esperar".
- El diseño debe verse y sentirse como un comparador de e-commerce (tarjetas, precios grandes, comparación visual), no como un formulario de contacto tradicional.
- El LeadGate (pedir teléfono/nombre) debe activarse solo en un momento de alto interés explícito (enviar propuesta, hablar con asesor), nunca antes de mostrar los planes.

## Where the System Model Differs
- Detrás de escena, ver los planes ya crea una `cotizacion` en el sistema (para poder recuperarla después y para enriquecer el eventual lead) — Marcela no necesita saber esto ni sentir que está "dejando datos" solo por mirar precios. La UI debe comunicar claramente que mirar es gratis y sin compromiso, aunque técnicamente ya se guardó algo.
- El sistema conecta su cotización con el motor de reparto de leads si ella pide contacto — para Marcela esto es invisible, simplemente "un ejecutivo me escribe por WhatsApp con mi cotización ya lista", no "fui asignada a través de un marketplace".

# PRE-MORTEM-marketplace-leads

> Pre-mortem generado por Forge · 2026-09-07

## Escenario de Fracaso

> Es marzo de 2027. El marketplace de leads de nuevaisapre.cl fracasó. Cynthia sigue asignando leads a mano porque el motor automático nunca se terminó de probar con seguridad. Ningún ejecutivo externo compró créditos — solo el equipo interno lo usó, gratis, durante meses. Mientras tanto, tu7.cl agregó un modo "pago por lead" a su producto ya maduro, con datos de 2.346 planes reales, y capturó a los pocos corredores que sí estaban dispuestos a probar algo nuevo. El catálogo de coberturas de nuevaisapre.cl nunca llegó a cubrir las 7 isapres completas, así que el cotizador "gratis" — el diferenciador central — mostraba resultados incompletos y perdió credibilidad. Sebastián, único desarrollador y dueño de producto, se quedó sin tiempo para mantener el catálogo actualizado mientras also sostenía la campaña de Google Ads.

---

## Inventario de Riesgos

### Tigers (Riesgos Reales — Mitigar Activamente)

| ID | Riesgo | Categoría | Probabilidad | Impacto |
|----|--------|-----------|---------------|---------|
| R-01 | El modelo de precio ($10.000/lead) nunca se valida con ejecutivos externos reales | Producto | Alta | Alto |
| R-02 | La migración KV→Postgres o el motor de reparto rompen el export de conversiones de Google Ads | Técnico | Media | Alto |
| R-03 | El patrón de RLS custom (`SET LOCAL`) se implementa mal y un ejecutivo ve leads ajenos | Técnico | Media | Alto |
| R-04 | El webhook de Mercado Pago mal implementado causa doble acreditación o pérdida de pagos | Técnico | Media | Alto |
| R-05 | Sebastián es punto único de falla (desarrollo + producto) y Cynthia es punto único de falla operativo (superadmin + ejecutiva) | Ejecución | Alta | Medio |

**R-01: Precio sin validar**
- **Si ocurre:** se construye todo el motor de créditos y checkout de Mercado Pago para un precio que nadie externo quiere pagar.
- **Señales tempranas:** cero registros externos en `/registro` en las primeras 2-3 semanas tras abrir la Fase 1; los ejecutivos internos regalados no generan conversión de créditos reales.
- **Mitigación:** antes de construir Mercado Pago (Fase posterior), validar con al menos 3-5 ejecutivos externos reales (no del equipo) si comprarían al precio propuesto — puede ser tan simple como ofrecerles créditos regalados por tiempo limitado y preguntar directamente si pagarían por más.
- **Plan B:** ajustar el precio con `/precio`, o pivotar a un modelo híbrido (suscripción baja + créditos) si el pago por lead puro no convence.

**R-02: La migración rompe el export de Google Ads**
- **Si ocurre:** se detiene la optimización de la campaña activa, que hoy genera ~3 leads/día a CPA validado — pérdida de dinero real y de datos de conversión históricos.
- **Señales tempranas:** cualquier discrepancia entre el CSV generado antes y después de la migración en el ambiente de preview.
- **Mitigación:** US-047 ya lo exige como criterio de aceptación P0 — no negociable, con test automatizado antes de cualquier merge a producción.
- **Plan B:** rollback del script de migración (ya exigido como reversible en el Tech Spec) y volver a Upstash KV mientras se corrige.

**R-03: Fuga de leads entre ejecutivos por RLS mal implementado**
- **Si ocurre:** un ejecutivo ve datos personales de un lead que no le pertenece — incidente de seguridad y de Ley 21.719 al mismo tiempo.
- **Señales tempranas:** cualquier fallo en los tests E2E de aislamiento (US-047, sección 11.3 del Tech Spec: "Ejecutivo A intenta acceder al lead de Ejecutivo B").
- **Mitigación:** doble capa obligatoria (filtro en aplicación + RLS con `SET LOCAL` dentro de transacción explícita), nunca confiar en una sola. Tests de aislamiento como gate de CI, no opcionales.
- **Plan B:** si se detecta una fuga en producción, suspender el motor automático y volver a asignación manual mientras se audita el alcance del incidente (y se notifica según corresponda bajo Ley 21.719).

**R-04: Webhook de Mercado Pago mal implementado**
- **Si ocurre:** créditos acreditados dos veces (pérdida de ingreso) o pagos aprobados que nunca se acreditan (ejecutivo pagó y no recibió nada — pérdida de confianza inmediata).
- **Señales tempranas:** discrepancias en `payment_events` vs. `credit_transactions` durante las pruebas en modo `test` de Mercado Pago.
- **Mitigación:** idempotencia por `mp_payment_id` único (ya en el schema), validación de firma obligatoria, y probar exhaustivamente en modo test antes de pasar a `live` — nunca saltarse esa fase por apuro.
- **Plan B:** US-048 (verificar estado manualmente) ya es la salvaguarda ante fallos puntuales del webhook.

**R-05: Puntos únicos de falla humanos**
- **Si ocurre:** si Sebastián no puede trabajar por un tiempo, no hay quién mantenga el motor de reparto ni el catálogo. Si Cynthia no puede operar, no hay quién apruebe ejecutivos ni resuelva el pool sin asignar.
- **Señales tempranas:** ninguna documentación de "cómo operar sin mí" existe hoy para ninguno de los dos roles.
- **Mitigación:** documentar el proceso operativo de la Fase 0 (aprobar, asignar, regalar créditos) en un documento corto que Ingrid también pueda seguir — no requiere código, solo un playbook de una página.
- **Plan B:** aceptar el riesgo a esta escala (2-3 personas) — no se justifica contratar redundancia todavía, pero si el negocio crece más allá del equipo interno, esto se vuelve bloqueante.

### Paper Tigers (Riesgos Percibidos — No Obsesionarse)

| ID | Riesgo | Por Qué No Es Tan Grave |
|----|--------|--------------------------|
| R-06 | Performance del motor de cotización con miles de planes | Ya se diseñó el adelgazamiento de payload (Tech Spec 8.2) y se verificó el patrón de tu7.cl a evitar — es un problema resuelto en el diseño, falta solo ejecutarlo |
| R-07 | Costo de infraestructura nueva (Supabase, Mercado Pago) | Bajo comparado con el ingreso potencial y el gasto ya comprometido en Google Ads — no es un riesgo de runway para un negocio que ya opera |
| R-08 | Complejidad del stack (roles + ledger + pagos + motor de cotización a la vez) | Alta, pero ya se dividió en fases claras (Fase 0 manual → automatización → Mercado Pago) — el riesgo de complejidad ya tiene un plan de mitigación estructural, no es un riesgo sin abordar |

### Elephants (Riesgos Ignorados — Forzar Conversación)

| ID | Riesgo | Por Qué Se Ignora | Impacto Real |
|----|--------|---------------------|---------------|
| ~~R-09~~ | ~~Cobertura del catálogo incierta~~ — **Resuelto:** el usuario confirmó (2026-09-07) que el catálogo ya cubre las 7 isapres completas. Se retira de la lista de Elephants activos. | — | — |
| R-10 | tu7.cl puede copiar el modelo de "pago por lead + cotizador gratis" en semanas, dado que ya tiene el catálogo completo de 2.346 planes y una app madura (v4.0.0) | Se asumió que el modelo de precios es un diferenciador duradero, sin considerar que la ventaja de datos está del lado de tu7.cl, no de nuevaisapre.cl | La diferenciación actual (precio + cotizador gratis) podría no ser defendible más de un trimestre si el competidor reacciona |
| R-11 | Dependencia total de Google Ads como fuente de prospectos — si Google cambia política o sube CPA, se reduce el inventario que se vende a los ejecutivos | Está mencionado como riesgo en el BMC, pero nunca se discutió un plan concreto de canal alternativo | El marketplace completo (ingreso, credibilidad con ejecutivos) depende de un solo canal externo que la empresa no controla |
| R-12 | Posible sesgo de confirmación: ya se invirtió en documentar y diseñar un proyecto grande (marketplace + motor de cotización completo) antes de validar con un solo ejecutivo externo real | Es más cómodo seguir planificando que hacer la llamada incómoda de validar el precio con un desconocido | Si el sesgo es real, se puede terminar construyendo 2-3 meses de producto para un mercado que no responde como se espera |

---

## Resumen de Riesgos

| Categoría | Tigers | Paper Tigers | Elephants | Total |
|-----------|--------|---------------|-----------|-------|
| Producto | 1 | 0 | 1 | 2 |
| Técnico | 3 | 1 | 0 | 4 |
| Mercado | 0 | 0 | 2 | 2 |
| Ejecución | 1 | 1 | 0 | 2 |
| Financiero | 0 | 1 | 0 | 1 |
| Equipo | 0 | 0 | 1 | 1 |
| **Total** | **5** | **3** | **3** (1 resuelto) | **12** |

## Nivel de Riesgo Global

🟡 **Medio-Alto**

Los riesgos técnicos (R-02, R-03, R-04) ya tienen mitigaciones concretas incorporadas en el Tech Spec y las User Stories — son manejables con disciplina de ejecución, no requieren rediseño. Lo que eleva el nivel de riesgo son los 4 **Elephants**: dos de ellos (R-09, cobertura real del catálogo; R-12, sesgo de confirmación) son preguntas que nadie ha hecho todavía en voz alta, y su respuesta puede cambiar el orden de las fases del Blueprint.

---

## Plan de Acción

### Antes de Construir (Bloqueantes)
1. ~~Confirmar la cobertura real del catálogo de las 7 isapres~~ — **Resuelto:** confirmado por el usuario, cobertura completa.
2. **Validar el precio con al menos un ejecutivo externo real** (R-01, R-12) antes de invertir en Mercado Pago — puede correr en paralelo a la Fase 0, no debe esperar al Blueprint completo.

### Durante la Construcción (Monitorear)
1. Tests de aislamiento entre ejecutivos (R-03) como gate obligatorio de CI, no opcional.
2. Discrepancias en `payment_events` durante pruebas en modo test de Mercado Pago (R-04).
3. Cuántos registros externos reales llegan a `/registro` en las primeras semanas de la Fase 1 (R-01).

### Post-Launch (Contingencia)
1. Si tu7.cl reacciona copiando el modelo (R-10): la respuesta no es competir en precio, es profundizar en lo que tu7.cl no tiene — el cotizador público indexable (SEO) y Romina interna gratis, ambos ya diferenciadores estructurales, no solo de precio.
2. Si Google Ads sube el CPA significativamente (R-11): evaluar el canal de reclutamiento directo de ejecutivos (partnership con isapres que ya reclutan, como se vio en tu7.cl) como fuente de ingreso alternativa, no solo de prospectos.
3. Documentar el playbook operativo de Cynthia/Ingrid (R-05) antes de que el negocio dependa de que ninguna de las dos falte.

# Usability Evaluation: Compra de Créditos con Mercado Pago

**Evaluated:** 2026-09-07
**Personas evaluados para:** Rodrigo (primaria en este flujo)
**Historias evaluadas:** US-038, US-039, US-040, US-041 (USER-STORIES-marketplace-leads.md)
**Evaluado por:** Claude (La Herrería)

## Summary
El diseño ya resuelve bien el pain point central del journey de Rodrigo (no confiar en el checkout hasta ver "acreditado"). Se encontró **1 violación de severidad 3** (sin forma de reintentar si el webhook se demora o falla) que debe resolverse antes de implementar, y **1 de severidad 2** sobre mensajes de error de pago rechazado.

## Violations Found

### Sin forma de verificar o reintentar si el webhook no llega
- **Heurístico:** H3 — Control y libertad del usuario
- **Severidad:** 3 (Mayor)
- **Ubicación:** `/panel/creditos`, orden en estado `pending` tras volver del checkout
- **Descripción:** El Tech Spec (sección 7.1) ya identifica el fallback correcto ("agregar un botón 'verificar estado' que consulte la API de Mercado Pago manualmente"), pero esa acción **no está escrita como user story** — quedó solo mencionada como gotcha técnico, no como funcionalidad con acceptance criteria.
- **Impacto:** Si el webhook se demora o falla (caída temporal de Mercado Pago, problema de red), Rodrigo queda con una orden "procesando" indefinidamente sin ninguna acción disponible salvo esperar o escribir a soporte.
- **Recomendación:** Agregar una story explícita (ver actualización en `USER-STORIES-marketplace-leads.md`, US-048) para el botón "Verificar estado de mi orden", con su propio acceptance criteria.

### Mensaje de error no definido para pago rechazado
- **Heurístico:** H9 — Ayuda a reconocer, diagnosticar y recuperarse de errores
- **Severidad:** 2 (Menor)
- **Ubicación:** `back_url` de error del checkout (US-039)
- **Descripción:** El story no especifica qué mensaje ve Rodrigo cuando Mercado Pago rechaza el pago (tarjeta rechazada, fondos insuficientes, etc.) — solo dice que existe una página de error.
- **Impacto:** Un mensaje genérico ("Algo salió mal") no le dice a Rodrigo si el problema es su tarjeta o el sistema, y no sabe si reintentar con otro medio de pago resolvería.
- **Recomendación:** Mostrar el motivo de rechazo que entrega la API de Mercado Pago cuando esté disponible, con sugerencia de acción ("Intenta con otra tarjeta o medio de pago").

## Violations by Severity

| Severidad | Cantidad | Violaciones |
|---|---|---|
| 4 — Catastrófico | 0 | — |
| 3 — Mayor | 1 | Sin verificación/reintento manual si el webhook falla |
| 2 — Menor | 1 | Mensaje de error de pago rechazado sin definir |
| 1 — Cosmético | 0 | — |

## Clearance

- [x] Sin violaciones de severidad 4 — no aplica rediseño de flujo
- [x] Violación de severidad 3 resuelta: se agregó **US-048** (verificar estado de orden manualmente) a `USER-STORIES-marketplace-leads.md`, prioridad P1
- [ ] Violación de severidad 2 documentada como restricción de diseño para el Skill #7 (mostrar motivo de rechazo de Mercado Pago cuando esté disponible)

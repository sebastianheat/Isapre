# Usability Evaluation: Reparto Manual de Leads (Fase 0)

**Evaluated:** 2026-09-07
**Personas evaluados para:** Cynthia (primaria en este flujo)
**Historias evaluadas:** US-005, US-006, US-007, US-008 (USER-STORIES-marketplace-leads.md)
**Evaluado por:** Claude (La Herrería)

## Summary
El flujo es simple y rápido, coherente con el modelo mental de Cynthia. Se encontró **1 violación de severidad 3** (falta de "salida de emergencia" tras una asignación equivocada) que debe resolverse antes de implementar — el resto del flujo no presenta problemas.

## Violations Found

### Sin forma de deshacer una asignación equivocada en la Fase 0
- **Heurístico:** H3 — Control y libertad del usuario
- **Severidad:** 3 (Mayor)
- **Ubicación:** `/admin/reparto`, tras confirmar la asignación de un lead (US-006)
- **Descripción:** El diseño prioriza velocidad (asignar con 1 clic, sin confirmación previa) para que Cynthia pueda repartir leads rápido durante el día. Pero si asigna el lead equivocado a la persona equivocada, la Fase 0 no define ninguna acción de "reasignar" — esa capacidad (US-017) está marcada P1, fuera del alcance de los primeros 2 días.
- **Impacto:** Un error de un clic en la Fase 0 (la más usada, según su propio journey) queda sin corrección posible hasta que se construya el motor P1 completo — puede significar que un lead se trabaje con la persona equivocada durante días.
- **Recomendación:** Agregar una acción mínima de "reasignar" también en la Fase 0 (no esperar a US-017 completo): permitir elegir un nuevo ejecutivo desde la ficha del lead recién asignado, devolviendo el crédito al primero y descontando del segundo, con el mismo lock atómico que ya usa US-006.

## Violations by Severity

| Severidad | Cantidad | Violaciones |
|---|---|---|
| 4 — Catastrófico | 0 | — |
| 3 — Mayor | 1 | Sin forma de deshacer una asignación equivocada |
| 2 — Menor | 0 | — |
| 1 — Cosmético | 0 | — |

## Clearance

- [x] Sin violaciones de severidad 4 — no aplica rediseño de flujo
- [x] Violación de severidad 3 resuelta: se agregó **US-006b** (reasignación mínima en Fase 0) a `USER-STORIES-marketplace-leads.md`, con prioridad P0

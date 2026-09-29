# Usability Evaluation: Cotizador Público

**Evaluated:** 2026-09-07
**Personas evaluados para:** Marcela (primaria en este flujo)
**Historias evaluadas:** US-018, US-019, US-020, US-021 (USER-STORIES-marketplace-leads.md)
**Evaluado por:** Claude (La Herrería)

## Summary
El flujo central (datos mínimos → 3 planes → desglose → LeadGate en alto interés) está bien resuelto y responde directamente a los pain points del journey de Marcela. Se encontraron **2 violaciones menores (severidad 2)**, ninguna bloqueante — se resuelven antes de lanzar, no antes de implementar.

## Violations Found

### Jerga técnica ("GES") expuesta sin explicación en el desglose al consumidor
- **Heurístico:** H2 — Match entre el sistema y el mundo real
- **Severidad:** 2 (Menor)
- **Ubicación:** Modal de desglose de cálculo (US-020), fila "+GES"
- **Descripción:** El Tech Spec reutiliza el desglose de tu7.cl casi literal, pero ese desglose está pensado para un ejecutivo (que sí conoce el término), no para Marcela. "GES" (Garantías Explícitas en Salud) no es un término que un consumidor promedio reconozca.
- **Impacto:** Marcela puede no entender esa línea del desglose, reduciendo (no eliminando) la sensación de transparencia que el desglose busca generar.
- **Recomendación:** En la versión pública del desglose, reemplazar "GES" por un label en lenguaje simple, ej. "Aporte adicional de tu isapre (GES)" — mantener la sigla entre paréntesis para quien sí la reconozca.

### Densidad de filtros con facetas sin patrón mobile definido
- **Heurístico:** H8 — Diseño estético y minimalista
- **Severidad:** 2 (Menor)
- **Ubicación:** Sidebar de filtros (US-019), en viewport mobile
- **Descripción:** Marcela es mobile-first (persona). El patrón de tu7.cl (sidebar de filtros con 6 secciones: beneficiarios, isapres, zonas, tipo, cobertura hospitalaria, cobertura ambulatoria) funciona en desktop, pero no se definió explícitamente cómo se comprime en una pantalla de celular sin abrumar.
- **Impacto:** Sin un patrón claro, el riesgo es un sidebar que ocupa toda la pantalla o que obliga a mucho scroll antes de ver resultados — contradice el "resultados en segundos" que es la propuesta de valor central.
- **Recomendación:** Definir explícitamente en el Skill #7 (UI Design Workflow) un patrón de **drawer/acordeón colapsable** para filtros en mobile, con los resultados siempre visibles por defecto y los filtros como una capa opcional, no bloqueante.

## Violations by Severity

| Severidad | Cantidad | Violaciones |
|---|---|---|
| 4 — Catastrófico | 0 | — |
| 3 — Mayor | 0 | — |
| 2 — Menor | 2 | Jerga "GES" sin explicar; densidad de filtros sin patrón mobile |
| 1 — Cosmético | 0 | — |

## Clearance

- [x] Sin violaciones de severidad 4 — no aplica rediseño de flujo
- [x] Sin violaciones de severidad 3 — no bloquea el inicio de implementación
- [ ] Violaciones de severidad 2 — resolver antes de lanzar: documentadas como restricciones de diseño para el Skill #7 (label en lenguaje simple + patrón de filtros mobile)

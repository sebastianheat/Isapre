Tengo 1 sandbox que ejecutó la Fase 1 del marketplace de leads (4 sub-fases) con personalidad Equilibrado:

- ../sandbox-1 (branch forja/fase1-equilibrado) → personalidad: Equilibrado

Tiene un RESUMEN.md y posiblemente PROBLEMAS.md y/o DECISIONES.md.

Haz esto:
1. Lee RESUMEN.md para contexto general de lo que se implementó.
2. Lee PROBLEMAS.md y DECISIONES.md si existen.
3. Para cada una de las 4 sub-fases (1.1 Reparto, 1.2 Créditos, 1.3 Interruptor/regresión, 1.4 Validación), compara la implementación contra los acceptance criteria de:
   - `.claude/PRPs/PIEZA-marketplace-leads-fase1.md`
   - `docs/ui-design/screen-flows/reparto-manual-fase-0.md`
   - `USER-STORIES-marketplace-leads.md` (Epic 2 + US-009/US-010)
4. Verifica explícitamente estos puntos no negociables del plan:
   - El lock atómico (`kvMarcarUnaVez`) está realmente en la asignación, no solo mencionado
   - El botón "Reasignar" (US-006b) devuelve el crédito al ejecutivo original correctamente
   - NO se tocó `lib/offline.ts` ni la lógica del export — solo se agregó la validación
   - El CSV de export de conversiones es idéntico antes/después (revisar la comparación que documentó el agente en RESUMEN.md)
   - Las pantallas nuevas (`/admin/reparto`, `/admin/creditos`) usan CSS plano, no Tailwind
   - No se tocó nada de `/cotizador`, `/panel`, ni Postgres
5. Corre `npx tsc --noEmit`, `npm run test`, y `npm run build` dentro del sandbox para confirmar que todo pasa.
6. Si todo está en orden, dame el comando exacto para traer los cambios a la rama principal:
   git log forja/fase1-equilibrado --oneline (para ver los commits)
   git cherry-pick <primer-commit>..<último-commit>
   (o, si prefieres un merge simple: git merge forja/fase1-equilibrado)
7. Si encuentras algo que no cumple el plan o los acceptance criteria, lístalo explícitamente antes de recomendar el merge — no asumas que "compila" significa "está completo".
8. Señala cualquier deuda técnica documentada que deba pasar a las notas de la Fase 2 del Blueprint.

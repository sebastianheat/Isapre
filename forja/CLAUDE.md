# La Forja — Instrucciones para el Agente (Operación: Fase 1 marketplace-leads)

> El `CLAUDE.md` de la raíz del proyecto es el Factory OS canónico de Forge — no se toca ni se reemplaza.
> Este archivo es específico de esta operación de La Forja y complementa al de la raíz. Léelo como una capa adicional.

## Alcance de esta Operación

Esta Forja construye **solo la Fase 1** del `BLUEPRINT-marketplace-leads.md` (de 8 fases totales). El contrato exacto está en `.claude/PRPs/PIEZA-marketplace-leads-fase1.md` — es tu fuente de verdad, no el Blueprint completo.

**No toques**: Postgres, Mercado Pago, `/panel`, `/cotizador`, o cualquier cosa de las Fases 2-8. Si te encuentras tentado a avanzar hacia eso, deténte — no es parte de esta Pieza.

## Comandos Disponibles

### Build y Tests
- `/build` → `npm run build` — verifica que compile sin errores
- `/test` → `npm run test` (Vitest)
- `/lint` → `npm run lint`
- Verificación de tipos rápida (preferir sobre build completo entre fases): `npx tsc --noEmit`

No hay Supabase ni migraciones en esta fase — todo vive en Upstash KV (`lib/store.ts`, ya existente).

## Reglas de Ejecución
- Después de completar CADA sub-fase (1.1, 1.2, 1.3, 1.4), ejecuta `npx tsc --noEmit` — no un build completo (ver Reglas de Disco abajo).
- Si los tipos fallan, corrige antes de avanzar a la siguiente sub-fase.
- Solo corre `npm run build` completo al final de la Fase 1 (sub-fase 1.4), no después de cada una.
- Si una sub-fase falla 3 veces seguidas, documenta en `PROBLEMAS.md` y avanza a la siguiente.

## Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15.5.25 + React 19 + TypeScript strict |
| Estilos (`/admin`) | CSS plano (`admin.css`) — **NO Tailwind aquí**, Tailwind se reserva para `/cotizador` y `/panel` |
| Datos | Upstash KV (`lib/store.ts`), sin Postgres en esta fase |
| Auth | Custom (`lib/auth.ts`, JWT + bcrypt) — ya existe, no se toca |
| Testing | Vitest (`lib/pricing.test.ts` es el precedente de cómo se testea lógica pura en este proyecto) |

## Convenciones del Proyecto (de CLAUDE.md raíz)
- Archivos max 500 líneas, funciones max 50
- Naming: `camelCase` vars, `PascalCase` components, `kebab-case` files
- TypeScript: siempre type hints, NUNCA `any` (usar `unknown`)
- Commits: `feat(F1-T1): description` — para esta operación, usa `fase-1.N: descripción corta`
- No crear `src/features/` — este proyecto usa `app/`, `lib/`, `components/` en la raíz directamente

## Referencias Obligatorias (leer antes de empezar)
1. `.claude/PRPs/PIEZA-marketplace-leads-fase1.md` — el contrato de esta operación
2. `docs/ui-design/screen-flows/reparto-manual-fase-0.md` — spec exacta de pantallas (layout, data, actions, states, acceptance targets)
3. `USER-STORIES-marketplace-leads.md` — Epic 2 completo + Epic 3 (US-009, US-010) — acceptance criteria detallados
4. `lib/leads.ts`, `lib/usuarios.ts`, `lib/store.ts` — código existente a extender, no reescribir

## Reglas de Disco (CRÍTICO — el proyecto tuvo un incidente real por esto)
- `node_modules` es un **symlink** al repo principal — NUNCA ejecutes `npm install` suelto
- Si necesitas un paquete nuevo: `npm install <paquete> --save` (se instala vía el symlink, visible desde el repo principal también)
- NO ejecutes `npm run build` después de cada sub-fase — solo al final de toda la Fase 1
- Si tu directorio de sandbox supera 2GB, detente y documenta en `PROBLEMAS.md`
- Solo hay **14GB libres** en este disco — sé especialmente cuidadoso con logs, caches, o artifacts temporales

## Recursos de esta Operación

| Recurso | Estimado |
|---------|----------|
| Agentes | 1 (Equilibrado) |
| RAM | ~3 GB |
| Disco | ~1-2 GB (sin node_modules duplicado) |

## Outputs al Terminar
- `RESUMEN.md` en la raíz del sandbox con: qué se implementó en cada sub-fase, decisiones tomadas, estado de los tests, deuda técnica si la hay.
- `PROBLEMAS.md` solo si algo quedó bloqueado.
- `DECISIONES.md` para cualquier mejora obvia que hayas aplicado con buen juicio (personalidad Equilibrado).

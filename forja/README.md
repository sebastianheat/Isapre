# La Forja — Fase 1 del Marketplace de Leads

Operación de 1 agente autónomo (personalidad **Equilibrado**) para construir la Fase 1 del `BLUEPRINT-marketplace-leads.md`: Reparto Manual Interno, sobre Upstash KV, sin Postgres ni Mercado Pago.

## Antes de empezar

- ⚠️ El agente corre con `--dangerously-skip-permissions`: puede ejecutar comandos sin pedirte confirmación. Mitigado por correr en un Git Worktree aislado (`../sandbox-1`), sin credenciales de producción nuevas, y con tu review antes de mergear.
- Solo tienes **14GB libres en disco** — el setup valida esto antes de crear el worktree, pero monitorea con `monitor.sh` igual.
- No se usa Supabase en esta fase — no hay nada de Docker que levantar.

## Paso 1 — Prerequisitos

```bash
claude --version   # confirma que Claude Code está instalado
```

## Paso 2 — Setup

```bash
chmod +x forja/setup.sh && ./forja/setup.sh
```

Esto crea `../sandbox-1` (worktree con branch `forja/fase1-equilibrado`) y enlaza `node_modules` por symlink.

## Paso 3 — Lanzar el agente

En una terminal nueva:

```bash
cd ../sandbox-1
claude --dangerously-skip-permissions "$(cat ../Isapre/forja/prompts/sandbox-1-equilibrado.md)"
```

(Ajusta la ruta de `cat` si tu carpeta del repo principal no se llama `Isapre`.)

## Paso 4 — Monitoreo

En otra terminal, mientras el agente trabaja:

```bash
chmod +x forja/monitor.sh && ./forja/monitor.sh
```

Verás commits, tamaño en disco, y si ya generó `RESUMEN.md` (= terminó).

Mientras tanto puedes seguir trabajando en el repo principal normalmente.

## Paso 5 — Review

Cuando el sandbox muestre `✅ TERMINADO`, vuelve a esta sesión de Claude Code (la del repo principal) y dile que ejecute el prompt de review:

```
Lee forja/prompts/review-prompt.md y ejecútalo
```

Te dará un veredicto fase por fase y el comando exacto para traer los cambios a tu rama principal (cherry-pick o merge).

## Limpieza (cuando termines, apruebes o descartes)

```bash
chmod +x forja/cleanup.sh && ./forja/cleanup.sh
```

Elimina el worktree, la branch `forja/fase1-equilibrado`, y opcionalmente las sesiones de Claude Code en `/tmp` asociadas.

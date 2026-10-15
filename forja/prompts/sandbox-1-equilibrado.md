Lee "forja/CLAUDE.md" (instrucciones de esta operación) y el "CLAUDE.md" de la raíz (Factory OS del proyecto, no lo modifiques).

Lee ".claude/PRPs/PIEZA-marketplace-leads-fase1.md" — es el contrato completo de lo que vas a construir: la Fase 1 del marketplace de leads (Reparto Manual Interno), 4 sub-fases, todo sobre Upstash KV existente, sin Postgres ni Mercado Pago.

Lee también "docs/ui-design/screen-flows/reparto-manual-fase-0.md" (spec exacta de las pantallas) y "USER-STORIES-marketplace-leads.md" Epic 2 completo + US-009/US-010 de Epic 3 (acceptance criteria detallados).

Tu prioridad es BALANCE. Sigue el plan con fidelidad pero aplica buen juicio de desarrollador.

Reglas:
- Si ves una mejora obvia, aplícala y documenta en DECISIONES.md
- Si un test es evidente (ej. para lib/credits-kv.ts), escríbelo
- No sobre-ingenierices — esta fase vive en KV, no construyas el ledger completo de Postgres antes de tiempo
- Si algo del plan no tiene sentido en la práctica, adapta con sentido común, pero documenta por qué
- Tu valor: produces un resultado SÓLIDO y equilibrado para las 4 sub-fases

REGLAS DE DISCO (CRÍTICO — leer antes de ejecutar):
- NO ejecutes npm install — node_modules es un SYMLINK al repo principal
- Si necesitas instalar un paquete nuevo: npm install <paquete> --save (se instala en el repo principal vía symlink)
- NO ejecutes npm run build después de cada sub-fase — solo al final de la 1.4
- Usa npx tsc --noEmit para verificar tipos entre sub-fases
- NO escribas logs grandes a disco ni redirecciones stdout/stderr a archivos
- Solo hay 14GB libres en este disco — si tu directorio supera 2GB, detente y documenta en PROBLEMAS.md

ENTORNO:
- No hay Supabase ni base de datos nueva en esta fase — todo sigue en Upstash KV (lib/store.ts, ya configurado)
- Las pantallas nuevas van en app/admin/reparto/ y app/admin/creditos/ — usa CSS plano (admin.css), NO Tailwind
- No toques app/cotizador/, components/cotizador/, ni nada de /panel — es de fases posteriores

Ejecuta las sub-fases así:

Sub-fase 1.1 (Reparto):
- Extiende lib/leads.ts: agrega assignmentStatus ("sin_asignar" | "asignado"), asignarLead(), reasignarLead()
- Usa kvMarcarUnaVez (ya existe en lib/store.ts) como lock atómico contra doble asignación
- Crea app/admin/reparto/page.tsx: cola de leads sin_asignar, selector de ejecutivo activo, asignar con 1 clic
- Extiende app/admin/leads/[id]/page.tsx con el botón "Reasignar" (US-006b) — devuelve el crédito al ejecutivo original

Sub-fase 1.2 (Créditos mínimos):
- Crea lib/credits-kv.ts: regalarCreditos(), obtenerSaldo(), listarMovimientos() — versión mínima sobre KV, NO el ledger completo de Postgres
- Crea app/admin/creditos/page.tsx: formulario de regalo de créditos (motivo obligatorio) + tabla de saldos
- Crea app/admin/creditos/[email]/page.tsx: historial de movimientos de un ejecutivo

Sub-fase 1.3 (Interruptor + regresión):
- Extiende lib/usuarios.ts: agrega campo recibiendoLeads (boolean)
- Agrega el toggle "Recibir leads" en app/admin/usuarios/page.tsx
- El selector de ejecutivo en /admin/reparto solo debe mostrar ejecutivos con recibiendoLeads=true
- Verifica manualmente (sin cambios de código esperados) que el selector de "calidad" del lead en /admin/leads/[id] sigue funcionando igual

Sub-fase 1.4 (Validación final):
- Genera el CSV de app/api/admin/leads/export-offline/route.ts ANTES de tus cambios (usa git stash si hace falta para comparar) y DESPUÉS — deben ser idénticos byte a byte sobre el mismo set de leads
- NO toques lib/offline.ts ni la lógica del export, solo valida
- Corre npm run test y npx tsc --noEmit — deben pasar sin errores
- Corre npm run build completo (única vez, al final)

Para CADA sub-fase:
1. Implementa
2. npx tsc --noEmit → si falla, corrige
3. Si ves una mejora obvia, aplícala y anótala en DECISIONES.md
4. Commit: "fase-1.N: descripción corta"
5. Avanza a la siguiente sub-fase

Si una sub-fase falla 3 veces seguidas, documenta en PROBLEMAS.md con: qué fase, el error exacto, qué intentaste, tu teoría de por qué falla. Haz commit del estado actual como "fase-1.N: WIP - bloqueado por [error]" y avanza a la siguiente.

Al finalizar las 4 sub-fases, crea RESUMEN.md con: qué se implementó en cada sub-fase, decisiones tomadas (resumen de DECISIONES.md), estado de los tests, resultado de la comparación del CSV de export, y cualquier deuda técnica identificada para la Fase 2.

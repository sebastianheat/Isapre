#!/bin/bash

# LA FORJA — Monitor de Sandbox (Fase 1 marketplace-leads)
# Muestra el progreso del agente cada 30 segundos.

REPO_DIR=$(cd "$(dirname "$0")/.." && pwd)

while true; do
    clear
    echo "═══════════════════════════════════════════════════════"
    echo "🔨 LA FORJA — Estado del Sandbox ($(date '+%H:%M:%S'))"
    echo "═══════════════════════════════════════════════════════"
    echo ""

    SANDBOX_DIR="$REPO_DIR/../sandbox-1"
    if [ -d "$SANDBOX_DIR" ]; then
        LAST_COMMIT=$(cd "$SANDBOX_DIR" && git log --oneline -1 2>/dev/null || echo "sin commits")
        COMMIT_COUNT=$(cd "$SANDBOX_DIR" && git rev-list --count forja/fase1-equilibrado ^"$(git -C "$REPO_DIR" branch --show-current)" 2>/dev/null || echo "0")
        SANDBOX_SIZE_MB=$(du -sm "$SANDBOX_DIR" 2>/dev/null | awk '{print $1}')

        STATUS="⏳ en progreso"
        [ -f "$SANDBOX_DIR/RESUMEN.md" ] && STATUS="✅ TERMINADO"
        PROBLEMAS=""
        [ -f "$SANDBOX_DIR/PROBLEMAS.md" ] && PROBLEMAS=" ⚠️  hay problemas"
        DISK_WARN=""
        [ "$SANDBOX_SIZE_MB" -gt 2048 ] 2>/dev/null && DISK_WARN=" 🔴 DISCO: ${SANDBOX_SIZE_MB}MB"

        echo "  Sandbox 1 (Equilibrado):"
        echo "    Commits: $COMMIT_COUNT | Disco: ${SANDBOX_SIZE_MB}MB | Estado: $STATUS$PROBLEMAS$DISK_WARN"
        echo "    Último: $LAST_COMMIT"
    else
        echo "  Sandbox 1: ❌ worktree no encontrado — ¿corriste setup.sh?"
    fi
    echo ""

    CLAUDE_TMP="/private/tmp/claude-$(id -u)"
    if [ -d "$CLAUDE_TMP" ]; then
        CLAUDE_TMP_SIZE_MB=$(du -sm "$CLAUDE_TMP" 2>/dev/null | awk '{print $1}')
        CLAUDE_TMP_SIZE_GB=$(( CLAUDE_TMP_SIZE_MB / 1024 ))
        echo "  💾 Claude /tmp: ${CLAUDE_TMP_SIZE_MB}MB"
        if [ "$CLAUDE_TMP_SIZE_GB" -gt 5 ]; then
            echo "  🔴 ALERTA: /tmp de Claude supera 5GB (${CLAUDE_TMP_SIZE_GB}GB)"
            echo "     Considera limpiar: rm -rf $CLAUDE_TMP/*"
        fi
        echo ""
    fi

    echo "───────────────────────────────────────────────────────"
    echo "  Ctrl+C para salir | Actualiza cada 30s"
    echo "═══════════════════════════════════════════════════════"
    sleep 30
done

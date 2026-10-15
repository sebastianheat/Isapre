#!/bin/bash
set -e

REPO_DIR=$(cd "$(dirname "$0")/.." && pwd)

echo "🧹 Limpiando sandbox de La Forja (Fase 1 marketplace-leads)..."

echo "   Podando worktrees huérfanos..."
git -C "$REPO_DIR" worktree prune 2>/dev/null || true

if [ -d "$REPO_DIR/../sandbox-1" ]; then
    [ -L "$REPO_DIR/../sandbox-1/node_modules" ] && rm "$REPO_DIR/../sandbox-1/node_modules"
    git -C "$REPO_DIR" worktree remove "$REPO_DIR/../sandbox-1" --force 2>/dev/null || true
    echo "   ✅ sandbox-1 eliminado"
fi

git -C "$REPO_DIR" branch -D forja/fase1-equilibrado 2>/dev/null || true

CLAUDE_TMP="/private/tmp/claude-$(id -u)"
if [ -d "$CLAUDE_TMP" ]; then
    PROJECT_NAME=$(basename "$REPO_DIR")
    CLAUDE_TMP_SIZE_MB=$(du -sm "$CLAUDE_TMP" 2>/dev/null | awk '{print $1}')
    echo ""
    echo "📁 Sesiones de Claude Code en $CLAUDE_TMP: ${CLAUDE_TMP_SIZE_MB}MB total"

    RELATED_DIRS=$(find "$CLAUDE_TMP" -maxdepth 1 -type d \( -name "*${PROJECT_NAME}*" -o -name "*sandbox*" \) 2>/dev/null)
    if [ -n "$RELATED_DIRS" ]; then
        RELATED_SIZE_MB=$(echo "$RELATED_DIRS" | xargs du -sm 2>/dev/null | awk '{sum+=$1} END {print sum}')
        echo "   Sesiones relacionadas con '$PROJECT_NAME': ${RELATED_SIZE_MB:-0}MB"
        echo ""
        read -p "   ¿Eliminar sesiones de Claude Code relacionadas? (s/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[SsYy]$ ]]; then
            echo "$RELATED_DIRS" | xargs rm -rf 2>/dev/null || true
            echo "   ✅ Sesiones eliminadas"
        fi
    fi
fi

echo ""
echo "✅ Limpieza completa."
echo ""
echo "Para limpiar TODAS las sesiones de Claude Code (recupera más espacio):"
echo "  rm -rf /private/tmp/claude-$(id -u)/*"

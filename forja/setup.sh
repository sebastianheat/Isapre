#!/bin/bash
set -e

# ═══════════════════════════════════════════════════════════
# LA FORJA — Setup de Sandboxes
# Proyecto: Isapre (cotizador-romina)
# Operación: Fase 1 del marketplace-leads (Reparto Manual Interno)
# Agentes: 1
# Supabase: no (esta fase vive en Upstash KV)
# ═══════════════════════════════════════════════════════════

REPO_DIR=$(cd "$(dirname "$0")/.." && pwd)
CREATED_WORKTREES=()
echo ""
echo "🔨 LA FORJA — Configurando 1 sandbox (Fase 1 marketplace-leads)"
echo "📁 Repo: $REPO_DIR"
echo ""

# ─── Cleanup automático si el script falla a mitad ───────
cleanup_on_error() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        echo ""
        echo "❌ Setup falló (exit code: $exit_code). Limpiando worktrees creados..."
        for wt in "${CREATED_WORKTREES[@]}"; do
            if [ -d "$wt" ]; then
                git worktree remove "$wt" --force 2>/dev/null || true
                echo "   🧹 Eliminado: $wt"
            fi
        done
        echo "   Limpieza de emergencia completa."
    fi
}
trap cleanup_on_error EXIT

# ─── Verificaciones ──────────────────────────────────────

if ! command -v git &> /dev/null; then
    echo "❌ Git no encontrado. Instálalo primero."
    exit 1
fi

if ! command -v claude &> /dev/null; then
    echo "❌ Claude CLI no encontrado. Instala con: npm install -g @anthropic-ai/claude-code"
    exit 1
fi

if ! git -C "$REPO_DIR" rev-parse --is-inside-work-tree &> /dev/null 2>&1; then
    echo "❌ No estás dentro de un repositorio git."
    exit 1
fi

# ─── Verificar Recursos ─────────────────────────────────

echo "📊 Recursos estimados: ~3GB RAM para 1 agente"

if [[ "$OSTYPE" == "darwin"* ]]; then
    TOTAL_RAM_GB=$(( $(sysctl -n hw.memsize) / 1073741824 ))
else
    TOTAL_RAM_GB=$(( $(grep MemTotal /proc/meminfo | awk '{print $2}') / 1048576 ))
fi
echo "   RAM total del sistema: ${TOTAL_RAM_GB}GB"

# ─── Verificar Espacio en Disco ──────────────────────────

echo ""
echo "💾 Verificando espacio en disco..."

if [[ "$OSTYPE" == "darwin"* ]]; then
    FREE_DISK_GB=$(df -g "$REPO_DIR" | tail -1 | awk '{print $4}')
else
    FREE_DISK_GB=$(df -BG "$REPO_DIR" | tail -1 | awk '{print $4}' | tr -d 'G')
fi

PROJECT_SIZE_MB=$(du -sm "$REPO_DIR" --exclude=node_modules --exclude=.next --exclude=.git 2>/dev/null | awk '{print $1}')
[ -z "$PROJECT_SIZE_MB" ] && PROJECT_SIZE_MB=$(du -sm "$REPO_DIR" 2>/dev/null | awk '{print $1}')
ESTIMATED_DISK_MB=$(( (PROJECT_SIZE_MB / 5) + 500 ))
ESTIMATED_DISK_GB=$(( ESTIMATED_DISK_MB / 1024 + 1 ))

echo "   Espacio libre: ${FREE_DISK_GB}GB"
echo "   Estimado necesario: ~${ESTIMATED_DISK_GB}GB (1 sandbox)"

if [ "$ESTIMATED_DISK_GB" -gt "$((FREE_DISK_GB * 3 / 4))" ]; then
    echo ""
    echo "❌ ESPACIO INSUFICIENTE: Necesitas ~${ESTIMATED_DISK_GB}GB pero solo hay ${FREE_DISK_GB}GB libres."
    echo "   Libera espacio antes de continuar."
    exit 1
fi

# Verificar /tmp de Claude Code (macOS)
CLAUDE_TMP="/private/tmp/claude-$(id -u)"
if [ -d "$CLAUDE_TMP" ]; then
    CLAUDE_TMP_SIZE_MB=$(du -sm "$CLAUDE_TMP" 2>/dev/null | awk '{print $1}')
    CLAUDE_TMP_SIZE_GB=$(( CLAUDE_TMP_SIZE_MB / 1024 ))
    if [ "$CLAUDE_TMP_SIZE_GB" -gt 5 ]; then
        echo ""
        echo "⚠️  ADVERTENCIA: $CLAUDE_TMP ocupa ${CLAUDE_TMP_SIZE_GB}GB."
        echo "   Para limpiar sesiones antiguas: rm -rf $CLAUDE_TMP/*"
        echo ""
        read -p "¿Continuar de todos modos? (s/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
            echo "Cancelado."
            exit 0
        fi
    fi
fi
echo ""

# ─── Crear Worktree ──────────────────────────────────────

echo "🌿 Creando worktree..."

if [ -d "$REPO_DIR/../sandbox-1" ]; then
    echo "   sandbox-1 ya existe, saltando..."
else
    git -C "$REPO_DIR" worktree add "$REPO_DIR/../sandbox-1" -b forja/fase1-equilibrado
    CREATED_WORKTREES+=("$REPO_DIR/../sandbox-1")
    echo "   ✅ sandbox-1 (branch: forja/fase1-equilibrado)"
fi

# ─── Symlink node_modules (evita duplicar ~500MB) ────────

echo ""
echo "🔗 Enlazando node_modules desde el repo principal..."

if [ -d "$REPO_DIR/node_modules" ]; then
    SANDBOX_DIR="$REPO_DIR/../sandbox-1"
    if [ -d "$SANDBOX_DIR/node_modules" ] && [ ! -L "$SANDBOX_DIR/node_modules" ]; then
        echo "   ⚠️  sandbox-1: node_modules existente (no es symlink), eliminando..."
        rm -rf "$SANDBOX_DIR/node_modules"
    fi
    if [ ! -L "$SANDBOX_DIR/node_modules" ]; then
        ln -s "$REPO_DIR/node_modules" "$SANDBOX_DIR/node_modules"
        echo "   ✅ sandbox-1 → symlink a node_modules principal"
    else
        echo "   sandbox-1 → symlink ya existe, saltando..."
    fi
else
    echo "   ⚠️  No se encontró node_modules en el repo principal."
    echo "   Corre 'npm install' en $REPO_DIR antes de lanzar el agente."
fi

# ─── Resumen ──────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════════════"
echo "🔨 LA FORJA — Setup Completo"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Worktrees:"
git -C "$REPO_DIR" worktree list
echo ""
echo "💡 TIP: Para comandos más cortos, puedes crear un alias:"
echo "  alias c='claude --dangerously-skip-permissions'"
echo ""
echo "⚠️  NOTA: --dangerously-skip-permissions permite al agente ejecutar"
echo "   comandos del sistema sin pedir confirmación. Solo usar en sandboxes aislados."
echo ""
echo "🚀 Siguiente paso: Lanza el agente en su tab de terminal"
echo ""
echo "Tab 1 (Equilibrado):"
echo "  cd \"$REPO_DIR/../sandbox-1\""
echo "  claude --dangerously-skip-permissions \"\$(cat \"$REPO_DIR/forja/prompts/sandbox-1-equilibrado.md\")\""
echo ""
echo "📊 Monitor de progreso:"
echo "  chmod +x \"$REPO_DIR/forja/monitor.sh\" && \"$REPO_DIR/forja/monitor.sh\""
echo ""
echo "═══════════════════════════════════════════════════════"

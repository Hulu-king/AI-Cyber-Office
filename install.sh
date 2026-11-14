#!/usr/bin/env bash
set -e

echo "========================================"
echo "  AI Cyber Office - One-Click Installer "
echo "========================================"

INSTALL_DIR="$HOME/AI-Cyber-Office"

if command -v git >/dev/null 2>&1; then
  if [ -d "$INSTALL_DIR/.git" ]; then
    echo "[1/4] Updating existing AI-Cyber-Office..."
    git -C "$INSTALL_DIR" pull --ff-only
  else
    echo "[1/4] Cloning AI-Cyber-Office..."
    rm -rf "$INSTALL_DIR"
    git clone https://github.com/Hulu-king/AI-Cyber-Office.git "$INSTALL_DIR"
  fi
else
  echo "[1/4] Downloading AI-Cyber-Office tarball..."
  rm -rf "$INSTALL_DIR"
  mkdir -p "$INSTALL_DIR"
  curl -fsSL https://github.com/Hulu-king/AI-Cyber-Office/archive/refs/heads/master.tar.gz | tar -xz --strip-components=1 -C "$INSTALL_DIR"
fi

echo "[2/4] Linking Antigravity & Codex plugins..."
mkdir -p "$HOME/.gemini/config/plugins" "$HOME/.codex/skills"
ln -sfn "$INSTALL_DIR" "$HOME/.gemini/config/plugins/ai-cyber-office"
ln -sfn "$INSTALL_DIR/skills/ai-cyber-office" "$HOME/.codex/skills/ai-cyber-office"

echo "[3/4] Registering MCP Server in ~/.codex/config.toml..."
CODEX_CFG="$HOME/.codex/config.toml"
touch "$CODEX_CFG"
if ! grep -q "mcp_servers.ai_cyber_office" "$CODEX_CFG"; then
  printf '\n[mcp_servers.ai_cyber_office]\ncommand = "python3"\nargs = ["%s/mcp_server.py"]\n' "$INSTALL_DIR" >> "$CODEX_CFG"
fi

echo "[4/4] Starting AI Cyber Office..."
if ! pgrep -f "$INSTALL_DIR/server.py" >/dev/null 2>&1; then
  nohup python3 "$INSTALL_DIR/server.py" >/tmp/ai-cyber-office.log 2>&1 &
  sleep 1
fi

if [ "$(uname -s)" = "Linux" ] && [ -n "$DISPLAY$WAYLAND_DISPLAY" ]; then
  nohup python3 "$INSTALL_DIR/desktop_dock.py" >/tmp/ai-cyber-dock.log 2>&1 &
fi

echo "Done! Visit http://localhost:8080 (restart ChatGPT / Antigravity to load MCP & Skill)."

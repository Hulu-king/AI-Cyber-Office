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
  mkdir -p "$HOME/.local/share/applications" "$HOME/.local/share/icons/hicolor/128x128/apps"
  ICON_PATH="$INSTALL_DIR/icons/ai-office.svg"
  PNG_ICON="$HOME/.local/share/icons/hicolor/128x128/apps/ai-cyber-office.png"
  if python3 -c "import gi; gi.require_version('GdkPixbuf','2.0'); from gi.repository import GdkPixbuf; pb=GdkPixbuf.Pixbuf.new_from_file_at_scale('$ICON_PATH',128,128,True); pb.savev('$PNG_ICON','png',[],[])" >/dev/null 2>&1; then
    ICON_PATH="$PNG_ICON"
  fi
  cat > "$HOME/.local/share/applications/ai-cyber-office.desktop" <<EOF
[Desktop Entry]
Name=AI Cyber Office
Comment=AI Cyber Office - Pixel Dashboard & Floating Dock
Exec=python3 $INSTALL_DIR/desktop_dock.py
Icon=$ICON_PATH
Terminal=false
Type=Application
Categories=Utility;Development;System;
StartupWMClass=ai-cyber-office
StartupNotify=false
EOF
  update-desktop-database "$HOME/.local/share/applications" >/dev/null 2>&1 || true
  nohup python3 "$INSTALL_DIR/desktop_dock.py" >/tmp/ai-cyber-dock.log 2>&1 &
elif [ "$(uname -s)" = "Darwin" ]; then
  open "http://localhost:8080" >/dev/null 2>&1 || true
fi

echo "Done! Visit http://localhost:8080 (restart ChatGPT / Antigravity to load MCP & Skill)."

# 🏢 AI Cyber Office (AI 像素赛博办公室)

A cross-platform **real-time pixel cyber office & floating desktop dock** that monitors your local AI assistants (**ChatGPT / Codex**, **Claude**, **DeepSeek**, **Antigravity**), live quotas, active tasks/terminals, and interactive approval popups — with **one-click Chinese / English bilingual switching** and **universal AI tool plugin / MCP support**.

[中文说明](#中文说明) | [English](#english)

---

## English

### ✨ Features
- **Real Local Telemetry (`ai_real_monitor.py`)**: Automatically detects running local AI clients, active windows, live token/session quotas, terminal commands, and reasoning steps across **Linux, macOS, and Windows**.
- **CEO Office Interactive Approvals**: Only real interactive decision/confirmation prompts send an AI agent into the central CEO Office. Clicking the agent or approval card jumps directly to that AI client's window.
- **Quota-Aware Pixel Animations**:
  - **Working**: Crisp pixel mascots typing at dual-monitor desks with status bubbles.
  - **5h Cooldown / Coffee Break**: When a short-window limit hits 0% while weekly quota remains, agents stroll around leisure zones (coffee bar, cyber pantry, arcade, lounge) with coffee & headphones.
  - **Out of Quota**: Lights turn off and agents sleep; when quota recovers, gold coins burst overhead as they return to work.
- **Native Desktop Dock + Full Office (`desktop_dock.py`)**: Floating always-on-top mini dock with per-AI scrolling task tickers; one-click switch between Mini Dock and Full Cyber Office.
- **Bilingual (`🌐 中文 / EN`)**: Instant language toggle synced across Web UI, Canvas, Telemetry API, and Desktop Dock.

### 🚀 Quick Start

```bash
git clone https://github.com/Hulu-king/AI-Cyber-Office.git
cd AI-Cyber-Office

# 1. Start local backend & web dashboard (http://localhost:8080)
python3 server.py

# 2. (Linux) Start the native floating desktop dock
python3 desktop_dock.py
```

### 🔌 Install in Any AI Tool (Plugin / Skill / MCP)
This repository is ready to load into your favorite AI client right after cloning:

- **Antigravity**:
  ```bash
  ln -s "$(pwd)" ~/.gemini/config/plugins/ai-cyber-office
  ```
- **ChatGPT Desktop / Codex CLI** (Skill + MCP):
  ```bash
  # Add Skill
  mkdir -p ~/.codex/skills
  ln -s "$(pwd)/skills/ai-cyber-office" ~/.codex/skills/ai-cyber-office
  ```
  And add to `~/.codex/config.toml`:
  ```toml
  [mcp_servers.ai_cyber_office]
  command = "python3"
  args = ["/path/to/AI-Cyber-Office/mcp_server.py"]
  ```
- **Claude Code**:
  ```bash
  claude --plugin-dir /path/to/AI-Cyber-Office
  ```
- **Cursor / Windsurf / Cline / Any MCP Client**:
  Add to your MCP config JSON:
  ```json
  {
    "mcpServers": {
      "ai-cyber-office": {
        "command": "python3",
        "args": ["/path/to/AI-Cyber-Office/mcp_server.py"]
      }
    }
  }
  ```

---

## 中文说明

### ✨ 核心特性
- **真实本地 AI 实时监测**：跨平台（Linux / macOS / Windows）自动探测本机 **ChatGPT / Codex**、**Claude**、**DeepSeek**、**Antigravity** 的运行窗口、真实剩余额度、终端执行与推理动态。
- **CEO 总裁室真实审批**：仅当本地 AI 真正弹出选择/确认弹窗时，对应 AI 员工才会走进中央 CEO 办公室等待；点击员工或待批示卡片即可直接跳转并激活对应 AI 客户端窗口。
- **额度感知像素动画**：
  - **工作中**：专属像素员工在双屏工位打字并实时滚动展示任务；
  - **茶歇冷却**：5 小时额度耗尽但周额度仍有剩余时，员工保持亮灯并在咖啡吧、休闲区溜达放松；
  - **额度耗尽休眠 / 恢复爆金币**：额度归零关灯休眠，额度恢复时头顶冒出小金币开心复工。
- **桌面悬浮挂件 & 全景模式互通**：支持桌面常驻一字长条悬浮挂件，一键切换全景办公室与迷你挂件。
- **中英双语一键切换（`🌐 中文 / EN`）**：网页端、像素画布、遥测日志与桌面挂件全链路同步切换。

### 🚀 快速启动

```bash
git clone https://github.com/Hulu-king/AI-Cyber-Office.git
cd AI-Cyber-Office

# 1. 启动本地服务与全景像素办公室 (http://localhost:8080)
python3 server.py

# 2. (Linux) 启动桌面悬浮挂件
python3 desktop_dock.py
```

### 🔌 在各大 AI 客户端中安装加载（插件 / Skill / MCP）
克隆仓库后，可按以下方式直接接入您的 AI 工具：

- **Antigravity**：
  ```bash
  ln -s "$(pwd)" ~/.gemini/config/plugins/ai-cyber-office
  ```
- **ChatGPT Desktop / Codex CLI**（挂载 Skill + MCP）：
  ```bash
  mkdir -p ~/.codex/skills
  ln -s "$(pwd)/skills/ai-cyber-office" ~/.codex/skills/ai-cyber-office
  ```
  并在 `~/.codex/config.toml` 中添加：
  ```toml
  [mcp_servers.ai_cyber_office]
  command = "python3"
  args = ["/path/to/AI-Cyber-Office/mcp_server.py"]
  ```
- **Claude Code**：
  ```bash
  claude --plugin-dir /path/to/AI-Cyber-Office
  ```
- **Cursor / Windsurf / Cline 等任意 MCP 客户端**：
  在 MCP 配置文件中添加：
  ```json
  {
    "mcpServers": {
      "ai-cyber-office": {
        "command": "python3",
        "args": ["/path/to/AI-Cyber-Office/mcp_server.py"]
      }
    }
  }
  ```

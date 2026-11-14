---
name: ai-cyber-office
description: Launch and monitor AI Cyber Office — a cross-platform pixel office dashboard and floating dock that tracks local AI assistants (ChatGPT/Codex, Claude, DeepSeek, Antigravity), live quotas, active tasks, and pending CEO approval popups.
---

# AI Cyber Office Skill

Use this skill when the user wants to launch, inspect, or control **AI Cyber Office**.

## Capabilities

1. **Live Telemetry (`get_ai_office_status` MCP tool or `python3 ai_real_monitor.py`)**:
   - Reads real local state for ChatGPT/Codex (`~/.codex`), Claude (`~/.claude`), DeepSeek, and Antigravity.
   - Reports remaining quota percentages, 5-hour/weekly break states, active windows/tasks, and pending interactive prompts (`ceo_requests`).
2. **Launch Office & Desktop Dock (`start_ai_office` MCP tool)**:
   - Starts `server.py` on `http://localhost:8080` and optionally `desktop_dock.py` (Linux GTK floating dock with WebKit2 Full Office toggle).
3. **Focus Client Window (`focus_ai_client` MCP tool)**:
   - Brings the target AI assistant window (`openai`, `claude`, `deepseek`, `antigravity`) to the foreground.
4. **Bilingual Switching (`set_office_language` MCP tool)**:
   - Switches between Chinese (`zh`) and English (`en`) across the web dashboard, telemetry API, and desktop dock.

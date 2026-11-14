#!/usr/bin/env python3
"""
AI Cyber Office - Zero-dependency stdio MCP Server
Allows any MCP-compatible AI tool (Antigravity, Claude Code, Codex, Cursor, Windsurf, etc.)
to inspect live local AI quotas, pending approvals, focus client windows, and launch the office UI.
"""

import json
import os
import subprocess
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import ai_real_monitor  # noqa: E402


TOOLS = [
    {
        "name": "get_ai_office_status",
        "description": "Get live status, remaining quotas, active windows/tasks, and pending CEO approval requests across all detected local AI assistants (ChatGPT/Codex, Claude, DeepSeek, Antigravity).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "lang": {
                    "type": "string",
                    "enum": ["zh", "en"],
                    "description": "Optional output language override ('zh' or 'en')."
                }
            }
        }
    },
    {
        "name": "focus_ai_client",
        "description": "Focus and bring to front a local AI assistant window (openai/chatgpt, claude, deepseek, antigravity/gemini).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "client": {
                    "type": "string",
                    "description": "Target AI client ID: openai, claude, deepseek, or antigravity."
                }
            },
            "required": ["client"]
        }
    },
    {
        "name": "start_ai_office",
        "description": "Start the AI Cyber Office local web server (http://localhost:8080) and/or native desktop dock if not already running.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "with_dock": {
                    "type": "boolean",
                    "description": "Also launch the GTK desktop floating dock (Linux).",
                    "default": True
                }
            }
        }
    },
    {
        "name": "set_office_language",
        "description": "Switch AI Cyber Office UI and telemetry language between Chinese ('zh') and English ('en').",
        "inputSchema": {
            "type": "object",
            "properties": {
                "lang": {
                    "type": "string",
                    "enum": ["zh", "en"]
                }
            },
            "required": ["lang"]
        }
    }
]


def _is_port_open(port=8080):
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) == 0


def handle_tool_call(name, arguments):
    if name == "get_ai_office_status":
        snap = ai_real_monitor.get_snapshot(lang_override=arguments.get("lang"))
        return json.dumps(snap, ensure_ascii=False, indent=2)

    if name == "focus_ai_client":
        res = ai_real_monitor.focus_ai_window(arguments.get("client", "openai"))
        return json.dumps(res, ensure_ascii=False)

    if name == "start_ai_office":
        started = []
        if not _is_port_open(8080):
            subprocess.Popen(
                [sys.executable, str(BASE_DIR / "server.py")],
                cwd=str(BASE_DIR),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True,
            )
            started.append("server:8080")
        if arguments.get("with_dock", True) and sys.platform.startswith("linux"):
            chk = subprocess.run(["pgrep", "-f", "desktop_dock.py"], capture_output=True, text=True)
            if not chk.stdout.strip():
                subprocess.Popen(
                    [sys.executable, str(BASE_DIR / "desktop_dock.py")],
                    cwd=str(BASE_DIR),
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    start_new_session=True,
                )
                started.append("desktop_dock")
        return json.dumps({"ok": True, "url": "http://localhost:8080", "started": started}, ensure_ascii=False)

    if name == "set_office_language":
        lang = "en" if arguments.get("lang") == "en" else "zh"
        state = ai_real_monitor.load_ceo_state()
        state["lang"] = lang
        ai_real_monitor.save_ceo_state(state)
        return json.dumps({"ok": True, "lang": lang}, ensure_ascii=False)

    raise ValueError(f"Unknown tool: {name}")


def main():
    for raw_line in sys.stdin:
        line = raw_line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
        except Exception:
            continue

        msg_id = msg.get("id")
        method = msg.get("method", "")
        params = msg.get("params") or {}

        if method == "notifications/initialized":
            continue

        if method == "initialize":
            resp = {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {"tools": {}},
                    "serverInfo": {"name": "ai-cyber-office", "version": "1.0.0"}
                }
            }
        elif method == "tools/list":
            resp = {"jsonrpc": "2.0", "id": msg_id, "result": {"tools": TOOLS}}
        elif method == "tools/call":
            try:
                text = handle_tool_call(params.get("name"), params.get("arguments") or {})
                resp = {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "result": {"content": [{"type": "text", "text": text}]}
                }
            except Exception as e:
                resp = {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "result": {"content": [{"type": "text", "text": str(e)}], "isError": True}
                }
        else:
            if msg_id is None:
                continue
            resp = {
                "jsonrpc": "2.0",
                "id": msg_id,
                "error": {"code": -32601, "message": f"Method not found: {method}"}
            }

        sys.stdout.write(json.dumps(resp, ensure_ascii=False) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()

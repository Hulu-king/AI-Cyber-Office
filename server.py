#!/usr/bin/env python3
"""
AI Cyber Office - 本地服务与事件分发网关
提供静态文件托管、跨平台实时 AI 状态探测 API (/api/live_state) 以及 CEO 审批交互接口 (/api/ceo_action)
"""

import http.server
import importlib
import json
import os
import socketserver
import subprocess
import time
import ai_real_monitor

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


class CyberOfficeHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        # 过滤高频轮询日志，保持终端整洁
        if args and "/api/live_state" in str(args[0]):
            return
        super().log_message(format, *args)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def do_GET(self):
        if self.path.startswith('/api/live_state'):
            try:
                importlib.reload(ai_real_monitor)
                snap = ai_real_monitor.get_snapshot()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(snap, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
        elif self.path.startswith('/api/ceo_notes'):
            try:
                notes_file = os.path.join(DIRECTORY, 'ceo_notes.json')
                notes = []
                if os.path.exists(notes_file):
                    with open(notes_file, 'r', encoding='utf-8') as f:
                        notes = json.load(f)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({'notes': notes}, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
        else:
            super().do_GET()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length else "{}"
        if self.path == '/api/ceo_action':
            try:
                importlib.reload(ai_real_monitor)
                data = json.loads(body)
                action = data.get("action")
                state = ai_real_monitor.load_ceo_state()
                focus_res = None
                if action == "focus_window":
                    dept_id = data.get("dept") or data.get("deptId")
                    focus_res = ai_real_monitor.focus_ai_window(dept_id)
                elif action == "approve":
                    req_id = data.get("id")
                    dept_id = data.get("dept") or data.get("deptId")
                    if dept_id and data.get("focus", True):
                        focus_res = ai_real_monitor.focus_ai_window(dept_id)
                    if req_id and req_id not in state.setdefault("approved_ids", []):
                        state["approved_ids"].append(req_id)
                elif action == "approve_all":
                    snap = ai_real_monitor.get_snapshot()
                    for r in snap.get("ceo_requests", []):
                        if r["id"] not in state.setdefault("approved_ids", []):
                            state["approved_ids"].append(r["id"])
                elif action == "reset_approvals":
                    state["approved_ids"] = []
                elif action == "set_lang":
                    lang_val = data.get("lang", "zh")
                    state["lang"] = "en" if lang_val == "en" else "zh"
                elif action == "return_to_dock":
                    state["view_mode"] = "dock"
                    state["return_to_dock_ts"] = time.time()
                    try:
                        chk = subprocess.run(["pgrep", "-f", "desktop_dock.py"], capture_output=True, text=True)
                        if not chk.stdout.strip():
                            subprocess.Popen(
                                ["python3", os.path.join(DIRECTORY, "desktop_dock.py")],
                                stdout=subprocess.DEVNULL,
                                stderr=subprocess.DEVNULL
                            )
                    except Exception:
                        pass
                elif action == "open_full_office":
                    state["view_mode"] = "full"
                elif action == "toggle_wake":
                    dept_id = data.get("dept") or data.get("deptId")
                    if dept_id:
                        overrides = state.setdefault("quota_overrides", {})
                        if overrides.get(dept_id) == "awake":
                            overrides.pop(dept_id, None)
                        else:
                            overrides[dept_id] = "awake"
                ai_real_monitor.save_ceo_state(state)
                snap = ai_real_monitor.get_snapshot()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok", "focus": focus_res, "snapshot": snap}, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
        elif self.path == '/api/ceo_notes':
            try:
                data = json.loads(body)
                notes = data.get('notes', [])
                notes_file = os.path.join(DIRECTORY, 'ceo_notes.json')
                with open(notes_file, 'w', encoding='utf-8') as f:
                    json.dump(notes, f, ensure_ascii=False, indent=2)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'ok', 'notes': notes}, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
        elif self.path == '/api/event':
            try:
                data = json.loads(body)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'ok', 'received': data}).encode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()


def main():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), CyberOfficeHandler) as httpd:
        print("=====================================================")
        print(f"🏢 AI 像素赛博办公室已启动！http://localhost:{PORT}")
        print("=====================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n服务已优雅关闭。")


if __name__ == '__main__':
    main()

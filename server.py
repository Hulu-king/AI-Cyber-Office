#!/usr/bin/env python3
"""
AI Cyber Office - 本地服务与事件分发网关
提供静态文件托管以及支持外部 AI 调用的 Webhook/API 接口
"""

import http.server
import socketserver
import os
import json

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CyberOfficeHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # 允许跨域，方便 VS Code 插件或外部前端调试
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/event':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(body)
                print(f"[AI-OFFICE EVENT] 收到外部事件: {data}")
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
    with socketserver.TCPServer(("", PORT), CyberOfficeHandler) as httpd:
        print(f"=====================================================")
        print(f"🏢 AI 像素赛博办公室已启动！")
        print(f"🌐 本地访问地址: http://localhost:{PORT}")
        print(f"📁 项目工作区: {DIRECTORY}")
        print(f"=====================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n服务已优雅关闭。")

if __name__ == '__main__':
    main()

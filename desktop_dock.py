#!/usr/bin/env python3
"""
AI Cyber Office - Ubuntu 原生桌面极简状态栏挂件
专为 Wayland / GNOME 优化：支持原生窗口拖拽，去掉所有多余手动调试按钮
纯自动状态监控与客户端快捷联动
"""

import os
import sys
import json
import threading
import urllib.request
import subprocess
import gi

gi.require_version('Gtk', '3.0')
gi.require_version('Gdk', '3.0')
from gi.repository import Gtk, Gdk, GLib

CSS_DATA = b"""
window.desktop-dock {
    background-color: rgba(13, 16, 24, 0.94);
    border: 2px solid #2d354d;
    border-radius: 10px;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.85);
}

.dock-drag-bar {
    color: #64748b;
    font-size: 13px;
    padding: 0 4px;
}
.dock-drag-bar:hover {
    color: #94a3b8;
}

.dock-pod-btn {
    background: #111422;
    border: 1px solid #282f48;
    border-radius: 6px;
    padding: 4px 10px;
    transition: all 0.15s ease;
}

.dock-pod-btn:hover {
    background: #1e2438;
    border-color: #38bdf8;
}

.dock-pod-btn.working {
    border-color: #10b981;
    background: #0f2420;
}

.dock-pod-btn.sender {
    border-color: #f59e0b;
    background: #2b1f0e;
}

.dock-pod-btn.receiver {
    border-color: #38bdf8;
    background: #0e2238;
}

.dock-pod-btn.sleeping {
    opacity: 0.5;
    background: #0a0c14;
}

.dock-banner-label {
    color: #38bdf8;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(14, 165, 233, 0.15);
}
"""

class AIDesktopDock(Gtk.Window):
    def __init__(self):
        super().__init__(type=Gtk.WindowType.TOPLEVEL)

        self.set_title("AI Cyber Office Dock")
        self.set_decorated(False)
        self.set_keep_above(True)
        self.set_skip_taskbar_hint(True)
        self.set_skip_pager_hint(True)
        self.set_name("desktop-dock")

        # 初始停靠在左侧 Ubuntu Dock 边缘旁边 (x=76, y=140)
        self.move(76, 140)

        # 启用 Wayland 原生窗口拖拽事件捕获
        self.add_events(Gdk.EventMask.BUTTON_PRESS_MASK | Gdk.EventMask.BUTTON1_MOTION_MASK)
        self.connect("button-press-event", self.on_window_button_press)

        self.apply_css()
        self.init_ui()

        # 启动后台监听线程，接收自动化流转事件 (无需手动按按钮)
        self.start_background_listener()

    def apply_css(self):
        provider = Gtk.CssProvider()
        provider.load_from_data(CSS_DATA)
        Gtk.StyleContext.add_provider_for_screen(
            Gdk.Screen.get_default(),
            provider,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        )

    # ==========================================
    # 核心：Wayland 原生窗口拖动处理
    # ==========================================
    def on_window_button_press(self, widget, event):
        if event.button == 1:
            # begin_move_drag 是 GNOME/Wayland 下合成器接管的原生窗口拖拽 API
            self.begin_move_drag(event.button, int(event.x_root), int(event.y_root), event.time)
            return True
        elif event.button == 3:
            # 右键弹出极简退出菜单
            self.show_context_menu(event)
            return True
        return False

    def show_context_menu(self, event):
        menu = Gtk.Menu()
        open_web = Gtk.MenuItem(label="🏢 打开全景办公室看板")
        open_web.connect("activate", lambda w: subprocess.Popen(["xdg-open", "http://localhost:8080"]))
        menu.append(open_web)

        sep = Gtk.SeparatorMenuItem()
        menu.append(sep)

        quit_item = Gtk.MenuItem(label="✕ 退出桌面挂件")
        quit_item.connect("activate", lambda w: Gtk.main_quit())
        menu.append(quit_item)

        menu.show_all()
        menu.popup(None, None, None, None, event.button, event.time)

    def init_ui(self):
        self.main_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        self.main_box.set_margin_start(10)
        self.main_box.set_margin_end(10)
        self.main_box.set_margin_top(6)
        self.main_box.set_margin_bottom(6)
        self.add(self.main_box)

        # 拖拽手柄条 (按住直接拖动窗口)
        self.handle = Gtk.EventBox()
        handle_lbl = Gtk.Label(label="❖")
        handle_lbl.get_style_context().add_class("dock-drag-bar")
        self.handle.add(handle_lbl)
        self.handle.connect("button-press-event", self.on_window_button_press)
        self.main_box.pack_start(self.handle, False, False, 2)

        # 4 个官方客户端卡片 (纯状态显示，去除所有调试假按钮)
        self.pods = {}
        ai_data = [
            ("deepseek", "🐳 DeepSeek", "78%", "#38bdf8", "deepseek-harness.desktop"),
            ("claude", "🦀 Claude", "85%", "#f97316", "com.anthropic.Claude.desktop"),
            ("openai", "🌀 ChatGPT", "92%", "#10b981", "chatgpt.desktop"),
            ("antigravity", "✦ Antigravity", "98%", "#c084fc", "antigravity.desktop"),
        ]

        for aid, name, quota, color, desktop_entry in ai_data:
            btn = Gtk.Button()
            btn.get_style_context().add_class("dock-pod-btn")

            box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
            lbl = Gtk.Label()
            lbl.set_markup(f"<span foreground='{color}'><b>{name}</b></span> <span size='small' color='#94a3b8'>{quota}</span>")
            box.pack_start(lbl, False, False, 0)

            dot = Gtk.Label(label="●")
            dot.override_color(Gtk.StateFlags.NORMAL, Gdk.RGBA(0.1, 0.7, 0.4, 1.0))
            box.pack_start(dot, False, False, 0)

            btn.add(box)
            # 点击客户端直接聚焦或启动该客户端程序
            btn.connect("clicked", self.on_client_launch, desktop_entry)
            self.main_box.pack_start(btn, False, False, 0)
            self.pods[aid] = {"btn": btn, "label": lbl, "dot": dot, "color": color, "name": name, "quota": quota}

        # 自动化交接状态展示条 (平日隐藏，发生任务流转时自动浮现)
        self.handoff_label = Gtk.Label()
        self.handoff_label.get_style_context().add_class("dock-banner-label")
        self.handoff_label.set_no_show_all(True)
        self.main_box.pack_start(self.handoff_label, False, False, 4)

        self.show_all()

    def on_client_launch(self, btn, desktop_entry):
        print(f"[NATIVE DOCK] 点击快捷聚焦启动客户端: {desktop_entry}")
        try:
            subprocess.Popen(["gtk-launch", desktop_entry])
        except Exception:
            pass

    # ==========================================
    # 真实/自动流转时，挂件全自动展示（无需手动按按钮）
    # ==========================================
    def trigger_auto_handoff(self, from_id, to_id, task_name):
        from_info = self.pods.get(from_id)
        to_info = self.pods.get(to_id)
        if not from_info or not to_info:
            return

        # 1. 改变槽位高亮
        from_info["btn"].get_style_context().add_class("sender")
        to_info["btn"].get_style_context().add_class("receiver")

        # 2. 自动显示流转横幅
        self.handoff_label.set_text(f"📁 {from_info['name']} ➔ {to_info['name']}: {task_name}")
        self.handoff_label.show()

        # 3. 2.5 秒后完成，自动恢复待命
        def reset_ui():
            from_info["btn"].get_style_context().remove_class("sender")
            to_info["btn"].get_style_context().remove_class("receiver")
            self.handoff_label.hide()
            return False

        GLib.timeout_add(3000, reset_ui)

    def start_background_listener(self):
        """后台轮询，保持与本地事件系统或真实状态同步"""
        def poll():
            import time
            while True:
                time.sleep(8)
                # 随机演示一次自动协同 (真正使用时接入真实的代理日志)
                pass

        t = threading.Thread(target=poll, daemon=True)
        t.start()

def main():
    dock = AIDesktopDock()
    dock.show_all()
    Gtk.main()

if __name__ == '__main__':
    main()

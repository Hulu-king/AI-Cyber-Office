#!/usr/bin/env python3
"""
AI Cyber Office - 跨平台桌面常驻极简悬浮挂件 (GTK3)
特性：
1. 极简一字长条布局，无多余底部跑马灯
2. 每个 AI 独立框内分为两行：
   - 第一行（固定不滚动）：左侧【专属像素吉祥物图标 + 名字】，右侧【真实额度百分比 + 状态灯】
   - 第二行（框内平滑滚动）：实时滚动显示该 AI 当前正在执行的任务、活动窗口、调用的软件或终端命令
3. 直接读取本机各大 AI 客户端的真实实时运行数据（ai_real_monitor.py）
"""

import importlib
import os
import socket
import subprocess
import sys
import threading
import time
import unicodedata
from pathlib import Path

# Local compatibility for this process only:
# 1. NO_AT_BRIDGE=1 prevents libatk-bridge SIGSEGV in WebKit2GTK when AT-SPI bus is unresponsive
# 2. WEBKIT_DISABLE_DMABUF_RENDERER=1 prevents blank WebKit2 window on NVIDIA + Wayland
os.environ.setdefault("NO_AT_BRIDGE", "1")
os.environ.setdefault("WEBKIT_DISABLE_DMABUF_RENDERER", "1")

import gi

gi.require_version('Gtk', '3.0')
gi.require_version('Gdk', '3.0')
gi.require_version('GdkPixbuf', '2.0')
from gi.repository import Gtk, Gdk, GLib, Pango, GdkPixbuf

HAS_WEBKIT2 = False
try:
    gi.require_version('WebKit2', '4.1')
    from gi.repository import WebKit2
    HAS_WEBKIT2 = True
except Exception:
    try:
        gi.require_version('WebKit2', '4.0')
        from gi.repository import WebKit2
        HAS_WEBKIT2 = True
    except Exception:
        HAS_WEBKIT2 = False

import ai_real_monitor

BASE_DIR = Path(__file__).resolve().parent

CSS_DATA = b"""
window.desktop-dock {
    background-color: rgba(13, 16, 24, 0.96);
    border: 2px solid #3b82f6;
    border-radius: 8px;
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.95);
}

.dock-drag-bar {
    color: #64748b;
    font-size: 14px;
    padding: 0 4px;
}
.dock-drag-bar:hover {
    color: #38bdf8;
}

.dock-pod-btn {
    background: #111422;
    border: 1px solid #282f45;
    border-radius: 6px;
    padding: 4px 10px;
    margin: 0 2px;
    min-width: 205px;
}

.dock-pod-btn:hover {
    background: #1b2034;
    border-color: #38bdf8;
}

.dock-pod-btn.working {
    border-color: #10b981;
    background: #0f261f;
}

.dock-pod-btn.sleeping {
    opacity: 0.78;
    background: #160d12;
    border-color: #ef4444;
}

.pod-scroll-text {
    font-family: 'JetBrains Mono', 'Noto Sans Mono CJK SC', 'Noto Sans SC', monospace;
    font-size: 11px;
}

.dock-action-btn {
    background: #1e2438;
    border: 1px solid #3b476e;
    border-radius: 5px;
    padding: 3px 8px;
    font-size: 11px;
    color: #cbd5e1;
}

.dock-action-btn:hover {
    background: #2b3656;
    color: #ffffff;
}

.dock-action-btn.primary {
    background: #4f46e5;
    border-color: #6366f1;
    color: #ffffff;
}
.dock-action-btn.primary:hover {
    background: #6366f1;
}

.dock-action-btn.danger {
    background: #7f1d1d;
    border-color: #b91c1c;
    color: #fca5a5;
}
.dock-action-btn.danger:hover {
    background: #b91c1c;
    color: #ffffff;
}
"""


def char_visual_width(ch):
    """计算单个字符的视觉列宽（中文/全角/Emoji 计为 2，ASCII 计为 1）"""
    if ord(ch) > 0x1F000:
        return 2
    eaw = unicodedata.east_asian_width(ch)
    return 2 if eaw in ('W', 'F') else 1


def slice_marquee_window(ring_text, offset, target_cols=24):
    """从环形文本中按固定视觉列宽截取子串，保证框内滚动时宽度绝对恒定不抖动"""
    if not ring_text:
        return " " * target_cols
    n = len(ring_text)
    idx = offset % n
    out = []
    cols = 0
    steps = 0
    while cols < target_cols and steps < n * 2:
        ch = ring_text[idx]
        w = char_visual_width(ch)
        if cols + w > target_cols:
            out.append(" ")
            cols += 1
            break
        out.append(ch)
        cols += w
        idx = (idx + 1) % n
        steps += 1
    while cols < target_cols:
        out.append(" ")
        cols += 1
    return "".join(out)


class AIDesktopDock(Gtk.Window):
    def __init__(self):
        super().__init__(type=Gtk.WindowType.TOPLEVEL)

        self.set_title("AI Cyber Office Dock")
        self.set_decorated(False)

        self.set_type_hint(Gdk.WindowTypeHint.UTILITY)
        self.set_keep_above(True)
        self.stick()

        self.set_skip_taskbar_hint(False)
        self.set_skip_pager_hint(False)
        self.set_position(Gtk.WindowPosition.CENTER)
        self.set_name("desktop-dock")
        self.set_resizable(False)

        try:
            icon_path = str(BASE_DIR / "icons" / "ai-office.svg")
            if os.path.exists(icon_path):
                self.set_icon_from_file(icon_path)
        except Exception:
            pass

        self.add_events(Gdk.EventMask.BUTTON_PRESS_MASK | Gdk.EventMask.BUTTON1_MOTION_MASK)
        self.connect("button-press-event", self.on_window_button_press)

        self.full_win = None
        self.webview = None
        self._full_load_ok = False
        self._stop_event = threading.Event()
        init_state = ai_real_monitor.load_ceo_state()
        self.last_return_ts = init_state.get("return_to_dock_ts", 0)

        self.apply_css()
        self.init_ui()
        self.ensure_server_running()

        # Initial non-blocking background telemetry sync
        self._poll_thread = threading.Thread(target=self._poll_loop, daemon=True)
        self._poll_thread.start()

        GLib.timeout_add(180, self.step_pod_marquees)
        GLib.timeout_add(350, self.check_mode_switch)

    def apply_css(self):
        provider = Gtk.CssProvider()
        provider.load_from_data(CSS_DATA)
        Gtk.StyleContext.add_provider_for_screen(
            Gdk.Screen.get_default(),
            provider,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        )

    def on_window_button_press(self, widget, event):
        if event.button == 1:
            self.begin_move_drag(event.button, int(event.x_root), int(event.y_root), event.time)
            return True
        return False

    def init_ui(self):
        self.main_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        self.main_row.set_margin_start(8)
        self.main_row.set_margin_end(8)
        self.main_row.set_margin_top(6)
        self.main_row.set_margin_bottom(6)
        self.add(self.main_row)

        # 拖拽手柄 ❖
        self.handle = Gtk.EventBox()
        handle_lbl = Gtk.Label(label="❖")
        handle_lbl.get_style_context().add_class("dock-drag-bar")
        self.handle.add(handle_lbl)
        self.handle.connect("button-press-event", self.on_window_button_press)
        self.main_row.pack_start(self.handle, False, False, 2)

        # 4 个客户端独立卡片（使用专属设计的吉祥物 SVG 图标）
        self.pods = {}
        ai_data = [
            ("deepseek", "DeepSeek", "char-deepseek.svg", "0%", "#4DA3FF", "deepseek-harness.desktop"),
            ("claude", "Claude", "char-claude.svg", "0%", "#FF7A2E", "com.anthropic.Claude.desktop"),
            ("openai", "ChatGPT", "char-chatgpt.svg", "72%", "#FFFFFF", "chatgpt.desktop"),
            ("antigravity", "Antigravity", "char-gemini.svg", "86%", "#C084FC", "antigravity.desktop"),
        ]

        for aid, name, svg_file, quota, color, desktop_entry in ai_data:
            btn = Gtk.Button()
            btn.get_style_context().add_class("dock-pod-btn")

            pod_vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=3)

            # 第一行（固定不滚动）：左侧【吉祥物图标 + 名字】，右侧【真实额度百分比 + 状态圆点】
            top_hbox = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=5)

            left_title_hbox = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=5)
            svg_path = BASE_DIR / "icons" / svg_file
            if svg_path.exists():
                try:
                    pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(str(svg_path), 18, 18, True)
                    img = Gtk.Image.new_from_pixbuf(pixbuf)
                    left_title_hbox.pack_start(img, False, False, 0)
                except Exception:
                    pass

            name_lbl = Gtk.Label()
            name_lbl.set_markup(f"<span foreground='{color}'><b>{name}</b></span>")
            name_lbl.set_xalign(0)
            left_title_hbox.pack_start(name_lbl, False, False, 0)
            top_hbox.pack_start(left_title_hbox, True, True, 0)

            right_top_hbox = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=4)
            quota_lbl = Gtk.Label()
            quota_lbl.set_markup(f"<span size='small' foreground='#e2e8f0'><b>{quota}</b></span>")
            quota_lbl.set_xalign(1)
            right_top_hbox.pack_start(quota_lbl, False, False, 0)

            dot_lbl = Gtk.Label()
            dot_lbl.set_markup("<span size='small' foreground='#10b981'>●</span>")
            dot_lbl.set_xalign(1)
            right_top_hbox.pack_start(dot_lbl, False, False, 0)

            top_hbox.pack_end(right_top_hbox, False, False, 0)
            pod_vbox.pack_start(top_hbox, False, False, 0)

            # 第二行（在每个 AI 自己的框内滚动显示正在执行的任务/软件/终端）
            state_lbl = Gtk.Label()
            state_lbl.get_style_context().add_class("pod-scroll-text")
            state_lbl.set_xalign(0)
            state_lbl.set_width_chars(24)
            state_lbl.set_max_width_chars(24)
            state_lbl.set_ellipsize(Pango.EllipsizeMode.NONE)
            state_lbl.set_markup("<span foreground='#34d399'>正在连接实时会话…       </span>")
            pod_vbox.pack_start(state_lbl, False, False, 0)

            btn.add(pod_vbox)
            btn.connect("clicked", self.on_client_launch, aid)
            self.main_row.pack_start(btn, False, False, 0)

            self.pods[aid] = {
                "btn": btn,
                "state_lbl": state_lbl,
                "quota_lbl": quota_lbl,
                "dot_lbl": dot_lbl,
                "name": name,
                "color": color,
                "ring_text": "正在读取实时任务…   ｜   ",
                "offset": 0,
                "is_sleeping": False
            }

        sep = Gtk.Separator(orientation=Gtk.Orientation.VERTICAL)
        self.main_row.pack_start(sep, False, False, 2)

        self.lang_btn = Gtk.Button(label="🌐 中/EN")
        self.lang_btn.get_style_context().add_class("dock-action-btn")
        self.lang_btn.set_tooltip_text("切换中英文语言 / Toggle Chinese & English")
        self.lang_btn.connect("clicked", self.on_toggle_lang)
        self.main_row.pack_start(self.lang_btn, False, False, 2)

        self.open_btn = Gtk.Button(label="🖥️ 打开全景")
        self.open_btn.get_style_context().add_class("dock-action-btn")
        self.open_btn.get_style_context().add_class("primary")
        self.open_btn.set_tooltip_text("打开全景高清像素办公室与 CEO 审批中心 / Open Full Cyber Office")
        self.open_btn.connect("clicked", self.on_open_full_office)
        self.main_row.pack_start(self.open_btn, False, False, 2)

        self.close_btn = Gtk.Button(label="✕ 关闭")
        self.close_btn.get_style_context().add_class("dock-action-btn")
        self.close_btn.get_style_context().add_class("danger")
        self.close_btn.set_tooltip_text("退出并关闭桌面悬浮挂件 / Close Desktop Dock")
        self.close_btn.connect("clicked", lambda w: Gtk.main_quit())
        self.main_row.pack_start(self.close_btn, False, False, 2)

        self.show_all()

    def on_toggle_lang(self, btn):
        try:
            state = ai_real_monitor.load_ceo_state()
            cur = state.get("lang", "zh")
            state["lang"] = "en" if cur == "zh" else "zh"
            ai_real_monitor.save_ceo_state(state)
            self.sync_with_real_ai()
        except Exception:
            pass

    def ensure_server_running(self):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(0.4)
                if s.connect_ex(("127.0.0.1", 8080)) == 0:
                    return
            subprocess.Popen(
                [sys.executable, str(BASE_DIR / "server.py")],
                cwd=str(BASE_DIR),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True,
            )
        except Exception as e:
            print(f"[NATIVE DOCK] start server failed: {e}")

    def on_open_full_office(self, btn):
        try:
            with open("/tmp/ai-cyber-dock.log", "a", encoding="utf-8") as lf:
                lf.write(f"[CLICK] on_open_full_office HAS_WEBKIT2={HAS_WEBKIT2}\n")
        except Exception:
            pass
        self.ensure_server_running()
        try:
            state = ai_real_monitor.load_ceo_state()
            state["view_mode"] = "full"
            ai_real_monitor.save_ceo_state(state)
        except Exception:
            pass

        if HAS_WEBKIT2:
            try:
                self._full_load_ok = False
                if self.full_win is None:
                    self.full_win = Gtk.Window(type=Gtk.WindowType.TOPLEVEL)
                    cur_lang = ai_real_monitor.load_ceo_state().get("lang", "zh")
                    self.full_win.set_title("AI Cyber Office - Full Office" if cur_lang == "en" else "AI Cyber Office - 全景像素办公室")
                    self.full_win.set_default_size(1440, 860)
                    self.full_win.set_position(Gtk.WindowPosition.CENTER)
                    try:
                        icon_path = str(BASE_DIR / "icons" / "ai-office.svg")
                        if os.path.exists(icon_path):
                            self.full_win.set_icon_from_file(icon_path)
                    except Exception:
                        pass
                    self.webview = WebKit2.WebView()
                    settings = self.webview.get_settings()
                    settings.set_enable_developer_extras(True)
                    settings.set_javascript_can_open_windows_automatically(True)
                    self.webview.connect("close", self.on_close_full_office)
                    self.webview.connect("load-changed", self.on_webview_load_changed)
                    self.webview.connect("load-failed", self.on_webview_load_failed)
                    self.webview.connect("web-process-terminated", self.on_webview_terminated)
                    self.full_win.add(self.webview)
                    self.full_win.connect("delete-event", self.on_full_win_delete)
                    self.webview.load_uri("http://localhost:8080")
                else:
                    self.webview.reload()
                self.full_win.show_all()
                self.full_win.present_with_time(Gtk.get_current_event_time())
                return
            except Exception as e:
                print(f"[NATIVE DOCK] WebKit2 open failed, fallback to browser: {e}")

        subprocess.Popen(["xdg-open", "http://localhost:8080"])

    def on_webview_load_changed(self, webview, load_event):
        if load_event == WebKit2.LoadEvent.FINISHED:
            self._full_load_ok = True
            self.hide()

    def on_webview_load_failed(self, webview, load_event, failing_uri, error):
        self._full_load_ok = False
        self.return_to_mini_dock()
        subprocess.Popen(["xdg-open", "http://localhost:8080"])
        return True

    def on_webview_terminated(self, webview, reason):
        self._full_load_ok = False
        self.return_to_mini_dock()

    def on_full_win_delete(self, win, event):
        self.return_to_mini_dock()
        return True

    def on_close_full_office(self, webview):
        self.return_to_mini_dock()

    def return_to_mini_dock(self):
        try:
            state = ai_real_monitor.load_ceo_state()
            state["view_mode"] = "dock"
            ai_real_monitor.save_ceo_state(state)
        except Exception:
            pass
        if self.full_win is not None:
            self.full_win.hide()
        self.show_all()
        self.present()
        self.set_keep_above(True)

    def check_mode_switch(self):
        try:
            state = ai_real_monitor.load_ceo_state()
            ts = state.get("return_to_dock_ts", 0)
            if ts > self.last_return_ts:
                self.last_return_ts = ts
                self.return_to_mini_dock()
        except Exception:
            pass
        return True

    def on_client_launch(self, btn, aid):
        try:
            ai_real_monitor.focus_ai_window(aid)
        except Exception:
            pass

    def step_pod_marquees(self):
        """推进每个 AI 框内第二行的实时任务滚动字幕"""
        for aid, pod in self.pods.items():
            ring = pod["ring_text"]
            pod["offset"] = (pod["offset"] + 1) % max(1, len(ring))
            sliced = slice_marquee_window(ring, pod["offset"], target_cols=24)
            escaped = GLib.markup_escape_text(sliced)
            fg = "#f87171" if pod["is_sleeping"] else ("#fde68a" if pod.get("is_coffee_break") else "#34d399")
            pod["state_lbl"].set_markup(f"<span foreground='{fg}'>{escaped}</span>")
        return True

    def _poll_loop(self):
        while not self._stop_event.is_set():
            try:
                importlib.reload(ai_real_monitor)
                snap = ai_real_monitor.get_snapshot()
                GLib.idle_add(self._apply_snapshot, snap)
            except Exception as e:
                print(f"[NATIVE DOCK] 后台采集异常: {e}")
            self._stop_event.wait(3.0)

    def sync_with_real_ai(self):
        """即时刷新一次快照（如切换语言后）"""
        try:
            importlib.reload(ai_real_monitor)
            snap = ai_real_monitor.get_snapshot()
            self._apply_snapshot(snap)
        except Exception as e:
            print(f"[NATIVE DOCK] UI更新异常: {e}")
        return False

    def _apply_snapshot(self, snap):
        """在 GTK 主线程中安全更新 UI（数据已在后台线程采集完毕）"""
        try:
            lang = snap.get("lang", "zh")
            is_en = (lang == "en")

            if hasattr(self, "lang_btn"):
                self.lang_btn.set_label("🌐 EN" if is_en else "🌐 中文")
                self.lang_btn.set_tooltip_text("Switch Language" if is_en else "切换中英文语言")
            if hasattr(self, "open_btn"):
                self.open_btn.set_label("🖥️ Full Office" if is_en else "🖥️ 打开全景")
                self.open_btn.set_tooltip_text("Open Full Cyber Office" if is_en else "打开全景高清像素办公室与 CEO 审批中心")
            if hasattr(self, "close_btn"):
                self.close_btn.set_label("✕ Close" if is_en else "✕ 关闭")
                self.close_btn.set_tooltip_text("Close Desktop Dock" if is_en else "退出并关闭桌面悬浮挂件")
            if self.full_win is not None:
                self.full_win.set_title("AI Cyber Office - Full Office" if is_en else "AI Cyber Office - 全景像素办公室")

            w_counts = snap.get("window_counts", {})
            w_titles = snap.get("window_titles", {})
            quotas = snap.get("quotas", {})

            for pod_id in ["deepseek", "claude", "openai", "antigravity"]:
                monitor_key = "chatgpt" if pod_id == "openai" else ("gemini" if pod_id == "antigravity" else pod_id)
                q_info = quotas.get(monitor_key, {})
                w_count = w_counts.get(monitor_key, 0)
                pod = self.pods.get(pod_id)
                if not pod:
                    continue

                display_str = q_info.get("display_str", "0%")
                is_sleeping = q_info.get("is_sleeping", False)
                is_coffee_break = (q_info.get("status") == "coffee_break")
                scroll_items = q_info.get("scroll_items", [])

                q_color = "#f87171" if is_sleeping else ("#fde68a" if is_coffee_break else "#e2e8f0")
                pod["quota_lbl"].set_markup(
                    f"<span size='small' foreground='{q_color}'><b>{GLib.markup_escape_text(display_str)}</b></span>"
                )

                pod["is_sleeping"] = is_sleeping
                pod["is_coffee_break"] = is_coffee_break
                if is_sleeping:
                    pod["btn"].get_style_context().add_class("sleeping")
                    pod["dot_lbl"].set_markup("<span size='small' foreground='#ef4444'>●</span>")
                elif is_coffee_break:
                    pod["btn"].get_style_context().remove_class("sleeping")
                    pod["dot_lbl"].set_markup("<span size='small' foreground='#f59e0b'>●</span>")
                else:
                    pod["btn"].get_style_context().remove_class("sleeping")
                    pod["dot_lbl"].set_markup("<span size='small' foreground='#10b981'>●</span>")

                w_unit = "w" if is_en else "窗"
                prefix = f"🌙 {w_count}{w_unit} ｜ " if is_sleeping else (f"☕ {w_count}{w_unit} ｜ " if is_coffee_break else f"● {w_count}{w_unit} ｜ ")
                if scroll_items:
                    new_ring = prefix + "   ｜   ".join(scroll_items) + "   ｜   "
                else:
                    new_ring = prefix + ("Online   ｜   " if is_en else "在线   ｜   ")

                if new_ring != pod["ring_text"]:
                    pod["ring_text"] = new_ring

                titles = w_titles.get(monitor_key, [])
                if is_en:
                    tt_lines = [f"{pod['name']}  (Live Quota: {display_str} | Active Windows/Sessions: {w_count})"]
                else:
                    tt_lines = [f"{pod['name']}  (真实额度: {display_str} | 活动窗口/会话: {w_count})"]
                if scroll_items:
                    tt_lines.append("\nRunning / Live Telemetry:" if is_en else "\n正在执行 / 实时动态:")
                    for s in scroll_items:
                        tt_lines.append(f"  • {s}")
                if titles:
                    tt_lines.append("\nWindows & Sessions:" if is_en else "\n窗口与会话明细:")
                    for t in titles:
                        tt_lines.append(f"  • {t}")
                pod["btn"].set_tooltip_text("\n".join(tt_lines))

            self.set_keep_above(True)
        except Exception as e:
            print(f"[NATIVE DOCK] UI更新异常: {e}")
        return False


def main():
    dock = AIDesktopDock()
    dock.show_all()
    dock.present()
    Gtk.main()


if __name__ == '__main__':
    main()

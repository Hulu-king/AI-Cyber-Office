#!/usr/bin/env python3
"""
topbar_indicator.py - Ubuntu 顶部通知条原生系统挂件 (System Tray / AppIndicator)
采用原生的 org.kde.StatusNotifierItem + com.canonical.dbusmenu 协议
直接将 AI 赛博办公室嵌入 Ubuntu 顶部状态栏 (与 WiFi、电量图标并列)
"""

import os
import sys
import subprocess
import dbus
import dbus.service
import dbus.mainloop.glib
from gi.repository import GLib

ICON_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "icons"))
ICON_NAME = "ai-office"

class DBusMenu(dbus.service.Object):
    def __init__(self, bus, path, on_menu_action):
        super().__init__(bus, path)
        self.on_menu_action = on_menu_action
        self.revision = 1

    @dbus.service.method("com.canonical.dbusmenu", in_signature="iias", out_signature="u(ia{sv}av)")
    def GetLayout(self, parent_id, recursion_depth, property_names):
        # 菜单结构：
        # 0: Root
        #   1: DeepSeek
        #   2: Claude
        #   3: ChatGPT
        #   4: Antigravity
        #   5: Separator
        #   6: Open Web
        #   7: Quit
        items = [
            (1, {"label": "🐳 DeepSeek: 运行中 (小鲸鱼 78%)", "enabled": True}, []),
            (2, {"label": "🦀 Claude: 待命 (85%)", "enabled": True}, []),
            (3, {"label": "🌀 ChatGPT: 待命 (92%)", "enabled": True}, []),
            (4, {"label": "✦ Antigravity: 待命 (98%)", "enabled": True}, []),
            (5, {"type": "separator"}, []),
            (6, {"label": "🖥️ 打开像素办公室全景看板", "enabled": True}, []),
            (7, {"label": "✕ 退出顶部监控", "enabled": True}, [])
        ]
        return (self.revision, (0, {"children-display": "submenu"}, items))

    @dbus.service.method("com.canonical.dbusmenu", in_signature="isvu", out_signature="")
    def Event(self, id, eventId, data, timestamp):
        if eventId == "clicked":
            self.on_menu_action(id)

    @dbus.service.signal("com.canonical.dbusmenu", signature="ui")
    def LayoutUpdated(self, revision, parent):
        pass


class StatusNotifierItem(dbus.service.Object):
    def __init__(self, bus):
        self.bus = bus
        self.path = "/StatusNotifierItem"
        self.menu_path = "/com/canonical/dbusmenu"
        super().__init__(bus, self.path)

        self.dbus_menu = DBusMenu(bus, self.menu_path, self.handle_menu_click)
        self.status = "Active"
        self.title = "AI Cyber Office"
        self.tooltip_text = "AI 赛博办公室: DeepSeek(78%) | Claude(85%) | GPT(92%) | AG(98%)"

        self.register_with_watcher()

    def register_with_watcher(self):
        try:
            watcher = self.bus.get_object("org.kde.StatusNotifierWatcher", "/StatusNotifierWatcher")
            watcher.RegisterStatusNotifierItem(self.path, dbus_interface="org.kde.StatusNotifierWatcher")
            print("[TOPBAR] 成功向 Ubuntu 顶部通知条注册 StatusNotifierItem！")
        except Exception as e:
            print(f"[TOPBAR] 注册失败: {e}")

    # ==========================================
    # org.kde.StatusNotifierItem 属性与方法
    # ==========================================
    @dbus.service.method("org.freedesktop.DBus.Properties", in_signature="ss", out_signature="v")
    def Get(self, interface, prop):
        props = {
            "Category": "ApplicationStatus",
            "Id": "ai-cyber-office",
            "Title": self.title,
            "Status": self.status,
            "IconName": ICON_NAME,
            "IconThemePath": ICON_DIR,
            "Menu": self.menu_path,
            "ItemIsMenu": False,
            "ToolTip": dbus.Struct((ICON_NAME, dbus.Array([], signature="(iiay)"), self.title, self.tooltip_text), signature="(sa(iiay)ss)")
        }
        return props.get(prop, "")

    @dbus.service.method("org.freedesktop.DBus.Properties", in_signature="s", out_signature="a{sv}")
    def GetAll(self, interface):
        return {
            "Category": "ApplicationStatus",
            "Id": "ai-cyber-office",
            "Title": self.title,
            "Status": self.status,
            "IconName": ICON_NAME,
            "IconThemePath": ICON_DIR,
            "Menu": self.menu_path,
            "ItemIsMenu": False,
            "ToolTip": dbus.Struct((ICON_NAME, dbus.Array([], signature="(iiay)"), self.title, self.tooltip_text), signature="(sa(iiay)ss)")
        }

    @dbus.service.method("org.kde.StatusNotifierItem", in_signature="ii", out_signature="")
    def Activate(self, x, y):
        print(f"[TOPBAR] 用户单击顶部状态栏图标: ({x}, {y})")
        subprocess.Popen(["xdg-open", "http://localhost:8080"])

    @dbus.service.method("org.kde.StatusNotifierItem", in_signature="ii", out_signature="")
    def ContextMenu(self, x, y):
        pass

    def handle_menu_click(self, item_id):
        print(f"[TOPBAR] 点击菜单项: {item_id}")
        if item_id == 1:
            subprocess.Popen(["gtk-launch", "deepseek-harness.desktop"])
        elif item_id == 2:
            subprocess.Popen(["gtk-launch", "com.anthropic.Claude.desktop"])
        elif item_id == 3:
            subprocess.Popen(["gtk-launch", "chatgpt.desktop"])
        elif item_id == 4:
            subprocess.Popen(["gtk-launch", "antigravity.desktop"])
        elif item_id == 6:
            subprocess.Popen(["xdg-open", "http://localhost:8080"])
        elif item_id == 7:
            print("[TOPBAR] 退出指示器")
            sys.exit(0)


def main():
    dbus.mainloop.glib.DBusGMainLoop(set_as_default=True)
    bus = dbus.SessionBus()

    # 声明唯一服务名称
    bus_name = dbus.service.BusName(f"org.freedesktop.StatusNotifierItem-{os.getpid()}-1", bus)
    item = StatusNotifierItem(bus)

    loop = GLib.MainLoop()
    print("==================================================")
    print("🏢 AI 赛博办公室 - 顶部通知条原生挂件已启动")
    print(f"📁 图标路径: {ICON_DIR}")
    print("==================================================")
    try:
        loop.run()
    except KeyboardInterrupt:
        pass

if __name__ == '__main__':
    main()

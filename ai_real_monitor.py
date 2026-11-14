#!/usr/bin/env python3
"""
AI Real Monitor - 跨平台 (Linux / macOS / Windows) 本地 AI 自动探测与实时状态引擎
直接读取本地已安装和正在运行的 AI 客户端（ChatGPT/Codex, Claude, DeepSeek/DSH, Antigravity/Gemini 等）的：
1. 真实实时额度 / 余额 / 限流状态
2. 真实活动窗口数量与正在执行的任务、调用的软件、终端命令
3. 真正需要人类 CEO 交互选择 / 确认 / 批准的阻塞任务 (如弹出选择按钮 ask_question / AskUserQuestion / awaiting confirmation)
4. 跨平台窗口激活跳转 (点击 CEO 办公室任务或工位直接跳转到对应 AI 客户端窗口)
"""

import ctypes
import glob
import json
import os
import platform
import re
import sqlite3
import subprocess
import time
from pathlib import Path

HOME = Path.home()
SYSTEM = platform.system().lower()  # 'linux', 'darwin', 'windows'
BASE_DIR = Path(__file__).resolve().parent
CEO_STATE_FILE = BASE_DIR / "ceo_approved_state.json"


def load_ceo_state():
    if CEO_STATE_FILE.exists():
        try:
            return json.loads(CEO_STATE_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"approved_ids": [], "quota_overrides": {}}


def save_ceo_state(state):
    try:
        CEO_STATE_FILE.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")
    except Exception:
        pass


def get_os_config_dirs(app_names):
    """跨平台获取应用配置目录 (支持 Linux / macOS / Windows)"""
    dirs = []
    for name in app_names:
        if SYSTEM == "darwin":
            dirs.append(HOME / "Library" / "Application Support" / name)
        elif SYSTEM == "windows":
            appdata = Path(os.environ.get("APPDATA", str(HOME / "AppData" / "Roaming")))
            localappdata = Path(os.environ.get("LOCALAPPDATA", str(HOME / "AppData" / "Local")))
            dirs.extend([appdata / name, localappdata / name])
        else:
            dirs.append(HOME / ".config" / name)
        dirs.append(HOME / f".{name.lower()}")
    return [d for d in dirs if d.exists()]


def _activate_x11_window(win_hex_id):
    """使用纯 Python ctypes 调用 libX11 发送 _NET_ACTIVE_WINDOW 激活并置顶指定 X11 窗口"""
    try:
        wid = int(win_hex_id, 16) if isinstance(win_hex_id, str) else int(win_hex_id)
        x11 = ctypes.cdll.LoadLibrary("libX11.so.6")
        x11.XOpenDisplay.restype = ctypes.c_void_p
        dpy = x11.XOpenDisplay(None)
        if not dpy:
            return False

        root = x11.XDefaultRootWindow(ctypes.c_void_p(dpy))
        x11.XInternAtom.restype = ctypes.c_ulong
        net_active = x11.XInternAtom(ctypes.c_void_p(dpy), b"_NET_ACTIVE_WINDOW", False)

        class XClientMessageEvent(ctypes.Structure):
            _fields_ = [
                ("type", ctypes.c_int),
                ("serial", ctypes.c_ulong),
                ("send_event", ctypes.c_int),
                ("display", ctypes.c_void_p),
                ("window", ctypes.c_ulong),
                ("message_type", ctypes.c_ulong),
                ("format", ctypes.c_int),
                ("data", ctypes.c_long * 5),
            ]

        ev = XClientMessageEvent()
        ev.type = 33  # ClientMessage
        ev.serial = 0
        ev.send_event = 1
        ev.display = dpy
        ev.window = wid
        ev.message_type = net_active
        ev.format = 32
        ev.data[0] = 2  # 2 = pager / user action
        ev.data[1] = 0
        ev.data[2] = 0

        mask = (1 << 20) | (1 << 19)  # SubstructureRedirectMask | SubstructureNotifyMask
        x11.XSendEvent(ctypes.c_void_p(dpy), ctypes.c_ulong(root), False, ctypes.c_long(mask), ctypes.byref(ev))
        x11.XMapRaised(ctypes.c_void_p(dpy), ctypes.c_ulong(wid))
        x11.XFlush(ctypes.c_void_p(dpy))
        x11.XCloseDisplay(ctypes.c_void_p(dpy))
        return True
    except Exception:
        return False


def focus_ai_window(dept_id):
    """跨平台激活并跳转到对应的本地 AI 客户端窗口"""
    dept_map = {
        "chatgpt": "openai",
        "openai": "openai",
        "claude": "claude",
        "deepseek": "deepseek",
        "gemini": "antigravity",
        "antigravity": "antigravity"
    }
    norm_id = dept_map.get(str(dept_id).lower(), str(dept_id).lower())

    if SYSTEM == "linux":
        # 1. 先尝试通过 xwininfo 查找匹配的 X11 顶级窗口并直接通过 EWMH _NET_ACTIVE_WINDOW 置顶
        keywords = {
            "openai": ["chatgpt", "codex"],
            "claude": ["claude"],
            "deepseek": ["deepseek", "dsh"],
            "antigravity": ["antigravity"]
        }.get(norm_id, [norm_id])

        activated_x11 = False
        try:
            res = subprocess.run(["xwininfo", "-root", "-tree"], capture_output=True, text=True, timeout=2)
            best_wid = None
            best_area = 0
            for line in res.stdout.splitlines():
                low = line.lower()
                if any(k in low for k in keywords):
                    m_id = re.search(r'(0x[0-9a-fA-F]+)', line)
                    m_sz = re.search(r'(\d+)x(\d+)\+', line)
                    if m_id and m_sz:
                        w, h = int(m_sz.group(1)), int(m_sz.group(2))
                        if w >= 600 and h >= 400 and (w * h) > best_area:
                            best_area = w * h
                            best_wid = m_id.group(1)
            if best_wid:
                activated_x11 = _activate_x11_window(best_wid)
        except Exception:
            pass

        # 2. 对于 Wayland 原生单实例窗口 (如 Claude Desktop / Antigravity / DeepSeek)，调用 gtk-launch 触发单实例聚焦
        desktop_candidates = {
            "openai": ["chatgpt.desktop"],
            "claude": ["com.anthropic.Claude.desktop", "claude-desktop.desktop"],
            "deepseek": ["deepseek-harness.desktop"],
            "antigravity": ["antigravity.desktop"]
        }.get(norm_id, [])

        for df in desktop_candidates:
            if (Path("/usr/share/applications") / df).exists() or (HOME / ".local/share/applications" / df).exists():
                try:
                    subprocess.Popen(
                        ["gtk-launch", df],
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL
                    )
                    return {"ok": True, "dept": norm_id, "method": f"gtk-launch:{df}"}
                except Exception:
                    pass

        if norm_id == "deepseek" and not activated_x11:
            try:
                subprocess.Popen(["xdg-open", "http://127.0.0.1:3080"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                return {"ok": True, "dept": norm_id, "method": "xdg-open:3080"}
            except Exception:
                pass

        return {"ok": activated_x11, "dept": norm_id, "method": "x11_net_active"}

    elif SYSTEM == "darwin":
        app_name = {
            "openai": "ChatGPT",
            "claude": "Claude",
            "deepseek": "DeepSeek",
            "antigravity": "Antigravity"
        }.get(norm_id, "ChatGPT")
        try:
            subprocess.Popen(["osascript", "-e", f'tell application "{app_name}" to activate'])
            return {"ok": True, "dept": norm_id, "method": f"osascript:{app_name}"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    elif SYSTEM == "windows":
        title_name = {
            "openai": "ChatGPT",
            "claude": "Claude",
            "deepseek": "DeepSeek",
            "antigravity": "Antigravity"
        }.get(norm_id, "ChatGPT")
        try:
            subprocess.Popen(["powershell", "-NoProfile", "-Command", f"(New-Object -ComObject WScript.Shell).AppActivate('{title_name}')"])
            return {"ok": True, "dept": norm_id, "method": f"AppActivate:{title_name}"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    return {"ok": False, "dept": norm_id}


def get_chatgpt_live(ceo_state):
    """读取 ChatGPT / OpenAI Codex 真实实时额度、窗口、正在执行的任务与待用户选择项"""
    result = {
        "id": "openai",
        "name": "ChatGPT",
        "provider": "OpenAI",
        "installed": False,
        "running": False,
        "quota_percent": 0,
        "display_str": "未知",
        "quota_source": "unknown",
        "is_sleeping": False,
        "status": "active",
        "active_windows": 0,
        "scroll_items": [],
        "tooltip_lines": [],
        "ceo_requests": []
    }

    codex_dir = HOME / ".codex"
    cfg_dirs = get_os_config_dirs(["Codex", "ChatGPT"])
    if codex_dir.exists() or cfg_dirs:
        result["installed"] = True

    if SYSTEM == "linux":
        try:
            res = subprocess.run(["xwininfo", "-root", "-tree"], capture_output=True, text=True, timeout=2)
            for line in res.stdout.splitlines():
                if '("chatgpt' in line.lower() or '"chatgpt"' in line.lower():
                    m = re.search(r'(\d+)x(\d+)\+', line)
                    if m:
                        w, h = int(m.group(1)), int(m.group(2))
                        if w >= 800 and h >= 600:
                            result["active_windows"] += 1
                            result["running"] = True
                            result["tooltip_lines"].append(f"窗口: ChatGPT ({w}x{h})")
        except Exception:
            pass

    rollout_files = sorted(
        glob.glob(str(codex_dir / "sessions" / "*" / "*" / "*" / "*.jsonl")),
        key=os.path.getmtime,
        reverse=True
    )
    latest_reasoning = None
    latest_cmd = None
    latest_tokens = None

    thread_names = {}
    si_path = codex_dir / "session_index.jsonl"
    if si_path.exists():
        try:
            for line in si_path.read_text(encoding="utf-8", errors="ignore").splitlines():
                if line.strip().startswith("{"):
                    d = json.loads(line)
                    if d.get("id") and d.get("thread_name"):
                        thread_names[d["id"]] = d["thread_name"]
        except Exception:
            pass

    for idx_rf, rf in enumerate(rollout_files[:6]):
        try:
            size = os.path.getsize(rf)
            mtime = os.path.getmtime(rf)
            if time.time() - mtime < 3600:
                result["running"] = True
            with open(rf, "rb") as f:
                f.seek(max(0, size - 220000))
                lines = f.read().decode("utf-8", errors="ignore").splitlines()

            # 扫描所有活跃会话，精确追踪未回答的交互问题弹窗 (request_user_input_async 与 send_user_message_question_reply 配对)
            if time.time() - mtime < 21600:
                with open(rf, "rb") as fq:
                    fq.seek(max(0, size - 1800000))
                    q_chunk = fq.read().decode("utf-8", errors="ignore")
                pending_q_map = {}
                for qline in q_chunk.splitlines():
                    if ("request_user_input" not in qline
                            and "send_user_message_question_reply" not in qline
                            and "ask_question" not in qline):
                        continue
                    if not qline.strip().startswith("{"):
                        continue
                    try:
                        qd = json.loads(qline)
                    except Exception:
                        continue
                    if "send_user_message_question_reply" in qline:
                        for cid in list(pending_q_map.keys()):
                            if cid in qline:
                                pending_q_map.pop(cid, None)
                    elif qd.get("type") == "response_item":
                        qp = qd.get("payload", {})
                        if qp.get("type") in ("custom_tool_call", "function_call"):
                            tname = qp.get("name", "")
                            if tname in ("request_user_input", "request_user_input_async", "ask_question", "confirm_action"):
                                cid = qp.get("call_id") or qp.get("id") or f"call_{int(mtime)}"
                                args_raw = qp.get("arguments") or qp.get("input") or "{}"
                                q_title = "等待您选择下一步方案"
                                q_opts = []
                                try:
                                    args_d = json.loads(args_raw) if isinstance(args_raw, str) else args_raw
                                    qs = args_d.get("questions", [])
                                    if qs and isinstance(qs, list):
                                        q_title = (qs[0].get("title") or q_title).strip()
                                        q_opts = qs[0].get("options") or []
                                except Exception:
                                    pass
                                pending_q_map[cid] = (q_title, q_opts)

                for cid, (q_title, q_opts) in pending_q_map.items():
                    clean_q = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', q_title).replace("**", "").strip()
                    first_sentence = re.split(r'[。；\n]', clean_q)[0].strip()
                    if len(first_sentence) > 36:
                        first_sentence = first_sentence[:36] + "…"
                    opts_str = " / ".join([f"{i+1}. {o}" for i, o in enumerate(q_opts[:2])]) if q_opts else "点击跳转至 ChatGPT 窗口操作"
                    req_id = f"openai_q_{cid}"
                    if req_id not in ceo_state.get("approved_ids", []) and not any(r["id"] == req_id for r in result["ceo_requests"]):
                        result["ceo_requests"].append({
                            "id": req_id,
                            "deptId": "openai",
                            "agentName": "ChatGPT",
                            "title": f"❓ {first_sentence}",
                            "detail": opts_str,
                            "level": "interactive"
                        })

            for line in reversed(lines):
                if not line.strip().startswith("{"):
                    continue
                try:
                    d = json.loads(line)
                except Exception:
                    continue
                dtype = d.get("type")
                payload = d.get("payload", {})
                if dtype == "event_msg" and payload.get("type") == "token_count":
                    rl = payload.get("rate_limits", {})
                    primary = rl.get("primary", {})
                    used = primary.get("used_percent")
                    if used is not None and latest_tokens is None:
                        rem = max(0, int(round(100.0 - float(used))))
                        result["quota_percent"] = rem
                        result["display_str"] = f"{rem}%"
                        result["is_sleeping"] = (rem <= 0)
                        tot = payload.get("info", {}).get("total_token_usage", {}).get("total_tokens", 0)
                        latest_tokens = f"{tot / 1e6:.1f}M tok"
                elif dtype == "response_item":
                    ptype = payload.get("type")
                    if ptype == "reasoning" and not latest_reasoning:
                        summaries = payload.get("summary", [])
                        if summaries and isinstance(summaries, list):
                            txt = summaries[-1].get("text", "").replace("**", "").strip()
                            if txt:
                                latest_reasoning = txt
                    elif ptype == "custom_tool_call" and not latest_cmd:
                        tname = payload.get("name", "tool")
                        inp = str(payload.get("input", ""))
                        m_cmd = re.search(r'cmd:\s*"([^"]+)"', inp)
                        if m_cmd:
                            cmd_str = m_cmd.group(1).strip()
                            if len(cmd_str) > 42:
                                cmd_str = cmd_str[:42] + "…"
                            latest_cmd = f"{tname}: {cmd_str}"
                        else:
                            latest_cmd = f"调用工具: {tname}"
        except Exception:
            pass

    db_path = codex_dir / "state_5.sqlite"
    active_threads = []
    if db_path.exists():
        try:
            con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True, timeout=2)
            cur = con.cursor()
            cur.execute("SELECT id, title, cwd, updated_at FROM threads ORDER BY updated_at DESC LIMIT 3")
            for tid, title, cwd, upd in cur.fetchall():
                clean_title = thread_names.get(tid) or (title or "").strip().splitlines()[0]
                clean_title = re.sub(r'^#+\s*', '', clean_title)
                if len(clean_title) > 26:
                    clean_title = clean_title[:26] + "…"
                cwd_short = os.path.basename(cwd.rstrip("/")) if cwd else ""
                if cwd_short.startswith("g-p-"):
                    cwd_short = "Workspace"
                active_threads.append((tid, clean_title, cwd_short, upd))
            con.close()
        except Exception:
            pass

    if SYSTEM != "windows":
        try:
            res = subprocess.run(["pgrep", "-a", "-f", "cua_node"], capture_output=True, text=True, timeout=2)
            cua_lines = [l for l in res.stdout.strip().splitlines() if l]
            if cua_lines:
                result["scroll_items"].append(f"⚡ 终端内核: {len(cua_lines)}个 cua_node 进程运行中")
        except Exception:
            pass

    if latest_reasoning:
        result["scroll_items"].insert(0, f"🧠 正在推理: {latest_reasoning}")
    if latest_cmd:
        result["scroll_items"].append(f"💻 终端执行: {latest_cmd}")
    for idx, (tid, t_title, cwd_s, upd) in enumerate(active_threads, 1):
        tag = f"[{cwd_s}] " if cwd_s else ""
        result["scroll_items"].append(f"🪟 窗口{idx}: {tag}{t_title}")
        result["tooltip_lines"].append(f"会话{idx}: {tag}{t_title}")

    if latest_tokens:
        result["scroll_items"].append(f"📊 累计消耗: {latest_tokens} (周额度余 {result['display_str']})")

    if not result["scroll_items"]:
        result["scroll_items"] = [f"🟢 {max(1, result['active_windows'])}个工作窗口在线"]

    result["active_windows"] = max(1, result["active_windows"], min(3, len(active_threads)))
    return result


def get_claude_live(ceo_state):
    """读取 Claude 真实实时额度 (plan-usage-history.json)、活跃会话与真正需要用户确认的交互阻塞项"""
    result = {
        "id": "claude",
        "name": "Claude",
        "provider": "Anthropic",
        "installed": False,
        "running": False,
        "quota_percent": 0,
        "display_str": "未知",
        "quota_source": "unknown",
        "is_sleeping": False,
        "status": "active",
        "active_windows": 1,
        "scroll_items": [],
        "tooltip_lines": [],
        "ceo_requests": []
    }

    claude_cfg = HOME / ".config" / "Claude"
    claude_dot = HOME / ".claude"
    if claude_cfg.exists() or claude_dot.exists():
        result["installed"] = True

    usage_file = claude_cfg / "plan-usage-history.json"
    fh_used = 100
    sd_used = 78
    sd_rem = 22
    if usage_file.exists():
        try:
            data = json.loads(usage_file.read_text(encoding="utf-8"))
            samples = data.get("samples", [])
            if samples:
                last_u = samples[-1].get("u", {})
                fh_used = int(last_u.get("fh", 0))
                sd_used = int(last_u.get("sd", 0))
                sd_rem = max(0, 100 - sd_used)
                fh_rem = max(0, 100 - fh_used)
                if fh_used >= 100 and sd_rem > 0:
                    # 5小时窗口额度用完，但周额度仍有剩余 -> 喝咖啡休息/休闲区溜达放松，不关灯睡觉！
                    result["quota_percent"] = sd_rem
                    result["display_str"] = f"茶歇(周余{sd_rem}%)"
                    result["is_sleeping"] = False
                    result["status"] = "coffee_break"
                elif fh_used >= 100 and sd_rem <= 0:
                    # 5小时和周额度全部耗尽 -> 关灯睡觉
                    result["quota_percent"] = 0
                    result["display_str"] = "0%(额度耗尽)"
                    result["is_sleeping"] = True
                    result["status"] = "sleeping"
                else:
                    result["quota_percent"] = fh_rem
                    result["display_str"] = f"{fh_rem}%(周{sd_rem}%)"
                    result["is_sleeping"] = False
                    result["status"] = "active"
                result["tooltip_lines"].append(f"5小时窗口剩余: {fh_rem}% | 7天周额度剩余: {sd_rem}%")
        except Exception:
            pass

    override = ceo_state.get("quota_overrides", {}).get("claude")
    if override == "awake":
        result["is_sleeping"] = False
        result["status"] = "active"
        result["quota_percent"] = max(22, result["quota_percent"])
        result["display_str"] = f"{result['quota_percent']}%"
    elif override == "sleeping":
        result["is_sleeping"] = True
        result["status"] = "sleeping"

    session_files = sorted(
        glob.glob(str(claude_cfg / "claude-code-sessions" / "*" / "*" / "local_*.json")),
        key=os.path.getmtime,
        reverse=True
    )
    active_count = 0
    for sf in session_files[:3]:
        try:
            d = json.loads(Path(sf).read_text(encoding="utf-8"))
            sid = d.get("sessionId") or os.path.basename(sf)
            title = d.get("title") or "未命名会话"
            model = d.get("model") or "claude"
            err = d.get("error")
            awaiting = d.get("interruptedAwaitingPerson", False)
            cwd = os.path.basename((d.get("cwd") or "").rstrip("/"))
            active_count += 1
            if err:
                if result["status"] == "coffee_break":
                    result["scroll_items"].append(f"☕ 茶歇休整: {title} (5h冷却·周余{sd_rem}%)")
                else:
                    result["scroll_items"].append(f"🌙 休眠: {title} ({err})")
            else:
                result["scroll_items"].append(f"🦀 会话: {title} ({model} · {cwd})")
                if awaiting:
                    req_id = f"claude_wait_{sid}"
                    if req_id not in ceo_state.get("approved_ids", []):
                        result["ceo_requests"].append({
                            "id": req_id,
                            "deptId": "claude",
                            "agentName": "Claude",
                            "title": f"Claude 等待您确认选项: {title}",
                            "detail": "点击直接跳转至 Claude 窗口选择或批准下一步操作",
                            "level": "interactive"
                        })
            result["tooltip_lines"].append(f"会话: {title} [{model}]")
        except Exception:
            pass

    proj_files = sorted(
        glob.glob(str(claude_dot / "projects" / "*" / "*.jsonl")),
        key=os.path.getmtime,
        reverse=True
    )
    last_bash = None
    for idx_pf, pf in enumerate(proj_files[:2]):
        try:
            mtime = os.path.getmtime(pf)
            lines = Path(pf).read_text(encoding="utf-8", errors="ignore").splitlines()[-25:]
            # 检查最新一条记录是否是 AskUserQuestion 等待用户选择
            if idx_pf == 0 and lines and (time.time() - mtime < 900):
                for line in reversed(lines[-5:]):
                    if not line.strip().startswith("{"):
                        continue
                    d_last = json.loads(line)
                    msg = d_last.get("message", {})
                    if msg.get("role") == "user":
                        break
                    content = msg.get("content", [])
                    if isinstance(content, list):
                        for item in content:
                            if isinstance(item, dict) and item.get("type") == "tool_use":
                                tname = item.get("name", "")
                                if tname in ("AskUserQuestion", "ask_question"):
                                    req_id = f"claude_ask_{int(mtime)}"
                                    if req_id not in ceo_state.get("approved_ids", []):
                                        result["ceo_requests"].append({
                                            "id": req_id,
                                            "deptId": "claude",
                                            "agentName": "Claude 像素怪",
                                            "title": "Claude 弹出选项等待您决策",
                                            "detail": "点击跳转至 Claude 窗口回答选择按钮",
                                            "level": "interactive"
                                        })
                        break

            for line in reversed(lines):
                if not line.strip().startswith("{"):
                    continue
                d = json.loads(line)
                msg = d.get("message", {})
                content = msg.get("content", [])
                if isinstance(content, list):
                    for item in content:
                        if isinstance(item, dict) and item.get("type") == "tool_use" and not last_bash:
                            tname = item.get("name", "Tool")
                            cmd = item.get("input", {}).get("command", "")
                            if cmd:
                                cmd_clean = cmd.strip().split("&&")[-1].strip()
                                if len(cmd_clean) > 40:
                                    cmd_clean = cmd_clean[:40] + "…"
                                last_bash = f"{tname}: {cmd_clean}"
                            else:
                                last_bash = f"调用工具: {tname}"
        except Exception:
            pass

    if last_bash:
        result["scroll_items"].insert(0, f"💻 终端执行: {last_bash}")

    if SYSTEM != "windows":
        try:
            res = subprocess.run(["pgrep", "-f", "claude-code/.*/claude --output-format"], capture_output=True, text=True, timeout=2)
            pids = [p for p in res.stdout.strip().splitlines() if p]
            if pids:
                result["running"] = True
                result["active_windows"] = len(pids)
        except Exception:
            result["active_windows"] = max(1, active_count)

    if not result["scroll_items"]:
        result["scroll_items"] = ["🦀 Claude Desktop 正在运行"]

    return result


def get_deepseek_live(ceo_state):
    """读取 DeepSeek (dsh) 真实实时余额、限流状态與会话日志 (额度耗尽在房间关灯睡觉，不进CEO室)"""
    result = {
        "id": "deepseek",
        "name": "DeepSeek",
        "provider": "DeepSeek",
        "installed": False,
        "running": False,
        "quota_percent": 0,
        "display_str": "0%(余额不足)",
        "is_sleeping": True,
        "status": "sleeping",
        "active_windows": 1,
        "scroll_items": [],
        "tooltip_lines": [],
        "ceo_requests": []
    }

    dsh_dir = HOME / ".dsh"
    if dsh_dir.exists():
        result["installed"] = True

    if SYSTEM != "windows":
        try:
            res = subprocess.run(["pgrep", "-a", "-f", "dsh web"], capture_output=True, text=True, timeout=2)
            lines = [l for l in res.stdout.strip().splitlines() if l]
            if lines:
                result["running"] = True
                pid = lines[0].split()[0]
                result["scroll_items"].append(f"🌐 节点: dsh web 端口:3080 (PID {pid})")
                result["tooltip_lines"].append(f"服务进程: PID {pid} (http://127.0.0.1:3080)")
        except Exception:
            pass

    ledger_file = dsh_dir / "storages" / "cost-meter" / "ledger.json"
    balance_total = 0.0
    if ledger_file.exists():
        try:
            ld = json.loads(ledger_file.read_text(encoding="utf-8"))
            bref = ld.get("balanceRef", {})
            balance_total = float(bref.get("total", 0.0) or 0.0)
            curr = bref.get("currency", "USD")
            result["tooltip_lines"].append(f"账户账本余额: {balance_total:.2f} {curr}")
        except Exception:
            pass

    zstd_files = sorted(
        glob.glob(str(dsh_dir / "sessions" / "*" / "*" / "session.v4.jsonl.zstd")),
        key=os.path.getmtime,
        reverse=True
    )
    last_error_msg = None
    for zf in zstd_files[:2]:
        try:
            out = subprocess.check_output(["zstd", "-d", "-c", zf], timeout=2).decode("utf-8", errors="ignore")
            for line in reversed(out.splitlines()[-20:]):
                if not line.strip().startswith("{"):
                    continue
                d = json.loads(line)
                if d.get("type") == "turn/end":
                    err = d.get("data", {}).get("reason", {}).get("error", {})
                    msg = err.get("message", "")
                    if msg:
                        last_error_msg = msg
                    break
            if last_error_msg:
                break
        except Exception:
            pass

    if balance_total <= 0 and (last_error_msg and ("Insufficient Balance" in last_error_msg or "Free usage limit" in last_error_msg)):
        result["quota_percent"] = 0
        if "Insufficient Balance" in last_error_msg:
            result["display_str"] = "0%(余额不足)"
            short_err = "Insufficient Balance (HTTP 402 账户余额不足)"
        else:
            result["display_str"] = "0%(免费限流)"
            short_err = "Free usage limit reached (免费额度已用尽)"
        result["is_sleeping"] = True
        result["status"] = "sleeping"
        result["scroll_items"].insert(0, f"🌙 额度耗尽: {short_err}")
    elif balance_total > 0:
        result["quota_percent"] = 100
        result["display_str"] = f"${balance_total:.2f}"
        result["is_sleeping"] = False
        result["status"] = "active"

    override = ceo_state.get("quota_overrides", {}).get("deepseek")
    if override == "awake":
        result["is_sleeping"] = False
        result["status"] = "active"
        result["quota_percent"] = 100
        result["display_str"] = "100%"

    sess_files = sorted(
        glob.glob(str(dsh_dir / "storages" / "session_projcache" / "sessions" / "*.json")),
        key=os.path.getmtime,
        reverse=True
    )
    if sess_files:
        result["active_windows"] = len(sess_files)
    for idx, sf in enumerate(sess_files[:3], 1):
        try:
            d = json.loads(Path(sf).read_text(encoding="utf-8"))
            rows = d.get("record", {}).get("rows", {})
            title = rows.get("title", {}).get("val") or f"会话 #{idx}"
            title = re.sub(r'sk-[a-zA-Z0-9]{4,}', 'sk-***', str(title))
            if len(title) > 24:
                title = title[:24] + "…"
            msel = rows.get("modelSelection", {}).get("val", {}).get("lastUsed", {})
            model = msel.get("model") or "deepseek-flash"
            result["scroll_items"].append(f"🐳 会话{idx}: {title} ({model})")
            result["tooltip_lines"].append(f"会话{idx}: {title} [{model}]")
        except Exception:
            pass

    if not result["scroll_items"]:
        result["scroll_items"] = ["🐳 DeepSeek Harness 本地节点"]

    return result


def get_antigravity_live(ceo_state):
    """读取 Antigravity IDE 真实会话、正在执行的工具，以及是否弹出 ask_question 选择按钮等待用户操作"""
    result = {
        "id": "antigravity",
        "name": "Antigravity",
        "provider": "Google DeepMind",
        "installed": False,
        "running": False,
        "quota_percent": 100,
        "display_str": "未知(在线)",
        "quota_source": "unavailable",
        "is_sleeping": False,
        "status": "active",
        "active_windows": 1,
        "scroll_items": [],
        "tooltip_lines": [],
        "ceo_requests": []
    }

    agy_dir = HOME / ".gemini" / "antigravity"
    if agy_dir.exists():
        result["installed"] = True
        result["running"] = True

    transcripts = sorted(
        glob.glob(str(agy_dir / "brain" / "*" / ".system_generated" / "logs" / "transcript.jsonl")),
        key=os.path.getmtime,
        reverse=True
    )
    for idx_t, t_path in enumerate(transcripts[:3]):
        try:
            size = os.path.getsize(t_path)
            mtime = os.path.getmtime(t_path)
            with open(t_path, "rb") as f:
                f.seek(max(0, size - 60000))
                lines = f.read().decode("utf-8", errors="ignore").splitlines()

            if idx_t == 0:
                for line in reversed(lines):
                    if not line.strip().startswith("{"):
                        continue
                    d = json.loads(line)
                    tcalls = d.get("tool_calls", [])
                    if tcalls:
                        tc = tcalls[-1]
                        tname = tc.get("name", "tool")
                        args = tc.get("arguments", {})
                        if isinstance(args, str):
                            try:
                                args = json.loads(args)
                            except Exception:
                                args = {}
                        summary = args.get("toolSummary") or args.get("Path") or args.get("CommandLine") or ""
                        if summary:
                            summary = os.path.basename(str(summary)) if "/" in str(summary) and " " not in str(summary) else str(summary)
                            if len(summary) > 34:
                                summary = summary[:34] + "…"
                            result["scroll_items"].append(f"🔧 工具调用: {tname} ({summary})")
                        else:
                            result["scroll_items"].append(f"🔧 工具调用: {tname}")
                        break

            # 检测该会话最后一步是否停留在 ask_question (弹出选择按钮等待用户决策) 或 RequestFeedback
            if time.time() - mtime < 1800:
                for line in reversed(lines[-6:]):
                    if not line.strip().startswith("{"):
                        continue
                    d_last = json.loads(line)
                    stype = d_last.get("type", "")
                    if stype == "USER_INPUT":
                        break
                    tcalls = d_last.get("tool_calls", [])
                    if tcalls:
                        for tc in tcalls:
                            tname = tc.get("name", "")
                            args = tc.get("arguments", {})
                            if isinstance(args, str):
                                try:
                                    args = json.loads(args)
                                except Exception:
                                    args = {}
                            if tname == "ask_question" or (isinstance(args, dict) and args.get("ArtifactMetadata", {}).get("RequestFeedback")):
                                q_text = "等待您在弹窗中选择下一步方案"
                                qs = args.get("questions", []) if isinstance(args, dict) else []
                                if qs and isinstance(qs[0], dict):
                                    q_text = qs[0].get("question", q_text)
                                req_id = f"agy_ask_{d_last.get('step_index', int(mtime))}"
                                if req_id not in ceo_state.get("approved_ids", []):
                                    result["ceo_requests"].append({
                                        "id": req_id,
                                        "deptId": "antigravity",
                                        "agentName": "Antigravity",
                                        "title": f"弹出选择按钮: {q_text[:28]}",
                                        "detail": "点击立即跳转到 Antigravity 窗口选择选项",
                                        "level": "interactive"
                                    })
                        break
        except Exception:
            pass

    db_path = agy_dir / "conversation_summaries.db"
    if db_path.exists():
        try:
            con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True, timeout=2)
            cur = con.cursor()
            cur.execute("SELECT c10, c12 FROM conversations_fts_content WHERE c1 = -1 ORDER BY c4 DESC LIMIT 3")
            rows = cur.fetchall()
            result["active_windows"] = max(1, len(rows))
            for idx, (title, ws) in enumerate(rows, 1):
                result["scroll_items"].append(f"✦ 工作区{idx}: [{ws}] {title}")
                result["tooltip_lines"].append(f"工作区{idx}: [{ws}] {title}")
            con.close()
        except Exception:
            pass

    result["scroll_items"].insert(0, "✦ Antigravity 本地会话协同中")
    return result


def _tr(text, lang="zh"):
    """将实时遥测文本在中英文之间转换"""
    if not text or lang != "en":
        return text
    s = str(text)
    replacements = [
        ("未知(在线)", "N/A (Active)"),
        ("未知", "N/A"),
        ("✦ Antigravity 本地会话协同中", "✦ Antigravity Agent Active"),
        ("0%(余额不足)", "0% (No Balance)"),
        ("0%(额度耗尽)", "0% (Exhausted)"),
        ("茶歇(周余", "Break (Wk "),
        ("5h冷却(周余", "5h Cool (Wk "),
        ("5h冷却·周余", "5h cool·Wk "),
        ("周额度余 ", "Weekly left "),
        ("(周", " (Wk "),
        ("🧠 正在推理:", "🧠 Reasoning:"),
        ("💻 终端执行:", "💻 Terminal:"),
        ("调用工具:", "Tool:"),
        ("⚡ 终端内核:", "⚡ Kernel:"),
        ("个 cua_node 进程运行中", " cua_node processes active"),
        ("🪟 窗口", "🪟 Win "),
        ("会话", "Session "),
        ("📊 累计消耗:", "📊 Usage:"),
        ("个工作窗口在线", " active windows online"),
        ("☕ 茶歇休整:", "☕ Break:"),
        ("🌙 休眠:", "🌙 Sleep:"),
        ("🦀 会话:", "🦀 Session:"),
        ("🌐 节点: dsh web 端口:", "🌐 Node: dsh web port:"),
        ("🌙 额度耗尽:", "🌙 Exhausted:"),
        ("🔧 工具调用:", "🔧 Tool Call:"),
        ("✦ 工作区", "✦ Workspace "),
        ("🧠 模型: Gemini 4 Argon (Medium) 协同中", "🧠 Model: Gemini 4 Argon (Medium) Active"),
        ("点击跳转至 ChatGPT 窗口操作", "Click to jump to ChatGPT window"),
        ("点击跳转至 ChatGPT 窗口确认", "Click to confirm in ChatGPT window"),
        ("点击直接跳转至 Claude 窗口选择或批准下一步操作", "Click to jump to Claude window"),
        ("点击立即跳转到 Antigravity 窗口选择选项", "Click to jump to Antigravity window"),
        ("等待您确认选项:", "Awaiting your selection:"),
        ("弹出选择按钮:", "Selection prompt:"),
        ("是否允许仅覆盖本轮新增的这一个测试草稿文件？", "Allow overwriting only the new draft test file added in this round?"),
        ("允许覆盖这一个测试草稿文件", "Allow overwriting this draft test file"),
        ("暂不覆盖", "Do not overwrite for now"),
        ("是否批准兼容方案的一次新验收？", "Approve one new acceptance run with the compatible scheme?"),
        ("批准兼容方案，一次新验收", "Approve compatible scheme (1 run)"),
        ("保持 PID 命名空间要求，等待管理员", "Keep PID namespace requirement"),
    ]
    for zh_s, en_s in replacements:
        s = s.replace(zh_s, en_s)
    return s


def get_snapshot(lang_override=None):
    ceo_state = load_ceo_state()
    lang = lang_override or ceo_state.get("lang", "zh")
    chatgpt = get_chatgpt_live(ceo_state)
    claude = get_claude_live(ceo_state)
    deepseek = get_deepseek_live(ceo_state)
    gemini = get_antigravity_live(ceo_state)

    for c in (chatgpt, claude, deepseek, gemini):
        c["display_str"] = _tr(c.get("display_str", ""), lang)
        c["scroll_items"] = [_tr(x, lang) for x in c.get("scroll_items", [])]
        c["tooltip_lines"] = [_tr(x, lang) for x in c.get("tooltip_lines", [])]
        for req in c.get("ceo_requests", []):
            req["title"] = _tr(req.get("title", ""), lang)
            req["detail"] = _tr(req.get("detail", ""), lang)

    window_counts = {
        "chatgpt": chatgpt["active_windows"],
        "claude": claude["active_windows"],
        "deepseek": deepseek["active_windows"],
        "gemini": gemini["active_windows"]
    }

    window_titles = {
        "chatgpt": chatgpt["tooltip_lines"] or chatgpt["scroll_items"],
        "claude": claude["tooltip_lines"] or claude["scroll_items"],
        "deepseek": deepseek["tooltip_lines"] or deepseek["scroll_items"],
        "gemini": gemini["tooltip_lines"] or gemini["scroll_items"]
    }

    quotas = {
        "chatgpt": {
            "quota_percent": chatgpt["quota_percent"],
            "status": chatgpt["status"],
            "is_sleeping": chatgpt["is_sleeping"],
            "display_str": chatgpt["display_str"],
            "scroll_items": chatgpt["scroll_items"],
            "extra_info": chatgpt["scroll_items"][0] if chatgpt["scroll_items"] else ""
        },
        "claude": {
            "quota_percent": claude["quota_percent"],
            "status": claude["status"],
            "is_sleeping": claude["is_sleeping"],
            "display_str": claude["display_str"],
            "scroll_items": claude["scroll_items"],
            "extra_info": claude["scroll_items"][0] if claude["scroll_items"] else ""
        },
        "deepseek": {
            "quota_percent": deepseek["quota_percent"],
            "status": deepseek["status"],
            "is_sleeping": deepseek["is_sleeping"],
            "display_str": deepseek["display_str"],
            "scroll_items": deepseek["scroll_items"],
            "extra_info": deepseek["scroll_items"][0] if deepseek["scroll_items"] else ""
        },
        "gemini": {
            "quota_percent": gemini["quota_percent"],
            "status": gemini["status"],
            "is_sleeping": gemini["is_sleeping"],
            "display_str": gemini["display_str"],
            "scroll_items": gemini["scroll_items"],
            "extra_info": gemini["scroll_items"][0] if gemini["scroll_items"] else ""
        }
    }

    ceo_requests = (
        chatgpt["ceo_requests"]
        + claude["ceo_requests"]
        + deepseek["ceo_requests"]
        + gemini["ceo_requests"]
    )

    discovered_clients = [
        {"id": c["id"], "name": c["name"], "provider": c["provider"], "installed": c["installed"], "running": c["running"]}
        for c in (deepseek, claude, chatgpt, gemini)
    ]

    return {
        "lang": lang,
        "view_mode": ceo_state.get("view_mode", "dock"),
        "return_to_dock_ts": ceo_state.get("return_to_dock_ts", 0),
        "os_platform": f"{platform.system()} ({platform.release()})",
        "discovered_clients": discovered_clients,
        "window_counts": window_counts,
        "window_titles": window_titles,
        "quotas": quotas,
        "ceo_requests": ceo_requests
    }


if __name__ == "__main__":
    print(json.dumps(get_snapshot(), indent=2, ensure_ascii=False))

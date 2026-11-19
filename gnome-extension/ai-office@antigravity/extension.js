import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Soup from 'gi://Soup?version=3.0';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

export default class AIOfficeExtension extends Extension {
    _findDockScript() {
        const home = GLib.get_home_dir();
        const candidates = [
            `${this.path}/../../desktop_dock.py`,
            `${home}/AI-Cyber-Office/desktop_dock.py`,
        ];
        for (const p of candidates) {
            if (GLib.file_test(p, GLib.FileTest.EXISTS)) {
                return p;
            }
        }
        try {
            const desktopFile = `${home}/.local/share/applications/ai-cyber-office.desktop`;
            if (GLib.file_test(desktopFile, GLib.FileTest.EXISTS)) {
                const [, bytes] = GLib.file_get_contents(desktopFile);
                const content = new TextDecoder().decode(bytes);
                const m = content.match(/^Exec=(?:python3\s+)?(.+?desktop_dock\.py)/m);
                if (m && m[1] && GLib.file_test(m[1].trim(), GLib.FileTest.EXISTS)) {
                    return m[1].trim();
                }
            }
        } catch (_e) {}
        return `${home}/AI-Cyber-Office/desktop_dock.py`;
    }

    _findServerScript() {
        const dock = this._findDockScript();
        return dock.replace(/desktop_dock\.py$/, 'server.py');
    }

    enable() {
        this._lang = 'zh';
        this._httpSession = new Soup.Session({timeout: 2});
        this._indicator = new PanelMenu.Button(0.0, this.metadata.name, false);

        const box = new St.BoxLayout({
            style_class: 'panel-status-indicators-box',
            style: 'spacing: 8px; padding: 0 6px;',
        });

        this._labels = {
            deepseek: new St.Label({
                text: '🐳 --',
                y_align: Clutter.ActorAlign.CENTER,
                style: 'color: #38bdf8; font-weight: bold; font-size: 11px;',
            }),
            claude: new St.Label({
                text: '🦀 --',
                y_align: Clutter.ActorAlign.CENTER,
                style: 'color: #f97316; font-weight: bold; font-size: 11px;',
            }),
            chatgpt: new St.Label({
                text: '🌀 --',
                y_align: Clutter.ActorAlign.CENTER,
                style: 'color: #34d399; font-weight: bold; font-size: 11px;',
            }),
            gemini: new St.Label({
                text: '✦ --',
                y_align: Clutter.ActorAlign.CENTER,
                style: 'color: #c084fc; font-weight: bold; font-size: 11px;',
            }),
            ceo: new St.Label({
                text: '',
                y_align: Clutter.ActorAlign.CENTER,
                style: 'color: #fbbf24; font-weight: bold; font-size: 11px;',
                visible: false,
            }),
        };

        box.add_child(this._labels.deepseek);
        box.add_child(this._labels.claude);
        box.add_child(this._labels.chatgpt);
        box.add_child(this._labels.gemini);
        box.add_child(this._labels.ceo);

        this._indicator.add_child(box);

        this._titleItem = new PopupMenu.PopupMenuItem('🏢 AI 赛博办公室', {reactive: false});
        this._indicator.menu.addMenuItem(this._titleItem);
        this._indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._menuRows = {};
        const defs = [
            ['deepseek', '🐳 DeepSeek: ...'],
            ['claude', '🦀 Claude: ...'],
            ['chatgpt', '🌀 ChatGPT: ...'],
            ['gemini', '✦ Antigravity: ...'],
        ];
        for (const [key, initText] of defs) {
            const item = new PopupMenu.PopupMenuItem(initText);
            item.connect('activate', () => {
                this._postAction({action: 'focus_window', dept: key});
            });
            this._indicator.menu.addMenuItem(item);
            this._menuRows[key] = item;
        }

        this._indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._openFullItem = new PopupMenu.PopupMenuItem('🚀 打开全景像素办公室');
        this._openFullItem.connect('activate', () => {
            const dockScript = this._findDockScript();
            try {
                GLib.spawn_command_line_async(`python3 "${dockScript}" --full-only`);
            } catch (e) {
                logError(e, 'AI Cyber Office: failed to launch Full Office');
            }
        });
        this._indicator.menu.addMenuItem(this._openFullItem);

        this._langItem = new PopupMenu.PopupMenuItem('🌐 切换语言 (中/EN)');
        this._langItem.connect('activate', () => {
            const nextLang = this._lang === 'en' ? 'zh' : 'en';
            this._postAction({action: 'set_lang', lang: nextLang});
        });
        this._indicator.menu.addMenuItem(this._langItem);

        this._indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._quitItem = new PopupMenu.PopupMenuItem('✕ 退出顶部状态栏');
        this._quitItem.connect('activate', () => {
            try {
                GLib.spawn_command_line_async(`gnome-extensions disable ${this.uuid}`);
            } catch (e) {
                this.disable();
            }
        });
        this._indicator.menu.addMenuItem(this._quitItem);

        Main.panel.addToStatusArea(this.uuid, this._indicator, 1, 'right');

        this._ensureBackendRunning();
        this._pollLiveState();
        this._timerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 3, () => {
            this._pollLiveState();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _ensureBackendRunning() {
        const srvScript = this._findServerScript();
        const msg = Soup.Message.new('GET', 'http://127.0.0.1:8080/api/live_state');
        this._httpSession.send_and_read_async(msg, GLib.PRIORITY_DEFAULT, null, (_sess, res) => {
            try {
                this._httpSession.send_and_read_finish(res);
            } catch (_e) {
                try {
                    GLib.spawn_command_line_async(`python3 "${srvScript}"`);
                } catch (err) {
                    logError(err, 'AI Cyber Office: failed to auto-start server.py');
                }
            }
        });
    }

    _postAction(payload) {
        try {
            const msg = Soup.Message.new('POST', 'http://127.0.0.1:8080/api/ceo_action');
            const bodyBytes = new GLib.Bytes(new TextEncoder().encode(JSON.stringify(payload)));
            msg.set_request_body_from_bytes('application/json', bodyBytes);
            this._httpSession.send_and_read_async(msg, GLib.PRIORITY_DEFAULT, null, (_sess, res) => {
                try {
                    this._httpSession.send_and_read_finish(res);
                    this._pollLiveState();
                } catch (_e) {}
            });
        } catch (_e) {}
    }

    _shortQuota(qinfo) {
        if (!qinfo) return '--';
        const ds = String(qinfo.display_str || '--');
        if (ds.includes('%')) {
            const m = ds.match(/(\d+%)/);
            return m ? m[1] : ds;
        }
        return ds.length > 10 ? ds.slice(0, 10) : ds;
    }

    _pollLiveState() {
        if (!this._httpSession || !this._indicator) return;
        const msg = Soup.Message.new('GET', 'http://127.0.0.1:8080/api/live_state');
        this._httpSession.send_and_read_async(msg, GLib.PRIORITY_DEFAULT, null, (_sess, res) => {
            try {
                const bytes = this._httpSession.send_and_read_finish(res);
                if (!bytes || !this._indicator) return;
                const text = new TextDecoder().decode(bytes.get_data());
                const snap = JSON.parse(text);
                this._applySnapshot(snap);
            } catch (_e) {
                if (this._indicator) {
                    this._titleItem.label.set_text('🏢 AI Cyber Office (Backend Offline)');
                }
            }
        });
    }

    _applySnapshot(snap) {
        const lang = snap.lang || 'zh';
        this._lang = lang;
        const isEn = (lang === 'en');

        this._titleItem.label.set_text(isEn ? '🏢 AI Cyber Office' : '🏢 AI 赛博办公室');
        this._openFullItem.label.set_text(isEn ? '🚀 Open Full Office' : '🚀 打开全景像素办公室');
        this._langItem.label.set_text(isEn ? '🌐 Language: EN' : '🌐 切换语言: 中文');
        this._quitItem.label.set_text(isEn ? '✕ Quit Top Bar' : '✕ 退出顶部状态栏');

        const quotas = snap.quotas || {};
        const icons = {deepseek: '🐳', claude: '🦀', chatgpt: '🌀', gemini: '✦'};
        const names = {deepseek: 'DeepSeek', claude: 'Claude', chatgpt: 'ChatGPT', gemini: 'Antigravity'};
        const baseColors = {deepseek: '#38bdf8', claude: '#f97316', chatgpt: '#34d399', gemini: '#c084fc'};

        for (const key of ['deepseek', 'claude', 'chatgpt', 'gemini']) {
            const q = quotas[key] || {};
            const shortQ = this._shortQuota(q);
            const isSleep = Boolean(q.is_sleeping);
            const isBreak = (q.status === 'coffee_break');
            const color = isSleep ? '#f87171' : (isBreak ? '#fde68a' : baseColors[key]);

            const lbl = this._labels[key];
            if (lbl) {
                lbl.set_text(`${icons[key]} ${shortQ}`);
                lbl.set_style(`color: ${color}; font-weight: bold; font-size: 11px;`);
            }

            const row = this._menuRows[key];
            if (row) {
                const task = (q.scroll_items && q.scroll_items[0]) ? ` · ${q.scroll_items[0]}` : '';
                const line = `${icons[key]} ${names[key]} (${q.display_str || '--'})${task}`;
                row.label.set_text(line.length > 54 ? `${line.slice(0, 54)}…` : line);
            }
        }

        const ceoCount = (snap.ceo_requests || []).length;
        if (ceoCount > 0) {
            this._labels.ceo.set_text(`👑 ${ceoCount}`);
            this._labels.ceo.visible = true;
        } else {
            this._labels.ceo.visible = false;
        }
    }

    disable() {
        if (this._timerId) {
            GLib.source_remove(this._timerId);
            this._timerId = null;
        }
        if (this._httpSession) {
            this._httpSession.abort();
            this._httpSession = null;
        }
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}

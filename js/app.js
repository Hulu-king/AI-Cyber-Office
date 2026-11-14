/**
 * app.js - 跨平台真实本地 AI 状态同步、中央 CEO 交互弹窗监测与点击跳转 AI 客户端窗口
 */

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('officeCanvas');
  const office = new OfficeSystem();

  const iconPaths = {
    deepseek: 'icons/char-deepseek.svg',
    claude: 'icons/char-claude.svg',
    openai: 'icons/char-chatgpt.svg',
    antigravity: 'icons/char-gemini.svg'
  };

  const reverseIdMap = {
    deepseek: 'deepseek',
    claude: 'claude',
    openai: 'chatgpt',
    antigravity: 'gemini'
  };

  const addLog = (deptName, tagClass, text) => {
    const stream = document.getElementById('log-stream');
    if (!stream) return;
    const entry = document.createElement('div');
    entry.className = 'log-entry';

    const timeStr = new Date().toTimeString().split(' ')[0];
    entry.innerHTML = `
      <span class="log-time">[${timeStr}]</span>
      <span class="log-tag ${tagClass}">${deptName}</span>
      <span class="log-msg">${text}</span>
    `;

    stream.appendChild(entry);
    while (stream.children.length > 80) {
      stream.removeChild(stream.firstChild);
    }
    stream.scrollTop = stream.scrollHeight;
  };

  const updateStats = (stats) => {
    if (stats.platform !== undefined) {
      const el = document.getElementById('stat-platform');
      if (el) el.textContent = stats.platform;
    }
    if (stats.activeTasks !== undefined) {
      const el = document.getElementById('stat-active-tasks');
      if (el) el.textContent = stats.activeTasks;
    }
    if (stats.ceoPending !== undefined) {
      const el = document.getElementById('stat-ceo-pending');
      if (el) el.textContent = stats.ceoPending;
    }
  };

  // 调用后端接口激活并跳转到对应的本地 AI 客户端窗口
  const focusClientWindow = async (deptId, label = '') => {
    try {
      await fetch('/api/ceo_action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'focus_window', deptId })
      });
      addLog('WINDOW', 'tag-system', `🪟 已为您跳转并激活 [${label || deptId}] 客户端窗口`);
    } catch (e) {
      console.warn('Focus window failed', e);
    }
  };

  const renderer = new OfficeRenderer(canvas, office);
  const simulation = new SimulationManager(office, addLog, updateStats);

  // ==========================================================
  // 框内平滑滚动跑马灯引擎 (同时驱动 Web 迷你挂件与右侧部门卡片)
  // ==========================================================
  let marqueeTick = 0;
  const sliceMarquee = (text, widthChars = 26) => {
    const padded = `${text}   ✦   ${text}   ✦   `;
    const start = marqueeTick % (text.length + 7);
    return padded.slice(start, start + widthChars);
  };

  setInterval(() => {
    marqueeTick++;
    ['deepseek', 'claude', 'openai', 'antigravity'].forEach(id => {
      const dept = office.getDepartment(id);
      if (!dept) return;
      const items = (dept.scrollItems && dept.scrollItems.length > 0)
        ? dept.scrollItems
        : (dept.activeTasks.length > 0 ? dept.activeTasks.map(t => t.name) : [dept.lightsOn ? '🟢 实时监控就绪' : '🌙 额度耗尽关灯休眠中']);
      const fullStr = items.join('  ｜  ');
      const sliced = sliceMarquee(fullStr, 24);

      const dockScrollEl = document.getElementById(`dock-scroll-${id}`);
      if (dockScrollEl) dockScrollEl.textContent = sliced;

      const cardScrollEl = document.getElementById(`card-scroll-${id}`);
      if (cardScrollEl) cardScrollEl.textContent = sliceMarquee(fullStr, 36);
    });
  }, 180);

  // ==========================================================
  // 任务栏迷你挂件模式同步与点击跳转窗口
  // ==========================================================
  const dock = document.getElementById('taskbar-dock');
  const btnToggleTaskbar = document.getElementById('btn-toggle-taskbar-mode');
  const btnExpandDock = document.getElementById('dock-btn-expand');

  const syncTaskbarDock = () => {
    ['deepseek', 'claude', 'openai', 'antigravity'].forEach(id => {
      const dept = office.getDepartment(id);
      if (!dept) return;

      const pod = document.getElementById(`dock-pod-${id}`);
      const quotaBadge = document.getElementById(`dock-quota-${id}`);

      if (pod && quotaBadge) {
        quotaBadge.textContent = dept.displayQuota || `${dept.quota}%`;
        if (!dept.lightsOn) {
          pod.classList.add('lights-off');
        } else {
          pod.classList.remove('lights-off');
        }
      }
    });
  };

  btnToggleTaskbar.addEventListener('click', async () => {
    try {
      await fetch('/api/ceo_action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'return_to_dock' })
      });
    } catch (e) {}
    try {
      window.open('', '_self');
      window.close();
    } catch (e) {}
  });

  if (btnExpandDock) {
    btnExpandDock.addEventListener('click', () => {
      document.body.classList.remove('taskbar-mode');
      dock.classList.add('hidden');
    });
  }

  // 迷你模式下点击任一 AI 槽位，直接跳转到对应 AI 客户端窗口
  ['deepseek', 'claude', 'openai', 'antigravity'].forEach(id => {
    const pod = document.getElementById(`dock-pod-${id}`);
    if (pod) {
      pod.addEventListener('click', () => {
        const dept = office.getDepartment(id);
        focusClientWindow(id, dept ? dept.name : id);
      });
    }
  });

  // ==========================================================
  // 1. 渲染 CEO 总裁待批示中心面板 (仅显示真正需要用户选择/确认的弹窗任务)
  // ==========================================================
  const renderCEOQueue = (ceoRequests = []) => {
    const listEl = document.getElementById('ceo-queue-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    updateStats({ ceoPending: ceoRequests.length });

    if (ceoRequests.length === 0) {
      listEl.innerHTML = `
        <div style="color:#64748b; font-size:11px; text-align:center; padding:8px 4px;">
          ${window.t('暂无待批示事项', 'No pending approvals')}
        </div>
      `;
      return;
    }

    const idMap = {
      chatgpt: 'openai',
      openai: 'openai',
      claude: 'claude',
      deepseek: 'deepseek',
      gemini: 'antigravity',
      antigravity: 'antigravity'
    };

    ceoRequests.forEach(req => {
      const rawDept = req.deptId || req.dept || 'antigravity';
      const deptId = idMap[rawDept] || rawDept;
      const iconSrc = iconPaths[deptId] || 'icons/char-gemini.svg';

      const item = document.createElement('div');
      item.className = 'ceo-item';
      item.style.cursor = 'pointer';
      item.title = window.t('点击立即跳转到该 AI 客户端窗口进行操作', 'Click to jump to the AI client window');
      item.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px; overflow:hidden;">
          <img src="${iconSrc}" width="24" height="24" alt="${deptId}" style="flex-shrink:0;">
          <div class="ceo-item-info">
            <div class="ceo-item-title">${req.title}</div>
            <div class="ceo-item-detail">${req.detail}</div>
          </div>
        </div>
        <button class="mini-btn btn-approve-one" style="color:#fde047; border-color:#ca8a04; flex-shrink:0; font-weight:bold;">
          ${window.t('🪟 跳转处理', '🪟 Jump & Handle')}
        </button>
      `;

      const handleJumpAndApprove = async (e) => {
        e.stopPropagation();
        await fetch('/api/ceo_action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve', id: req.id, deptId, focus: true })
        });
        addLog('CEO', 'tag-system', window.t(`🪟 已跳转至 [${req.agentName || deptId}] 窗口处理，员工返回工位继续办公！`, `🪟 Focused [${req.agentName || deptId}] window; agent returning to desk!`));
        syncWithRealSystem(true);
      };

      item.addEventListener('click', handleJumpAndApprove);
      item.querySelector('.btn-approve-one').addEventListener('click', handleJumpAndApprove);

      listEl.appendChild(item);
    });
  };

  const resetBtn = document.getElementById('btn-ceo-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      await fetch('/api/ceo_action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_approvals' })
      });
      syncWithRealSystem(true);
    });
  }

  // ==========================================================
  // 2. 渲染跨平台本地已接入 AI 客户端 (支持点击直接跳转窗口)
  // ==========================================================
  let lastDiscoveryClients = [];
  const renderDiscoveryList = (clients = []) => {
    lastDiscoveryClients = clients;
    const container = document.getElementById('discovery-list');
    if (!container) return;
    container.innerHTML = '';

    const idMap = { chatgpt: 'openai', claude: 'claude', deepseek: 'deepseek', gemini: 'antigravity' };
    clients.forEach(c => {
      const deptId = idMap[c.id] || c.id;
      const dept = office.getDepartment(deptId);
      const winCount = dept ? dept.activeTasks.length : (c.active_windows || 0);
      const isRun = c.running || winCount > 0;
      const iconSrc = iconPaths[deptId] || 'icons/char-gemini.svg';
      const chip = document.createElement('div');
      chip.className = 'discovery-chip';
      chip.style.cursor = 'pointer';
      chip.title = window.t(`点击跳转到 ${c.name} 窗口`, `Click to focus ${c.name} window`);
      chip.innerHTML = `
        <div style="display:flex; align-items:center; gap:6px;">
          <img src="${iconSrc}" width="16" height="16" alt="${c.name}">
          <span style="font-weight:700; color:#e2e8f0;">${c.name.split(' ')[0]}</span>
        </div>
        <span style="font-size:10px; font-family:'JetBrains Mono',monospace; color:${isRun ? '#4ade80' : '#94a3b8'};">
          ${c.installed ? window.t(`已接入(${winCount}窗)`, `Connected (${winCount}w)`) : window.t('未安装', 'Not Installed')}
        </span>
      `;
      chip.addEventListener('click', () => focusClientWindow(deptId, c.name));
      container.appendChild(chip);
    });
  };

  // ==========================================================
  // 3. 渲染部门实时状态、额度与框内滚动卡片 (中英双语)
  // ==========================================================
  const renderDeptCards = () => {
    const container = document.getElementById('dept-list');
    if (!container) return;
    container.innerHTML = '';

    let totalActive = 0;
    Object.values(office.departments).forEach(d => {
      totalActive += d.activeTasks.length;
    });
    updateStats({ activeTasks: totalActive });

    Object.values(office.departments).forEach(dept => {
      const card = document.createElement('div');
      card.className = `dept-card ${dept.lightsOn ? '' : 'lights-off'}`;
      card.id = `card-${dept.id}`;

      const isWorking = dept.activeTasks.length > 0;
      const isBreak = Boolean(dept.lightsOn && dept.isCoffeeBreak);
      const qStr = dept.displayQuota || `${dept.quota}%`;
      const iconSrc = iconPaths[dept.id] || 'icons/char-gemini.svg';
      const pillText = !dept.lightsOn
        ? window.t(`🌙 休眠 (${qStr})`, `🌙 Sleeping (${qStr})`)
        : (isBreak
            ? window.t(`☕ 茶歇 (${qStr})`, `☕ Coffee Break (${qStr})`)
            : (isWorking
                ? window.t(`⚡ ${dept.activeTasks.length}窗运行`, `⚡ ${dept.activeTasks.length} Win Active`)
                : window.t('🟢 待命', '🟢 Standby')));
      const pillStyle = isBreak ? 'background: rgba(245, 158, 11, 0.16); color: #fde68a; border: 1px solid rgba(245, 158, 11, 0.45);' : '';

      card.innerHTML = `
        <div class="dept-header">
          <div class="dept-name" style="color: ${dept.color}">
            <img src="${iconSrc}" width="20" height="20" alt="${dept.name}">
            <span>${dept.name}</span>
          </div>
          <span class="dept-status-pill ${dept.lightsOn ? 'pill-on' : 'pill-off'}" style="${pillStyle}">
            ${pillText}
          </span>
        </div>

        <!-- 框内实时滚动的本地任务/窗口/终端命令 -->
        <div class="dept-scroll-box" id="card-scroll-${dept.id}">
          ${(dept.scrollItems && dept.scrollItems[0]) || window.t('实时状态就绪', 'Live telemetry ready')}
        </div>

        <div class="dept-quota-bar-wrapper">
          <div class="quota-bar-bg">
            <div class="quota-bar-fill" style="width: ${Math.max(4, dept.quota)}%; background: ${dept.lightsOn ? (isBreak ? '#f59e0b' : dept.color) : '#ef4444'}"></div>
          </div>
          <span class="quota-text" style="width:auto; min-width:65px;">${qStr}</span>
        </div>

        <div class="dept-actions">
          <button class="mini-btn btn-focus-win" title="${window.t('激活并跳转到该 AI 客户端的桌面窗口', 'Activate and focus this AI client window')}" data-dept="${dept.id}" style="color:#38bdf8; border-color:#0284c7;">
            ${window.t('🪟 跳转窗口', '🪟 Focus Window')}
          </button>
          <button class="mini-btn btn-edit-zone" title="${window.t('自定义名称与范围', 'Customize zone name & layout')}" data-dept="${dept.id}">
            ${window.t('⚙️ 设置', '⚙️ Settings')}
          </button>
        </div>
      `;

      card.querySelector('.btn-focus-win').addEventListener('click', () => {
        focusClientWindow(dept.id, dept.name);
      });

      card.querySelector('.btn-edit-zone').addEventListener('click', () => {
        openZoneModal(dept.id);
      });

      container.appendChild(card);
    });

    syncTaskbarDock();
  };

  // ==========================================================
  // 自定义工作区弹窗逻辑
  // ==========================================================
  const modal = document.getElementById('modal-zone-editor');
  const modalClose = document.getElementById('modal-close');
  const deptSelect = document.getElementById('edit-dept-select');
  const nameInput = document.getElementById('edit-dept-name');
  const colorInput = document.getElementById('edit-dept-color');
  const xInput = document.getElementById('edit-dept-x');
  const yInput = document.getElementById('edit-dept-y');
  const wInput = document.getElementById('edit-dept-w');
  const hInput = document.getElementById('edit-dept-h');
  const saveBtn = document.getElementById('btn-save-zone');
  const resetLayoutBtn = document.getElementById('btn-reset-layout');

  const populateModalFields = (deptId) => {
    const dept = office.getDepartment(deptId);
    if (!dept) return;
    deptSelect.value = deptId;
    nameInput.value = dept.name;
    colorInput.value = dept.color;
    xInput.value = dept.rect.x;
    yInput.value = dept.rect.y;
    wInput.value = dept.rect.w;
    hInput.value = dept.rect.h;
  };

  const openZoneModal = (deptId = 'deepseek') => {
    populateModalFields(deptId);
    modal.classList.remove('hidden');
  };

  deptSelect.addEventListener('change', () => populateModalFields(deptSelect.value));
  modalClose.addEventListener('click', () => modal.classList.add('hidden'));

  saveBtn.addEventListener('click', () => {
    const targetId = deptSelect.value;
    office.updateDepartment(targetId, {
      name: nameInput.value,
      color: colorInput.value,
      rect: {
        x: parseInt(xInput.value),
        y: parseInt(yInput.value),
        w: parseInt(wInput.value),
        h: parseInt(hInput.value)
      }
    });
    addLog(targetId, 'tag-system', `🛠️ 工作区 [${nameInput.value}] 设置已保存。`);
    renderDeptCards();
    modal.classList.add('hidden');
  });

  resetLayoutBtn.addEventListener('click', () => {
    office.resetToDefaultLayout();
    addLog('SYSTEM', 'tag-system', '🔄 已恢复默认四区环绕 CEO 办公室布局。');
    renderDeptCards();
    modal.classList.add('hidden');
  });

  // ==========================================================
  // 中英双语切换与静态 UI 文本同步
  // ==========================================================
  const applyLanguageUI = () => {
    const isEn = (window.LANG === 'en');
    const setTxt = (id, zh, en) => {
      const el = document.getElementById(id);
      if (el) el.textContent = isEn ? en : zh;
    };
    setTxt('lbl-stat-platform', '系统平台', 'Platform');
    setTxt('lbl-stat-windows', '活跃窗口', 'Active Windows');
    setTxt('lbl-stat-ceo', '待批示', 'CEO Pending');
    setTxt('btn-lang-toggle', '🌐 中文', '🌐 EN');
    setTxt('btn-toggle-taskbar-mode', '📌 迷你模式', '📌 Mini Dock');
    setTxt('lbl-ceo-center', 'CEO 待批示中心', 'CEO Approval Center');
    setTxt('btn-ceo-reset', '🔄 刷新', '🔄 Refresh');
    setTxt('lbl-dept-section', '本地 AI 状态与实时额度', 'Local AI Status & Live Quotas');
    setTxt('lbl-discovery-section', '已接入 AI 客户端', 'Connected Local AI Clients');
    setTxt('lbl-log-section', '实时运行日志', 'Live Telemetry Log');
    setTxt('btn-clear-log', '清屏', 'Clear');
    setTxt('dock-btn-expand', '🏢 全景', '🏢 Full Office');
    setTxt('lbl-modal-title', '⚙️ 工作区设置', '⚙️ Zone Settings');
    setTxt('lbl-modal-select', '选择工作区:', 'Select Work Zone:');
    setTxt('lbl-modal-name', '自定义名称:', 'Custom Zone Name:');
    setTxt('lbl-modal-color', '主题标识色:', 'Theme Color:');
    setTxt('btn-reset-layout', '恢复默认', 'Reset Default');
    setTxt('btn-save-zone', '保存应用', 'Save & Apply');
    setTxt('btn-ceo-notebook', '📓 笔记本', '📓 Notebook');
    setTxt('lbl-notebook-title', '📓 CEO 的笔记本', '📓 CEO\'s Notebook');
    setTxt('btn-new-note', '+ 新建笔记', '+ New Note');
    setTxt('btn-delete-note', '🗑️ 删除', '🗑️ Delete');
    setTxt('btn-save-note', '💾 保存笔记', '💾 Save Note');

    const nbTitleEl = document.getElementById('note-title-input');
    if (nbTitleEl) nbTitleEl.placeholder = isEn ? 'Note Title...' : '输入笔记标题...';
    const nbContentEl = document.getElementById('note-content-input');
    if (nbContentEl) nbContentEl.placeholder = isEn ? 'Write your dev ideas, architecture notes, or plans here...' : '在这里写下您的开发思路、架构灵感或待办计划...';
    const nbTagEl = document.getElementById('note-tag-select');
    if (nbTagEl && nbTagEl.options.length >= 4) {
      nbTagEl.options[0].textContent = isEn ? '💡 Idea' : '💡 思路';
      nbTagEl.options[1].textContent = isEn ? '📋 Plan' : '📋 计划';
      nbTagEl.options[2].textContent = isEn ? '📝 Memo' : '📝 备忘';
      nbTagEl.options[3].textContent = isEn ? '✅ Done' : '✅ 完成';
    }

    renderCEOQueue(office.ceoRequests || []);
    if (lastDiscoveryClients.length > 0) renderDiscoveryList(lastDiscoveryClients);
    renderDeptCards();
    if (typeof renderNotebookList === 'function') renderNotebookList();
  };

  const langBtn = document.getElementById('btn-lang-toggle');
  if (langBtn) {
    langBtn.addEventListener('click', async () => {
      window.LANG = (window.LANG === 'en') ? 'zh' : 'en';
      localStorage.setItem('ai_office_lang', window.LANG);
      applyLanguageUI();
      try {
        await fetch('/api/ceo_action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'set_lang', lang: window.LANG })
        });
      } catch (e) {}
      syncWithRealSystem(true);
    });
  }

  // 音效与清屏
  const audioBtn = document.getElementById('btn-audio');
  audioBtn.addEventListener('click', () => {
    const enabled = window.pixelAudio.toggle();
    audioBtn.textContent = enabled ? '🔊' : '🔇';
  });

  document.getElementById('btn-clear-log').addEventListener('click', () => {
    document.getElementById('log-stream').innerHTML = '';
  });

  // 在画布上点击任意员工（尤其是在 CEO 办公室等待的员工）直接跳转到对应 AI 客户端窗口！
  window.onAgentSelected = async (agent) => {
    if (agent.status === 'waiting_ceo' && agent.ceoReqId) {
      await fetch('/api/ceo_action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', id: agent.ceoReqId, deptId: agent.deptId, focus: true })
      });
      addLog('CEO', 'tag-system', window.t(`🪟 已跳转至 [${agent.name}] 所在客户端窗口，员工返回工位继续工作！`, `🪟 Focused [${agent.name}] window; agent returning to desk!`));
      syncWithRealSystem(true);
    } else {
      focusClientWindow(agent.deptId, agent.name);
    }
  };

  // ==========================================================
  // 真实本地 AI 状态后台自动同步器 (每 3 秒刷新一次)
  // ==========================================================
  let lastRealSync = '';
  let lastLoggedLang = window.LANG;
  const seenTelemetryItems = new Set();
  const seenCeoIds = new Set();
  const lastQuotaMap = {};

  const syncWithRealSystem = async (force = false) => {
    try {
      const res = await fetch('/api/live_state');
      if (!res.ok) return;
      const data = await res.json();
      if (data.lang && data.lang !== window.LANG) {
        window.LANG = data.lang;
        localStorage.setItem('ai_office_lang', window.LANG);
        applyLanguageUI();
      }
      if (lastLoggedLang !== window.LANG) {
        lastLoggedLang = window.LANG;
        seenTelemetryItems.clear();
        seenCeoIds.clear();
        const stream = document.getElementById('log-stream');
        if (stream) stream.innerHTML = '';
      }
      const snapKey = JSON.stringify({
        l: data.lang,
        w: data.window_counts,
        q: data.quotas,
        c: data.ceo_requests
      });
      if (!force && snapKey === lastRealSync) return;
      lastRealSync = snapKey;

      const { os_platform, platform, discovered_clients, window_counts, window_titles, quotas, ceo_requests } = data;
      const platStr = os_platform ? os_platform.split(' ')[0] : (platform || 'Linux');
      updateStats({ platform: platStr });

      const idMap = { chatgpt: 'openai', claude: 'claude', deepseek: 'deepseek', gemini: 'antigravity', antigravity: 'antigravity', openai: 'openai' };

      // 0. 动态加载本机真实探测到的 AI 客户端名称到对应工作区
      if (discovered_clients && Array.isArray(discovered_clients)) {
        discovered_clients.forEach(c => {
          const deptId = idMap[c.id] || c.id;
          const dept = office.getDepartment(deptId);
          if (dept && c.name) {
            dept.name = c.name;
            if (c.provider) dept.provider = c.provider;
          }
        });
      }

      // 1. 同步真实额度、茶歇状态与开关灯，并将真实运行动态写入 Live Telemetry Log
      if (quotas) {
        for (const [key, qinfo] of Object.entries(quotas)) {
          const deptId = idMap[key] || key;
          const dept = office.getDepartment(deptId);
          if (!dept) continue;
          dept.quota = qinfo.quota_percent;
          dept.displayQuota = qinfo.display_str || `${qinfo.quota_percent}%`;
          dept.scrollItems = qinfo.scroll_items || [];
          const shouldLight = !qinfo.is_sleeping;
          const isCoffeeBreak = (qinfo.status === 'coffee_break');
          if (dept.lightsOn !== shouldLight || dept.isCoffeeBreak !== isCoffeeBreak) {
            office.setDepartmentLight(deptId, shouldLight, isCoffeeBreak);
          }

          // 记录额度变化日志
          const prevQ = lastQuotaMap[deptId];
          if (prevQ !== dept.displayQuota) {
            lastQuotaMap[deptId] = dept.displayQuota;
            const winCnt = (window_counts && window_counts[key]) || 0;
            addLog(
              dept.name,
              dept.tagClass || 'tag-system',
              window.t(
                `📊 实时额度: ${dept.displayQuota} ｜ 活跃窗口: ${winCnt}`,
                `📊 Quota: ${dept.displayQuota} ｜ Active Windows: ${winCnt}`
              )
            );
          }

          // 记录该 AI 客户端正在执行的任务/终端/推理动态
          (dept.scrollItems || []).forEach(item => {
            const sig = `${deptId}::${item}`;
            if (!seenTelemetryItems.has(sig)) {
              seenTelemetryItems.add(sig);
              addLog(dept.name, dept.tagClass || 'tag-system', item);
            }
          });
        }
      }

      // 2. 同步真实窗口数量与任务名
      if (window_counts) {
        for (const [key, count] of Object.entries(window_counts)) {
          const deptId = idMap[key] || key;
          const dept = office.getDepartment(deptId);
          if (dept) {
            const titles = (quotas && quotas[key] && quotas[key].scroll_items) || (window_titles && window_titles[key]) || [];
            dept.activeTasks = [];
            for (let i = 0; i < count; i++) {
              const tName = titles[i] || window.t(`活跃窗口 #${i + 1}`, `Active Win #${i + 1}`);
              dept.activeTasks.push({
                id: `real_win_${i + 1}`,
                name: tName,
                startedAt: Date.now()
              });
            }
            office.rebuildDepartmentWorkstations(deptId);
          }
        }
      }

      // 3. 同步中央 CEO 办公室待决策队列，并将新待批示事项写入 Live Telemetry Log
      if (ceo_requests) {
        office.syncCEORequests(ceo_requests);
        renderCEOQueue(ceo_requests);
        ceo_requests.forEach(req => {
          if (!seenCeoIds.has(req.id)) {
            seenCeoIds.add(req.id);
            addLog(
              'CEO',
              'tag-system',
              window.t(
                `👑 [${req.dept_name || req.dept}] 进入总裁室等待操作: ${req.title}`,
                `👑 [${req.dept_name || req.dept}] Waiting in CEO Office: ${req.title}`
              )
            );
          }
        });
      }

      if (discovered_clients) renderDiscoveryList(discovered_clients);
      renderDeptCards();
      syncTaskbarDock();
    } catch (e) {
      console.warn('Real AI state sync failed', e);
    }
  };

  // ==========================================================
  // CEO 的笔记本 (点击画布上的 CEO / 翻动中的笔记本 或 顶栏按钮打开)
  // ==========================================================
  const nbModal = document.getElementById('modal-ceo-notebook');
  const nbListEl = document.getElementById('notebook-list');
  const nbTitleInput = document.getElementById('note-title-input');
  const nbTagSelect = document.getElementById('note-tag-select');
  const nbContentInput = document.getElementById('note-content-input');
  const nbStatusMsg = document.getElementById('note-status-msg');
  let ceoNotes = [];
  let activeNoteId = null;

  const getTagLabel = (tag) => {
    const map = {
      idea: window.t('💡 思路', '💡 Idea'),
      plan: window.t('📋 计划', '📋 Plan'),
      memo: window.t('📝 备忘', '📝 Memo'),
      done: window.t('✅ 完成', '✅ Done')
    };
    return map[tag] || tag;
  };

  const persistCeoNotes = async () => {
    try {
      localStorage.setItem('ai_office_ceo_notes', JSON.stringify(ceoNotes));
      await fetch('/api/ceo_notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: ceoNotes })
      });
    } catch (e) {}
  };

  const renderNotebookList = () => {
    if (!nbListEl) return;
    nbListEl.innerHTML = '';
    if (ceoNotes.length === 0) {
      nbListEl.innerHTML = `<div style="color:#64748b; font-size:11px; text-align:center; padding:12px;">${window.t('暂无笔记，点击上方新建', 'No notes yet')}</div>`;
      return;
    }
    ceoNotes.forEach(note => {
      const item = document.createElement('div');
      item.className = `notebook-item ${note.id === activeNoteId ? 'active' : ''}`;
      item.innerHTML = `
        <div class="notebook-item-title">${note.title || window.t('未命名笔记', 'Untitled Note')}</div>
        <div class="notebook-item-meta">${getTagLabel(note.tag)} · ${note.updatedAt || ''}</div>
      `;
      item.addEventListener('click', () => selectCeoNote(note.id));
      nbListEl.appendChild(item);
    });
  };

  const selectCeoNote = (id) => {
    activeNoteId = id;
    const note = ceoNotes.find(n => n.id === id);
    if (note) {
      nbTitleInput.value = note.title || '';
      nbTagSelect.value = note.tag || 'idea';
      nbContentInput.value = note.content || '';
    } else {
      nbTitleInput.value = '';
      nbTagSelect.value = 'idea';
      nbContentInput.value = '';
    }
    nbStatusMsg.textContent = '';
    renderNotebookList();
  };

  const loadCeoNotes = async () => {
    try {
      const res = await fetch('/api/ceo_notes');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.notes) && data.notes.length > 0) {
          ceoNotes = data.notes;
        }
      }
    } catch (e) {}
    if (ceoNotes.length === 0) {
      try {
        const cached = JSON.parse(localStorage.getItem('ai_office_ceo_notes') || '[]');
        if (Array.isArray(cached) && cached.length > 0) ceoNotes = cached;
      } catch (e) {}
    }
    if (ceoNotes.length === 0) {
      ceoNotes = [{
        id: `note_${Date.now()}`,
        title: window.t('开发思路与迭代计划', 'Dev Ideas & Roadmap'),
        tag: 'idea',
        content: '',
        updatedAt: new Date().toLocaleDateString()
      }];
    }
    selectCeoNote(activeNoteId && ceoNotes.some(n => n.id === activeNoteId) ? activeNoteId : ceoNotes[0].id);
  };

  window.openCeoNotebook = async () => {
    if (!nbModal) return;
    await loadCeoNotes();
    nbModal.classList.remove('hidden');
  };

  const btnOpenNotebook = document.getElementById('btn-ceo-notebook');
  if (btnOpenNotebook) btnOpenNotebook.addEventListener('click', () => window.openCeoNotebook());

  const btnCloseNotebook = document.getElementById('notebook-close');
  if (btnCloseNotebook) btnCloseNotebook.addEventListener('click', () => nbModal.classList.add('hidden'));

  const btnNewNote = document.getElementById('btn-new-note');
  if (btnNewNote) {
    btnNewNote.addEventListener('click', () => {
      const newNote = {
        id: `note_${Date.now()}`,
        title: window.t('新开发思路', 'New Dev Idea'),
        tag: 'idea',
        content: '',
        updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      ceoNotes.unshift(newNote);
      selectCeoNote(newNote.id);
      nbTitleInput.focus();
    });
  }

  const btnSaveNote = document.getElementById('btn-save-note');
  if (btnSaveNote) {
    btnSaveNote.addEventListener('click', async () => {
      let note = ceoNotes.find(n => n.id === activeNoteId);
      if (!note) {
        note = { id: `note_${Date.now()}` };
        ceoNotes.unshift(note);
        activeNoteId = note.id;
      }
      note.title = nbTitleInput.value.trim() || window.t('未命名笔记', 'Untitled Note');
      note.tag = nbTagSelect.value;
      note.content = nbContentInput.value;
      note.updatedAt = new Date().toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      await persistCeoNotes();
      renderNotebookList();
      nbStatusMsg.textContent = window.t('✅ 笔记已保存至本地 ceo_notes.json', '✅ Saved to local ceo_notes.json');
      addLog('CEO', 'tag-system', window.t(`📓 CEO 笔记本已保存: 《${note.title}》`, `📓 CEO Notebook saved: "${note.title}"`));
    });
  }

  const btnDeleteNote = document.getElementById('btn-delete-note');
  if (btnDeleteNote) {
    btnDeleteNote.addEventListener('click', async () => {
      ceoNotes = ceoNotes.filter(n => n.id !== activeNoteId);
      await persistCeoNotes();
      if (ceoNotes.length > 0) {
        selectCeoNote(ceoNotes[0].id);
      } else {
        activeNoteId = null;
        selectCeoNote(null);
      }
    });
  }

  applyLanguageUI();
  syncWithRealSystem(true);
  setInterval(() => syncWithRealSystem(false), 3000);
});

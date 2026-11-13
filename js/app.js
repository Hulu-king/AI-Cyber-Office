/**
 * app.js - 前端交互、动态工位增减与工区自定义编辑逻辑
 */

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('officeCanvas');
  const office = new OfficeSystem();

  // 日志记录回调
  const addLog = (deptName, tagClass, text) => {
    const stream = document.getElementById('log-stream');
    const entry = document.createElement('div');
    entry.className = 'log-entry';

    const timeStr = new Date().toTimeString().split(' ')[0];
    entry.innerHTML = `
      <span class="log-time">[${timeStr}]</span>
      <span class="log-tag ${tagClass}">${deptName}</span>
      <span class="log-msg">${text}</span>
    `;

    stream.appendChild(entry);
    stream.scrollTop = stream.scrollHeight;
  };

  // 统计数据回调
  const updateStats = (stats) => {
    if (stats.activeTasks !== undefined) {
      document.getElementById('stat-active-tasks').textContent = stats.activeTasks;
    }
    if (stats.handoffs !== undefined) {
      document.getElementById('stat-handoffs').textContent = stats.handoffs;
    }
    if (stats.tokens !== undefined) {
      document.getElementById('stat-tokens').textContent = stats.tokens.toLocaleString();
    }
  };

  // 实例化渲染器与模拟器
  const renderer = new OfficeRenderer(canvas, office);
  const simulation = new SimulationManager(office, addLog, updateStats);

  // ==========================================
  // 任务栏极简挂件模式同步与切换逻辑
  // ==========================================
  const dock = document.getElementById('taskbar-dock');
  const btnToggleTaskbar = document.getElementById('btn-toggle-taskbar-mode');
  const btnExpandDock = document.getElementById('dock-btn-expand');
  const btnQuickTask = document.getElementById('dock-btn-quick-task');
  const dockRunner = document.getElementById('dock-runner');

  const syncTaskbarDock = () => {
    ['deepseek', 'claude', 'openai', 'antigravity'].forEach(id => {
      const dept = office.getDepartment(id);
      if (!dept) return;

      const pod = document.getElementById(`dock-pod-${id}`);
      const stateBadge = document.getElementById(`dock-state-${id}`);
      const quotaBadge = document.getElementById(`dock-quota-${id}`);

      if (pod && stateBadge && quotaBadge) {
        quotaBadge.textContent = `${dept.quota}%`;
        if (!dept.lightsOn) {
          pod.classList.add('lights-off');
          stateBadge.textContent = '🌙 休眠';
          stateBadge.className = 'dock-state-badge sleeping';
        } else if (dept.activeTasks.length > 0) {
          pod.classList.remove('lights-off');
          stateBadge.textContent = `⚡ 运行 (${dept.activeTasks.length})`;
          stateBadge.className = 'dock-state-badge working';
        } else {
          pod.classList.remove('lights-off');
          stateBadge.textContent = '🟢 待命';
          stateBadge.className = 'dock-state-badge';
        }
      }
    });
  };

  // 切换为任务栏模式
  const enterTaskbarMode = () => {
    document.body.classList.add('taskbar-mode');
    dock.classList.remove('hidden');
    syncTaskbarDock();
    if (window.__TAURI__ && window.__TAURI__.core) {
      window.__TAURI__.core.invoke('toggle_full_view', { isFull: false });
    }
    addLog('SYSTEM', 'tag-system', '📌 已切换至任务栏极简模式 (高44px，常驻底部)');
  };

  // 恢复全屏大办公室模式
  const exitTaskbarMode = () => {
    document.body.classList.remove('taskbar-mode');
    dock.classList.add('hidden');
    if (window.__TAURI__ && window.__TAURI__.core) {
      window.__TAURI__.core.invoke('toggle_full_view', { isFull: true });
    }
    addLog('SYSTEM', 'tag-system', '🏢 已恢复全景像素办公室视图');
  };

  btnToggleTaskbar.addEventListener('click', enterTaskbarMode);
  btnExpandDock.addEventListener('click', exitTaskbarMode);

  // 任务栏迷你模式下点击任一 AI 槽位快捷派发任务
  ['deepseek', 'claude', 'openai', 'antigravity'].forEach(id => {
    const pod = document.getElementById(`dock-pod-${id}`);
    if (pod) {
      pod.addEventListener('click', () => {
        const dept = office.getDepartment(id);
        if (!dept.lightsOn) {
          office.setDepartmentLight(id, true);
        } else {
          office.addTask(id, '快捷微服务处理');
        }
        renderDeptCards();
        syncTaskbarDock();
      });
    }
  });

  // 任务栏专属：清晰显示“谁在给谁交接”的跑位与横幅动效
  const triggerDockHandoffVisual = (fromDeptId, toDeptId, taskName) => {
    const banner = document.getElementById('dock-handoff-banner');
    const bannerFrom = document.getElementById('banner-from');
    const bannerTo = document.getElementById('banner-to');
    const bannerTask = document.getElementById('banner-task');
    const runner = document.getElementById('dock-flying-runner');
    const runnerAvatar = document.getElementById('dock-runner-avatar');

    const avatars = {
      deepseek: '🐳 DeepSeek',
      claude: '🦀 Claude',
      openai: '🌀 ChatGPT',
      antigravity: '✦ Antigravity'
    };

    const icons = {
      deepseek: '🐳',
      claude: '🦀',
      openai: '🌀',
      antigravity: '✦'
    };

    const fromPod = document.getElementById(`dock-pod-${fromDeptId}`);
    const toPod = document.getElementById(`dock-pod-${toDeptId}`);

    if (!fromPod || !toPod) return;

    // 1. 设置上方横幅文字与角色
    bannerFrom.textContent = avatars[fromDeptId] || fromDeptId;
    bannerTo.textContent = avatars[toDeptId] || toDeptId;
    bannerTask.textContent = taskName || '协同任务';
    banner.classList.remove('hidden');

    // 2. 高亮发送者与接收者槽位，其余槽位虚化
    ['deepseek', 'claude', 'openai', 'antigravity'].forEach(id => {
      const p = document.getElementById(`dock-pod-${id}`);
      if (p) {
        p.classList.remove('pod-sender', 'pod-receiver', 'pod-dimmed');
        if (id === fromDeptId) {
          p.classList.add('pod-sender');
        } else if (id === toDeptId) {
          p.classList.add('pod-receiver');
        } else {
          p.classList.add('pod-dimmed');
        }
      }
    });

    // 3. 真正跨槽位跑动小人
    const container = document.getElementById('dock-pods-container');
    const startX = fromPod.offsetLeft + 12;
    const targetX = toPod.offsetLeft + 12;

    runnerAvatar.textContent = icons[fromDeptId] || '🏃';
    runner.style.transition = 'none';
    runner.style.left = startX + 'px';
    runner.classList.remove('hidden');

    // 下一帧启动平滑滑动
    setTimeout(() => {
      runner.style.transition = 'left 1.5s cubic-bezier(0.25, 1, 0.5, 1)';
      runner.style.left = targetX + 'px';
    }, 50);

    // 4. 到达目标槽位，提示完成，小人返回
    setTimeout(() => {
      // 成功音效
      if (window.pixelAudio) window.pixelAudio.playHandoffSuccess();

      // 发送者跑回原位
      runner.style.left = startX + 'px';

      setTimeout(() => {
        runner.classList.add('hidden');
        banner.classList.add('hidden');
        ['deepseek', 'claude', 'openai', 'antigravity'].forEach(id => {
          const p = document.getElementById(`dock-pod-${id}`);
          if (p) p.classList.remove('pod-sender', 'pod-receiver', 'pod-dimmed');
        });
        syncTaskbarDock();
      }, 1200);

    }, 1800);
  };

  // 全局交接事件监听（无论从哪里触发，任务栏都清晰同步动效）
  window.onGlobalHandoff = (fromDept, toDept, task) => {
    triggerDockHandoffVisual(fromDept, toDept, task);
  };

  // 任务栏快速交接按钮 (按需轮换或随机交接)
  let handoffStep = 0;
  btnQuickTask.addEventListener('click', () => {
    const pairs = [
      { from: 'claude', to: 'deepseek', task: '代码初稿 ➔ 小鲸鱼安全审计' },
      { from: 'antigravity', to: 'deepseek', task: '浮空工匠 ➔ 小鲸鱼慢思考推理' },
      { from: 'openai', to: 'antigravity', task: '赛博执事 ➔ 浮空星灵系统编排' }
    ];
    const pair = pairs[handoffStep % pairs.length];
    handoffStep++;

    triggerDockHandoffVisual(pair.from, pair.to, pair.task);

    const fromAgent = office.agents.find(a => a.deptId === pair.from);
    const toAgent = office.agents.find(a => a.deptId === pair.to);
    if (fromAgent && toAgent) {
      simulation.startHandoff(fromAgent.id, toAgent.id, pair.task);
    }
  });

  // 渲染部门配额与工位卡片
  const renderDeptCards = () => {
    const container = document.getElementById('dept-list');
    container.innerHTML = '';

    // 计算全局活跃任务数
    let totalActive = 0;
    Object.values(office.departments).forEach(d => {
      totalActive += d.activeTasks.length;
    });
    updateStats({ activeTasks: totalActive });

    Object.values(office.departments).forEach(dept => {
      const card = document.createElement('div');
      card.className = `dept-card ${dept.lightsOn ? '' : 'lights-off'}`;
      card.id = `card-${dept.id}`;

      const deskCount = Math.max(1, dept.activeTasks.length);
      const isWorking = dept.activeTasks.length > 0;

      card.innerHTML = `
        <div class="dept-header">
          <div class="dept-name" style="color: ${dept.color}">
            <span>●</span> ${dept.name}
          </div>
          <span class="dept-status-pill ${dept.lightsOn ? (isWorking ? 'pill-on' : 'pill-on') : 'pill-off'}">
            ${dept.lightsOn ? (isWorking ? `⚡ 运行中 (${dept.activeTasks.length})` : '🟢 待命就绪') : '🌙 额度耗尽休眠'}
          </span>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; margin: 2px 0;">
          <span style="color:#94a3b8">💻 工位电脑：<b style="color:#e2e8f0">${deskCount}</b> 台 (${dept.activeTasks.length} 运行中)</span>
          <span class="dept-task-tag">${dept.provider}</span>
        </div>

        <div class="dept-quota-bar-wrapper">
          <div class="quota-bar-bg">
            <div class="quota-bar-fill" style="width: ${dept.quota}%; background: ${dept.color}"></div>
          </div>
          <span class="quota-text">${dept.quota}%</span>
        </div>

        <div class="dept-actions">
          <button class="mini-btn btn-add-task" title="根据新任务自动新增一台电脑和工位" data-dept="${dept.id}" style="color:#38bdf8; border-color:#0284c7;">
            ➕ 派单 (工位+1)
          </button>
          <button class="mini-btn btn-remove-task" title="任务完成，自动回收闲置工位电脑" data-dept="${dept.id}">
            ➖ 完成 (工位-1)
          </button>
          <button class="mini-btn btn-edit-zone" title="自定义名称与范围" data-dept="${dept.id}">
            ⚙️ 设置
          </button>
          <button class="mini-btn toggle-light-btn" data-dept="${dept.id}">
            ${dept.lightsOn ? '🔌 关灯' : '⚡ 点亮'}
          </button>
        </div>
      `;

      // 绑定“派单 (工位+1)”
      card.querySelector('.btn-add-task').addEventListener('click', () => {
        if (!dept.lightsOn) {
          addLog(dept.name.split(' ')[0], dept.tagClass, `⚠️ ${dept.name} 关灯休眠中，无法下发任务，请先恢复额度开灯！`);
          return;
        }
        const sampleTasks = ['业务接口开发', '高并发压测', '慢思考推理', '向量检索优化', '前端像素渲染'];
        const taskName = sampleTasks[Math.floor(Math.random() * sampleTasks.length)];
        office.addTask(dept.id, taskName);
        addLog(dept.name.split(' ')[0], dept.tagClass, `💻 检测到新任务《${taskName}》，工位自动扩容，新电脑已就绪！`);
        renderDeptCards();
      });

      // 绑定“完成 (工位-1)”
      card.querySelector('.btn-remove-task').addEventListener('click', () => {
        if (dept.activeTasks.length === 0) {
          addLog(dept.name.split(' ')[0], dept.tagClass, `ℹ️ 当前已是最低待命工位，无需进一步缩减。`);
          return;
        }
        office.removeTask(dept.id);
        addLog(dept.name.split(' ')[0], dept.tagClass, `✅ 任务已处理完毕，电脑休眠，多余工位已自动回收。`);
        renderDeptCards();
      });

      // 绑定“设置”弹窗
      card.querySelector('.btn-edit-zone').addEventListener('click', () => {
        openZoneModal(dept.id);
      });

      // 绑定“开关灯”
      card.querySelector('.toggle-light-btn').addEventListener('click', () => {
        office.setDepartmentLight(dept.id, !dept.lightsOn);
        addLog(
          dept.name.split(' ')[0],
          dept.tagClass,
          dept.lightsOn ? `💡 额度恢复！灯光点亮，智能体苏醒！` : `🌙 配额耗尽！区域关灯，小人趴桌休眠中。`
        );
        renderDeptCards();
      });

      container.appendChild(card);
    });
    syncTaskbarDock();
  };

  renderDeptCards();

  // ==========================================
  // 自定义工作区弹窗逻辑
  // ==========================================
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

  deptSelect.addEventListener('change', () => {
    populateModalFields(deptSelect.value);
  });

  modalClose.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  // 保存自定义设置
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

    addLog(targetId, 'tag-system', `🛠️ 工作区 [${nameInput.value}] 设置已更新并持久化保存！`);
    renderDeptCards();
    modal.classList.add('hidden');
  });

  // 恢复默认四区
  resetLayoutBtn.addEventListener('click', () => {
    if (confirm('确定要恢复默认的四大家族办公区布局吗？')) {
      office.resetToDefaultLayout();
      addLog('SYSTEM', 'tag-system', `🔄 已重置所有工作区名字与坐标范围为默认值。`);
      renderDeptCards();
      modal.classList.add('hidden');
    }
  });

  // ==========================================
  // 模拟交接按钮绑定
  // ==========================================
  // 1. Claude -> DeepSeek 跨客户端交接
  document.getElementById('btn-cross-handoff').addEventListener('click', () => {
    // 确保有可用的 agent
    const cAgent = office.agents.find(a => a.deptId === 'claude');
    const dAgent = office.agents.find(a => a.deptId === 'deepseek');
    if (cAgent && dAgent) {
      simulation.startHandoff(cAgent.id, dAgent.id, '陶土多脚怪 ➔ 蓝色小鲸鱼：代码安全审计');
    }
  });

  // 2. Antigravity -> DeepSeek 浮空交接
  document.getElementById('btn-ag-handoff').addEventListener('click', () => {
    const agAgent = office.agents.find(a => a.deptId === 'antigravity');
    const dAgent = office.agents.find(a => a.deptId === 'deepseek');
    if (agAgent && dAgent) {
      simulation.startHandoff(agAgent.id, dAgent.id, '反重力工匠 ➔ 蓝色小鲸鱼：慢思考数学逻辑核验');
    }
  });

  // 3. OpenAI 部门内部任务交接
  document.getElementById('btn-intra-handoff').addEventListener('click', () => {
    // 临时确保 OpenAI 至少有 2 个工位方便内部走动交接
    const openaiDept = office.getDepartment('openai');
    if (openaiDept.activeTasks.length < 2) {
      office.addTask('openai', '需求分析');
      office.addTask('openai', '并发测试');
      renderDeptCards();
    }
    const oAgents = office.agents.filter(a => a.deptId === 'openai');
    if (oAgents.length >= 2) {
      simulation.startHandoff(oAgents[0].id, oAgents[1].id, '赛博执事部内快速流水线协同');
    }
  });

  // 4. Claude 额度耗尽关灯 / 恢复
  const claudeBtn = document.getElementById('btn-toggle-quota-claude');
  claudeBtn.addEventListener('click', () => {
    const claudeDept = office.getDepartment('claude');
    const newState = !claudeDept.lightsOn;
    office.setDepartmentLight('claude', newState);
    claudeBtn.innerHTML = newState
      ? `<span class="btn-icon">🌙</span><span>Claude 额度耗尽 (关灯睡觉)</span>`
      : `<span class="btn-icon">💡</span><span>Claude 恢复额度 (开灯复工)</span>`;
    claudeBtn.className = newState ? 'pixel-btn action-btn warning' : 'pixel-btn action-btn success';
    renderDeptCards();
  });

  // 5. 全员突击
  document.getElementById('btn-all-work').addEventListener('click', () => {
    simulation.triggerAllWork();
  });

  // 6. 自动演练开关
  const autoBtn = document.getElementById('btn-toggle-auto');
  const autoText = document.getElementById('auto-btn-text');
  autoBtn.addEventListener('click', () => {
    const isRunning = simulation.toggleAutoSimulation();
    if (isRunning) {
      autoBtn.classList.add('primary');
      autoText.textContent = '停止自动演练';
    } else {
      autoBtn.classList.remove('primary');
      autoText.textContent = '开启全自动交接演练';
    }
  });

  // 7. 重置所有人
  document.getElementById('btn-reset-all').addEventListener('click', () => {
    simulation.resetAll();
  });

  // 8. 音效开关
  const audioBtn = document.getElementById('btn-audio');
  audioBtn.addEventListener('click', () => {
    const enabled = window.pixelAudio.toggle();
    audioBtn.textContent = enabled ? '🔊' : '🔇';
  });

  // 9. 清屏
  document.getElementById('btn-clear-log').addEventListener('click', () => {
    document.getElementById('log-stream').innerHTML = '';
  });

  // 点击小人交互
  window.onAgentSelected = (agent) => {
    addLog(agent.deptId, 'tag-system', `👆 选中工位 [${agent.name}] (${agent.role}) - 状态: ${agent.status}`);
  };

  // 初始欢迎日志
  addLog('SYSTEM', 'tag-system', '🚀 动态工位系统就绪！工位电脑将根据运行中的任务动态增减。');
  addLog('DeepSeek', 'tag-deepseek', 'DeepSeek 官方蓝色小鲸鱼 🐳 已就位 (气孔灵动喷水)');
  addLog('Claude', 'tag-claude', 'Claude 陶土多脚怪 🦀 端着咖啡待命');
  addLog('OpenAI', 'tag-openai', 'ChatGPT 绿环赛博执事 🌀 陀螺旋转待命');
  addLog('Antigravity', 'tag-antigravity', 'Antigravity 反重力工匠 ✦ 浮空就绪');
});

/**
 * office.js - 动态工位系统、自定义区域名字与范围管理
 */

class OfficeSystem {
  constructor() {
    this.storageKey = 'ai_cyber_office_custom_zones_v1';
    this.departments = this.loadConfig() || this.getDefaultDepartments();
    this.agents = [];
    this.rebuildAllWorkstations();
  }

  // 默认四大家族区域配置
  getDefaultDepartments() {
    return {
      claude: {
        id: 'claude',
        name: 'Claude 创意研发组',
        provider: 'Anthropic',
        color: '#d97757',
        tagClass: 'tag-claude',
        rect: { x: 30, y: 30, w: 420, h: 220 },
        floorType: 'carpet-claude',
        quota: 85,
        lightsOn: true,
        activeTasks: []
      },
      openai: {
        id: 'openai',
        name: 'OpenAI 综合推理组',
        provider: 'OpenAI',
        color: '#10b981',
        tagClass: 'tag-openai',
        rect: { x: 510, y: 30, w: 420, h: 220 },
        floorType: 'carpet-openai',
        quota: 92,
        lightsOn: true,
        activeTasks: []
      },
      deepseek: {
        id: 'deepseek',
        name: 'DeepSeek 算法攻坚组',
        provider: 'DeepSeek',
        color: '#38bdf8',
        tagClass: 'tag-deepseek',
        rect: { x: 30, y: 300, w: 420, h: 220 },
        floorType: 'carpet-deepseek',
        quota: 78,
        lightsOn: true,
        activeTasks: []
      },
      antigravity: {
        id: 'antigravity',
        name: 'Antigravity 架构总控组',
        provider: 'Google DeepMind',
        color: '#c084fc',
        tagClass: 'tag-antigravity',
        rect: { x: 510, y: 300, w: 420, h: 220 },
        floorType: 'carpet-antigravity',
        quota: 98,
        lightsOn: true,
        activeTasks: []
      }
    };
  }

  // 从 localStorage 恢复用户自定义的名字和坐标范围
  loadConfig() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        // 合并默认 activeTasks
        Object.keys(parsed).forEach(k => {
          if (!parsed[k].activeTasks) parsed[k].activeTasks = [];
        });
        return parsed;
      }
    } catch (e) {
      console.warn('读取工区配置失败，使用默认配置', e);
    }
    return null;
  }

  // 保存自定义配置
  saveConfig() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.departments));
    } catch (e) {
      console.warn('保存工区配置失败', e);
    }
  }

  // 更新部门配置 (改名、调整范围 X, Y, W, H)
  updateDepartment(deptId, updates) {
    const dept = this.departments[deptId];
    if (!dept) return;

    if (updates.name !== undefined) dept.name = updates.name.trim() || dept.name;
    if (updates.provider !== undefined) dept.provider = updates.provider.trim() || dept.provider;
    if (updates.color !== undefined) dept.color = updates.color;

    if (updates.rect) {
      dept.rect.x = Math.max(0, parseInt(updates.rect.x) || 0);
      dept.rect.y = Math.max(0, parseInt(updates.rect.y) || 0);
      dept.rect.w = Math.max(160, parseInt(updates.rect.w) || 200);
      dept.rect.h = Math.max(120, parseInt(updates.rect.h) || 160);
    }

    this.saveConfig();
    this.rebuildAllWorkstations();
  }

  // 重置回默认布局
  resetToDefaultLayout() {
    localStorage.removeItem(this.storageKey);
    this.departments = this.getDefaultDepartments();
    this.rebuildAllWorkstations();
  }

  // ========================================================
  // 核心功能：根据实际工作的任务数量，动态自动增减电脑与工位
  // ========================================================
  rebuildDepartmentWorkstations(deptId) {
    const dept = this.departments[deptId];
    if (!dept) return;

    // 动态确定所需工位数：如果无任务，保留 1 个待命工位；有任务则根据任务数 1:1 动态创建
    const taskCount = dept.activeTasks.length;
    const workstationCount = Math.max(1, taskCount);

    const r = dept.rect;
    // 计算天花板吊灯位置
    dept.lamps = [
      { x: r.x + Math.floor(r.w * 0.28), y: r.y + 10 },
      { x: r.x + Math.floor(r.w * 0.72), y: r.y + 10 }
    ];

    // 工位网格排布尺寸
    const deskW = 56;
    const deskH = 44;
    const padX = 24;
    const padY = 46;
    const gapX = 28;
    const gapY = 28;

    const availableW = r.w - padX * 2;
    const cols = Math.max(1, Math.floor((availableW + gapX) / (deskW + gapX)));

    // 筛选出非此部门的小人
    this.agents = this.agents.filter(a => a.deptId !== deptId);

    // 为每个任务分配专属工位
    for (let i = 0; i < workstationCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      const dx = r.x + padX + col * (deskW + gapX);
      const dy = r.y + padY + row * (deskH + gapY);

      // 如果超出当前区域高，限制在区域底线
      const clampedDy = Math.min(dy, r.y + r.h - 60);

      const seatPos = { x: dx + 28, y: clampedDy + 50 };
      const task = dept.activeTasks[i] || null;

      const agentId = `${dept.id}_w${i + 1}`;
      const defaultNames = {
        claude: ['Claude 3.5 Sonnet', 'Claude 3 Opus', 'Claude 3.7 Haiku'],
        openai: ['GPT-4o (Omni)', 'o3-mini', 'o1-preview'],
        deepseek: ['DeepSeek-R1 (小鲸鱼)', 'DeepSeek-V3', 'DeepSeek-Coder'],
        antigravity: ['Antigravity Agent', 'Gemini 3.8 Flash', 'DeepMind Core']
      };

      const nameList = defaultNames[dept.id] || ['Worker 1', 'Worker 2', 'Worker 3'];
      const agentName = task ? `${task.name}` : (nameList[i % nameList.length]);

      const agent = {
        id: agentId,
        deptId: dept.id,
        name: agentName,
        role: task ? `任务: ${task.name}` : `${dept.name.split(' ')[0]} 待命助理`,
        desk: { x: dx, y: clampedDy },
        seat: seatPos,
        x: seatPos.x,
        y: seatPos.y,
        status: !dept.lightsOn ? 'sleeping' : (task ? 'working' : 'idle'),
        currentTask: task,
        bubble: task ? true : null,
        bubbleIcon: task ? '⚡' : null,
        color: dept.color,
        isWalking: false,
        path: [],
        walkSpeed: (dept.id === 'antigravity') ? 2.8 : 2.4,
        direction: 'down'
      };

      this.agents.push(agent);
    }
  }

  // 重建所有区域的工位与小人
  rebuildAllWorkstations() {
    this.agents = [];
    Object.keys(this.departments).forEach(id => {
      this.rebuildDepartmentWorkstations(id);
    });
  }

  // 动态添加一个真实/模拟运行的任务 -> 自动增加一台电脑与工位
  addTask(deptId, taskName = '代码实现与推理') {
    const dept = this.departments[deptId];
    if (!dept) return null;

    const taskId = 'task_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const newTask = {
      id: taskId,
      name: taskName,
      startedAt: Date.now()
    };

    dept.activeTasks.push(newTask);
    this.rebuildDepartmentWorkstations(deptId);

    // 播放键盘与开机声
    if (window.pixelAudio) {
      window.pixelAudio.playKeyClick();
    }

    return newTask;
  }

  // 结束并移除一个任务 -> 如果超出基础待命，自动回收电脑减少工位
  removeTask(deptId, taskId = null) {
    const dept = this.departments[deptId];
    if (!dept || dept.activeTasks.length === 0) return false;

    if (taskId) {
      dept.activeTasks = dept.activeTasks.filter(t => t.id !== taskId);
    } else {
      // 默认移除最后一个
      dept.activeTasks.pop();
    }

    this.rebuildDepartmentWorkstations(deptId);
    return true;
  }

  getAgent(id) {
    return this.agents.find(a => a.id === id);
  }

  getDepartment(deptId) {
    return this.departments[deptId];
  }

  setDepartmentLight(deptId, lightsOn) {
    const dept = this.departments[deptId];
    if (!dept) return;

    dept.lightsOn = lightsOn;
    if (lightsOn) {
      if (dept.quota <= 5) dept.quota = 100;
      if (window.pixelAudio) window.pixelAudio.playSwitch(true);
      this.agents.filter(a => a.deptId === deptId).forEach(a => {
        if (a.status === 'sleeping') {
          a.status = a.currentTask ? 'working' : 'idle';
          a.bubble = true;
          a.bubbleIcon = '✨';
          setTimeout(() => { if (a.bubbleIcon === '✨') a.bubble = false; }, 2000);
        }
      });
    } else {
      if (window.pixelAudio) {
        window.pixelAudio.playSwitch(false);
        window.pixelAudio.playSleep();
      }
      this.agents.filter(a => a.deptId === deptId).forEach(a => {
        a.status = 'sleeping';
        a.bubble = true;
        a.bubbleIcon = (a.deptId === 'antigravity') ? '✦' : '💤';
        a.isWalking = false;
        a.path = [];
        a.x = a.seat.x;
        a.y = a.seat.y;
      });
    }
  }

  // 寻路过道计算
  calculatePath(fromAgent, toAgent) {
    const start = { x: fromAgent.x, y: fromAgent.y };
    const goal = { x: toAgent.seat.x + 18, y: toAgent.seat.y };

    const path = [];
    const fromDept = this.departments[fromAgent.deptId];
    const toDept = this.departments[toAgent.deptId];

    // 起点走到自身部门走廊边沿
    const startAisleY = (fromAgent.seat.y > 275) ? fromDept.rect.y - 15 : fromDept.rect.y + fromDept.rect.h + 15;
    path.push({ x: start.x, y: startAisleY });

    if (fromAgent.deptId === toAgent.deptId) {
      path.push({ x: goal.x, y: startAisleY });
      path.push(goal);
      return path;
    }

    // 跨区域走中央十字路口
    path.push({ x: 480, y: startAisleY });
    const targetAisleY = (toAgent.seat.y > 275) ? toDept.rect.y - 15 : toDept.rect.y + toDept.rect.h + 15;
    if (Math.abs(startAisleY - targetAisleY) > 20) {
      path.push({ x: 480, y: targetAisleY });
    }

    path.push({ x: goal.x, y: targetAisleY });
    path.push(goal);
    return path;
  }
}

window.OfficeSystem = OfficeSystem;

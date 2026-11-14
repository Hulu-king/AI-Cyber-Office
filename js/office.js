/**
 * office.js - 高清全景工位系统、中央 CEO 总裁办公室调度、额度恢复金币特效管理
 */

class OfficeSystem {
  constructor() {
    this.storageKey = 'ai_cyber_office_custom_zones_hd_v6';
    this.ceoRect = { x: 525, y: 170, w: 390, h: 480 };
    const cx = this.ceoRect.x + this.ceoRect.w / 2;
    const cy = this.ceoRect.y;
    this.ceoWaitingSpots = [
      { x: cx - 72, y: cy + 235 },
      { x: cx + 72, y: cy + 235 },
      { x: cx - 72, y: cy + 345 },
      { x: cx + 72, y: cy + 345 }
    ];
    // 办公室休闲茶歇打卡点 (咖啡吧、赛博茶水间、复古街机、喷泉花园、休息沙发)
    this.leisureSpots = [
      { x: 398, y: 726, prop: 'coffee', icon: '☕', label: '喝现磨浓缩咖啡', labelEn: 'Sipping Espresso' },
      { x: 438, y: 688, prop: 'headphones', icon: '🎧', label: '戴耳机听音乐放松', labelEn: 'Listening to Music' },
      { x: 580, y: 110, prop: 'coffee', icon: '☕', label: '在茶水间品尝手冲咖啡', labelEn: 'Pantry Coffee Break' },
      { x: 642, y: 110, prop: 'sunglasses', icon: '🕶️', label: '在饮料机旁戴墨镜休息', labelEn: 'Chilling by Vending Machine' },
      { x: 810, y: 112, prop: 'book', icon: '📗', label: '在茶水间圆桌翻阅画册', labelEn: 'Reading Artbook' },
      { x: 632, y: 742, prop: 'sunglasses', icon: '🕹️', label: '打复古像素街机放松', labelEn: 'Playing Retro Arcade' },
      { x: 735, y: 744, prop: 'heart', icon: '❤️', label: '在室内喷泉旁散步溜达', labelEn: 'Strolling by Fountain' },
      { x: 845, y: 742, prop: 'headphones', icon: '🎧', label: '在花园绿植旁听歌小憩', labelEn: 'Relaxing by Garden' }
    ];
    this.ceoRequests = [];
    this.departments = this.loadConfig() || this.getDefaultDepartments();
    this.agents = [];
    this.rebuildAllWorkstations();
  }

  // 默认四大家族区域配置 (简洁纯正 AI 品牌名称)
  getDefaultDepartments() {
    return {
      deepseek: {
        id: 'deepseek',
        name: 'DeepSeek',
        provider: 'DeepSeek CLI / Web',
        color: '#0B63FF',
        tagClass: 'tag-deepseek',
        rect: { x: 28, y: 28, w: 465, h: 355 },
        floorType: 'carpet-deepseek',
        quota: 0,
        displayQuota: '0%(余额不足)',
        lightsOn: false,
        isCoffeeBreak: false,
        scrollItems: [],
        activeTasks: []
      },
      claude: {
        id: 'claude',
        name: 'Claude',
        provider: 'Anthropic Claude',
        color: '#FF7A2E',
        tagClass: 'tag-claude',
        rect: { x: 28, y: 435, w: 465, h: 355 },
        floorType: 'carpet-claude',
        quota: 22,
        displayQuota: '茶歇(周余22%)',
        lightsOn: true,
        isCoffeeBreak: true,
        scrollItems: [],
        activeTasks: []
      },
      openai: {
        id: 'openai',
        name: 'ChatGPT',
        provider: 'OpenAI Codex / Web',
        color: '#E5E5E5',
        tagClass: 'tag-openai',
        rect: { x: 947, y: 28, w: 465, h: 355 },
        floorType: 'carpet-openai',
        quota: 72,
        displayQuota: '72%',
        lightsOn: true,
        isCoffeeBreak: false,
        scrollItems: [],
        activeTasks: []
      },
      antigravity: {
        id: 'antigravity',
        name: 'Antigravity',
        provider: 'Google DeepMind',
        color: '#8E63F7',
        tagClass: 'tag-antigravity',
        rect: { x: 947, y: 435, w: 465, h: 355 },
        floorType: 'carpet-antigravity',
        quota: 86,
        displayQuota: '86%',
        lightsOn: true,
        isCoffeeBreak: false,
        scrollItems: [],
        activeTasks: []
      }
    };
  }

  loadConfig() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        Object.keys(parsed).forEach(k => {
          if (!parsed[k].activeTasks) parsed[k].activeTasks = [];
          if (!parsed[k].scrollItems) parsed[k].scrollItems = [];
          if (parsed[k].name) {
            parsed[k].name = parsed[k].name.replace(/\s*(算法攻坚组|创意研发组|综合推理组|架构总控组)/g, '').trim();
            if (k === 'antigravity' && parsed[k].name === 'Gemini') {
              parsed[k].name = 'Antigravity';
            }
          }
        });
        return parsed;
      }
    } catch (e) {
      console.warn('读取工区配置失败，使用默认配置', e);
    }
    return null;
  }

  saveConfig() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.departments));
    } catch (e) {
      console.warn('保存工区配置失败', e);
    }
  }

  updateDepartment(deptId, updates) {
    const dept = this.departments[deptId];
    if (!dept) return;

    if (updates.name !== undefined) dept.name = updates.name.trim() || dept.name;
    if (updates.provider !== undefined) dept.provider = updates.provider.trim() || dept.provider;
    if (updates.color !== undefined) dept.color = updates.color;

    if (updates.rect) {
      dept.rect.x = Math.max(0, parseInt(updates.rect.x) || 0);
      dept.rect.y = Math.max(0, parseInt(updates.rect.y) || 0);
      dept.rect.w = Math.max(240, parseInt(updates.rect.w) || 360);
      dept.rect.h = Math.max(200, parseInt(updates.rect.h) || 280);
    }

    this.saveConfig();
    this.rebuildAllWorkstations();
  }

  resetToDefaultLayout() {
    localStorage.removeItem(this.storageKey);
    this.departments = this.getDefaultDepartments();
    this.rebuildAllWorkstations();
  }

  // 根据实际运行的窗口与任务数量，动态排布高清大工位，并保留正在行走或等候CEO审批的小人状态
  rebuildDepartmentWorkstations(deptId) {
    const dept = this.departments[deptId];
    if (!dept) return;

    const existingDeptAgents = {};
    this.agents.filter(a => a.deptId === deptId).forEach(a => {
      existingDeptAgents[a.id] = a;
    });

    const taskCount = dept.activeTasks.length;
    const workstationCount = Math.max(1, Math.min(6, taskCount));

    const r = dept.rect;
    // 吊灯悬挂于顶部铭牌横梁下方、两列工位之间的空隙处，绝不遮挡顶部文字或电脑
    dept.lamps = [
      { x: r.x + 132, y: r.y + 38 },
      { x: r.x + 264, y: r.y + 38 }
    ];

    const deskW = 96;
    const deskH = 66;
    const padX = 28;
    const padY = 56;
    const gapX = 36;
    const gapY = 46;

    const availableW = r.w - padX * 2;
    const cols = Math.max(1, Math.floor((availableW + gapX) / (deskW + gapX)));

    this.agents = this.agents.filter(a => a.deptId !== deptId);

    const defaultNames = {
      deepseek: ['DeepSeek-R1', 'DeepSeek-V3', 'DeepSeek-Coder'],
      claude: ['Claude 3.7 Sonnet', 'Claude Code CLI', 'Claude Opus'],
      openai: ['ChatGPT-4o / Codex', 'OpenAI o3-mini', 'Codex Agent'],
      antigravity: ['Gemini Pro', 'Gemini Flash', 'Antigravity']
    };

    const propsCycle = ['coffee', 'sunglasses', 'headphones', 'book', 'heart'];

    for (let i = 0; i < workstationCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      const dx = r.x + padX + col * (deskW + gapX);
      const dy = r.y + padY + row * (deskH + gapY);
      const clampedDy = Math.min(dy, r.y + r.h - 95);

      const seatPos = { x: dx + 48, y: clampedDy + 68 };
      const task = dept.activeTasks[i] || null;
      const agentId = `${dept.id}_w${i + 1}`;
      const nameList = defaultNames[dept.id] || ['Agent 1', 'Agent 2'];
      const agentName = task ? `${task.name}` : nameList[i % nameList.length];

      const prev = existingDeptAgents[agentId];
      const isInCEOFlow = prev && (prev.ceoReqId || prev.status === 'waiting_ceo' || prev.status === 'handoff');
      const isBreak = dept.lightsOn && dept.isCoffeeBreak;
      const baseStatus = !dept.lightsOn ? 'sleeping' : (isBreak ? 'coffee_break' : (task ? 'working' : 'idle'));

      // 如果处于茶歇溜达状态，保留上次所在位置与路径，或初始分配到不同休闲区域
      const initSpot = this.leisureSpots[(i * 2) % this.leisureSpots.length];
      const keepBreakPos = isBreak && prev && prev.status === 'coffee_break' && !isInCEOFlow;
      const startX = isInCEOFlow ? prev.x : (keepBreakPos ? prev.x : (isBreak && i > 0 ? initSpot.x : seatPos.x));
      const startY = isInCEOFlow ? prev.y : (keepBreakPos ? prev.y : (isBreak && i > 0 ? initSpot.y : seatPos.y));
      const relaxProp = keepBreakPos && prev.relaxProp ? prev.relaxProp : (isBreak ? propsCycle[i % propsCycle.length] : null);
      const relaxIcon = isBreak ? (initSpot.icon || '☕') : (task ? '⚡' : null);

      const agent = {
        id: agentId,
        deptId: dept.id,
        name: (isInCEOFlow && prev.ceoTitle) ? prev.ceoTitle : agentName,
        role: isInCEOFlow ? prev.role : (isBreak ? window.t(`☕ 茶歇放松: ${initSpot.label}`, `☕ Break: ${initSpot.labelEn}`) : (task ? `${task.name}` : `${dept.name} Agent`)),
        desk: { x: dx, y: clampedDy },
        seat: seatPos,
        x: startX,
        y: startY,
        status: isInCEOFlow ? prev.status : baseStatus,
        currentTask: task,
        relaxProp: relaxProp,
        nextRoamAt: (keepBreakPos && prev.nextRoamAt) ? prev.nextRoamAt : (performance.now() / 1000 + 1.2 + i * 1.8),
        bubble: isInCEOFlow ? prev.bubble : (!dept.lightsOn ? false : (isBreak ? true : (task ? true : null))),
        bubbleIcon: isInCEOFlow ? prev.bubbleIcon : relaxIcon,
        color: dept.color,
        isWalking: isInCEOFlow ? prev.isWalking : (keepBreakPos ? prev.isWalking : false),
        isCarrying: isInCEOFlow ? prev.isCarrying : false,
        path: isInCEOFlow ? prev.path : (keepBreakPos ? prev.path : []),
        onArrive: isInCEOFlow ? prev.onArrive : (keepBreakPos ? prev.onArrive : null),
        ceoReqId: isInCEOFlow ? prev.ceoReqId : null,
        ceoTitle: isInCEOFlow ? prev.ceoTitle : null,
        coinBurstUntil: prev ? prev.coinBurstUntil : 0,
        walkSpeed: (dept.id === 'antigravity') ? 5.0 : (isBreak ? 2.6 : 4.4),
        direction: isInCEOFlow ? prev.direction : (keepBreakPos ? prev.direction : 'down')
      };

      this.agents.push(agent);
    }
  }

  // 驱动茶歇状态员工在咖啡吧、茶水间、喷泉花园、街机厅与工位沙发之间悠闲溜达
  updateCoffeeBreakAgents(nowSec) {
    this.agents.forEach((agent, idx) => {
      if (agent.status !== 'coffee_break' || agent.ceoReqId || agent.isWalking) return;
      if (!agent.nextRoamAt || nowSec >= agent.nextRoamAt) {
        const spot = this.leisureSpots[Math.floor(Math.random() * this.leisureSpots.length)];
        const aisleX = (agent.x < 720) ? 506 : 934;
        const targetAisleX = (spot.x < 720) ? 506 : 934;
        const path = [];
        path.push({ x: aisleX, y: agent.y });
        if (aisleX !== targetAisleX) {
          const midY = (agent.y < 410) ? 140 : 695;
          path.push({ x: aisleX, y: midY });
          path.push({ x: targetAisleX, y: midY });
        }
        path.push({ x: targetAisleX, y: spot.y });
        path.push({ x: spot.x + (idx % 3 - 1) * 18, y: spot.y });

        agent.path = path;
        agent.isWalking = true;
        agent.walkSpeed = 2.4;
        agent.onArrive = () => {
          agent.direction = 'down';
          agent.relaxProp = spot.prop;
          agent.bubble = true;
          agent.bubbleIcon = spot.icon;
          agent.role = window.t(`☕ 茶歇放松: ${spot.label}`, `☕ Break: ${spot.labelEn}`);
          agent.nextRoamAt = (performance.now() / 1000) + 5.5 + Math.random() * 5.0;
        };
      }
    });
  }

  rebuildAllWorkstations() {
    Object.keys(this.departments).forEach(id => {
      this.rebuildDepartmentWorkstations(id);
    });
  }

  // 同步待 CEO 审批列表：有待办的部门派员工拿文件夹进入中央 CEO 办公室等候；已批准的派回原工位办公
  syncCEORequests(newRequests = []) {
    this.ceoRequests = newRequests;
    const activeReqIds = new Set(newRequests.map(r => r.id));

    // 1. 检查已经在 CEO 办公室等候的员工，如果其请求已被批准，则欢快冒出金币走回自己工位
    this.agents.forEach(agent => {
      if (agent.ceoReqId && !activeReqIds.has(agent.ceoReqId)) {
        this.returnAgentFromCEO(agent);
      }
    });

    // 2. 为每个待批示请求指派对应部门的一名员工前往 CEO 办公室等候区
    const idMap = {
      chatgpt: 'openai',
      openai: 'openai',
      claude: 'claude',
      deepseek: 'deepseek',
      gemini: 'antigravity',
      antigravity: 'antigravity'
    };

    newRequests.forEach((req, idx) => {
      const rawDept = req.deptId || req.dept || 'antigravity';
      const deptId = idMap[rawDept] || rawDept;

      const alreadyAssigned = this.agents.find(a => a.ceoReqId === req.id);
      if (alreadyAssigned) return;

      const candidate = this.agents.find(a => a.deptId === deptId && !a.ceoReqId);
      if (candidate) {
        const spot = this.ceoWaitingSpots[idx % this.ceoWaitingSpots.length];
        this.sendAgentToCEO(candidate, req, spot);
      }
    });
  }

  // 派遣员工拿文件夹走进中央 CEO 办公室等待
  sendAgentToCEO(agent, req, spot) {
    agent.ceoReqId = req.id;
    agent.ceoTitle = req.agentName || agent.name;
    agent.name = agent.ceoTitle;
    agent.isCarrying = true;
    agent.isWalking = true;
    agent.status = 'handoff';
    agent.role = `📋 待CEO批示: ${req.title}`;
    agent.bubble = true;
    agent.bubbleIcon = '📋';

    const doorPos = { x: this.ceoRect.x + this.ceoRect.w / 2, y: this.ceoRect.y + this.ceoRect.h - 20 };
    const aisleX = (agent.seat.x < 720) ? 506 : 934;

    agent.path = [
      { x: aisleX, y: agent.y },
      { x: aisleX, y: doorPos.y + 20 },
      { x: doorPos.x, y: doorPos.y + 20 },
      { x: doorPos.x, y: spot.y },
      { x: spot.x, y: spot.y }
    ];

    agent.onArrive = () => {
      agent.status = 'waiting_ceo';
      agent.direction = 'up';
      agent.bubble = true;
      agent.bubbleIcon = '📋';
    };
  }

  // CEO 批准后：员工头顶冒出金币/星光，走出 CEO 办公室回到自己的工位继续工作
  returnAgentFromCEO(agent) {
    const dept = this.departments[agent.deptId];
    agent.ceoReqId = null;
    agent.ceoTitle = null;
    agent.isWalking = true;
    agent.isCarrying = false;
    agent.status = 'handoff';
    agent.coinBurstUntil = (performance.now() / 1000) + 4.5;

    const doorPos = { x: this.ceoRect.x + this.ceoRect.w / 2, y: this.ceoRect.y + this.ceoRect.h - 20 };
    const aisleX = (agent.seat.x < 720) ? 506 : 934;

    agent.path = [
      { x: doorPos.x, y: agent.y },
      { x: doorPos.x, y: doorPos.y + 20 },
      { x: aisleX, y: doorPos.y + 20 },
      { x: aisleX, y: agent.seat.y },
      { x: agent.seat.x, y: agent.seat.y }
    ];

    agent.onArrive = () => {
      const isBreak = dept && dept.lightsOn && dept.isCoffeeBreak;
      agent.status = (!dept || !dept.lightsOn) ? 'sleeping' : (isBreak ? 'coffee_break' : (agent.currentTask ? 'working' : 'idle'));
      agent.direction = 'down';
      agent.role = isBreak ? '☕ 茶歇放松: 喝咖啡休整中' : (agent.currentTask ? `正在执行: ${agent.currentTask.name}` : `${dept ? dept.name : ''} 专员`);
    };
  }

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

    if (window.pixelAudio) {
      window.pixelAudio.playKeyClick();
    }
    return newTask;
  }

  removeTask(deptId, taskId = null) {
    const dept = this.departments[deptId];
    if (!dept || dept.activeTasks.length === 0) return false;

    if (taskId) {
      dept.activeTasks = dept.activeTasks.filter(t => t.id !== taskId);
    } else {
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

  // 部门开关灯与额度恢复冒金币逻辑
  setDepartmentLight(deptId, lightsOn, isCoffeeBreak = false) {
    const dept = this.departments[deptId];
    if (!dept) return;

    const wasSleeping = !dept.lightsOn;
    dept.lightsOn = lightsOn;
    dept.isCoffeeBreak = Boolean(lightsOn && isCoffeeBreak);

    if (lightsOn) {
      if (dept.quota <= 5 && !isCoffeeBreak) dept.quota = 100;
      if (window.pixelAudio && wasSleeping) window.pixelAudio.playSwitch(true);

      const nowSec = performance.now() / 1000;
      const propsCycle = ['coffee', 'sunglasses', 'headphones', 'book', 'heart'];
      this.agents.filter(a => a.deptId === deptId).forEach((a, idx) => {
        if (wasSleeping && !isCoffeeBreak) {
          a.coinBurstUntil = nowSec + 4.5;
        }
        if (!a.ceoReqId && a.status !== 'waiting_ceo') {
          if (dept.isCoffeeBreak) {
            a.status = 'coffee_break';
            a.relaxProp = a.relaxProp || propsCycle[idx % propsCycle.length];
            a.bubble = true;
            a.bubbleIcon = a.bubbleIcon || '☕';
          } else if (a.status === 'sleeping' || a.status === 'coffee_break') {
            a.status = a.currentTask ? 'working' : 'idle';
            a.bubble = true;
            a.bubbleIcon = '🪙';
            setTimeout(() => { if (a.bubbleIcon === '🪙') a.bubble = false; }, 3500);
          }
        }
      });
    } else {
      if (window.pixelAudio && !wasSleeping) {
        window.pixelAudio.playSwitch(false);
        window.pixelAudio.playSleep();
      }
      this.agents.filter(a => a.deptId === deptId).forEach(a => {
        // 如果该员工正在 CEO 办公室等待或正在去往 CEO 办公室途中，不要强制拉回睡觉！
        if (!a.ceoReqId && a.status !== 'waiting_ceo') {
          a.status = 'sleeping';
          a.bubble = false;
          a.isWalking = false;
          a.path = [];
          a.x = a.seat.x;
          a.y = a.seat.y;
        }
      });
    }
  }

  calculatePath(fromAgent, toAgent) {
    const start = { x: fromAgent.x, y: fromAgent.y };
    const goal = { x: toAgent.seat.x + 24, y: toAgent.seat.y };

    const path = [];
    const fromAisleX = (start.x < 720) ? 506 : 934;
    const toAisleX = (goal.x < 720) ? 506 : 934;

    path.push({ x: fromAisleX, y: start.y });
    if (fromAisleX !== toAisleX) {
      const midY = (start.y < 410) ? 148 : 675;
      path.push({ x: fromAisleX, y: midY });
      path.push({ x: toAisleX, y: midY });
    }
    path.push({ x: toAisleX, y: goal.y });
    path.push(goal);
    return path;
  }
}

window.OfficeSystem = OfficeSystem;

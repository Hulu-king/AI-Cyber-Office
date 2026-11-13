/**
 * simulation.js - 智能体协作流转逻辑、交接动画管线与自动演练调度器
 */

class SimulationManager {
  constructor(office, onLog, onStatsChange) {
    this.office = office;
    this.onLog = onLog || console.log;
    this.onStatsChange = onStatsChange || (() => {});
    this.activeTasksCount = 0;
    this.handoffCount = 0;
    this.totalTokens = 152800;
    this.autoTimer = null;
    this.isAutoRunning = false;
  }

  // 记录结构化日志
  log(deptId, msg) {
    const dept = this.office.getDepartment(deptId);
    const tagClass = dept ? dept.tagClass : 'tag-system';
    const deptName = dept ? dept.name.split(' ')[0] : 'SYSTEM';
    this.onLog(deptName, tagClass, msg);
  }

  // 触发完整的智能体任务交接动画管线 (Core Handoff Workflow)
  startHandoff(fromId, toId, taskName = '代码实现与架构初审') {
    const fromAgent = this.office.getAgent(fromId);
    const toAgent = this.office.getAgent(toId);
    const fromDept = this.office.getDepartment(fromAgent.deptId);
    const toDept = this.office.getDepartment(toAgent.deptId);

    // 检查供电/额度状态
    if (!fromDept.lightsOn) {
      this.log(fromAgent.deptId, `⚠️ ${fromAgent.name} 所在部门额度耗尽关灯中，无法发起任务！`);
      return;
    }
    if (!toDept.lightsOn) {
      this.log(toAgent.deptId, `⚠️ 目标 ${toAgent.name} 处于休眠关灯中，交接暂停！`);
      return;
    }

    this.activeTasksCount++;
    this.onStatsChange({ activeTasks: this.activeTasksCount });

    // 阶段 1：发起方工位电脑亮起，小人双手疯狂打字
    fromAgent.status = 'working';
    fromAgent.bubble = true;
    fromAgent.bubbleIcon = '💡';
    this.log(fromAgent.deptId, `[${fromAgent.name}] 接收到任务《${taskName}》，正在电脑前极速生成代码...`);

    // 模拟敲键盘音效
    const typeInterval = setInterval(() => {
      if (fromAgent.status === 'working') {
        window.pixelAudio.playKeyClick();
        this.totalTokens += Math.floor(Math.random() * 80 + 30);
        this.onStatsChange({ tokens: this.totalTokens });
      }
    }, 180);

    // 阶段 2：2.5 秒后完成前置工作，起立带上公文袋走向目标工位
    setTimeout(() => {
      clearInterval(typeInterval);
      if (fromAgent.status === 'sleeping') return;

      fromAgent.status = 'handoff';
      fromAgent.isCarrying = true;
      fromAgent.bubble = true;
      fromAgent.bubbleIcon = '📁';

      const isCrossDept = (fromAgent.deptId !== toAgent.deptId);
      this.log(fromAgent.deptId, `[${fromAgent.name}] 完成编写，起立并手持文档前往 [${toAgent.name}] (${isCrossDept ? '跨部门' : '同部门'}协作)...`);

      // 联动任务栏极简挂件，实时展现“谁在给谁交接”
      if (window.onGlobalHandoff) {
        window.onGlobalHandoff(fromAgent.deptId, toAgent.deptId, taskName);
      }

      // 寻路走过去
      const path = this.office.calculatePath(fromAgent, toAgent);
      fromAgent.path = path;
      fromAgent.isWalking = true;

      // 阶段 3：到达目标工位，递交公文
      fromAgent.onArrive = () => {
        fromAgent.bubbleIcon = '🤝';
        toAgent.bubble = true;
        toAgent.bubbleIcon = '📦';
        window.pixelAudio.playHandoffSuccess();

        this.handoffCount++;
        this.log(toAgent.deptId, `🎉 [${fromAgent.name}] 成功将任务交付给 [${toAgent.name}]！`);
        this.onStatsChange({ handoffs: this.handoffCount });

        // 阶段 4：接收方开始敲键盘干活，发起方沿原路返回自己座位
        setTimeout(() => {
          toAgent.status = 'working';
          toAgent.bubbleIcon = '⚡';

          // 发起人原路返回座位
          fromAgent.isCarrying = false;
          fromAgent.bubble = null;
          const returnPath = this.office.calculatePath(toAgent, fromAgent);
          // 修正终点为发起人的确切椅子坐标
          returnPath[returnPath.length - 1] = { x: fromAgent.seat.x, y: fromAgent.seat.y };
          fromAgent.path = returnPath;
          fromAgent.isWalking = true;

          fromAgent.onArrive = () => {
            fromAgent.status = 'idle';
            fromAgent.direction = 'down';
            this.log(fromAgent.deptId, `[${fromAgent.name}] 已返回工位，待命中。`);
          };

          // 接收方工作 3 秒后完成
          setTimeout(() => {
            if (toAgent.status === 'working') {
              toAgent.status = 'idle';
              toAgent.bubble = null;
              this.activeTasksCount = Math.max(0, this.activeTasksCount - 1);
              this.log(toAgent.deptId, `✅ [${toAgent.name}] 任务审核与重构全部完成！已归档。`);
              this.onStatsChange({ activeTasks: this.activeTasksCount });
            }
          }, 3500);

        }, 1200);
      };

    }, 2500);
  }

  // 触发全员疯狂加班
  triggerAllWork() {
    this.office.agents.forEach(agent => {
      const dept = this.office.getDepartment(agent.deptId);
      if (dept.lightsOn && agent.status !== 'handoff') {
        agent.status = 'working';
        agent.bubble = true;
        agent.bubbleIcon = '🔥';
      }
    });
    this.activeTasksCount = this.office.agents.filter(a => a.status === 'working').length;
    this.onStatsChange({ activeTasks: this.activeTasksCount });
    this.log('openai', `🚨 全员突击模式启动！所有在线 AI 智能体满负荷并发执行！`);
  }

  // 重置所有人为空闲
  resetAll() {
    this.office.agents.forEach(agent => {
      const dept = this.office.getDepartment(agent.deptId);
      if (dept.lightsOn) {
        agent.status = 'idle';
        agent.bubble = null;
        agent.isWalking = false;
        agent.isCarrying = false;
        agent.path = [];
        agent.x = agent.seat.x;
        agent.y = agent.seat.y;
        agent.direction = 'down';
      }
    });
    this.activeTasksCount = 0;
    this.onStatsChange({ activeTasks: 0 });
    this.log('ollama', `🔄 已重置所有工位为空闲状态。`);
  }

  // 自动模拟巡检
  toggleAutoSimulation() {
    this.isAutoRunning = !this.isAutoRunning;
    if (this.isAutoRunning) {
      this.log('claude', `🎲 自动协作演练已开启：每隔 7 秒将随机触发一次智能体交接...`);
      this.runNextAutoStep();
    } else {
      clearTimeout(this.autoTimer);
      this.log('claude', `⏸ 自动协作演练已暂停。`);
    }
    return this.isAutoRunning;
  }

  runNextAutoStep() {
    if (!this.isAutoRunning) return;

    // 随机选择两个不同且在线的 Agent 进行交接
    const onlineAgents = this.office.agents.filter(a => {
      const dept = this.office.getDepartment(a.deptId);
      return dept.lightsOn && a.status === 'idle';
    });

    if (onlineAgents.length >= 2) {
      const from = onlineAgents[Math.floor(Math.random() * onlineAgents.length)];
      const otherAgents = onlineAgents.filter(a => a.id !== from.id);
      const to = otherAgents[Math.floor(Math.random() * otherAgents.length)];

      const mockTasks = [
        '前端原型重构',
        '多模态图像向量化',
        '高并发单元测试',
        '数学逻辑验证',
        'API 接口限流加固'
      ];
      const task = mockTasks[Math.floor(Math.random() * mockTasks.length)];
      this.startHandoff(from.id, to.id, task);
    }

    this.autoTimer = setTimeout(() => {
      this.runNextAutoStep();
    }, 7500);
  }
}

window.SimulationManager = SimulationManager;

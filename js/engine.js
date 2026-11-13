/**
 * engine.js - 主渲染引擎循环与交互监听
 */

class OfficeRenderer {
  constructor(canvas, office) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.office = office;
    this.time = 0;
    this.hoveredAgent = null;
    this.selectedAgent = null;

    // 禁用平滑滤波，保持像素颗粒感
    this.ctx.imageSmoothingEnabled = false;

    this.bindEvents();
    this.startLoop();
  }

  bindEvents() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      // 碰撞检测是否悬停在小人或工位上
      this.hoveredAgent = null;
      for (const agent of this.office.agents) {
        const dx = mx - agent.x;
        const dy = my - (agent.y - 10);
        if (Math.hypot(dx, dy) < 24) {
          this.hoveredAgent = agent;
          break;
        }
      }

      const tooltip = document.getElementById('tooltip');
      if (this.hoveredAgent) {
        this.canvas.style.cursor = 'pointer';
        tooltip.classList.remove('hidden');
        tooltip.style.left = (e.clientX + 14) + 'px';
        tooltip.style.top = (e.clientY + 14) + 'px';
        tooltip.innerHTML = `
          <strong style="color:${this.hoveredAgent.color}">${this.hoveredAgent.name}</strong><br>
          <span style="color:#94a3b8">${this.hoveredAgent.role}</span><br>
          状态: <b>${this.getStatusLabel(this.hoveredAgent.status)}</b>
        `;
      } else {
        this.canvas.style.cursor = 'default';
        tooltip.classList.add('hidden');
      }
    });

    this.canvas.addEventListener('click', () => {
      if (this.hoveredAgent) {
        this.selectedAgent = this.hoveredAgent;
        if (window.onAgentSelected) {
          window.onAgentSelected(this.hoveredAgent);
        }
      }
    });
  }

  getStatusLabel(status) {
    switch (status) {
      case 'idle': return '🟢 空闲就绪';
      case 'working': return '⚡ 专注编码中';
      case 'handoff': return '📁 递送交接任务';
      case 'sleeping': return '🌙 额度耗尽休眠中';
      default: return status;
    }
  }

  startLoop() {
    const loop = (timestamp) => {
      this.time = timestamp / 1000;
      this.update(0.016);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  update(dt) {
    // 更新所有智能体的行走与位置
    this.office.agents.forEach(agent => {
      if (agent.isWalking && agent.path && agent.path.length > 0) {
        const target = agent.path[0];
        const dx = target.x - agent.x;
        const dy = target.y - agent.y;
        const dist = Math.hypot(dx, dy);

        // 设置朝向
        if (Math.abs(dx) > Math.abs(dy)) {
          agent.direction = dx > 0 ? 'right' : 'left';
        } else {
          agent.direction = dy > 0 ? 'down' : 'up';
        }

        if (dist <= agent.walkSpeed) {
          agent.x = target.x;
          agent.y = target.y;
          agent.path.shift();

          if (agent.path.length === 0) {
            agent.isWalking = false;
            if (agent.onArrive) {
              agent.onArrive();
              agent.onArrive = null;
            }
          }
        } else {
          agent.x += (dx / dist) * agent.walkSpeed;
          agent.y += (dy / dist) * agent.walkSpeed;
        }
      }
    });
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const time = this.time;

    ctx.clearRect(0, 0, w, h);

    // 1. 绘制底层地板与走廊
    const tileSize = 20;
    for (let x = 0; x < w; x += tileSize) {
      for (let y = 0; y < h; y += tileSize) {
        Sprites.drawFloorTile(ctx, x, y, tileSize, 'hallway');
      }
    }

    // 2. 绘制 4 个部门的专属地毯与分区边框
    Object.values(this.office.departments).forEach(dept => {
      const r = dept.rect;
      // 部门地毯
      for (let x = r.x; x < r.x + r.w; x += tileSize) {
        for (let y = r.y; y < r.y + r.h; y += tileSize) {
          Sprites.drawFloorTile(ctx, x, y, tileSize, dept.floorType);
        }
      }

      // 部门外框线
      ctx.strokeStyle = dept.color + '44';
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x, r.y, r.w, r.h);

      // 部门标牌/地毯印字
      ctx.save();
      ctx.fillStyle = dept.color;
      ctx.font = 'bold 11px monospace';
      ctx.globalAlpha = 0.6;
      ctx.fillText(`[ ${dept.name.toUpperCase()} ]`, r.x + 14, r.y + 20);
      ctx.restore();
    });

    // 3. 绘制中央休息区 / 饮水机 / 绿植 / 装饰
    this.drawOfficeDecorations(ctx);

    // 4. 绘制所有工位 (桌子、电脑)
    this.office.agents.forEach(agent => {
      const dept = this.office.getDepartment(agent.deptId);
      const isScreenOn = dept.lightsOn && (agent.status === 'working' || (agent.status === 'idle' && Math.sin(time + agent.seat.x) > 0));
      const isWorking = (agent.status === 'working');
      Sprites.drawWorkstation(ctx, agent.desk.x, agent.desk.y, isScreenOn, dept.color, isWorking, time);
    });

    // 5. 绘制所有智能体 (按 Y 坐标排序以实现 2.5D 正确遮挡关系)
    const sortedAgents = [...this.office.agents].sort((a, b) => a.y - b.y);
    sortedAgents.forEach(agent => {
      Sprites.drawAgent(ctx, agent.x, agent.y, agent, time);

      // 选中光标环
      if (this.selectedAgent === agent) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(agent.x - 14, agent.y - 24, 28, 34);
      }
    });

    // 6. 绘制天花板吊灯
    Object.values(this.office.departments).forEach(dept => {
      dept.lamps.forEach(lamp => {
        Sprites.drawCeilingLamp(ctx, lamp.x, lamp.y, dept.lightsOn, dept.color);
      });
    });

    // 7. 区域光照系统：如果额度耗尽关灯，施加夜间暗影遮罩
    Object.values(this.office.departments).forEach(dept => {
      if (!dept.lightsOn) {
        const r = dept.rect;
        Sprites.drawZoneDarkness(ctx, r.x, r.y, r.w, r.h, 0.88);

        // 额度耗尽红色告警提示标语
        ctx.save();
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ QUOTA EXHAUSTED (RATE LIMITED) - SLEEPING ⚡', r.x + r.w / 2, r.y + r.h / 2 + 10);
        ctx.restore();
      }
    });
  }

  // 绘制走廊中间的盆栽、饮水机与服务器机柜
  drawOfficeDecorations(ctx) {
    // 中央盆栽绿植
    const plantX = 472;
    const plantY = 265;
    Sprites.pixelRect(ctx, plantX + 2, plantY + 10, 12, 10, '#b45309'); // 花盆
    Sprites.pixelRect(ctx, plantX, plantY, 16, 10, '#15803d'); // 树叶
    Sprites.pixelRect(ctx, plantX + 3, plantY - 4, 10, 6, '#22c55e');

    // 饮水机 (顶端桶装水 + 机身)
    const waterX = 472;
    const waterY = 60;
    Sprites.borderedRect(ctx, waterX + 2, waterY - 8, 12, 10, '#67e8f9', '#0891b2', 1); // 纯净水桶
    Sprites.borderedRect(ctx, waterX, waterY + 2, 16, 24, '#f1f5f9', '#94a3b8', 1); // 机身
    Sprites.pixelRect(ctx, waterX + 4, waterY + 8, 3, 3, '#ef4444'); // 热水按钮
    Sprites.pixelRect(ctx, waterX + 9, waterY + 8, 3, 3, '#3b82f6'); // 冷水按钮

    // 底部机柜 (Server Rack)
    const rackX = 466;
    const rackY = 480;
    Sprites.borderedRect(ctx, rackX, rackY, 28, 44, '#1e293b', '#0f172a', 2);
    // 服务器面板指示灯
    for (let i = 0; i < 4; i++) {
      Sprites.pixelRect(ctx, rackX + 4, rackY + 6 + i * 9, 20, 5, '#334155');
      const ledColor = (Math.floor(this.time * 5 + i) % 2 === 0) ? '#22c55e' : '#38bdf8';
      Sprites.pixelRect(ctx, rackX + 6, rackY + 8 + i * 9, 2, 2, ledColor);
    }
  }
}

window.OfficeRenderer = OfficeRenderer;

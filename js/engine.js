/**
 * engine.js - 高清全景渲染引擎循环、丰富办公室家具环境与点击跳转窗口交互
 */

class OfficeRenderer {
  constructor(canvas, office) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.office = office;
    this.time = 0;
    this.hoveredAgent = null;
    this.hoveredCeoNotebook = false;
    this.selectedAgent = null;

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

      this.hoveredAgent = null;
      this.hoveredCeoNotebook = false;
      for (const agent of this.office.agents) {
        const dx = mx - agent.x;
        const dy = my - (agent.y - 12);
        if (Math.hypot(dx, dy) < 34) {
          this.hoveredAgent = agent;
          break;
        }
      }

      if (!this.hoveredAgent && this.office.ceoRect) {
        const cr = this.office.ceoRect;
        const cx = cr.x + cr.w / 2;
        if (mx >= cx - 104 && mx <= cx + 104 && my >= cr.y + 56 && my <= cr.y + 164) {
          this.hoveredCeoNotebook = true;
        }
      }

      const tooltip = document.getElementById('tooltip');
      if (this.hoveredAgent) {
        this.canvas.style.cursor = 'pointer';
        tooltip.classList.remove('hidden');
        tooltip.style.left = Math.min(rect.width - 230, (e.clientX - rect.left + 16)) + 'px';
        tooltip.style.top = Math.max(10, (e.clientY - rect.top + 16)) + 'px';
        const clickHint = `<div style="color:#fde047; margin-top:3px;">${window.t('🪟 点击跳转对应 AI 窗口', '🪟 Click to focus AI client window')}</div>`;
        tooltip.innerHTML = `
          <strong style="color:${this.hoveredAgent.color}">${this.hoveredAgent.name}</strong><br>
          <span style="color:#cbd5e1">${this.hoveredAgent.role}</span><br>
          ${window.t('状态', 'Status')}: <b>${this.getStatusLabel(this.hoveredAgent.status)}</b>
          ${clickHint}
        `;
      } else if (this.hoveredCeoNotebook) {
        this.canvas.style.cursor = 'pointer';
        tooltip.classList.remove('hidden');
        tooltip.style.left = Math.min(rect.width - 230, (e.clientX - rect.left + 16)) + 'px';
        tooltip.style.top = Math.max(10, (e.clientY - rect.top + 16)) + 'px';
        tooltip.innerHTML = `
          <strong style="color:#fbbf24">${window.t('📓 CEO 的笔记本', "📓 CEO's Notebook")}</strong><br>
          <span style="color:#cbd5e1">${window.t('点击打开笔记本，记录与保存开发思路或计划', 'Click to open notebook, write & save dev ideas or plans')}</span>
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
      } else if (this.hoveredCeoNotebook) {
        if (window.openCeoNotebook) {
          window.openCeoNotebook();
        }
      }
    });
  }

  getStatusLabel(status) {
    switch (status) {
      case 'idle': return window.t('🟢 空闲待命', '🟢 Idle / Standby');
      case 'working': return window.t('⚡ 正在运行', '⚡ Running Local Task');
      case 'coffee_break': return window.t('☕ 茶歇溜达', '☕ Coffee Break / Roaming');
      case 'handoff': return window.t('📁 移动递送', '📁 In Transit');
      case 'waiting_ceo': return window.t('👑 等待批示', '👑 Waiting in CEO Office');
      case 'sleeping': return window.t('🌙 关灯休眠', '🌙 Quota Exhausted (Sleeping)');
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
    if (this.office.updateCoffeeBreakAgents) {
      this.office.updateCoffeeBreakAgents(this.time);
    }
    this.office.agents.forEach(agent => {
      if (agent.isWalking && agent.path && agent.path.length > 0) {
        const target = agent.path[0];
        const dx = target.x - agent.x;
        const dy = target.y - agent.y;
        const dist = Math.hypot(dx, dy);

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

    // 1. 绘制高清底层走廊地砖
    const tileSize = 28;
    for (let x = 0; x < w; x += tileSize) {
      for (let y = 0; y < h; y += tileSize) {
        Sprites.drawFloorTile(ctx, x, y, tileSize, 'hallway');
      }
    }

    // 2. 绘制中央走廊休息区、咖啡茶水间、喷泉水景与光纤导引线
    this.drawOfficeDecorations(ctx);

    // 3. 绘制 4 个 AI 部门的专属 3D 房间、墙体、专属家具与状态牌
    Object.values(this.office.departments).forEach(dept => {
      Sprites.drawDepartmentRoom(ctx, dept, time);
    });

    // 4. 绘制中央豪华 CEO 总裁办公室
    Sprites.drawCEOOffice(ctx, this.office.ceoRect, this.office.ceoRequests, time);

    // 5. 绘制所有部门的办公桌与电脑
    this.office.agents.forEach(agent => {
      const dept = this.office.getDepartment(agent.deptId);
      const isScreenOn = dept && dept.lightsOn && (agent.status === 'working' || agent.status === 'idle');
      const isWorking = (agent.status === 'working');
      Sprites.drawWorkstation(ctx, agent.desk.x, agent.desk.y, isScreenOn, dept ? dept.color : '#38bdf8', isWorking, time, agent.deptId);
    });

    // 6. 关灯区域的柔和夜色遮罩 或 茶歇休闲提示横幅
    Object.values(this.office.departments).forEach(dept => {
      const r = dept.rect;
      if (!dept.lightsOn) {
        Sprites.drawZoneDarkness(ctx, r.x, r.y, r.w, r.h, 0.42);

        ctx.save();
        Sprites.roundRect(ctx, r.x + r.w / 2 - 155, r.y + r.h - 36, 310, 24, 6, 'rgba(15, 23, 42, 0.92)', '#f43f5e', 1.5);
        ctx.fillStyle = '#fda4af';
        ctx.font = 'bold 11px "Noto Sans SC", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(window.t(`🌙 额度耗尽休眠 (${dept.displayQuota || '0%'})`, `🌙 Quota Exhausted · Sleeping (${dept.displayQuota || '0%'})`), r.x + r.w / 2, r.y + r.h - 24);
        ctx.restore();
      } else if (dept.isCoffeeBreak) {
        ctx.save();
        Sprites.roundRect(ctx, r.x + r.w / 2 - 160, r.y + r.h - 36, 320, 24, 6, 'rgba(15, 23, 42, 0.88)', '#f59e0b', 1.5);
        ctx.fillStyle = '#fde68a';
        ctx.font = 'bold 11px "Noto Sans SC", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(window.t(`☕ 5h冷却茶歇 (${dept.displayQuota || '22%'})`, `☕ 5h Cooldown · Coffee Break (${dept.displayQuota || 'Wk 22%'})`), r.x + r.w / 2, r.y + r.h - 24);
        ctx.restore();
      }
    });

    // 7. 绘制所有高清 AI 角色形象 (按 Y 坐标排序)
    const sortedAgents = [...this.office.agents].sort((a, b) => a.y - b.y);
    sortedAgents.forEach(agent => {
      Sprites.drawAgent(ctx, agent.x, agent.y, agent, time);

      if (this.selectedAgent === agent) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.strokeRect(agent.x - 28, agent.y - 42, 56, 62);
      }
    });

    // 8. 绘制天花板吊灯
    Object.values(this.office.departments).forEach(dept => {
      dept.lamps.forEach(lamp => {
        Sprites.drawCeilingLamp(ctx, lamp.x, lamp.y, dept.lightsOn, dept.color);
      });
    });
  }

  // 绘制走廊与公共茶水休闲区装饰
  drawOfficeDecorations(ctx) {
    ctx.save();

    // 1. 走廊地面发光导引灯带 (连接四大部门与中央 CEO 办公室)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(506, 145, 428, 535);
    ctx.setLineDash([]);

    // 2. 顶部中央公共区 (x: 525..915, y: 28..140)：赛博茶水间、自动售货机、圆桌与总控机柜
    Sprites.roundRect(ctx, 525, 28, 390, 118, 8, '#171C2B', '#2D3652', 2);

    // 左侧：自动售货机双联柜 (Vending Machines)
    Sprites.roundRect(ctx, 542, 38, 42, 66, 4, '#1E3A8A', '#0F172A', 2);
    Sprites.pixelRect(ctx, 548, 44, 24, 34, '#0EA5E9'); // 亮蓝展示窗
    Sprites.pixelRect(ctx, 550, 48, 20, 6, '#FACC15');
    Sprites.pixelRect(ctx, 550, 58, 20, 6, '#EF4444');
    Sprites.pixelRect(ctx, 550, 68, 20, 6, '#4ADE80');
    Sprites.pixelRect(ctx, 550, 86, 18, 10, '#090D16'); // 取货口

    Sprites.roundRect(ctx, 590, 38, 42, 66, 4, '#991B1B', '#0F172A', 2);
    Sprites.pixelRect(ctx, 596, 44, 24, 34, '#FEF08A');
    Sprites.pixelRect(ctx, 598, 50, 20, 6, '#F97316');
    Sprites.pixelRect(ctx, 598, 62, 20, 6, '#3B82F6');
    Sprites.pixelRect(ctx, 598, 86, 18, 10, '#090D16');

    // 中央：系统遥测主干机房 (Telemetry Core)
    const rackX = 656;
    const rackY = 38;
    Sprites.roundRect(ctx, rackX, rackY, 128, 68, 6, '#0F172A', '#38BDF8', 2);
    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LOCAL AI BUS', rackX + 64, rackY + 15);
    for (let i = 0; i < 3; i++) {
      Sprites.pixelRect(ctx, rackX + 12, rackY + 23 + i * 13, 104, 8, '#1E293B');
      const ledColor = (Math.floor(this.time * 6 + i) % 2 === 0) ? '#22C55E' : '#38BDF8';
      Sprites.pixelRect(ctx, rackX + 16, rackY + 25 + i * 13, 6, 4, ledColor);
      Sprites.pixelRect(ctx, rackX + 26, rackY + 25 + i * 13, 6, 4, '#F59E0B');
    }

    // 右侧：茶水间高脚圆桌与吧台椅
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(822, 82, 10, 0, Math.PI * 2);
    ctx.arc(878, 82, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#94A3B8';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(850, 82, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    Sprites.pixelRect(ctx, 844, 76, 8, 8, '#FFFFFF'); // 咖啡杯

    // 3. 底部中央公共休闲广场 (x: 525..915, y: 690..790)：室内生态喷泉水池 + 街机游戏机 + 休闲长椅
    Sprites.roundRect(ctx, 525, 690, 390, 96, 8, '#171C2B', '#2D3652', 2);

    // 左侧：复古像素街机 (Arcade Cabinet) + 休息长椅
    Sprites.roundRect(ctx, 545, 700, 40, 68, 4, '#4C1D95', '#F43F5E', 2);
    Sprites.pixelRect(ctx, 551, 708, 28, 22, '#38BDF8'); // 街机屏幕
    Sprites.pixelRect(ctx, 551, 734, 28, 8, '#FACC15');  // 摇杆台
    Sprites.roundRect(ctx, 600, 718, 66, 38, 6, '#334155', '#0F172A', 2); // 休息沙发椅

    // 中央：圆形生态喷泉水景池 (Zen Fountain)
    const fx = 735;
    const fy = 738;
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(fx, fy, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0284C7';
    ctx.beginPath();
    ctx.arc(fx, fy, 27, 0, Math.PI * 2);
    ctx.fill();

    // 动态水波纹
    const rippleR = 8 + ((this.time * 14) % 18);
    ctx.strokeStyle = '#7DD3FC';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(fx, fy, rippleR, 0, Math.PI * 2);
    ctx.stroke();

    // 右侧：走廊大型阔叶绿植组
    Sprites.drawLushPlant(ctx, 818, 714, '#10B981');
    Sprites.drawLushPlant(ctx, 864, 714, '#38BDF8');

    // 4. CEO 办公室四角迎宾盆栽柱
    Sprites.drawLushPlant(ctx, 495, 165, '#F59E0B');
    Sprites.drawLushPlant(ctx, 922, 165, '#F59E0B');
    Sprites.drawLushPlant(ctx, 495, 615, '#F59E0B');
    Sprites.drawLushPlant(ctx, 922, 615, '#F59E0B');

    ctx.restore();
  }
}

window.OfficeRenderer = OfficeRenderer;

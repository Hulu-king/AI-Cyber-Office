/**
 * sprites.js - 纯程序化像素图形与四大专属 AI 形象绘制引擎
 * 包含：DeepSeek 蓝色官方小鲸鱼、Claude 陶土多脚怪、ChatGPT 赛博执事、Antigravity 浮空星灵
 */

const Sprites = {
  // 基础绘制像素方块
  pixelRect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
  },

  // 绘制带有复古像素边框的矩形
  borderedRect(ctx, x, y, w, h, bgColor, borderColor, borderWidth = 2) {
    this.pixelRect(ctx, x, y, w, h, borderColor);
    this.pixelRect(ctx, x + borderWidth, y + borderWidth, w - borderWidth * 2, h - borderWidth * 2, bgColor);
  },

  // 绘制地板纹理
  drawFloorTile(ctx, x, y, size, type = 'wood') {
    if (type === 'carpet-claude') {
      ctx.fillStyle = '#2d1e18';
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = '#3d2920';
      ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
    } else if (type === 'carpet-openai') {
      ctx.fillStyle = '#12261f';
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = '#1a382e';
      ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
    } else if (type === 'carpet-deepseek') {
      ctx.fillStyle = '#132136';
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = '#1c3150';
      ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
    } else if (type === 'carpet-antigravity') {
      ctx.fillStyle = '#231838';
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = '#352454';
      ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
    } else if (type === 'hallway') {
      ctx.fillStyle = '#181b26';
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = '#222736';
      ctx.fillRect(x + 4, y + 4, size - 8, size - 8);
    }
  },

  // 绘制办公桌与电脑
  drawWorkstation(ctx, x, y, isScreenOn, themeColor, isWorking = false, time = 0) {
    // 办公桌台面
    this.borderedRect(ctx, x, y + 10, 56, 32, '#8d6e63', '#4e342e', 2);
    this.pixelRect(ctx, x + 3, y + 12, 50, 2, '#a1887f');
    this.pixelRect(ctx, x + 4, y + 42, 6, 10, '#3e2723');
    this.pixelRect(ctx, x + 46, y + 42, 6, 10, '#3e2723');

    // 显示器支架
    this.pixelRect(ctx, x + 24, y + 20, 8, 3, '#212121');
    this.pixelRect(ctx, x + 26, y + 14, 4, 7, '#37474f');

    // 显示屏 (32x20)
    const monX = x + 12;
    const monY = y - 2;
    const monW = 32;
    const monH = 20;

    this.borderedRect(ctx, monX, monY, monW, monH, '#1e2530', '#0a0d14', 2);

    if (isScreenOn) {
      const screenBg = isWorking ? '#002b36' : '#101726';
      this.pixelRect(ctx, monX + 2, monY + 2, monW - 4, monH - 4, screenBg);

      const lineStep = Math.floor(time * 8) % 4;
      const codeColors = [themeColor, '#00f0ff', '#ffffff', '#4ade80'];

      for (let i = 0; i < 3; i++) {
        const lineY = monY + 4 + i * 4;
        const color = codeColors[(i + lineStep) % codeColors.length];
        const lineW = 10 + ((i * 7 + lineStep * 5) % 14);
        this.pixelRect(ctx, monX + 4, lineY, lineW, 2, color);
      }

      if (isWorking) {
        ctx.save();
        ctx.fillStyle = themeColor;
        ctx.globalAlpha = 0.14 + Math.sin(time * 6) * 0.06;
        ctx.beginPath();
        ctx.arc(monX + 16, monY + 10, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else {
      this.pixelRect(ctx, monX + 2, monY + 2, monW - 4, monH - 4, '#0f1118');
      this.pixelRect(ctx, monX + monW - 5, monY + monH - 4, 2, 2, '#551111');
    }

    // 键盘鼠标
    this.pixelRect(ctx, x + 18, y + 26, 20, 6, '#374151');
    this.pixelRect(ctx, x + 42, y + 27, 5, 5, '#4b5563');

    // 咖啡杯
    this.pixelRect(ctx, x + 5, y + 16, 6, 7, '#f3f4f6');
    this.pixelRect(ctx, x + 3, y + 18, 2, 3, '#9ca3af');
    this.pixelRect(ctx, x + 6, y + 17, 4, 2, '#78350f');
  },

  // ==========================================
  // 1. DEEPSEEK：官方吉祥物 · 萌系蓝色小鲸鱼 🐳
  // ==========================================
  drawDeepSeekWhale(ctx, bx, by, agent, time) {
    const { status, isWalking, direction, isCarrying } = agent;
    const isSleeping = (status === 'sleeping');
    const isWorking = (status === 'working');

    // 靠背
    this.borderedRect(ctx, bx - 10, by - 14, 20, 16, '#132a4a', '#0b192c', 2);

    const whaleBlue = '#1d4ed8'; // 抹香鲸亮蓝
    const whaleDark = '#1e3a8a';
    const whaleWhite = '#f8fafc'; // 白肚皮

    if (isSleeping) {
      // 趴在桌上入睡：小鲸鱼趴在桌上，闭着眼睛，气孔冒出微小泡泡
      this.borderedRect(ctx, bx - 11, by - 4, 22, 10, whaleBlue, whaleDark, 1);
      this.pixelRect(ctx, bx - 9, by + 1, 18, 4, whaleWhite); // 肚皮
      // 闭眼 `- -`
      this.pixelRect(ctx, bx - 4, by - 1, 3, 1, '#0f172a');
      this.pixelRect(ctx, bx + 3, by - 1, 3, 1, '#0f172a');
      // 尾巴下垂
      this.pixelRect(ctx, bx + 11, by + 1, 5, 4, whaleDark);

      // Zzz
      const zPhase = (time * 1.5) % 3;
      ctx.fillStyle = '#60a5fa';
      ctx.font = 'bold 10px monospace';
      if (zPhase > 0.5) ctx.fillText('z', bx + 8 + zPhase * 3, by - 10 - zPhase * 5);
      if (zPhase > 1.2) ctx.fillText('Z', bx + 12 + zPhase * 4, by - 16 - zPhase * 7);
      return;
    }

    // 动作与浮动
    const bob = isWorking ? (Math.floor(time * 12) % 2) : (isWalking ? Math.floor(time * 8) % 2 : 0);
    const swimFloat = isWalking ? Math.sin(time * 6) * 2 : 0;
    const cy = by + bob + swimFloat;

    // 喷水动画 (Working 时或者 Idle 时偶尔喷泉 🐳 💦)
    if (isWorking || Math.sin(time * 2) > 0.7) {
      const spoutPhase = (time * 6) % 3;
      ctx.fillStyle = '#38bdf8';
      // 水柱与水滴
      this.pixelRect(ctx, bx - 1, cy - 18, 2, 4, '#38bdf8');
      this.pixelRect(ctx, bx - 4, cy - 20 - spoutPhase, 2, 2, '#67e8f9');
      this.pixelRect(ctx, bx + 2, cy - 20 - spoutPhase, 2, 2, '#67e8f9');
    }

    // 鲸鱼尾巴 (灵动摆动)
    const tailWag = Math.sin(time * 8) * 3;
    const tailX = (direction === 'left') ? bx + 10 : bx - 15;
    this.pixelRect(ctx, tailX, cy - 5 + tailWag, 5, 4, whaleDark);
    this.pixelRect(ctx, tailX - 3, cy - 8 + tailWag, 3, 10, whaleBlue); // 展开的双叶尾鳍
    this.pixelRect(ctx, tailX - 1, cy - 4 + tailWag, 2, 2, whaleWhite);

    // 鲸鱼圆润身体 (Sperm Whale Silhouette)
    this.borderedRect(ctx, bx - 10, cy - 14, 20, 15, whaleBlue, whaleDark, 1);
    // 白色肚皮
    this.pixelRect(ctx, bx - 8, cy - 3, 16, 4, whaleWhite);

    // 顶部小背鳍
    this.pixelRect(ctx, bx - 1, cy - 16, 4, 2, whaleDark);

    // 眼睛 (大黑眼珠 + 萌系高光点)
    if (isWorking) {
      // 专注工作的大眼睛
      this.pixelRect(ctx, bx - 6, cy - 9, 3, 3, '#0f172a');
      this.pixelRect(ctx, bx + 3, cy - 9, 3, 3, '#0f172a');
      this.pixelRect(ctx, bx - 5, cy - 9, 1, 1, '#ffffff');
      this.pixelRect(ctx, bx + 4, cy - 9, 1, 1, '#ffffff');
    } else {
      // 弯弯微笑眼 ^ ^
      this.pixelRect(ctx, bx - 6, cy - 8, 3, 1, '#0f172a');
      this.pixelRect(ctx, bx - 7, cy - 7, 1, 2, '#0f172a');
      this.pixelRect(ctx, bx + 3, cy - 8, 3, 1, '#0f172a');
      this.pixelRect(ctx, bx + 5, cy - 7, 1, 2, '#0f172a');
    }

    // 腮红 (萌系粉红红晕)
    this.pixelRect(ctx, bx - 7, cy - 5, 2, 2, '#f472b6');
    this.pixelRect(ctx, bx + 5, cy - 5, 2, 2, '#f472b6');

    // 鱼鳍手 (拍打键盘或握持文件)
    if (isWorking) {
      // 双鱼鳍在键盘上狂拍
      this.pixelRect(ctx, bx - 10, cy - 1 - (bob ? 2 : 0), 4, 3, whaleDark);
      this.pixelRect(ctx, bx + 6, cy - 1 + (bob ? 2 : 0), 4, 3, whaleDark);
    } else {
      this.pixelRect(ctx, bx - 9, cy - 2, 3, 3, whaleDark);
      this.pixelRect(ctx, bx + 6, cy - 2, 3, 3, whaleDark);
    }

    // 走动时水花特效
    if (isWalking) {
      if (Math.sin(time * 10) > 0.2) {
        this.pixelRect(ctx, bx - 6 + Math.random() * 12, cy + 3, 2, 2, '#7dd3fc');
      }
    }

    // 手持公文
    if (isCarrying || status === 'handoff') {
      const fx = (direction === 'left') ? bx - 12 : bx + 5;
      this.borderedRect(ctx, fx, cy - 6, 8, 9, '#f59e0b', '#b45309', 1);
    }
  },

  // ==========================================
  // 2. CLAUDE：陶土多脚怪 / 星火小怪兽 (Claudeling)
  // ==========================================
  drawClaudeling(ctx, bx, by, agent, time) {
    const { status, isWalking, isCarrying } = agent;
    const isSleeping = (status === 'sleeping');
    const isWorking = (status === 'working');
    const claudColor = '#d97757'; // 标志性陶土珊瑚红
    const claudDark = '#b4533c';

    // 靠背
    this.borderedRect(ctx, bx - 10, by - 14, 20, 16, '#292524', '#1c1917', 2);

    if (isSleeping) {
      this.pixelRect(ctx, bx - 10, by - 3, 20, 8, claudColor);
      this.pixelRect(ctx, bx - 8, by - 5, 16, 3, claudDark);
      this.pixelRect(ctx, bx - 5, by - 2, 2, 1, '#292524');
      this.pixelRect(ctx, bx + 3, by - 2, 2, 1, '#292524');

      const zPhase = (time * 1.5) % 3;
      ctx.fillStyle = '#fdba74';
      ctx.font = 'bold 10px monospace';
      if (zPhase > 0.5) ctx.fillText('z', bx + 8 + zPhase * 3, by - 10 - zPhase * 5);
      if (zPhase > 1.2) ctx.fillText('Z', bx + 12 + zPhase * 4, by - 16 - zPhase * 7);
      return;
    }

    const bob = isWorking ? (Math.floor(time * 12) % 2) : (Math.sin(time * 3) > 0.5 ? 1 : 0);

    // 身体与小角
    this.borderedRect(ctx, bx - 9, by - 14 + bob, 18, 14, claudColor, claudDark, 1);
    this.pixelRect(ctx, bx - 8, by - 17 + bob, 3, 3, claudColor);
    this.pixelRect(ctx, bx + 5, by - 17 + bob, 3, 3, claudColor);

    // 大眼睛
    if (isWorking) {
      this.pixelRect(ctx, bx - 6, by - 10 + bob, 3, 3, '#000000');
      this.pixelRect(ctx, bx + 3, by - 10 + bob, 3, 3, '#000000');
      this.pixelRect(ctx, bx - 5, by - 10 + bob, 1, 1, '#ffffff');
      this.pixelRect(ctx, bx + 4, by - 10 + bob, 1, 1, '#ffffff');
    } else {
      this.pixelRect(ctx, bx - 6, by - 9 + bob, 3, 3, '#000000');
      this.pixelRect(ctx, bx + 3, by - 9 + bob, 3, 3, '#000000');
    }

    // 4 只多足小短腿
    const legPhase = Math.floor(time * 10) % 4;
    const l1 = (isWalking && legPhase === 0) ? -2 : 0;
    const l2 = (isWalking && legPhase === 1) ? -2 : 0;
    const l3 = (isWalking && legPhase === 2) ? -2 : 0;
    const l4 = (isWalking && legPhase === 3) ? -2 : 0;

    this.pixelRect(ctx, bx - 8, by + bob, 3, 4 + l1, claudColor);
    this.pixelRect(ctx, bx - 4, by + bob, 3, 4 + l2, claudColor);
    this.pixelRect(ctx, bx + 1, by + bob, 3, 4 + l3, claudColor);
    this.pixelRect(ctx, bx + 5, by + bob, 3, 4 + l4, claudColor);

    if (isWorking) {
      this.pixelRect(ctx, bx - 11, by - 2, 3, 3, claudColor);
      this.pixelRect(ctx, bx + 8, by - 2, 3, 3, claudColor);
    } else if (!isWalking) {
      this.pixelRect(ctx, bx - 2, by - 4 + bob, 5, 5, '#38bdf8');
      this.pixelRect(ctx, bx + 3, by - 3 + bob, 1, 2, '#0284c7');
    }

    if (isCarrying || status === 'handoff') {
      this.borderedRect(ctx, bx - 4, by - 6 + bob, 8, 9, '#f59e0b', '#b45309', 1);
    }
  },

  // ==========================================
  // 3. CHATGPT / OPENAI：赛博黑白执事 + 绿旋涡陀螺
  // ==========================================
  drawChatGPTButler(ctx, bx, by, agent, time) {
    const { status, isWalking, isCarrying } = agent;
    const isSleeping = (status === 'sleeping');
    const isWorking = (status === 'working');

    this.borderedRect(ctx, bx - 10, by - 14, 20, 16, '#0f172a', '#020617', 2);

    if (isSleeping) {
      this.pixelRect(ctx, bx - 8, by - 4, 16, 12, '#1e293b');
      this.pixelRect(ctx, bx - 6, by - 10, 12, 8, '#0f172a');
      this.pixelRect(ctx, bx + 8, by + 2, 6, 6, '#334155');

      const zPhase = (time * 1.5) % 3;
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 10px monospace';
      if (zPhase > 0.5) ctx.fillText('z', bx + 8 + zPhase * 3, by - 10 - zPhase * 5);
      if (zPhase > 1.2) ctx.fillText('Z', bx + 12 + zPhase * 4, by - 16 - zPhase * 7);
      return;
    }

    const bob = isWorking ? (Math.floor(time * 10) % 2) : 0;

    // 旋转薄荷绿陀螺 (🌀)
    const haloY = by - 22 + bob + Math.sin(time * 4) * 2;
    const spin = time * 8;
    ctx.save();
    ctx.translate(bx, haloY);
    ctx.rotate(spin);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 1.5);
    ctx.stroke();
    this.pixelRect(ctx, -1, -1, 2, 2, '#a7f3d0');
    ctx.restore();

    // 头发与单眼镜片
    this.pixelRect(ctx, bx - 6, by - 16 + bob, 12, 10, '#0f172a');
    this.pixelRect(ctx, bx - 5, by - 12 + bob, 10, 7, '#ffe4e6');
    this.pixelRect(ctx, bx + 1, by - 10 + bob, 3, 3, '#34d399');
    this.pixelRect(ctx, bx, by - 11 + bob, 5, 1, '#facc15');
    this.pixelRect(ctx, bx - 3, by - 10 + bob, 2, 2, '#0f172a');

    // 西装马甲与绿领带
    this.pixelRect(ctx, bx - 7, by - 5 + bob, 14, 11, '#1e293b');
    this.pixelRect(ctx, bx - 3, by - 5 + bob, 6, 8, '#ffffff');
    this.pixelRect(ctx, bx - 1, by - 4 + bob, 2, 6, '#10b981');

    if (isWorking) {
      this.pixelRect(ctx, bx - 9, by + 1 - (bob ? 2 : 0), 3, 3, '#ffffff');
      this.pixelRect(ctx, bx + 6, by + 1 + (bob ? 2 : 0), 3, 3, '#ffffff');
    } else {
      this.pixelRect(ctx, bx - 8, by + 1, 3, 3, '#ffffff');
      this.pixelRect(ctx, bx + 5, by + 1, 3, 3, '#ffffff');
    }

    if (isWalking) {
      const step = Math.floor(time * 8) % 4;
      const legOffset = (step === 1) ? 2 : (step === 3 ? -2 : 0);
      this.pixelRect(ctx, bx - 5, by + 6, 4, 5 + legOffset, '#0f172a');
      this.pixelRect(ctx, bx + 1, by + 6, 4, 5 - legOffset, '#0f172a');
    }

    if (isCarrying || status === 'handoff') {
      this.borderedRect(ctx, bx + 4, by - 4 + bob, 8, 9, '#0284c7', '#0369a1', 1);
    }
  },

  // ==========================================
  // 4. ANTIGRAVITY：反重力星穹工匠 / 浮空星灵 (Zero-G)
  // ==========================================
  drawAntigravityStar(ctx, bx, by, agent, time) {
    const { status, isWalking, isCarrying } = agent;
    const isSleeping = (status === 'sleeping');
    const isWorking = (status === 'working');

    const hoverFloat = isSleeping ? 0 : Math.sin(time * 4) * 4 - 3;
    const hy = by + hoverFloat;

    this.borderedRect(ctx, bx - 10, by - 14, 20, 16, '#2e1065', '#1e1b4b', 2);

    if (isSleeping) {
      this.pixelRect(ctx, bx - 8, by - 4, 16, 12, '#4c1d95');
      this.pixelRect(ctx, bx - 6, by - 10, 12, 8, '#2e1065');
      this.pixelRect(ctx, bx + 6, by - 12, 3, 3, '#6d28d9');

      const zPhase = (time * 1.5) % 3;
      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold 10px monospace';
      if (zPhase > 0.5) ctx.fillText('✦z', bx + 8 + zPhase * 3, by - 10 - zPhase * 5);
      if (zPhase > 1.2) ctx.fillText('✦Z', bx + 12 + zPhase * 4, by - 16 - zPhase * 7);
      return;
    }

    // 反重力光环
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(bx, by + 9, 10, 3, 0, 0, Math.PI * 2);
    ctx.stroke();

    if (Math.sin(time * 8) > 0.3) {
      this.pixelRect(ctx, bx - 6 + Math.random() * 12, by + 6, 2, 2, '#c084fc');
    }
    ctx.restore();

    // 头顶四芒星天线 ✦
    const starY = hy - 21;
    this.pixelRect(ctx, bx - 1, hy - 16, 2, 4, '#c084fc');
    this.pixelRect(ctx, bx - 1, starY - 2, 2, 6, '#38bdf8');
    this.pixelRect(ctx, bx - 3, starY, 6, 2, '#38bdf8');
    this.pixelRect(ctx, bx - 1, starY, 2, 2, '#ffffff');

    // 头部紫发与星光眼
    this.pixelRect(ctx, bx - 6, hy - 14, 12, 10, '#581c87');
    this.pixelRect(ctx, bx - 5, hy - 11, 10, 7, '#ffedd5');
    this.pixelRect(ctx, bx - 3, hy - 9, 2, 2, '#38bdf8');
    this.pixelRect(ctx, bx + 1, hy - 9, 2, 2, '#a855f7');

    // 背带太空服
    this.pixelRect(ctx, bx - 7, hy - 4, 14, 11, '#6b21a8');
    this.pixelRect(ctx, bx - 4, hy - 4, 8, 8, '#06b6d4');
    this.pixelRect(ctx, bx - 1, hy - 2, 2, 4, '#facc15');

    if (isWorking) {
      this.pixelRect(ctx, bx - 10, hy - 1, 3, 3, '#38bdf8');
      this.pixelRect(ctx, bx + 7, hy - 1, 3, 3, '#c084fc');
      this.borderedRect(ctx, bx - 3, hy - 6, 6, 6, '#0284c7', '#38bdf8', 1);
    }

    this.pixelRect(ctx, bx - 4, hy + 7, 3, 3, '#2e1065');
    this.pixelRect(ctx, bx + 1, hy + 7, 3, 3, '#2e1065');

    if (isCarrying || status === 'handoff') {
      this.borderedRect(ctx, bx + 5, hy - 5, 7, 7, '#9333ea', '#c084fc', 1);
      this.pixelRect(ctx, bx + 7, hy - 3, 3, 3, '#ffffff');
    }
  },

  // 统一绘制分发
  drawAgent(ctx, x, y, agent, time = 0) {
    ctx.save();
    const bx = Math.floor(x);
    const by = Math.floor(y);

    if (agent.deptId === 'deepseek') {
      this.drawDeepSeekWhale(ctx, bx, by, agent, time);
    } else if (agent.deptId === 'claude') {
      this.drawClaudeling(ctx, bx, by, agent, time);
    } else if (agent.deptId === 'openai') {
      this.drawChatGPTButler(ctx, bx, by, agent, time);
    } else {
      this.drawAntigravityStar(ctx, bx, by, agent, time);
    }

    this.drawAgentBubble(ctx, bx, by - 24, agent, time);
    ctx.restore();
  },

  // 气泡
  drawAgentBubble(ctx, x, y, agent, time) {
    if (agent.bubble) {
      const bubbleW = 22;
      const bubbleH = 16;
      const bx = x - bubbleW / 2;
      const by = y - 6 + Math.sin(time * 4) * 2;

      this.borderedRect(ctx, bx, by, bubbleW, bubbleH, '#ffffff', '#000000', 1);
      this.pixelRect(ctx, x - 1, by + bubbleH, 2, 3, '#ffffff');

      ctx.fillStyle = '#000000';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(agent.bubbleIcon || '💡', x, by + bubbleH / 2);
    }
  },

  // 吊灯
  drawCeilingLamp(ctx, x, y, isOn, lightColor = '#fef08a') {
    this.pixelRect(ctx, x + 9, y - 20, 2, 20, '#4b5563');
    this.pixelRect(ctx, x, y, 20, 8, '#374151');
    this.pixelRect(ctx, x + 4, y - 4, 12, 4, '#1f2937');

    if (isOn) {
      this.pixelRect(ctx, x + 2, y + 6, 16, 3, lightColor);
    } else {
      this.pixelRect(ctx, x + 2, y + 6, 16, 3, '#1f2430');
    }
  },

  // 区域黑暗遮罩
  drawZoneDarkness(ctx, x, y, w, h, opacity = 0.88) {
    ctx.save();
    ctx.fillStyle = 'rgba(7, 9, 15, ' + opacity + ')';
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = '#05070a';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }
};

window.Sprites = Sprites;

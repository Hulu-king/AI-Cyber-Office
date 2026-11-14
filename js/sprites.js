/**
 * sprites.js - 高清像素赛博办公室环境、豪华家具装饰、图二四大助手像素形象与图三皮衣CEO渲染引擎
 */

window.LANG = localStorage.getItem('ai_office_lang') || 'zh';
window.t = (zhStr, enStr) => (window.LANG === 'en' ? enStr : zhStr);

const Sprites = {
  pixelRect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  },

  borderedRect(ctx, x, y, w, h, bgColor, borderColor, borderWidth = 2) {
    this.pixelRect(ctx, x, y, w, h, borderColor);
    this.pixelRect(ctx, x + borderWidth, y + borderWidth, w - borderWidth * 2, h - borderWidth * 2, bgColor);
  },

  roundRect(ctx, x, y, w, h, r, fill, stroke, lineWidth = 2) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  },

  // 绘制精细地板与地毯纹理
  drawFloorTile(ctx, x, y, size, type = 'hallway') {
    if (type === 'carpet-claude') {
      ctx.fillStyle = '#281A14';
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = '#332119';
      ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
      ctx.fillStyle = '#3D281E';
      ctx.fillRect(x + 4, y + 4, 4, 4);
    } else if (type === 'carpet-openai') {
      ctx.fillStyle = '#181B22';
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = '#20242E';
      ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
      ctx.fillStyle = '#282D3A';
      ctx.fillRect(x + size - 6, y + size - 6, 3, 3);
    } else if (type === 'carpet-deepseek') {
      ctx.fillStyle = '#0E1B33';
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = '#142544';
      ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
      ctx.fillStyle = '#1B3159';
      ctx.fillRect(x + 3, y + 3, size - 6, 2);
    } else if (type === 'carpet-antigravity') {
      ctx.fillStyle = '#1B1330';
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = '#241A40';
      ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
      ctx.fillStyle = '#2F2254';
      ctx.fillRect(x + 4, y + 4, 3, 3);
    } else if (type === 'carpet-ceo') {
      ctx.fillStyle = '#281117';
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = '#36161F';
      ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
      ctx.fillStyle = '#471D28';
      ctx.fillRect(x + 6, y + 6, size - 12, size - 12);
    } else {
      // 走廊深色抛光石木拼花地砖
      const isAlt = ((Math.floor(x / size) + Math.floor(y / size)) % 2 === 0);
      ctx.fillStyle = isAlt ? '#141824' : '#161B28';
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = '#1E2436';
      ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
      ctx.fillStyle = '#111520';
      ctx.fillRect(x, y + size - 1, size, 1);
    }
  },

  // =========================================================================
  // 绘制各部门 3D 墙体、玻璃隔断门廊与丰富室内家具装饰
  // =========================================================================
  drawDepartmentRoom(ctx, dept, time = 0) {
    const r = dept.rect;
    const tileSize = 28;

    // 1. 房间专属地毯铺装
    for (let x = r.x; x < r.x + r.w; x += tileSize) {
      for (let y = r.y; y < r.y + r.h; y += tileSize) {
        this.drawFloorTile(ctx, x, y, tileSize, dept.floorType);
      }
    }

    // 2. 顶部 3D 立体背景墙 (高 48px)
    this.borderedRect(ctx, r.x, r.y, r.w, 46, '#1E2538', '#0F1420', 2);
    this.pixelRect(ctx, r.x + 2, r.y + 38, r.w - 4, 6, '#131826'); // 踢脚线
    // 顶部霓虹灯带
    this.pixelRect(ctx, r.x + 4, r.y + 2, r.w - 8, 3, dept.lightsOn ? dept.color : '#334155');

    // 3. 绘制部门专属室内家具、服务器、书架、沙发、鱼缸与绿植
    this.drawDepartmentFurniture(ctx, dept, time);

    // 4. 房间四周立体玻璃隔断边框 + 朝向走廊的玻璃门与迎宾地垫
    ctx.save();
    ctx.strokeStyle = dept.lightsOn ? dept.color : '#334155';
    ctx.lineWidth = 3;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);

    // 朝向中央走廊的侧门与迎宾踏垫
    const isLeftRoom = (r.x < 500);
    const doorX = isLeftRoom ? (r.x + r.w - 6) : (r.x - 2);
    const doorY = r.y + r.h / 2 - 26;
    this.pixelRect(ctx, doorX, doorY, 8, 52, '#38BDF8'); // 玻璃门框高光
    const matX = isLeftRoom ? (r.x + r.w - 34) : (r.x + 8);
    this.roundRect(ctx, matX, doorY + 4, 26, 44, 4, '#1E293B', dept.color, 1.5);

    // 5. 顶部悬浮部门铭牌与实时额度
    this.roundRect(ctx, r.x + 14, r.y + 8, r.w - 28, 28, 6, 'rgba(11, 15, 25, 0.9)', dept.color + '99', 1.5);
    ctx.fillStyle = dept.color;
    ctx.font = 'bold 13px "Noto Sans SC", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`● ${dept.name}`, r.x + 24, r.y + 22);

    const qText = dept.displayQuota || `${dept.quota}%`;
    ctx.fillStyle = dept.lightsOn ? '#4ade80' : '#fb7185';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(window.t(`额度: ${qText}`, `Quota: ${qText}`), r.x + r.w - 24, r.y + 22);
    ctx.restore();
  },

  drawDepartmentFurniture(ctx, dept, time) {
    const r = dept.rect;
    ctx.save();

    if (dept.id === 'deepseek') {
      // 【DeepSeek 算法攻坚组】：深海液冷机房 + 算法推导白板 + 蓝色转角沙发 + 生态鱼缸
      // 右下角：液冷 GPU 算力机柜组
      const sx = r.x + r.w - 118;
      const sy = r.y + r.h - 84;
      for (let i = 0; i < 2; i++) {
        const rx = sx + i * 52;
        this.roundRect(ctx, rx, sy, 46, 70, 4, '#0F172A', '#0B63FF', 2);
        // 蓝色液冷管道与上升气泡
        this.pixelRect(ctx, rx + 6, sy + 8, 10, 54, '#0284C7');
        const by = sy + 52 - ((time * 18 + i * 15) % 44);
        this.pixelRect(ctx, rx + 9, by, 4, 4, '#E0F2FE');
        // 阵列指示灯
        for (let row = 0; row < 5; row++) {
          this.pixelRect(ctx, rx + 20, sy + 10 + row * 11, 20, 6, '#1E293B');
          const led = ((Math.floor(time * 5) + row + i) % 2 === 0) ? '#38BDF8' : '#22C55E';
          this.pixelRect(ctx, rx + 22, sy + 12 + row * 11, 4, 3, led);
        }
      }

      // 左下角：深海蓝休闲沙发 + 茶几 + 龟背竹绿植
      const lx = r.x + 18;
      const ly = r.y + r.h - 74;
      this.roundRect(ctx, lx, ly + 10, 120, 52, 6, 'rgba(11, 99, 255, 0.18)', '#1E3A8A', 1); // 地毯
      this.roundRect(ctx, lx + 6, ly + 16, 76, 36, 6, '#1D4ED8', '#0F172A', 2); // 沙发座
      this.roundRect(ctx, lx + 6, ly + 12, 76, 12, 4, '#2563EB', '#0F172A', 1.5); // 靠背
      this.roundRect(ctx, lx + 24, ly + 36, 40, 20, 4, '#38BDF8', '#0F172A', 1.5); // 玻璃茶几
      this.pixelRect(ctx, lx + 38, ly + 41, 8, 8, '#FFFFFF'); // 茶杯
      this.drawLushPlant(ctx, lx + 94, ly + 18, '#0B63FF');

      // 右侧墙边：数学公式白板
      this.borderedRect(ctx, r.x + r.w - 112, r.y + 58, 96, 44, '#F8FAFC', '#334155', 2);
      this.pixelRect(ctx, r.x + r.w - 104, r.y + 66, 36, 3, '#0B63FF');
      this.pixelRect(ctx, r.x + r.w - 104, r.y + 74, 52, 2, '#64748B');
      this.pixelRect(ctx, r.x + r.w - 104, r.y + 82, 44, 2, '#EF4444');
    } else if (dept.id === 'claude') {
      // 【Claude 创意研发组】：胡桃木满墙书架 + 敏捷便签看板 + 意式咖啡吧台 + 暖橘阅读角
      // 左下角：胡桃木大书柜 + 温暖编织地毯 + 沙发椅
      const lx = r.x + 18;
      const ly = r.y + r.h - 78;
      this.roundRect(ctx, lx, ly + 12, 130, 54, 8, 'rgba(255, 122, 46, 0.16)', '#7C2D12', 1);
      // 书架柜
      this.borderedRect(ctx, lx + 6, ly + 6, 68, 52, '#5C2D16', '#271209', 2);
      const bookCols = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#A855F7'];
      for (let row = 0; row < 2; row++) {
        this.pixelRect(ctx, lx + 10, ly + 12 + row * 22, 60, 16, '#271209');
        for (let b = 0; b < 7; b++) {
          this.pixelRect(ctx, lx + 12 + b * 8, ly + 14 + row * 22, 6, 14, bookCols[(b + row) % bookCols.length]);
        }
      }
      this.drawLushPlant(ctx, lx + 86, ly + 18, '#FF7A2E');

      // 右下角：手冲/意式咖啡吧台
      const cx = r.x + r.w - 126;
      const cy = r.y + r.h - 72;
      this.roundRect(ctx, cx, cy + 12, 108, 44, 5, '#78350F', '#271209', 2);
      this.pixelRect(ctx, cx + 4, cy + 15, 100, 5, '#B45309');
      // 咖啡机
      this.borderedRect(ctx, cx + 14, cy - 2, 28, 22, '#E2E8F0', '#334155', 2);
      this.pixelRect(ctx, cx + 22, cy + 8, 12, 10, '#1E293B');
      // 咖啡杯托盘與甜点架
      this.roundRect(ctx, cx + 52, cy + 4, 42, 16, 3, '#FEF3C7', '#92400E', 1.5);
      this.pixelRect(ctx, cx + 58, cy + 8, 8, 8, '#FF7A2E');
      this.pixelRect(ctx, cx + 74, cy + 8, 8, 8, '#F59E0B');
    } else if (dept.id === 'openai') {
      // 【ChatGPT 综合推理组】：黑白极简实验室 + 科研仪器柜 + 现代黑白休闲沙发 + 饮水机
      // 左下角：科研烧瓶玻璃陈列柜 + 绿植
      const lx = r.x + 22;
      const ly = r.y + r.h - 76;
      this.roundRect(ctx, lx, ly + 4, 88, 58, 5, '#1E293B', '#000000', 2);
      this.pixelRect(ctx, lx + 6, ly + 10, 76, 20, '#0F172A');
      this.pixelRect(ctx, lx + 14, ly + 16, 10, 12, '#38BDF8');
      this.pixelRect(ctx, lx + 32, ly + 14, 12, 14, '#A855F7');
      this.pixelRect(ctx, lx + 52, ly + 16, 10, 12, '#4ADE80');
      this.pixelRect(ctx, lx + 6, ly + 36, 76, 20, '#0F172A');
      this.drawLushPlant(ctx, lx + 102, ly + 20, '#10B981');

      // 右下角：极简黑白科技沙发座 + 几何茶几
      const sx = r.x + r.w - 140;
      const sy = r.y + r.h - 74;
      this.roundRect(ctx, sx, sy + 8, 122, 54, 6, 'rgba(255, 255, 255, 0.07)', '#475569', 1);
      this.roundRect(ctx, sx + 10, sy + 14, 84, 34, 6, '#F8FAFC', '#000000', 2);
      this.roundRect(ctx, sx + 10, sy + 10, 84, 12, 4, '#E2E8F0', '#000000', 2);
      this.roundRect(ctx, sx + 26, sy + 36, 52, 20, 4, '#18181B', '#E5E5E5', 1.5);
      this.pixelRect(ctx, sx + 44, sy + 41, 14, 10, '#4ADE80');
    } else if (dept.id === 'antigravity') {
      // 【Gemini / Antigravity 架构总控组】：全息星图投影圆桌 + 多模态剪辑墙 + 星云紫沙发
      // 左下角：星云紫丝绒沙发 + 水晶盆栽
      const lx = r.x + 22;
      const ly = r.y + r.h - 74;
      this.roundRect(ctx, lx, ly + 10, 120, 52, 8, 'rgba(142, 99, 247, 0.16)', '#6D28D9', 1);
      this.roundRect(ctx, lx + 8, ly + 16, 78, 34, 6, '#6D28D9', '#1E1B4B', 2);
      this.roundRect(ctx, lx + 8, ly + 12, 78, 12, 4, '#8B5CF6', '#1E1B4B', 1.5);
      this.drawLushPlant(ctx, lx + 96, ly + 18, '#D946EF');

      // 右下角：3D 全息星图投影圆桌 (Holographic Star-Map Table)
      const hx = r.x + r.w - 78;
      const hy = r.y + r.h - 46;
      // 全息底座
      ctx.fillStyle = '#1E1B4B';
      ctx.strokeStyle = '#8E63F7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(hx, hy + 8, 42, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 旋转的全息星球与星轨光环
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(hx, hy - 4, 26, 9, Math.sin(time * 2) * 0.3, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(217, 70, 239, 0.75)';
      ctx.beginPath();
      ctx.arc(hx, hy - 6 + Math.sin(time * 4) * 2, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  },

  // 绘制饱满的多层像素绿植盆栽
  drawLushPlant(ctx, x, y, potAccent = '#10B981') {
    // 陶瓷花盆
    this.roundRect(ctx, x, y + 18, 24, 20, 4, '#D97706', '#451A03', 2);
    this.pixelRect(ctx, x - 2, y + 16, 28, 5, '#F59E0B');
    this.pixelRect(ctx, x + 4, y + 24, 16, 3, potAccent);
    // 茂密阔叶
    const leaves = [
      { dx: 12, dy: 6, r: 13, c: '#15803D' },
      { dx: 4, dy: 10, r: 10, c: '#16A34A' },
      { dx: 20, dy: 10, r: 10, c: '#16A34A' },
      { dx: 12, dy: 2, r: 9, c: '#22C55E' },
      { dx: 8, dy: 5, r: 5, c: '#4ADE80' }
    ];
    leaves.forEach(l => {
      ctx.fillStyle = l.c;
      ctx.beginPath();
      ctx.arc(x + l.dx, y + l.dy, l.r, 0, Math.PI * 2);
      ctx.fill();
    });
  },

  // =========================================================================
  // 图三 CEO 像素形象绘制：银灰背头 + 黑框眼镜 + 黑色立领银拉链机车皮衣 + 双手叉腰
  // =========================================================================
  drawPixelCEOAvatar(ctx, cx, cy, time = 0) {
    const p = 2;
    const ox = Math.round(cx - 16 * p);
    const oy = Math.round(cy - 18 * p + Math.sin(time * 3) * 1.5);
    const px = (gx, gy, gw, gh, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(ox + gx * p, oy + gy * p, gw * p, gh * p);
    };

    ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 16, 24, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // 1. 银灰偏分蓬松背头
    px(8, 0, 16, 2, '#111827');
    px(9, 1, 14, 2, '#E5E7EB');
    px(7, 2, 18, 3, '#9CA3AF');
    px(10, 2, 10, 2, '#F3F4F6');
    px(6, 4, 20, 3, '#6B7280');
    px(8, 4, 15, 2, '#D1D5DB');
    px(5, 6, 3, 5, '#4B5563');
    px(24, 6, 3, 5, '#4B5563');

    // 2. 暖棕肤色脸庞与双耳
    px(8, 6, 16, 11, '#D99B78');
    px(9, 6, 14, 2, '#E6AD8C');
    px(5, 10, 3, 4, '#C68663');
    px(24, 10, 3, 4, '#C68663');

    // 3. 眉毛 + 黑框眼镜 + 眼神高光
    px(10, 7, 4, 1, '#374151');
    px(18, 7, 4, 1, '#374151');
    px(8, 9, 16, 1, '#111827');
    px(9, 9, 6, 4, '#111827');
    px(17, 9, 6, 4, '#111827');
    px(10, 10, 4, 2, '#FFFFFF');
    px(18, 10, 4, 2, '#FFFFFF');
    px(11, 10, 2, 2, '#451A03');
    px(19, 10, 2, 2, '#451A03');
    px(10, 10, 1, 1, '#60A5FA');
    px(18, 10, 1, 1, '#60A5FA');

    // 4. 鼻子与微笑
    px(15, 12, 2, 2, '#B47555');
    px(21, 13, 1, 1, '#78350F');
    px(12, 15, 8, 1, '#8C4A32');

    // 5. 黑色机车皮衣 + 银白双拉链 + 双手叉腰
    px(10, 17, 12, 2, '#18181B');
    px(6, 19, 20, 10, '#18181B');
    px(6, 19, 5, 3, '#3F3F46');
    px(21, 19, 5, 3, '#3F3F46');
    px(13, 18, 6, 10, '#09090B');
    px(12, 18, 1, 10, '#E4E4E7');
    px(19, 18, 1, 10, '#E4E4E7');
    px(8, 24, 4, 1, '#52525B');
    px(20, 24, 4, 1, '#52525B');

    px(3, 21, 3, 5, '#18181B');
    px(26, 21, 3, 5, '#18181B');
    px(5, 26, 3, 2, '#D99B78');
    px(24, 26, 3, 2, '#D99B78');

    px(9, 28, 14, 2, '#09090B');
    px(14, 28, 4, 2, '#D4D4D8');
    px(15, 28, 2, 2, '#18181B');
    px(10, 30, 5, 3, '#18181B');
    px(17, 30, 5, 3, '#18181B');
  },

  // =========================================================================
  // 绘制豪华中央 CEO 总裁办公室 (全景落地夜空窗 + 真皮会客沙发 + 奖杯书柜 + 皮衣总裁)
  // =========================================================================
  drawCEOOffice(ctx, ceoRect, ceoRequests = [], time = 0) {
    const { x, y, w, h } = ceoRect;
    const tileSize = 28;

    // 1. 皇家酒红丝绒地毯铺装
    for (let tx = x; tx < x + w; tx += tileSize) {
      for (let ty = y; ty < y + h; ty += tileSize) {
        this.drawFloorTile(ctx, tx, ty, tileSize, 'carpet-ceo');
      }
    }

    ctx.save();

    // 2. 顶部全景落地夜空城市天际线窗 (Panoramic City Skyline Window)
    this.borderedRect(ctx, x + 4, y + 4, w - 8, 56, '#090D1A', '#F59E0B', 2);
    // 星空与霓虹摩天大楼剪影
    const buildings = [
      { bx: 16, bw: 28, bh: 34, c: '#1E293B' },
      { bx: 48, bw: 22, bh: 42, c: '#1E3A8A' },
      { bx: 74, bw: 32, bh: 28, c: '#312E81' },
      { bx: 270, bw: 26, bh: 38, c: '#1E3A8A' },
      { bx: 300, bw: 34, bh: 44, c: '#1E293B' },
      { bx: 338, bw: 24, bh: 30, c: '#312E81' }
    ];
    buildings.forEach((b, idx) => {
      this.pixelRect(ctx, x + b.bx, y + 58 - b.bh, b.bw, b.bh, b.c);
      // 大楼灯光窗户
      for (let wy = y + 62 - b.bh; wy < y + 54; wy += 6) {
        for (let wx = x + b.bx + 4; wx < x + b.bx + b.bw - 4; wx += 6) {
          if ((wx + wy + idx) % 3 !== 0) {
            this.pixelRect(ctx, wx, wy, 3, 3, '#FDE047');
          }
        }
      }
    });

    // 3. 金色尊贵双层墙框与底部双开玻璃大门
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 6, y + 6, w - 12, h - 12);

    // 中央迎宾红金地毯跑道
    const runnerX = x + w / 2 - 48;
    this.borderedRect(ctx, runnerX, y + 162, 96, h - 168, '#7F1D1D', '#F59E0B', 2);
    // 红毯金边装饰纹
    this.pixelRect(ctx, runnerX + 6, y + 166, 2, h - 176, '#FBBF24');
    this.pixelRect(ctx, runnerX + 88, y + 166, 2, h - 176, '#FBBF24');

    // 顶部标题铭牌
    this.roundRect(ctx, x + w / 2 - 135, y + 10, 270, 26, 6, 'rgba(15, 23, 42, 0.92)', '#F59E0B', 2);
    ctx.fillStyle = '#FBBF24';
    ctx.font = 'bold 12px "Noto Sans SC", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(window.t('👑 CEO 总裁室', '👑 CEO OFFICE'), x + w / 2, y + 27);

    // 4. 左侧 VIP 会客真皮沙发区 + 金杯陈列柜 + 盆栽
    this.borderedRect(ctx, x + 16, y + 70, 56, 40, '#451A03', '#F59E0B', 1.5); // 奖杯陈列柜
    this.pixelRect(ctx, x + 26, y + 78, 10, 12, '#FACC15'); // 金奖杯
    this.pixelRect(ctx, x + 46, y + 80, 10, 10, '#38BDF8'); // 水晶奖杯
    // 左侧真皮长沙发 (Chesterfield Sofa)
    this.roundRect(ctx, x + 16, y + 178, 42, 110, 8, '#78350F', '#271209', 2);
    this.roundRect(ctx, x + 16, y + 178, 14, 110, 5, '#92400E', '#271209', 1.5);
    this.roundRect(ctx, x + 64, y + 198, 28, 70, 4, '#1E293B', '#F59E0B', 1.5); // 大理石茶几
    this.pixelRect(ctx, x + 73, y + 225, 10, 10, '#4ADE80'); // 茶几盆景
    this.drawLushPlant(ctx, x + 22, y + 400, '#F59E0B');

    // 5. 右侧总裁战略大屏 + 红木书柜 + 盆栽
    this.borderedRect(ctx, x + w - 76, y + 70, 60, 40, '#0F172A', '#38BDF8', 1.5); // 战略大屏
    this.pixelRect(ctx, x + w - 68, y + 80, 44, 3, '#4ADE80');
    this.pixelRect(ctx, x + w - 68, y + 88, 32, 3, '#F59E0B');
    this.pixelRect(ctx, x + w - 68, y + 96, 38, 3, '#38BDF8');
    // 右侧红木真皮座椅区
    this.roundRect(ctx, x + w - 58, y + 178, 42, 110, 8, '#78350F', '#271209', 2);
    this.roundRect(ctx, x + w - 30, y + 178, 14, 110, 5, '#92400E', '#271209', 1.5);
    this.drawLushPlant(ctx, x + w - 46, y + 400, '#F59E0B');

    // 6. 绘制图三像素化皮衣 CEO 形象与豪华总裁桌
    const cx = x + w / 2;
    const cy = y + 88;
    this.drawPixelCEOAvatar(ctx, cx, cy, time);

    const deskX = cx - 102;
    const deskY = y + 116;
    this.roundRect(ctx, deskX, deskY, 204, 44, 6, '#5C2D16', '#F59E0B', 2);
    this.pixelRect(ctx, deskX + 6, deskY + 4, 192, 4, '#7C3F20');
    // 桌上全息地球仪与批示金印
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.arc(deskX + 28, deskY + 22, 9, 0, Math.PI * 2);
    ctx.fill();
    this.roundRect(ctx, cx - 44, deskY + 14, 88, 18, 4, '#FBBF24', '#78350F', 1.5);
    ctx.fillStyle = '#451A03';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText('👑 CEO DESK', cx, deskY + 26);

    // 桌上 CEO 翻阅中的像素笔记本 (Animated Flipping CEO Notebook)
    const nbX = deskX + 150;
    const nbY = deskY + 10;
    const flipPhase = Math.floor(time * 3.5) % 4;
    // 皮革封面底座
    this.roundRect(ctx, nbX, nbY, 38, 26, 3, '#92400E', '#FBBF24', 1.5);
    // 左页 & 右页
    this.pixelRect(ctx, nbX + 3, nbY + 3, 15, 20, '#FEF3C7');
    this.pixelRect(ctx, nbX + 20, nbY + 3, 15, 20, '#FFFBEB');
    // 书脊
    this.pixelRect(ctx, nbX + 18, nbY + 2, 2, 22, '#78350F');
    // 笔记文字横线
    this.pixelRect(ctx, nbX + 5, nbY + 7, 10, 2, '#94A3B8');
    this.pixelRect(ctx, nbX + 5, nbY + 12, 11, 2, '#94A3B8');
    this.pixelRect(ctx, nbX + 5, nbY + 17, 8, 2, '#94A3B8');
    this.pixelRect(ctx, nbX + 22, nbY + 7, 10, 2, '#64748B');
    this.pixelRect(ctx, nbX + 22, nbY + 12, 9, 2, '#64748B');
    // 翻页动画弧线
    if (flipPhase === 1) {
      this.pixelRect(ctx, nbX + 18, nbY + 2, 9, 20, '#FDE68A');
    } else if (flipPhase === 2) {
      this.pixelRect(ctx, nbX + 11, nbY + 2, 8, 20, '#FDE68A');
    } else if (flipPhase === 3) {
      // 笔尖轻点右页
      this.pixelRect(ctx, nbX + 30, nbY + 14, 4, 8, '#38BDF8');
    }
    // 书签丝带
    this.pixelRect(ctx, nbX + 24, nbY + 23, 3, 6, '#EF4444');

    // 7. 办公桌前方的 4 个待批示汇报地标
    const spots = [
      { x: cx - 72, y: y + 235, label: '1号汇报位' },
      { x: cx + 72, y: y + 235, label: '2号汇报位' },
      { x: cx - 72, y: y + 345, label: '3号汇报位' },
      { x: cx + 72, y: y + 345, label: '4号汇报位' }
    ];

    spots.forEach((sp, idx) => {
      const hasPending = idx < ceoRequests.length;
      ctx.save();
      ctx.strokeStyle = hasPending ? '#FBBF24' : 'rgba(251, 191, 36, 0.25)';
      ctx.lineWidth = hasPending ? 2.5 : 1.2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.ellipse(sp.x, sp.y + 10, 30, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    });

    // 底部双开迎宾玻璃门
    this.borderedRect(ctx, cx - 46, y + h - 8, 92, 10, '#38BDF8', '#F59E0B', 1.5);

    if (ceoRequests.length > 0) {
      ctx.fillStyle = '#FBBF24';
      ctx.font = 'bold 11px "Noto Sans SC", sans-serif';
      ctx.fillText(window.t('📋 点击汇报员工跳转窗口', '📋 Click waiting agent to focus AI window'), cx, y + h - 18);
    }

    ctx.restore();
  },

  // 绘制高清办公桌与图二同款像素道具 (笔记本电脑、书本、紫色烧瓶、咖啡杯)
  drawWorkstation(ctx, x, y, isScreenOn, themeColor, isWorking = false, time = 0, deptId = 'openai') {
    ctx.save();
    const deskW = 96;
    const deskH = 46;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(x + 4, y + 48, deskW - 8, 10);

    this.roundRect(ctx, x, y + 12, deskW, deskH, 6, '#7c5846', '#3e2723', 2.5);
    this.pixelRect(ctx, x + 4, y + 15, deskW - 8, 4, '#9c735e');
    this.pixelRect(ctx, x + 8, y + 54, 8, 12, '#271714');
    this.pixelRect(ctx, x + deskW - 16, y + 54, 8, 12, '#271714');

    const bookColor = (deptId === 'openai' || deptId === 'claude') ? '#4ADE80' : '#FBBF24';
    this.borderedRect(ctx, x + 6, y + 20, 20, 14, bookColor, '#000000', 1.5);
    this.pixelRect(ctx, x + 15, y + 21, 2, 12, '#000000');

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 75, y + 16);
    ctx.lineTo(x + 81, y + 16);
    ctx.lineTo(x + 86, y + 30);
    ctx.lineTo(x + 70, y + 30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#D946EF';
    ctx.fillRect(x + 72, y + 24, 12, 5);

    this.borderedRect(ctx, x + 72, y + 35, 12, 11, (deptId === 'openai') ? '#FACC15' : '#FFFFFF', '#000000', 1.5);

    const lapX = x + 28;
    const lapY = y + 8;
    const lapW = 40;
    const lapH = 26;

    const lapColors = {
      openai: '#9CA3AF',
      deepseek: '#4DA3FF',
      claude: '#FF7A2E',
      antigravity: '#CBD5E1'
    };
    const lidColor = isScreenOn ? (lapColors[deptId] || '#CBD5E1') : '#334155';

    this.roundRect(ctx, lapX - 3, lapY + 22, lapW + 6, 7, 2, '#64748B', '#000000', 1.5);
    this.roundRect(ctx, lapX, lapY, lapW, lapH, 4, lidColor, '#000000', 2);

    if (isScreenOn) {
      if (isWorking) {
        ctx.save();
        ctx.fillStyle = themeColor;
        ctx.globalAlpha = 0.16 + Math.sin(time * 7) * 0.06;
        ctx.beginPath();
        ctx.arc(lapX + lapW / 2, lapY + lapH / 2, 32, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = (deptId === 'antigravity') ? '#4285F4' : '#FFFFFF';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const logoText = deptId === 'openai' ? '❂' : (deptId === 'antigravity' ? 'G' : (deptId === 'deepseek' ? '🐳' : '✳'));
      ctx.fillText(logoText, lapX + lapW / 2, lapY + lapH / 2);
    } else {
      this.pixelRect(ctx, lapX + lapW - 6, lapY + lapH - 5, 3, 3, '#ef4444');
    }

    ctx.restore();
  },

  // 1. DEEPSEEK：图二第2列 (#0B63FF, #4DA3FF, #D9EDFF, #FFFFFF)
  drawDeepSeekWhale(ctx, bx, by, agent, time) {
    const { status, isWalking, direction, isCarrying } = agent;
    const isSleeping = (status === 'sleeping');
    const isWorking = (status === 'working');

    const bob = isWorking ? (Math.floor(time * 10) % 2) * 2 : (isWalking ? Math.abs(Math.sin(time * 10)) * 3 : 0);
    const cy = Math.round(by - 14 + (isSleeping ? 4 : -bob));

    ctx.save();
    ctx.translate(bx, cy);
    if (direction === 'right') {
      ctx.scale(-1, 1);
    }

    const p = 2;
    const ox = -16 * p;
    const oy = -14 * p;
    const px = (gx, gy, gw, gh, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(ox + gx * p, oy + gy * p, gw * p, gh * p);
    };

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 18, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (!isSleeping) {
      const sp = Math.floor(time * 6) % 2;
      px(11, 1 - sp, 2, 2, '#4DA3FF');
      px(17, 1 - sp, 2, 2, '#4DA3FF');
      px(14, 3 - sp, 2, 3, '#0B63FF');
    }

    px(22, 7, 8, 2, '#000000');
    px(21, 9, 2, 4, '#000000');
    px(29, 9, 2, 4, '#000000');
    px(23, 9, 6, 4, '#0B63FF');
    px(24, 9, 4, 2, '#4DA3FF');

    px(7, 8, 12, 2, '#000000');
    px(5, 10, 2, 3, '#000000');
    px(3, 13, 2, 8, '#000000');
    px(5, 21, 2, 3, '#000000');
    px(7, 24, 16, 2, '#000000');
    px(23, 20, 2, 4, '#000000');
    px(25, 13, 2, 7, '#000000');
    px(19, 10, 4, 3, '#000000');

    px(7, 10, 12, 9, '#0B63FF');
    px(5, 13, 14, 6, '#0B63FF');
    px(19, 13, 6, 7, '#0B63FF');
    px(8, 10, 10, 3, '#4DA3FF');

    px(5, 19, 13, 4, '#FFFFFF');
    px(7, 22, 14, 2, '#FFFFFF');
    px(7, 20, 2, 4, '#D9EDFF');
    px(11, 20, 2, 4, '#D9EDFF');
    px(15, 21, 2, 3, '#D9EDFF');

    if (isSleeping) {
      px(9, 15, 4, 1, '#000000');
    } else {
      px(9, 14, 3, 3, '#000000');
      px(9, 14, 1, 1, '#FFFFFF');
    }

    px(17, 19, 5, 3, '#000000');
    px(18, 19, 3, 2, '#4DA3FF');

    if (isCarrying || status === 'handoff' || status === 'waiting_ceo') {
      px(1, 14, 6, 7, '#000000');
      px(2, 15, 4, 5, '#FBBF24');
      px(3, 16, 2, 3, '#FFFFFF');
    }

    ctx.restore();

    if (isSleeping) {
      this.drawSleepZzz(ctx, bx, cy - 18, '#0B63FF', time);
    }
  },

  // 2. CLAUDE：图二第3列 (#7A3E00, #FF7A2E, #FFD4A8, #FFF7E6)
  drawClaudeling(ctx, bx, by, agent, time) {
    const { status, isWalking, isCarrying, relaxProp } = agent;
    const isSleeping = (status === 'sleeping');
    const isWorking = (status === 'working');
    const isBreak = (status === 'coffee_break');

    const bob = isWorking ? (Math.floor(time * 12) % 2) * 2 : (isWalking ? Math.abs(Math.sin(time * 10)) * 3 : (isBreak ? Math.round(Math.sin(time * 4) * 1.5) : 0));
    const cy = Math.round(by - 12 + (isSleeping ? 4 : -bob));

    ctx.save();
    const p = 2;
    const ox = Math.round(bx - 16 * p);
    const oy = Math.round(cy - 14 * p);
    const px = (gx, gy, gw, gh, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(ox + gx * p, oy + gy * p, gw * p, gh * p);
    };

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(bx, by + 8, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const bodyOrange = '#E07A53';
    const lightOrange = '#FF946B';
    const eyeBrown = '#2B1405';

    px(6, 7, 20, 13, bodyOrange);
    px(6, 7, 20, 2, lightOrange);

    const armShift = isWorking ? (Math.floor(time * 12) % 2) : 0;
    px(2, 12 + armShift, 4, 4, bodyOrange);
    px(26, 12 - armShift, 4, 4, bodyOrange);

    const legStep = isWalking ? (Math.floor(time * 12) % 2) * 2 : 0;
    const legH = isSleeping ? 3 : 6;
    px(7, 20, 3, legH + legStep, bodyOrange);
    px(12, 20, 3, legH + (2 - legStep), bodyOrange);
    px(17, 20, 3, legH + legStep, bodyOrange);
    px(22, 20, 3, legH + (2 - legStep), bodyOrange);

    if (isSleeping) {
      px(9, 12, 3, 1, eyeBrown);
      px(20, 12, 3, 1, eyeBrown);
    } else if (isBreak && relaxProp === 'sunglasses') {
      // 图二第4行第2个：炫酷像素黑墨镜 + 白色反光条
      px(6, 11, 20, 1, '#000000');
      px(7, 11, 7, 4, '#000000');
      px(18, 11, 7, 4, '#000000');
      px(8, 12, 2, 1, '#FFFFFF');
      px(19, 12, 2, 1, '#FFFFFF');
    } else if (isBreak && (relaxProp === 'coffee' || relaxProp === 'heart')) {
      // 愉悦弯弯笑眼 (^ ^)
      px(9, 11, 3, 1, eyeBrown);
      px(8, 12, 1, 1, eyeBrown);
      px(12, 12, 1, 1, eyeBrown);
      px(20, 11, 3, 1, eyeBrown);
      px(19, 12, 1, 1, eyeBrown);
      px(23, 12, 1, 1, eyeBrown);
    } else {
      px(9, 11, 3, 3, eyeBrown);
      px(20, 11, 3, 3, eyeBrown);
    }

    if ((isWorking && !isSleeping) || (isBreak && relaxProp === 'headphones')) {
      // 图二第4行第1个：蓝色头戴式像素耳机
      px(5, 5, 22, 2, '#2563EB');
      px(4, 7, 2, 7, '#2563EB');
      px(26, 7, 2, 7, '#2563EB');
      px(3, 10, 3, 5, '#3B82F6');
      px(26, 10, 3, 5, '#3B82F6');

      if (isWorking) {
        px(14, -1, 4, 4, '#FACC15');
        px(15, 3, 2, 2, '#9CA3AF');
      }
    }

    if (isBreak && relaxProp === 'coffee') {
      // 图二第3行第4个：手捧白色像素马克杯喝热咖啡 + 升腾热气
      px(22, 13, 8, 8, '#000000');
      px(23, 14, 6, 6, '#FFFFFF');
      px(24, 14, 4, 2, '#78350F');
      px(30, 15, 2, 4, '#000000');
      const steamY = Math.floor(time * 5) % 2;
      px(24, 10 - steamY, 1, 2, '#FFF7E6');
      px(27, 9 - steamY, 1, 2, '#FFF7E6');
    } else if (isBreak && relaxProp === 'book') {
      // 图二第2行第1个：手捧绿色像素书本阅读
      px(8, 15, 16, 8, '#000000');
      px(9, 16, 6, 6, '#4ADE80');
      px(17, 16, 6, 6, '#4ADE80');
      px(15, 16, 2, 6, '#166534');
    } else if (isBreak && relaxProp === 'heart') {
      // 图二第3行第1个：头顶飘动像素红心
      const hy = Math.floor(Math.sin(time * 6) * 2);
      px(12, -2 + hy, 3, 2, '#F43F5E');
      px(17, -2 + hy, 3, 2, '#F43F5E');
      px(11, 0 + hy, 10, 3, '#F43F5E');
      px(13, 3 + hy, 6, 2, '#F43F5E');
      px(15, 5 + hy, 2, 1, '#F43F5E');
    }

    if (isCarrying || status === 'handoff' || status === 'waiting_ceo') {
      px(23, 11, 8, 10, '#000000');
      px(24, 12, 6, 8, '#FFFFFF');
      px(25, 11, 4, 2, '#F59E0B');
      px(25, 15, 4, 1, '#94A3B8');
      px(25, 17, 4, 1, '#94A3B8');
    }

    ctx.restore();

    if (isSleeping) {
      this.drawSleepZzz(ctx, bx, cy - 16, '#3B82F6', time);
    }
  },

  // 3. CHATGPT：图二第1列 (#000000, #E5E5E5, #FFFFFF, #8B8B8B)
  drawChatGPTButler(ctx, bx, by, agent, time) {
    const { status, isWalking, isCarrying } = agent;
    const isSleeping = (status === 'sleeping');
    const isWorking = (status === 'working');

    const bob = isWorking ? (Math.floor(time * 12) % 2) * 2 : (isWalking ? Math.abs(Math.sin(time * 10)) * 3 : 0);
    const cy = Math.round(by - 14 + (isSleeping ? 4 : -bob));

    ctx.save();
    const p = 2;
    const ox = Math.round(bx - 16 * p);
    const oy = Math.round(cy - 15 * p);
    const px = (gx, gy, gw, gh, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(ox + gx * p, oy + gy * p, gw * p, gh * p);
    };

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(bx, by + 8, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    px(12, 0, 8, 2, '#000000');
    px(10, 2, 12, 6, '#000000');
    px(12, 2, 8, 6, '#FFFFFF');
    px(13, 3, 6, 4, '#000000');
    px(14, 4, 4, 2, '#E5E5E5');

    px(7, 8, 18, 2, '#000000');
    px(5, 10, 22, 10, '#000000');
    px(7, 10, 18, 10, '#FFFFFF');
    px(7, 18, 18, 2, '#E5E5E5');
    px(7, 20, 18, 2, '#000000');

    const earColor = isWorking ? '#8E63F7' : '#E5E5E5';
    px(3, 12, 2, 6, '#000000');
    px(4, 13, 2, 4, earColor);
    px(27, 12, 2, 6, '#000000');
    px(26, 13, 2, 4, earColor);

    px(8, 12, 16, 6, '#000000');
    if (isSleeping) {
      px(10, 15, 3, 1, '#FFFFFF');
      px(19, 15, 3, 1, '#FFFFFF');
    } else {
      px(11, 14, 2, 3, '#FFFFFF');
      px(19, 14, 2, 3, '#FFFFFF');
    }

    px(9, 22, 14, 6, '#000000');
    px(11, 22, 10, 5, '#FFFFFF');
    px(14, 23, 4, 3, '#000000');
    px(15, 24, 2, 1, '#E5E5E5');

    px(7, 23, 2, 4, '#000000');
    px(8, 23, 2, 3, '#FFFFFF');
    px(23, 23, 2, 4, '#000000');
    px(22, 23, 2, 3, '#FFFFFF');

    const legStep = isWalking ? (Math.floor(time * 12) % 2) : 0;
    px(11, 28, 4, 2 + legStep, '#000000');
    px(17, 28, 4, 2 + (1 - legStep), '#000000');

    if (isCarrying || status === 'handoff' || status === 'waiting_ceo') {
      px(23, 18, 7, 8, '#000000');
      px(24, 19, 5, 6, '#4ADE80');
      px(25, 21, 3, 2, '#FFFFFF');
    }

    ctx.restore();

    if (isSleeping) {
      this.drawSleepZzz(ctx, bx, cy - 20, '#3B82F6', time);
    }
  },

  // 4. GEMINI / ANTIGRAVITY：图二第4列 (#4285F4, #8E63F7, #D946EF, #FFEA75)
  drawAntigravityStar(ctx, bx, by, agent, time) {
    const { status, isWalking, isCarrying } = agent;
    const isSleeping = (status === 'sleeping');
    const isWorking = (status === 'working');

    const floatY = isSleeping ? 3 : Math.round(Math.sin(time * 5) * 3 - 2);
    const cy = Math.round(by - 14 + floatY);

    ctx.save();
    const p = 2;
    const ox = Math.round(bx - 16 * p);
    const oy = Math.round(cy - 15 * p);
    const px = (gx, gy, gw, gh, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(ox + gx * p, oy + gy * p, gw * p, gh * p);
    };

    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(bx, by + 8, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    px(15, 2, 2, 3, '#000000');
    px(13, 5, 2, 3, '#000000');
    px(17, 5, 2, 3, '#000000');
    px(11, 8, 2, 3, '#000000');
    px(19, 8, 2, 3, '#000000');
    px(8, 11, 3, 2, '#000000');
    px(21, 11, 3, 2, '#000000');
    px(5, 13, 3, 2, '#000000');
    px(24, 13, 3, 2, '#000000');
    px(2, 15, 3, 2, '#000000');
    px(27, 15, 3, 2, '#000000');
    px(5, 17, 3, 2, '#000000');
    px(24, 17, 3, 2, '#000000');
    px(8, 19, 3, 2, '#000000');
    px(21, 19, 3, 2, '#000000');
    px(11, 21, 2, 3, '#000000');
    px(19, 21, 2, 3, '#000000');
    px(13, 24, 2, 3, '#000000');
    px(17, 24, 2, 3, '#000000');
    px(15, 27, 2, 3, '#000000');

    px(11, 11, 10, 10, '#FFFFFF');

    px(15, 5, 2, 3, '#D946EF');
    px(13, 8, 6, 3, '#C084FC');
    px(24, 15, 3, 2, '#FBBF24');
    px(21, 13, 3, 6, '#FFEA75');
    px(15, 24, 2, 3, '#4285F4');
    px(13, 21, 6, 3, '#60A5FA');
    px(5, 15, 3, 2, '#8E63F7');
    px(8, 13, 3, 6, '#A5B4FC');

    if (isSleeping) {
      px(11, 16, 3, 1, '#000000');
      px(18, 16, 3, 1, '#000000');
    } else {
      px(12, 14, 2, 4, '#000000');
      px(18, 14, 2, 4, '#000000');
    }

    if (!isSleeping && isWorking) {
      px(23, 4, 2, 4, '#FBBF24');
      px(22, 5, 4, 2, '#FFEA75');
    }

    if (isCarrying || status === 'handoff' || status === 'waiting_ceo') {
      px(22, 18, 7, 8, '#000000');
      px(23, 19, 5, 6, '#F59E0B');
      px(24, 21, 3, 2, '#FFFFFF');
    }

    ctx.restore();

    if (isSleeping) {
      this.drawSleepZzz(ctx, bx, cy - 20, '#4285F4', time);
    }
  },

  drawSleepZzz(ctx, x, y, color, time) {
    ctx.save();
    const phase = (time * 1.4) % 3;
    ctx.fillStyle = color;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    if (phase > 0.3) {
      const zx1 = x + 10 + phase * 4;
      const zy1 = y - phase * 6;
      ctx.strokeText('z', zx1, zy1);
      ctx.fillText('z', zx1, zy1);
    }
    if (phase > 1.1) {
      const zx2 = x + 18 + phase * 5;
      const zy2 = y - 8 - phase * 8;
      ctx.font = 'bold 16px "JetBrains Mono", monospace';
      ctx.strokeText('Z', zx2, zy2);
      ctx.fillText('Z', zx2, zy2);
    }
    ctx.restore();
  },

  drawCoinBurst(ctx, x, y, agent, time) {
    if (!agent.coinBurstUntil || time > agent.coinBurstUntil) return;

    ctx.save();
    for (let i = 0; i < 3; i++) {
      const localP = ((time * 2.2) + i * 0.35) % 1;
      const coinX = x + (i - 1) * 16 + Math.sin(time * 8 + i) * 3;
      const coinY = y - 30 - localP * 28;
      const scaleX = Math.abs(Math.cos(time * 9 + i));

      ctx.save();
      ctx.translate(coinX, coinY);
      ctx.scale(Math.max(0.25, scaleX), 1);
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#FACC15';
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#78350F';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('¥', 0, 0.5);
      ctx.restore();
    }

    const bannerY = y - 60 - Math.sin(time * 6) * 3;
    this.roundRect(ctx, x - 62, bannerY - 10, 124, 18, 9, '#FACC15', '#000000', 1.5);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 10px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(window.t('🪙 额度恢复!', '🪙 Quota Restored!'), x, bannerY - 1);

    ctx.restore();
  },

  drawAgent(ctx, x, y, agent, time = 0) {
    ctx.save();
    const bx = Math.round(x);
    const by = Math.round(y);

    if (agent.deptId === 'deepseek') {
      this.drawDeepSeekWhale(ctx, bx, by, agent, time);
    } else if (agent.deptId === 'claude') {
      this.drawClaudeling(ctx, bx, by, agent, time);
    } else if (agent.deptId === 'openai') {
      this.drawChatGPTButler(ctx, bx, by, agent, time);
    } else {
      this.drawAntigravityStar(ctx, bx, by, agent, time);
    }

    const labelText = agent.name.length > 16 ? agent.name.slice(0, 15) + '…' : agent.name;
    ctx.font = 'bold 10px "Noto Sans SC", sans-serif';
    const textW = Math.min(136, ctx.measureText(labelText).width + 12);
    this.roundRect(ctx, bx - textW / 2, by + 13, textW, 15, 4, 'rgba(15, 23, 42, 0.9)', agent.color, 1);
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, bx, by + 20.5);

    this.drawAgentBubble(ctx, bx, by - 34, agent, time);
    this.drawCoinBurst(ctx, bx, by, agent, time);

    ctx.restore();
  },

  drawAgentBubble(ctx, x, y, agent, time) {
    if (agent.status === 'sleeping') return;
    if (!agent.bubble && agent.status !== 'waiting_ceo') return;
    // 在工位正常打字办公时，电脑屏幕已有发光与品牌动效，不再用大白框遮挡身后电脑屏幕
    if (agent.status === 'working' && !agent.isWalking && !agent.ceoReqId) return;

    ctx.save();
    const isCEO = (agent.status === 'waiting_ceo');
    const text = isCEO ? window.t('📋 点击处理', '📋 Click to Open') : (agent.bubbleIcon || '☕');
    ctx.font = isCEO ? 'bold 10px "Noto Sans SC", sans-serif' : '11px sans-serif';
    const bw = isCEO ? 98 : 22;
    const bh = 18;
    // 普通气泡向右上角偏移，避免遮挡角色头顶或身后装饰文字
    const bx = isCEO ? (x - bw / 2) : (x + 12);
    const by = y - 6 + Math.sin(time * 5) * 2;

    this.roundRect(ctx, bx, by, bw, bh, 5, isCEO ? '#FEF08A' : 'rgba(255, 255, 255, 0.92)', '#000000', 1.5);
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + bw / 2, by + bh / 2);
    ctx.restore();
  },

  drawCeilingLamp(ctx, x, y, isOn, lightColor = '#fef08a') {
    this.pixelRect(ctx, x + 11, y - 3, 2, 4, '#475569');
    this.roundRect(ctx, x, y, 24, 7, 3, '#334155', '#1e293b', 1.5);
    if (isOn) {
      this.pixelRect(ctx, x + 3, y + 5, 18, 3, lightColor);
    } else {
      this.pixelRect(ctx, x + 3, y + 5, 18, 3, '#1f2430');
    }
  },

  drawZoneDarkness(ctx, x, y, w, h, opacity = 0.42) {
    ctx.save();
    ctx.fillStyle = `rgba(8, 12, 26, ${opacity})`;
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = 'rgba(244, 63, 94, 0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }
};

window.Sprites = Sprites;

/**
 * 深渊地牢 - 游戏客户端
 * Abyss Dungeon - Game Client
 */

// ============================================================
// 全局状态 Global State
// ============================================================
const state = {
  connected: false,
  playerId: null,
  players: [],
  monsters: [],
  projectiles: [],
  lootDrops: [],
  dungeon: null,
  classes: null,
  selectedClass: null,
  camera: { x: 0, y: 0 },
  input: { up: false, down: false, left: false, right: false, attack: false, skill: -1, mouseX: 0, mouseY: 0 },
  inventoryOpen: false,
  leaderboardOpen: false,
  chatFocused: false,
  ws: null,
  tileSize: 32,
  localPlayer: null,
};

// ============================================================
// DOM 元素 DOM Elements
// ============================================================
const $ = (id) => document.getElementById(id);

// ============================================================
// 登录界面 Login Screen
// ============================================================
function initLogin() {
  const classCards = document.querySelectorAll('.class-card');
  const startBtn = $('startBtn');
  const nameInput = $('playerName');

  classCards.forEach(card => {
    card.addEventListener('click', () => {
      classCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.selectedClass = card.dataset.class;
      checkReady();
    });
  });

  nameInput.addEventListener('input', checkReady);
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !startBtn.disabled) startGame();
  });

  function checkReady() {
    startBtn.disabled = !(nameInput.value.trim() && state.selectedClass);
  }

  startBtn.addEventListener('click', startGame);
}

function startGame() {
  const name = $('playerName').value.trim();
  if (!name || !state.selectedClass) return;

  // 切换到游戏界面
  $('loginScreen').classList.remove('active');
  $('gameScreen').classList.add('active');

  // 初始化游戏
  initCanvas();
  connectWebSocket(name, state.selectedClass);
  initInputHandlers();
}

// ============================================================
// 画布初始化 Canvas Init
// ============================================================
let canvas, ctx, minimapCanvas, minimapCtx;

function initCanvas() {
  canvas = $('gameCanvas');
  ctx = canvas.getContext('2d');
  minimapCanvas = $('minimapCanvas');
  minimapCtx = minimapCanvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();
}

// ============================================================
// WebSocket 连接 WebSocket Connection
// ============================================================
function connectWebSocket(name, classId) {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${location.host}`);

  ws.onopen = () => {
    state.connected = true;
    ws.send(JSON.stringify({ type: 'join', name, classId }));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    handleMessage(msg);
  };

  ws.onclose = () => {
    state.connected = false;
    console.log('连接断开');
  };

  ws.onerror = (err) => {
    console.error('WebSocket error:', err);
  };

  state.ws = ws;
}

function handleMessage(msg) {
  switch (msg.type) {
    case 'welcome':
      state.playerId = msg.playerId;
      state.dungeon = msg.dungeon;
      state.classes = msg.classes;
      setupSkillIcons();
      break;

    case 'snapshot':
      state.players = msg.data.players;
      state.monsters = msg.data.monsters;
      state.projectiles = msg.data.projectiles;
      state.lootDrops = msg.data.loot;
      state.localPlayer = state.players.find(p => p.id === state.playerId);
      updateHUD();
      updateInventoryUI();
      updateLeaderboard();
      break;

    case 'chat':
      addChatMessage(msg.text, msg.msgType, msg.color);
      break;
  }
}

// ============================================================
// 输入处理 Input Handling
// ============================================================
function initInputHandlers() {
  document.addEventListener('keydown', (e) => {
    if (state.chatFocused) return;

    switch (e.key.toLowerCase()) {
      case 'w': case 'arrowup': state.input.up = true; break;
      case 's': case 'arrowdown': state.input.down = true; break;
      case 'a': case 'arrowleft': state.input.left = true; break;
      case 'd': case 'arrowright': state.input.right = true; break;
      case 'q': state.input.skill = 0; break;
      case 'e': state.input.skill = 1; break;
      case 'r': usePotion(); break;
      case 'i': toggleInventory(); break;
      case 'tab':
        e.preventDefault();
        toggleLeaderboard();
        break;
      case 'enter':
        e.preventDefault();
        toggleChat();
        break;
    }
    sendInput();
  });

  document.addEventListener('keyup', (e) => {
    switch (e.key.toLowerCase()) {
      case 'w': case 'arrowup': state.input.up = false; break;
      case 's': case 'arrowdown': state.input.down = false; break;
      case 'a': case 'arrowleft': state.input.left = false; break;
      case 'd': case 'arrowright': state.input.right = false; break;
    }
    sendInput();
  });

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      state.input.attack = true;
      sendInput();
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
      state.input.attack = false;
      sendInput();
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    state.input.mouseX = e.clientX + state.camera.x;
    state.input.mouseY = e.clientY + state.camera.y;
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // 技能栏点击
  for (let i = 0; i < 3; i++) {
    const el = $('skill' + (i + 1));
    if (el) {
      el.addEventListener('click', () => {
        state.input.skill = i;
        sendInput();
      });
    }
  }

  // 药水槽点击
  $('potionSlot')?.addEventListener('click', usePotion);
}

function sendInput() {
  if (state.ws?.readyState === 1) {
    state.ws.send(JSON.stringify({ type: 'input', input: state.input }));
  }
}

// ============================================================
// 药水使用 Potion Usage
// ============================================================
function usePotion() {
  if (!state.localPlayer) return;
  const potionIdx = state.localPlayer.inventory?.findIndex(i => i.type === 'potion');
  if (potionIdx >= 0) {
    state.ws?.send(JSON.stringify({ type: 'useItem', index: potionIdx }));
  }
}

// ============================================================
// 聊天 Chat
// ============================================================
function toggleChat() {
  const input = $('chatInput');
  if (state.chatFocused) {
    if (input.value.trim()) {
      state.ws?.send(JSON.stringify({ type: 'chat', text: input.value.trim() }));
    }
    input.value = '';
    input.blur();
    state.chatFocused = false;
  } else {
    input.focus();
    state.chatFocused = true;
  }
}

$('chatInput')?.addEventListener('focus', () => { state.chatFocused = true; });
$('chatInput')?.addEventListener('blur', () => { state.chatFocused = false; });
$('chatInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    toggleChat();
  }
  if (e.key === 'Escape') {
    $('chatInput').value = '';
    $('chatInput').blur();
    state.chatFocused = false;
  }
});

function addChatMessage(text, type, color) {
  const container = $('chatMessages');
  const div = document.createElement('div');
  div.className = `chat-msg ${type}`;
  div.textContent = text;
  if (color) div.style.color = color;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;

  // 限制消息数量
  while (container.children.length > 50) {
    container.removeChild(container.firstChild);
  }
}

// ============================================================
// 背包 Inventory
// ============================================================
function toggleInventory() {
  state.inventoryOpen = !state.inventoryOpen;
  $('inventoryPanel').classList.toggle('open', state.inventoryOpen);
}

$('closeInventory')?.addEventListener('click', () => {
  state.inventoryOpen = false;
  $('inventoryPanel').classList.remove('open');
});

function updateInventoryUI() {
  const player = state.localPlayer;
  if (!player) return;

  // 更新装备显示
  const equipMap = { weapon: 'equipWeapon', armor: 'equipArmor', accessory: 'equipAccessory' };
  for (const [slot, elId] of Object.entries(equipMap)) {
    const el = $(elId);
    if (!el) continue;
    const item = player.equipment?.[slot];
    el.querySelector('.equip-item').textContent = item ? item.name : '-';
    el.style.borderColor = item ? (item.rarityColor || '#2a2520') : '#2a2520';
  }

  // 更新背包格子
  const grid = $('inventoryGrid');
  if (!grid) return;

  grid.innerHTML = '';
  const items = player.inventory || [];
  for (let i = 0; i < Math.max(16, items.length); i++) {
    const slot = document.createElement('div');
    slot.className = 'inv-slot';

    if (i < items.length) {
      const item = items[i];
      const icons = { weapon: '⚔️', armor: '🛡️', potion: '🧪', accessory: '💎' };
      slot.innerHTML = `
        <span class="item-icon">${icons[item.type] || '📦'}</span>
        <span class="item-name" style="color:${item.rarityColor || '#a09880'}">${item.name}</span>
        ${item.count > 1 ? `<span class="item-count">x${item.count}</span>` : ''}
      `;
      slot.style.borderColor = item.rarityColor || '#2a2520';

      // 点击装备/使用
      slot.addEventListener('click', () => {
        if (item.type === 'potion') {
          state.ws?.send(JSON.stringify({ type: 'useItem', index: i }));
        } else if (['weapon', 'armor', 'accessory'].includes(item.type)) {
          state.ws?.send(JSON.stringify({ type: 'equip', index: i }));
        }
      });
    }

    grid.appendChild(slot);
  }
}

// ============================================================
// 排行榜 Leaderboard
// ============================================================
function toggleLeaderboard() {
  state.leaderboardOpen = !state.leaderboardOpen;
  $('leaderboard').classList.toggle('open', state.leaderboardOpen);
}

function updateLeaderboard() {
  const list = $('leaderboardList');
  if (!list || !state.leaderboardOpen) return;

  const sorted = [...state.players].sort((a, b) => b.kills - a.kills);
  list.innerHTML = sorted.map((p, i) => {
    const rankClass = i < 3 ? `top-${i + 1}` : '';
    return `<div class="lb-entry">
      <span class="lb-rank ${rankClass}">${i + 1}</span>
      <span class="lb-name" style="color:${p.color}">${p.name}</span>
      <span class="lb-class">${p.className}</span>
      <span class="lb-kills">${p.kills}杀</span>
    </div>`;
  }).join('');
}

// ============================================================
// HUD 更新 HUD Update
// ============================================================
function setupSkillIcons() {
  const player = state.localPlayer;
  if (!player || !state.classes) return;

  const cls = state.classes[player.classId];
  if (!cls) return;

  const icons = {
    warrior: ['⚔️', '🛡️', '📢'],
    mage: ['🔮', '🧊', '⚡'],
    archer: ['🏹', '🎯', '🪤'],
    priest: ['✨', '✝️', '🛡️'],
  };

  const classIcons = icons[player.classId] || ['⚔️', '🔥', '❄️'];
  for (let i = 0; i < 3; i++) {
    const el = $('skill' + (i + 1));
    if (el) el.querySelector('.skill-icon').textContent = classIcons[i];
  }

  // 设置头像
  const portraitIcons = { warrior: '⚔️', mage: '🔮', archer: '🏹', priest: '✨' };
  $('playerPortrait').textContent = portraitIcons[player.classId] || '⚔️';
}

function updateHUD() {
  const player = state.localPlayer;
  if (!player) return;

  // 更新名字和等级
  $('hudName').textContent = player.name;
  $('hudLevel').textContent = player.level;

  // 更新状态条
  const hpPct = (player.hp / player.maxHp * 100).toFixed(1);
  const mpPct = (player.mp / player.maxMp * 100).toFixed(1);
  const xpPct = (player.xp / player.xpToNext * 100).toFixed(1);

  $('hpFill').style.width = hpPct + '%';
  $('mpFill').style.width = mpPct + '%';
  $('xpFill').style.width = xpPct + '%';

  $('hpText').textContent = `${Math.floor(player.hp)}/${player.maxHp}`;
  $('mpText').textContent = `${Math.floor(player.mp)}/${player.maxMp}`;
  $('xpText').textContent = `${player.xp}/${player.xpToNext}`;

  // 金币
  $('goldAmount').textContent = player.gold;

  // 技能冷却
  if (player.skills) {
    for (let i = 0; i < player.skills.length && i < 4; i++) {
      const skill = player.skills[i];
      const cdEl = $('cd' + i);
      if (cdEl) {
        if (skill.currentCooldown > 0) {
          cdEl.classList.add('active');
          cdEl.textContent = skill.currentCooldown.toFixed(1);
        } else {
          cdEl.classList.remove('active');
          cdEl.textContent = '';
        }
      }
    }
  }

  // 药水数量
  const potion = player.inventory?.find(i => i.type === 'potion');
  $('potionCount').textContent = potion ? potion.count : 0;

  // 死亡覆盖
  const deathOverlay = $('deathOverlay');
  if (!player.alive) {
    deathOverlay.classList.add('active');
    $('respawnTimer').textContent = Math.ceil(player.respawnTimer);
  } else {
    deathOverlay.classList.remove('active');
  }

  // 相机跟随
  state.camera.x = player.x - canvas.width / 2;
  state.camera.y = player.y - canvas.height / 2;
}

// ============================================================
// 游戏渲染 Game Rendering
// ============================================================
function render() {
  if (!state.dungeon || !state.localPlayer) {
    requestAnimationFrame(render);
    return;
  }

  const { width, height } = canvas;
  const ts = state.tileSize;
  const cam = state.camera;

  // 清屏
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, width, height);

  // 计算可见范围
  const startCol = Math.max(0, Math.floor(cam.x / ts));
  const endCol = Math.min(state.dungeon.width, Math.ceil((cam.x + width) / ts) + 1);
  const startRow = Math.max(0, Math.floor(cam.y / ts));
  const endRow = Math.min(state.dungeon.height, Math.ceil((cam.y + height) / ts) + 1);

  // 绘制地牢 Draw dungeon
  for (let row = startRow; row < endRow; row++) {
    for (let col = startCol; col < endCol; col++) {
      const tile = state.dungeon.tiles[row]?.[col];
      const x = col * ts - cam.x;
      const y = row * ts - cam.y;

      if (tile === 1) {
        // 地板
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(x, y, ts, ts);
        // 地板纹理
        ctx.fillStyle = '#16162a';
        if ((row + col) % 2 === 0) ctx.fillRect(x + 2, y + 2, ts - 4, ts - 4);
        // 地板边线
        ctx.strokeStyle = '#121224';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, ts, ts);
      } else {
        // 墙壁
        ctx.fillStyle = '#2a2520';
        ctx.fillRect(x, y, ts, ts);
        // 墙壁纹理
        ctx.fillStyle = '#231f1a';
        ctx.fillRect(x + 1, y + 1, ts - 2, ts - 2);
        // 墙壁高光
        ctx.fillStyle = '#332e28';
        ctx.fillRect(x, y, ts, 2);
        ctx.fillRect(x, y, 2, ts);
      }
    }
  }

  // 绘制掉落物 Draw loot
  for (const loot of state.lootDrops) {
    const x = loot.x - cam.x;
    const y = loot.y - cam.y;
    const icons = { weapon: '⚔️', armor: '🛡️', potion: '🧪', accessory: '💎', gold: '💰' };

    // 发光效果
    ctx.save();
    ctx.shadowColor = loot.rarityColor || '#d4a843';
    ctx.shadowBlur = 8;
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icons[loot.type] || '📦', x, y + Math.sin(Date.now() / 500) * 3);
    ctx.restore();
  }

  // 绘制陷阱 Draw traps
  for (const proj of state.projectiles) {
    if (proj.isTrap) {
      const x = proj.x - cam.x;
      const y = proj.y - cam.y;
      ctx.save();
      ctx.fillStyle = 'rgba(46, 204, 113, 0.3)';
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }

  // 绘制投射物 Draw projectiles
  for (const proj of state.projectiles) {
    if (proj.isTrap) continue;
    const x = proj.x - cam.x;
    const y = proj.y - cam.y;

    ctx.save();
    ctx.fillStyle = proj.color || '#f0c75e';
    ctx.shadowColor = proj.color || '#f0c75e';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 绘制怪物 Draw monsters
  for (const monster of state.monsters) {
    const x = monster.x - cam.x;
    const y = monster.y - cam.y;

    ctx.save();

    // 怪物本体
    ctx.fillStyle = monster.color;
    if (monster.isBoss) {
      ctx.shadowColor = '#e67e22';
      ctx.shadowBlur = 15;
    }
    ctx.beginPath();
    ctx.arc(x, y, monster.size, 0, Math.PI * 2);
    ctx.fill();

    // 怪物眼睛
    ctx.fillStyle = '#fff';
    const eyeSize = monster.size * 0.25;
    ctx.beginPath();
    ctx.arc(x - monster.size * 0.3, y - monster.size * 0.2, eyeSize, 0, Math.PI * 2);
    ctx.arc(x + monster.size * 0.3, y - monster.size * 0.2, eyeSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x - monster.size * 0.25, y - monster.size * 0.2, eyeSize * 0.5, 0, Math.PI * 2);
    ctx.arc(x + monster.size * 0.25, y - monster.size * 0.2, eyeSize * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // 血条
    if (monster.hp < monster.maxHp) {
      const barW = monster.size * 2;
      const barH = 4;
      const barX = x - barW / 2;
      const barY = y - monster.size - 8;

      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = monster.isBoss ? '#e67e22' : '#c0392b';
      ctx.fillRect(barX, barY, barW * (monster.hp / monster.maxHp), barH);
      ctx.strokeStyle = '#2a2520';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(barX, barY, barW, barH);
    }

    // 怪物名字
    ctx.font = '10px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = monster.isBoss ? '#e67e22' : '#a09880';
    ctx.fillText(monster.name, x, y + monster.size + 14);

    ctx.restore();
  }

  // 绘制玩家 Draw players
  for (const player of state.players) {
    if (!player.alive) continue;
    const x = player.x - cam.x;
    const y = player.y - cam.y;

    ctx.save();

    // 玩家光环（本地玩家）
    if (player.id === state.playerId) {
      ctx.strokeStyle = player.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 800) * 0.1;
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // 护盾效果
    if (player.shield > 0) {
      ctx.strokeStyle = 'rgba(52, 152, 219, 0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Buff效果
    if (player.buffs?.length > 0) {
      ctx.strokeStyle = 'rgba(212, 168, 67, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(x, y, 18, Date.now() / 500, Date.now() / 500 + Math.PI * 1.5);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 玩家身体
    ctx.fillStyle = player.color;
    ctx.shadowColor = player.color;
    ctx.shadowBlur = player.id === state.playerId ? 8 : 4;
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fill();

    // 玩家方向指示器
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    const dirX = x + (player.direction?.x || 0) * 18;
    const dirY = y + (player.direction?.y || 0) * 18;
    ctx.beginPath();
    ctx.arc(dirX, dirY, 3, 0, Math.PI * 2);
    ctx.fill();

    // 玩家名字
    ctx.font = '11px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = player.id === state.playerId ? '#f5e6c8' : '#a09880';
    ctx.fillText(player.name, x, y - 22);

    // 玩家等级
    ctx.font = '9px "Noto Sans SC", sans-serif';
    ctx.fillStyle = '#d4a843';
    ctx.fillText(`Lv.${player.level}`, x, y + 24);

    // 血条（其他玩家）
    if (player.id !== state.playerId) {
      const barW = 28;
      const barH = 3;
      const barX = x - barW / 2;
      const barY = y - 18;

      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(barX, barY, barW * (player.hp / player.maxHp), barH);
    }

    ctx.restore();
  }

  // 绘制迷雾边缘 Draw fog edges
  drawFogOfWar(cam, width, height);

  // 绘制小地图
  drawMinimap();

  requestAnimationFrame(render);
}

function drawFogOfWar(cam, width, height) {
  // 在可见区域边缘添加渐变雾气
  const fogSize = 60;

  // 上方
  let gradient = ctx.createLinearGradient(0, 0, 0, fogSize);
  gradient.addColorStop(0, '#0a0a0f');
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, fogSize);

  // 下方
  gradient = ctx.createLinearGradient(0, height - fogSize, 0, height);
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(1, '#0a0a0f');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, height - fogSize, width, fogSize);

  // 左侧
  gradient = ctx.createLinearGradient(0, 0, fogSize, 0);
  gradient.addColorStop(0, '#0a0a0f');
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, fogSize, height);

  // 右侧
  gradient = ctx.createLinearGradient(width - fogSize, 0, width, 0);
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(1, '#0a0a0f');
  ctx.fillStyle = gradient;
  ctx.fillRect(width - fogSize, 0, fogSize, height);
}

// ============================================================
// 小地图 Minimap
// ============================================================
function drawMinimap() {
  if (!state.dungeon) return;

  const mw = minimapCanvas.width;
  const mh = minimapCanvas.height;
  const dw = state.dungeon.width;
  const dh = state.dungeon.height;
  const sx = mw / dw;
  const sy = mh / dh;

  minimapCtx.fillStyle = '#0a0a0f';
  minimapCtx.fillRect(0, 0, mw, mh);

  // 绘制地牢布局
  for (let row = 0; row < dh; row++) {
    for (let col = 0; col < dw; col++) {
      if (state.dungeon.tiles[row]?.[col] === 1) {
        minimapCtx.fillStyle = '#1a1a2e';
        minimapCtx.fillRect(col * sx, row * sy, sx + 0.5, sy + 0.5);
      }
    }
  }

  // 绘制怪物（红点）
  for (const monster of state.monsters) {
    minimapCtx.fillStyle = monster.isBoss ? '#e67e22' : '#c0392b';
    const size = monster.isBoss ? 3 : 1.5;
    minimapCtx.fillRect(
      (monster.x / state.tileSize) * sx - size / 2,
      (monster.y / state.tileSize) * sy - size / 2,
      size, size
    );
  }

  // 绘制玩家
  for (const player of state.players) {
    if (!player.alive) continue;
    minimapCtx.fillStyle = player.id === state.playerId ? '#f0c75e' : player.color;
    const size = player.id === state.playerId ? 4 : 2;
    minimapCtx.fillRect(
      (player.x / state.tileSize) * sx - size / 2,
      (player.y / state.tileSize) * sy - size / 2,
      size, size
    );
  }

  // 绘制掉落物
  for (const loot of state.lootDrops) {
    minimapCtx.fillStyle = loot.rarityColor || '#d4a843';
    minimapCtx.fillRect(
      (loot.x / state.tileSize) * sx - 1,
      (loot.y / state.tileSize) * sy - 1,
      2, 2
    );
  }

  // 绘制相机视野范围
  minimapCtx.strokeStyle = 'rgba(212, 168, 67, 0.3)';
  minimapCtx.lineWidth = 1;
  minimapCtx.strokeRect(
    (state.camera.x / state.tileSize) * sx,
    (state.camera.y / state.tileSize) * sy,
    (canvas.width / state.tileSize) * sx,
    (canvas.height / state.tileSize) * sy
  );
}

// ============================================================
// 游戏循环 Game Loop
// ============================================================
function gameLoop() {
  // 定期发送输入
  sendInput();
  requestAnimationFrame(gameLoop);
}

// ============================================================
// 启动 Init
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initLogin();
  render();
  gameLoop();
});

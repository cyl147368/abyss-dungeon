/**
 * ============================================================
 * 深渊地牢 - 游戏客户端 v2.0
 * Abyss Dungeon - Game Client v2.0
 * ============================================================
 * 
 * @author Abyss Dungeon Team
 * @version 2.0.0
 * @license MIT
 * ============================================================
 */

// ============================================================
// 全局配置 Global Configuration
// ============================================================
const CLIENT_CONFIG = {
  // 画布配置
  CANVAS: {
    BG_COLOR: "#0a0a0f",
    FOG_SIZE: 60,
  },
  
  // 游戏配置
  GAME: {
    TILE_SIZE: 32,
    PLAYER_RADIUS: 14,
    MONSTER_HITBOX: 8,
    PROJECTILE_HITBOX: 4,
    LOOT_PICKUP_RANGE: 30,
  },
  
  // UI配置
  UI: {
    MINIMAP_WIDTH: 180,
    MINIMAP_HEIGHT: 140,
    CHAT_MAX_MESSAGES: 50,
    TOAST_DURATION: 2000,
  },
  
  // 网络配置
  NETWORK: {
    RECONNECT_DELAY: 3000,
    MAX_RECONNECT_ATTEMPTS: 5,
    INPUT_SEND_RATE: 50, // ms
  },
};

// ============================================================
// 游戏状态 Game State
// ============================================================
const gameState = {
  // 连接状态
  connected: false,
  reconnectAttempts: 0,
  
  // 玩家数据
  playerId: null,
  localPlayer: null,
  players: [],
  
  // 游戏世界
  dungeon: null,
  monsters: [],
  projectiles: [],
  lootDrops: [],
  
  // 职业数据
  classes: null,
  selectedClass: null,
  
  // 相机
  camera: { x: 0, y: 0 },
  
  // 输入状态
  input: {
    up: false,
    down: false,
    left: false,
    right: false,
    attack: false,
    skill: -1,
    mouseX: 0,
    mouseY: 0,
  },
  
  // UI状态
  inventoryOpen: false,
  leaderboardOpen: false,
  chatFocused: false,
  
  // WebSocket
  ws: null,
  
  // 性能监控
  fps: 0,
  frameCount: 0,
  lastFpsUpdate: Date.now(),
};

// ============================================================
// DOM 工具函数 DOM Utilities
// ============================================================
const $ = (selector) => document.getElementById(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// ============================================================
// 登录界面 Login Screen
// ============================================================

/**
 * 初始化登录界面
 */
function initLoginScreen() {
  const classCards = $$('.class-card');
  const startBtn = $('startBtn');
  const nameInput = $('playerName');

  // 职业选择事件
  classCards.forEach(card => {
    card.addEventListener('click', () => {
      classCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      gameState.selectedClass = card.dataset.class;
      validateLoginForm();
    });
  });

  // 名字输入事件
  nameInput.addEventListener('input', validateLoginForm);
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !startBtn.disabled) {
      startGame();
    }
  });

  // 开始按钮事件
  startBtn.addEventListener('click', startGame);

  // 自动聚焦名字输入框
  nameInput.focus();
}

/**
 * 验证登录表单
 */
function validateLoginForm() {
  const nameInput = $('playerName');
  const startBtn = $('startBtn');
  const isValid = nameInput.value.trim().length > 0 && gameState.selectedClass;
  startBtn.disabled = !isValid;
}

/**
 * 开始游戏
 */
function startGame() {
  const name = $('playerName').value.trim();
  if (!name || !gameState.selectedClass) return;

  // 切换到游戏界面
  $('loginScreen').classList.remove('active');
  $('gameScreen').classList.add('active');

  // 初始化游戏系统
  initCanvas();
  initInputHandlers();
  connectToServer(name, gameState.selectedClass);
  
  // 启动渲染循环
  requestAnimationFrame(renderLoop);
  
  // 启动输入发送循环
  setInterval(sendInput, CLIENT_CONFIG.NETWORK.INPUT_SEND_RATE);
}

// ============================================================
// 画布初始化 Canvas Initialization
// ============================================================
let canvas, ctx, minimapCanvas, minimapCtx;

/**
 * 初始化游戏画布
 */
function initCanvas() {
  canvas = $('gameCanvas');
  ctx = canvas.getContext('2d');
  minimapCanvas = $('minimapCanvas');
  minimapCtx = minimapCanvas.getContext('2d');

  // 设置画布尺寸
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // 禁用右键菜单
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ============================================================
// 网络连接 Network Connection
// ============================================================

/**
 * 连接到游戏服务器
 * @param {string} name - 玩家名字
 * @param {string} classId - 职业ID
 */
function connectToServer(name, classId) {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${location.host}`;

  console.log(`连接到服务器: ${wsUrl}`);
  gameState.ws = new WebSocket(wsUrl);

  // 连接成功
  gameState.ws.onopen = () => {
    gameState.connected = true;
    gameState.reconnectAttempts = 0;
    console.log('已连接到服务器');
    
    // 发送加入请求
    gameState.ws.send(JSON.stringify({
      type: 'join',
      name,
      classId,
    }));
  };

  // 接收消息
  gameState.ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleServerMessage(msg);
    } catch (e) {
      console.error('解析消息失败:', e);
    }
  };

  // 连接关闭
  gameState.ws.onclose = (event) => {
    gameState.connected = false;
    console.log('连接断开:', event.code, event.reason);
    
    // 尝试重连
    if (gameState.reconnectAttempts < CLIENT_CONFIG.NETWORK.MAX_RECONNECT_ATTEMPTS) {
      gameState.reconnectAttempts++;
      console.log(`尝试重连 (${gameState.reconnectAttempts}/${CLIENT_CONFIG.NETWORK.MAX_RECONNECT_ATTEMPTS})...`);
      setTimeout(() => connectToServer(name, classId), CLIENT_CONFIG.NETWORK.RECONNECT_DELAY);
    }
  };

  // 连接错误
  gameState.ws.onerror = (error) => {
    console.error('WebSocket错误:', error);
  };
}

/**
 * 处理服务器消息
 * @param {Object} msg - 消息对象
 */
function handleServerMessage(msg) {
  switch (msg.type) {
    case 'welcome':
      handleWelcome(msg);
      break;

    case 'snapshot':
      handleSnapshot(msg.data);
      break;

    case 'chat':
      handleChatMessage(msg);
      break;

    default:
      console.warn('未知消息类型:', msg.type);
  }
}

/**
 * 处理欢迎消息
 * @param {Object} msg - 欢迎消息
 */
function handleWelcome(msg) {
  gameState.playerId = msg.playerId;
  gameState.dungeon = msg.dungeon;
  gameState.classes = msg.classes;
  
  console.log('欢迎加入游戏! 玩家ID:', msg.playerId);
  
  // 设置技能图标
  setupSkillIcons();
}

/**
 * 处理状态快照
 * @param {Object} data - 快照数据
 */
function handleSnapshot(data) {
  gameState.players = data.players;
  gameState.monsters = data.monsters;
  gameState.projectiles = data.projectiles;
  gameState.lootDrops = data.loot;
  
  // 更新本地玩家引用
  gameState.localPlayer = gameState.players.find(p => p.id === gameState.playerId);
  
  // 更新UI
  updateHUD();
  updateInventoryUI();
  updateLeaderboard();
}

/**
 * 处理聊天消息
 * @param {Object} msg - 聊天消息
 */
function handleChatMessage(msg) {
  addChatMessage(msg.text, msg.msgType, msg.color);
}

// ============================================================
// 输入处理 Input Handling
// ============================================================

/**
 * 初始化输入处理器
 */
function initInputHandlers() {
  // 键盘按下
  document.addEventListener('keydown', handleKeyDown);
  
  // 键盘释放
  document.addEventListener('keyup', handleKeyUp);
  
  // 鼠标按下
  canvas.addEventListener('mousedown', handleMouseDown);
  
  // 鼠标释放
  canvas.addEventListener('mouseup', handleMouseUp);
  
  // 鼠标移动
  canvas.addEventListener('mousemove', handleMouseMove);
  
  // 技能栏点击
  setupSkillBarClicks();
  
  // 药水槽点击
  $('potionSlot')?.addEventListener('click', usePotion);
  
  // 聊天输入框事件
  setupChatInput();
}

/**
 * 处理键盘按下事件
 */
function handleKeyDown(e) {
  // 聊天输入时忽略游戏按键
  if (gameState.chatFocused) return;

  switch (e.key.toLowerCase()) {
    case 'w':
    case 'arrowup':
      gameState.input.up = true;
      break;
    case 's':
    case 'arrowdown':
      gameState.input.down = true;
      break;
    case 'a':
    case 'arrowleft':
      gameState.input.left = true;
      break;
    case 'd':
    case 'arrowright':
      gameState.input.right = true;
      break;
    case 'q':
      gameState.input.skill = 0;
      break;
    case 'e':
      gameState.input.skill = 1;
      break;
    case 'r':
      usePotion();
      break;
    case 'i':
      toggleInventory();
      break;
    case 'tab':
      e.preventDefault();
      toggleLeaderboard();
      break;
    case 'enter':
      e.preventDefault();
      toggleChat();
      break;
  }
}

/**
 * 处理键盘释放事件
 */
function handleKeyUp(e) {
  switch (e.key.toLowerCase()) {
    case 'w':
    case 'arrowup':
      gameState.input.up = false;
      break;
    case 's':
    case 'arrowdown':
      gameState.input.down = false;
      break;
    case 'a':
    case 'arrowleft':
      gameState.input.left = false;
      break;
    case 'd':
    case 'arrowright':
      gameState.input.right = false;
      break;
  }
}

/**
 * 处理鼠标按下事件
 */
function handleMouseDown(e) {
  if (e.button === 0) { // 左键
    gameState.input.attack = true;
  }
}

/**
 * 处理鼠标释放事件
 */
function handleMouseUp(e) {
  if (e.button === 0) { // 左键
    gameState.input.attack = false;
  }
}

/**
 * 处理鼠标移动事件
 */
function handleMouseMove(e) {
  gameState.input.mouseX = e.clientX + gameState.camera.x;
  gameState.input.mouseY = e.clientY + gameState.camera.y;
}

/**
 * 设置技能栏点击事件
 */
function setupSkillBarClicks() {
  for (let i = 1; i <= 3; i++) {
    const skillEl = $('skill' + i);
    if (skillEl) {
      skillEl.addEventListener('click', () => {
        gameState.input.skill = i - 1;
      });
    }
  }
}

/**
 * 设置聊天输入框事件
 */
function setupChatInput() {
  const chatInput = $('chatInput');
  if (!chatInput) return;

  chatInput.addEventListener('focus', () => {
    gameState.chatFocused = true;
  });

  chatInput.addEventListener('blur', () => {
    gameState.chatFocused = false;
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      toggleChat();
    }
    if (e.key === 'Escape') {
      chatInput.value = '';
      chatInput.blur();
      gameState.chatFocused = false;
    }
    // 阻止游戏按键
    e.stopPropagation();
  });
}

/**
 * 发送输入到服务器
 */
function sendInput() {
  if (gameState.ws?.readyState === WebSocket.OPEN) {
    gameState.ws.send(JSON.stringify({
      type: 'input',
      input: gameState.input,
    }));
  }
}

// ============================================================
// 药水使用 Potion Usage
// ============================================================

/**
 * 使用药水
 */
function usePotion() {
  if (!gameState.localPlayer) return;
  
  const potionIndex = gameState.localPlayer.inventory?.findIndex(
    item => item.type === 'potion'
  );
  
  if (potionIndex >= 0) {
    gameState.ws?.send(JSON.stringify({
      type: 'useItem',
      index: potionIndex,
    }));
  }
}

// ============================================================
// 聊天系统 Chat System
// ============================================================

/**
 * 切换聊天输入状态
 */
function toggleChat() {
  const chatInput = $('chatInput');
  if (!chatInput) return;

  if (gameState.chatFocused) {
    // 发送消息
    const text = chatInput.value.trim();
    if (text) {
      gameState.ws?.send(JSON.stringify({
        type: 'chat',
        text,
      }));
    }
    chatInput.value = '';
    chatInput.blur();
    gameState.chatFocused = false;
  } else {
    // 打开聊天
    chatInput.focus();
    gameState.chatFocused = true;
  }
}

/**
 * 添加聊天消息到界面
 * @param {string} text - 消息文本
 * @param {string} type - 消息类型 (system/player)
 * @param {string} color - 颜色
 */
function addChatMessage(text, type, color) {
  const container = $('chatMessages');
  if (!container) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-msg ${type}`;
  messageDiv.textContent = text;
  
  if (color) {
    messageDiv.style.color = color;
  }

  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;

  // 限制消息数量
  while (container.children.length > CLIENT_CONFIG.UI.CHAT_MAX_MESSAGES) {
    container.removeChild(container.firstChild);
  }
}

// ============================================================
// 背包系统 Inventory System
// ============================================================

/**
 * 切换背包界面
 */
function toggleInventory() {
  gameState.inventoryOpen = !gameState.inventoryOpen;
  $('inventoryPanel')?.classList.toggle('open', gameState.inventoryOpen);
}

/**
 * 更新背包UI
 */
function updateInventoryUI() {
  const player = gameState.localPlayer;
  if (!player) return;

  // 更新装备显示
  updateEquipmentDisplay(player);
  
  // 更新物品格子
  updateInventoryGrid(player);
}

/**
 * 更新装备显示
 */
function updateEquipmentDisplay(player) {
  const equipmentSlots = {
    weapon: 'equipWeapon',
    armor: 'equipArmor',
    accessory: 'equipAccessory',
  };

  for (const [slot, elementId] of Object.entries(equipmentSlots)) {
    const element = $(elementId);
    if (!element) continue;

    const item = player.equipment?.[slot];
    const itemDisplay = element.querySelector('.equip-item');
    
    if (itemDisplay) {
      itemDisplay.textContent = item ? item.name : '-';
    }
    
    element.style.borderColor = item ? (item.rarityColor || '#2a2520') : '#2a2520';
  }
}

/**
 * 更新物品格子
 */
function updateInventoryGrid(player) {
  const grid = $('inventoryGrid');
  if (!grid) return;

  grid.innerHTML = '';
  const items = player.inventory || [];
  const slotCount = Math.max(16, items.length);

  for (let i = 0; i < slotCount; i++) {
    const slot = document.createElement('div');
    slot.className = 'inv-slot';

    if (i < items.length) {
      const item = items[i];
      const icons = {
        weapon: '⚔️',
        armor: '🛡️',
        potion: '🧪',
        accessory: '💎',
      };

      slot.innerHTML = `
        <span class="item-icon">${icons[item.type] || '📦'}</span>
        <span class="item-name" style="color:${item.rarityColor || '#a09880'}">${item.name}</span>
        ${item.count > 1 ? `<span class="item-count">x${item.count}</span>` : ''}
      `;
      
      slot.style.borderColor = item.rarityColor || '#2a2520';

      // 点击事件
      slot.addEventListener('click', () => {
        if (item.type === 'potion') {
          gameState.ws?.send(JSON.stringify({ type: 'useItem', index: i }));
        } else if (['weapon', 'armor', 'accessory'].includes(item.type)) {
          gameState.ws?.send(JSON.stringify({ type: 'equip', index: i }));
        }
      });
    }

    grid.appendChild(slot);
  }
}

// ============================================================
// 排行榜系统 Leaderboard System
// ============================================================

/**
 * 切换排行榜显示
 */
function toggleLeaderboard() {
  gameState.leaderboardOpen = !gameState.leaderboardOpen;
  $('leaderboard')?.classList.toggle('open', gameState.leaderboardOpen);
}

/**
 * 更新排行榜
 */
function updateLeaderboard() {
  const list = $('leaderboardList');
  if (!list || !gameState.leaderboardOpen) return;

  // 按击杀数排序
  const sortedPlayers = [...gameState.players].sort((a, b) => b.kills - a.kills);

  list.innerHTML = sortedPlayers.map((player, index) => {
    const rankClass = index < 3 ? `top-${index + 1}` : '';
    
    return `
      <div class="lb-entry">
        <span class="lb-rank ${rankClass}">${index + 1}</span>
        <span class="lb-name" style="color:${player.color}">${player.name}</span>
        <span class="lb-class">${player.className}</span>
        <span class="lb-kills">${player.kills}杀</span>
      </div>
    `;
  }).join('');
}

// ============================================================
// HUD 更新 HUD Updates
// ============================================================

/**
 * 设置技能图标
 */
function setupSkillIcons() {
  const player = gameState.localPlayer;
  if (!player || !gameState.classes) return;

  const classData = gameState.classes[player.classId];
  if (!classData) return;

  // 更新技能栏图标
  const skillIcons = classData.skills.map(s => s.icon);
  for (let i = 0; i < skillIcons.length && i < 3; i++) {
    const skillEl = $('skill' + (i + 1));
    if (skillEl) {
      skillEl.querySelector('.skill-icon').textContent = skillIcons[i];
    }
  }

  // 更新头像
  $('playerPortrait').textContent = classData.icon;
}

/**
 * 更新HUD显示
 */
function updateHUD() {
  const player = gameState.localPlayer;
  if (!player) return;

  // 更新名字和等级
  $('hudName').textContent = player.name;
  $('hudLevel').textContent = player.level;

  // 更新状态条
  updateBar('hpFill', 'hpText', player.hp, player.maxHp);
  updateBar('mpFill', 'mpText', player.mp, player.maxMp);
  updateBar('xpFill', 'xpText', player.xp, player.xpToNext, `EXP `);

  // 更新金币
  $('goldAmount').textContent = player.gold;

  // 更新技能冷却
  updateSkillCooldowns(player.skills);

  // 更新药水数量
  updatePotionCount(player.inventory);

  // 更新死亡界面
  updateDeathOverlay(player);

  // 更新相机位置
  updateCamera(player);
}

/**
 * 更新状态条
 */
function updateBar(fillId, textId, current, max, prefix = '') {
  const fillEl = $(fillId);
  const textEl = $(textId);
  
  if (fillEl) {
    const percentage = (current / max * 100).toFixed(1);
    fillEl.style.width = percentage + '%';
  }
  
  if (textEl) {
    textEl.textContent = `${prefix}${Math.floor(current)}/${max}`;
  }
}

/**
 * 更新技能冷却显示
 */
function updateSkillCooldowns(skills) {
  if (!skills) return;

  for (let i = 0; i < Math.min(skills.length, 4); i++) {
    const skill = skills[i];
    const cooldownEl = $('cd' + i);
    
    if (cooldownEl) {
      if (skill.currentCooldown > 0) {
        cooldownEl.classList.add('active');
        cooldownEl.textContent = skill.currentCooldown.toFixed(1);
      } else {
        cooldownEl.classList.remove('active');
        cooldownEl.textContent = '';
      }
    }
  }
}

/**
 * 更新药水数量显示
 */
function updatePotionCount(inventory) {
  const potion = inventory?.find(item => item.type === 'potion');
  const countEl = $('potionCount');
  
  if (countEl) {
    countEl.textContent = potion ? potion.count : 0;
  }
}

/**
 * 更新死亡界面
 */
function updateDeathOverlay(player) {
  const deathOverlay = $('deathOverlay');
  if (!deathOverlay) return;

  if (!player.alive) {
    deathOverlay.classList.add('active');
    $('respawnTimer').textContent = Math.ceil(player.respawnTimer);
  } else {
    deathOverlay.classList.remove('active');
  }
}

/**
 * 更新相机位置
 */
function updateCamera(player) {
  gameState.camera.x = player.x - canvas.width / 2;
  gameState.camera.y = player.y - canvas.height / 2;
}

// ============================================================
// 游戏渲染 Game Rendering
// ============================================================

/**
 * 主渲染循环
 */
function renderLoop() {
  // 更新FPS
  updateFPS();
  
  // 渲染游戏
  render();
  
  // 继续下一帧
  requestAnimationFrame(renderLoop);
}

/**
 * 更新FPS计数
 */
function updateFPS() {
  gameState.frameCount++;
  const now = Date.now();
  
  if (now - gameState.lastFpsUpdate >= 1000) {
    gameState.fps = gameState.frameCount;
    gameState.frameCount = 0;
    gameState.lastFpsUpdate = now;
  }
}

/**
 * 渲染游戏画面
 */
function render() {
  if (!gameState.dungeon || !gameState.localPlayer) return;

  const { width, height } = canvas;
  const { camera } = gameState;
  const tileSize = CLIENT_CONFIG.GAME.TILE_SIZE;

  // 清屏
  ctx.fillStyle = CLIENT_CONFIG.CANVAS.BG_COLOR;
  ctx.fillRect(0, 0, width, height);

  // 计算可见范围
  const startCol = Math.max(0, Math.floor(camera.x / tileSize));
  const endCol = Math.min(gameState.dungeon.width, Math.ceil((camera.x + width) / tileSize) + 1);
  const startRow = Math.max(0, Math.floor(camera.y / tileSize));
  const endRow = Math.min(gameState.dungeon.height, Math.ceil((camera.y + height) / tileSize) + 1);

  // 绘制地牢
  renderDungeon(startCol, endCol, startRow, endRow, camera, tileSize);

  // 绘制掉落物
  renderLootDrops(camera);

  // 绘制陷阱
  renderTraps(camera);

  // 绘制投射物
  renderProjectiles(camera);

  // 绘制怪物
  renderMonsters(camera);

  // 绘制玩家
  renderPlayers(camera);

  // 绘制迷雾
  renderFogOfWar(width, height);

  // 绘制小地图
  renderMinimap();
}

/**
 * 渲染地牢
 */
function renderDungeon(startCol, endCol, startRow, endRow, camera, tileSize) {
  for (let row = startRow; row < endRow; row++) {
    for (let col = startCol; col < endCol; col++) {
      const tile = gameState.dungeon.tiles[row]?.[col];
      const x = col * tileSize - camera.x;
      const y = row * tileSize - camera.y;

      if (tile === 1) {
        // 地板
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(x, y, tileSize, tileSize);
        
        // 地板纹理
        if ((row + col) % 2 === 0) {
          ctx.fillStyle = '#16162a';
          ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
        }
        
        // 地板边线
        ctx.strokeStyle = '#121224';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, tileSize, tileSize);
      } else {
        // 墙壁
        ctx.fillStyle = '#2a2520';
        ctx.fillRect(x, y, tileSize, tileSize);
        
        // 墙壁纹理
        ctx.fillStyle = '#231f1a';
        ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
        
        // 墙壁高光
        ctx.fillStyle = '#332e28';
        ctx.fillRect(x, y, tileSize, 2);
        ctx.fillRect(x, y, 2, tileSize);
      }
    }
  }
}

/**
 * 渲染掉落物
 */
function renderLootDrops(camera) {
  const icons = {
    weapon: '⚔️',
    armor: '🛡️',
    potion: '🧪',
    accessory: '💎',
    gold: '💰',
  };

  for (const loot of gameState.lootDrops) {
    const x = loot.x - camera.x;
    const y = loot.y - camera.y;
    const icon = icons[loot.type] || '📦';

    ctx.save();
    ctx.shadowColor = loot.rarityColor || '#d4a843';
    ctx.shadowBlur = 8;
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 浮动动画
    const floatY = Math.sin(Date.now() / 500) * 3;
    ctx.fillText(icon, x, y + floatY);
    
    ctx.restore();
  }
}

/**
 * 渲染陷阱
 */
function renderTraps(camera) {
  for (const proj of gameState.projectiles) {
    if (!proj.isTrap) continue;
    
    const x = proj.x - camera.x;
    const y = proj.y - camera.y;

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

/**
 * 渲染投射物
 */
function renderProjectiles(camera) {
  for (const proj of gameState.projectiles) {
    if (proj.isTrap) continue;
    
    const x = proj.x - camera.x;
    const y = proj.y - camera.y;

    ctx.save();
    ctx.fillStyle = proj.color || '#f0c75e';
    ctx.shadowColor = proj.color || '#f0c75e';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(x, y, CLIENT_CONFIG.GAME.PROJECTILE_HITBOX, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * 渲染怪物
 */
function renderMonsters(camera) {
  for (const monster of gameState.monsters) {
    const x = monster.x - camera.x;
    const y = monster.y - camera.y;

    ctx.save();

    // Boss光环
    if (monster.isBoss) {
      ctx.shadowColor = '#e67e22';
      ctx.shadowBlur = 15;
    }

    // 怪物身体
    ctx.fillStyle = monster.color;
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
      renderHealthBar(
        x,
        y - monster.size - 8,
        monster.size * 2,
        4,
        monster.hp,
        monster.maxHp,
        monster.isBoss ? '#e67e22' : '#c0392b'
      );
    }

    // 怪物名字
    ctx.font = '10px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = monster.isBoss ? '#e67e22' : '#a09880';
    ctx.fillText(monster.name, x, y + monster.size + 14);

    ctx.restore();
  }
}

/**
 * 渲染玩家
 */
function renderPlayers(camera) {
  for (const player of gameState.players) {
    if (!player.alive) continue;
    
    const x = player.x - camera.x;
    const y = player.y - camera.y;
    const isLocalPlayer = player.id === gameState.playerId;

    ctx.save();

    // 本地玩家光环
    if (isLocalPlayer) {
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
    ctx.shadowBlur = isLocalPlayer ? 8 : 4;
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fill();

    // 方向指示器
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
    ctx.fillStyle = isLocalPlayer ? '#f5e6c8' : '#a09880';
    ctx.fillText(player.name, x, y - 22);

    // 玩家等级
    ctx.font = '9px "Noto Sans SC", sans-serif';
    ctx.fillStyle = '#d4a843';
    ctx.fillText(`Lv.${player.level}`, x, y + 24);

    // 其他玩家血条
    if (!isLocalPlayer) {
      renderHealthBar(x, y - 18, 28, 3, player.hp, player.maxHp, '#c0392b');
    }

    ctx.restore();
  }
}

/**
 * 渲染血条
 */
function renderHealthBar(x, y, width, height, current, max, color) {
  const barX = x - width / 2;
  const percentage = current / max;

  // 背景
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(barX, y, width, height);

  // 血量
  ctx.fillStyle = color;
  ctx.fillRect(barX, y, width * percentage, height);

  // 边框
  ctx.strokeStyle = '#2a2520';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(barX, y, width, height);
}

/**
 * 渲染迷雾效果
 */
function renderFogOfWar(width, height) {
  const fogSize = CLIENT_CONFIG.CANVAS.FOG_SIZE;

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

/**
 * 渲染小地图
 */
function renderMinimap() {
  if (!gameState.dungeon) return;

  const mw = minimapCanvas.width;
  const mh = minimapCanvas.height;
  const dw = gameState.dungeon.width;
  const dh = gameState.dungeon.height;
  const scaleX = mw / dw;
  const scaleY = mh / dh;

  // 清空小地图
  minimapCtx.fillStyle = '#0a0a0f';
  minimapCtx.fillRect(0, 0, mw, mh);

  // 绘制地牢布局
  renderMinimapDungeon(dw, dh, scaleX, scaleY);

  // 绘制怪物
  renderMinimapMonsters(scaleX, scaleY);

  // 绘制玩家
  renderMinimapPlayers(scaleX, scaleY);

  // 绘制掉落物
  renderMinimapLoot(scaleX, scaleY);

  // 绘制相机视野
  renderMinimapViewPort(scaleX, scaleY);
}

/**
 * 渲染小地图地牢
 */
function renderMinimapDungeon(dw, dh, scaleX, scaleY) {
  for (let row = 0; row < dh; row++) {
    for (let col = 0; col < dw; col++) {
      if (gameState.dungeon.tiles[row]?.[col] === 1) {
        minimapCtx.fillStyle = '#1a1a2e';
        minimapCtx.fillRect(
          col * scaleX,
          row * scaleY,
          scaleX + 0.5,
          scaleY + 0.5
        );
      }
    }
  }
}

/**
 * 渲染小地图怪物
 */
function renderMinimapMonsters(scaleX, scaleY) {
  for (const monster of gameState.monsters) {
    minimapCtx.fillStyle = monster.isBoss ? '#e67e22' : '#c0392b';
    const size = monster.isBoss ? 3 : 1.5;
    
    minimapCtx.fillRect(
      (monster.x / CLIENT_CONFIG.GAME.TILE_SIZE) * scaleX - size / 2,
      (monster.y / CLIENT_CONFIG.GAME.TILE_SIZE) * scaleY - size / 2,
      size,
      size
    );
  }
}

/**
 * 渲染小地图玩家
 */
function renderMinimapPlayers(scaleX, scaleY) {
  for (const player of gameState.players) {
    if (!player.alive) continue;
    
    const isLocalPlayer = player.id === gameState.playerId;
    minimapCtx.fillStyle = isLocalPlayer ? '#f0c75e' : player.color;
    const size = isLocalPlayer ? 4 : 2;
    
    minimapCtx.fillRect(
      (player.x / CLIENT_CONFIG.GAME.TILE_SIZE) * scaleX - size / 2,
      (player.y / CLIENT_CONFIG.GAME.TILE_SIZE) * scaleY - size / 2,
      size,
      size
    );
  }
}

/**
 * 渲染小地图掉落物
 */
function renderMinimapLoot(scaleX, scaleY) {
  for (const loot of gameState.lootDrops) {
    minimapCtx.fillStyle = loot.rarityColor || '#d4a843';
    
    minimapCtx.fillRect(
      (loot.x / CLIENT_CONFIG.GAME.TILE_SIZE) * scaleX - 1,
      (loot.y / CLIENT_CONFIG.GAME.TILE_SIZE) * scaleY - 1,
      2,
      2
    );
  }
}

/**
 * 渲染小地图视野范围
 */
function renderMinimapViewPort(scaleX, scaleY) {
  minimapCtx.strokeStyle = 'rgba(212, 168, 67, 0.3)';
  minimapCtx.lineWidth = 1;
  
  minimapCtx.strokeRect(
    (gameState.camera.x / CLIENT_CONFIG.GAME.TILE_SIZE) * scaleX,
    (gameState.camera.y / CLIENT_CONFIG.GAME.TILE_SIZE) * scaleY,
    (canvas.width / CLIENT_CONFIG.GAME.TILE_SIZE) * scaleX,
    (canvas.height / CLIENT_CONFIG.GAME.TILE_SIZE) * scaleY
  );
}

// ============================================================
// 初始化 Initialization
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  initLoginScreen();
});


// ============================================================
// 移动端触摸控制 Mobile Touch Controls
// ============================================================

/**
 * 初始化触摸控制
 */
function initTouchControls() {
  // 检测是否为移动设备
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (!isMobile) return;

  console.log('检测到移动设备，启用触摸控制');

  // 创建虚拟摇杆
  createVirtualJoystick();
  
  // 创建虚拟按钮
  createVirtualButtons();
}

/**
 * 创建虚拟摇杆
 */
function createVirtualJoystick() {
  const joystickContainer = document.createElement('div');
  joystickContainer.id = 'virtualJoystick';
  joystickContainer.style.cssText = `
    position: fixed;
    bottom: 120px;
    left: 40px;
    width: 120px;
    height: 120px;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    z-index: 1000;
    touch-action: none;
  `;

  const joystickKnob = document.createElement('div');
  joystickKnob.id = 'joystickKnob';
  joystickKnob.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 50px;
    height: 50px;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 50%;
    pointer-events: none;
  `;

  joystickContainer.appendChild(joystickKnob);
  document.body.appendChild(joystickContainer);

  let isDragging = false;
  let startX, startY;

  joystickContainer.addEventListener('touchstart', (e) => {
    isDragging = true;
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    e.preventDefault();
  });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = 50;

    const normalizedX = deltaX / Math.max(distance, maxDistance);
    const normalizedY = deltaY / Math.max(distance, maxDistance);

    const knobX = normalizedX * maxDistance;
    const knobY = normalizedY * maxDistance;

    joystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;

    // 更新输入状态
    gameState.input.left = normalizedX < -0.3;
    gameState.input.right = normalizedX > 0.3;
    gameState.input.up = normalizedY < -0.3;
    gameState.input.down = normalizedY > 0.3;
  });

  document.addEventListener('touchend', () => {
    isDragging = false;
    joystickKnob.style.transform = 'translate(-50%, -50%)';
    gameState.input.left = false;
    gameState.input.right = false;
    gameState.input.up = false;
    gameState.input.down = false;
  });
}

/**
 * 创建虚拟按钮
 */
function createVirtualButtons() {
  const buttonContainer = document.createElement('div');
  buttonContainer.id = 'virtualButtons';
  buttonContainer.style.cssText = `
    position: fixed;
    bottom: 120px;
    right: 40px;
    display: grid;
    grid-template-columns: repeat(2, 60px);
    gap: 10px;
    z-index: 1000;
  `;

  const buttons = [
    { id: 'attackBtn', label: '⚔️', action: () => gameState.input.attack = true },
    { id: 'skill1Btn', label: 'Q', action: () => gameState.input.skill = 0 },
    { id: 'skill2Btn', label: 'E', action: () => gameState.input.skill = 1 },
    { id: 'potionBtn', label: '🧪', action: usePotion },
  ];

  buttons.forEach(btn => {
    const button = document.createElement('button');
    button.textContent = btn.label;
    button.style.cssText = `
      width: 60px;
      height: 60px;
      background: rgba(255, 255, 255, 0.15);
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 10px;
      color: white;
      font-size: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
    `;

    button.addEventListener('touchstart', (e) => {
      e.preventDefault();
      btn.action();
    });

    button.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (btn.id === 'attackBtn') {
        gameState.input.attack = false;
      }
    });

    buttonContainer.appendChild(button);
  });

  document.body.appendChild(buttonContainer);
}

// 在DOMContentLoaded时初始化触摸控制
document.addEventListener('DOMContentLoaded', () => {
  initTouchControls();
});


// ============================================================
// 提示系统初始化 Tips System Initialization
// ============================================================

/**
 * 初始化游戏提示
 */
function initGameTips() {
  // 初始化提示系统
  if (window.GameTips) {
    GameTips.init();
    
    // 显示初始提示
    setTimeout(() => GameTips.show('movement'), 1000);
    setTimeout(() => GameTips.show('attack'), 3000);
    setTimeout(() => GameTips.show('skills'), 5000);
  }
}

// 在开始游戏时初始化提示
const originalStartGame = startGame;
startGame = function() {
  originalStartGame();
  initGameTips();
};


// ============================================================
// 加载界面 Loading Screen
// ============================================================

const LoadingScreen = {
  element: null,
  progressBar: null,
  textElement: null,
  tipElement: null,
  progress: 0,
  
  init() {
    this.element = document.getElementById('loadingScreen');
    this.progressBar = document.getElementById('loadingProgress');
    this.textElement = document.getElementById('loadingText');
    this.tipElement = document.getElementById('loadingTip');
    
    // 随机加载提示
    const tips = [
      '提示: 使用 WASD 移动角色',
      '提示: 按 Q 和 E 释放技能',
      '提示: 按 R 使用药水恢复生命',
      '提示: 按 I 打开背包装备物品',
      '提示: 按 Enter 与队友聊天',
      '提示: 按 Tab 查看排行榜',
      '提示: 小地图显示怪物和队友位置',
      '提示: Boss怪物会掉落稀有装备',
    ];
    
    if (this.tipElement) {
      this.tipElement.textContent = tips[Math.floor(Math.random() * tips.length)];
    }
  },
  
  setProgress(value, text) {
    this.progress = Math.min(100, Math.max(0, value));
    if (this.progressBar) {
      this.progressBar.style.width = this.progress + '%';
    }
    if (text && this.textElement) {
      this.textElement.textContent = text;
    }
  },
  
  hide() {
    if (this.element) {
      this.element.classList.add('hidden');
      setTimeout(() => {
        this.element.style.display = 'none';
      }, 500);
    }
  },
};

// 在DOMContentLoaded时初始化
document.addEventListener('DOMContentLoaded', () => {
  LoadingScreen.init();
  LoadingScreen.setProgress(10, '正在加载资源...');
});


// ============================================================
// 网络统计 Network Statistics
// ============================================================

const NetworkStats = {
  ping: 0,
  lastPingTime: 0,
  pingInterval: null,
  
  init() {
    // 创建ping显示元素
    const pingDisplay = document.createElement('div');
    pingDisplay.id = 'pingDisplay';
    pingDisplay.className = 'ping-display';
    pingDisplay.innerHTML = '延迟: <span id="pingValue">--</span>ms';
    document.body.appendChild(pingDisplay);
    
    // 定期测量延迟
    this.pingInterval = setInterval(() => this.measurePing(), 5000);
  },
  
  measurePing() {
    if (!gameState.ws || gameState.ws.readyState !== WebSocket.OPEN) return;
    
    this.lastPingTime = Date.now();
    gameState.ws.send(JSON.stringify({ type: 'ping' }));
  },
  
  updatePing(pingTime) {
    this.ping = pingTime;
    const pingElement = document.getElementById('pingValue');
    if (pingElement) {
      pingElement.textContent = pingTime;
      
      // 根据延迟设置颜色
      if (pingTime < 50) {
        pingElement.style.color = '#2ecc71'; // 绿色 - 良好
      } else if (pingTime < 100) {
        pingElement.style.color = '#f39c12'; // 黄色 - 一般
      } else {
        pingElement.style.color = '#e74c3c'; // 红色 - 差
      }
    }
  },
  
  destroy() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
  },
};

// 添加ping显示样式
const pingStyles = document.createElement('style');
pingStyles.textContent = `
  .ping-display {
    position: fixed;
    bottom: 84px;
    right: 16px;
    z-index: 100;
    font-family: monospace;
    font-size: 11px;
    color: var(--text-dim);
    background: rgba(0,0,0,0.5);
    padding: 4px 8px;
    border-radius: 2px;
    border: 1px solid var(--border-stone);
  }
  
  #pingValue {
    font-weight: 700;
  }
`;
document.head.appendChild(pingStyles);

// 在连接成功后初始化
const originalConnectToServer = connectToServer;
connectToServer = function(name, classId) {
  originalConnectToServer(name, classId);
  
  // 等待连接成功后初始化网络统计
  const checkConnection = setInterval(() => {
    if (gameState.connected) {
      NetworkStats.init();
      clearInterval(checkConnection);
    }
  }, 100);
};


// ============================================================
// 错误处理系统 Error Handling System
// ============================================================

const ErrorHandler = {
  errors: [],
  maxErrors: 50,
  
  init() {
    // 捕获未处理的错误
    window.addEventListener('error', (event) => {
      this.logError('JavaScript错误', event.message, event.filename, event.lineno);
    });
    
    // 捕获未处理的Promise错误
    window.addEventListener('unhandledrejection', (event) => {
      this.logError('Promise错误', event.reason?.message || '未知错误');
    });
    
    // 创建错误显示容器
    this.createErrorContainer();
  },
  
  createErrorContainer() {
    const container = document.createElement('div');
    container.id = 'errorContainer';
    container.className = 'error-container';
    document.body.appendChild(container);
  },
  
  logError(type, message, file = '', line = 0) {
    const error = {
      type,
      message,
      file,
      line,
      timestamp: Date.now(),
    };
    
    this.errors.push(error);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }
    
    console.error(`[${type}] ${message}`, file ? `at ${file}:${line}` : '');
    
    // 显示错误通知
    this.showErrorNotification(type, message);
  },
  
  showErrorNotification(type, message) {
    const container = document.getElementById('errorContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.innerHTML = `
      <span class="error-icon">⚠️</span>
      <div class="error-content">
        <div class="error-type">${type}</div>
        <div class="error-message">${message}</div>
      </div>
      <span class="error-close">✕</span>
    `;
    
    // 点击关闭
    notification.querySelector('.error-close').addEventListener('click', () => {
      notification.remove();
    });
    
    container.appendChild(notification);
    
    // 自动关闭
    setTimeout(() => {
      notification.remove();
    }, 5000);
  },
  
  getErrors() {
    return [...this.errors];
  },
  
  clearErrors() {
    this.errors = [];
  },
};

// 添加错误通知样式
const errorStyles = document.createElement('style');
errorStyles.textContent = `
  .error-container {
    position: fixed;
    top: 80px;
    right: 16px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 300px;
  }
  
  .error-notification {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: rgba(192, 57, 43, 0.95);
    border: 1px solid rgba(231, 76, 60, 0.5);
    border-radius: 4px;
    padding: 12px;
    animation: errorSlideIn 0.3s ease-out;
  }
  
  @keyframes errorSlideIn {
    from {
      opacity: 0;
      transform: translateX(50px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  .error-icon {
    font-size: 18px;
  }
  
  .error-content {
    flex: 1;
  }
  
  .error-type {
    font-size: 11px;
    color: rgba(255,255,255,0.7);
    margin-bottom: 2px;
  }
  
  .error-message {
    font-size: 13px;
    color: white;
    font-weight: 500;
  }
  
  .error-close {
    cursor: pointer;
    color: rgba(255,255,255,0.7);
    font-size: 14px;
  }
  
  .error-close:hover {
    color: white;
  }
`;
document.head.appendChild(errorStyles);

// 在DOMContentLoaded时初始化
document.addEventListener('DOMContentLoaded', () => {
  ErrorHandler.init();
});

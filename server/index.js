#!/usr/bin/env node
"use strict";

/**
 * ============================================================
 * 深渊地牢 - 游戏服务器 v2.0
 * Abyss Dungeon - Game Server v2.0
 * ============================================================
 * 
 * 服务器权威架构 (Server-Authoritative Architecture)
 * - 所有游戏逻辑在服务器端运行
 * - 客户端仅发送输入和接收状态快照
 * - 防止作弊，保证公平性
 * 
 * @author Abyss Dungeon Team
 * @version 2.0.0
 * @license MIT
 * ============================================================
 */

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { WebSocketServer } = require("ws");
const crypto = require("node:crypto");

// ============================================================
// 配置 Configuration
// ============================================================
const CONFIG = {
  // 服务器配置
  PORT: parseInt(process.env.PORT || "3001", 10),
  HOST: process.env.HOST || "0.0.0.0",
  MAX_PLAYERS: parseInt(process.env.MAX_PLAYERS || "50", 10),
  
  // 游戏循环配置
  TICK_RATE: 20,                    // 游戏逻辑更新频率 (Hz)
  SNAPSHOT_RATE: 10,                // 状态快照发送频率 (Hz)
  
  // 地牢配置
  DUNGEON: {
    WIDTH: 80,
    HEIGHT: 60,
    TILE_SIZE: 32,
    ROOM_MIN: 5,
    ROOM_MAX: 12,
    MAX_ROOMS: 12,
  },
  
  // 游戏平衡性配置
  GAMEPLAY: {
    MANA_REGEN_RATE: 2,            // 每秒魔法恢复量
    RESPAWN_TIME: 5,               // 复活时间(秒)
    LOOT_LIFETIME: 30,             // 掉落物存在时间(秒)
    MONSTER_VISION_RANGE: 300,     // 怪物视野范围
    PICKUP_RANGE: 30,              // 拾取范围
    XP_SCALE_FACTOR: 1.5,          // 经验值增长系数
  },
  
  // 安全配置
  SECURITY: {
    MAX_NAME_LENGTH: 12,
    MAX_CHAT_LENGTH: 200,
    RATE_LIMIT_MESSAGES: 10,       // 每秒最大消息数
    RATE_LIMIT_WINDOW: 1000,       // 速率限制窗口(ms)
  },
};

// 计算派生常量
const DT = 1000 / CONFIG.TICK_RATE;
const SNAPSHOT_MS = 1000 / CONFIG.SNAPSHOT_RATE;
const { TILE_SIZE } = CONFIG.DUNGEON;

// ============================================================
// MIME 类型映射
// ============================================================
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

// ============================================================
// 职业配置 Class Configurations
// ============================================================
const CLASSES = {
  warrior: {
    id: "warrior",
    name: "战士",
    nameEn: "Warrior",
    description: "近战之王，攻守兼备",
    maxHp: 200,
    maxMp: 50,
    attack: 25,
    defense: 20,
    speed: 150,
    range: 40,
    color: "#e74c3c",
    icon: "⚔️",
    skills: [
      {
        id: "slash",
        name: "横扫斩",
        nameEn: "Slash",
        description: "对周围敌人造成范围伤害",
        damage: 35,
        cooldown: 1.5,
        mpCost: 10,
        range: 60,
        aoe: true,
        icon: "⚔️",
      },
      {
        id: "shield_bash",
        name: "盾击",
        nameEn: "Shield Bash",
        description: "眩晕目标1.5秒",
        damage: 20,
        cooldown: 3,
        mpCost: 15,
        range: 45,
        stun: 1.5,
        icon: "🛡️",
      },
      {
        id: "war_cry",
        name: "战吼",
        nameEn: "War Cry",
        description: "增加攻击力5秒",
        damage: 0,
        cooldown: 8,
        mpCost: 25,
        range: 0,
        buff: { attack: 15, duration: 5 },
        icon: "📢",
      },
    ],
  },
  mage: {
    id: "mage",
    name: "法师",
    nameEn: "Mage",
    description: "元素之力，远程毁灭",
    maxHp: 100,
    maxMp: 200,
    attack: 35,
    defense: 5,
    speed: 130,
    range: 200,
    color: "#3498db",
    icon: "🔮",
    skills: [
      {
        id: "fireball",
        name: "火球术",
        nameEn: "Fireball",
        description: "发射火球造成高额伤害",
        damage: 50,
        cooldown: 2,
        mpCost: 20,
        range: 250,
        speed: 300,
        icon: "🔥",
      },
      {
        id: "ice_wall",
        name: "冰墙",
        nameEn: "Ice Wall",
        description: "减速敌人3秒",
        damage: 15,
        cooldown: 5,
        mpCost: 30,
        range: 150,
        slow: 0.5,
        duration: 3,
        icon: "🧊",
      },
      {
        id: "lightning",
        name: "闪电链",
        nameEn: "Chain Lightning",
        description: "连锁攻击3个敌人",
        damage: 40,
        cooldown: 6,
        mpCost: 40,
        range: 200,
        chain: 3,
        icon: "⚡",
      },
    ],
  },
  archer: {
    id: "archer",
    name: "弓箭手",
    nameEn: "Archer",
    description: "百步穿杨，机动灵活",
    maxHp: 120,
    maxMp: 80,
    attack: 30,
    defense: 10,
    speed: 180,
    range: 300,
    color: "#2ecc71",
    icon: "🏹",
    skills: [
      {
        id: "power_shot",
        name: "蓄力射击",
        nameEn: "Power Shot",
        description: "远程高伤射击",
        damage: 60,
        cooldown: 3,
        mpCost: 15,
        range: 350,
        speed: 400,
        icon: "🎯",
      },
      {
        id: "multi_shot",
        name: "多重射击",
        nameEn: "Multi Shot",
        description: "扇形发射5支箭矢",
        damage: 20,
        cooldown: 4,
        mpCost: 20,
        range: 250,
        projectiles: 5,
        spread: 30,
        icon: "🏹",
      },
      {
        id: "trap",
        name: "陷阱",
        nameEn: "Trap",
        description: "放置减速陷阱",
        damage: 30,
        cooldown: 8,
        mpCost: 25,
        range: 100,
        duration: 10,
        slow: 0.7,
        icon: "🪤",
      },
    ],
  },
  priest: {
    id: "priest",
    name: "牧师",
    nameEn: "Priest",
    description: "神圣治愈，守护同伴",
    maxHp: 130,
    maxMp: 180,
    attack: 15,
    defense: 12,
    speed: 140,
    range: 180,
    color: "#f39c12",
    icon: "✨",
    skills: [
      {
        id: "heal",
        name: "治愈术",
        nameEn: "Heal",
        description: "恢复自身生命值",
        damage: -50,
        cooldown: 3,
        mpCost: 25,
        range: 0,
        targetAlly: true,
        icon: "💚",
      },
      {
        id: "holy_light",
        name: "圣光",
        nameEn: "Holy Light",
        description: "发射圣光弹",
        damage: 35,
        cooldown: 2,
        mpCost: 15,
        range: 200,
        speed: 250,
        icon: "✝️",
      },
      {
        id: "barrier",
        name: "护盾",
        nameEn: "Barrier",
        description: "获得护盾5秒",
        damage: 0,
        cooldown: 10,
        mpCost: 35,
        range: 0,
        shield: 80,
        duration: 5,
        icon: "🛡️",
      },
    ],
  },
};

// ============================================================
// 怪物配置 Monster Configurations
// ============================================================
const MONSTER_TYPES = {
  slime: {
    id: "slime",
    name: "史莱姆",
    nameEn: "Slime",
    hp: 40,
    attack: 8,
    defense: 2,
    speed: 60,
    range: 30,
    color: "#27ae60",
    xp: 15,
    size: 14,
    isBoss: false,
  },
  skeleton: {
    id: "skeleton",
    name: "骷髅战士",
    nameEn: "Skeleton Warrior",
    hp: 80,
    attack: 15,
    defense: 8,
    speed: 80,
    range: 35,
    color: "#bdc3c7",
    xp: 30,
    size: 16,
    isBoss: false,
  },
  goblin: {
    id: "goblin",
    name: "哥布林",
    nameEn: "Goblin",
    hp: 60,
    attack: 12,
    defense: 5,
    speed: 120,
    range: 30,
    color: "#8e44ad",
    xp: 25,
    size: 14,
    isBoss: false,
  },
  demon: {
    id: "demon",
    name: "恶魔",
    nameEn: "Demon",
    hp: 150,
    attack: 25,
    defense: 15,
    speed: 90,
    range: 40,
    color: "#c0392b",
    xp: 60,
    size: 20,
    isBoss: false,
  },
  dragon: {
    id: "dragon",
    name: "巨龙",
    nameEn: "Dragon",
    hp: 500,
    attack: 40,
    defense: 25,
    speed: 70,
    range: 60,
    color: "#e67e22",
    xp: 200,
    size: 32,
    isBoss: true,
  },
};

// ============================================================
// 掉落物配置 Loot Configurations
// ============================================================
const LOOT_TABLES = {
  slime: [{ type: "potion", chance: 0.3, tier: 1 }],
  skeleton: [
    { type: "weapon", chance: 0.15, tier: 1 },
    { type: "armor", chance: 0.1, tier: 1 },
    { type: "potion", chance: 0.25, tier: 1 },
  ],
  goblin: [
    { type: "weapon", chance: 0.15, tier: 1 },
    { type: "gold", chance: 0.8, amount: 5 },
  ],
  demon: [
    { type: "weapon", chance: 0.2, tier: 2 },
    { type: "armor", chance: 0.15, tier: 2 },
    { type: "potion", chance: 0.3, tier: 2 },
  ],
  dragon: [
    { type: "weapon", chance: 0.5, tier: 3 },
    { type: "armor", chance: 0.5, tier: 3 },
    { type: "accessory", chance: 0.3, tier: 3 },
  ],
};

// ============================================================
// 物品模板 Item Templates
// ============================================================
const ITEM_TEMPLATES = {
  weapon: {
    1: [
      { name: "铁剑", attack: 5, value: 10 },
      { name: "短弓", attack: 4, value: 8 },
      { name: "法杖", attack: 6, value: 12 },
    ],
    2: [
      { name: "精钢大剑", attack: 12, value: 30 },
      { name: "精灵长弓", attack: 10, value: 25 },
      { name: "秘法之杖", attack: 14, value: 35 },
    ],
    3: [
      { name: "屠龙剑", attack: 25, value: 100 },
      { name: "风暴之弓", attack: 22, value: 90 },
      { name: "毁灭法杖", attack: 28, value: 120 },
    ],
  },
  armor: {
    1: [
      { name: "皮甲", defense: 5, value: 10 },
      { name: "布袍", defense: 3, value: 8 },
    ],
    2: [
      { name: "锁子甲", defense: 12, value: 30 },
      { name: "法师长袍", defense: 8, value: 25 },
    ],
    3: [
      { name: "龙鳞甲", defense: 25, value: 100 },
      { name: "暗影斗篷", defense: 18, value: 80 },
    ],
  },
  potion: {
    1: [{ name: "小型生命药水", heal: 30, value: 5 }],
    2: [{ name: "中型生命药水", heal: 60, value: 15 }],
    3: [{ name: "大型生命药水", heal: 120, value: 30 }],
  },
  accessory: {
    3: [
      { name: "龙心项链", maxHp: 50, value: 150 },
      { name: "魔力戒指", maxMp: 50, value: 150 },
    ],
  },
};

// ============================================================
// 稀有度配置 Rarity Configurations
// ============================================================
const RARITY = {
  common: { name: "普通", nameEn: "Common", color: "#95a5a6", weight: 40 },
  uncommon: { name: "优秀", nameEn: "Uncommon", color: "#2ecc71", weight: 30 },
  rare: { name: "稀有", nameEn: "Rare", color: "#3498db", weight: 20 },
  epic: { name: "史诗", nameEn: "Epic", color: "#9b59b6", weight: 8 },
  legendary: { name: "传说", nameEn: "Legendary", color: "#e67e22", weight: 2 },
};

// ============================================================
// 工具函数 Utility Functions
// ============================================================

/** 生成唯一ID */
let nextId = 1;
function genId() {
  return nextId++;
}

/** 计算两点距离 */
function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/** 限制数值范围 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** 生成随机整数 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 生成随机浮点数 */
function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

/** 从数组中随机选择元素 */
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 格式化日志时间 */
function logTime() {
  return new Date().toISOString();
}

/** 安全日志输出 */
function log(level, message, data = null) {
  const logEntry = {
    time: logTime(),
    level,
    message,
    ...(data && { data }),
  };
  console.log(JSON.stringify(logEntry));
}

// ============================================================
// 地牢生成器 Dungeon Generator
// ============================================================

/**
 * 程序化地牢生成器
 * 使用房间放置 + 走廊连接算法
 */
class DungeonGenerator {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.tiles = [];
    this.rooms = [];
  }

  /**
   * 生成地牢
   * @returns {Object} 地牢数据
   */
  generate() {
    log("INFO", "开始生成地牢", { width: this.width, height: this.height });
    
    // 初始化地图 (0=墙, 1=地板)
    this.tiles = Array.from({ length: this.height }, () => 
      Array(this.width).fill(0)
    );
    this.rooms = [];

    // 尝试放置房间
    const maxAttempts = CONFIG.DUNGEON.MAX_ROOMS * 3;
    for (let i = 0; i < maxAttempts; i++) {
      if (this.rooms.length >= CONFIG.DUNGEON.MAX_ROOMS) break;
      
      const room = this.generateRandomRoom();
      if (!this.roomOverlaps(room)) {
        this.rooms.push(room);
        this.carveRoom(room);
      }
    }

    // 连接所有房间
    for (let i = 1; i < this.rooms.length; i++) {
      this.connectRooms(this.rooms[i - 1], this.rooms[i]);
    }

    log("INFO", "地牢生成完成", { 
      rooms: this.rooms.length,
      monsters: this.estimateMonsterCount(),
    });

    return {
      tiles: this.tiles,
      rooms: this.rooms,
      width: this.width,
      height: this.height,
      spawn: {
        x: this.rooms[0].cx * TILE_SIZE + TILE_SIZE / 2,
        y: this.rooms[0].cy * TILE_SIZE + TILE_SIZE / 2,
      },
    };
  }

  /** 生成随机房间 */
  generateRandomRoom() {
    const w = randomInt(CONFIG.DUNGEON.ROOM_MIN, CONFIG.DUNGEON.ROOM_MAX);
    const h = randomInt(CONFIG.DUNGEON.ROOM_MIN, CONFIG.DUNGEON.ROOM_MAX);
    const x = randomInt(1, this.width - w - 1);
    const y = randomInt(1, this.height - h - 1);
    
    return {
      x, y, w, h,
      cx: Math.floor(x + w / 2),
      cy: Math.floor(y + h / 2),
    };
  }

  /** 检查房间是否重叠 */
  roomOverlaps(room) {
    return this.rooms.some(r => 
      room.x - 1 < r.x + r.w &&
      room.x + room.w + 1 > r.x &&
      room.y - 1 < r.y + r.h &&
      room.y + room.h + 1 > r.y
    );
  }

  /** 挖掘房间 */
  carveRoom(room) {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        this.tiles[y][x] = 1;
      }
    }
  }

  /** 连接两个房间 */
  connectRooms(roomA, roomB) {
    let x = roomA.cx;
    let y = roomA.cy;
    const targetX = roomB.cx;
    const targetY = roomB.cy;

    // 水平移动
    while (x !== targetX) {
      this.tiles[y][x] = 1;
      if (this.tiles[y + 1]) this.tiles[y + 1][x] = 1;
      x += x < targetX ? 1 : -1;
    }

    // 垂直移动
    while (y !== targetY) {
      this.tiles[y][x] = 1;
      if (this.tiles[y][x + 1] !== undefined) this.tiles[y][x + 1] = 1;
      y += y < targetY ? 1 : -1;
    }
  }

  /** 估算怪物数量 */
  estimateMonsterCount() {
    return (this.rooms.length - 1) * 3; // 平均每个房间3个怪
  }
}

// ============================================================
// 怪物生成器 Monster Spawner
// ============================================================

/**
 * 怪物生成和管理
 */
class MonsterSpawner {
  constructor(dungeon) {
    this.dungeon = dungeon;
  }

  /**
   * 生成所有怪物
   * @returns {Array} 怪物列表
   */
  spawnAll() {
    const monsters = [];
    const normalTypes = Object.keys(MONSTER_TYPES).filter(
      type => !MONSTER_TYPES[type].isBoss
    );

    // 每个房间(除了出生点)生成怪物
    for (let i = 1; i < this.dungeon.rooms.length; i++) {
      const room = this.dungeon.rooms[i];
      const count = randomInt(2, 5);
      const isLastRoom = i === this.dungeon.rooms.length - 1;

      for (let j = 0; j < count; j++) {
        // 最后一个房间生成Boss
        const type = (isLastRoom && j === 0) 
          ? "dragon" 
          : randomChoice(normalTypes);

        const template = MONSTER_TYPES[type];
        const monster = this.createMonster(type, template, room);
        monsters.push(monster);
      }
    }

    log("INFO", "怪物生成完成", { total: monsters.length });
    return monsters;
  }

  /** 创建单个怪物 */
  createMonster(type, template, room) {
    return {
      id: genId(),
      type,
      name: template.name,
      nameEn: template.nameEn,
      x: (room.x + randomInt(1, room.w - 2)) * TILE_SIZE + TILE_SIZE / 2,
      y: (room.y + randomInt(1, room.h - 2)) * TILE_SIZE + TILE_SIZE / 2,
      hp: template.hp,
      maxHp: template.hp,
      attack: template.attack,
      defense: template.defense,
      speed: template.speed,
      range: template.range,
      color: template.color,
      xp: template.xp,
      size: template.size,
      isBoss: template.isBoss,
      alive: true,
      targetId: null,
      state: "idle", // idle, chase, attack, patrol
      attackCooldown: 0,
      roomId: this.dungeon.rooms.indexOf(room),
      // 巡逻相关
      patrolX: 0,
      patrolY: 0,
      patrolTimer: 0,
    };
  }
}

// ============================================================
// 游戏状态管理器 Game State Manager
// ============================================================

/**
 * 管理整个游戏状态
 */
class GameState {
  constructor() {
    this.players = new Map();
    this.monsters = [];
    this.projectiles = [];
    this.lootDrops = [];
    this.dungeon = null;
    this.tick = 0;
    this.chatHistory = [];
    this.startTime = Date.now();
  }

  /** 初始化游戏世界 */
  init() {
    const generator = new DungeonGenerator(
      CONFIG.DUNGEON.WIDTH,
      CONFIG.DUNGEON.HEIGHT
    );
    this.dungeon = generator.generate();

    const spawner = new MonsterSpawner(this.dungeon);
    this.monsters = spawner.spawnAll();

    log("INFO", "游戏世界初始化完成", {
      dungeon: `${CONFIG.DUNGEON.WIDTH}x${CONFIG.DUNGEON.HEIGHT}`,
      monsters: this.monsters.length,
    });
  }

  /**
   * 添加玩家
   * @param {number} id - 玩家ID
   * @param {string} name - 玩家名字
   * @param {string} classId - 职业ID
   * @returns {Object|null} 玩家对象
   */
  addPlayer(id, name, classId) {
    const cls = CLASSES[classId];
    if (!cls) {
      log("WARN", "无效的职业ID", { classId });
      return null;
    }

    // 验证名字
    const sanitizedName = name
      .substring(0, CONFIG.SECURITY.MAX_NAME_LENGTH)
      .replace(/[<>]/g, "");

    const player = {
      id,
      name: sanitizedName,
      classId,
      className: cls.name,
      classIcon: cls.icon,
      
      // 位置
      x: this.dungeon.spawn.x + randomFloat(-30, 30),
      y: this.dungeon.spawn.y + randomFloat(-30, 30),
      
      // 属性
      hp: cls.maxHp,
      maxHp: cls.maxHp,
      mp: cls.maxMp,
      maxMp: cls.maxMp,
      attack: cls.attack,
      defense: cls.defense,
      speed: cls.speed,
      range: cls.range,
      color: cls.color,
      
      // 经验和等级
      level: 1,
      xp: 0,
      xpToNext: 50,
      
      // 货币
      gold: 0,
      
      // 方向和输入
      direction: { x: 0, y: 1 },
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
      
      // 状态
      alive: true,
      respawnTimer: 0,
      
      // 背包和装备
      inventory: [
        { type: "potion", name: "小型生命药水", heal: 30, count: 3, tier: 1 },
      ],
      equipment: { weapon: null, armor: null, accessory: null },
      
      // 技能
      skills: cls.skills.map(s => ({ ...s, currentCooldown: 0 })),
      
      // 护盾和Buff
      shield: 0,
      shieldTimer: 0,
      buffs: [],
      
      // 统计
      kills: 0,
      deaths: 0,
      damageDealt: 0,
      
      // 速率限制
      messageCount: 0,
      lastMessageTime: Date.now(),
    };

    this.players.set(id, player);
    log("INFO", "玩家加入", { id, name: sanitizedName, classId });
    
    return player;
  }

  /**
   * 移除玩家
   * @param {number} id - 玩家ID
   */
  removePlayer(id) {
    const player = this.players.get(id);
    if (player) {
      log("INFO", "玩家离开", { id, name: player.name });
      this.players.delete(id);
    }
  }

  /**
   * 更新游戏状态
   * @param {number} deltaTime - 时间增量(ms)
   */
  update(deltaTime) {
    const dt = deltaTime / 1000;
    this.tick++;

    // 更新所有玩家
    for (const [id, player] of this.players) {
      this.updatePlayer(player, dt);
    }

    // 更新所有怪物
    for (const monster of this.monsters) {
      if (monster.alive) {
        this.updateMonster(monster, dt);
      }
    }

    // 更新投射物
    this.updateProjectiles(dt);

    // 更新掉落物
    this.updateLootDrops(dt);

    // 检测掉落物拾取
    this.checkLootPickups();
  }

  /** 更新玩家状态 */
  updatePlayer(player, dt) {
    // 死亡状态处理
    if (!player.alive) {
      player.respawnTimer -= dt;
      if (player.respawnTimer <= 0) {
        this.respawnPlayer(player);
      }
      return;
    }

    // 回蓝
    player.mp = Math.min(
      player.maxMp,
      player.mp + CONFIG.GAMEPLAY.MANA_REGEN_RATE * dt
    );

    // 技能冷却
    for (const skill of player.skills) {
      if (skill.currentCooldown > 0) {
        skill.currentCooldown = Math.max(0, skill.currentCooldown - dt);
      }
    }

    // Buff计时
    player.buffs = player.buffs.filter(buff => {
      buff.duration -= dt;
      return buff.duration > 0;
    });

    // 护盾计时
    if (player.shieldTimer > 0) {
      player.shieldTimer -= dt;
      if (player.shieldTimer <= 0) {
        player.shield = 0;
      }
    }

    // 处理移动
    this.handlePlayerMovement(player, dt);

    // 处理攻击
    if (player.input.attack) {
      this.handlePlayerAttack(player);
    }

    // 处理技能
    if (player.input.skill >= 0) {
      this.handlePlayerSkill(player, player.input.skill);
      player.input.skill = -1;
    }
  }

  /** 处理玩家移动 */
  handlePlayerMovement(player, dt) {
    const { input } = player;
    let dx = 0;
    let dy = 0;

    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;

    // 对角线移动标准化
    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    if (dx !== 0 || dy !== 0) {
      player.direction = { x: dx, y: dy };
      
      const speed = player.speed * dt;
      const newX = player.x + dx * speed;
      const newY = player.y + dy * speed;

      // 碰撞检测
      if (this.canMoveTo(newX, player.y, 14)) {
        player.x = newX;
      }
      if (this.canMoveTo(player.x, newY, 14)) {
        player.y = newY;
      }

      // 边界限制
      player.x = clamp(player.x, 20, CONFIG.DUNGEON.WIDTH * TILE_SIZE - 20);
      player.y = clamp(player.y, 20, CONFIG.DUNGEON.HEIGHT * TILE_SIZE - 20);
    }
  }

  /** 处理玩家攻击 */
  handlePlayerAttack(player) {
    const skill = player.skills[0];
    if (skill.currentCooldown > 0) return;

    skill.currentCooldown = skill.cooldown;

    const totalAttack = this.calculatePlayerAttack(player);

    // 对范围内怪物造成伤害
    for (const monster of this.monsters) {
      if (!monster.alive) continue;
      if (distance(player, monster) < player.range + monster.size) {
        this.damageMonster(monster, totalAttack, player.id);
      }
    }
  }

  /** 处理玩家技能 */
  handlePlayerSkill(player, skillIndex) {
    const skill = player.skills[skillIndex + 1];
    if (!skill || skill.currentCooldown > 0 || player.mp < skill.mpCost) {
      return;
    }

    skill.currentCooldown = skill.cooldown;
    player.mp -= skill.mpCost;

    // 治疗技能
    if (skill.id === "heal") {
      const healAmount = 50 + player.level * 5;
      player.hp = Math.min(player.maxHp, player.hp + healAmount);
      return;
    }

    // Buff技能
    if (skill.id === "war_cry") {
      player.buffs.push({
        attack: skill.buff.attack,
        duration: skill.buff.duration,
      });
      return;
    }

    // 护盾技能
    if (skill.id === "barrier") {
      player.shield = skill.shield + player.level * 5;
      player.shieldTimer = skill.duration;
      return;
    }

    // 陷阱技能
    if (skill.id === "trap") {
      this.projectiles.push({
        id: genId(),
        ownerId: player.id,
        x: player.x + player.direction.x * skill.range,
        y: player.y + player.direction.y * skill.range,
        dx: 0,
        dy: 0,
        speed: 0,
        damage: skill.damage + player.attack,
        life: skill.duration,
        targetType: "monster",
        isTrap: true,
        slow: skill.slow,
      });
      return;
    }

    // 投射物技能
    this.createProjectile(player, skill);
  }

  /** 创建投射物 */
  createProjectile(player, skill) {
    const totalAttack = this.calculatePlayerAttack(player);
    const baseAngle = Math.atan2(player.direction.y, player.direction.x);
    const projectileCount = skill.projectiles || 1;
    const spreadAngle = skill.spread ? (skill.spread * Math.PI / 180) : 0;

    for (let i = 0; i < projectileCount; i++) {
      const angle = baseAngle + (spreadAngle 
        ? ((i - (projectileCount - 1) / 2) * spreadAngle) 
        : 0);

      this.projectiles.push({
        id: genId(),
        ownerId: player.id,
        x: player.x,
        y: player.y,
        dx: Math.cos(angle),
        dy: Math.sin(angle),
        speed: skill.speed || 250,
        damage: skill.damage + totalAttack,
        life: 2,
        targetType: "monster",
        color: player.color,
      });
    }
  }

  /** 计算玩家总攻击力 */
  calculatePlayerAttack(player) {
    const weaponAttack = player.equipment.weapon?.attack || 0;
    const buffAttack = player.buffs.reduce((sum, b) => sum + (b.attack || 0), 0);
    return player.attack + weaponAttack + buffAttack;
  }

  /** 检测是否可以移动到指定位置 */
  canMoveTo(x, y, radius) {
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);

    // 检查周围9个格子
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tx = tileX + dx;
        const ty = tileY + dy;

        // 边界检查
        if (tx < 0 || ty < 0 || tx >= CONFIG.DUNGEON.WIDTH || ty >= CONFIG.DUNGEON.HEIGHT) {
          continue;
        }

        // 墙壁碰撞检测
        if (this.dungeon.tiles[ty][tx] === 0) {
          const wallX = tx * TILE_SIZE;
          const wallY = ty * TILE_SIZE;
          const closestX = clamp(x, wallX, wallX + TILE_SIZE);
          const closestY = clamp(y, wallY, wallY + TILE_SIZE);

          if (distance({ x, y }, { x: closestX, y: closestY }) < radius) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /** 对怪物造成伤害 */
  damageMonster(monster, damage, attackerId) {
    const actualDamage = Math.max(1, damage - monster.defense);
    monster.hp -= actualDamage;
    monster.targetId = attackerId;
    monster.state = "chase";

    const attacker = this.players.get(attackerId);
    if (attacker) {
      attacker.damageDealt += actualDamage;
    }

    // 怪物死亡
    if (monster.hp <= 0) {
      monster.alive = false;
      this.onMonsterDeath(monster, attackerId);
    }
  }

  /** 对玩家造成伤害 */
  damagePlayer(player, damage, sourceId) {
    let actualDamage = Math.max(
      1,
      damage - player.defense - (player.equipment.armor?.defense || 0)
    );

    // 护盾吸收
    if (player.shield > 0) {
      const absorbed = Math.min(player.shield, actualDamage);
      player.shield -= absorbed;
      actualDamage -= absorbed;
    }

    player.hp -= actualDamage;

    // 玩家死亡
    if (player.hp <= 0) {
      player.hp = 0;
      player.alive = false;
      player.respawnTimer = CONFIG.GAMEPLAY.RESPAWN_TIME;
      player.deaths++;

      const killer = this.players.get(sourceId);
      if (killer) {
        killer.kills++;
      }

      log("INFO", "玩家死亡", {
        victim: player.name,
        killer: killer?.name || "怪物",
      });
    }
  }

  /** 复活玩家 */
  respawnPlayer(player) {
    player.alive = true;
    player.hp = player.maxHp;
    player.mp = player.maxMp;
    player.x = this.dungeon.spawn.x;
    player.y = this.dungeon.spawn.y;
    player.shield = 0;
    player.shieldTimer = 0;
    player.buffs = [];
  }

  /** 怪物死亡处理 */
  onMonsterDeath(monster, killerId) {
    const killer = this.players.get(killerId);
    if (!killer) return;

    // 经验奖励
    killer.xp += monster.xp;
    
    // 升级检查
    while (killer.xp >= killer.xpToNext) {
      killer.xp -= killer.xpToNext;
      killer.level++;
      killer.xpToNext = Math.floor(
        killer.xpToNext * CONFIG.GAMEPLAY.XP_SCALE_FACTOR
      );
      
      // 属性提升
      killer.maxHp += 15;
      killer.hp = killer.maxHp;
      killer.maxMp += 10;
      killer.mp = killer.maxMp;
      killer.attack += 3;
      killer.defense += 2;

      log("INFO", "玩家升级", {
        name: killer.name,
        level: killer.level,
      });
    }

    // 掉落物生成
    this.generateLoot(monster, killer);
  }

  /** 生成掉落物 */
  generateLoot(monster, killer) {
    const lootTable = LOOT_TABLES[monster.type];
    if (!lootTable) return;

    for (const drop of lootTable) {
      if (Math.random() < drop.chance) {
        const item = this.createItem(drop.type, drop.tier);
        if (item) {
          this.lootDrops.push({
            id: genId(),
            x: monster.x + randomFloat(-20, 20),
            y: monster.y + randomFloat(-20, 20),
            ...item,
            life: CONFIG.GAMEPLAY.LOOT_LIFETIME,
          });
        }
      }
    }

    // 金币掉落
    if (Math.random() < 0.7) {
      const goldAmount = randomInt(1, 10) * (monster.isBoss ? 10 : 1);
      killer.gold += goldAmount;
    }
  }

  /** 创建物品 */
  createItem(type, tier) {
    const templates = ITEM_TEMPLATES[type]?.[tier];
    if (!templates || templates.length === 0) return null;

    const template = randomChoice(templates);
    const rarity = this.rollRarity(tier);

    return {
      type,
      tier,
      rarity: rarity.name,
      rarityEn: rarity.nameEn,
      rarityColor: rarity.color,
      ...template,
      id: genId(),
    };
  }

  /** 随机稀有度 */
  rollRarity(tier) {
    const roll = Math.random();
    
    if (tier === 3 && roll < 0.05) return RARITY.legendary;
    if (tier >= 2 && roll < 0.15) return RARITY.epic;
    if (roll < 0.3) return RARITY.rare;
    if (roll < 0.6) return RARITY.uncommon;
    
    return RARITY.common;
  }

  /** 拾取掉落物 */
  pickupLoot(player, loot) {
    if (loot.type === "gold") {
      player.gold += loot.amount;
      return;
    }

    if (loot.type === "potion") {
      const existing = player.inventory.find(
        i => i.type === "potion" && i.tier === loot.tier
      );
      
      if (existing) {
        existing.count++;
      } else {
        player.inventory.push({ ...loot, count: 1 });
      }
      return;
    }

    // 装备类物品
    player.inventory.push({ ...loot, count: 1 });
  }

  /** 更新怪物AI */
  updateMonster(monster, dt) {
    monster.attackCooldown = Math.max(0, monster.attackCooldown - dt);

    // 寻找最近的玩家
    let nearestPlayer = null;
    let nearestDist = CONFIG.GAMEPLAY.MONSTER_VISION_RANGE;

    for (const [id, player] of this.players) {
      if (!player.alive) continue;
      const dist = distance(monster, player);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestPlayer = player;
      }
    }

    // 没有目标 - 巡逻
    if (!nearestPlayer) {
      this.monsterPatrol(monster, dt);
      return;
    }

    // 在攻击范围内 - 攻击
    if (nearestDist <= monster.range + 10) {
      this.monsterAttack(monster, nearestPlayer, dt);
      return;
    }

    // 追击目标
    this.monsterChase(monster, nearestPlayer, dt);
  }

  /** 怪物巡逻行为 */
  monsterPatrol(monster, dt) {
    monster.state = "idle";
    monster.patrolTimer -= dt;

    if (monster.patrolTimer <= 0) {
      monster.patrolX = monster.x + randomFloat(-100, 100);
      monster.patrolY = monster.y + randomFloat(-100, 100);
      monster.patrolTimer = randomFloat(2, 5);
    }

    const dx = monster.patrolX - monster.x;
    const dy = monster.patrolY - monster.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      const speed = monster.speed * 0.5 * dt;
      const newX = monster.x + (dx / dist) * speed;
      const newY = monster.y + (dy / dist) * speed;

      if (this.canMoveTo(newX, monster.y, monster.size * 0.8)) {
        monster.x = newX;
      }
      if (this.canMoveTo(monster.x, newY, monster.size * 0.8)) {
        monster.y = newY;
      }
    }
  }

  /** 怪物追击行为 */
  monsterChase(monster, target, dt) {
    monster.state = "chase";
    
    const dx = target.x - monster.x;
    const dy = target.y - monster.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = monster.speed * dt;

    const newX = monster.x + (dx / dist) * speed;
    const newY = monster.y + (dy / dist) * speed;

    if (this.canMoveTo(newX, monster.y, monster.size * 0.8)) {
      monster.x = newX;
    }
    if (this.canMoveTo(monster.x, newY, monster.size * 0.8)) {
      monster.y = newY;
    }
  }

  /** 怪物攻击行为 */
  monsterAttack(monster, target, dt) {
    monster.state = "attack";
    
    if (monster.attackCooldown <= 0) {
      this.damagePlayer(target, monster.attack, monster.id);
      monster.attackCooldown = 1;
    }
  }

  /** 更新投射物 */
  updateProjectiles(dt) {
    this.projectiles = this.projectiles.filter(proj => {
      // 更新位置
      proj.x += proj.dx * proj.speed * dt;
      proj.y += proj.dy * proj.speed * dt;
      proj.life -= dt;

      // 生命周期结束
      if (proj.life <= 0) return false;

      // 碰到墙壁
      if (!this.canMoveTo(proj.x, proj.y, 4)) return false;

      // 碰撞检测
      if (proj.targetType === "monster") {
        for (const monster of this.monsters) {
          if (!monster.alive) continue;
          if (distance(proj, monster) < monster.size + 8) {
            this.damageMonster(monster, proj.damage, proj.ownerId);
            return false;
          }
        }
      } else if (proj.targetType === "player") {
        for (const [id, player] of this.players) {
          if (!player.alive || id === proj.ownerId) continue;
          if (distance(proj, player) < 16) {
            this.damagePlayer(player, proj.damage, proj.ownerId);
            return false;
          }
        }
      }

      return true;
    });
  }

  /** 更新掉落物 */
  updateLootDrops(dt) {
    this.lootDrops = this.lootDrops.filter(loot => {
      loot.life -= dt;
      return loot.life > 0;
    });
  }

  /** 检测掉落物拾取 */
  checkLootPickups() {
    for (const [id, player] of this.players) {
      if (!player.alive) continue;

      this.lootDrops = this.lootDrops.filter(loot => {
        if (distance(player, loot) < CONFIG.GAMEPLAY.PICKUP_RANGE) {
          this.pickupLoot(player, loot);
          return false;
        }
        return true;
      });
    }
  }

  /**
   * 获取游戏状态快照
   * @returns {Object} 状态快照
   */
  getSnapshot() {
    const players = [];
    for (const [id, p] of this.players) {
      players.push({
        id: p.id,
        name: p.name,
        classId: p.classId,
        className: p.className,
        classIcon: p.classIcon,
        x: Math.round(p.x),
        y: Math.round(p.y),
        hp: p.hp,
        maxHp: p.maxHp,
        mp: p.mp,
        maxMp: p.maxMp,
        level: p.level,
        xp: p.xp,
        xpToNext: p.xpToNext,
        gold: p.gold,
        color: p.color,
        alive: p.alive,
        direction: p.direction,
        shield: p.shield,
        buffs: p.buffs,
        kills: p.kills,
        deaths: p.deaths,
        damageDealt: p.damageDealt,
        inventory: p.inventory,
        equipment: p.equipment,
        skills: p.skills.map(s => ({
          id: s.id,
          name: s.name,
          icon: s.icon,
          currentCooldown: s.currentCooldown,
          cooldown: s.cooldown,
          mpCost: s.mpCost,
        })),
        respawnTimer: p.respawnTimer,
      });
    }

    const monsters = this.monsters
      .filter(m => m.alive)
      .map(m => ({
        id: m.id,
        type: m.type,
        name: m.name,
        x: Math.round(m.x),
        y: Math.round(m.y),
        hp: m.hp,
        maxHp: m.maxHp,
        color: m.color,
        size: m.size,
        state: m.state,
        isBoss: m.isBoss,
      }));

    const projectiles = this.projectiles.map(p => ({
      id: p.id,
      x: Math.round(p.x),
      y: Math.round(p.y),
      color: p.color || "#fff",
      isTrap: p.isTrap || false,
    }));

    const loot = this.lootDrops.map(l => ({
      id: l.id,
      x: Math.round(l.x),
      y: Math.round(l.y),
      type: l.type,
      name: l.name,
      rarity: l.rarity,
      rarityColor: l.rarityColor,
    }));

    return {
      players,
      monsters,
      projectiles,
      loot,
      tick: this.tick,
    };
  }

  /**
   * 获取服务器统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      players: this.players.size,
      monsters: this.monsters.filter(m => m.alive).length,
      loot: this.lootDrops.length,
      projectiles: this.projectiles.length,
      tick: this.tick,
    };
  }
}

// ============================================================
// HTTP 服务器 HTTP Server
// ============================================================

const ROOT_DIR = path.resolve(__dirname, "..");

const httpServer = http.createServer((req, res) => {
  // 健康检查端点
  if (req.url === "/health") {
    const stats = gameState.getStats();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(stats));
    return;
  }

  // 统计信息端点
  if (req.url === "/stats") {
    const stats = gameState.getStats();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(stats, null, 2));
    return;
  }

  // 静态文件服务
  let filePath = req.url === "/" ? "/client/index.html" : req.url;
  filePath = path.join(ROOT_DIR, filePath);

  // 安全检查 - 防止目录遍历
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        res.writeHead(404);
        res.end("Not Found");
      } else {
        res.writeHead(500);
        res.end("Internal Server Error");
        log("ERROR", "文件读取错误", { path: filePath, error: err.message });
      }
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600",
    });
    res.end(data);
  });
});

// ============================================================
// WebSocket 服务器 WebSocket Server
// ============================================================

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws, req) => {
  // 检查连接数限制
  if (gameState.players.size >= CONFIG.MAX_PLAYERS) {
    ws.close(1000, "服务器已满");
    log("WARN", "服务器已满，拒绝连接");
    return;
  }

  const playerId = genId();
  const clientIp = req.socket.remoteAddress;
  let player = null;

  log("INFO", "新连接", { playerId, ip: clientIp });

  // 速率限制
  let messageCount = 0;
  let lastResetTime = Date.now();

  ws.on("message", (data) => {
    try {
      // 速率限制检查
      const now = Date.now();
      if (now - lastResetTime > CONFIG.SECURITY.RATE_LIMIT_WINDOW) {
        messageCount = 0;
        lastResetTime = now;
      }
      messageCount++;
      
      if (messageCount > CONFIG.SECURITY.RATE_LIMIT_MESSAGES) {
        log("WARN", "速率限制触发", { playerId });
        return;
      }

      const msg = JSON.parse(data);
      handleMessage(ws, playerId, msg);
    } catch (e) {
      log("WARN", "无效消息", { playerId, error: e.message });
    }
  });

  ws.on("close", () => {
    if (player) {
      broadcastChat(`${player.name} 离开了地牢`, "system");
      gameState.removePlayer(playerId);
    }
    log("INFO", "连接断开", { playerId });
  });

  ws.on("error", (err) => {
    log("ERROR", "WebSocket错误", { playerId, error: err.message });
  });

  function handleMessage(ws, playerId, msg) {
    switch (msg.type) {
      case "join": {
        player = gameState.addPlayer(playerId, msg.name, msg.classId);
        if (player) {
          // 发送欢迎消息和游戏数据
          ws.send(JSON.stringify({
            type: "welcome",
            playerId,
            dungeon: gameState.dungeon,
            classes: Object.fromEntries(
              Object.entries(CLASSES).map(([key, cls]) => [
                key,
                {
                  name: cls.name,
                  nameEn: cls.nameEn,
                  description: cls.description,
                  color: cls.color,
                  icon: cls.icon,
                  maxHp: cls.maxHp,
                  maxMp: cls.maxMp,
                  attack: cls.attack,
                  defense: cls.defense,
                  speed: cls.speed,
                  skills: cls.skills.map(s => ({
                    id: s.id,
                    name: s.name,
                    nameEn: s.nameEn,
                    description: s.description,
                    icon: s.icon,
                    damage: s.damage,
                    cooldown: s.cooldown,
                    mpCost: s.mpCost,
                  })),
                },
              ])
            ),
          }));

          // 广播加入消息
          broadcastChat(`${player.name} 加入了地牢`, "system");
        }
        break;
      }

      case "input": {
        if (player) {
          player.input = { ...player.input, ...msg.input };
        }
        break;
      }

      case "useItem": {
        if (player && typeof msg.index === "number") {
          const item = player.inventory[msg.index];
          if (item && item.type === "potion") {
            player.hp = Math.min(player.maxHp, player.hp + item.heal);
            item.count--;
            if (item.count <= 0) {
              player.inventory.splice(msg.index, 1);
            }
          }
        }
        break;
      }

      case "equip": {
        if (player && typeof msg.index === "number") {
          const item = player.inventory[msg.index];
          if (!item) break;

          if (["weapon", "armor", "accessory"].includes(item.type)) {
            // 卸下当前装备
            const current = player.equipment[item.type];
            if (current) {
              player.inventory.push({ ...current, count: 1 });
            }

            // 装上新装备
            player.equipment[item.type] = { ...item };
            player.inventory.splice(msg.index, 1);
          }
        }
        break;
      }

      case "chat": {
        if (player && msg.text) {
          // 速率限制检查
          const now = Date.now();
          if (now - player.lastMessageTime < 1000) {
            player.messageCount++;
            if (player.messageCount > 3) return;
          } else {
            player.messageCount = 0;
            player.lastMessageTime = now;
          }

          const text = msg.text
            .substring(0, CONFIG.SECURITY.MAX_CHAT_LENGTH)
            .replace(/[<>]/g, "");
          
          broadcastChat(`${player.name}: ${text}`, "player", player.color);
        }
        break;
      }
    }
  }
});

/** 广播聊天消息 */
function broadcastChat(text, type, color) {
  const msg = JSON.stringify({
    type: "chat",
    text,
    msgType: type,
    color,
    time: Date.now(),
  });

  // 保存到历史记录
  gameState.chatHistory.push({ text, msgType: type, color, time: Date.now() });
  if (gameState.chatHistory.length > 100) {
    gameState.chatHistory.shift();
  }

  // 广播给所有客户端
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(msg);
    }
  });
}

/** 广播游戏状态 */
function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(msg);
    }
  });
}

// ============================================================
// 游戏主循环 Game Main Loop
// ============================================================

const gameState = new GameState();
gameState.init();

let lastTick = Date.now();
let lastSnapshot = Date.now();

const gameLoop = setInterval(() => {
  const now = Date.now();
  const deltaTime = now - lastTick;
  lastTick = now;

  // 更新游戏状态
  gameState.update(deltaTime);

  // 定期发送快照
  if (now - lastSnapshot >= SNAPSHOT_MS) {
    lastSnapshot = now;
    const snapshot = gameState.getSnapshot();
    broadcast({ type: "snapshot", data: snapshot });
  }
}, DT);

// ============================================================
// 优雅关闭 Graceful Shutdown
// ============================================================

function shutdown(signal) {
  log("INFO", `收到 ${signal} 信号，正在关闭...`);
  
  // 停止游戏循环
  clearInterval(gameLoop);
  
  // 关闭所有WebSocket连接
  wss.clients.forEach(client => {
    client.close(1001, "服务器关闭");
  });
  
  // 关闭HTTP服务器
  httpServer.close(() => {
    log("INFO", "服务器已关闭");
    process.exit(0);
  });

  // 强制关闭超时
  setTimeout(() => {
    log("WARN", "强制关闭");
    process.exit(1);
  }, 5000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// ============================================================
// 启动服务器 Start Server
// ============================================================

httpServer.listen(CONFIG.PORT, CONFIG.HOST, () => {
  log("INFO", "深渊地牢服务器已启动", {
    host: CONFIG.HOST,
    port: CONFIG.PORT,
    dungeon: `${CONFIG.DUNGEON.WIDTH}x${CONFIG.DUNGEON.HEIGHT}`,
    monsters: gameState.monsters.length,
  });

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           🏰 深渊地牢服务器 | Abyss Dungeon Server         ║
╠═══════════════════════════════════════════════════════════╣
║  📡 地址: http://${CONFIG.HOST}:${CONFIG.PORT}                      ║
║  🗺️  地牢: ${CONFIG.DUNGEON.WIDTH}x${CONFIG.DUNGEON.HEIGHT}                                        ║
║  👾 怪物: ${gameState.monsters.length}                                          ║
║  👥 最大玩家: ${CONFIG.MAX_PLAYERS}                                     ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

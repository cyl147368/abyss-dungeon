#!/usr/bin/env node
"use strict";

/**
 * 深渊地牢 - 游戏服务器
 * Abyss Dungeon - Game Server
 * 
 * 服务器权威架构，处理所有游戏逻辑
 * Server-authoritative architecture, handles all game logic
 */

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { WebSocketServer } = require("ws");
const crypto = require("node:crypto");

// ============================================================
// 配置 Configuration
// ============================================================
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const TICK_RATE = 20;
const SNAPSHOT_RATE = 10;
const DT = 1000 / TICK_RATE;
const SNAPSHOT_MS = 1000 / SNAPSHOT_RATE;
const MAX_PLAYERS = 50;

// 地牢配置 Dungeon Config
const DUNGEON_WIDTH = 80;
const DUNGEON_HEIGHT = 60;
const TILE_SIZE = 32;
const ROOM_MIN = 5;
const ROOM_MAX = 12;
const MAX_ROOMS = 12;

// MIME 类型
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// ============================================================
// 职业配置 Class Configurations
// ============================================================
const CLASSES = {
  warrior: {
    name: "战士",
    nameEn: "Warrior",
    maxHp: 200,
    maxMp: 50,
    attack: 25,
    defense: 20,
    speed: 150,
    range: 40,
    color: "#e74c3c",
    skills: [
      { id: "slash", name: "横扫斩", nameEn: "Slash", damage: 35, cooldown: 1.5, mpCost: 10, range: 60, aoe: true },
      { id: "shield_bash", name: "盾击", nameEn: "Shield Bash", damage: 20, cooldown: 3, mpCost: 15, range: 45, stun: 1.5 },
      { id: "war_cry", name: "战吼", nameEn: "War Cry", damage: 0, cooldown: 8, mpCost: 25, range: 0, buff: { attack: 15, duration: 5 } },
    ]
  },
  mage: {
    name: "法师",
    nameEn: "Mage",
    maxHp: 100,
    maxMp: 200,
    attack: 35,
    defense: 5,
    speed: 130,
    range: 200,
    color: "#3498db",
    skills: [
      { id: "fireball", name: "火球术", nameEn: "Fireball", damage: 50, cooldown: 2, mpCost: 20, range: 250, speed: 300 },
      { id: "ice_wall", name: "冰墙", nameEn: "Ice Wall", damage: 15, cooldown: 5, mpCost: 30, range: 150, slow: 0.5, duration: 3 },
      { id: "lightning", name: "闪电链", nameEn: "Chain Lightning", damage: 40, cooldown: 6, mpCost: 40, range: 200, chain: 3 },
    ]
  },
  archer: {
    name: "弓箭手",
    nameEn: "Archer",
    maxHp: 120,
    maxMp: 80,
    attack: 30,
    defense: 10,
    speed: 180,
    range: 300,
    color: "#2ecc71",
    skills: [
      { id: "power_shot", name: "蓄力射击", nameEn: "Power Shot", damage: 60, cooldown: 3, mpCost: 15, range: 350, speed: 400 },
      { id: "multi_shot", name: "多重射击", nameEn: "Multi Shot", damage: 20, cooldown: 4, mpCost: 20, range: 250, projectiles: 5, spread: 30 },
      { id: "trap", name: "陷阱", nameEn: "Trap", damage: 30, cooldown: 8, mpCost: 25, range: 100, duration: 10, slow: 0.7 },
    ]
  },
  priest: {
    name: "牧师",
    nameEn: "Priest",
    maxHp: 130,
    maxMp: 180,
    attack: 15,
    defense: 12,
    speed: 140,
    range: 180,
    color: "#f39c12",
    skills: [
      { id: "heal", name: "治愈术", nameEn: "Heal", damage: -50, cooldown: 3, mpCost: 25, range: 0, targetAlly: true },
      { id: "holy_light", name: "圣光", nameEn: "Holy Light", damage: 35, cooldown: 2, mpCost: 15, range: 200, speed: 250 },
      { id: "barrier", name: "护盾", nameEn: "Barrier", damage: 0, cooldown: 10, mpCost: 35, range: 0, shield: 80, duration: 5 },
    ]
  },
};

// ============================================================
// 怪物配置 Monster Configurations
// ============================================================
const MONSTER_TYPES = {
  slime: { name: "史莱姆", hp: 40, attack: 8, defense: 2, speed: 60, range: 30, color: "#27ae60", xp: 15, size: 14 },
  skeleton: { name: "骷髅战士", hp: 80, attack: 15, defense: 8, speed: 80, range: 35, color: "#bdc3c7", xp: 30, size: 16 },
  goblin: { name: "哥布林", hp: 60, attack: 12, defense: 5, speed: 120, range: 30, color: "#8e44ad", xp: 25, size: 14 },
  demon: { name: "恶魔", hp: 150, attack: 25, defense: 15, speed: 90, range: 40, color: "#c0392b", xp: 60, size: 20 },
  dragon: { name: "巨龙", hp: 500, attack: 40, defense: 25, speed: 70, range: 60, color: "#e67e22", xp: 200, size: 32, isBoss: true },
};

// ============================================================
// 掉落物配置 Loot Configurations
// ============================================================
const LOOT_TABLE = {
  slime: [{ type: "potion", chance: 0.3, tier: 1 }],
  skeleton: [{ type: "weapon", chance: 0.15, tier: 1 }, { type: "armor", chance: 0.1, tier: 1 }, { type: "potion", chance: 0.25, tier: 1 }],
  goblin: [{ type: "weapon", chance: 0.15, tier: 1 }, { type: "gold", chance: 0.8, amount: 5 }],
  demon: [{ type: "weapon", chance: 0.2, tier: 2 }, { type: "armor", chance: 0.15, tier: 2 }, { type: "potion", chance: 0.3, tier: 2 }],
  dragon: [{ type: "weapon", chance: 0.5, tier: 3 }, { type: "armor", chance: 0.5, tier: 3 }, { type: "accessory", chance: 0.3, tier: 3 }],
};

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

const RARITY_COLORS = {
  common: { name: "普通", color: "#95a5a6" },
  uncommon: { name: "优秀", color: "#2ecc71" },
  rare: { name: "稀有", color: "#3498db" },
  epic: { name: "史诗", color: "#9b59b6" },
  legendary: { name: "传说", color: "#e67e22" },
};

// ============================================================
// 工具函数 Utility Functions
// ============================================================
let nextId = 1;
function genId() { return nextId++; }

function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function randomFloat(min, max) { return Math.random() * (max - min) + min; }

function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ============================================================
// 地牢生成器 Dungeon Generator
// ============================================================
class DungeonGenerator {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.tiles = [];
    this.rooms = [];
  }

  generate() {
    // 初始化地图 Initialize map (0=墙, 1=地板)
    this.tiles = Array.from({ length: this.height }, () => Array(this.width).fill(0));
    this.rooms = [];

    // 生成房间 Generate rooms
    for (let i = 0; i < MAX_ROOMS * 3; i++) {
      if (this.rooms.length >= MAX_ROOMS) break;
      const w = randomInt(ROOM_MIN, ROOM_MAX);
      const h = randomInt(ROOM_MIN, ROOM_MAX);
      const x = randomInt(1, this.width - w - 1);
      const y = randomInt(1, this.height - h - 1);

      const room = { x, y, w, h, cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2) };

      if (!this.roomOverlaps(room)) {
        this.rooms.push(room);
        this.carveRoom(room);
      }
    }

    // 连接房间 Connect rooms
    for (let i = 1; i < this.rooms.length; i++) {
      this.connectRooms(this.rooms[i - 1], this.rooms[i]);
    }

    return {
      tiles: this.tiles,
      rooms: this.rooms,
      width: this.width,
      height: this.height,
      spawn: { x: this.rooms[0].cx * TILE_SIZE + TILE_SIZE / 2, y: this.rooms[0].cy * TILE_SIZE + TILE_SIZE / 2 },
    };
  }

  roomOverlaps(room) {
    for (const r of this.rooms) {
      if (room.x - 1 < r.x + r.w && room.x + room.w + 1 > r.x &&
        room.y - 1 < r.y + r.h && room.y + room.h + 1 > r.y) {
        return true;
      }
    }
    return false;
  }

  carveRoom(room) {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        this.tiles[y][x] = 1;
      }
    }
  }

  connectRooms(a, b) {
    let x = a.cx, y = a.cy;
    while (x !== b.cx) {
      this.tiles[y][x] = 1;
      this.tiles[y + 1] && (this.tiles[y + 1][x] = 1);
      x += x < b.cx ? 1 : -1;
    }
    while (y !== b.cy) {
      this.tiles[y][x] = 1;
      this.tiles[y][x + 1] !== undefined && (this.tiles[y][x + 1] = 1);
      y += y < b.cy ? 1 : -1;
    }
  }
}

// ============================================================
// 怪物生成器 Monster Spawner
// ============================================================
class MonsterSpawner {
  constructor(dungeon) {
    this.dungeon = dungeon;
    this.spawnQueue = [];
  }

  spawnMonsters() {
    const monsters = [];
    // 每个房间(除了出生点)生成怪物
    for (let i = 1; i < this.dungeon.rooms.length; i++) {
      const room = this.dungeon.rooms[i];
      const count = randomInt(2, 5);
      const types = Object.keys(MONSTER_TYPES);

      for (let j = 0; j < count; j++) {
        const isLastRoom = i === this.dungeon.rooms.length - 1;
        let type;
        if (isLastRoom && j === 0) {
          type = "dragon"; // Boss在最后一个房间
        } else {
          type = randomChoice(types.filter(t => !MONSTER_TYPES[t].isBoss));
        }

        const template = MONSTER_TYPES[type];
        const monster = {
          id: genId(),
          type,
          name: template.name,
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
          isBoss: template.isBoss || false,
          alive: true,
          targetId: null,
          state: "idle", // idle, chase, attack
          attackCooldown: 0,
          roomId: i,
          patrolX: 0,
          patrolY: 0,
          patrolTimer: 0,
        };
        monsters.push(monster);
      }
    }
    return monsters;
  }
}

// ============================================================
// 游戏状态 Game State
// ============================================================
class GameState {
  constructor() {
    this.players = new Map();
    this.monsters = [];
    this.projectiles = [];
    this.lootDrops = [];
    this.dungeon = null;
    this.tick = 0;
    this.chatHistory = [];
  }

  init() {
    const gen = new DungeonGenerator(DUNGEON_WIDTH, DUNGEON_HEIGHT);
    this.dungeon = gen.generate();
    const spawner = new MonsterSpawner(this.dungeon);
    this.monsters = spawner.spawnMonsters();
  }

  addPlayer(id, name, classId) {
    const cls = CLASSES[classId];
    if (!cls) return null;

    const player = {
      id,
      name: name.substring(0, 12),
      classId,
      className: cls.name,
      x: this.dungeon.spawn.x + randomFloat(-30, 30),
      y: this.dungeon.spawn.y + randomFloat(-30, 30),
      hp: cls.maxHp,
      maxHp: cls.maxHp,
      mp: cls.maxMp,
      maxMp: cls.maxMp,
      attack: cls.attack,
      defense: cls.defense,
      speed: cls.speed,
      range: cls.range,
      color: cls.color,
      level: 1,
      xp: 0,
      xpToNext: 50,
      gold: 0,
      direction: { x: 0, y: 1 },
      input: { up: false, down: false, left: false, right: false, attack: false, skill: -1, mouseX: 0, mouseY: 0 },
      alive: true,
      respawnTimer: 0,
      inventory: [
        { type: "potion", name: "小型生命药水", heal: 30, count: 3, tier: 1 },
      ],
      equipment: { weapon: null, armor: null, accessory: null },
      skills: cls.skills.map(s => ({ ...s, currentCooldown: 0 })),
      shield: 0,
      shieldTimer: 0,
      buffs: [],
      kills: 0,
      deaths: 0,
      damageDealt: 0,
      partyId: null,
    };

    this.players.set(id, player);
    return player;
  }

  removePlayer(id) {
    const player = this.players.get(id);
    if (player && player.partyId) {
      // 从队伍中移除
      const party = this.parties?.get(player.partyId);
      if (party) {
        party.members = party.members.filter(m => m !== id);
        if (party.members.length === 0) this.parties?.delete(player.partyId);
      }
    }
    this.players.delete(id);
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    this.tick++;

    // 更新玩家 Update players
    for (const [id, player] of this.players) {
      if (!player.alive) {
        player.respawnTimer -= dt;
        if (player.respawnTimer <= 0) {
          player.alive = true;
          player.hp = player.maxHp;
          player.mp = player.maxMp;
          player.x = this.dungeon.spawn.x;
          player.y = this.dungeon.spawn.y;
          player.shield = 0;
        }
        continue;
      }

      // 回蓝 Mana regen
      player.mp = Math.min(player.maxMp, player.mp + 2 * dt);

      // 技能冷却 Skill cooldowns
      for (const skill of player.skills) {
        if (skill.currentCooldown > 0) skill.currentCooldown -= dt;
      }

      // Buff计时 Buff timers
      player.buffs = player.buffs.filter(b => {
        b.duration -= dt;
        return b.duration > 0;
      });

      // 护盾计时 Shield timer
      if (player.shieldTimer > 0) {
        player.shieldTimer -= dt;
        if (player.shieldTimer <= 0) player.shield = 0;
      }

      // 移动 Movement
      const input = player.input;
      let dx = 0, dy = 0;
      if (input.up) dy -= 1;
      if (input.down) dy += 1;
      if (input.left) dx -= 1;
      if (input.right) dx += 1;

      if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len; dy /= len;
        player.direction = { x: dx, y: dy };

        const speed = player.speed * dt;
        const newX = player.x + dx * speed;
        const newY = player.y + dy * speed;

        // 碰撞检测 Collision detection
        if (this.canMoveTo(newX, player.y, 14)) player.x = newX;
        if (this.canMoveTo(player.x, newY, 14)) player.y = newY;

        // 边界限制 Boundary
        player.x = clamp(player.x, 20, this.dungeon.width * TILE_SIZE - 20);
        player.y = clamp(player.y, 20, this.dungeon.height * TILE_SIZE - 20);
      }

      // 普通攻击 Normal attack
      if (input.attack && player.skills[0].currentCooldown <= 0) {
        this.playerAttack(id);
      }

      // 技能释放 Skill usage
      if (input.skill >= 0) {
        this.playerSkill(id, input.skill);
        input.skill = -1;
      }
    }

    // 更新怪物 Update monsters
    for (const monster of this.monsters) {
      if (!monster.alive) continue;
      this.updateMonsterAI(monster, dt);
    }

    // 更新投射物 Update projectiles
    this.projectiles = this.projectiles.filter(p => {
      p.x += p.dx * p.speed * dt;
      p.y += p.dy * p.speed * dt;
      p.life -= dt;

      if (p.life <= 0) return false;
      if (!this.canMoveTo(p.x, p.y, 4)) return false;

      // 检测碰撞 Check collision
      if (p.targetType === "monster") {
        for (const monster of this.monsters) {
          if (!monster.alive) continue;
          if (distance(p, monster) < monster.size + 8) {
            this.damageMonster(monster, p.damage, p.ownerId);
            return false;
          }
        }
      } else if (p.targetType === "player") {
        for (const [id, player] of this.players) {
          if (!player.alive || id === p.ownerId) continue;
          if (distance(p, player) < 16) {
            this.damagePlayer(player, p.damage, p.ownerId);
            return false;
          }
        }
      }

      return true;
    });

    // 检测掉落物拾取 Check loot pickup
    for (const [id, player] of this.players) {
      if (!player.alive) continue;
      this.lootDrops = this.lootDrops.filter(loot => {
        if (distance(player, loot) < 30) {
          this.pickupLoot(player, loot);
          return false;
        }
        return true;
      });
    }
  }

  canMoveTo(x, y, radius) {
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);

    // 检查周围9个格子
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tx = tileX + dx;
        const ty = tileY + dy;
        if (tx < 0 || ty < 0 || tx >= this.dungeon.width || ty >= this.dungeon.height) continue;
        if (this.dungeon.tiles[ty][tx] === 0) {
          // 检查与墙的碰撞
          const wallX = tx * TILE_SIZE;
          const wallY = ty * TILE_SIZE;
          const closestX = clamp(x, wallX, wallX + TILE_SIZE);
          const closestY = clamp(y, wallY, wallY + TILE_SIZE);
          if (distance({ x, y }, { x: closestX, y: closestY }) < radius) return false;
        }
      }
    }
    return true;
  }

  playerAttack(playerId) {
    const player = this.players.get(playerId);
    if (!player || !player.alive) return;

    const skill = player.skills[0];
    if (skill.currentCooldown > 0) return;

    skill.currentCooldown = skill.cooldown;

    const totalAttack = player.attack + (player.equipment.weapon ? (player.equipment.weapon.attack || 0) : 0)
      + player.buffs.reduce((sum, b) => sum + (b.attack || 0), 0);

    // 对范围内怪物造成伤害
    for (const monster of this.monsters) {
      if (!monster.alive) continue;
      if (distance(player, monster) < player.range + monster.size) {
        this.damageMonster(monster, totalAttack, playerId);
      }
    }
  }

  playerSkill(playerId, skillIndex) {
    const player = this.players.get(playerId);
    if (!player || !player.alive) return;

    // skillIndex 0-2 对应 skills[1-3]（跳过普攻）
    const skill = player.skills[skillIndex + 1];
    if (!skill || skill.currentCooldown > 0 || player.mp < skill.mpCost) return;

    skill.currentCooldown = skill.cooldown;
    player.mp -= skill.mpCost;

    if (skill.id === "heal") {
      // 治疗自己
      player.hp = Math.min(player.maxHp, player.hp + 50 + player.level * 5);
      return;
    }

    if (skill.id === "war_cry") {
      player.buffs.push({ attack: skill.buff.attack, duration: skill.buff.duration });
      return;
    }

    if (skill.id === "barrier") {
      player.shield = skill.shield + player.level * 5;
      player.shieldTimer = skill.duration;
      return;
    }

    if (skill.id === "trap") {
      // 放置陷阱
      this.projectiles.push({
        id: genId(),
        ownerId: playerId,
        x: player.x + player.direction.x * skill.range,
        y: player.y + player.direction.y * skill.range,
        dx: 0, dy: 0, speed: 0, damage: skill.damage + player.attack,
        life: skill.duration, targetType: "monster",
        isTrap: true, slow: skill.slow,
      });
      return;
    }

    // 投射物类技能 Projectile skills
    const totalAttack = player.attack + (player.equipment.weapon ? (player.equipment.weapon.attack || 0) : 0)
      + player.buffs.reduce((sum, b) => sum + (b.attack || 0), 0);

    const baseDx = player.direction.x;
    const baseDy = player.direction.y;
    const projectiles = skill.projectiles || 1;
    const spread = skill.spread || 0;

    for (let i = 0; i < projectiles; i++) {
      const angle = Math.atan2(baseDy, baseDx) + (spread ? ((i - (projectiles - 1) / 2) * spread * Math.PI / 180) : 0);
      this.projectiles.push({
        id: genId(),
        ownerId: playerId,
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

  damageMonster(monster, damage, playerId) {
    const actualDamage = Math.max(1, damage - monster.defense);
    monster.hp -= actualDamage;
    monster.targetId = playerId;
    monster.state = "chase";

    const player = this.players.get(playerId);
    if (player) player.damageDealt += actualDamage;

    if (monster.hp <= 0) {
      monster.alive = false;
      this.onMonsterDeath(monster, playerId);
    }
  }

  damagePlayer(player, damage, sourceId) {
    let actualDamage = Math.max(1, damage - player.defense
      - (player.equipment.armor ? (player.equipment.armor.defense || 0) : 0));

    // 护盾吸收 Shield absorb
    if (player.shield > 0) {
      const absorbed = Math.min(player.shield, actualDamage);
      player.shield -= absorbed;
      actualDamage -= absorbed;
    }

    player.hp -= actualDamage;
    if (player.hp <= 0) {
      player.hp = 0;
      player.alive = false;
      player.respawnTimer = 5;
      player.deaths++;

      const killer = this.players.get(sourceId);
      if (killer) killer.kills++;
    }
  }

  onMonsterDeath(monster, playerId) {
    const player = this.players.get(playerId);
    if (!player) return;

    // 经验 Experience
    player.xp += monster.xp;
    while (player.xp >= player.xpToNext) {
      player.xp -= player.xpToNext;
      player.level++;
      player.xpToNext = Math.floor(player.xpToNext * 1.5);
      player.maxHp += 15;
      player.hp = player.maxHp;
      player.maxMp += 10;
      player.mp = player.maxMp;
      player.attack += 3;
      player.defense += 2;
    }

    // 掉落 Loot drops
    const lootTable = LOOT_TABLE[monster.type];
    if (lootTable) {
      for (const drop of lootTable) {
        if (Math.random() < drop.chance) {
          const item = this.generateItem(drop.type, drop.tier);
          if (item) {
            this.lootDrops.push({
              id: genId(),
              x: monster.x + randomFloat(-20, 20),
              y: monster.y + randomFloat(-20, 20),
              ...item,
              life: 30, // 30秒后消失
            });
          }
        }
      }

      // 金币掉落
      if (Math.random() < 0.7) {
        player.gold += randomInt(1, 10) * (monster.isBoss ? 10 : 1);
      }
    }
  }

  generateItem(type, tier) {
    const templates = ITEM_TEMPLATES[type]?.[tier];
    if (!templates || templates.length === 0) return null;

    const template = randomChoice(templates);
    const rarity = this.rollRarity(tier);

    return {
      type,
      tier,
      rarity: rarity.name,
      rarityColor: rarity.color,
      ...template,
      id: genId(),
    };
  }

  rollRarity(tier) {
    const roll = Math.random();
    if (tier === 3 && roll < 0.05) return RARITY_COLORS.legendary;
    if (tier >= 2 && roll < 0.15) return RARITY_COLORS.epic;
    if (roll < 0.3) return RARITY_COLORS.rare;
    if (roll < 0.6) return RARITY_COLORS.uncommon;
    return RARITY_COLORS.common;
  }

  pickupLoot(player, loot) {
    if (loot.type === "gold") {
      player.gold += loot.amount;
      return;
    }

    if (loot.type === "potion") {
      const existing = player.inventory.find(i => i.type === "potion" && i.tier === loot.tier);
      if (existing) {
        existing.count++;
      } else {
        player.inventory.push({ ...loot, count: 1 });
      }
      return;
    }

    // 装备类直接放入背包
    player.inventory.push({ ...loot, count: 1 });
  }

  updateMonsterAI(monster, dt) {
    monster.attackCooldown -= dt;

    // 找最近的玩家 Find nearest player
    let nearestPlayer = null;
    let nearestDist = 300; // 视野范围

    for (const [id, player] of this.players) {
      if (!player.alive) continue;
      const dist = distance(monster, player);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestPlayer = player;
      }
    }

    if (!nearestPlayer) {
      // 闲逛 Patrol
      monster.state = "idle";
      monster.patrolTimer -= dt;
      if (monster.patrolTimer <= 0) {
        monster.patrolX = monster.x + randomFloat(-100, 100);
        monster.patrolY = monster.y + randomFloat(-100, 100);
        monster.patrolTimer = randomFloat(2, 5);
      }

      const pdx = monster.patrolX - monster.x;
      const pdy = monster.patrolY - monster.y;
      const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
      if (pDist > 5) {
        const speed = monster.speed * 0.5 * dt;
        const newX = monster.x + (pdx / pDist) * speed;
        const newY = monster.y + (pdy / pDist) * speed;
        if (this.canMoveTo(newX, monster.y, monster.size * 0.8)) monster.x = newX;
        if (this.canMoveTo(monster.x, newY, monster.size * 0.8)) monster.y = newY;
      }
      return;
    }

    // 追击玩家 Chase player
    if (nearestDist > monster.range + 10) {
      monster.state = "chase";
      const dx = nearestPlayer.x - monster.x;
      const dy = nearestPlayer.y - monster.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const speed = monster.speed * dt;
      const newX = monster.x + (dx / len) * speed;
      const newY = monster.y + (dy / len) * speed;
      if (this.canMoveTo(newX, monster.y, monster.size * 0.8)) monster.x = newX;
      if (this.canMoveTo(monster.x, newY, monster.size * 0.8)) monster.y = newY;
    }
    // 攻击玩家 Attack player
    else {
      monster.state = "attack";
      if (monster.attackCooldown <= 0) {
        this.damagePlayer(nearestPlayer, monster.attack, monster.id);
        monster.attackCooldown = 1;
      }
    }
  }

  getSnapshot() {
    const players = [];
    for (const [id, p] of this.players) {
      players.push({
        id: p.id, name: p.name, classId: p.classId, className: p.className,
        x: Math.round(p.x), y: Math.round(p.y), hp: p.hp, maxHp: p.maxHp,
        mp: p.mp, maxMp: p.maxMp, level: p.level, xp: p.xp, xpToNext: p.xpToNext,
        gold: p.gold, color: p.color, alive: p.alive, direction: p.direction,
        shield: p.shield, buffs: p.buffs, kills: p.kills, deaths: p.deaths,
        damageDealt: p.damageDealt, inventory: p.inventory, equipment: p.equipment,
        skills: p.skills.map(s => ({ id: s.id, name: s.name, currentCooldown: s.currentCooldown, cooldown: s.cooldown, mpCost: s.mpCost })),
        respawnTimer: p.respawnTimer,
      });
    }

    const monsters = this.monsters.filter(m => m.alive).map(m => ({
      id: m.id, type: m.type, name: m.name,
      x: Math.round(m.x), y: Math.round(m.y), hp: m.hp, maxHp: m.maxHp,
      color: m.color, size: m.size, state: m.state, isBoss: m.isBoss,
    }));

    const projectiles = this.projectiles.map(p => ({
      id: p.id, x: Math.round(p.x), y: Math.round(p.y),
      color: p.color || "#fff", isTrap: p.isTrap,
    }));

    const loot = this.lootDrops.map(l => ({
      id: l.id, x: Math.round(l.x), y: Math.round(l.y),
      type: l.type, name: l.name, rarity: l.rarity, rarityColor: l.rarityColor,
    }));

    return { players, monsters, projectiles, loot, tick: this.tick };
  }
}

// ============================================================
// 服务器主逻辑 Server Main Logic
// ============================================================
const gameState = new GameState();
gameState.init();

// HTTP 服务器
const ROOT = path.resolve(__dirname, "..");
const server = http.createServer((req, res) => {
  let filePath = req.url === "/" ? "/client/index.html" : req.url;
  filePath = path.join(ROOT, filePath);

  const ext = path.extname(filePath);
  const mime = MIME[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
});

// WebSocket 服务器
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  if (gameState.players.size >= MAX_PLAYERS) {
    ws.close(1000, "服务器已满");
    return;
  }

  const playerId = genId();
  let player = null;

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data);

      switch (msg.type) {
        case "join": {
          player = gameState.addPlayer(playerId, msg.name, msg.classId);
          if (player) {
            ws.send(JSON.stringify({
              type: "welcome",
              playerId,
              dungeon: gameState.dungeon,
              classes: Object.fromEntries(
                Object.entries(CLASSES).map(([k, v]) => [k, {
                  name: v.name, nameEn: v.nameEn, color: v.color,
                  maxHp: v.maxHp, maxMp: v.maxMp, attack: v.attack,
                  defense: v.defense, speed: v.speed,
                  skills: v.skills.map(s => ({ id: s.id, name: s.name, nameEn: s.nameEn, damage: s.damage, cooldown: s.cooldown, mpCost: s.mpCost })),
                }])
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
          if (player && msg.index !== undefined) {
            const item = player.inventory[msg.index];
            if (!item) break;

            if (item.type === "potion") {
              player.hp = Math.min(player.maxHp, player.hp + item.heal);
              item.count--;
              if (item.count <= 0) player.inventory.splice(msg.index, 1);
            }
          }
          break;
        }

        case "equip": {
          if (player && msg.index !== undefined) {
            const item = player.inventory[msg.index];
            if (!item) break;

            if (item.type === "weapon" || item.type === "armor" || item.type === "accessory") {
              // 卸下当前装备
              const current = player.equipment[item.type];
              if (current) player.inventory.push({ ...current, count: 1 });

              // 装上新装备
              player.equipment[item.type] = { ...item };
              player.inventory.splice(msg.index, 1);
            }
          }
          break;
        }

        case "chat": {
          if (player && msg.text) {
            const text = msg.text.substring(0, 200);
            broadcastChat(`${player.name}: ${text}`, "player", player.color);
          }
          break;
        }
      }
    } catch (e) {
      // 忽略无效消息
    }
  });

  ws.on("close", () => {
    if (player) {
      broadcastChat(`${player.name} 离开了地牢`, "system");
      gameState.removePlayer(playerId);
    }
  });

  ws.playerId = playerId;
});

function broadcastChat(text, type, color) {
  const msg = JSON.stringify({ type: "chat", text, msgType: type, color, time: Date.now() });
  gameState.chatHistory.push({ text, msgType: type, color, time: Date.now() });
  if (gameState.chatHistory.length > 50) gameState.chatHistory.shift();

  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(msg);
  });
}

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(msg);
  });
}

// ============================================================
// 游戏循环 Game Loop
// ============================================================
let lastTick = Date.now();
let lastSnapshot = Date.now();

setInterval(() => {
  const now = Date.now();
  const delta = now - lastTick;
  lastTick = now;

  gameState.update(delta);

  // 定期发送快照
  if (now - lastSnapshot >= SNAPSHOT_MS) {
    lastSnapshot = now;
    const snapshot = gameState.getSnapshot();
    broadcast({ type: "snapshot", data: snapshot });
  }

  // 定期更新掉落物生命周期
  gameState.lootDrops = gameState.lootDrops.filter(l => {
    l.life -= delta / 1000;
    return l.life > 0;
  });
}, DT);

// ============================================================
// 启动服务器 Start Server
// ============================================================
server.listen(PORT, HOST, () => {
  console.log(`🎮 深渊地牢服务器已启动 | Abyss Dungeon Server Started`);
  console.log(`📡 地址 Address: http://${HOST}:${PORT}`);
  console.log(`🗺️  地牢大小 Dungeon Size: ${DUNGEON_WIDTH}x${DUNGEON_HEIGHT}`);
  console.log(`👾 怪物数量 Monsters: ${gameState.monsters.filter(m => m.alive).length}`);
});

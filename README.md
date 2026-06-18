<div align="center">

# 🏰 深渊地牢 | Abyss Dungeon

**多人合作地牢探险网页游戏 | Multiplayer Co-op Dungeon Crawler Web Game**

[![Node.js](https://img.shields.io/badge/Node.js-16+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![WebSocket](https://img.shields.io/badge/WebSocket-8.x-010101?style=flat-square)](https://github.com/websockets/ws)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

[中文](#中文) | [English](#english) | [日本語](#日本語)

</div>

---

<a name="中文"></a>
## 🇨🇳 中文

### 📖 项目简介

**深渊地牢** 是一款基于 WebSocket 的多人合作地牢探险网页游戏。玩家可以选择不同职业，与好友组队探索随机生成的地牢，击败怪物获取装备，挑战强大的Boss。

### ✨ 游戏特色

| 特色 | 描述 |
|------|------|
| 🎭 **四大职业** | 战士、法师、弓箭手、牧师，各有独特技能 |
| 🗺️ **随机地牢** | 程序化生成的地牢地图，每次探险都不同 |
| ⚔️ **实时战斗** | 基于服务器权威架构的实时战斗系统 |
| 🎒 **装备系统** | 武器、护甲、饰品，多品质掉落 |
| 👹 **Boss战** | 每个地牢都有强大的Boss等待挑战 |
| 📊 **排行榜** | 实时击杀排行榜 |
| 💬 **聊天系统** | 游戏内实时聊天 |
| 🗺️ **小地图** | 实时显示玩家、怪物、掉落物位置 |

### 🎮 操作说明

| 按键 | 功能 |
|------|------|
| `WASD` / 方向键 | 移动角色 |
| 鼠标左键 | 普通攻击 |
| `Q` | 技能1 |
| `E` | 技能2 |
| `R` | 使用药水 |
| `I` | 打开/关闭背包 |
| `Tab` | 显示/隐藏排行榜 |
| `Enter` | 打开聊天 |

### 🛠️ 技术栈

```
前端: HTML5 Canvas + 原生JavaScript
后端: Node.js + WebSocket (ws库)
架构: 服务器权威架构 (Server-Authoritative)
同步: 快照插值 (Snapshot Interpolation)
```

### 📁 项目结构

```
abyss-dungeon/
├── server/
│   └── index.js          # 游戏服务器 (WebSocket + HTTP)
├── client/
│   ├── index.html         # 游戏主页面
│   ├── css/
│   │   └── styles.css     # 游戏样式 (暗黑哥特风格)
│   └── js/
│       └── main.js        # 游戏客户端逻辑
├── package.json           # 项目配置
└── README.md              # 项目说明
```

### 🚀 快速开始

#### 环境要求
- Node.js >= 16.0.0
- npm >= 7.0.0

#### 安装运行

```bash
# 克隆项目
git clone https://github.com/yourusername/abyss-dungeon.git
cd abyss-dungeon

# 安装依赖
npm install

# 启动服务器
npm start
```

访问 `http://localhost:3000` 即可开始游戏。

#### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3000 | 服务器端口 |
| `HOST` | 0.0.0.0 | 监听地址 |

### 🎯 游戏系统详解

#### 职业系统

| 职业 | 生命 | 魔法 | 攻击 | 防御 | 速度 | 定位 |
|------|------|------|------|------|------|------|
| ⚔️ 战士 | 200 | 50 | 25 | 20 | 150 | 近战坦克 |
| 🔮 法师 | 100 | 200 | 35 | 5 | 130 | 远程输出 |
| 🏹 弓箭手 | 120 | 80 | 30 | 10 | 180 | 远程灵活 |
| ✨ 牧师 | 130 | 180 | 15 | 12 | 140 | 治疗辅助 |

#### 怪物系统

| 怪物 | 生命 | 攻击 | 经验 | 特点 |
|------|------|------|------|------|
| 史莱姆 | 40 | 8 | 15 | 基础小怪 |
| 骷髅战士 | 80 | 15 | 30 | 中等难度 |
| 哥布林 | 60 | 12 | 25 | 速度较快 |
| 恶魔 | 150 | 25 | 60 | 精英怪 |
| 巨龙 | 500 | 40 | 200 | Boss |

#### 掉落品质

| 品质 | 颜色 | 掉率 |
|------|------|------|
| 普通 | 灰色 | 40% |
| 优秀 | 绿色 | 30% |
| 稀有 | 蓝色 | 20% |
| 史诗 | 紫色 | 8% |
| 传说 | 橙色 | 2% |

### 📄 开源协议

MIT License - 详见 [LICENSE](LICENSE) 文件

---

<a name="english"></a>
## 🇺🇸 English

### 📖 Overview

**Abyss Dungeon** is a multiplayer co-op dungeon crawler web game built with WebSocket. Players can choose from different classes, team up with friends to explore procedurally generated dungeons, defeat monsters for loot, and challenge powerful bosses.

### ✨ Features

- **4 Character Classes**: Warrior, Mage, Archer, Priest - each with unique skills
- **Procedural Dungeons**: Randomly generated maps for endless replayability
- **Real-time Combat**: Server-authoritative architecture ensures fair gameplay
- **Loot System**: Weapons, armor, accessories with multiple rarity tiers
- **Boss Fights**: Powerful bosses in each dungeon
- **Leaderboard**: Real-time kill tracking
- **Chat System**: In-game real-time chat
- **Minimap**: Shows players, monsters, and loot positions

### 🎮 Controls

| Key | Action |
|-----|--------|
| `WASD` / Arrow Keys | Move |
| Left Click | Attack |
| `Q` | Skill 1 |
| `E` | Skill 2 |
| `R` | Use Potion |
| `I` | Toggle Inventory |
| `Tab` | Toggle Leaderboard |
| `Enter` | Open Chat |

### 🛠️ Tech Stack

```
Frontend: HTML5 Canvas + Vanilla JavaScript
Backend: Node.js + WebSocket (ws)
Architecture: Server-Authoritative
Sync: Snapshot Interpolation
```

### 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/abyss-dungeon.git
cd abyss-dungeon

# Install dependencies
npm install

# Start the server
npm start
```

Visit `http://localhost:3000` to start playing.

### 🎯 Game Systems

#### Classes

| Class | HP | MP | ATK | DEF | SPD | Role |
|-------|----|----|-----|-----|-----|------|
| ⚔️ Warrior | 200 | 50 | 25 | 20 | 150 | Melee Tank |
| 🔮 Mage | 100 | 200 | 35 | 5 | 130 | Ranged DPS |
| 🏹 Archer | 120 | 80 | 30 | 10 | 180 | Ranged Mobile |
| ✨ Priest | 130 | 180 | 15 | 12 | 140 | Healer Support |

#### Monsters

| Monster | HP | ATK | XP | Notes |
|---------|----|----|-----|-------|
| Slime | 40 | 8 | 15 | Basic mob |
| Skeleton | 80 | 15 | 30 | Medium difficulty |
| Goblin | 60 | 12 | 25 | Fast |
| Demon | 150 | 25 | 60 | Elite |
| Dragon | 500 | 40 | 200 | Boss |

#### Loot Rarity

| Rarity | Color | Drop Rate |
|--------|-------|-----------|
| Common | Gray | 40% |
| Uncommon | Green | 30% |
| Rare | Blue | 20% |
| Epic | Purple | 8% |
| Legendary | Orange | 2% |

### 📄 License

MIT License - see [LICENSE](LICENSE) for details

---

<a name="日本語"></a>
## 🇯🇵 日本語

### 📖 概要

**深淵ダンジョン** は、WebSocketで構築されたマルチプレイヤー協力ダンジョン探索ウェブゲームです。プレイヤーは異なるクラスを選択し、仲間と協力してランダム生成ダンジョンを探索し、モンスターを倒して装備を獲得し、強力なボスに挑戦できます。

### ✨ 特徴

- **4つのキャラクタークラス**: 戦士、魔法使い、弓使い、僧侶 - それぞれユニークなスキル
- **ランダムダンジョン**: 毎回異なるマップでリプレイ性が高い
- **リアルタイム戦闘**: サーバー権威アーキテクチャで公平なゲームプレイ
- **ルートシステム**: 武器、防具、アクセサリー - 複数のレアリティ
- **ボス戦**: 各ダンジョンに強力なボス
- **リーダーボード**: リアルタイムキルランキング
- **チャットシステム**: ゲーム内リアルタイムチャット
- **ミニマップ**: プレイヤー、モンスター、ルートの位置表示

### 🎮 操作方法

| キー | 機能 |
|------|------|
| `WASD` / 矢印キー | 移動 |
| 左クリック | 攻撃 |
| `Q` | スキル1 |
| `E` | スキル2 |
| `R` | ポーション使用 |
| `I` | インベントリ切替 |
| `Tab` | リーダーボード切替 |
| `Enter` | チャット |

### 🚀 クイックスタート

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/abyss-dungeon.git
cd abyss-dungeon

# 依存関係をインストール
npm install

# サーバーを起動
npm start
```

`http://localhost:3000` にアクセスしてゲームを開始。

### 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) をご覧ください

---

<div align="center">

**Made with ❤️ by Abyss Dungeon Team**

</div>

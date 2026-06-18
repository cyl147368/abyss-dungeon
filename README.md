<div align="center">

# 🏰 深渊地牢 | Abyss Dungeon

**多人合作地牢探险网页游戏 | Multiplayer Co-op Dungeon Crawler Web Game**

[![Node.js](https://img.shields.io/badge/Node.js-16+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![WebSocket](https://img.shields.io/badge/WebSocket-8.x-010101?style=flat-square)](https://github.com/websockets/ws)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](Dockerfile)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

**[在线演示](http://121.4.97.25:3000)** | **[部署指南](DEPLOYMENT.md)**

[中文](#中文) | [English](#english) | [日本語](#日本語)

</div>

---

<a name="中文"></a>
## 🇨🇳 中文

### 📖 项目简介

**深渊地牢** 是一款基于 WebSocket 的多人合作地牢探险网页游戏。玩家可以选择不同职业，与好友组队探索随机生成的地牢，击败怪物获取装备，挑战强大的Boss。

### ✨ 核心特色

<table>
<tr>
<td width="50%">

#### 🎭 四大职业系统
- ⚔️ **战士** - 近战坦克，攻守兼备
- 🔮 **法师** - 远程输出，元素之力
- 🏹 **弓箭手** - 灵活机动，百步穿杨
- ✨ **牧师** - 治疗辅助，守护同伴

</td>
<td width="50%">

#### 🗺️ 随机地牢生成
- 程序化房间生成算法
- 每次探险地图都不同
- 多房间走廊连接
- 出生点安全区域

</td>
</tr>
<tr>
<td>

#### ⚔️ 实时战斗系统
- 服务器权威架构
- 技能冷却机制
- 范围伤害(AOE)
- 护盾与Buff系统

</td>
<td>

#### 🎒 装备掉落系统
- 5种稀有度品质
- 武器/护甲/饰品
- 药水恢复物品
- 金币货币系统

</td>
</tr>
</table>

### 🎮 操作说明

| 按键 | 功能 | 按键 | 功能 |
|------|------|------|------|
| `WASD` / 方向键 | 移动角色 | `I` | 打开/关闭背包 |
| 鼠标左键 | 普通攻击 | `Tab` | 显示/隐藏排行榜 |
| `Q` | 技能1 | `Enter` | 打开聊天 |
| `E` | 技能2 | `R` | 使用药水 |

### 🛠️ 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端 (Browser)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Canvas渲染   │  │  输入处理    │  │  UI管理     │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         └────────────────┼────────────────┘                 │
│                          │                                  │
│                    WebSocket Client                         │
└──────────────────────────┼──────────────────────────────────┘
                           │
                     WebSocket (ws)
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                    游戏服务器 (Node.js)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ 游戏逻辑    │  │  物理引擎    │  │  网络同步   │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         └────────────────┼────────────────┘                 │
│                          │                                  │
│              Server-Authoritative Architecture              │
└─────────────────────────────────────────────────────────────┘
```

### 📁 项目结构

```
abyss-dungeon/
├── server/
│   └── index.js              # 游戏服务器 (WebSocket + HTTP)
├── client/
│   ├── index.html            # 游戏主页面
│   ├── css/
│   │   └── styles.css        # 游戏样式 (暗黑哥特风格)
│   └── js/
│       └── main.js           # 游戏客户端逻辑
├── Dockerfile                # Docker镜像配置
├── docker-compose.yml        # Docker Compose配置
├── ecosystem.config.js       # PM2进程管理配置
├── deploy.sh                 # 部署脚本
├── DEPLOYMENT.md             # 详细部署指南
├── package.json              # 项目配置
├── .env.example              # 环境变量示例
├── .gitignore                # Git忽略文件
├── LICENSE                   # MIT开源协议
└── README.md                 # 项目说明
```

### 🚀 快速开始

#### 环境要求

- Node.js >= 16.0.0
- npm >= 7.0.0

#### 安装运行

```bash
# 克隆项目
git clone https://github.com/cyl147368/abyss-dungeon.git
cd abyss-dungeon

# 安装依赖
npm install

# 启动服务器
npm start
```

访问 `http://localhost:3000` 即可开始游戏。

#### Docker部署（推荐）

```bash
# 使用Docker Compose一键启动
docker-compose up -d

# 查看日志
docker-compose logs -f
```

#### PM2部署（生产环境）

```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start ecosystem.config.js --env production

# 保存并设置开机自启
pm2 save
pm2 startup
```

### 🎯 游戏系统详解

#### 职业属性对比

| 职业 | 生命 | 魔法 | 攻击 | 防御 | 速度 | 定位 |
|------|------|------|------|------|------|------|
| ⚔️ 战士 | 200 | 50 | 25 | 20 | 150 | 近战坦克 |
| 🔮 法师 | 100 | 200 | 35 | 5 | 130 | 远程输出 |
| 🏹 弓箭手 | 120 | 80 | 30 | 10 | 180 | 远程灵活 |
| ✨ 牧师 | 130 | 180 | 15 | 12 | 140 | 治疗辅助 |

#### 技能系统

**战士技能：**
- ⚔️ 横扫斩 - 范围伤害
- 🛡️ 盾击 - 眩晕敌人
- 📢 战吼 - 增加攻击力

**法师技能：**
- 🔥 火球术 - 高伤投射物
- 🧊 冰墙 - 减速敌人
- ⚡ 闪电链 - 连锁攻击

**弓箭手技能：**
- 🎯 蓄力射击 - 远程高伤
- 🏹 多重射击 - 扇形箭雨
- 🪤 陷阱 - 减速区域

**牧师技能：**
- 💚 治愈术 - 恢复生命
- ✝️ 圣光 - 远程攻击
- 🛡️ 护盾 - 伤害吸收

#### 怪物图鉴

| 怪物 | 生命 | 攻击 | 经验 | 特点 |
|------|------|------|------|------|
| 🟢 史莱姆 | 40 | 8 | 15 | 基础小怪 |
| ⚪ 骷髅战士 | 80 | 15 | 30 | 中等难度 |
| 🟣 哥布林 | 60 | 12 | 25 | 速度较快 |
| 🔴 恶魔 | 150 | 25 | 60 | 精英怪 |
| 🟠 巨龙 | 500 | 40 | 200 | Boss |

#### 掉落品质

| 品质 | 颜色 | 掉率 |
|------|------|------|
| 普通 | 灰色 | 40% |
| 优秀 | 绿色 | 30% |
| 稀有 | 蓝色 | 20% |
| 史诗 | 紫色 | 8% |
| 传说 | 橙色 | 2% |

### 📊 API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/` | GET | 游戏页面 |
| `/health` | GET | 健康检查 |
| `/stats` | GET | 服务器统计 |

#### 健康检查响应示例

```json
{
  "uptime": 3600,
  "players": 15,
  "monsters": 43,
  "loot": 8,
  "projectiles": 12,
  "tick": 72000
}
```

### 🔧 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `NODE_ENV` | development | 运行环境 |
| `PORT` | 3000 | 服务器端口 |
| `HOST` | 0.0.0.0 | 监听地址 |
| `MAX_PLAYERS` | 50 | 最大玩家数 |

### 📄 开源协议

MIT License - 详见 [LICENSE](LICENSE) 文件

### 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

---

<a name="english"></a>
## 🇺🇸 English

### 📖 Overview

**Abyss Dungeon** is a multiplayer co-op dungeon crawler web game built with WebSocket. Players can choose from different classes, team up with friends to explore procedurally generated dungeons, defeat monsters for loot, and challenge powerful bosses.

### ✨ Key Features

- **4 Character Classes**: Warrior, Mage, Archer, Priest - each with unique skills
- **Procedural Dungeons**: Randomly generated maps for endless replayability
- **Real-time Combat**: Server-authoritative architecture ensures fair gameplay
- **Loot System**: Weapons, armor, accessories with multiple rarity tiers
- **Boss Fights**: Powerful bosses in each dungeon
- **Leaderboard**: Real-time kill tracking
- **Chat System**: In-game real-time chat
- **Minimap**: Shows players, monsters, and loot positions

### 🎮 Controls

| Key | Action | Key | Action |
|-----|--------|-----|--------|
| `WASD` / Arrow Keys | Move | `I` | Toggle Inventory |
| Left Click | Attack | `Tab` | Toggle Leaderboard |
| `Q` | Skill 1 | `Enter` | Open Chat |
| `E` | Skill 2 | `R` | Use Potion |

### 🛠️ Tech Stack

```
Frontend: HTML5 Canvas + Vanilla JavaScript
Backend: Node.js + WebSocket (ws)
Architecture: Server-Authoritative
Deployment: Docker / PM2
```

### 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/cyl147368/abyss-dungeon.git
cd abyss-dungeon

# Install dependencies
npm install

# Start the server
npm start
```

Visit `http://localhost:3000` to start playing.

#### Docker Deployment (Recommended)

```bash
docker-compose up -d
```

#### PM2 Deployment (Production)

```bash
npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

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
| 🟢 Slime | 40 | 8 | 15 | Basic mob |
| ⚪ Skeleton | 80 | 15 | 30 | Medium difficulty |
| 🟣 Goblin | 60 | 12 | 25 | Fast |
| 🔴 Demon | 150 | 25 | 60 | Elite |
| 🟠 Dragon | 500 | 40 | 200 | Boss |

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

| キー | 機能 | キー | 機能 |
|------|------|------|------|
| `WASD` / 矢印キー | 移動 | `I` | インベントリ切替 |
| 左クリック | 攻撃 | `Tab` | リーダーボード切替 |
| `Q` | スキル1 | `Enter` | チャット |
| `E` | スキル2 | `R` | ポーション使用 |

### 🚀 クイックスタート

```bash
# リポジトリをクローン
git clone https://github.com/cyl147368/abyss-dungeon.git
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

## 📞 連絡先

- GitHub: [@cyl147368](https://github.com/cyl147368)
- Issues: [GitHub Issues](https://github.com/cyl147368/abyss-dungeon/issues)

---

<div align="center">

**Made with ❤️ by Abyss Dungeon Team**

[⬆ 返回顶部](#深渊地牢--abyss-dungeon)

</div>

---

## 🔄 CI/CD 自动部署

本项目支持GitHub Actions自动部署到服务器。

### 配置步骤

1. **生成SSH密钥对**
```bash
ssh-keygen -t ed25519 -f deploy_key -N ""
```

2. **将公钥添加到服务器**
```bash
cat deploy_key.pub >> ~/.ssh/authorized_keys
```

3. **在GitHub仓库中添加Secrets**
   - 进入仓库 Settings > Secrets and variables > Actions
   - 添加以下secrets:
     - `DEPLOY_HOST`: 服务器地址 (121.4.97.25)
     - `DEPLOY_USER`: 用户名 (ubuntu)
     - `DEPLOY_KEY`: 私钥内容 (cat deploy_key)

4. **触发部署**
   - 推送代码到master分支会自动触发部署
   - 也可以在Actions页面手动触发

### 部署流程

1. 检出代码
2. 安装依赖
3. 运行测试
4. 部署到服务器
5. 验证部署状态

---

## 📊 质量标准

本项目遵循以下质量标准:

- **ISO/IEC 25010**: 软件产品质量模型
- **CMMI**: 能力成熟度模型集成
- **代码规范**: JSDoc文档、错误处理、日志记录
- **测试覆盖**: 自动化测试脚本
- **部署自动化**: GitHub Actions CI/CD

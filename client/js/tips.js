/**
 * ============================================================
 * 深渊地牢 - 游戏提示系统
 * Abyss Dungeon - Game Tips System
 * ============================================================
 */

const GameTips = {
  // 提示列表
  tips: [
    {
      id: 'movement',
      title: '移动',
      text: '使用 WASD 或方向键移动角色',
      icon: '🎮',
      showOnce: true,
    },
    {
      id: 'attack',
      title: '攻击',
      text: '点击鼠标左键进行普通攻击',
      icon: '⚔️',
      showOnce: true,
    },
    {
      id: 'skills',
      title: '技能',
      text: '按 Q 和 E 释放技能，注意魔法值消耗',
      icon: '✨',
      showOnce: true,
    },
    {
      id: 'potion',
      title: '药水',
      text: '按 R 使用药水恢复生命值',
      icon: '🧪',
      showOnce: true,
    },
    {
      id: 'inventory',
      title: '背包',
      text: '按 I 打开背包，点击装备进行穿戴',
      icon: '📦',
      showOnce: true,
    },
    {
      id: 'chat',
      title: '聊天',
      text: '按 Enter 打开聊天，与队友交流',
      icon: '💬',
      showOnce: true,
    },
    {
      id: 'minimap',
      title: '小地图',
      text: '右上角小地图显示怪物和队友位置',
      icon: '🗺️',
      showOnce: true,
    },
    {
      id: 'boss',
      title: 'Boss',
      text: '每个地牢都有强大的Boss，建议组队挑战',
      icon: '🐉',
      showOnce: true,
    },
  ],

  // 已显示的提示
  shownTips: new Set(),

  // 提示队列
  queue: [],

  // 当前显示的提示
  currentTip: null,

  /**
   * 初始化提示系统
   */
  init() {
    // 从localStorage加载已显示的提示
    try {
      const saved = localStorage.getItem('abyss-dungeon-tips');
      if (saved) {
        this.shownTips = new Set(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('无法加载提示状态:', e);
    }

    // 创建提示容器
    this.createTipContainer();
  },

  /**
   * 创建提示容器
   */
  createTipContainer() {
    const container = document.createElement('div');
    container.id = 'tipContainer';
    container.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  },

  /**
   * 显示提示
   * @param {string} tipId - 提示ID
   */
  show(tipId) {
    const tip = this.tips.find(t => t.id === tipId);
    if (!tip) return;

    // 检查是否已显示
    if (tip.showOnce && this.shownTips.has(tipId)) return;

    // 添加到队列
    this.queue.push(tip);
    this.processQueue();
  },

  /**
   * 处理队列
   */
  processQueue() {
    if (this.currentTip || this.queue.length === 0) return;

    const tip = this.queue.shift();
    this.displayTip(tip);
  },

  /**
   * 显示提示UI
   * @param {Object} tip - 提示对象
   */
  displayTip(tip) {
    this.currentTip = tip;

    const container = document.getElementById('tipContainer');
    if (!container) return;

    const tipElement = document.createElement('div');
    tipElement.className = 'game-tip';
    tipElement.style.cssText = `
      background: rgba(12, 12, 22, 0.95);
      border: 1px solid rgba(212, 168, 67, 0.5);
      border-radius: 8px;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 250px;
      max-width: 400px;
      animation: tipSlideIn 0.3s ease-out;
      pointer-events: auto;
      cursor: pointer;
    `;

    tipElement.innerHTML = `
      <span style="font-size: 24px;">${tip.icon}</span>
      <div>
        <div style="font-weight: 700; color: #d4a843; margin-bottom: 2px;">${tip.title}</div>
        <div style="font-size: 13px; color: #a09880;">${tip.text}</div>
      </div>
      <span style="margin-left: auto; color: #5a5240; font-size: 12px;">✕</span>
    `;

    // 点击关闭
    tipElement.addEventListener('click', () => {
      this.hideTip(tipElement, tip);
    });

    container.appendChild(tipElement);

    // 自动关闭
    setTimeout(() => {
      if (this.currentTip === tip) {
        this.hideTip(tipElement, tip);
      }
    }, 5000);

    // 标记为已显示
    this.shownTips.add(tip.id);
    this.saveShownTips();
  },

  /**
   * 隐藏提示
   * @param {HTMLElement} element - 提示元素
   * @param {Object} tip - 提示对象
   */
  hideTip(element, tip) {
    element.style.animation = 'tipSlideOut 0.3s ease-in';
    setTimeout(() => {
      element.remove();
      this.currentTip = null;
      this.processQueue();
    }, 300);
  },

  /**
   * 保存已显示的提示
   */
  saveShownTips() {
    try {
      localStorage.setItem('abyss-dungeon-tips', JSON.stringify([...this.shownTips]));
    } catch (e) {
      console.warn('无法保存提示状态:', e);
    }
  },

  /**
   * 重置所有提示
   */
  reset() {
    this.shownTips.clear();
    localStorage.removeItem('abyss-dungeon-tips');
  },

  /**
   * 显示随机提示
   */
  showRandom() {
    const unshownTips = this.tips.filter(t => !this.shownTips.has(t.id));
    if (unshownTips.length > 0) {
      const randomTip = unshownTips[Math.floor(Math.random() * unshownTips.length)];
      this.show(randomTip.id);
    }
  },
};

// 添加CSS动画
const tipStyles = document.createElement('style');
tipStyles.textContent = `
  @keyframes tipSlideIn {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes tipSlideOut {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(-20px);
    }
  }
`;
document.head.appendChild(tipStyles);

// 导出
window.GameTips = GameTips;

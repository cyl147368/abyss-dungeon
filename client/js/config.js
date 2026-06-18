/**
 * ============================================================
 * 深渊地牢 - 客户端配置
 * Abyss Dungeon - Client Configuration
 * ============================================================
 * 
 * 集中管理所有客户端配置项
 * 参考ISO/IEC 25010质量标准(citation:30)
 */

const GameConfig = {
  // 版本信息
  version: '2.0.0',
  
  // 渲染配置
  rendering: {
    targetFPS: 60,
    enableVSync: true,
    enableParticleEffects: true,
    enableDamageNumbers: true,
    enableFogOfWar: true,
    enableMinimap: true,
  },
  
  // 网络配置
  network: {
    reconnectAttempts: 5,
    reconnectDelay: 3000,
    inputSendRate: 50,
    snapshotInterpolation: true,
  },
  
  // UI配置
  ui: {
    showFPS: false,
    showPing: false,
    chatMaxMessages: 50,
    toastDuration: 2000,
    minimapSize: 180,
  },
  
  // 音频配置(预留)
  audio: {
    masterVolume: 0.7,
    musicVolume: 0.5,
    sfxVolume: 0.8,
    enableSpatialAudio: true,
  },
  
  // 控制配置
  controls: {
    moveUp: ['w', 'ArrowUp'],
    moveDown: ['s', 'ArrowDown'],
    moveLeft: ['a', 'ArrowLeft'],
    moveRight: ['d', 'ArrowRight'],
    skill1: ['q'],
    skill2: ['e'],
    usePotion: ['r'],
    inventory: ['i'],
    leaderboard: ['Tab'],
    chat: ['Enter'],
  },
  
  // 游戏平衡配置
  gameplay: {
    cameraSmoothing: 0.1,
    cameraZoom: 1.0,
    showHealthBars: true,
    showDamageNumbers: true,
    autoPickupLoot: true,
  },
  
  // 本地存储键名
  storageKeys: {
    settings: 'abyss-dungeon-settings',
    tips: 'abyss-dungeon-tips',
    stats: 'abyss-dungeon-stats',
  },
  
  /**
   * 从本地存储加载设置
   */
  loadSettings() {
    try {
      const saved = localStorage.getItem(this.storageKeys.settings);
      if (saved) {
        const settings = JSON.parse(saved);
        Object.assign(this, settings);
        console.log('已加载保存的设置');
      }
    } catch (e) {
      console.warn('无法加载设置:', e);
    }
  },
  
  /**
   * 保存设置到本地存储
   */
  saveSettings() {
    try {
      localStorage.setItem(this.storageKeys.settings, JSON.stringify({
        rendering: this.rendering,
        network: this.network,
        ui: this.ui,
        audio: this.audio,
        controls: this.controls,
        gameplay: this.gameplay,
      }));
      console.log('设置已保存');
    } catch (e) {
      console.warn('无法保存设置:', e);
    }
  },
  
  /**
   * 重置为默认设置
   */
  resetSettings() {
    localStorage.removeItem(this.storageKeys.settings);
    location.reload();
  },
};

// 加载设置
GameConfig.loadSettings();

// 导出
window.GameConfig = GameConfig;

/**
 * ============================================================
 * 深渊地牢 - 视觉效果系统
 * Abyss Dungeon - Visual Effects System
 * ============================================================
 */

const Effects = {
  // 粒子列表
  particles: [],
  
  // 伤害数字列表
  damageNumbers: [],
  
  // 特效列表
  effects: [],

  /**
   * 创建粒子
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {string} color - 颜色
   * @param {Object} options - 配置选项
   */
  createParticle(x, y, color, options = {}) {
    const {
      count = 5,
      speed = 2,
      size = 3,
      life = 0.5,
      spread = Math.PI * 2,
      direction = 0,
    } = options;

    for (let i = 0; i < count; i++) {
      const angle = direction + (Math.random() - 0.5) * spread;
      const velocity = speed * (0.5 + Math.random() * 0.5);

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: size * (0.5 + Math.random() * 0.5),
        color,
        life,
        maxLife: life,
        alpha: 1,
      });
    }
  },

  /**
   * 创建伤害数字
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {number} damage - 伤害值
   * @param {string} color - 颜色
   * @param {boolean} isHeal - 是否为治疗
   */
  createDamageNumber(x, y, damage, color = '#fff', isHeal = false) {
    this.damageNumbers.push({
      x: x + (Math.random() - 0.5) * 20,
      y,
      text: isHeal ? `+${damage}` : `-${damage}`,
      color,
      size: isHeal ? 14 : 16,
      life: 1,
      maxLife: 1,
      vy: -2,
      alpha: 1,
    });
  },

  /**
   * 创建攻击特效
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {string} color - 颜色
   * @param {string} type - 类型 (slash/cast/arrow)
   */
  createAttackEffect(x, y, color, type = 'slash') {
    const effect = {
      x,
      y,
      type,
      color,
      life: 0.3,
      maxLife: 0.3,
      alpha: 1,
      scale: 0,
    };

    this.effects.push(effect);
  },

  /**
   * 创建升级特效
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {string} color - 颜色
   */
  createLevelUpEffect(x, y, color) {
    // 环形粒子
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        size: 4,
        color: '#d4a843',
        life: 1,
        maxLife: 1,
        alpha: 1,
      });
    }

    // 升级文字
    this.damageNumbers.push({
      x,
      y: y - 30,
      text: '升级!',
      color: '#d4a843',
      size: 20,
      life: 1.5,
      maxLife: 1.5,
      vy: -1.5,
      alpha: 1,
    });
  },

  /**
   * 创建治疗特效
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   */
  createHealEffect(x, y) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y + 10,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -1 - Math.random(),
        size: 4,
        color: '#2ecc71',
        life: 0.8,
        maxLife: 0.8,
        alpha: 1,
      });
    }
  },

  /**
   * 创建死亡特效
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {string} color - 颜色
   */
  createDeathEffect(x, y, color) {
    // 大量粒子爆发
    this.createParticle(x, y, color, {
      count: 15,
      speed: 4,
      size: 5,
      life: 0.8,
    });

    // 死亡文字
    this.damageNumbers.push({
      x,
      y: y - 20,
      text: '💀',
      color: '#c0392b',
      size: 24,
      life: 1,
      maxLife: 1,
      vy: -2,
      alpha: 1,
    });
  },

  /**
   * 创建拾取特效
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {string} color - 颜色
   */
  createPickupEffect(x, y, color) {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      this.particles.push({
        x: x + Math.cos(angle) * 10,
        y: y + Math.sin(angle) * 10,
        vx: -Math.cos(angle) * 2,
        vy: -Math.sin(angle) * 2,
        size: 3,
        color,
        life: 0.4,
        maxLife: 0.4,
        alpha: 1,
      });
    }
  },

  /**
   * 更新所有效果
   * @param {number} dt - 时间增量(秒)
   */
  update(dt) {
    // 更新粒子
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt;
      p.alpha = p.life / p.maxLife;
      p.size *= 0.98;
      return p.life > 0;
    });

    // 更新伤害数字
    this.damageNumbers = this.damageNumbers.filter(d => {
      d.y += d.vy;
      d.vy *= 0.95;
      d.life -= dt;
      d.alpha = d.life / d.maxLife;
      return d.life > 0;
    });

    // 更新特效
    this.effects = this.effects.filter(e => {
      e.life -= dt;
      e.alpha = e.life / e.maxLife;
      e.scale = 1 - e.alpha;
      return e.life > 0;
    });
  },

  /**
   * 渲染所有效果
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   * @param {Object} camera - 相机位置
   */
  render(ctx, camera) {
    // 渲染粒子
    for (const particle of this.particles) {
      const x = particle.x - camera.x;
      const y = particle.y - camera.y;

      ctx.save();
      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(x, y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 渲染伤害数字
    for (const dmg of this.damageNumbers) {
      const x = dmg.x - camera.x;
      const y = dmg.y - camera.y;

      ctx.save();
      ctx.globalAlpha = dmg.alpha;
      ctx.font = `bold ${dmg.size}px "Noto Sans SC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 阴影
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillText(dmg.text, x + 1, y + 1);

      // 文字
      ctx.fillStyle = dmg.color;
      ctx.fillText(dmg.text, x, y);
      ctx.restore();
    }

    // 渲染特效
    for (const effect of this.effects) {
      const x = effect.x - camera.x;
      const y = effect.y - camera.y;

      ctx.save();
      ctx.globalAlpha = effect.alpha;

      switch (effect.type) {
        case 'slash':
          ctx.strokeStyle = effect.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x, y, 20 * effect.scale, 0, Math.PI * 1.5);
          ctx.stroke();
          break;

        case 'cast':
          ctx.fillStyle = effect.color;
          ctx.beginPath();
          ctx.arc(x, y, 15 * effect.scale, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'arrow':
          ctx.strokeStyle = effect.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x - 10, y);
          ctx.lineTo(x + 10, y);
          ctx.stroke();
          break;
      }

      ctx.restore();
    }
  },

  /**
   * 清除所有效果
   */
  clear() {
    this.particles = [];
    this.damageNumbers = [];
    this.effects = [];
  },
};

// 导出
window.Effects = Effects;

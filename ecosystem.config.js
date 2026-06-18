/**
 * 深渊地牢 - PM2配置文件
 * Abyss Dungeon - PM2 Configuration
 * 
 * 使用方法:
 *   启动: pm2 start ecosystem.config.js
 *   生产: pm2 start ecosystem.config.js --env production
 *   停止: pm2 stop abyss-dungeon
 *   重启: pm2 restart abyss-dungeon
 *   日志: pm2 logs abyss-dungeon
 *   状态: pm2 status
 */

module.exports = {
  apps: [{
    // 应用名称
    name: 'abyss-dungeon',
    
    // 入口文件
    script: 'server/index.js',
    
    // 实例数量 (使用 'max' 启动CPU核心数实例)
    instances: 1,
    
    // 执行模式 ('fork' 单实例, 'cluster' 集群)
    exec_mode: 'fork',
    
    // 开发环境变量
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
      HOST: '0.0.0.0',
      MAX_PLAYERS: 50,
    },
    
    // 生产环境变量
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0',
      MAX_PLAYERS: 100,
    },
    
    // 内存限制重启 (MB)
    max_memory_restart: '500M',
    
    // 日志配置
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: 'logs/error.log',
    out_file: 'logs/output.log',
    merge_logs: true,
    
    // 自动重启
    autorestart: true,
    
    // 监听文件变化（开发环境）
    watch: false,
    ignore_watch: ['node_modules', 'logs', '.git'],
    
    // 最大重启次数
    max_restarts: 10,
    
    // 重启延迟 (ms)
    restart_delay: 5000,
    
    // 优雅关闭
    kill_timeout: 5000,
    listen_timeout: 10000,
    
    // 健康检查
    health_check: {
      interval: 30000,
      timeout: 3000,
      max_consecutive_failures: 3,
    },
  }],
};

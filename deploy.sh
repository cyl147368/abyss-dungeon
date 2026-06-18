#!/bin/bash
# 深渊地牢 - 服务器部署脚本
# Abyss Dungeon - Server Deployment Script

SERVER="ubuntu@121.4.97.25"
REMOTE_DIR="/home/ubuntu/abyss-dungeon"

echo "🚀 开始部署深渊地牢到服务器..."
echo "📡 目标服务器: $SERVER"

# 在服务器上克隆并启动
ssh $SERVER << 'ENDSSH'
    # 克隆仓库
    if [ -d "abyss-dungeon" ]; then
        cd abyss-dungeon
        git pull
    else
        git clone https://github.com/cyl147368/abyss-dungeon.git
        cd abyss-dungeon
    fi
    
    # 安装依赖
    npm install
    
    # 停止旧进程
    pkill -f "node server/index.js" 2>/dev/null || true
    
    # 启动服务器 (后台运行)
    nohup node server/index.js > game.log 2>&1 &
    
    echo "✅ 部署完成！"
    echo "🎮 游戏地址: http://121.4.97.25:3000"
ENDSSH

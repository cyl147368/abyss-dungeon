#!/bin/bash
# ============================================================
# 深渊地牢 - 服务器部署脚本
# Abyss Dungeon - Server Deployment Script
# ============================================================
# 
# 使用方法:
# 1. SSH登录服务器: ssh ubuntu@121.4.97.25
# 2. 执行此脚本: bash DEPLOY_SERVER.sh
#
# ============================================================

set -e

echo "🏰 深渊地牢 - 服务器部署脚本"
echo "================================"

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "📦 安装Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "✅ Node.js版本: $(node --version)"
echo "✅ npm版本: $(npm --version)"

# 克隆或更新仓库
if [ -d "abyss-dungeon" ]; then
    echo "📥 更新仓库..."
    cd abyss-dungeon
    git pull
else
    echo "📥 克隆仓库..."
    git clone https://github.com/cyl147368/abyss-dungeon.git
    cd abyss-dungeon
fi

# 安装依赖
echo "📦 安装依赖..."
npm install

# 停止旧进程
echo "🛑 停止旧进程..."
pkill -f "node server/index.js" 2>/dev/null || true

# 启动服务器
echo "🚀 启动服务器..."
nohup node server/index.js > game.log 2>&1 &
SERVER_PID=$!

# 等待服务器启动
sleep 2

# 验证服务器
if curl -s http://localhost:3000/health > /dev/null; then
    echo ""
    echo "✅ 部署成功！"
    echo "================================"
    echo "🎮 游戏地址: http://$(hostname -I | awk '{print $1}'):3000"
    echo "📊 服务器PID: $SERVER_PID"
    echo "📝 日志文件: game.log"
    echo ""
    echo "常用命令:"
    echo "  查看日志: tail -f game.log"
    echo "  停止服务器: kill $SERVER_PID"
    echo "  重启服务器: pkill -f 'node server/index.js' && nohup node server/index.js > game.log 2>&1 &"
else
    echo "❌ 服务器启动失败，请检查日志: cat game.log"
    exit 1
fi

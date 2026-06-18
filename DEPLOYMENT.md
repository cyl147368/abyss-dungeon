# 🚀 部署指南 | Deployment Guide

本文档提供深渊地牢游戏服务器的详细部署说明。

---

## 目录

- [环境要求](#环境要求)
- [方式一：直接部署](#方式一直接部署)
- [方式二：Docker部署](#方式二docker部署)
- [方式三：PM2部署](#方式三pm2部署)
- [Nginx反向代理配置](#nginx反向代理配置)
- [SSL证书配置](#ssl证书配置)
- [环境变量配置](#环境变量配置)
- [监控与日志](#监控与日志)
- [故障排除](#故障排除)

---

## 环境要求

| 依赖 | 最低版本 | 推荐版本 |
|------|----------|----------|
| Node.js | 16.0.0 | 18.x LTS |
| npm | 7.0.0 | 9.x |
| Docker (可选) | 20.10 | 24.x |
| Nginx (可选) | 1.18 | 1.24+ |

---

## 方式一：直接部署

### 1. 克隆项目

```bash
git clone https://github.com/cyl147368/abyss-dungeon.git
cd abyss-dungeon
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动服务器

```bash
# 生产环境启动
NODE_ENV=production PORT=3000 node server/index.js

# 或使用npm脚本
npm start
```

### 4. 后台运行（使用nohup）

```bash
nohup node server/index.js > app.log 2>&1 &
echo $! > app.pid
```

停止服务：
```bash
kill $(cat app.pid)
```

---

## 方式二：Docker部署

### 1. 使用Docker Compose（推荐）

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 2. 使用Docker命令

```bash
# 构建镜像
docker build -t abyss-dungeon .

# 运行容器
docker run -d \
  --name abyss-dungeon \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e MAX_PLAYERS=50 \
  --restart unless-stopped \
  abyss-dungeon

# 查看日志
docker logs -f abyss-dungeon

# 停止容器
docker stop abyss-dungeon
```

---

## 方式三：PM2部署

PM2是Node.js进程管理器，适合生产环境。

### 1. 安装PM2

```bash
npm install -g pm2
```

### 2. 创建PM2配置文件

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'abyss-dungeon',
    script: 'server/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      MAX_PLAYERS: 50,
    },
    max_memory_restart: '500M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: 'logs/error.log',
    out_file: 'logs/output.log',
    merge_logs: true,
  }],
};
```

### 3. 使用PM2

```bash
# 启动应用
pm2 start ecosystem.config.js

# 启动（生产环境）
pm2 start ecosystem.config.js --env production

# 查看状态
pm2 status

# 查看日志
pm2 logs abyss-dungeon

# 重启应用
pm2 restart abyss-dungeon

# 停止应用
pm2 stop abyss-dungeon

# 开机自启
pm2 startup
pm2 save
```

---

## Nginx反向代理配置

### 1. 安装Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install epel-release
sudo yum install nginx
```

### 2. 配置Nginx

创建 `/etc/nginx/sites-available/abyss-dungeon`：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名

    # HTTP重定向到HTTPS（可选）
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket超时设置
        proxy_read_timeout 86400;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://127.0.0.1:3000;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }
}
```

### 3. 启用配置

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/abyss-dungeon /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

---

## SSL证书配置

### 使用Let's Encrypt（免费）

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

### Nginx HTTPS配置

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL优化
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
```

---

## 环境变量配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `NODE_ENV` | development | 运行环境 |
| `PORT` | 3000 | 服务器端口 |
| `HOST` | 0.0.0.0 | 监听地址 |
| `MAX_PLAYERS` | 50 | 最大玩家数 |

### 创建环境变量文件

创建 `.env` 文件：

```bash
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
MAX_PLAYERS=100
```

---

## 监控与日志

### 健康检查端点

```bash
# 健康状态
curl http://localhost:3000/health

# 详细统计
curl http://localhost:3000/stats
```

返回示例：
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

### 日志查看

```bash
# 直接运行时
tail -f app.log

# PM2日志
pm2 logs abyss-dungeon

# Docker日志
docker logs -f abyss-dungeon

# 系统日志
journalctl -u abyss-dungeon -f
```

---

## 故障排除

### 端口被占用

```bash
# 查找占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>
```

### WebSocket连接失败

1. 检查防火墙设置
2. 确认Nginx配置了WebSocket支持
3. 检查代理超时设置

### 内存占用过高

```bash
# 查看Node.js内存使用
node -e "console.log(process.memoryUsage())"

# 增加内存限制
node --max-old-space-size=1024 server/index.js
```

### 权限问题

```bash
# 确保日志目录有写入权限
chmod 755 logs/
chown -R $USER:$USER logs/
```

---

## 生产环境建议

1. **使用进程管理器**：推荐PM2或systemd
2. **配置反向代理**：使用Nginx处理静态资源和SSL
3. **启用日志轮转**：防止日志文件过大
4. **设置监控**：使用Prometheus或健康检查脚本
5. **定期备份**：备份游戏配置和日志
6. **安全加固**：限制访问IP、配置防火墙

---

## 更多帮助

- GitHub Issues: https://github.com/cyl147368/abyss-dungeon/issues
- 邮箱: your-email@example.com

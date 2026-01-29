# 快速启动指南

## 1. 安装 PostgreSQL

### macOS
```bash
brew install postgresql@14
brew services start postgresql@14
```

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Windows
下载并安装 PostgreSQL: https://www.postgresql.org/download/windows/

## 2. 创建数据库

```bash
# 创建数据库（使用默认的 postgres 用户）
createdb readme_bot

# 或者使用 psql
psql -U postgres
CREATE DATABASE readme_bot;
\q
```

## 3. 配置并启动后端

```bash
cd backend

# 安装依赖
npm install

# 配置环境变量（编辑 .env 文件）
# 确保 DATABASE_URL 指向你的 PostgreSQL 数据库
# 格式: postgresql://用户名:密码@localhost:5432/readme_bot

# 生成 Prisma Client
npm run prisma:generate

# 运行数据库迁移
npm run prisma:migrate

# 启动后端服务器
npm run dev
```

后端将运行在 http://localhost:5000

## 4. 启动前端

打开新终端窗口:

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端将运行在 http://localhost:5173

## 5. 访问应用

在浏览器中打开 http://localhost:5173

## 常见问题

### 数据库连接失败
- 确保 PostgreSQL 正在运行: `brew services list` (macOS) 或 `sudo systemctl status postgresql` (Linux)
- 检查 backend/.env 中的 DATABASE_URL 是否正确
- 确认数据库 readme_bot 已创建

### 端口已被占用
- 后端端口被占用: 修改 backend/.env 中的 PORT
- 前端端口被占用: Vite 会自动使用下一个可用端口

### Prisma 迁移失败
```bash
cd backend
npm run prisma:migrate -- --name init
```

## 可选: 启用 AI 功能

1. 在 https://console.anthropic.com 注册并获取 API 密钥
2. 在 backend/.env 中设置 ANTHROPIC_API_KEY
3. 重启后端服务器

## 下一步

- 注册一个账号
- 创建你的第一个文档
- 尝试语音朗读功能
- 使用 AI 提问（如果已配置）

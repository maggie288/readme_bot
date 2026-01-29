#!/bin/bash

# ReadmeBOT 本地开发启动脚本 (不使用 Docker)
# 使用方法: ./scripts/dev.sh
# 要求: 本地已安装 PostgreSQL 并运行

set -e

echo "🚀 启动 ReadmeBOT (开发模式)..."

# 获取脚本所在目录的父目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 检查 PostgreSQL 是否运行
if ! pg_isready &> /dev/null; then
    echo "⚠️  警告: PostgreSQL 未运行，尝试启动..."
    brew services start postgresql@16 2>/dev/null || brew services start postgresql 2>/dev/null || {
        echo "❌ 无法启动 PostgreSQL，请手动启动"
        exit 1
    }
    sleep 2
fi

# 安装依赖（如果需要）
echo "📦 检查依赖..."
cd "$PROJECT_DIR/backend" && npm install
cd "$PROJECT_DIR/frontend" && npm install

# 运行数据库迁移
echo "🔄 运行数据库迁移..."
cd "$PROJECT_DIR/backend" && npx prisma migrate deploy

# 启动后端（后台运行）
echo "🔧 启动后端服务..."
cd "$PROJECT_DIR/backend" && npm run dev &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 启动前端（后台运行）
echo "🎨 启动前端服务..."
cd "$PROJECT_DIR/frontend" && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ ReadmeBOT 开发环境已启动!"
echo ""
echo "📍 访问地址:"
echo "   前端: http://localhost:5173"
echo "   后端: http://localhost:3001"
echo ""
echo "📋 进程 PID:"
echo "   后端: $BACKEND_PID"
echo "   前端: $FRONTEND_PID"
echo ""
echo "💡 按 Ctrl+C 停止所有服务"

# 捕获终止信号
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; echo '✅ 所有服务已停止'; exit 0" SIGINT SIGTERM

# 等待子进程
wait

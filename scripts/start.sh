#!/bin/bash

# ReadmeBOT 一键启动脚本 (Docker 模式)
# 使用方法: ./scripts/start.sh

set -e

echo "🚀 启动 ReadmeBOT..."

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: Docker 未安装，请先安装 Docker"
    exit 1
fi

# 检查 docker-compose 是否可用
if ! docker compose version &> /dev/null; then
    echo "❌ 错误: Docker Compose 不可用"
    exit 1
fi

# 构建并启动服务
echo "📦 构建 Docker 镜像..."
docker compose build

echo "🔄 启动所有服务..."
docker compose up -d

echo ""
echo "✅ ReadmeBOT 已启动!"
echo ""
echo "📍 访问地址:"
echo "   前端: http://localhost:5173"
echo "   后端: http://localhost:3001"
echo "   数据库: localhost:5432"
echo ""
echo "📋 常用命令:"
echo "   查看日志: docker compose logs -f"
echo "   停止服务: ./scripts/stop.sh"
echo "   重启服务: ./scripts/restart.sh"

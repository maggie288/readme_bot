#!/bin/bash

# ReadmeBOT 重启脚本
# 使用方法: ./scripts/restart.sh

echo "🔄 重启 ReadmeBOT..."

docker compose down
docker compose up -d

echo ""
echo "✅ ReadmeBOT 已重启!"
echo ""
echo "📍 访问地址:"
echo "   前端: http://localhost:5173"
echo "   后端: http://localhost:3001"

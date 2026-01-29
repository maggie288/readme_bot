#!/bin/bash

# ReadmeBOT 停止脚本
# 使用方法: ./scripts/stop.sh

echo "🛑 停止 ReadmeBOT..."

docker compose down

echo "✅ 所有服务已停止"

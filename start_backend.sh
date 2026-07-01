#!/bin/bash
# Future Child Posting — 快速启动脚本

echo "🚀 启动 Future Child Posting..."
echo ""

# 检查端口占用
for port in 8000 3000; do
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  端口 $port 已被占用"
  fi
done

echo "📦 启动后端 (FastAPI :8000)..."
cd "$(dirname "$0")/backend"
PYTHONPATH="$(dirname "$0")" uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

echo "🎨 启动前端 (Next.js :3000)..."
cd "$(dirname "$0")/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ 服务已启动："
echo "   前端：http://localhost:3000"
echo "   后端：http://localhost:8000"
echo ""
echo "按 Ctrl+C 停止所有服务"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
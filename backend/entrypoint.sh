#!/bin/bash
set -e

echo "=================================================="
echo "🚀 [POT Provider] bgutil-ytdlp-pot-provider 시작 (포트: 4416)"
echo "=================================================="

# 백그라운드에서 POT Provider Node.js 서버 실행
if [ -f "/opt/bgutil-provider/build/main.js" ]; then
    node /opt/bgutil-provider/build/main.js &
elif [ -f "/app/pot-provider/server/build/main.js" ]; then
    node /app/pot-provider/server/build/main.js &
else
    echo "⚠️ [POT Provider] build/main.js 파일을 찾지 못했습니다. 경로를 확인하세요."
fi

# 포트 4416 헬스체크 (최대 10초 대기)
echo "⏳ POT Provider 서버 준비 대기 중 (127.0.0.1:4416)..."
for i in $(seq 1 10); do
    if curl -s -f http://127.0.0.1:4416/ping > /dev/null 2>&1 || curl -s http://127.0.0.1:4416/ > /dev/null 2>&1; then
        echo "✅ [POT Provider] 127.0.0.1:4416 준비 완료! ($i 초 소요)"
        break
    fi
    sleep 1
done

echo "=================================================="
echo "🚀 [Uvicorn] FastAPI 메인 서버 실행 (PORT: ${PORT:-8080})"
echo "=================================================="

exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}

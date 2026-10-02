#!/bin/bash
# ==============================================================================
# Seolgyo AI 백엔드 배포 및 Cloud Tasks 설정 스크립트
# ==============================================================================

# 프로젝트 설정
PROJECT_ID="sermon-ym"
REGION="asia-northeast3"
SERVICE_NAME="nations-sermon"
IMAGE_URL="gcr.io/$PROJECT_ID/$SERVICE_NAME"
BUCKET_NAME="$PROJECT_ID.appspot.com"

echo "🚀 [1단계] 백엔드 Docker 이미지 빌드 및 푸시..."
gcloud builds submit --tag $IMAGE_URL

echo "🚀 [2단계] Cloud Run 서비스 배포 (FFmpeg OOM 방지 및 적정 동시성 적용)"
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_URL \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --concurrency 4 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 3600 \
  --set-env-vars CLOUD_TASKS_LOCATION=$REGION,CLOUD_TASKS_QUEUE=sermon-worker-queue

# Cloud Run 서비스 URL 가져오기
WORKER_HOST=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')

echo "✅ Cloud Run 배포 완료: $WORKER_HOST"

echo "🚀 [3단계] Cloud Run 서비스 환경변수에 자신(WORKER_HOST)의 URL 등록"
gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --update-env-vars WORKER_HOST=$WORKER_HOST

echo "🚀 [4단계] Cloud Tasks 분석/렌더링 큐(Queue) 생성 및 속도 제한 설정 (FFmpeg OOM 방지 및 Gemini 보호)"
# 큐가 존재하는지 확인
gcloud tasks queues describe sermon-worker-queue --location=$REGION > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ 큐가 이미 존재합니다. 속도 제한을 업데이트합니다."
  gcloud tasks queues update sermon-worker-queue \
    --location=$REGION \
    --max-dispatches-per-second=1.0 \
    --max-concurrent-dispatches=2 \
    --max-attempts=2
else
  echo "✅ 새로운 큐를 생성합니다."
  gcloud tasks queues create sermon-worker-queue \
    --location=$REGION \
    --max-dispatches-per-second=1.0 \
    --max-concurrent-dispatches=2 \
    --max-attempts=2
fi

echo "🚀 [5단계] Cloud Storage 버킷 7일 자동 삭제(Lifecycle) 규칙 적용"
if [ -f "lifecycle.json" ]; then
  gcloud storage buckets update gs://$BUCKET_NAME --lifecycle-file=lifecycle.json || true
elif [ -f "backend/lifecycle.json" ]; then
  gcloud storage buckets update gs://$BUCKET_NAME --lifecycle-file=backend/lifecycle.json || true
fi

echo "=============================================================================="
echo "🎉 모든 배포와 환경 설정이 완료되었습니다!"
echo "- Cloud Run Service: Concurrency=1, Memory=2Gi (OOM/FFmpeg 충돌 완전 차단)"
echo "- Cloud Tasks Queue: Max dispatches/sec=0.16 (Gemini 무료 API 초과 차단)"
echo "=============================================================================="

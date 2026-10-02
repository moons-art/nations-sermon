import os
import json
import logging
from typing import Dict, Any, Optional
from google.cloud import tasks_v2
from google.protobuf import timestamp_pb2
import datetime

logger = logging.getLogger(__name__)

PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "sermon-ym")
LOCATION = os.getenv("CLOUD_TASKS_LOCATION", "asia-northeast3") 
QUEUE_NAME = os.getenv("CLOUD_TASKS_QUEUE", "sermon-worker-queue")
# Cloud Run 배포 후 할당되는 실제 호스트 주소 (환경 변수에서 주입)
WORKER_HOST = os.getenv("WORKER_HOST", "http://localhost:8000")

_client = None

def get_tasks_client():
    global _client
    if _client is not None:
        return _client
    try:
        _client = tasks_v2.CloudTasksClient()
        return _client
    except Exception as e:
        logger.warning(f"Cloud Tasks 클라이언트 초기화 실패 (로컬 환경일 수 있음): {e}")
        return None

def create_task(endpoint: str, payload: Dict[str, Any], in_seconds: int = 0) -> bool:
    """
    Cloud Tasks 큐에 HTTP POST 작업을 추가합니다.
    """
    client = get_tasks_client()
    url = f"{WORKER_HOST.rstrip('/')}/{endpoint.lstrip('/')}"
    
    if not client:
        # 로컬 환경 폴백: BackgroundTasks 처럼 동작하게 하려면 FastAPI 라우터 단에서 처리해야 하나, 
        # 일단 httpx로 Fire-and-Forget 요청을 날리거나 asyncio.create_task로 감싼다.
        logger.info(f"로컬 모드: Cloud Tasks 대신 비동기로 즉시 {url} 호출 시도")
        import asyncio
        import httpx
        
        async def _local_worker():
            if in_seconds > 0:
                await asyncio.sleep(in_seconds)
            try:
                async with httpx.AsyncClient() as hc:
                    await hc.post(url, json=payload, timeout=30.0)
            except Exception as e:
                logger.error(f"로컬 워커 폴백 호출 실패: {e}")
                
        asyncio.create_task(_local_worker())
        return True

    try:
        parent = client.queue_path(PROJECT_ID, LOCATION, QUEUE_NAME)
        task = {
            "http_request": {
                "http_method": tasks_v2.HttpMethod.POST,
                "url": url,
                "headers": {"Content-type": "application/json"},
                "body": json.dumps(payload).encode(),
            }
        }
        if in_seconds > 0:
            d = datetime.datetime.utcnow() + datetime.timedelta(seconds=in_seconds)
            timestamp = timestamp_pb2.Timestamp()
            timestamp.FromDatetime(d)
            task["schedule_time"] = timestamp

        # OIDC 인증 (보안 Cloud Run을 위해 서비스 어카운트 설정 - 옵션)
        service_account_email = os.getenv("SERVICE_ACCOUNT_EMAIL")
        if service_account_email:
            task["http_request"]["oidc_token"] = {"service_account_email": service_account_email}

        response = client.create_task(request={"parent": parent, "task": task})
        logger.info(f"✅ Cloud Task 생성 성공: {response.name}")
        return True
    except Exception as e:
        logger.error(f"❌ Cloud Task 생성 실패: {e}")
        return False

import os
import logging
from pathlib import Path
from typing import Optional
from datetime import timedelta

logger = logging.getLogger(__name__)

# 버킷 이름 (환경 변수 또는 기본 프로젝트 ID 기반)
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "sermon-ym")
BUCKET_NAME = os.getenv("FIREBASE_STORAGE_BUCKET", f"{PROJECT_ID}.appspot.com")

_storage_client = None
_bucket = None
_lifecycle_configured = False


def _get_bucket():
    global _storage_client, _bucket
    if _bucket is not None:
        return _bucket

    try:
        from google.cloud import storage
        _storage_client = storage.Client()
        _bucket = _storage_client.bucket(BUCKET_NAME)
        return _bucket
    except Exception as e:
        logger.info(f"로컬 환경 또는 Google Storage 미설정: {e}")
        return None


def ensure_7day_lifecycle_rule():
    """버킷에 7일 후 자동 삭제(Lifecycle Rule) 규칙을 적용합니다."""
    global _lifecycle_configured
    if _lifecycle_configured:
        return

    bucket = _get_bucket()
    if not bucket:
        return

    try:
        rules = list(bucket.lifecycle_rules)
        has_7day_rule = any(
            rule.get("condition", {}).get("age") == 7 and rule.get("action", {}).get("type") == "Delete"
            for rule in rules
        )

        if not has_7day_rule:
            bucket.add_lifecycle_delete_rule(age=7)
            bucket.patch()
            logger.info(f"✅ Firebase Storage 버킷({bucket.name})에 '7일 후 자동 영구삭제' 수명주기 규칙 적용 완료!")
        _lifecycle_configured = True
    except Exception as e:
        logger.warning(f"수명주기 규칙 설정 확인 중 오류 (권한 부족 시 콘솔에서 수동 적용 가능): {e}")


def upload_short_to_firebase(local_file_path: Path, remote_filename: str) -> Optional[str]:
    """
    렌더링된 쇼츠 mp4 파일을 Firebase Storage에 업로드하고 토큰 기반 다운로드 URL을 반환합니다.
    (브라우저 및 모바일에서 100% 즉시 재생/다운로드 가능한 Firebase 공식 표준 URL)
    """
    if not local_file_path or not local_file_path.exists():
        logger.warning(f"업로드할 로컬 파일이 존재하지 않습니다: {local_file_path}")
        return None

    import uuid
    import urllib.parse

    bucket_candidates = [
        os.getenv("FIREBASE_STORAGE_BUCKET", f"{PROJECT_ID}.appspot.com"),
        f"{PROJECT_ID}.firebasestorage.app",
        f"{PROJECT_ID}.appspot.com"
    ]
    seen = set()
    unique_buckets = [b for b in bucket_candidates if not (b in seen or seen.add(b))]

    for b_name in unique_buckets:
        try:
            from google.cloud import storage
            client = storage.Client()
            bucket = client.bucket(b_name)
            
            blob_path = f"shorts/{remote_filename}"
            blob = bucket.blob(blob_path)
            
            # Firebase 공식 토큰 기반 공개 다운로드 URL 생성
            download_token = uuid.uuid4().hex
            blob.metadata = {"firebaseStorageDownloadTokens": download_token}
            
            blob.upload_from_filename(
                str(local_file_path),
                content_type="video/mp4"
            )
            
            encoded_path = urllib.parse.quote(blob_path, safe='')
            download_url = f"https://firebasestorage.googleapis.com/v0/b/{b_name}/o/{encoded_path}?alt=media&token={download_token}"
            logger.info(f"✅ Firebase Storage 업로드 및 토큰 URL 발급 성공 ({b_name}): {download_url}")
            return download_url
        except Exception as e:
            logger.warning(f"Firebase Storage 버킷({b_name}) 업로드 실패: {e}")
            continue

    logger.warning("모든 Firebase Storage 버킷 업로드 실패 -> 로컬 URL로 폴백")
    return None

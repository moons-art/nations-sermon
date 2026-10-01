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
        # 버킷 존재 확인
        if not _bucket.exists():
            # 혹시 .firebasestorage.app 형태일 경우 재시도
            alt_bucket_name = f"{PROJECT_ID}.firebasestorage.app"
            alt_bucket = _storage_client.bucket(alt_bucket_name)
            if alt_bucket.exists():
                _bucket = alt_bucket
                logger.info(f"Firebase Storage 대체 버킷 사용: {alt_bucket_name}")
            else:
                logger.warning(f"Storage 버킷({BUCKET_NAME})을 찾을 수 없습니다.")
                return None
        return _bucket
    except Exception as e:
        logger.info(f"로컬 환경 또는 Google Storage 미설정 (로컬 저장소 모드로 작동): {e}")
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
    렌더링된 쇼츠 mp4 파일을 Firebase Storage에 업로드하고 다운로드 URL을 반환합니다.
    실패하거나 로컬 모드일 경우 None을 반환합니다.
    """
    bucket = _get_bucket()
    if not bucket or not local_file_path.exists():
        return None

    try:
        ensure_7day_lifecycle_rule()
        blob_path = f"shorts/{remote_filename}"
        blob = bucket.blob(blob_path)
        
        # mp4 업로드 (캐시 제어 및 Content-Type 지정)
        blob.upload_from_filename(
            str(local_file_path),
            content_type="video/mp4"
        )
        
        # 공개 읽기 권한 시도 또는 서명된 URL (7일 만료)
        try:
            blob.make_public()
            public_url = blob.public_url
            logger.info(f"✅ Firebase Storage 공개 URL 발급: {public_url}")
            return public_url
        except Exception:
            # 버킷이 공개 차단 정책일 경우 7일 만료 Signed URL 생성
            signed_url = blob.generate_signed_url(
                version="v4",
                expiration=timedelta(days=7),
                method="GET"
            )
            logger.info(f"✅ Firebase Storage 7일 서명 URL 발급 완료: {remote_filename}")
            return signed_url

    except Exception as e:
        logger.warning(f"Firebase Storage 업로드 실패 (로컬 URL로 대체합니다): {e}")
        return None

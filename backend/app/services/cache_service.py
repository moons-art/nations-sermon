import json
import hashlib
import logging
from pathlib import Path
from typing import Optional, Dict, Any
from app.config import OUTPUTS_DIR
from app.services.firestore_service import save_document, get_document

logger = logging.getLogger(__name__)

CACHE_DIR = OUTPUTS_DIR / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# 메모리 캐시 (가장 빠른 응답용)
_memory_cache: Dict[str, Dict[str, Any]] = {}

import re

def extract_video_id(url: str) -> str:
    """유튜브 URL에서 11자리 비디오 ID 추출"""
    patterns = [
        r"(?:v=)([0-9A-Za-z_-]{11})",
        r"youtu\.be\/([0-9A-Za-z_-]{11})",
        r"youtube\.com\/shorts\/([0-9A-Za-z_-]{11})",
        r"youtube\.com\/live\/([0-9A-Za-z_-]{11})",
        r"(?:embed\/)([0-9A-Za-z_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return ""

def get_url_hash(url: str) -> str:
    """유튜브 비디오 ID 기반 정규화된 캐시 키 생성"""
    vid = extract_video_id(url)
    if vid:
        return f"vid_{vid}"
    clean_url = url.strip().split("&list=")[0].split("?list=")[0]
    return hashlib.sha256(clean_url.encode("utf-8")).hexdigest()[:16]

def get_text_hash(text: str) -> str:
    """설교 텍스트의 해시값 생성"""
    clean_text = text.strip()
    return hashlib.sha256(clean_text.encode("utf-8")).hexdigest()[:16]

def get_legacy_url_hash(url: str) -> str:
    clean_url = url.strip().split("&list=")[0].split("?list=")[0]
    return hashlib.sha256(clean_url.encode("utf-8")).hexdigest()[:16]

def _lookup_cache_by_key(key: str) -> Optional[Dict[str, Any]]:
    # 1. 메모리 캐시 확인
    if key in _memory_cache:
        return _memory_cache[key]
        
    # 2. 디스크 파일 캐시 확인
    cache_file = CACHE_DIR / f"{key}.json"
    if cache_file.exists():
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                _memory_cache[key] = data
                return data
        except Exception as e:
            logger.warning(f"캐시 파일 로드 실패: {e}")
            
    # 3. Firestore (영구 저장소) 캐시 확인
    fs_data = get_document("analysis_cache", key)
    if fs_data:
        _memory_cache[key] = fs_data
        try:
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(fs_data, f, ensure_ascii=False, indent=2)
        except:
            pass
        return fs_data

    return None

def get_cached_analysis(url: str) -> Optional[Dict[str, Any]]:
    """동일한 유튜브 URL의 분석 결과가 캐시에 있는지 확인 (비디오 ID 우선 및 레거시 해시 폴백)"""
    if not url:
        return None
        
    # 1. 비디오 ID 기반 정규 키 확인
    primary_key = f"yt_{get_url_hash(url)}"
    data = _lookup_cache_by_key(primary_key)
    if data:
        logger.info(f"✅ [과금방지 캐시 히트 (표준 ID)] URL: {url} -> Gemini API 재호출 생략")
        return data

    # 2. 레거시 SHA256 해시 키 폴백 확인
    legacy_key = f"yt_{get_legacy_url_hash(url)}"
    if legacy_key != primary_key:
        legacy_data = _lookup_cache_by_key(legacy_key)
        if legacy_data:
            logger.info(f"✅ [과금방지 캐시 히트 (레거시 해시)] URL: {url} -> Gemini API 재호출 생략")
            # 향후 빠른 접근을 위해 표준 키로도 동기화 저장
            save_cached_analysis(url, legacy_data)
            return legacy_data

    return None

def save_cached_analysis(url: str, data: Dict[str, Any]):
    """분석 완료된 결과를 캐시에 저장 (표준 키 + 레거시 키 모두 기록)"""
    if not url or not data:
        return
    primary_key = f"yt_{get_url_hash(url)}"
    legacy_key = f"yt_{get_legacy_url_hash(url)}"

    keys_to_save = {primary_key}
    if legacy_key != primary_key:
        keys_to_save.add(legacy_key)

    for key in keys_to_save:
        _memory_cache[key] = data
        cache_file = CACHE_DIR / f"{key}.json"
        try:
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.warning(f"캐시 파일 로컬 저장 실패 ({key}): {e}")

        # Firestore 영구 보관
        save_document("analysis_cache", key, data)

    logger.info(f"💾 설교 분석 결과 캐시 영구 저장 완료 (키: {', '.join(keys_to_save)})")

def get_cached_text_analysis(text: str) -> Optional[Dict[str, Any]]:
    """동일한 텍스트의 분석 결과 캐시 확인"""
    if not text:
        return None
    key = f"txt_{get_text_hash(text)}"
    if key in _memory_cache:
        logger.info(f"✅ [과금방지 캐시 히트] 동일 텍스트 재분석 생략")
        return _memory_cache[key]
    cache_file = CACHE_DIR / f"{key}.json"
    if cache_file.exists():
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                _memory_cache[key] = data
                return data
        except Exception:
            pass
            
    # Firestore 영구 저장소 캐시 확인
    fs_data = get_document("analysis_cache", key)
    if fs_data:
        _memory_cache[key] = fs_data
        try:
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(fs_data, f, ensure_ascii=False, indent=2)
        except:
            pass
        return fs_data

    return None

def save_cached_text_analysis(text: str, data: Dict[str, Any]):
    """텍스트 분석 결과 캐시 저장"""
    if not text or not data:
        return
    key = f"txt_{get_text_hash(text)}"
    _memory_cache[key] = data
    cache_file = CACHE_DIR / f"{key}.json"
    try:
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception:
        pass
        
    save_document("analysis_cache", key, data)

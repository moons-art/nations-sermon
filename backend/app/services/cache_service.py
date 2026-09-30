import json
import hashlib
import logging
from pathlib import Path
from typing import Optional, Dict, Any
from app.config import OUTPUTS_DIR

logger = logging.getLogger(__name__)

CACHE_DIR = OUTPUTS_DIR / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# 메모리 캐시 (가장 빠른 응답용)
_memory_cache: Dict[str, Dict[str, Any]] = {}

def get_url_hash(url: str) -> str:
    """유튜브 URL의 정규화된 해시값 생성"""
    clean_url = url.strip()
    return hashlib.sha256(clean_url.encode("utf-8")).hexdigest()[:16]

def get_text_hash(text: str) -> str:
    """설교 텍스트의 해시값 생성"""
    clean_text = text.strip()
    return hashlib.sha256(clean_text.encode("utf-8")).hexdigest()[:16]

def get_cached_analysis(url: str) -> Optional[Dict[str, Any]]:
    """동일한 유튜브 URL의 분석 결과가 캐시에 있는지 확인"""
    if not url:
        return None
    key = f"yt_{get_url_hash(url)}"
    
    # 1. 메모리 캐시 확인
    if key in _memory_cache:
        logger.info(f"✅ [과금방지 캐시 히트 (메모리)] URL: {url} -> Gemini API 재호출 생략")
        return _memory_cache[key]
        
    # 2. 디스크 파일 캐시 확인
    cache_file = CACHE_DIR / f"{key}.json"
    if cache_file.exists():
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                _memory_cache[key] = data
                logger.info(f"✅ [과금방지 캐시 히트 (디스크)] URL: {url} -> Gemini API 재호출 생략")
                return data
        except Exception as e:
            logger.warning(f"캐시 파일 로드 실패: {e}")
            
    return None

def save_cached_analysis(url: str, data: Dict[str, Any]):
    """분석 완료된 결과를 캐시에 저장"""
    if not url or not data:
        return
    key = f"yt_{get_url_hash(url)}"
    _memory_cache[key] = data
    cache_file = CACHE_DIR / f"{key}.json"
    try:
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info(f"💾 설교 분석 결과 캐시 저장 완료: {cache_file.name}")
    except Exception as e:
        logger.warning(f"캐시 파일 저장 실패: {e}")

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

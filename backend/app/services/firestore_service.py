import os
import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
from app.config import OUTPUTS_DIR

logger = logging.getLogger(__name__)

PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "sermon-ym")

_firestore_client = None
_firestore_initialized = False

# 1. 인메모리 캐시 (서버 구동 중 즉시 접근용)
_memory_store: Dict[str, Dict[str, Any]] = {}

# 2. 로컬 디스크 저장 디렉터리 (Firestore 연결 실패 시에도 영구 보존)
META_DIR = OUTPUTS_DIR / "meta"
META_DIR.mkdir(parents=True, exist_ok=True)

def _get_disk_path(collection: str, document_id: str) -> Path:
    return META_DIR / f"{collection}_{document_id}.json"

def get_firestore_client():
    global _firestore_client, _firestore_initialized
    if _firestore_initialized:
        return _firestore_client

    _firestore_initialized = True
    try:
        from google.cloud import firestore
        _firestore_client = firestore.Client(project=PROJECT_ID)
        return _firestore_client
    except Exception as e:
        logger.warning(f"Firestore 클라이언트 초기화 실패 (로컬 디스크/메모리 저장소 모드로 작동): {e}")
        return None

def save_document(collection: str, document_id: str, data: Dict[str, Any]):
    key = f"{collection}_{document_id}"
    
    # 1. 메모리에 즉시 저장
    _memory_store[key] = dict(data)
    
    # 2. 디스크 JSON 파일에 영구 저장
    try:
        disk_file = _get_disk_path(collection, document_id)
        disk_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        logger.warning(f"디스크 메타 저장 실패 ({key}): {e}")

    # 3. Firestore 원격 동기화 시도
    db = get_firestore_client()
    if db:
        try:
            db.collection(collection).document(document_id).set(data)
            return True
        except Exception as e:
            logger.warning(f"Firestore 문서 저장 실패 ({key}): {e}")
            
    return True

def get_document(collection: str, document_id: str) -> Optional[Dict[str, Any]]:
    key = f"{collection}_{document_id}"
    
    # 1. 메모리 확인
    if key in _memory_store:
        return _memory_store[key]
        
    # 2. 디스크 파일 확인
    disk_file = _get_disk_path(collection, document_id)
    if disk_file.exists():
        try:
            data = json.loads(disk_file.read_text(encoding="utf-8"))
            _memory_store[key] = data
            return data
        except Exception as e:
            logger.warning(f"디스크 메타 로드 실패 ({key}): {e}")

    # 3. Firestore 원격 확인
    db = get_firestore_client()
    if db:
        try:
            doc = db.collection(collection).document(document_id).get()
            if doc.exists:
                data = doc.to_dict()
                _memory_store[key] = data
                return data
        except Exception as e:
            logger.warning(f"Firestore 문서 조회 실패 ({key}): {e}")

    return None

def get_all_documents(collection: str) -> List[Dict[str, Any]]:
    results: Dict[str, Dict[str, Any]] = {}

    # 1. Firestore 원격 조회 시도
    db = get_firestore_client()
    if db:
        try:
            docs = db.collection(collection).stream()
            for doc in docs:
                d = doc.to_dict()
                doc_id = doc.id
                d['_id'] = doc_id
                results[doc_id] = d
                _memory_store[f"{collection}_{doc_id}"] = d
        except Exception as e:
            logger.warning(f"Firestore 컬렉션 조회 실패 ({collection}): {e}")

    # 2. 디스크 파일 병합 (Firestore보다 최신 로컬 작업 우선)
    prefix = f"{collection}_"
    if META_DIR.exists():
        for f in META_DIR.glob(f"{prefix}*.json"):
            doc_id = f.stem[len(prefix):]
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                if doc_id not in results or (data.get("updated_at", 0) >= results[doc_id].get("updated_at", 0)):
                    data['_id'] = doc_id
                    results[doc_id] = data
                    _memory_store[f"{collection}_{doc_id}"] = data
            except Exception:
                pass

    # 3. 메모리 데이터 병합 (최신 작업 우선)
    for key, val in _memory_store.items():
        if key.startswith(prefix):
            doc_id = key[len(prefix):]
            if doc_id not in results or (val.get("updated_at", 0) >= results[doc_id].get("updated_at", 0)):
                val["_id"] = doc_id
                results[doc_id] = val

    return list(results.values())

def delete_document(collection: str, document_id: str):
    key = f"{collection}_{document_id}"
    _memory_store.pop(key, None)
    
    disk_file = _get_disk_path(collection, document_id)
    if disk_file.exists():
        try:
            disk_file.unlink()
        except Exception:
            pass

    db = get_firestore_client()
    if db:
        try:
            db.collection(collection).document(document_id).delete()
            return True
        except Exception as e:
            logger.warning(f"Firestore 문서 삭제 실패 ({key}): {e}")
            
    return True

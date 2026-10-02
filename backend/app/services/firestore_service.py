import os
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "sermon-ym")

_firestore_client = None

def get_firestore_client():
    global _firestore_client
    if _firestore_client is not None:
        return _firestore_client

    try:
        from google.cloud import firestore
        # Application Default Credentials will be used automatically in Cloud Run
        _firestore_client = firestore.Client(project=PROJECT_ID)
        return _firestore_client
    except Exception as e:
        logger.warning(f"Firestore 클라이언트 초기화 실패 (로컬 모드일 수 있음): {e}")
        return None

def save_document(collection: str, document_id: str, data: Dict[str, Any]):
    db = get_firestore_client()
    if not db:
        return False
    try:
        db.collection(collection).document(document_id).set(data)
        return True
    except Exception as e:
        logger.warning(f"Firestore 문서 저장 실패 ({collection}/{document_id}): {e}")
        return False

def get_document(collection: str, document_id: str) -> Optional[Dict[str, Any]]:
    db = get_firestore_client()
    if not db:
        return None
    try:
        doc = db.collection(collection).document(document_id).get()
        if doc.exists:
            return doc.to_dict()
        return None
    except Exception as e:
        logger.warning(f"Firestore 문서 조회 실패 ({collection}/{document_id}): {e}")
        return None

def get_all_documents(collection: str) -> List[Dict[str, Any]]:
    db = get_firestore_client()
    if not db:
        return []
    try:
        docs = db.collection(collection).stream()
        return [doc.to_dict() for doc in docs]
    except Exception as e:
        logger.warning(f"Firestore 컬렉션 조회 실패 ({collection}): {e}")
        return []

def delete_document(collection: str, document_id: str):
    db = get_firestore_client()
    if not db:
        return False
    try:
        db.collection(collection).document(document_id).delete()
        return True
    except Exception as e:
        logger.warning(f"Firestore 문서 삭제 실패 ({collection}/{document_id}): {e}")
        return False

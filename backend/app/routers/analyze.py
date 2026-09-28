import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.services.ai_service import analyze_sermon_video
from app.services.youtube_service import extract_video_details_and_transcript

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Analysis"])

class AnalyzeRequest(BaseModel):
    youtube_url: str
    gemini_api_key: Optional[str] = None

@router.post("/analyze")
async def analyze_url(req: AnalyzeRequest) -> Dict[str, Any]:
    url = req.youtube_url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="유튜브 URL을 입력해주세요.")

    try:
        # 1. 유튜브 실제 메타데이터 및 자막 추출
        details = extract_video_details_and_transcript(url)

        # 2. Gemini 3.8 Flash 실제 분석 (동영상 및 자막 기반)
        analysis = await analyze_sermon_video(
            youtube_url=url,
            video_details=details,
            custom_api_key=req.gemini_api_key
        )

        # 3. 유튜브 실제 정보로 메타데이터 보강
        if "metadata" not in analysis:
            analysis["metadata"] = {}
        if details.get("thumbnail") and not analysis["metadata"].get("thumbnail"):
            analysis["metadata"]["thumbnail"] = details["thumbnail"]
        if details.get("title") and (not analysis["metadata"].get("title") or analysis["metadata"]["title"] == "샘플 설교"):
            analysis["metadata"]["title"] = details["title"]
        if details.get("channel") and not analysis["metadata"].get("churchName"):
            analysis["metadata"]["churchName"] = details["channel"]

        return {
            "status": "success",
            "data": analysis
        }
    except Exception as e:
        logger.error(f"설교 분석 실패: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"설교 분석 중 오류가 발생했습니다: {str(e)}")

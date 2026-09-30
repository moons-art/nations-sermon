from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.services.ai_service import (
    complete_sermon_draft,
    refine_for_video,
    train_sermon_tone,
    analyze_sermon_video
)

router = APIRouter(prefix="/api/sermon", tags=["SermonEdit"])

class TextAnalyzeRequest(BaseModel):
    title: Optional[str] = "주일 설교"
    sermon_text: str
    gemini_api_key: Optional[str] = None

class DraftCompleteRequest(BaseModel):
    idea_text: str
    tone_profile: Optional[str] = ""
    gemini_api_key: Optional[str] = None

class VideoRefineRequest(BaseModel):
    sermon_text: str
    gemini_api_key: Optional[str] = None

class ToneTrainRequest(BaseModel):
    samples: List[str]
    gemini_api_key: Optional[str] = None

from app.services.cache_service import get_cached_text_analysis, save_cached_text_analysis

@router.post("/analyze-text")
async def analyze_text(req: TextAnalyzeRequest):
    if not req.sermon_text.strip():
        raise HTTPException(status_code=400, detail="설교 텍스트를 입력해주세요.")
        
    # [과금 방지 캐시 확인]
    cached = get_cached_text_analysis(req.sermon_text)
    if cached:
        if req.title and "metadata" in cached:
            cached["metadata"]["title"] = req.title
        return { "status": "success", "is_cached": True, "data": cached }

    details = {
        "title": req.title or "주일 설교",
        "channel": "본당 설교",
        "description": req.sermon_text[:2000],
        "transcript_text": req.sermon_text,
        "duration_str": "35:00"
    }
    try:
        data = await analyze_sermon_video(
            youtube_url="",
            video_details=details,
            custom_api_key=req.gemini_api_key
        )
        if req.title and "metadata" in data:
            data["metadata"]["title"] = req.title
        save_cached_text_analysis(req.sermon_text, data)
        return { "status": "success", "is_cached": False, "data": data }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/complete-draft")
async def complete_draft(req: DraftCompleteRequest):
    if not req.idea_text.strip():
        raise HTTPException(status_code=400, detail="설교 아이디어를 입력해주세요.")
    result = await complete_sermon_draft(
        req.idea_text,
        tone_profile=req.tone_profile or "",
        custom_api_key=req.gemini_api_key
    )
    return { "status": "success", "completed_sermon": result }

@router.post("/video-refine")
async def refine_sermon(req: VideoRefineRequest):
    if not req.sermon_text.strip():
        raise HTTPException(status_code=400, detail="교정할 설교문을 입력해주세요.")
    result = await refine_for_video(req.sermon_text, custom_api_key=req.gemini_api_key)
    return { "status": "success", "refined_sermon": result }

@router.post("/train-tone")
async def train_tone(req: ToneTrainRequest):
    valid_samples = [s.strip() for s in req.samples if s.strip()]
    if not valid_samples:
        raise HTTPException(status_code=400, detail="설교 샘플을 최소 1편 이상 입력해주세요.")
    profile = await train_sermon_tone(valid_samples, custom_api_key=req.gemini_api_key)
    return { "status": "success", "tone_profile": profile }

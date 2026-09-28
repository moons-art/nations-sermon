from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
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

@router.post("/analyze-text")
async def analyze_text(req: TextAnalyzeRequest):
    if not req.sermon_text.strip():
        raise HTTPException(status_code=400, detail="설교 텍스트를 입력해주세요.")
    # AI service를 활용해 텍스트 기반 콘텐츠 생성
    details = {
        "title": req.title or "주일 설교",
        "channel": "본당 설교",
        "description": req.sermon_text[:2000],
        "transcript_text": req.sermon_text,
        "duration_str": "35:00"
    }
    data = await analyze_sermon_video(
        youtube_url="",
        video_details=details,
        custom_api_key=req.gemini_api_key
    )
    if req.title:
        data["metadata"]["title"] = req.title
    return { "status": "success", "data": data }

@router.post("/complete-draft")
async def complete_draft(req: DraftCompleteRequest):
    if not req.idea_text.strip():
        raise HTTPException(status_code=400, detail="설교 아이디어나 본문 메모를 입력해주세요.")
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

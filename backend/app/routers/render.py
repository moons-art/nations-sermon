from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.services.render_queue import render_manager

router = APIRouter(prefix="/api/render", tags=["Render"])

class ShortRenderItem(BaseModel):
    short_id: str
    title: str
    start_time: str
    end_time: str
    duration: str
    sentences: List[Dict[str, Any]]
    bgm: Optional[str] = "grace.mp3"
    template: Optional[str] = "dark_minimal"
    platform: Optional[str] = "youtube" # "youtube" | "instagram"
    church_name: Optional[str] = ""
    youtube_url: Optional[str] = ""
    title_question: Optional[str] = None
    title_answer: Optional[str] = None

class BatchRenderRequest(BaseModel):
    items: List[ShortRenderItem]

@router.post("/queue")
async def queue_renders(req: BatchRenderRequest):
    if not req.items:
        raise HTTPException(status_code=400, detail="선택된 쇼츠 항목이 없습니다.")

    queued_jobs = []
    for item in req.items:
        job_id = render_manager.add_job(item.model_dump())
        queued_jobs.append({
            "job_id": job_id,
            "short_id": item.short_id,
            "title": item.title,
            "status": "QUEUED"
        })

    return {
        "status": "success",
        "message": f"{len(queued_jobs)}개의 쇼츠가 순차 렌더링 큐에 등록되었습니다.",
        "jobs": queued_jobs
    }

@router.get("/jobs")
async def list_jobs():
    return {
        "status": "success",
        "jobs": render_manager.get_all_jobs()
    }

@router.get("/status/{job_id}")
async def get_status(job_id: str):
    job = render_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="해당 작업을 찾을 수 없습니다.")
    return {
        "status": "success",
        "job": job
    }

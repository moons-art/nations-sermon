import os
import time
import logging
import asyncio
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request
from typing import Dict, Any

from app.config import OUTPUTS_DIR
from app.services.firestore_service import save_document, get_document
from app.services.youtube_service import download_or_prepare_clip
from app.services.ffmpeg_service import render_short_video
from app.services.storage_service import upload_short_to_firebase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/worker", tags=["Worker"])

@router.post("/render")
async def render_worker(req: Request):
    try:
        body = await req.json()
    except:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
        
    job_id = body.get("job_id")
    if not job_id:
        raise HTTPException(status_code=400, detail="job_id is required")

    job = get_document("render_jobs", job_id)
    if not job:
        logger.error(f"Render job not found in Firestore: {job_id}")
        return {"status": "error", "message": "Job not found"}

    if job.get("status") in ["COMPLETED", "CANCELLED", "FAILED"]:
        logger.info(f"Job {job_id} is already in terminal state: {job.get('status')}")
        return {"status": "skipped", "message": "Already terminal state"}

    def update_job(updates: dict):
        job.update(updates)
        job["updated_at"] = time.time()
        save_document("render_jobs", job_id, job)
        
    source_video = OUTPUTS_DIR / f"src_{job.get('short_id', 'unknown')}_{job_id}.mp4"
    output_video = OUTPUTS_DIR / f"shorts_{job.get('short_id', 'unknown')}_{job_id}.mp4"

    try:
        logger.info(f"🚀 [Cloud Tasks 렌더링 시작] Job ID: {job_id}")
        update_job({"status": "PROCESSING", "progress": 10, "stage": "영상 소스 준비 중..."})

        effective_yt_url = job.get("youtube_url")
        if not effective_yt_url or ("youtube" not in effective_yt_url and "youtu.be" not in effective_yt_url):
            raise RuntimeError("쇼츠 렌더링에 필요한 유튜브 원본 URL이 누락되었습니다. 작업을 다시 요청해주세요.")
        
        loop = asyncio.get_event_loop()
        
        downloaded = await loop.run_in_executor(
            None,
            download_or_prepare_clip,
            effective_yt_url,
            job.get("start_time", "00:00"),
            job.get("end_time", "00:30"),
            source_video
        )
        if not downloaded or not source_video.exists():
            raise RuntimeError("유튜브 영상 클립 준비에 실패했습니다.")

        update_job({"progress": 55, "stage": "FFmpeg 하이라이트 렌더링 중..."})

        await loop.run_in_executor(
            None,
            render_short_video,
            source_video,
            output_video,
            job.get("sentences", []),
            job.get("bgm", "grace.mp3"),
            job.get("template", "dark_minimal"),
            job.get("church_name", ""),
            job.get("title_question", ""),
            job.get("title_answer", ""),
            job.get("platform", "youtube"),
            job.get("start_time", "00:00"),
            job.get("end_time", "00:30")
        )
        
        if not output_video.exists():
            raise RuntimeError("FFmpeg 렌더링 결과 파일이 생성되지 않았습니다.")

        update_job({"progress": 90, "stage": "완성된 영상 서버 업로드 중..."})

        storage_url = await loop.run_in_executor(
            None, upload_short_to_firebase, output_video, output_video.name
        )
        final_url = storage_url if storage_url else f"/api/outputs/{output_video.name}"

        update_job({
            "status": "COMPLETED",
            "progress": 100,
            "stage": "렌더링 및 업로드 완료!",
            "video_url": final_url
        })
        logger.info(f"✅ [Cloud Tasks 렌더링 완료] Job ID: {job_id} -> URL: {final_url}")
        
    except Exception as e:
        logger.error(f"❌ [렌더링 실패] Job ID: {job_id}, 에러: {e}", exc_info=True)
        update_job({"status": "FAILED", "error_message": str(e), "stage": f"렌더링 실패: {e}"})
        if "네트워크" in str(e) or "타임아웃" in str(e):
            raise HTTPException(status_code=500, detail="Temporary error, retry later")

    finally:
        if source_video and source_video.exists():
            try:
                source_video.unlink()
            except Exception:
                pass
        # OOM 누수 방지: Firebase 업로드 성공 여부와 상관없이 임시 폴더에 남은 출력 및 중간 파일 전량 삭제
        if output_video and output_video.exists():
            try:
                output_video.unlink()
            except Exception:
                pass
        for temp_f in OUTPUTS_DIR.glob(f"*{job_id}*"):
            try:
                temp_f.unlink()
            except Exception:
                pass

    return {"status": "success", "job_id": job_id}


@router.post("/analyze")
async def analyze_worker(req: Request):
    try:
        body = await req.json()
    except:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
        
    task_id = body.get("task_id")
    url = body.get("youtube_url")
    api_key = body.get("api_key")
    force_refresh = body.get("force_refresh", False)
    
    if not task_id or not url:
        raise HTTPException(status_code=400, detail="task_id and youtube_url are required")

    logger.info(f"🚀 [Cloud Tasks 분석 시작] Task ID: {task_id}")
    
    # 순환 참조 방지를 위해 지연 임포트
    from app.routers.analyze import _run_async_analysis
    
    try:
        await _run_async_analysis(task_id, url, api_key, force_refresh)
    except Exception as e:
        logger.error(f"❌ [분석 실패] Task ID: {task_id}, 에러: {e}", exc_info=True)
        err_msg = str(e).lower()
        if any(keyword in err_msg for keyword in ["네트워크", "타임아웃", "timeout", "connection", "rate limit", "429", "503"]):
            raise HTTPException(status_code=500, detail=f"Temporary retryable error: {e}")
            
    return {"status": "success", "task_id": task_id}

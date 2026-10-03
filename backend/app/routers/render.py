from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uuid
import time
from app.services.firestore_service import save_document, get_document, get_all_documents
from app.routers.worker import execute_render_job

router = APIRouter(prefix="/api/render", tags=["Render"])

class ShortRenderItem(BaseModel):
    short_id: str
    title: str
    start_time: str
    end_time: str
    duration: str
    sentences: List[Dict[str, Any]]
    bgm: Optional[str] = "calm_piano.mp3"
    template: Optional[str] = "dark_minimal"
    platform: Optional[str] = "youtube"
    church_name: Optional[str] = ""
    youtube_url: Optional[str] = ""
    title_question: Optional[str] = None
    title_answer: Optional[str] = None

class BatchRenderRequest(BaseModel):
    items: List[ShortRenderItem]

@router.post("/queue")
async def queue_renders(req: BatchRenderRequest, background_tasks: BackgroundTasks):
    if not req.items:
        raise HTTPException(status_code=400, detail="선택된 쇼츠 항목이 없습니다.")

    queued_jobs = []
    now = time.time()
    for item in req.items:
        job_id = f"job-{uuid.uuid4().hex[:8]}"
        job_data = item.model_dump()
        job_data.update({
            "job_id": job_id,
            "status": "QUEUED",
            "progress": 0,
            "stage": "대기 중...",
            "created_at": now,
            "updated_at": now
        })
        
        save_document("render_jobs", job_id, job_data)
        
        # [수정]: Cloud Tasks 큐를 통한 비동기 워커 실행 (Cloud Run CPU 스로틀링 방어 및 병렬 렌더링 보장)
        from app.services.task_service import create_task
        create_task("api/worker/render", {"job_id": job_id})
        
        queued_jobs.append({
            "job_id": job_id,
            "short_id": item.short_id,
            "title": item.title,
            "status": "QUEUED"
        })

    return {
        "status": "success",
        "message": f"{len(queued_jobs)}개의 쇼츠가 클라우드 렌더링 큐에 등록되었습니다.",
        "jobs": queued_jobs
    }

@router.get("/jobs")
async def list_jobs():
    jobs = get_all_documents("render_jobs")
    # 최신 순 정렬
    jobs.sort(key=lambda x: x.get("created_at", 0), reverse=True)
    return {
        "status": "success",
        "jobs": jobs
    }

@router.get("/status/{job_id}")
async def get_status(job_id: str):
    job = get_document("render_jobs", job_id)
    if not job:
        raise HTTPException(status_code=404, detail="해당 작업을 찾을 수 없습니다.")
    return {
        "status": "success",
        "job": job
    }

@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    job = get_document("render_jobs", job_id)
    if not job:
        raise HTTPException(status_code=404, detail="해당 작업을 찾을 수 없거나 이미 삭제되었습니다.")
    
    job["status"] = "CANCELLED"
    job["stage"] = "작업 취소됨"
    job["updated_at"] = time.time()
    save_document("render_jobs", job_id, job)
    
    return {
        "status": "success",
        "message": f"작업({job_id})이 취소되었습니다."
    }

@router.post("/execute/{job_id}")
async def execute_job_direct(job_id: str):
    """
    브라우저와 HTTP 연결을 유지하여 Cloud Run CPU Throttling을 방지하고
    FFmpeg 쇼츠 렌더링을 끝까지 완수하는 동기식 보장 엔드포인트
    """
    job = get_document("render_jobs", job_id)
    if not job:
        raise HTTPException(status_code=404, detail="해당 작업을 찾을 수 없습니다.")

    # 이미 완료된 작업이면 즉시 반환
    if job.get("status") == "COMPLETED" and job.get("video_url"):
        return {"status": "success", "job_id": job_id, "video_url": job.get("video_url")}

    result = await execute_render_job(job_id)
    if result.get("status") == "failed":
        raise HTTPException(status_code=500, detail=result.get("error", "렌더링에 실패했습니다."))
    return result

@router.get("/download-compressed/{job_id}")
async def download_compressed(job_id: str):
    """모바일/인스타/카톡 공유에 최적화된 저용량(3~4MB) 압축 다운로드"""
    from fastapi.responses import FileResponse
    from pathlib import Path
    import subprocess
    from app.config import OUTPUTS_DIR, FFMPEG_PATH

    job = get_document("render_jobs", job_id)
    if not job or not job.get("video_url"):
        raise HTTPException(status_code=404, detail="영상 파일을 찾을 수 없습니다.")

    # video_url은 Firebase url이거나 로컬 url임.
    # 만약 file_path 가 없다면 에러 리턴, 있으면 다운로드.
    if not job.get("file_path"):
        raise HTTPException(status_code=404, detail="서버에 원본 파일 경로 정보가 없습니다.")
    
    orig_path = Path(job["file_path"])
    if not orig_path.exists():
        raise HTTPException(status_code=404, detail="원본 비디오 파일이 존재하지 않습니다.")

    compressed_path = OUTPUTS_DIR / f"compressed_{orig_path.name}"
    # 이미 압축된 파일이 없거나 1000바이트 이하인 경우 생성
    if not compressed_path.exists() or compressed_path.stat().st_size < 1000:
        # CRF 26 + audio 128k로 3~4MB 최적 용량 달성
        cmd = [
            FFMPEG_PATH, "-y",
            "-i", str(orig_path),
            "-c:v", "libx264",
            "-crf", "26",
            "-preset", "faster",
            "-c:a", "aac",
            "-b:a", "128k",
            str(compressed_path)
        ]
        subprocess.run(cmd, check=True)

    filename = f"shorts-{job.get('short_id', 'clip')}-compressed.mp4"
    return FileResponse(
        path=str(compressed_path),
        filename=filename,
        media_type="video/mp4"
    )

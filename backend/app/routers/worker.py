import os
import time
import logging
import asyncio
import subprocess
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request
from typing import Dict, Any

from app.config import OUTPUTS_DIR, FFMPEG_PATH
from app.services.firestore_service import save_document, get_document
from app.services.youtube_service import download_or_prepare_clip, is_valid_video_file
from app.services.ffmpeg_service import render_short_video
from app.services.storage_service import upload_short_to_firebase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/worker", tags=["Worker"])

async def execute_render_job(job_id: str) -> Dict[str, Any]:
    """
    [선택 B]: 외부 Cloud Tasks 없이 Cloud Run 내부 BackgroundTasks에서 직접 실행 가능한 렌더링 작업
    """
    job = get_document("render_jobs", job_id)
    if not job:
        logger.error(f"Render job not found in Firestore: {job_id}")
        return {"status": "error", "message": "Job not found"}

    if job.get("status") in ["PROCESSING", "COMPLETED", "CANCELLED", "FAILED"]:
        logger.info(f"Job {job_id} is already running or in terminal state: {job.get('status')}")
        return {"status": "skipped", "message": f"Already {job.get('status')}"}

    def update_job(updates: dict):
        job.update(updates)
        job["updated_at"] = time.time()
        save_document("render_jobs", job_id, job)

    # 중복 실행 방지를 위해 즉시 PROCESSING 선점 마킹
    update_job({"status": "PROCESSING", "progress": 10, "stage": "영상 소스 준비 중..."})
        
    source_video = OUTPUTS_DIR / f"src_{job.get('short_id', 'unknown')}_{job_id}.mp4"
    output_video = OUTPUTS_DIR / f"shorts_{job.get('short_id', 'unknown')}_{job_id}.mp4"

    try:
        logger.info(f"🚀 [쇼츠 렌더링 시작] Job ID: {job_id}")
        update_job({"status": "PROCESSING", "progress": 10, "stage": "영상 소스 준비 중..."})

        effective_yt_url = job.get("youtube_url")
        if not effective_yt_url or ("youtube" not in effective_yt_url and "youtu.be" not in effective_yt_url):
            # 1순위: 캐시 파일에서 가장 최근 분석된 유튜브 URL 자동 복원
            cache_dir = OUTPUTS_DIR / "cache"
            if cache_dir.exists():
                for c_file in sorted(cache_dir.glob("*.json"), key=lambda f: f.stat().st_mtime, reverse=True):
                    try:
                        import json
                        c_data = json.loads(c_file.read_text(encoding="utf-8"))
                        candidate_url = c_data.get("metadata", {}).get("youtube_url") or c_data.get("youtube_url")
                        if candidate_url and ("youtube" in candidate_url or "youtu.be" in candidate_url):
                            effective_yt_url = candidate_url
                            update_job({"youtube_url": candidate_url})
                            logger.info(f"⚡ [URL 자동 복원] 캐시 파일에서 유튜브 URL 복구: {candidate_url}")
                            break
                    except Exception:
                        pass

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
        if not downloaded or not source_video.exists() or not is_valid_video_file(source_video):
            if source_video.exists():
                try: source_video.unlink()
                except: pass
            raise RuntimeError("유튜브 영상 클립 준비에 실패했습니다 (비디오 손상 또는 moov atom 결함).")

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

        # 썸네일 이미지 추출 (720x1280 JPEG 고화질 스냅샷)
        thumb_path = output_video.with_suffix(".jpg")
        try:
            thumb_cmd = [
                FFMPEG_PATH, "-y",
                "-ss", "00:00:01",
                "-i", str(output_video),
                "-vframes", "1",
                "-q:v", "2",
                str(thumb_path)
            ]
            subprocess.run(thumb_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=15)
        except Exception as e:
            logger.warning(f"썸네일 생성 예외: {e}")

        storage_url = await loop.run_in_executor(
            None, upload_short_to_firebase, output_video, output_video.name
        )
        final_url = storage_url if storage_url else f"/api/outputs/{output_video.name}"

        thumbnail_url = None
        if thumb_path.exists() and thumb_path.stat().st_size > 1000:
            thumb_storage_url = await loop.run_in_executor(
                None, upload_short_to_firebase, thumb_path, thumb_path.name
            )
            thumbnail_url = thumb_storage_url if thumb_storage_url else f"/api/outputs/{thumb_path.name}"
            if thumb_storage_url:
                try: thumb_path.unlink()
                except Exception: pass

        update_data = {
            "status": "COMPLETED",
            "progress": 100,
            "stage": "렌더링 및 업로드 완료!",
            "video_url": final_url,
        }
        if thumbnail_url:
            update_data["thumbnail_url"] = thumbnail_url

        update_job(update_data)
        logger.info(f"✅ [쇼츠 렌더링 완료] Job ID: {job_id} -> Video: {final_url}, Thumb: {thumbnail_url}")
        return {"status": "success", "job_id": job_id, "video_url": final_url, "thumbnail_url": thumbnail_url}
        
    except Exception as e:
        logger.error(f"❌ [렌더링 실패] Job ID: {job_id}, 에러: {e}", exc_info=True)
        update_job({"status": "FAILED", "error_message": str(e), "stage": f"렌더링 실패: {e}"})
        return {"status": "failed", "job_id": job_id, "error": str(e)}

    finally:
        if source_video and source_video.exists():
            try:
                source_video.unlink()
            except Exception:
                pass
        # Firebase Storage 업로드에 성공한 경우에만 로컬 임시 output_video 삭제 (로컬 URL 사용 시 영구 보존)
        if 'storage_url' in locals() and storage_url:
            if output_video and output_video.exists():
                try:
                    output_video.unlink()
                except Exception:
                    pass
        if 'thumb_path' in locals() and thumb_path and thumb_path.exists():
            if 'thumb_storage_url' in locals() and thumb_storage_url:
                try:
                    thumb_path.unlink()
                except Exception:
                    pass
        for temp_f in OUTPUTS_DIR.glob(f"*{job_id}*"):
            if output_video and temp_f == output_video and ('storage_url' not in locals() or not storage_url):
                continue
            if 'thumb_path' in locals() and thumb_path and temp_f == thumb_path and ('thumb_storage_url' not in locals() or not thumb_storage_url):
                continue
            if temp_f.suffix in [".part", ".mkv", ".webm"] or temp_f.name.startswith("tmp_") or temp_f.name.startswith("src_"):
                try:
                    temp_f.unlink()
                except Exception:
                    pass

@router.post("/render")
async def render_worker(req: Request):
    try:
        body = await req.json()
    except:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
        
    job_id = body.get("job_id")
    if not job_id:
        raise HTTPException(status_code=400, detail="job_id is required")

    return await execute_render_job(job_id)


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
        logger.error(f"❌ [분석 실패 - 재시도 방지] Task ID: {task_id}, 에러: {e}", exc_info=True)
        # Firestore에 이미 FAILED 상태와 에러 메시지가 기록되었으므로,
        # Cloud Tasks 무한 재시도로 인한 자원 낭비 및 사용자 5분 이상 멈춤을 방지하기 위해 정상 응답 반환
        return {"status": "failed", "task_id": task_id, "error": str(e)}
            
    return {"status": "success", "task_id": task_id}

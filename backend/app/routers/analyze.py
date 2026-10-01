import asyncio
import logging
import uuid
import time
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.services.ai_service import analyze_sermon_video
from app.services.youtube_service import extract_video_details_and_transcript
from app.services.cache_service import get_cached_analysis, save_cached_analysis

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Analysis"])

class AnalyzeRequest(BaseModel):
    youtube_url: str
    gemini_api_key: Optional[str] = None
    force_refresh: Optional[bool] = False

# 백그라운드 작업 인메모리 저장소
analysis_tasks: Dict[str, Dict[str, Any]] = {}

# 관리자 대시보드용 분석 로그 (실패 로그 및 전체 기록)
analysis_logs: list = []

def record_analysis_log(task_id: str, url: str, status: str, error: Optional[str] = None):
    log_entry = {
        "id": f"log-{uuid.uuid4().hex[:6]}",
        "task_id": task_id,
        "youtube_url": url,
        "status": status,
        "error": error,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),
        "created_at": time.time()
    }
    analysis_logs.insert(0, log_entry)
    # 최근 100개 유지
    if len(analysis_logs) > 100:
        analysis_logs.pop()


async def _run_async_analysis(task_id: str, url: str, api_key: Optional[str] = None, force_refresh: bool = False):
    task = analysis_tasks.get(task_id)
    if not task:
        return

    loop = asyncio.get_event_loop()
    
    try:
        # [과금 방지 1단계]: 기존 캐시 확인 (force_refresh가 아닌 경우)
        if not force_refresh:
            cached_data = get_cached_analysis(url)
            if cached_data:
                logger.info(f"⚡ [과금 방지] 캐시된 분석 결과 즉시 반환: {task_id}")
                task["data"] = cached_data
                task["status"] = "COMPLETED"
                task["progress"] = 100
                task["stage"] = f"캐시 로드 완료! (API 과금 없이 즉시 반환, 쇼츠 {len(cached_data.get('shorts', []))}개)"
                task["updated_at"] = time.time()
                return

        task["status"] = "PROCESSING"
        task["stage"] = "1단계: 유튜브 영상 정보 및 설교 자막 추출 중..."
        task["progress"] = 15
        task["updated_at"] = time.time()

        # yt-dlp는 동기 함수이므로 executor에서 실행
        details = await loop.run_in_executor(
            None, extract_video_details_and_transcript, url
        )
        
        has_transcript = len(details.get("transcript_text", "")) > 200
        logger.info(
            f"자막 추출: {len(details.get('transcript_text', ''))}자, "
            f"transcript={'있음' if has_transcript else '없음'}"
        )

        task["stage"] = "2단계: AI가 설교 본론 파트 심층 분석 중 (최대 2~3분)..."
        task["progress"] = 40
        task["updated_at"] = time.time()

        analysis = await analyze_sermon_video(
            youtube_url=url,
            video_details=details,
            custom_api_key=api_key
        )

        task["stage"] = "3단계: 쇼츠 하이라이트 & 묵상 카드 생성 중..."
        task["progress"] = 85
        task["updated_at"] = time.time()

        # 메타데이터 보완 (yt-dlp 추출 정보 우선)
        if "metadata" not in analysis:
            analysis["metadata"] = {}
        meta = analysis["metadata"]
        
        if details.get("thumbnail") and not meta.get("thumbnail"):
            meta["thumbnail"] = details["thumbnail"]
        if details.get("title") and not meta.get("title"):
            meta["title"] = details["title"]
        if details.get("channel") and not meta.get("churchName"):
            meta["churchName"] = details["channel"]
        if details.get("duration_str") and not meta.get("videoDuration"):
            meta["videoDuration"] = details["duration_str"]

        meta["youtube_url"] = url
        if details.get("video_id"):
            meta["video_id"] = details["video_id"]

        # [과금 방지 2단계]: 분석 완료 결과 캐시 저장
        save_cached_analysis(url, analysis)

        task["data"] = analysis
        task["status"] = "COMPLETED"
        task["progress"] = 100
        task["stage"] = f"분석 완료! 쇼츠 {len(analysis.get('shorts', []))}개 생성"
        task["updated_at"] = time.time()
        record_analysis_log(task_id, url, "COMPLETED")
        logger.info(f"백그라운드 설교 분석 완료: {task_id} | 쇼츠: {len(analysis.get('shorts', []))}개")

    except Exception as e:
        logger.error(f"백그라운드 설교 분석 실패({task_id}): {e}", exc_info=True)
        task["status"] = "FAILED"
        task["error"] = str(e)
        task["stage"] = f"❌ 분석 실패: {str(e)[:200]}"
        task["updated_at"] = time.time()
        record_analysis_log(task_id, url, "FAILED", str(e))



@router.post("/analyze/start")
async def start_async_analyze(req: AnalyzeRequest, background_tasks: BackgroundTasks) -> Dict[str, Any]:
    url = req.youtube_url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="유튜브 URL을 입력해주세요.")

    # [과금 방지]: 캐시가 이미 있으면 안내 정보와 함께 반환
    if not req.force_refresh:
        cached_data = get_cached_analysis(url)
        if cached_data:
            task_id = f"task-{uuid.uuid4().hex[:8]}"
            now = time.time()
            analysis_tasks[task_id] = {
                "task_id": task_id,
                "youtube_url": url,
                "status": "COMPLETED",
                "progress": 100,
                "is_cached": True,
                "stage": "이미 분석이 완료된 설교 영상입니다.",
                "data": cached_data,
                "error": None,
                "created_at": now,
                "updated_at": now
            }
            return {
                "status": "success",
                "task_id": task_id,
                "is_cached": True,
                "message": "이미 분석된 영상입니다. 하단의 '최근 분석된 설교 보관함' 또는 결과 탭에서 즉시 확인하실 수 있습니다."
            }

    task_id = f"task-{uuid.uuid4().hex[:8]}"
    now = time.time()
    analysis_tasks[task_id] = {
        "task_id": task_id,
        "youtube_url": url,
        "status": "QUEUED",
        "progress": 5,
        "stage": "분석 작업 시작 중...",
        "data": None,
        "error": None,
        "created_at": now,
        "updated_at": now
    }

    background_tasks.add_task(_run_async_analysis, task_id, url, req.gemini_api_key, req.force_refresh or False)

    return {
        "status": "success",
        "task_id": task_id,
        "is_cached": False,
        "message": "설교 분석이 시작되었습니다. 자막 추출 → AI 분석 순으로 진행됩니다."
    }


@router.get("/analyze/status/{task_id}")
async def get_analyze_status(task_id: str) -> Dict[str, Any]:
    task = analysis_tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="해당 분석 작업을 찾을 수 없습니다.")
    return {
        "status": "success",
        "task": task
    }


@router.post("/analyze")
async def analyze_url(req: AnalyzeRequest) -> Dict[str, Any]:
    """동기 분석 엔드포인트 (캐시 우선 확인)"""
    url = req.youtube_url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="유튜브 URL을 입력해주세요.")

    if not req.force_refresh:
        cached_data = get_cached_analysis(url)
        if cached_data:
            return {
                "status": "success",
                "is_cached": True,
                "data": cached_data
            }

    loop = asyncio.get_event_loop()
    try:
        details = await loop.run_in_executor(
            None, extract_video_details_and_transcript, url
        )
        analysis = await analyze_sermon_video(
            youtube_url=url,
            video_details=details,
            custom_api_key=req.gemini_api_key
        )
        if "metadata" not in analysis:
            analysis["metadata"] = {}
        meta = analysis["metadata"]
        if details.get("thumbnail") and not meta.get("thumbnail"):
            meta["thumbnail"] = details["thumbnail"]
        if details.get("title") and not meta.get("title"):
            meta["title"] = details["title"]
        if details.get("channel") and not meta.get("churchName"):
            meta["churchName"] = details["channel"]

        save_cached_analysis(url, analysis)
        record_analysis_log("sync", url, "COMPLETED")

        return {
            "status": "success",
            "is_cached": False,
            "data": analysis
        }
    except Exception as e:
        logger.error(f"설교 분석 실패: {e}", exc_info=True)
        record_analysis_log("sync", url, "FAILED", str(e))
        raise HTTPException(status_code=500, detail=f"설교 분석 중 오류가 발생했습니다: {str(e)}")


@router.get("/admin/dashboard")
async def get_admin_dashboard() -> Dict[str, Any]:
    """관리자 대시보드 통계 및 실패 로그 기록 조회"""
    from app.services.render_queue import render_manager
    from app.services.cache_service import CACHE_DIR
    
    # 캐시 파일 수
    cache_count = len(list(CACHE_DIR.glob("*.json"))) if CACHE_DIR.exists() else 0
    
    # 렌더링 작업 상태
    render_jobs = render_manager.get_all_jobs()
    render_completed = sum(1 for j in render_jobs if j.status.value == "COMPLETED")
    render_failed = sum(1 for j in render_jobs if j.status.value == "FAILED")
    render_processing = sum(1 for j in render_jobs if j.status.value in ["PROCESSING", "QUEUED"])

    # 분석 실패/성공 집계
    failed_logs = [log for log in analysis_logs if log["status"] == "FAILED"]
    completed_logs = [log for log in analysis_logs if log["status"] == "COMPLETED"]

    return {
        "status": "success",
        "stats": {
            "total_cached_sermons": cache_count,
            "total_analysis_attempts": len(analysis_logs),
            "analysis_completed": len(completed_logs),
            "analysis_failed": len(failed_logs),
            "render_completed": render_completed,
            "render_failed": render_failed,
            "render_processing": render_processing,
            "total_render_jobs": len(render_jobs)
        },
        "failed_logs": failed_logs,
        "recent_logs": analysis_logs[:30]
    }


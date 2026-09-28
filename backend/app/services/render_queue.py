import asyncio
import logging
import uuid
import time
from typing import Dict, Any, List, Optional
from pathlib import Path
from dataclasses import dataclass, asdict

from app.config import OUTPUTS_DIR, TEST_VIDEO_DIR
from app.services.youtube_service import download_or_prepare_clip
from app.services.ffmpeg_service import render_short_video

logger = logging.getLogger(__name__)

@dataclass
class RenderJob:
    job_id: str
    short_id: str
    title: str
    start_time: str
    end_time: str
    duration: str
    sentences: List[Dict[str, Any]]
    bgm: str
    template: str
    church_name: str
    youtube_url: str
    status: str # "QUEUED", "PROCESSING", "COMPLETED", "FAILED"
    progress: int # 0 ~ 100
    title_question: str = ""
    title_answer: str = ""
    platform: str = "youtube" # "youtube" | "instagram"
    video_url: Optional[str] = None
    file_path: Optional[str] = None
    error_message: Optional[str] = None
    created_at: float = 0.0
    updated_at: float = 0.0

class SequentialRenderManager:
    """
    서버 과부하 방지 및 비용 절감을 위한 순차(Sequential) 렌더링 관리자.
    여러 영상이 한 번에 요청되어도 asyncio.Queue를 통해 1개씩 차례대로 인코딩합니다.
    """
    def __init__(self):
        self.queue: asyncio.Queue[str] = asyncio.Queue()
        self.jobs: Dict[str, RenderJob] = {}
        self.worker_task: Optional[asyncio.Task] = None
        self._is_running = False
        self._load_existing_outputs()

    def _load_existing_outputs(self):
        """
        서버 재시작 시에도 기존 outputs 폴더에 렌더링된 영상들을 복원하여
        쇼츠 목록 화면에 정상 표시되도록 합니다.
        """
        try:
            for mp4_file in sorted(OUTPUTS_DIR.glob("shorts_*.mp4"), key=lambda f: f.stat().st_mtime, reverse=True):
                stem = mp4_file.stem
                parts = stem.split("_")
                short_id = "short-1"
                job_id = f"job-{stem[-8:]}"
                if len(parts) >= 3:
                    short_id = parts[1]
                    job_id = parts[2]
                
                job = RenderJob(
                    job_id=job_id,
                    short_id=short_id,
                    title="설교 하이라이트 쇼츠",
                    start_time="00:00",
                    end_time="00:30",
                    duration="30초",
                    sentences=[],
                    bgm="grace.mp3",
                    template="blur_bg",
                    church_name="마산제일교회",
                    youtube_url="",
                    status="COMPLETED",
                    progress=100,
                    title_question="인생의 쓴맛 앞에서",
                    title_answer="하나님의 놀라운 대답",
                    video_url=f"/api/outputs/{mp4_file.name}",
                    file_path=str(mp4_file),
                    created_at=mp4_file.stat().st_mtime,
                    updated_at=mp4_file.stat().st_mtime
                )
                self.jobs[job_id] = job
        except Exception as e:
            logger.warning(f"기존 출력 영상 로드 중 오류: {e}")

    def start_worker(self):
        if not self._is_running:
            self._is_running = True
            self.worker_task = asyncio.create_task(self._worker_loop())
            logger.info("순차 렌더링 백그라운드 워커가 가동되었습니다.")

    def add_job(self, job_data: Dict[str, Any]) -> str:
        job_id = f"job-{uuid.uuid4().hex[:8]}"
        now = time.time()
        title = job_data.get("title", "설교 쇼츠 하이라이트")
        hook = job_data.get("hook", "")
        
        # 질문과 해답 2줄 헤더 기본값 처리
        title_q = job_data.get("title_question")
        title_a = job_data.get("title_answer")
        if not title_q:
            title_q = hook if hook else title
        if not title_a:
            title_a = title

        job = RenderJob(
            job_id=job_id,
            short_id=job_data.get("short_id", "short-1"),
            title=title,
            start_time=job_data.get("start_time", "00:00"),
            end_time=job_data.get("end_time", "00:30"),
            duration=job_data.get("duration", "30초"),
            sentences=job_data.get("sentences", []),
            bgm=job_data.get("bgm", "grace.mp3"),
            template=job_data.get("template", "dark_minimal"),
            platform=job_data.get("platform", "youtube"),
            church_name=job_data.get("church_name", ""),
            youtube_url=job_data.get("youtube_url", ""),
            status="QUEUED",
            progress=0,
            title_question=title_q,
            title_answer=title_a,
            created_at=now,
            updated_at=now
        )
        self.jobs[job_id] = job
        self.queue.put_nowait(job_id)
        logger.info(f"렌더링 큐에 작업 추가됨: {job_id} ({job.title} | {title_q} / {title_a})")
        return job_id

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        job = self.jobs.get(job_id)
        return asdict(job) if job else None

    def get_all_jobs(self) -> List[Dict[str, Any]]:
        return [asdict(job) for job in reversed(list(self.jobs.values()))]

    async def _worker_loop(self):
        while self._is_running:
            job_id = await self.queue.get()
            job = self.jobs.get(job_id)
            if not job:
                self.queue.task_done()
                continue

            try:
                logger.info(f"[순차 렌더링 시작] Job ID: {job_id}, Title: {job.title}")
                job.status = "PROCESSING"
                job.progress = 10
                job.updated_at = time.time()

                # 1단계: 원본 소스 영상 준비 (다운로드 또는 테스트 소스)
                job.progress = 25
                source_video = OUTPUTS_DIR / f"src_{job.short_id}_{job_id}.mp4"
                
                # 비동기 블로킹 방지를 위해 run_in_executor에서 실행
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    None,
                    download_or_prepare_clip,
                    job.youtube_url,
                    job.start_time,
                    job.end_time,
                    source_video
                )

                job.progress = 55
                job.updated_at = time.time()

                # 2단계: FFmpeg 렌더링 (9:16 크롭 + 상단 2줄 헤더 + 자막 번인 + 오디오 더킹 + 십자가 교회명)
                output_video = OUTPUTS_DIR / f"shorts_{job.short_id}_{job_id}.mp4"
                
                await loop.run_in_executor(
                    None,
                    render_short_video,
                    source_video,
                    output_video,
                    job.sentences,
                    job.bgm,
                    job.template,
                    job.church_name,
                    job.title_question,
                    job.title_answer,
                    job.platform
                )

                job.progress = 100
                job.status = "COMPLETED"
                job.video_url = f"/api/outputs/{output_video.name}"
                job.file_path = str(output_video)
                job.updated_at = time.time()
                logger.info(f"[순차 렌더링 완료] Job ID: {job_id} -> {output_video.name}")

                # 원본 임시 소스 파일 정리
                if source_video.exists():
                    try:
                        source_video.unlink()
                    except Exception:
                        pass

            except Exception as e:
                logger.error(f"[렌더링 실패] Job ID: {job_id}, 에러: {e}", exc_info=True)
                job.status = "FAILED"
                job.error_message = str(e)
                job.updated_at = time.time()

            finally:
                self.queue.task_done()
                # 다음 작업 전 CPU 안정화를 위한 짧은 쿨다운 (0.5초)
                await asyncio.sleep(0.5)

# 싱글톤 인스턴스
render_manager = SequentialRenderManager()

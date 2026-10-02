import asyncio
import logging
import uuid
import time
import re
from typing import Dict, Any, List, Optional
from pathlib import Path
from dataclasses import dataclass, asdict

from app.config import OUTPUTS_DIR
from app.services.youtube_service import download_or_prepare_clip
from app.services.ffmpeg_service import render_short_video
from app.services.storage_service import upload_short_to_firebase

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
    status: str  # "QUEUED", "PROCESSING", "COMPLETED", "FAILED"
    progress: int  # 0 ~ 100
    title_question: str = ""
    title_answer: str = ""
    platform: str = "youtube"  # "youtube" | "instagram"
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

    def _save_job_meta(self, job: RenderJob):
        """작업 상세 정보를 JSON 파일로 영구 보관 (서버 재시작 후에도 정확한 구간/URL 복원)"""
        try:
            meta_path = OUTPUTS_DIR / f"{job.job_id}.json"
            import json
            meta_path.write_text(json.dumps(asdict(job), ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception as e:
            logger.warning(f"작업 메타데이터 저장 실패: {e}")

    def _load_existing_outputs(self):
        try:
            import json
            # 1. 영구 저장된 job json 메타데이터 파일 우선 로드
            for meta_file in sorted(OUTPUTS_DIR.glob("job-*.json"), key=lambda f: f.stat().st_mtime, reverse=True):
                try:
                    data = json.loads(meta_file.read_text(encoding="utf-8"))
                    job = RenderJob(**data)
                    self.jobs[job.job_id] = job
                except Exception:
                    pass

            # 2. 메타데이터가 없는 기존 mp4 파일들 폴백 로드
            for mp4_file in sorted(OUTPUTS_DIR.glob("shorts_*.mp4"), key=lambda f: f.stat().st_mtime, reverse=True):
                stem = mp4_file.stem
                parts = stem.split("_")
                short_id = "short-1"
                job_id = f"job-{stem[-8:]}"
                if len(parts) >= 3:
                    short_id = parts[1]
                    job_id = parts[2]
                
                if job_id not in self.jobs:
                    # 캐시에서 원본 유튜브 정보 역추적
                    cached_yt_url = ""
                    cache_dir = OUTPUTS_DIR / "cache"
                    if cache_dir.exists():
                        for c_file in cache_dir.glob("*.json"):
                            try:
                                c_d = json.loads(c_file.read_text(encoding="utf-8"))
                                if c_d.get("metadata", {}).get("youtube_url"):
                                    cached_yt_url = c_d["metadata"]["youtube_url"]
                                    break
                            except Exception:
                                pass

                    job = RenderJob(
                        job_id=job_id,
                        short_id=short_id,
                        title="설교 하이라이트 쇼츠",
                        start_time="00:00",
                        end_time="00:30",
                        duration="30초",
                        sentences=[],
                        bgm="grace.mp3",
                        template="dark_minimal",
                        church_name="예배공동체",
                        youtube_url=cached_yt_url,
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

    def ensure_worker_running(self):
        """워커가 종료되었거나 생성되지 않았다면 안전하게 다시 시작"""
        if not self._is_running or self.worker_task is None or self.worker_task.done():
            self._is_running = True
            try:
                loop = asyncio.get_running_loop()
                self.worker_task = loop.create_task(self._worker_loop())
                logger.info("순차 렌더링 백그라운드 워커가 재시작되었습니다.")
            except RuntimeError:
                pass

    def start_worker(self):
        self.ensure_worker_running()
        # 서버 시작 시 이전에 QUEUED 상태로 남아있던 작업들을 다시 큐에 적재
        for job_id, job in self.jobs.items():
            if job.status == "QUEUED":
                self.queue.put_nowait(job_id)
                logger.info(f"이전 대기 작업 큐 복구: {job_id} ({job.title})")

    def add_job(self, job_data: Dict[str, Any]) -> str:
        self.ensure_worker_running()
        job_id = f"job-{uuid.uuid4().hex[:8]}"
        now = time.time()
        title = job_data.get("title", "설교 쇼츠 하이라이트")
        hook = job_data.get("hook", "")
        
        title_q = job_data.get("title_question")
        title_a = job_data.get("title_answer")
        if not title_q:
            title_q = hook if hook else title
        if not title_a:
            title_a = title

        # Q. / A. 또는 질문/답변 접두사가 붙어있을 경우 자동 정제
        title_q = re.sub(r'^[QA질문답변\s\.\:\-]+', '', str(title_q)).strip()
        title_a = re.sub(r'^[QA질문답변\s\.\:\-]+', '', str(title_a)).strip()

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
        self._save_job_meta(job)
        self.queue.put_nowait(job_id)
        logger.info(f"렌더링 큐에 작업 추가됨: {job_id} ({job.title} | {title_q} / {title_a})")
        return job_id

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        job = self.jobs.get(job_id)
        return asdict(job) if job else None

    def get_all_jobs(self) -> List[Dict[str, Any]]:
        self.ensure_worker_running()
        return [asdict(job) for job in reversed(list(self.jobs.values()))]

    def delete_job(self, job_id: str) -> bool:
        job = self.jobs.pop(job_id, None)
        if job:
            # 상태를 CANCELLED로 변경하여 워커가 픽업하더라도 스킵되도록 함
            job.status = "CANCELLED"
            meta_path = OUTPUTS_DIR / f"{job_id}.json"
            if meta_path.exists():
                try:
                    meta_path.unlink()
                except Exception:
                    pass
            if job.file_path and Path(job.file_path).exists():
                try:
                    Path(job.file_path).unlink()
                except Exception:
                    pass
            logger.info(f"렌더링 작업 중단/삭제됨: {job_id}")
            return True
        return False

    async def _worker_loop(self):
        while self._is_running:
            try:
                job_id = await self.queue.get()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"워커 큐 수신 에러: {e}")
                await asyncio.sleep(1)
                continue

            job = self.jobs.get(job_id)
            if not job or job.status == "CANCELLED":
                self.queue.task_done()
                continue

            source_video = None
            output_video = None
            try:
                logger.info(f"[순차 렌더링 시작] Job ID: {job_id}, Title: {job.title}")
                job.status = "PROCESSING"
                job.progress = 10
                job.updated_at = time.time()

                # 1단계: 원본 소스 영상 준비 (다운로드 또는 테스트 소스)
                job.progress = 25
                source_video = OUTPUTS_DIR / f"src_{job.short_id}_{job_id}.mp4"

                # 취소되었는지 중간 체크
                if job.status == "CANCELLED" or job_id not in self.jobs:
                    continue

                # 유튜브 URL이 비어있는 경우 캐시 디렉터리에서 자동 역추적 복구
                effective_yt_url = job.youtube_url
                if not effective_yt_url or ("youtube" not in effective_yt_url and "youtu.be" not in effective_yt_url):
                    cache_dir = OUTPUTS_DIR / "cache"
                    if cache_dir.exists():
                        for c_file in sorted(cache_dir.glob("*.json"), key=lambda f: f.stat().st_mtime, reverse=True):
                            try:
                                import json
                                c_data = json.loads(c_file.read_text(encoding="utf-8"))
                                candidate_url = c_data.get("metadata", {}).get("youtube_url")
                                if candidate_url and ("youtube" in candidate_url or "youtu.be" in candidate_url):
                                    effective_yt_url = candidate_url
                                    job.youtube_url = candidate_url
                                    logger.info(f"캐시에서 유튜브 URL 자동 복구 완료: {effective_yt_url}")
                                    break
                            except Exception:
                                pass
                
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    None,
                    download_or_prepare_clip,
                    effective_yt_url,
                    job.start_time,
                    job.end_time,
                    source_video
                )

                if job.status == "CANCELLED" or job_id not in self.jobs:
                    if source_video and source_video.exists():
                        source_video.unlink()
                    continue

                job.progress = 55
                job.updated_at = time.time()

                # 2단계: FFmpeg 렌더링 (윈도우 스케일링 + 상단 2줄 헤더 + 상대 자막 번인 + 오디오 더킹)
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
                    job.platform,
                    job.start_time,
                    job.end_time
                )

                if job.status == "CANCELLED" or job_id not in self.jobs:
                    if source_video and source_video.exists():
                        source_video.unlink()
                    if output_video and output_video.exists():
                        output_video.unlink()
                    continue

                job.progress = 100
                job.status = "COMPLETED"
                job.file_path = str(output_video)

                # Firebase Storage 업로드 시도 (스토리지 URL 우선 사용, 실패/로컬 시 기존 로컬 엔드포인트)
                storage_url = await loop.run_in_executor(
                    None, upload_short_to_firebase, output_video, output_video.name
                )
                if storage_url:
                    job.video_url = storage_url
                else:
                    job.video_url = f"/api/outputs/{output_video.name}"

                job.updated_at = time.time()
                self._save_job_meta(job)
                logger.info(f"[순차 렌더링 완료] Job ID: {job_id} -> {output_video.name} (URL: {job.video_url})")

            except Exception as e:
                logger.error(f"[렌더링 실패] Job ID: {job_id}, 에러: {e}", exc_info=True)
                if job_id in self.jobs and self.jobs[job_id].status != "CANCELLED":
                    job.status = "FAILED"
                    job.error_message = str(e)
                    job.updated_at = time.time()

            finally:
                # [메모리 OOM 방지] Cloud Run 환경 메모리 절약을 위해 임시 다운로드 소스 및 조각 파일 즉시 제거
                if source_video and source_video.exists():
                    try:
                        source_video.unlink()
                        logger.info(f"🧹 [메모리 정리] 임시 소스 영상 파일 삭제 완료: {source_video.name}")
                    except Exception as ce:
                        logger.warning(f"임시 파일 정리 실패: {ce}")

                # 혹시 남은 임시 part 파일이나 cut 파일 정리
                for temp_f in OUTPUTS_DIR.glob(f"*{job_id}*"):
                    if output_video and temp_f == output_video:
                        continue
                    if temp_f.suffix in [".part", ".mkv", ".webm"] or temp_f.name.startswith("cut_"):
                        try:
                            temp_f.unlink()
                        except Exception:
                            pass

                self.queue.task_done()
                await asyncio.sleep(0.5)

render_manager = SequentialRenderManager()

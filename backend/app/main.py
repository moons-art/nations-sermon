from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.routers import analyze, render, assets, sermon_edit
from app.services.render_queue import render_manager
from app.services.ffmpeg_service import generate_default_bgm_if_missing

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("seolgyo_ai")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Seolgyo AI 백엔드 서버 가동 시작")
    generate_default_bgm_if_missing()
    render_manager.start_worker()
    yield
    logger.info("Seolgyo AI 백엔드 서버 종료")

app = FastAPI(
    title="Seolgyo AI API",
    description="유튜브 설교 영상으로 쇼츠, 5일 묵상, 카드뉴스를 자동 생성하는 AI 서비스",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router)
app.include_router(render.router)
app.include_router(assets.router)
app.include_router(sermon_edit.router)

@app.get("/")
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Seolgyo AI Backend",
        "version": "1.0.0"
    }

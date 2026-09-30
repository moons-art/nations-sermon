from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
from app.config import OUTPUTS_DIR, BGM_DIR
from app.services.ffmpeg_service import generate_default_bgm_if_missing

router = APIRouter(prefix="/api", tags=["Assets"])

generate_default_bgm_if_missing()

@router.get("/assets/bgm")
async def get_bgm_list():
    bgms = [
        { "id": "none", "name": "BGM 없음", "desc": "음악 없이 목소리만 담백하게 출력" },
        { "id": "grace.mp3", "name": "은혜로운 피아노", "desc": "차분하고 감동적인 C 메이저 피아노 선율" },
        { "id": "prayer.mp3", "name": "깊은 기도의 시간", "desc": "몰입감을 높이는 A 마이너 묵상 톤" },
        { "id": "hope.mp3", "name": "소망의 묵상", "desc": "따뜻하고 밝은 F 메이저 어쿠스틱 분위기" },
    ]
    return { "status": "success", "bgms": bgms }

@router.get("/outputs/{filename}")
async def get_rendered_video(filename: str):
    file_path = OUTPUTS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="비디오 파일을 찾을 수 없습니다.")
    return FileResponse(file_path, media_type="video/mp4", filename=filename)

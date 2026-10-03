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
        { "id": "calm_piano.mp3", "name": "잔잔한 피아노", "desc": "차분하고 따뜻하게 울려 퍼지는 감동적인 피아노 멜로디" },
        { "id": "calm_piano_strings.mp3", "name": "잔잔한 피아노 + 스트링", "desc": "풍성하고 감미로운 오케스트라 스트링과 피아노의 조화" },
        { "id": "peaceful_strings.mp3", "name": "평온한 스트링 & 피아노", "desc": "깊은 울림과 묵상을 이끄는 서정적인 앙상블" },
        { "id": "minor_piano.mp3", "name": "마이너 피아노", "desc": "결단과 회개, 간절한 기도의 순간을 위한 감성 선율" },
        { "id": "solemn_organ.mp3", "name": "경건한 오르간", "desc": "전통 예배의 엄숙함과 거룩한 임재를 더해주는 파이프 오르간" },
        { "id": "modern_ccm.mp3", "name": "모던 CCM 스타일", "desc": "세련되고 경쾌하면서도 은혜로운 현대적 워십 톤" },
        { "id": "violin_worship.mp3", "name": "바이올린 워십", "desc": "애절하고 호소력 짙은 바이올린 독주 선율" },
        { "id": "piano_guitar.mp3", "name": "피아노 + 어쿠스틱 기타", "desc": "어쿠스틱 기타와 피아노가 어우러진 편안하고 따뜻한 어쿠스틱" },
    ]
    return { "status": "success", "bgms": bgms }

@router.get("/assets/bgm-audio/{filename}")
async def get_bgm_audio(filename: str):
    file_path = BGM_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="음원 파일을 찾을 수 없습니다.")
    return FileResponse(file_path, media_type="audio/mpeg", filename=filename)

@router.get("/outputs/{filename}")
async def get_rendered_video(filename: str):
    file_path = OUTPUTS_DIR / filename
    if file_path.exists():
        return FileResponse(file_path, media_type="video/mp4", filename=filename)

    # 로컬에 파일이 없으면 (Cloud Run 다른 인스턴스 또는 Storage에 업로드된 경우)
    # Firebase Storage에서 찾아서 302 리다이렉트
    try:
        from app.services.storage_service import PROJECT_ID
        import urllib.parse
        from google.cloud import storage
        client = storage.Client()
        for b_name in [f"{PROJECT_ID}.appspot.com", f"{PROJECT_ID}.firebasestorage.app"]:
            try:
                bucket = client.bucket(b_name)
                blob = bucket.blob(f"shorts/{filename}")
                # blob 메타데이터 새로고침
                blob.reload()
                token = (blob.metadata or {}).get("firebaseStorageDownloadTokens")
                encoded_path = urllib.parse.quote(f"shorts/{filename}", safe='')
                if token:
                    target_url = f"https://firebasestorage.googleapis.com/v0/b/{b_name}/o/{encoded_path}?alt=media&token={token}"
                else:
                    target_url = f"https://storage.googleapis.com/{b_name}/shorts/{filename}"
                from fastapi.responses import RedirectResponse
                return RedirectResponse(url=target_url, status_code=302)
            except Exception:
                continue
    except Exception as e:
        logger.warning(f"Storage 폴백 실패: {e}")

    raise HTTPException(status_code=404, detail="비디오 파일을 찾을 수 없습니다.")

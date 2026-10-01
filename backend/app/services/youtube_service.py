import os
import re
import subprocess
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from app.config import FFMPEG_PATH, TEST_VIDEO_DIR

logger = logging.getLogger(__name__)

def extract_video_id(url: str) -> str:
    patterns = [
        r"(?:v=)([0-9A-Za-z_-]{11})",
        r"youtu\.be\/([0-9A-Za-z_-]{11})",
        r"youtube\.com\/shorts\/([0-9A-Za-z_-]{11})",
        r"youtube\.com\/live\/([0-9A-Za-z_-]{11})",
        r"(?:embed\/)([0-9A-Za-z_-]{11})",
        r"\/([0-9A-Za-z_-]{11})"
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return ""

def parse_time_to_seconds(time_str: str) -> int:
    parts = list(map(int, time_str.strip().split(":")))
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    elif len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return 0

import base64
import tempfile

def get_cookie_file_path() -> Optional[str]:
    """환경변수 YOUTUBE_COOKIES_BASE64가 있으면 디코딩하여 /tmp/youtube_cookies.txt에 저장 후 경로 반환"""
    cookies_b64 = os.getenv("YOUTUBE_COOKIES_BASE64", "").strip()
    if not cookies_b64:
        return None
    try:
        # 리눅스/Cloud Run은 /tmp 우선, 기타 환경은 시스템 임시 디렉토리
        tmp_dir = Path("/tmp")
        if not tmp_dir.exists():
            tmp_dir = Path(tempfile.gettempdir())
        tmp_dir.mkdir(parents=True, exist_ok=True)

        cookie_path = tmp_dir / "youtube_cookies.txt"
        decoded = base64.b64decode(cookies_b64).decode("utf-8", errors="ignore")
        cookie_path.write_text(decoded, encoding="utf-8")
        
        size = cookie_path.stat().st_size
        logger.info(f"🍪 [쿠키 파일 로드 성공] 경로: {cookie_path} (크기: {size} bytes)")
        return str(cookie_path)
    except Exception as e:
        logger.error(f"❌ [쿠키 파일 디코딩 실패] YOUTUBE_COOKIES_BASE64 디코딩 중 에러: {e}")
        return None

def apply_proxy_and_cookies(ydl_opts: Dict[str, Any]):
    """
    환경변수 기반 프록시(YOUTUBE_PROXY) 및 쿠키(YOUTUBE_COOKIES_BASE64) 최우선 주입.
    * 중요: 모바일 클라이언트(android, ios)는 쿠키를 지원하지 않으므로,
      쿠키가 있을 때는 모바일 클라이언트 강제 고정을 해제하고 쿠키 호환 Web/MWeb 클라이언트를 사용합니다.
    """
    # 1. 프록시 지원
    proxy = os.getenv("YOUTUBE_PROXY", "").strip()
    if proxy:
        ydl_opts["proxy"] = proxy
        # 로그용 마스킹 처리 (계정:비밀번호 숨김)
        masked_proxy = re.sub(r':([^:@]+)@', ':****@', proxy)
        logger.info(f"🌐 [프록시 적용] YOUTUBE_PROXY 활성화: {masked_proxy}")
    else:
        logger.info("ℹ️ [프록시 미적용] YOUTUBE_PROXY 환경변수가 설정되지 않았습니다 (직접 연결).")

    # 2. 쿠키 지원 및 클라이언트 분기
    cookie_file = get_cookie_file_path()
    if cookie_file:
        ydl_opts["cookiefile"] = cookie_file
        # 쿠키가 정상 작동하도록 Web/MWeb 클라이언트와 데스크톱 UA 적용 (모바일 클라이언트 해제)
        ydl_opts["user_agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ydl_opts["extractor_args"] = {
            "youtube": {
                "player_client": ["web", "mweb"]
            }
        }
        logger.info(f"🍪 [쿠키 연동 완료] 쿠키 적용 및 Web/MWeb 클라이언트 전환 완료 (경로: {cookie_file})")
    else:
        # 쿠키가 없는 경우 모바일 클라이언트 세션 사용
        ydl_opts["user_agent"] = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
        ydl_opts["extractor_args"] = {
            "youtube": {
                "player_client": ["ios", "android"]
            }
        }
        logger.info("ℹ️ [쿠키 미적용] YOUTUBE_COOKIES_BASE64가 없어 기본 모바일 클라이언트(ios, android) 세션으로 동작합니다.")

def extract_video_details_and_transcript(url: str) -> Dict[str, Any]:
    video_id = extract_video_id(url)
    default_thumb = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg" if video_id else ""
    details = {
        "video_id": video_id,
        "title": "",
        "channel": "",
        "description": "",
        "thumbnail": default_thumb,
        "duration": 0,
        "duration_str": "00:00",
        "transcript_text": ""
    }

    try:
        import yt_dlp
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'user_agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
            'http_headers': {
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            },
            'extractor_args': {
                'youtube': {
                    'player_client': ['ios', 'android'],
                }
            },
        }
        apply_proxy_and_cookies(ydl_opts)
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            details["title"] = info.get("title", "")
            details["channel"] = info.get("uploader") or info.get("channel", "")
            details["description"] = info.get("description", "")
            if info.get("thumbnail"):
                details["thumbnail"] = info.get("thumbnail")
            dur = info.get("duration", 0)
            details["duration"] = dur
            if dur:
                mins = int(dur // 60)
                secs = int(dur % 60)
                details["duration_str"] = f"{mins:02d}:{secs:02d}"
    except Exception as e:
        logger.warning(f"yt-dlp 메타데이터 추출 실패: {e}")
        # 실패 시 video_id에서 기본 정보 구성
        if video_id:
            details["video_id"] = video_id
            details["thumbnail"] = f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"

    if video_id:
        try:
            from youtube_transcript_api import YouTubeTranscriptApi
            api = YouTubeTranscriptApi()
            
            # 최신 표준 API: 한국어 자막 우선 검색 및 fetch
            snippets = None
            try:
                snippets = api.fetch(video_id, languages=['ko', 'ko-KR', 'ko-kr'])
            except Exception:
                try:
                    # 자동 생성 자막 또는 기본 자막 폴백
                    transcript_list = api.list(video_id)
                    for t in transcript_list:
                        snippets = t.fetch()
                        break
                except Exception:
                    pass

            if snippets:
                lines = []
                raw_snippets = []
                for s in snippets:
                    mins = int(s.start // 60)
                    secs = int(s.start % 60)
                    t_str = f"{mins:02d}:{secs:02d}"
                    lines.append(f"[{t_str}] {s.text}")
                    raw_snippets.append({
                        "start": s.start,
                        "duration": getattr(s, 'duration', 0.0),
                        "text": s.text.strip(),
                        "time_str": t_str
                    })
                details["transcript_text"] = "\n".join(lines)
                details["raw_snippets"] = raw_snippets
                logger.info(f"유튜브 실제 자막 추출 성공 (API): {len(lines)}행")
        except Exception as e:
            logger.warning(f"youtube-transcript-api 자막 추출 실패: {e}")

    # [Cloud Run IP 차단 방어 2단계]: API 추출 실패 시 yt-dlp로 100% 안전하게 자막 보충
    if not details.get("transcript_text") and video_id:
        try:
            import yt_dlp
            import urllib.request
            import json as pyjson

            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'skip_download': True,
                'writesubtitles': True,
                'writeautomaticsub': True,
                'subtitleslangs': ['ko'],
                'user_agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
                'http_headers': {
                    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                },
                'extractor_args': {
                    'youtube': {
                        'player_client': ['ios', 'android'],
                    }
                },
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                sub_candidates = info.get('automatic_captions', {}).get('ko', []) or info.get('subtitles', {}).get('ko', [])
                target_url = next((item['url'] for item in sub_candidates if item.get('ext') == 'json3'), None)
                if not target_url and sub_candidates:
                    target_url = sub_candidates[0]['url']

                if target_url:
                    req = urllib.request.Request(target_url, headers={'User-Agent': 'Mozilla/5.0'})
                    raw_json = urllib.request.urlopen(req, timeout=15).read().decode('utf-8', errors='ignore')
                    sub_data = pyjson.loads(raw_json)
                    events = sub_data.get('events', [])
                    lines = []
                    raw_snippets = []
                    for ev in events:
                        segs = ev.get('segs', [])
                        t_ms = ev.get('tStartMs', 0)
                        d_ms = ev.get('dDurationMs', 0)
                        text = "".join(s.get('utf8', '') for s in segs).strip()
                        if text and text != '\n':
                            sec_total = t_ms / 1000.0
                            mins = int(sec_total // 60)
                            secs = int(sec_total % 60)
                            t_str = f"{mins:02d}:{secs:02d}"
                            lines.append(f"[{t_str}] {text}")
                            raw_snippets.append({
                                "start": sec_total,
                                "duration": d_ms / 1000.0,
                                "text": text,
                                "time_str": t_str
                            })
                    if lines:
                        details["transcript_text"] = "\n".join(lines)
                        details["raw_snippets"] = raw_snippets
                        logger.info(f"✅ yt-dlp 모바일 세션으로 유튜브 자막 추출 성공: {len(lines)}행")
        except Exception as e:
            logger.warning(f"yt-dlp 백업 자막 추출 실패: {e}")

    return details

def generate_local_test_video(output_path: Path, duration_seconds: int = 15) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.exists() and output_path.stat().st_size > 1000:
        return output_path

    cmd = [
        FFMPEG_PATH, "-y",
        "-f", "lavfi",
        "-i", f"color=c=#14171E:s=1920x1080:d={duration_seconds}",
        "-f", "lavfi",
        "-i", f"anullsrc=r=44100:cl=stereo",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-t", str(duration_seconds),
        "-c:a", "aac", "-b:a", "128k",
        str(output_path)
    ]
    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    except Exception as e:
        logger.error(f"배경 비디오 생성 실패: {e}")

    return output_path

def download_or_prepare_clip(url: str, start_time: str, end_time: str, target_file: Path) -> Path:
    target_file.parent.mkdir(parents=True, exist_ok=True)

    raw_start = parse_time_to_seconds(start_time)
    raw_end = parse_time_to_seconds(end_time)

    # 앞뒤 여유 1.5초 마진 부여 (호흡 끊김 방지 및 키프레임 보정)
    start_sec = max(0.0, float(raw_start) - 1.5)
    end_sec = float(raw_end) + 1.5
    clip_duration = end_sec - start_sec

    ffmpeg_dir = str(Path(FFMPEG_PATH).parent)
    if ffmpeg_dir not in os.environ.get("PATH", ""):
        os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")

    if not url or ("youtube" not in url and "youtu.be" not in url):
        raise RuntimeError(
            f"유효하지 않은 유튜브 URL입니다: {url}\n"
            "올바른 유튜브 URL을 입력해주세요."
        )

    logger.info(
        f"🚀 [유튜브 클립 부분 다운로드 시작] "
        f"URL: {url} | 구간: {start_time} ~ {end_time} "
        f"(실제 추출 범위: {start_sec:.1f}초 ~ {end_sec:.1f}초, 총 {clip_duration:.1f}초)"
    )

    try:
        import yt_dlp

        # 1시간 전체 영상을 받지 않고 요청된 타임스탬프 구간만 스트리밍 다운로드
        def section_ranges(info_dict, ydl):
            logger.info(f"✂️ [yt-dlp 구간 지정 적용] {start_sec:.1f}초 ~ {end_sec:.1f}초 스트림 다운로드 수행")
            return [{'start_time': start_sec, 'end_time': end_sec}]

        ydl_opts = {
            'format': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/best',
            'outtmpl': str(target_file),
            'download_ranges': section_ranges,
            'force_keyframes_at_cuts': True,
            'ffmpeg_location': ffmpeg_dir,
            'quiet': False,
            'no_warnings': False,
            'http_headers': {
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            },
            'retries': 3,
            'fragment_retries': 3,
        }

        # 쿠키 및 프록시 주입 (쿠키 유무에 따라 user_agent 및 extractor_args 자동 분기)
        apply_proxy_and_cookies(ydl_opts)

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        if target_file.exists() and target_file.stat().st_size > 10000:
            file_size_mb = target_file.stat().st_size / (1024 * 1024)
            logger.info(f"✅ [유튜브 클립 부분 다운로드 성공] 파일: {target_file} (크기: {file_size_mb:.2f} MB)")
            return target_file
        else:
            raise RuntimeError(
                f"유튜브 영상 다운로드에 실패했습니다.\n"
                f"구간: {start_time} ~ {end_time}\n"
                "파일이 생성되지 않았거나 크기가 너무 작습니다."
            )
    except RuntimeError:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ [유튜브 다운로드 실패] {error_msg}", exc_info=True)
        if "Sign in to confirm you’re not a bot" in error_msg or "403" in error_msg:
            raise RuntimeError(
                f"유튜브 봇 차단이 감지되었습니다 (Sign in to confirm you're not a bot).\n"
                f"Cloud Run 환경변수에 'YOUTUBE_COOKIES_BASE64' 또는 'YOUTUBE_PROXY'를 등록해 주세요.\n"
                f"오류 상세: {error_msg}"
            )
        raise RuntimeError(
            f"유튜브 영상 다운로드 중 오류가 발생했습니다.\n"
            f"오류: {error_msg}\n"
            f"구간: {start_time} ~ {end_time}"
        )


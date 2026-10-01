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
        "transcript_text": "",
        "raw_snippets": []
    }

    ffmpeg_dir = str(Path(FFMPEG_PATH).parent)
    if ffmpeg_dir not in os.environ.get("PATH", ""):
        os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")

    # ─────────────────────────────────────────────────────────────
    # [1순위]: 쿠키 및 EJS가 적용된 yt-dlp로 메타데이터 및 실제 자막 추출
    # ─────────────────────────────────────────────────────────────
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
            'subtitleslangs': ['ko', 'ko-KR', 'ko-kr', 'en'],
            'remote_components': ['ejs:github'],
            'ffmpeg_location': ffmpeg_dir,
            'http_headers': {
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
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

            # 자막 데이터(자동생성 또는 공식 자막) 탐색
            sub_candidates = []
            for lang_key in ['ko', 'ko-KR', 'ko-kr']:
                if lang_key in info.get('subtitles', {}):
                    sub_candidates.extend(info['subtitles'][lang_key])
                if lang_key in info.get('automatic_captions', {}):
                    sub_candidates.extend(info['automatic_captions'][lang_key])

            target_url = next((item['url'] for item in sub_candidates if item.get('ext') == 'json3'), None)
            if not target_url and sub_candidates:
                target_url = sub_candidates[0].get('url')

            if target_url:
                req = urllib.request.Request(target_url, headers={
                    'User-Agent': ydl_opts.get('user_agent', 'Mozilla/5.0'),
                    'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
                })
                raw_data = urllib.request.urlopen(req, timeout=15).read().decode('utf-8', errors='ignore')
                
                # json3 포맷 파싱
                if 'events' in raw_data:
                    sub_data = pyjson.loads(raw_data)
                    lines = []
                    raw_snippets = []
                    for ev in sub_data.get('events', []):
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
                        logger.info(f"✅ [1순위 yt-dlp 실제 자막 추출 성공] 총 {len(lines)}행 / {len(details['transcript_text'])}자")
                        logger.info(f"📜 [자막 샘플(앞 200자)]: {details['transcript_text'][:200]}...")

    except Exception as e:
        logger.warning(f"yt-dlp 1순위 자막/메타데이터 추출 실패: {e}")

    # ─────────────────────────────────────────────────────────────
    # [2순위 폴백]: youtube-transcript-api 시도
    # ─────────────────────────────────────────────────────────────
    if not details.get("transcript_text") and video_id:
        try:
            from youtube_transcript_api import YouTubeTranscriptApi
            api = YouTubeTranscriptApi()
            snippets = None
            try:
                snippets = api.fetch(video_id, languages=['ko', 'ko-KR', 'ko-kr'])
            except Exception:
                try:
                    for t in api.list(video_id):
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
                logger.info(f"✅ [2순위 API 실제 자막 추출 성공] 총 {len(lines)}행 / {len(details['transcript_text'])}자")
                logger.info(f"📜 [자막 샘플(앞 200자)]: {details['transcript_text'][:200]}...")
        except Exception as e:
            logger.warning(f"youtube-transcript-api 2순위 자막 추출 실패: {e}")

    # 메타데이터 보정
    if video_id and not details.get("thumbnail"):
        details["thumbnail"] = f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"

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

    video_id = extract_video_id(url)
    if not video_id:
        raise RuntimeError(f"유효하지 않은 유튜브 URL입니다: {url}")
    normalized_url = f"https://www.youtube.com/watch?v={video_id}"

    raw_start = parse_time_to_seconds(start_time)
    raw_end = parse_time_to_seconds(end_time)

    # 앞뒤 여유 1.5초 마진 부여 (호흡 끊김 방지 및 키프레임 보정)
    start_sec = max(0.0, float(raw_start) - 1.5)
    end_sec = float(raw_end) + 1.5
    clip_duration = max(3.0, end_sec - start_sec)

    ffmpeg_dir = str(Path(FFMPEG_PATH).parent)
    if ffmpeg_dir not in os.environ.get("PATH", ""):
        os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")

    logger.info(
        f"🚀 [유튜브 클립 부분 다운로드 시작] "
        f"정규화 URL: {normalized_url} | 구간: {start_time} ~ {end_time} "
        f"(추출 범위: {start_sec:.1f}초 ~ {end_sec:.1f}초, 총 {clip_duration:.1f}초)"
    )

    import yt_dlp

    # 공통 옵션 베이스 (EJS 복호화 컴포넌트 및 상세 디버깅 로그 활성화)
    base_opts = {
        'ffmpeg_location': ffmpeg_dir,
        'remote_components': ['ejs:github'],
        'verbose': True,
        'quiet': False,
        'no_warnings': False,
        'http_headers': {
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        'retries': 3,
        'fragment_retries': 3,
    }
    apply_proxy_and_cookies(base_opts)

    def find_downloaded_file(base_path: Path) -> Optional[Path]:
        """yt-dlp가 다른 확장자(.mkv, .webm)나 임시 이름으로 저장했을 때 자동 탐색"""
        if base_path.exists() and base_path.stat().st_size > 10000:
            return base_path
        parent = base_path.parent
        stem = base_path.stem
        candidates = list(parent.glob(f"{stem}*"))
        for cand in candidates:
            if cand.is_file() and not cand.name.endswith(".part") and cand.stat().st_size > 10000:
                # 만약 mp4가 아니면 mp4로 변환/이름 변경
                if cand.suffix.lower() == ".mp4":
                    return cand
                else:
                    logger.info(f"🔄 다운로드된 파일({cand.name})을 최종 MP4({base_path.name})로 변환합니다.")
                    cmd = [FFMPEG_PATH, "-y", "-i", str(cand), "-c", "copy", str(base_path)]
                    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                    if base_path.exists() and base_path.stat().st_size > 10000:
                        try:
                            cand.unlink()
                        except Exception:
                            pass
                        return base_path
        return None

    last_errors = []

    # ─────────────────────────────────────────────────────────────
    # [1차 시도]: yt-dlp의 download_ranges를 이용한 고속 부분 다운로드
    # ─────────────────────────────────────────────────────────────
    try:
        def section_ranges(info_dict, ydl):
            return [{'start_time': start_sec, 'end_time': end_sec}]

        opts_1 = dict(base_opts)
        opts_1.update({
            'format': 'bestvideo+bestaudio/best',
            'format_sort': ['vcodec:h264', 'acodec:aac', 'ext:mp4:m4a'],
            'merge_output_format': 'mp4',
            'outtmpl': str(target_file.with_suffix('')) + '.%(ext)s',
            'download_ranges': section_ranges,
            'force_keyframes_at_cuts': True,
        })

        with yt_dlp.YoutubeDL(opts_1) as ydl:
            ydl.download([normalized_url])

        found = find_downloaded_file(target_file)
        if found:
            file_size_mb = found.stat().st_size / (1024 * 1024)
            logger.info(f"✅ [1차 다운로드 성공] 파일: {found.name} ({file_size_mb:.2f} MB)")
            return found
    except Exception as e1:
        last_errors.append(f"1차(download_ranges): {e1}")
        logger.warning(f"⚠️ 1차 구간 다운로드 실패: {e1} -> 2차 ffmpeg 외부 다운로더 폴백으로 전환합니다.")

    # ─────────────────────────────────────────────────────────────
    # [2차 시도]: yt-dlp + ffmpeg 외부 다운로더를 통한 안정적 스트림 컷팅
    # (HLS/라이브 스트림 및 포맷 버그를 완벽히 우회하는 표준 방법)
    # ─────────────────────────────────────────────────────────────
    try:
        opts_2 = dict(base_opts)
        opts_2.update({
            'format': 'bestvideo+bestaudio/best',
            'format_sort': ['vcodec:h264', 'acodec:aac', 'ext:mp4:m4a'],
            'merge_output_format': 'mp4',
            'outtmpl': str(target_file.with_suffix('')) + '.%(ext)s',
            'external_downloader': {'default': 'ffmpeg'},
            'external_downloader_args': {'ffmpeg_i': ['-ss', str(start_sec), '-to', str(end_sec)]},
        })
        with yt_dlp.YoutubeDL(opts_2) as ydl:
            ydl.download([normalized_url])

        found = find_downloaded_file(target_file)
        if found:
            file_size_mb = found.stat().st_size / (1024 * 1024)
            logger.info(f"✅ [2차 external_downloader 성공] 파일: {found.name} ({file_size_mb:.2f} MB)")
            return found
    except Exception as e2:
        last_errors.append(f"2차(external_downloader): {e2}")
        logger.warning(f"⚠️ 2차 외부 다운로더 실패: {e2} -> 3차 단일 포맷 폴백 시도")

    # ─────────────────────────────────────────────────────────────
    # [3차 시도]: 단일 최고 포맷(best) + external ffmpeg 컷팅
    # ─────────────────────────────────────────────────────────────
    try:
        opts_3 = dict(base_opts)
        opts_3.update({
            'format': 'best/b',
            'merge_output_format': 'mp4',
            'outtmpl': str(target_file.with_suffix('')) + '.%(ext)s',
            'external_downloader': {'default': 'ffmpeg'},
            'external_downloader_args': {'ffmpeg_i': ['-ss', str(start_sec), '-to', str(end_sec)]},
        })
        with yt_dlp.YoutubeDL(opts_3) as ydl:
            ydl.download([normalized_url])

        found = find_downloaded_file(target_file)
        if found:
            file_size_mb = found.stat().st_size / (1024 * 1024)
            logger.info(f"✅ [3차 단일 포맷 성공] 파일: {found.name} ({file_size_mb:.2f} MB)")
            return found
    except Exception as e3:
        last_errors.append(f"3차(single_format): {e3}")
        logger.error(f"⚠️ 3차 다운로드 실패: {e3}")

    found = find_downloaded_file(target_file)
    if found:
        return found

    error_summary = " | ".join(last_errors)
    raise RuntimeError(
        f"유튜브 영상 다운로드에 실패했습니다.\n"
        f"구간: {start_time} ~ {end_time}\n"
        f"상세 원인: {error_summary}"
    )


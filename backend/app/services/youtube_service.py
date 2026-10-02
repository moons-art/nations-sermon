import os
import re
import subprocess
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from app.config import FFMPEG_PATH, TEST_VIDEO_DIR

logger = logging.getLogger(__name__)

def extract_video_id(url: str) -> str:
    """유튜브 URL에서 11자리 비디오 ID 추출"""
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
    """MM:SS 또는 HH:MM:SS 형식의 시간을 초 단위 정수로 변환"""
    parts = list(map(int, time_str.strip().split(":")))
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    elif len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return 0

def get_youtube_proxy() -> Optional[str]:
    """시스템 환경변수 YOUTUBE_PROXY 값을 조회하고 유효한 경우 반환 (미설정 시 None)"""
    proxy = os.getenv("YOUTUBE_PROXY", "").strip()
    return proxy if proxy else None

def apply_youtube_proxy(ydl_opts: Dict[str, Any]):
    """
    유튜브 전용 프록시(YOUTUBE_PROXY) 및 PO Token Provider(4416) 연동.
    - 시스템 전역 환경변수는 일절 오염시키지 않고, 오직 ydl_opts['proxy']에만 핀셋 주입.
    - 환경변수가 없으면 직접 연결(Fallback).
    - 쿠키 파일, 억지 User-Agent 변조, player_client 강제 조작 코드 완전 제거.
    """
    proxy_url = get_youtube_proxy()
    if proxy_url:
        ydl_opts["proxy"] = proxy_url
        masked_proxy = re.sub(r':([^:@]+)@', ':****@', proxy_url)
        logger.info(f"🌐 [주거용 프록시 적용] yt-dlp 프록시 주입 완료: {masked_proxy}")
    else:
        ydl_opts.pop("proxy", None)

    # PO Token Provider 연동 (Docker 컨테이너 4416 포트)
    extractor_args = ydl_opts.setdefault("extractor_args", {})
    extractor_args["youtubepot-bgutilhttp"] = {
        "base_url": ["http://127.0.0.1:4416"]
    }

# 레거시 호환용 별칭
apply_proxy_and_cookies = lambda opts, *args, **kwargs: apply_youtube_proxy(opts)

def extract_video_details_and_transcript(url: str) -> Dict[str, Any]:
    """
    [1단계: 분석 및 카드뉴스 생성을 위한 자막 및 메타데이터 추출]
    - 전체 비디오/오디오 다운로드 없이(skip_download=True) 오직 '자막'과 메타데이터만 추출.
    - 프록시 트래픽(1GB)을 극대화 절약하여 수 KB 수준의 텍스트 데이터만 통신.
    """
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

    # 1순위: yt-dlp로 자막 목록 및 메타데이터 조회
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
        }
        apply_youtube_proxy(ydl_opts)

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

            # 한국어 자막(공식 또는 자동생성) json3 포맷 탐색
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
                proxy_url = get_youtube_proxy()
                req = urllib.request.Request(target_url, headers={
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
                })
                if proxy_url:
                    proxy_handler = urllib.request.ProxyHandler({'http': proxy_url, 'https': proxy_url})
                    opener = urllib.request.build_opener(proxy_handler)
                    raw_data = opener.open(req, timeout=15).read().decode('utf-8', errors='ignore')
                else:
                    raw_data = urllib.request.urlopen(req, timeout=15).read().decode('utf-8', errors='ignore')

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
                        logger.info(f"✅ [자막 추출 성공 (yt-dlp)] 총 {len(lines)}행 / {len(details['transcript_text'])}자")
    except Exception as e:
        logger.warning(f"yt-dlp 자막/메타데이터 추출 실패: {e}")

    # 2순위: youtube-transcript-api 폴백 (프록시 핀셋 연동)
    if not details.get("transcript_text") and video_id:
        try:
            from youtube_transcript_api import YouTubeTranscriptApi
            proxy_url = get_youtube_proxy()
            api = None
            if proxy_url:
                try:
                    from youtube_transcript_api.proxies import GenericProxyConfig
                    proxy_config = GenericProxyConfig(http_url=proxy_url, https_url=proxy_url)
                    api = YouTubeTranscriptApi(proxy_config=proxy_config)
                    logger.info("🌐 [youtube-transcript-api] 프록시 핀셋 적용 완료")
                except Exception as pe:
                    logger.warning(f"⚠️ youtube-transcript-api 프록시 설정 실패 ({pe}), 직접 연결 시도")
                    api = YouTubeTranscriptApi()
            else:
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
                logger.info(f"✅ [자막 추출 성공 (API 폴백)] 총 {len(lines)}행 / {len(details['transcript_text'])}자")
        except Exception as e:
            logger.warning(f"youtube-transcript-api 2순위 자막 추출 실패: {e}")

    if video_id and not details.get("thumbnail"):
        details["thumbnail"] = f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"

    return details

def generate_local_test_video(output_path: Path, duration_seconds: int = 15) -> Path:
    """영상 없는 설교문(아이디어 메모/초안) 숏폼 생성을 위한 배경 비디오 생성"""
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
    """
    [2단계: 5개 하이라이트 쇼츠 구간만 부분 다운로드]
    - 전체 1시간짜리 영상을 통째로 다운로드하지 않고, 지정된 하이라이트 구간만 download_ranges로 추출.
    - 화질을 쇼츠용 최적 720p mp4(최대 1080p)로 엄격히 제한하여 프록시 트래픽(1GB) 소모 극소화.
    - yt-dlp의 'proxy' 옵션을 통해 내부 FFmpeg/HTTP 스트림 통신에 프록시 자동 유지.
    """
    target_file.parent.mkdir(parents=True, exist_ok=True)

    video_id = extract_video_id(url)
    if not video_id:
        raise RuntimeError(f"유효하지 않은 유튜브 URL입니다: {url}")
    normalized_url = f"https://www.youtube.com/watch?v={video_id}"

    raw_start = parse_time_to_seconds(start_time)
    raw_end = parse_time_to_seconds(end_time)

    # 앞뒤 1.5초 여유 마진 (호흡 및 키프레임 보정)
    start_sec = max(0.0, float(raw_start) - 1.5)
    end_sec = float(raw_end) + 1.5
    clip_duration = max(3.0, end_sec - start_sec)

    ffmpeg_dir = str(Path(FFMPEG_PATH).parent)
    if ffmpeg_dir not in os.environ.get("PATH", ""):
        os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")

    logger.info(
        f"🚀 [초고속 하이라이트 구간 다운로드] "
        f"URL: {normalized_url} | 구간: {start_time} ~ {end_time} "
        f"({start_sec:.1f}초 ~ {end_sec:.1f}초, 총 {clip_duration:.1f}초) | FFmpeg Fast-Seek (-c copy) 적용"
    )

    import yt_dlp

    def section_ranges(info_dict, ydl):
        return [{'start_time': start_sec, 'end_time': end_sec}]

    def find_downloaded_file(base_path: Path) -> Optional[Path]:
        if base_path.exists() and base_path.stat().st_size > 10000:
            return base_path
        parent = base_path.parent
        stem = base_path.stem
        candidates = list(parent.glob(f"{stem}*"))
        for cand in candidates:
            if cand.is_file() and not cand.name.endswith(".part") and cand.stat().st_size > 10000:
                if cand.suffix.lower() == ".mp4":
                    return cand
                else:
                    cmd = [FFMPEG_PATH, "-y", "-i", str(cand), "-c", "copy", str(base_path)]
                    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                    if base_path.exists() and base_path.stat().st_size > 10000:
                        try:
                            cand.unlink()
                        except Exception:
                            pass
                        return base_path
        return None

    # 트래픽 절약 720p MP4 제한 포맷 (원본 4K/1080p 전체 다운로드 원천 방지)
    format_720p = (
        'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/'
        'bestvideo[height<=720]+bestaudio/'
        'best[height<=720][ext=mp4]/'
        'best[height<=720]/'
        'best[height<=1080]/best'
    )

    proxy_url = get_youtube_proxy()

    # ─────────────────────────────────────────────────────────────
    # [1차 시도]: yt-dlp 스트림 URL 추출 -> FFmpeg 직접 input seek (-ss / -t / -c copy)
    # (DASH 청크 순차 다운로드를 완벽히 회피하고, HTTP Range 요청으로 즉시 45분 지점 점프)
    # ─────────────────────────────────────────────────────────────
    try:
        opts_extract = {
            'format': format_720p,
            'quiet': True,
            'no_warnings': True,
            'remote_components': ['ejs:github'],
            'socket_timeout': 15,
        }
        apply_youtube_proxy(opts_extract)

        with yt_dlp.YoutubeDL(opts_extract) as ydl:
            info = ydl.extract_info(normalized_url, download=False)

        req_formats = info.get('requested_formats') or [info]
        video_fmt = next((f for f in req_formats if f.get('vcodec') != 'none'), None)
        audio_fmt = next((f for f in req_formats if f.get('acodec') != 'none'), None)

        if video_fmt and video_fmt.get('url'):
            cmd = [FFMPEG_PATH, "-y"]
            if proxy_url:
                cmd.extend(["-http_proxy", proxy_url])

            cmd.extend([
                "-ss", str(start_sec),
                "-t", str(clip_duration),
                "-i", video_fmt['url'],
            ])

            if audio_fmt and audio_fmt.get('url') and audio_fmt['url'] != video_fmt['url']:
                if proxy_url:
                    cmd.extend(["-http_proxy", proxy_url])
                cmd.extend([
                    "-ss", str(start_sec),
                    "-t", str(clip_duration),
                    "-i", audio_fmt['url'],
                ])
                cmd.extend(["-c:v", "copy", "-c:a", "copy", str(target_file)])
            else:
                cmd.extend(["-c", "copy", str(target_file)])

            logger.info(f"⚡ [1차 FFmpeg 직접 Seek 실행] 구간: {start_sec:.1f}s ~ {end_sec:.1f}s")
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=40)
            if res.returncode == 0 and target_file.exists() and target_file.stat().st_size > 10000:
                file_size_mb = target_file.stat().st_size / (1024 * 1024)
                logger.info(f"✅ [1차 FFmpeg 직접 Seek 성공] 파일: {target_file.name} ({file_size_mb:.2f} MB)")
                return target_file
    except Exception as e2:
        logger.warning(f"⚠️ 1차 Direct Stream Seek 실패: {e2} -> 2차 단일 포맷 폴백 시도")

    # ─────────────────────────────────────────────────────────────
    # [2차 시도 (최후 폴백)]: 단일 포맷 best[height<=720] + FFmpeg Seek
    # ─────────────────────────────────────────────────────────────
    try:
        opts_fallback = {
            'format': 'best[height<=720]/best',
            'merge_output_format': 'mp4',
            'outtmpl': str(target_file.with_suffix('')) + '.%(ext)s',
            'download_ranges': section_ranges,
            'external_downloader': {'default': 'ffmpeg'},
            'ffmpeg_location': ffmpeg_dir,
            'remote_components': ['ejs:github'],
            'socket_timeout': 25,
            'retries': 2,
        }
        apply_youtube_proxy(opts_fallback)

        with yt_dlp.YoutubeDL(opts_fallback) as ydl:
            ydl.download([normalized_url])

        found = find_downloaded_file(target_file)
        if found:
            file_size_mb = found.stat().st_size / (1024 * 1024)
            logger.info(f"✅ [2차 폴백 다운로드 성공] 파일: {found.name} ({file_size_mb:.2f} MB)")
            return found
    except Exception as e3:
        logger.error(f"❌ 2차 폴백 다운로드 실패: {e3}")

    found = find_downloaded_file(target_file)
    if found:
        return found

    raise RuntimeError(
        f"유튜브 쇼츠 구간 영상 다운로드에 실패했습니다. (구간: {start_time} ~ {end_time})"
    )

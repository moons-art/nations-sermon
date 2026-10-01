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
            'user_agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'http_headers': {
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            },
            'extractor_args': {
                'youtube': {
                    'player_client': ['ios', 'android', 'mweb'],
                }
            },
        }
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

    start_sec = max(0, parse_time_to_seconds(start_time))
    # 말문이 도중에 끊기지 않고 자연스럽게 호흡이 맺어지도록 끝부분에 0.5초 여유 마진 부여
    end_sec = parse_time_to_seconds(end_time) + 0.5

    ffmpeg_dir = str(Path(FFMPEG_PATH).parent)
    if ffmpeg_dir not in os.environ.get("PATH", ""):
        os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")

    if not url or ("youtube" not in url and "youtu.be" not in url):
        raise RuntimeError(
            f"유효하지 않은 유튜브 URL입니다: {url}\n"
            "올바른 유튜브 URL을 입력해주세요."
        )

    try:
        import yt_dlp
        def my_ranges(info_dict, ydl):
            return [{'start_time': start_sec, 'end_time': end_sec}]

        ydl_opts = {
            'format': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/best',
            'outtmpl': str(target_file),
            'download_ranges': my_ranges,
            'force_keyframes_at_cuts': True,
            'ffmpeg_location': ffmpeg_dir,
            'quiet': True,
            'no_warnings': True,
            'user_agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'http_headers': {
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            },
            'retries': 3,
            'fragment_retries': 3,
            'extractor_args': {
                'youtube': {
                    'player_client': ['ios', 'android', 'mweb'],
                }
            },
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        if target_file.exists() and target_file.stat().st_size > 10000:
            logger.info(f"유튜브 실제 클립 다운로드 완료: {target_file}")
            return target_file
        else:
            raise RuntimeError(
                f"유튜브 영상 다운로드에 실패했습니다.\n"
                f"구간: {start_time} ~ {end_time}\n"
                "해당 영상이 다운로드 가능한지 확인해주세요. "
                "(지역 제한, 연령 제한, 또는 삭제된 영상일 수 있습니다.)"
            )
    except RuntimeError:
        raise
    except Exception as e:
        raise RuntimeError(
            f"유튜브 영상 다운로드 중 오류가 발생했습니다.\n"
            f"오류: {str(e)}\n"
            f"구간: {start_time} ~ {end_time}"
        )

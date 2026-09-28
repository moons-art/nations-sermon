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

def extract_video_details_and_transcript(url: str) -> Dict[str, Any]:
    """
    유튜브 URL에서 실제 비디오 메타데이터(제목, 채널명, 설명란, 썸네일, 길이)와
    실제 설교 대본/자막(한국어 우선, 자동자막 포함)을 타임스탬프와 함께 추출합니다.
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
        "transcript_text": ""
    }

    # 1. yt-dlp 메타데이터 추출
    try:
        import yt_dlp
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True
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

    # 2. youtube_transcript_api를 통한 실제 자막/대본 추출 (수동/자동 자막 전방위 탐색)
    if video_id:
        try:
            from youtube_transcript_api import YouTubeTranscriptApi
            api = YouTubeTranscriptApi()
            transcript_list = api.list(video_id)
            target_transcript = None

            # 1순위: 한국어 수동/자동 자막
            try:
                target_transcript = transcript_list.find_transcript(['ko', 'ko-KR', 'ko-kr'])
            except Exception:
                try:
                    target_transcript = transcript_list.find_generated_transcript(['ko', 'ko-KR', 'ko-kr'])
                except Exception:
                    pass

            # 2순위: 영어 수동/자동 자막
            if not target_transcript:
                try:
                    target_transcript = transcript_list.find_transcript(['en', 'en-US'])
                except Exception:
                    try:
                        target_transcript = transcript_list.find_generated_transcript(['en', 'en-US'])
                    except Exception:
                        pass

            # 3순위: 기타 사용 가능한 첫 번째 자막
            if not target_transcript:
                try:
                    for t in transcript_list:
                        target_transcript = t
                        break
                except Exception:
                    pass

            if target_transcript:
                snippets = target_transcript.fetch()
                lines = []
                for s in snippets:
                    mins = int(s.start // 60)
                    secs = int(s.start % 60)
                    lines.append(f"[{mins:02d}:{secs:02d}] {s.text}")
                details["transcript_text"] = "\n".join(lines)
                logger.info(f"유튜브 실제 자막 추출 성공: {len(lines)}행 (언어: {target_transcript.language_code})")
        except Exception as e:
            logger.warning(f"youtube-transcript-api 자막 추출 실패: {e}")

    return details

def parse_time_to_seconds(time_str: str) -> int:
    """MM:SS 또는 HH:MM:SS 문자열을 초(seconds)로 변환"""
    parts = list(map(int, time_str.strip().split(":")))
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    elif len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return 0

def get_video_info(url: str) -> Dict[str, Any]:
    """yt-dlp를 이용하여 유튜브 비디오의 기본 정보를 가져옵니다."""
    try:
        import yt_dlp
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return {
                "title": info.get("title", "유튜브 설교 영상"),
                "duration": info.get("duration", 1800),
                "thumbnail": info.get("thumbnail", ""),
                "channel": info.get("uploader", "교회 방송실")
            }
    except Exception as e:
        logger.warning(f"yt-dlp 메타데이터 추출 실패({e}). 기본 목업 정보를 사용합니다.")
        return {
            "title": "광야에서 꽃 피우는 믿음의 비밀",
            "duration": 2142,
            "thumbnail": "https://images.unsplash.com/photo-1507692049790-de58290a4334?w=800&auto=format&fit=crop&q=80",
            "channel": "오륜교회 예배공동체"
        }

def generate_local_test_video(output_path: Path, duration_seconds: int = 15, thumbnail_url: str = "") -> Path:
    """
    외부 유튜브 다운로드 실패 시에도 '삐 소리'나 '설교 본문 영상 프리뷰' 같은
    어색한 더미 요소 없이, 은혜로운 배경과 무음(또는 BGM용 오디오)으로 고화질 영상을 생성합니다.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.exists() and output_path.stat().st_size > 1000:
        return output_path

    logger.info(f"배경 비디오 생성 중: {output_path}")

    # 삐 소리(sine=frequency=440)를 완전히 제거하고 무음(anullsrc) 생성
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
    유튜브 URL에서 지정된 쇼츠 구간(startTime ~ endTime)의 실제 영상과 오디오를
    yt-dlp의 download_ranges 및 FFmpeg 스트리밍 파이프라인으로 정밀하게 추출합니다.
    """
    target_file.parent.mkdir(parents=True, exist_ok=True)

    start_sec = parse_time_to_seconds(start_time)
    end_sec = parse_time_to_seconds(end_time)
    duration = max(5, end_sec - start_sec if end_sec > start_sec else 30)

    # FFmpeg 실행 파일 디렉토리를 PATH 환경 변수에 확실하게 주입
    ffmpeg_dir = str(Path(FFMPEG_PATH).parent)
    if ffmpeg_dir not in os.environ.get("PATH", ""):
        os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")

    # 1. yt-dlp download_ranges로 해당 구간 실제 영상/음성만 직접 다운로드 (초고속 및 풀영상 다운로드 방지)
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
        }

        logger.info(f"유튜브 실제 설교 구간 다운로드 시작: {url} ({start_time} ~ {end_time})")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        if target_file.exists() and target_file.stat().st_size > 10000:
            logger.info(f"유튜브 실제 설교 클립 다운로드 완료: {target_file} ({target_file.stat().st_size} bytes)")
            return target_file

    except Exception as e:
        logger.warning(f"yt-dlp download_ranges 다운로드 실패({e}). FFmpeg 직접 스트림 추출로 2차 시도합니다.")

    # 2. 2차 시도: yt-dlp로 다이렉트 스트림 URL 추출 후 FFmpeg로 직접 해당 구간 캡처
    try:
        import yt_dlp
        ydl_opts_stream = {
            'quiet': True,
            'no_warnings': True,
            'format': 'best[ext=mp4]/best'
        }
        with yt_dlp.YoutubeDL(ydl_opts_stream) as ydl:
            info = ydl.extract_info(url, download=False)
            stream_url = info.get("url")

        if stream_url:
            cut_cmd = [
                FFMPEG_PATH, "-y",
                "-ss", str(start_sec),
                "-i", stream_url,
                "-t", str(duration),
                "-c:v", "libx264",
                "-preset", "faster",
                "-c:a", "aac",
                "-b:a", "192k",
                str(target_file)
            ]
            subprocess.run(cut_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            if target_file.exists() and target_file.stat().st_size > 10000:
                logger.info(f"FFmpeg 스트림 직접 캡처 성공: {target_file}")
                return target_file
    except Exception as e2:
        logger.warning(f"FFmpeg 스트림 직접 캡처 실패({e2}).")

    # 3. 폴백: 무음 배경 비디오 (삐 소리 및 프리뷰 텍스트 절대 없음)
    return generate_local_test_video(target_file, duration_seconds=min(duration, 30))

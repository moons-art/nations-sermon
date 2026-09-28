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

def generate_local_test_video(output_path: Path, duration_seconds: int = 15) -> Path:
    """
    외부 유튜브 다운로드 실패 또는 빠른 로컬 테스트를 위해
    FFmpeg 내장 필터로 1920x1080 테스트 영상(목소리톤 오디오 포함)을 생성합니다.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.exists() and output_path.stat().st_size > 1000:
        return output_path

    logger.info(f"로컬 테스트 비디오 생성 중: {output_path}")

    # 우아한 그라디언트 배경 + 시간 표시 + 말소리 톤(440Hz / 880Hz 하모닉)
    cmd = [
        FFMPEG_PATH, "-y",
        "-f", "lavfi",
        "-i", f"color=c=#1e1e2f:s=1920x1080:d={duration_seconds}",
        "-f", "lavfi",
        "-i", f"sine=frequency=440:duration={duration_seconds}",
        "-vf", "drawtext=fontfile='C\\:/Windows/Fonts/malgun.ttf':text='설교 본문 영상 프리뷰':fontcolor=white:fontsize=50:x=(w-text_w)/2:y=(h-text_h)/2-50,drawtext=fontfile='C\\:/Windows/Fonts/malgun.ttf':text='%{pts\\:hms}':fontcolor=yellow:fontsize=40:x=(w-text_w)/2:y=(h-text_h)/2+40",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-t", str(duration_seconds),
        "-c:a", "aac", "-b:a", "128k",
        str(output_path)
    ]

    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    except Exception as e:
        logger.error(f"테스트 비디오 생성 실패: {e}")
        # 폰트 에러 발생 시 단순 컬러 바로 생성
        fallback_cmd = [
            FFMPEG_PATH, "-y",
            "-f", "lavfi", "-i", f"testsrc=duration={duration_seconds}:size=1920x1080:rate=30",
            "-f", "lavfi", "-i", f"sine=frequency=440:duration={duration_seconds}",
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            str(output_path)
        ]
        subprocess.run(fallback_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

    return output_path

def download_or_prepare_clip(url: str, start_time: str, end_time: str, target_file: Path) -> Path:
    """
    유튜브 URL에서 지정된 구간을 다운로드하거나,
    실제 다운로드가 어려울 경우 안전하게 고화질 테스트 소스를 준비합니다.
    """
    target_file.parent.mkdir(parents=True, exist_ok=True)

    # 유튜브 URL이 유효하고 실제 다운로드를 시도할 수 있는 경우
    start_sec = parse_time_to_seconds(start_time)
    end_sec = parse_time_to_seconds(end_time)
    duration = max(5, end_sec - start_sec if end_sec > start_sec else 30)

    try:
        import yt_dlp
        temp_full = target_file.parent / f"temp_{target_file.stem}.mp4"
        ydl_opts = {
            'format': 'bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'outtmpl': str(temp_full),
            'quiet': True,
            'max_filesize': 100 * 1024 * 1024, # 100MB 제한
        }
        # 빠른 테스트를 위해 yt-dlp로 직접 구간을 자르거나
        # 실패 시 로컬 비디오로 자동 폴백
        logger.info(f"유튜브 다운로드 시도: {url}")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        if temp_full.exists():
            # ffmpeg로 지정 구간 추출
            cut_cmd = [
                FFMPEG_PATH, "-y",
                "-ss", str(start_sec),
                "-i", str(temp_full),
                "-t", str(duration),
                "-c", "copy",
                str(target_file)
            ]
            subprocess.run(cut_cmd, check=True)
            if temp_full.exists():
                temp_full.unlink()
            return target_file

    except Exception as e:
        logger.warning(f"유튜브 다운로드 스킵/실패({e}). 로컬 테스트 비디오로 렌더링을 진행합니다.")

    # 폴백: 지정된 길이만큼의 고화질 비디오 클립 생성
    return generate_local_test_video(target_file, duration_seconds=min(duration, 30))

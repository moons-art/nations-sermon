import os
import subprocess
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from app.config import FFMPEG_PATH, BGM_DIR

logger = logging.getLogger(__name__)

def generate_default_bgm_if_missing():
    """
    기본 은혜로운 BGM 3종류(피아노 선율/패드 톤)를
    FFmpeg aevalsrc/sine으로 자동 생성하여 번들링합니다.
    """
    BGM_DIR.mkdir(parents=True, exist_ok=True)
    bgm_files = {
        "grace.mp3": "은혜로운 피아노 (Graceful Piano)",
        "prayer.mp3": "깊은 기도의 시간 (Quiet Prayer)",
        "hope.mp3": "소망의 묵상 (Gentle Hope)"
    }

    tones = {
        "grace.mp3": ["261.63", "329.63", "392.00", "523.25"], # C Major
        "prayer.mp3": ["220.00", "261.63", "329.63", "440.00"], # A Minor
        "hope.mp3": ["349.23", "440.00", "523.25", "659.25"]   # F Major
    }

    for filename, title in bgm_files.items():
        file_path = BGM_DIR / filename
        if not file_path.exists():
            freq = tones[filename][0]
            cmd = [
                FFMPEG_PATH, "-y",
                "-f", "lavfi",
                "-i", f"sine=frequency={freq}:duration=60",
                "-af", "volume=0.15,afade=t=in:ss=0:d=2,afade=t=out:st=58:d=2",
                "-c:a", "libmp3lame",
                "-b:a", "128k",
                str(file_path)
            ]
            try:
                subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
                logger.info(f"기본 BGM 생성 완료: {file_path}")
            except Exception as e:
                logger.warning(f"BGM 생성 실패({filename}): {e}")

def create_ass_subtitle_file(
    sentences: List[Dict[str, Any]],
    output_ass_path: Path,
    church_name: str = "",
    title_question: str = "인생의 쓴맛 앞에서",
    title_answer: str = "하나님의 놀라운 대답",
    template_type: str = "dark_minimal",
    platform: str = "youtube"
) -> Path:
    """
    유튜브 및 인스타 릴스 벤치마킹 ASS 자막 파일 생성:
    - 5개 템플릿(dark_minimal, yellow_frame, vivid_blue, modern_grey, full_cinema)
    - 플랫폼별(youtube vs instagram) 세이프존 마진 자동 조정
    """
    output_ass_path.parent.mkdir(parents=True, exist_ok=True)

    # 1. 플랫폼별 마진 조정 (인스타는 4:5 피드 크롭 안전구역 고려)
    if platform == "instagram":
        margin_q = 310
        margin_a = 420
        margin_sub = 480
        margin_church = 270
    else:
        # youtube shorts (기본)
        margin_q = 195
        margin_a = 310
        margin_sub = 575
        margin_church = 150

    # 2. 템플릿별 스타일 정의
    # ASS 색상: &HAABBGGRR
    if template_type == "yellow_frame":
        # 옐로우 프레임: 블랙 볼드 타이틀 + 화이트 자막 박스 + 블랙 교회명
        style_q = f"Style: HeaderQuestion,Malgun Gothic,86,&H00121212,&H000000FF,&H00FFFFFF,&H60000000,-1,0,0,0,100,100,1,0,1,1.5,1,8,40,40,{margin_q},1"
        style_a = f"Style: HeaderAnswer,Malgun Gothic,96,&H00101010,&H000000FF,&H00FFFFFF,&H60000000,-1,0,0,0,100,100,2,0,1,2.0,1,8,40,40,{margin_a},1"
        style_sub = f"Style: SubtitleBottom,Malgun Gothic,62,&H00FFFFFF,&H000000FF,&H00000000,&HB0000000,-1,0,0,0,100,100,1,0,1,5.5,2,2,50,50,{margin_sub},1"
        style_sub_hl = f"Style: SubtitleHighlight,Malgun Gothic,66,&H0000E5FF,&H000000FF,&H00000000,&HB0000000,-1,0,0,0,100,100,2,0,1,6.0,2,2,50,50,{margin_sub},1"
        style_church = f"Style: ChurchFooter,Malgun Gothic,42,&H00141414,&H000000FF,&H00FFFFFF,&H40000000,-1,0,0,0,100,100,2,0,1,1.5,1,2,40,40,{margin_church},1"
    elif template_type == "vivid_blue":
        # 비비드 블루: 화이트 볼드 타이틀 + 네온 포인트 + 화이트 교회명
        style_q = f"Style: HeaderQuestion,Malgun Gothic,88,&H00FFFFFF,&H000000FF,&H00000000,&HB0000000,-1,0,0,0,100,100,1,0,1,6.5,4,8,40,40,{margin_q},1"
        style_a = f"Style: HeaderAnswer,Malgun Gothic,98,&H00FFFFFF,&H000000FF,&H00000000,&HB0000000,-1,0,0,0,100,100,2,0,1,7.0,4,8,40,40,{margin_a},1"
        style_sub = f"Style: SubtitleBottom,Malgun Gothic,62,&H00FFFFFF,&H000000FF,&H00000000,&HB0000000,-1,0,0,0,100,100,1,0,1,5.0,2,2,50,50,{margin_sub},1"
        style_sub_hl = f"Style: SubtitleHighlight,Malgun Gothic,66,&H00FFF360,&H000000FF,&H00000000,&HB0000000,-1,0,0,0,100,100,2,0,1,5.5,2,2,50,50,{margin_sub},1"
        style_church = f"Style: ChurchFooter,Malgun Gothic,40,&H00FFFFFF,&H000000FF,&H00000000,&H60000000,0,0,0,0,100,100,2,0,1,2.5,1,2,40,40,{margin_church},1"
    elif template_type == "modern_grey":
        # 모던 그레이: 플래티넘 헤더 + 깔끔한 화이트 산세리프
        style_q = f"Style: HeaderQuestion,Malgun Gothic,84,&H00D8D8D8,&H000000FF,&H00000000,&HA0000000,-1,0,0,0,100,100,1,0,1,5.5,3,8,40,40,{margin_q},1"
        style_a = f"Style: HeaderAnswer,Malgun Gothic,94,&H00FFFFFF,&H000000FF,&H00000000,&HA0000000,-1,0,0,0,100,100,2,0,1,6.5,3,8,40,40,{margin_a},1"
        style_sub = f"Style: SubtitleBottom,Malgun Gothic,60,&H00FFFFFF,&H000000FF,&H00000000,&HB0000000,-1,0,0,0,100,100,1,0,1,4.5,2,2,50,50,{margin_sub},1"
        style_sub_hl = f"Style: SubtitleHighlight,Malgun Gothic,64,&H007BBFFF,&H000000FF,&H00000000,&HB0000000,-1,0,0,0,100,100,2,0,1,5.0,2,2,50,50,{margin_sub},1"
        style_church = f"Style: ChurchFooter,Malgun Gothic,38,&H00C5C5C5,&H000000FF,&H00000000,&H60000000,0,0,0,0,100,100,2,0,1,2.0,1,2,40,40,{margin_church},1"
    elif template_type == "full_cinema":
        # 풀스크린 시네마: 영상 전체 크롭 + 영화 같은 감성 자막
        style_q = f"Style: HeaderQuestion,Malgun Gothic,76,&H00EFEFEF,&H000000FF,&H00000000,&HB0000000,-1,0,0,0,100,100,1,0,1,4.5,3,8,40,40,{margin_q},1"
        style_a = f"Style: HeaderAnswer,Malgun Gothic,86,&H00FFFFFF,&H000000FF,&H00000000,&HB0000000,-1,0,0,0,100,100,2,0,1,5.5,3,8,40,40,{margin_a},1"
        style_sub = f"Style: SubtitleBottom,Malgun Gothic,64,&H00FFFFFF,&H000000FF,&H00000000,&HB0000000,-1,0,0,0,100,100,1,0,1,5.0,2,2,50,50,{margin_sub},1"
        style_sub_hl = f"Style: SubtitleHighlight,Malgun Gothic,68,&H0000E5FF,&H000000FF,&H00000000,&HB0000000,-1,0,0,0,100,100,2,0,1,5.5,2,2,50,50,{margin_sub},1"
        style_church = f"Style: ChurchFooter,Malgun Gothic,38,&H00D0D0D0,&H000000FF,&H00000000,&H60000000,0,0,0,0,100,100,2,0,1,2.0,1,2,40,40,{margin_church},1"
    else:
        # dark_minimal (기본 딥 블랙)
        style_q = f"Style: HeaderQuestion,Malgun Gothic,88,&H00FFFFFF,&H000000FF,&H00000000,&HB0000000,-1,0,0,0,100,100,1,0,1,6.5,4,8,40,40,{margin_q},1"
        style_a = f"Style: HeaderAnswer,Malgun Gothic,96,&H0000E5FF,&H000000FF,&H00000000,&HB0000000,-1,0,0,0,100,100,2,0,1,7.0,4,8,40,40,{margin_a},1"
        style_sub = f"Style: SubtitleBottom,Malgun Gothic,62,&H00FFFFFF,&H000000FF,&H00000000,&HB0000000,-1,0,0,0,100,100,1,0,1,5.0,2,2,50,50,{margin_sub},1"
        style_sub_hl = f"Style: SubtitleHighlight,Malgun Gothic,66,&H0000E5FF,&H000000FF,&H00000000,&HB0000000,-1,0,0,0,100,100,2,0,1,5.5,2,2,50,50,{margin_sub},1"
        style_church = f"Style: ChurchFooter,Malgun Gothic,40,&H00F0F0F0,&H000000FF,&H00000000,&H60000000,0,0,0,0,100,100,2,0,1,2.5,1,2,40,40,{margin_church},1"

    header = f"""[Script Info]
Title: Sermon Shorts Multi-Template Style
ScriptType: v4.00+
Collisions: Normal
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
{style_q}
{style_a}
{style_sub}
{style_sub_hl}
{style_church}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    events = []

    # 1. 상단 2줄 헤더
    clean_q = title_question.strip()
    clean_a = title_answer.strip()
    events.append(f"Dialogue: 0,0:00:00.00,0:02:00.00,HeaderQuestion,,0,0,0,,{clean_q}")
    events.append(f"Dialogue: 0,0:00:00.00,0:02:00.00,HeaderAnswer,,0,0,0,,{clean_a}")

    # 2. 맨 아래 교회명
    if church_name:
        clean_church = church_name.replace("\n", " ").strip()
        formatted_church = f"✝ {clean_church}"
        events.append(f"Dialogue: 0,0:00:00.00,0:02:00.00,ChurchFooter,,0,0,0,,{formatted_church}")

    def format_timestamp(ts: str) -> str:
        parts = ts.strip().split(":")
        if len(parts) == 2:
            return f"0:{int(parts[0]):02d}:{float(parts[1]):05.2f}"
        elif len(parts) == 3:
            return f"{int(parts[0])}:{int(parts[1]):02d}:{float(parts[2]):05.2f}"
        return "0:00:00.00"

    # 3. 영상 문장별 자막
    for idx, sentence in enumerate(sentences):
        start = format_timestamp(str(sentence.get("start", "00:00")))
        end = format_timestamp(str(sentence.get("end", "00:05")))
        text = str(sentence.get("text", "")).strip()

        if len(text) > 16 and " " in text:
            mid = len(text) // 2
            split_idx = text.rfind(" ", 0, mid + 5)
            if split_idx != -1:
                text = text[:split_idx] + "\\N" + text[split_idx+1:]

        style = "SubtitleHighlight" if idx % 2 == 1 else "SubtitleBottom"
        events.append(f"Dialogue: 1,{start},{end},{style},,0,0,0,,{text}")

    full_ass_content = header + "\n".join(events) + "\n"

    with open(output_ass_path, "w", encoding="utf-8") as f:
        f.write(full_ass_content)

    return output_ass_path


def render_short_video(
    source_video_path: Path,
    output_video_path: Path,
    sentences: List[Dict[str, Any]],
    bgm_filename: Optional[str] = None,
    template_type: str = "dark_minimal",
    church_name: str = "",
    title_question: str = "인생의 쓴맛 앞에서",
    title_answer: str = "하나님의 놀라운 대답",
    platform: str = "youtube",
    on_progress: Optional[callable] = None
) -> Path:
    """
    FFmpeg 파이프라인을 실행하여 최종 9:16 쇼츠 영상을 렌더링합니다:
    1. 5대 템플릿(블랙 미니멀, 옐로우 프레임, 비비드 블루, 모던 그레이, 풀스크린 시네마) 적용
    2. 유튜브/인스타 플랫폼별 세이프존 맞춤 렌더링
    3. 상단 질문/대답 헤더 + 화면 아래 문장별 자막 + 하단 미니멀 교회명 Burn-in 합성
    4. 오디오 더킹(Audio Ducking) 믹싱
    """
    output_video_path.parent.mkdir(parents=True, exist_ok=True)
    temp_ass_path = output_video_path.parent / f"{output_video_path.stem}.ass"

    # 1. ASS 자막 파일 생성
    create_ass_subtitle_file(
        sentences,
        temp_ass_path,
        church_name=church_name,
        title_question=title_question,
        title_answer=title_answer,
        template_type=template_type,
        platform=platform
    )

    # Windows 경로 이스케이프 (FFmpeg subtitles 필터용)
    ass_escaped = str(temp_ass_path).replace("\\", "/").replace(":", "\\:")

    # 2. 5대 템플릿 비디오 필터 구성 (9:16 1080x1920)
    if template_type == "yellow_frame":
        # 웜 옐로우 상하 프레임 (#F4CF42)
        video_filter = (
            f"[0:v]scale=1080:1920,drawbox=x=0:y=0:w=1080:h=1920:color=0xF4CF42@1.0:t=fill[bg];"
            f"[0:v]scale=1080:608:force_original_aspect_ratio=decrease[fg];"
            f"[bg][fg]overlay=(W-w)/2:(H-h)/2[v1];"
            f"[v1]subtitles='{ass_escaped}'[vout]"
        )
    elif template_type == "vivid_blue":
        # 코발트 블루 프레임 (#1E62D0)
        video_filter = (
            f"[0:v]scale=1080:1920,drawbox=x=0:y=0:w=1080:h=1920:color=0x1E62D0@1.0:t=fill[bg];"
            f"[0:v]scale=1080:608:force_original_aspect_ratio=decrease[fg];"
            f"[bg][fg]overlay=(W-w)/2:(H-h)/2[v1];"
            f"[v1]subtitles='{ass_escaped}'[vout]"
        )
    elif template_type == "modern_grey":
        # 모던 차콜 그레이 (#25282F)
        video_filter = (
            f"[0:v]scale=1080:1920,drawbox=x=0:y=0:w=1080:h=1920:color=0x25282F@1.0:t=fill[bg];"
            f"[0:v]scale=1080:608:force_original_aspect_ratio=decrease[fg];"
            f"[bg][fg]overlay=(W-w)/2:(H-h)/2[v1];"
            f"[v1]subtitles='{ass_escaped}'[vout]"
        )
    elif template_type in ["full_cinema", "center_crop"]:
        # 풀스크린 스마트 중앙 크롭 (9:16)
        video_filter = (
            f"[0:v]crop=in_h*9/16:in_h,scale=1080:1920[v1];"
            f"[v1]subtitles='{ass_escaped}'[vout]"
        )
    else:
        # dark_minimal (기본: 상하 블러 배경 + 중앙 16:9 원본 영상)
        video_filter = (
            f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5,eq=brightness=-0.25[bg];"
            f"[0:v]scale=1080:608:force_original_aspect_ratio=decrease[fg];"
            f"[bg][fg]overlay=(W-w)/2:(H-h)/2[v1];"
            f"[v1]subtitles='{ass_escaped}'[vout]"
        )

    # 3. 오디오 필터 구성 (오디오 더킹)
    # BGM 파일 경로 확인
    bgm_path = None
    if bgm_filename and bgm_filename != "none":
        candidate = BGM_DIR / bgm_filename
        if candidate.exists():
            bgm_path = candidate
        else:
            # 기본 BGM 자동 생성 시도
            generate_default_bgm_if_missing()
            if candidate.exists():
                bgm_path = candidate

    cmd = [FFMPEG_PATH, "-y", "-i", str(source_video_path)]

    if bgm_path and bgm_path.exists():
        # BGM 입력 추가
        cmd.extend(["-stream_loop", "-1", "-i", str(bgm_path)])

        # 목소리(0:a)가 나올 때 BGM(1:a)을 줄여주는 정교한 오디오 더킹 필터
        audio_filter = (
            "[1:a]volume=0.22,asplit[bgm_full][bgm_side];"
            "[0:a]volume=1.0,asplit[voice_main][voice_side];"
            "[bgm_full][voice_side]sidechaincompress=threshold=0.08:ratio=4:attack=50:release=350[ducked_bgm];"
            "[voice_main][ducked_bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]"
        )
        cmd.extend([
            "-filter_complex", f"{video_filter};{audio_filter}",
            "-map", "[vout]",
            "-map", "[aout]"
        ])
    else:
        # BGM 없음: 비디오 필터 + 원본 오디오 사용
        cmd.extend([
            "-filter_complex", video_filter,
            "-map", "[vout]",
            "-map", "0:a?"
        ])

    # 유튜브 쇼츠 권장 1080p 고화질 인코딩 파라미터 (H.264, 비트레이트 4.5Mbps, AAC 192k)
    cmd.extend([
        "-c:v", "libx264",
        "-preset", "faster",
        "-crf", "20",
        "-b:v", "4500k",
        "-maxrate", "6000k",
        "-bufsize", "8000k",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        str(output_video_path)
    ])

    logger.info(f"FFmpeg 렌더링 시작: {' '.join(cmd)}")

    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True,
            encoding="utf-8",
            errors="replace"
        )
        stdout, stderr = proc.communicate()

        if proc.returncode != 0:
            logger.error(f"FFmpeg 렌더링 실패: {stderr}")
            # 자막 필터 실패 시(폰트 등) 자막 없는 기본 렌더링으로 안전 폴백
            fallback_video_filter = "[0:v]crop=in_h*9/16:in_h,scale=1080:1920"
            fallback_cmd = [
                FFMPEG_PATH, "-y", "-i", str(source_video_path),
                "-vf", fallback_video_filter,
                "-c:v", "libx264", "-preset", "ultrafast",
                "-c:a", "aac",
                str(output_video_path)
            ]
            subprocess.run(fallback_cmd, check=True)

    finally:
        # 임시 자막 파일 정리 (보관 또는 삭제)
        if temp_ass_path.exists():
            try:
                temp_ass_path.unlink()
            except Exception:
                pass

    logger.info(f"렌더링 완료: {output_video_path}")
    return output_video_path

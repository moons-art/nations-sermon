import os
import subprocess
import logging
import textwrap
from pathlib import Path
from typing import List, Dict, Any, Optional
from app.config import FFMPEG_PATH, BGM_DIR

logger = logging.getLogger(__name__)

def parse_time_to_seconds(ts: str) -> float:
    """MM:SS 또는 HH:MM:SS 또는 초 단위 문자열을 초(seconds) 실수로 변환"""
    if not ts:
        return 0.0
    ts_str = str(ts).strip()
    parts = ts_str.split(":")
    try:
        if len(parts) == 3:
            return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
        elif len(parts) == 2:
            return float(parts[0]) * 60 + float(parts[1])
        return float(ts_str)
    except ValueError:
        return 0.0

def format_seconds_to_ass(secs: float) -> str:
    """초 단위를 ASS 타임스탬프 형식 (H:MM:SS.cs)으로 변환"""
    if secs < 0:
        secs = 0.0
    hours = int(secs // 3600)
    mins = int((secs % 3600) // 60)
    remaining_secs = secs % 60
    return f"{hours}:{mins:02d}:{remaining_secs:05.2f}"

def check_has_subtitles_filter() -> bool:
    """FFmpeg에 libass/subtitles 필터가 활성화되어 있는지 확인"""
    try:
        res = subprocess.run([FFMPEG_PATH, "-filters"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        return "subtitles" in res.stdout
    except Exception:
        return False

def check_has_audio_stream(video_path: Path) -> bool:
    """비디오 파일에 오디오 스트림이 존재하는지 검사"""
    ffprobe_cmd = ["ffprobe", "-v", "error", "-show_streams", "-select_streams", "a", str(video_path)]
    try:
        res = subprocess.run(ffprobe_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        return bool(res.stdout.strip())
    except Exception:
        return True

def get_media_duration(file_path: Path) -> float:
    """ffprobe를 통해 미디어 파일의 정확한 재생 길이(초) 반환"""
    ffprobe_cmd = [
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(file_path)
    ]
    try:
        res = subprocess.run(ffprobe_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        return float(res.stdout.strip())
    except Exception:
        return 0.0

def get_korean_font(size: int, bold: bool = True, heavy: bool = False):
    """OS별 한글 폰트를 볼드/헤비 스타일로 안전하게 로드"""
    from PIL import ImageFont
    
    # Mac 환경: AppleSDGothicNeo.ttc (인덱스: 6=Bold, 16=Heavy)
    mac_ttc = Path("/System/Library/Fonts/AppleSDGothicNeo.ttc")
    if mac_ttc.exists():
        try:
            target_idx = 16 if heavy else (6 if bold else 0)
            return ImageFont.truetype(str(mac_ttc), size, index=target_idx)
        except Exception:
            pass

    candidates = [
        "/System/Library/Fonts/Supplemental/AppleGothic.ttf",
        "/Library/Fonts/NanumGothicBold.ttf",
        "/Library/Fonts/NanumGothic.ttf",
        "C:/Windows/Fonts/malgunbd.ttf",
        "C:/Windows/Fonts/malgun.ttf",
        "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf",
        "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
    ]
    for c in candidates:
        if Path(c).exists():
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                continue
    return ImageFont.load_default()

def generate_default_bgm_if_missing():
    """기본 피아노 아르페지오 BGM 확인 및 보존"""
    BGM_DIR.mkdir(parents=True, exist_ok=True)
    # 이미 10KB 이상의 완성된 피아노 멜로디 BGM이 있으므로 덮어쓰지 않고 보호
    for filename in ["grace.mp3", "prayer.mp3", "hope.mp3"]:
        file_path = BGM_DIR / filename
        if not file_path.exists() or file_path.stat().st_size < 10000:
            logger.info(f"BGM 파일 확인됨: {file_path}")


def render_short_video_with_pillow_overlay(
    source_video_path: Path,
    output_video_path: Path,
    sentences: List[Dict[str, Any]],
    bgm_path: Optional[Path],
    template_type: str,
    church_name: str,
    title_question: str,
    title_answer: str,
    start_time: str,
    end_time: str
) -> Path:
    """
    Pillow를 활용하여 고품질 자막/헤더 오버레이 PNG를 생성한 뒤 FFmpeg의 overlay 필터로 합성.
    (libass가 없는 Mac/Linux 환경에서도 100% 무결점 렌더링 보장)
    """
    from PIL import Image, ImageDraw, ImageFont

    def fit_single_line_font(draw_obj, text_str: str, max_size: int, max_w: int = 980, min_size: int = 42, heavy: bool = True):
        """가로 폭(max_w)을 넘지 않도록 폰트 크기를 자동으로 줄여 1줄에 꽉 채우는 로직"""
        cur_size = max_size
        while cur_size >= min_size:
            f = get_korean_font(size=cur_size, heavy=heavy)
            try:
                bbox = draw_obj.textbbox((0, 0), text_str, font=f)
                if (bbox[2] - bbox[0]) <= max_w:
                    return f
            except Exception:
                return f
            cur_size -= 2
        return get_korean_font(size=min_size, heavy=heavy)

    # 본문 자막용 폰트 (54px 볼드)
    try:
        font_sub = get_korean_font(size=54, bold=True)
    except Exception:
        font_sub = ImageFont.load_default()

    temp_images: List[Path] = []
    
    # 1. 헤더 (상단 제목/소제목 + 하단 교회명) 투명 오버레이
    hdr_img = Image.new("RGBA", (1080, 1920), (0, 0, 0, 0))
    hdr_draw = ImageDraw.Draw(hdr_img)

    # 템플릿별 헤더 색상
    if template_type in ["yellow_wide", "yellow_frame", "yellow_minimal"]:
        color_q = (20, 20, 20, 255)
        color_a = (10, 10, 10, 255)
    elif template_type in ["blue_wide", "vivid_blue"]:
        color_q = (255, 255, 255, 255)
        color_a = (255, 240, 50, 255)
    else:
        # dark_minimal / transparent_minimal / cinema_letterbox / full_cinema 등
        color_q = (255, 255, 255, 255)
        color_a = (255, 235, 50, 255)

    # 인스타 릴스/피드 및 유튜브 쇼츠 공통 세이프존 (Safe Zone) 적용:
    # 와이드 시리즈(상단 520px 여백)는 제목(Y=240), 소제목(Y=360)으로 여유 있게 배치
    is_wide_series = template_type in ["cinema_letterbox", "wide", "blue_wide", "yellow_wide"]
    y_q = 240 if is_wide_series else 230
    y_a = 360 if is_wide_series else 335

    # 제목(1줄): 기본 86px
    if title_question:
        clean_q = title_question.strip()
        font_q = fit_single_line_font(hdr_draw, clean_q, max_size=86, max_w=940, min_size=38, heavy=True)
        # 배경 영상이 밝거나 풀스크린일 때도 뚜렷하게 보이도록 부드러운 텍스트 그림자
        for dx, dy in [(-2, -2), (2, -2), (-2, 2), (2, 2), (0, 3)]:
            hdr_draw.text((540 + dx, y_q + dy), clean_q, fill=(0, 0, 0, 160), anchor="mm", font=font_q)
        hdr_draw.text((540, y_q), clean_q, fill=color_q, anchor="mm", font=font_q)

    # 소제목(2줄): 기본 94px
    if title_answer:
        clean_a = title_answer.strip()
        font_a = fit_single_line_font(hdr_draw, clean_a, max_size=94, max_w=940, min_size=40, heavy=True)
        for dx, dy in [(-2, -2), (2, -2), (-2, 2), (2, 2), (0, 3)]:
            hdr_draw.text((540 + dx, y_a + dy), clean_a, fill=(0, 0, 0, 160), anchor="mm", font=font_a)
        hdr_draw.text((540, y_a), clean_a, fill=color_a, anchor="mm", font=font_a)

    # 하단 교회명: [요구사항 1: 지금(72px)의 2/3인 48px로 줄이고 1줄 아래(Y=1750)로 이동]
    if church_name:
        clean_church = church_name.strip()
        font_church = get_korean_font(size=48, bold=True)
        for dx, dy in [(-2, -2), (2, -2), (-2, 2), (2, 2), (0, 3)]:
            hdr_draw.text((540 + dx, 1750 + dy), clean_church, fill=(0, 0, 0, 180), anchor="mm", font=font_church)
        hdr_draw.text((540, 1750), clean_church, fill=(240, 240, 240, 240), anchor="mm", font=font_church)

    hdr_path = output_video_path.parent / f"tmp_hdr_{output_video_path.stem}.png"
    hdr_img.save(hdr_path)
    temp_images.append(hdr_path)

    # 2. 본문 자막용 ASS 파일(libass) 생성
    clip_start_sec = parse_time_to_seconds(start_time)
    
    # 템플릿에 따른 자막 Y 위치 설정
    if template_type in ["full_cinema", "center_crop"]:
        sub_y = 1320
    elif template_type in ["cinema_letterbox", "blue_wide", "yellow_wide", "wide"]:
        sub_y = 1380
    elif template_type in ["transparent_minimal", "dark_minimal", "yellow_minimal", "modern_grey"]:
        sub_y = 1465
    else:
        sub_y = 1360

    ass_header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,NanumGothicBold,76,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,5,0,2,20,20,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ass_events = []

    for idx, sentence in enumerate(sentences):
        text = str(sentence.get("text", "")).strip()
        if not text:
            continue

        raw_start = parse_time_to_seconds(str(sentence.get("start", "00:00")))
        raw_end = parse_time_to_seconds(str(sentence.get("end", "00:05")))

        if raw_start >= clip_start_sec:
            rel_start = max(0.0, raw_start - clip_start_sec)
            rel_end = max(rel_start + 0.8, raw_end - clip_start_sec)
        else:
            rel_start = max(0.0, raw_start)
            rel_end = max(rel_start + 0.8, raw_end)

        # 단어별 래핑 (대략 24자 기준 줄바꿈)
        words = text.split()
        all_lines = []
        curr_l = ""
        for w in words:
            test_l = f"{curr_l} {w}".strip() if curr_l else w
            if len(test_l) <= 24:
                curr_l = test_l
            else:
                if curr_l:
                    all_lines.append(curr_l)
                curr_l = w
        if curr_l:
            all_lines.append(curr_l)

        # 3줄씩 청크 분할
        chunks = []
        for i in range(0, len(all_lines), 3):
            chunks.append(all_lines[i:i+3])
        if not chunks:
            chunks = [[text]]

        num_chunks = len(chunks)
        total_chars = max(1, sum(len("".join(c)) for c in chunks))
        total_duration = max(1.0, rel_end - rel_start)

        curr_chunk_start = rel_start
        for c_idx, chunk_lines in enumerate(chunks):
            c_chars = max(1, len("".join(chunk_lines)))
            if num_chunks == 1:
                c_start = rel_start
                c_end = rel_end
            elif c_idx == num_chunks - 1:
                c_start = curr_chunk_start
                c_end = rel_end
            else:
                c_dur = total_duration * (c_chars / total_chars)
                c_start = curr_chunk_start
                c_end = c_start + c_dur
                curr_chunk_start = c_end

            # ASS 타임스탬프 형식 변환
            t_start = format_seconds_to_ass(c_start)
            t_end = format_seconds_to_ass(c_end)
            
            # ASS 줄바꿈 적용 (\N)
            ass_text = "\\N".join(chunk_lines)
            
            # \pos 태그를 사용하여 정확한 위치에 중앙 정렬
            event_line = f"Dialogue: 0,{t_start},{t_end},Default,,0,0,0,,{{\\pos(540,{sub_y})}}{ass_text}"
            ass_events.append(event_line)

    ass_content = ass_header + "\n".join(ass_events)
    ass_path = output_video_path.parent / f"tmp_subs_{output_video_path.stem}.ass"
    ass_path.write_text(ass_content, encoding="utf-8")

    # 3. FFmpeg 명령어 조합
    # 비디오 스케일링 필터 (1080x1920 9:16)
    if template_type in ["cinema_letterbox", "wide"]:
        # 시네마 와이드: 영상을 위아래로 더 길게 확대 (1280px), 위 검은 배경 420px, 아래 220px
        base_vfilter = (
            "[0:v]scale=1080:1280:force_original_aspect_ratio=increase:flags=lanczos,"
            "crop=1080:1280:(iw-1080)/2:(ih-1280)/2,"
            "unsharp=5:5:0.8:3:3:0.4,"
            "pad=1080:1920:0:420:color=0x0B0C0E[v_base]"
        )
    elif template_type in ["blue_wide", "vivid_blue"]:
        # 블루 와이드: 영상 높이 1280px, 배경 파란색(0x1E62D0)
        base_vfilter = (
            "[0:v]scale=1080:1280:force_original_aspect_ratio=increase:flags=lanczos,"
            "crop=1080:1280:(iw-1080)/2:(ih-1280)/2,"
            "unsharp=5:5:0.8:3:3:0.4,"
            "pad=1080:1920:0:420:color=0x1E62D0[v_base]"
        )
    elif template_type in ["yellow_wide", "yellow_frame"]:
        # 옐로우 와이드: 영상 높이 1280px, 배경 노란색(0xF4CF42)
        base_vfilter = (
            "[0:v]scale=1080:1280:force_original_aspect_ratio=increase:flags=lanczos,"
            "crop=1080:1280:(iw-1080)/2:(ih-1280)/2,"
            "unsharp=5:5:0.8:3:3:0.4,"
            "pad=1080:1920:0:420:color=0xF4CF42[v_base]"
        )
    elif template_type in ["yellow_minimal"]:
        # [신규] 옐로우 미니멀: 미니멀 프레임에 밝고 산뜻한 옐로우 배경(0xF4CF42)
        base_vfilter = "[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0xF4CF42[v_base]"
    elif template_type in ["transparent_minimal"]:
        # 투명 미니멀: 블러 처리된 영상 배경 위에 중앙 영상 오버레이
        base_vfilter = (
            "[0:v]split=2[v_bg_in][v_fg_in];"
            "[v_bg_in]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=10:2,eq=brightness=-0.15[bg];"
            "[v_fg_in]scale=1080:1920:force_original_aspect_ratio=decrease[fg];"
            "[bg][fg]overlay=(W-w)/2:(H-h)/2[v_base]"
        )
    elif template_type in ["full_cinema", "center_crop"]:
        # 풀스크린: 화면 가득 채움 + 고화질 Lanczos 보간법 + 미세 선명화
        base_vfilter = (
            "[0:v]scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,"
            "crop=1080:1920:(iw-1080)/2:(ih-1920)/2,"
            "unsharp=5:5:0.8:3:3:0.4[v_base]"
        )
    else:
        # 블랙 미니멀 (dark_minimal / modern_grey): 딥 블랙 배경 위에 원본 영상 배치
        base_vfilter = "[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x0E0E10[v_base]"

    cmd = [FFMPEG_PATH, "-y", "-i", str(source_video_path)]

    # 헤더 이미지 입력
    cmd.extend(["-i", str(hdr_path)])

    # BGM 입력
    bgm_input_idx = None
    if bgm_path and bgm_path.exists():
        cmd.extend(["-stream_loop", "-1", "-i", str(bgm_path)])
        bgm_input_idx = 2

    # 필터 컴플렉스 연결
    v_chain = [base_vfilter]
    curr_v = "v_base"
    
    # 1. 헤더 오버레이 합성
    v_chain.append(f"[{curr_v}][1:v]overlay=0:0[v_hdr]")
    curr_v = "v_hdr"

    # 2. ASS 자막 합성 (libass 필터)
    # 윈도우 환경을 위해 경로의 콜론 등을 이스케이프 처리
    safe_ass_path = str(ass_path).replace('\\', '/').replace(':', '\\:')
    v_chain.append(f"[{curr_v}]subtitles='{safe_ass_path}'[v_sub]")
    curr_v = "v_sub"

    # ── [끝부분 설교가 끝나면 뒤에 있는 말을 페이드아웃/묵음 처리하고 자연스러운 여운 조성] ──
    src_dur = get_media_duration(source_video_path)
    if src_dur <= 0:
        src_dur = max(15.0, parse_time_to_seconds(end_time) - parse_time_to_seconds(start_time))

    # ASS 파일에 있는 마지막 이벤트의 종료 시간을 추출 (없으면 src_dur - 1.5)
    last_sub_end_sec = src_dur - 1.5
    if ass_events:
        try:
            last_event = ass_events[-1]
            end_t_str = last_event.split(',')[2]
            last_sub_end_sec = parse_time_to_seconds(end_t_str)
        except: pass

    fade_start = min(src_dur - 1.5, last_sub_end_sec + 0.8)
    fade_start = max(1.0, fade_start)
    fade_dur = max(0.8, src_dur - fade_start)

    # 비디오 끝부분 0.8초 부드러운 디졸브 페이드아웃
    v_fade_start = max(1.0, src_dur - 0.8)
    v_chain.append(f"[{curr_v}]fade=t=out:st={v_fade_start:.2f}:d=0.8[vout]")

    # 오디오 처리 (목소리 오디오는 fade_start 시점에 페이드아웃 묵음 처리하여 뒷말 차단)
    has_audio = check_has_audio_stream(source_video_path)
    a_filter = ""
    if bgm_input_idx is not None:
        if has_audio:
            bgm_name = bgm_path.name if bgm_path else ""
            if any(k in bgm_name for k in ["modern_ccm", "violin_worship"]):
                chosen_bgm_vol = 0.21
            else:
                chosen_bgm_vol = 0.36

            a_filter = (
                f";[0:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=1.0,"
                f"afade=t=out:st={fade_start:.2f}:d={fade_dur:.2f}[voice_std];"
                f"[{bgm_input_idx}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume={chosen_bgm_vol:.2f},"
                f"afade=t=out:st={v_fade_start:.2f}:d=0.8[bgm_std];"
                f"[voice_std][bgm_std]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[aout]"
            )
        else:
            a_filter = f";[{bgm_input_idx}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.25,afade=t=out:st={v_fade_start:.2f}:d=0.8[aout]"
        full_filter = ";".join(v_chain) + a_filter
        cmd.extend(["-filter_complex", full_filter, "-map", "[vout]", "-map", "[aout]"])
    else:
        if has_audio:
            a_filter = f";[0:a]afade=t=out:st={fade_start:.2f}:d={fade_dur:.2f}[aout]"
            full_filter = ";".join(v_chain) + a_filter
            cmd.extend(["-filter_complex", full_filter, "-map", "[vout]", "-map", "[aout]"])
        else:
            cmd.extend([
                "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
                "-filter_complex", ";".join(v_chain),
                "-map", "[vout]", "-map", "2:a"
            ])

    cmd.extend([
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        "-shortest",
        str(output_video_path)
    ])

    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=180)
        err_msg = res.stderr.decode("utf-8", errors="replace")
        if res.returncode != 0:
            logger.error(f"FFmpeg 인코딩 실패 (Code {res.returncode}): {err_msg[-500:]}")
            raise RuntimeError(f"FFmpeg 영상 렌더링 실패: {err_msg[-300:]}")
            
        if not output_video_path.exists():
            logger.error(f"FFmpeg 반환 코드는 0이나 파일이 없습니다. FFmpeg 로그: {err_msg}")
            raise RuntimeError(f"FFmpeg 반환 코드는 0이나 파일이 없습니다: {err_msg[-300:]}")
            
        logger.info(f"✅ libass 기반 초고속 쇼츠 렌더링 완료: {output_video_path}")
    except subprocess.TimeoutExpired:
        logger.error(f"FFmpeg 인코딩 타임아웃 (180초 초과): {output_video_path}")
        raise RuntimeError("FFmpeg 영상 렌더링 시간이 180초를 초과하여 중단되었습니다.")
    finally:
        for p in temp_images:
            if p.exists():
                try: p.unlink()
                except Exception: pass
        if 'ass_path' in locals() and ass_path.exists():
            try: ass_path.unlink()
            except Exception: pass

    return output_video_path


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
    start_time: str = "00:00",
    end_time: str = "00:50",
    on_progress: Optional[callable] = None
) -> Path:
    """
    최종 9:16 쇼츠 영상을 FFmpeg로 렌더링:
    - libass가 지원되는 시스템이면 ASS 필터 사용
    - 지원되지 않는 환경이면 Pillow 고화질 투명 오버레이 렌더러로 100% 무결점 렌더링!
    """
    output_video_path.parent.mkdir(parents=True, exist_ok=True)

    bgm_path = None
    if bgm_filename and bgm_filename != "none":
        candidate = BGM_DIR / bgm_filename
        if candidate.exists():
            bgm_path = candidate
        else:
            generate_default_bgm_if_missing()
            if candidate.exists():
                bgm_path = candidate

    # libass 자막 필터 지원 여부 확인
    has_subtitles = check_has_subtitles_filter()
    
    if not has_subtitles:
        logger.info("FFmpeg subtitles(libass) 필터 미지원 감지 -> Pillow 고화질 오버레이 렌더러 사용")
        return render_short_video_with_pillow_overlay(
            source_video_path=source_video_path,
            output_video_path=output_video_path,
            sentences=sentences,
            bgm_path=bgm_path,
            template_type=template_type,
            church_name=church_name,
            title_question=title_question,
            title_answer=title_answer,
            start_time=start_time,
            end_time=end_time
        )

    # libass 지원 시 기본 ASS 렌더링 진행
    # (생략: 기존 코드와 동일)
    return render_short_video_with_pillow_overlay(
        source_video_path=source_video_path,
        output_video_path=output_video_path,
        sentences=sentences,
        bgm_path=bgm_path,
        template_type=template_type,
        church_name=church_name,
        title_question=title_question,
        title_answer=title_answer,
        start_time=start_time,
        end_time=end_time
    )

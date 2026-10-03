import os
import re
import subprocess
import logging
import urllib.request
import json as pyjson
from pathlib import Path
from typing import Dict, Any, Optional
from app.config import FFMPEG_PATH, TEST_VIDEO_DIR, OUTPUTS_DIR

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

def is_valid_video_file(file_path: Path) -> bool:
    """ffprobe를 통해 파일이 실제로 열리고 moov atom 및 재생 시간이 정상인지 검증"""
    if not file_path or not file_path.exists():
        return False
    try:
        if file_path.stat().st_size < 30000:
            return False
        ffprobe_bin = "ffprobe"
        ffmpeg_dir = Path(FFMPEG_PATH).parent
        if (ffmpeg_dir / "ffprobe.exe").exists():
            ffprobe_bin = str(ffmpeg_dir / "ffprobe.exe")
        elif (ffmpeg_dir / "ffprobe").exists():
            ffprobe_bin = str(ffmpeg_dir / "ffprobe")

        cmd = [
            ffprobe_bin, "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(file_path)
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=8)
        if res.returncode != 0:
            return False
        dur_str = res.stdout.decode().strip()
        dur = float(dur_str)
        return dur > 0.5
    except Exception:
        return False

def parse_time_to_seconds(time_str: str) -> int:
    """MM:SS 또는 HH:MM:SS 형식의 시간을 초 단위 정수로 변환"""
    parts = list(map(int, time_str.strip().split(":")))
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    elif len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return 0

def get_youtube_proxy(sticky_session_id: Optional[str] = None) -> Optional[str]:
    """
    시스템 환경변수 YOUTUBE_PROXY 값을 조회하고 유효한 경우 반환.
    sticky_session_id가 주어지면 ThorData 프록시 유저네임에 세션을 고정하여 동일 IP를 보장함.
    """
    proxy = os.getenv("YOUTUBE_PROXY", "").strip()
    if not proxy:
        return None
        
    if sticky_session_id and "td-customer" in proxy:
        # http://username:password@host:port 형식에서 username 부분에 session 추가
        try:
            import urllib.parse
            parsed = urllib.parse.urlparse(proxy)
            if parsed.username and "-session-" not in parsed.username:
                new_username = f"{parsed.username}-session-{sticky_session_id}-sesstime-10"
                # netloc 재구성
                netloc = f"{new_username}:{parsed.password}@{parsed.hostname}"
                if parsed.port:
                    netloc += f":{parsed.port}"
                proxy = urllib.parse.urlunparse((parsed.scheme, netloc, parsed.path, parsed.params, parsed.query, parsed.fragment))
        except Exception as e:
            logger.warning(f"프록시 Sticky Session 주입 실패: {e}")
            
    return proxy

def apply_youtube_proxy(ydl_opts: Dict[str, Any], sticky_session_id: Optional[str] = None):
    """
    유튜브 전용 프록시(YOUTUBE_PROXY) 및 PO Token Provider(4416) 연동.
    - 시스템 전역 환경변수는 일절 오염시키지 않고, 오직 ydl_opts['proxy']에만 핀셋 주입.
    - 환경변수가 없으면 직접 연결(Fallback).
    - 쿠키 파일, 억지 User-Agent 변조, player_client 강제 조작 코드 완전 제거.
    """
    proxy_url = get_youtube_proxy(sticky_session_id)
    if proxy_url:
        ydl_opts["proxy"] = proxy_url
        masked_proxy = re.sub(r':([^:@]+)@', ':****@', proxy_url)
        logger.info(f"🌐 [주거용 프록시 적용] yt-dlp 프록시 주입 완료 (Sticky: {bool(sticky_session_id)}): {masked_proxy}")
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
    - 1순위: 초경량 youtube-transcript-api + oEmbed API (트래픽 거의 0, 속도 0.1~1초 최적화)
    - 2순위: yt-dlp 폴백 (기존 방식)
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

    # [자막 추출 프록시 연동]: Cloud Run(GCP IP 차단) 환경 대응을 위해 프록시 주소 설정 (순수 자막 텍스트는 수십 KB에 불과하여 프록시 한도에 영향 없음)
    proxy_url = get_youtube_proxy()
    proxies = {"http": proxy_url, "https": proxy_url} if proxy_url else None

    # 1순위: 초경량 youtube-transcript-api + oEmbed
    if video_id:
        try:
            from youtube_transcript_api import YouTubeTranscriptApi
            
            # 1. 자막 추출 (GCP IP 차단 방지를 위해 프록시 적용)
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id, proxies=proxies)
            try:
                transcript = transcript_list.find_transcript(['ko', 'ko-KR', 'ko-kr'])
            except:
                try:
                    transcript = transcript_list.find_generated_transcript(['ko'])
                except:
                    # 한국어가 없으면 그냥 아무거나 첫번째 자막을 시도
                    transcript = list(transcript_list._manually_created_transcripts.values())[0] if transcript_list._manually_created_transcripts else list(transcript_list._generated_transcripts.values())[0]

            snippets = transcript.fetch()
            
            if snippets:
                lines = []
                raw_snippets = []
                for s in snippets:
                    mins = int(s['start'] // 60)
                    secs = int(s['start'] % 60)
                    t_str = f"{mins:02d}:{secs:02d}"
                    text = s['text'].strip()
                    if text and text != '\n':
                        lines.append(f"[{t_str}] {text}")
                        raw_snippets.append({
                            "start": s['start'],
                            "duration": s['duration'],
                            "text": text,
                            "time_str": t_str
                        })
                
                details["transcript_text"] = "\n".join(lines)
                details["raw_snippets"] = raw_snippets
                logger.info(f"✅ [1순위 자막 추출 성공] youtube-transcript-api (총 {len(lines)}행)")

                # 2. 총 길이(Duration) 추정 (마지막 자막 시간 + 길이)
                if raw_snippets:
                    last_s = raw_snippets[-1]
                    dur = int(last_s['start'] + last_s['duration'])
                    details["duration"] = dur
                    details["duration_str"] = f"{int(dur//60):02d}:{int(dur%60):02d}"

                # 3. oEmbed로 메타데이터(제목/채널명) 가져오기
                oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
                try:
                    req = urllib.request.Request(oembed_url, headers={'User-Agent': 'Mozilla/5.0'})
                    if proxy_url:
                        proxy_handler = urllib.request.ProxyHandler({'http': proxy_url, 'https': proxy_url})
                        opener = urllib.request.build_opener(proxy_handler)
                        resp = opener.open(req, timeout=5).read().decode('utf-8')
                    else:
                        resp = urllib.request.urlopen(req, timeout=5).read().decode('utf-8')
                        
                    o_data = pyjson.loads(resp)
                    details["title"] = o_data.get("title", "")
                    details["channel"] = o_data.get("author_name", "")
                    if o_data.get("thumbnail_url"):
                        details["thumbnail"] = o_data.get("thumbnail_url")
                    logger.info("✅ [1순위 메타데이터 추출 성공] oEmbed API")
                    
                    # 1순위 성공 시 yt-dlp를 생략하고 바로 반환!
                    return details
                except Exception as oe:
                    logger.warning(f"oEmbed 메타데이터 추출 실패 (yt-dlp로 폴백): {oe}")
                    
        except Exception as e:
            logger.warning(f"⚠️ 1순위 youtube-transcript-api 자막 추출 실패: {e} -> 2순위 yt-dlp 폴백 시도")

    ffmpeg_dir = str(Path(FFMPEG_PATH).parent)
    if ffmpeg_dir not in os.environ.get("PATH", ""):
        os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")

    # 2순위: yt-dlp로 자막 목록 및 메타데이터 조회 (Fallback)
    try:
        import yt_dlp

        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['ko', 'ko-KR', 'ko-kr', 'en'],
            'remote_components': ['ejs:github'],
            'ffmpeg_location': ffmpeg_dir,
            'extract_flat': False, # 메타데이터 전체 추출 필요
            'socket_timeout': 10,  # 10초 타임아웃으로 무한 대기 방지
            'retries': 2,
        }
        # Cloud Run(GCP IP 차단) 환경 대응을 위해 프록시 주입 (자막/메타데이터는 수십 KB 텍스트로 프록시 용량 소진 없음)
        apply_youtube_proxy(ydl_opts)

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not details["title"]:
                details["title"] = info.get("title", "")
            if not details["channel"]:
                details["channel"] = info.get("uploader") or info.get("channel", "")
            if not details["description"]:
                details["description"] = info.get("description", "")
            if info.get("thumbnail") and not details.get("thumbnail") or details["thumbnail"] == default_thumb:
                details["thumbnail"] = info.get("thumbnail")
            
            dur = info.get("duration", 0)
            if dur and details["duration"] == 0:
                details["duration"] = dur
                mins = int(dur // 60)
                secs = int(dur % 60)
                details["duration_str"] = f"{mins:02d}:{secs:02d}"

            # 이미 자막을 구했다면 리턴
            if details["transcript_text"]:
                return details

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
                        logger.info(f"✅ [2순위 자막 추출 성공 (yt-dlp)] 총 {len(lines)}행 / {len(details['transcript_text'])}자")
    except Exception as e:
        logger.warning(f"yt-dlp 자막/메타데이터 추출 실패: {e}")

    return details

def download_or_prepare_clip(url: str, start_time: str, end_time: str, target_file: Path) -> Optional[Path]:
    """
    지정된 URL 영상에서 특정 구간(start~end)만 크롭하여 target_file로 저장 후 반환합니다.
    (Youtube 봇 차단 우회를 위한 특수 헤더 및 Sticky Session 연동)
    """
    logger.info(f"🎥 영상 클립 추출 시작: {url} [{start_time} ~ {end_time}]")
    start_sec = parse_time_to_seconds(start_time)
    end_sec = parse_time_to_seconds(end_time)
    clip_duration = end_sec - start_sec

    if clip_duration <= 0:
        logger.error("유효하지 않은 클립 구간입니다.")
        return None

    if target_file.exists() and target_file.stat().st_size > 10000:
        logger.info(f"클립 파일이 이미 존재합니다: {target_file}")
        return target_file

    import yt_dlp

    # 플레이리스트 방지 및 URL 정규화
    normalized_url = url.split('&list=')[0].split('?list=')[0]
    section_ranges = f"*{start_sec}-{end_sec}"

    ffmpeg_dir = str(Path(FFMPEG_PATH).parent)
    if ffmpeg_dir not in os.environ.get("PATH", ""):
        os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")

    # 캐시된 URL 재사용 (빠른 다운로드)
    cache_dir = OUTPUTS_DIR / "cache"
    if cache_dir.exists():
        for c_file in cache_dir.glob("*.json"):
            try:
                import json
                c_d = json.loads(c_file.read_text(encoding="utf-8"))
                meta = c_d.get("metadata", {})
                if meta.get("youtube_url") == normalized_url or \
                   meta.get("youtube_url") == url or \
                   extract_video_id(meta.get("youtube_url", "")) == extract_video_id(normalized_url):
                    
                    if "cached_video_path" in meta and meta["cached_video_path"]:
                        base_path = Path(meta["cached_video_path"])
                        if base_path.exists():
                            logger.info(f"캐시된 원본 영상 발견, 크롭만 진행: {base_path.name}")
                            cmd = [
                                FFMPEG_PATH, "-y",
                                "-ss", str(start_sec),
                                "-i", str(base_path),
                                "-t", str(clip_duration),
                                "-c:v", "copy", "-c:a", "copy",
                                str(target_file)
                            ]
                            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                            if res.returncode == 0 and target_file.exists():
                                return target_file
                    break
            except Exception:
                continue

    import uuid
    sticky_session_id = uuid.uuid4().hex[:8]
    proxy_url = get_youtube_proxy(sticky_session_id)

    format_spec = (
        'bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/'
        'bestvideo[height<=1080]+bestaudio/'
        'best[height<=1080]/'
        'best'
    )

    # ─────────────────────────────────────────────────────────────
    # [1차 시도]: yt-dlp 최신 네이티브 download_ranges 구간 다운로드 + faststart
    # (외부 다운로더 충돌 없이 yt-dlp의 고유 DASH 세그먼트 구간 요청과 FFmpeg 머지)
    # ─────────────────────────────────────────────────────────────
    try:
        try:
            from yt_dlp.utils import download_range_func
            range_opt = download_range_func(None, [(start_sec, end_sec)])
        except Exception:
            def range_opt(info_dict, ydl_instance=None):
                return [{'start_time': start_sec, 'end_time': end_sec}]

        outtmpl_pattern = str(target_file.with_suffix('')) + '.%(ext)s'
        opts_native = {
            'format': format_spec,
            'merge_output_format': 'mp4',
            'outtmpl': outtmpl_pattern,
            'download_ranges': range_opt,
            'postprocessor_args': {'ffmpeg': ['-movflags', '+faststart']},
            'ffmpeg_location': ffmpeg_dir,
            'remote_components': ['ejs:github'],
            'socket_timeout': 30,
            'retries': 3,
            'quiet': True,
            'no_warnings': True,
        }
        apply_youtube_proxy(opts_native, sticky_session_id)

        logger.info(f"⚡ [1차 yt-dlp 네이티브 구간 다운로드 시작] 구간: {start_sec}s ~ {end_sec}s")
        with yt_dlp.YoutubeDL(opts_native) as ydl:
            ydl.download([normalized_url])

        # 다운로드 결과 확인 및 형식 검증
        if not target_file.exists() or not is_valid_video_file(target_file):
            for cand in target_file.parent.glob(f"{target_file.stem}*"):
                if cand != target_file and cand.suffix.lower() in ['.mp4', '.mkv', '.webm']:
                    if cand.stat().st_size > 30000:
                        fix_cmd = [
                            FFMPEG_PATH, "-y",
                            "-i", str(cand),
                            "-c:v", "libx264", "-preset", "ultrafast", "-crf", "22",
                            "-c:a", "aac", "-b:a", "128k",
                            "-movflags", "+faststart",
                            str(target_file)
                        ]
                        subprocess.run(fix_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=25)
                        try: cand.unlink()
                        except: pass
                        break

        if is_valid_video_file(target_file):
            file_size_mb = target_file.stat().st_size / (1024 * 1024)
            logger.info(f"✅ [1차 구간 다운로드 성공] {target_file.name} ({file_size_mb:.2f} MB)")
            return target_file
        else:
            if target_file.exists():
                try: target_file.unlink()
                except: pass
            logger.warning("1차 네이티브 구간 다운로드 검증 실패 -> 2차 FFmpeg 스트림 Seek 시도")
    except Exception as e1:
        logger.warning(f"⚠️ 1차 다운로드 실패: {e1} -> 2차 스트림 Seek 시도")
        if target_file.exists():
            try: target_file.unlink()
            except: pass

    # ─────────────────────────────────────────────────────────────
    # [2차 시도]: yt-dlp 스트림 URL 추출 -> FFmpeg HTTP Range 프록시 Seek
    # ─────────────────────────────────────────────────────────────
    try:
        opts_extract = {
            'format': format_spec,
            'quiet': True,
            'no_warnings': True,
            'remote_components': ['ejs:github'],
            'socket_timeout': 20,
        }
        apply_youtube_proxy(opts_extract, sticky_session_id)

        with yt_dlp.YoutubeDL(opts_extract) as ydl:
            info = ydl.extract_info(normalized_url, download=False)

        req_formats = info.get('requested_formats') or [info]
        video_fmt = next((f for f in req_formats if f.get('vcodec') != 'none'), None)
        audio_fmt = next((f for f in req_formats if f.get('acodec') != 'none'), None)

        if video_fmt and video_fmt.get('url'):
            cmd = [FFMPEG_PATH, "-y"]
            env = os.environ.copy()
            if proxy_url:
                env["http_proxy"] = proxy_url
                env["https_proxy"] = proxy_url

            http_headers = info.get('http_headers', {})
            headers_arg = "".join(f"{k}: {v}\r\n" for k, v in http_headers.items()) if http_headers else ""

            # 비디오 입력 스트림 (-ss와 -t를 -i 앞에 배치하여 HTTP Range 즉시 점프)
            cmd.extend(["-ss", str(start_sec), "-t", str(clip_duration)])
            if proxy_url:
                cmd.extend(["-http_proxy", proxy_url])
            if headers_arg:
                cmd.extend(["-headers", headers_arg])
            cmd.extend(["-i", video_fmt['url']])

            # 오디오 입력 스트림
            if audio_fmt and audio_fmt.get('url') and audio_fmt['url'] != video_fmt['url']:
                cmd.extend(["-ss", str(start_sec), "-t", str(clip_duration)])
                if proxy_url:
                    cmd.extend(["-http_proxy", proxy_url])
                if headers_arg:
                    cmd.extend(["-headers", headers_arg])
                cmd.extend(["-i", audio_fmt['url']])

            cmd.extend([
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-crf", "22",
                "-c:a", "aac",
                "-b:a", "128k",
                "-movflags", "+faststart",
                str(target_file)
            ])

            logger.info(f"⚡ [2차 FFmpeg 직접 Seek 실행] 구간: {start_sec:.1f}s ~ {end_sec:.1f}s")
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=45, env=env)
            if res.returncode == 0 and is_valid_video_file(target_file):
                file_size_mb = target_file.stat().st_size / (1024 * 1024)
                logger.info(f"✅ [2차 FFmpeg 직접 Seek 성공] 검증 완료: {target_file.name} ({file_size_mb:.2f} MB)")
                return target_file
            else:
                if target_file.exists():
                    try: target_file.unlink()
                    except: pass
                err_msg = res.stderr.decode("utf-8", errors="replace") if res.stderr else "검증 실패"
                logger.warning(f"2차 FFmpeg Seek 실패: {err_msg[-300:]}")
    except Exception as e2:
        logger.warning(f"⚠️ 2차 FFmpeg Seek 시도 실패: {e2}")
        if target_file.exists():
            try: target_file.unlink()
            except: pass

    # ─────────────────────────────────────────────────────────────
    # [3차 시도 (최후의 보루)]: 단일 프로그레시브 360p(포맷 18) 또는 대체 스트림 취득
    # ─────────────────────────────────────────────────────────────
    try:
        opts_p = {
            'format': '18/best[height<=480]/best',
            'quiet': True,
            'no_warnings': True,
            'socket_timeout': 25,
        }
        apply_youtube_proxy(opts_p, sticky_session_id)
        with yt_dlp.YoutubeDL(opts_p) as ydl:
            info_p = ydl.extract_info(normalized_url, download=False)
        p_url = info_p.get('url')
        if p_url:
            p_cmd = [
                FFMPEG_PATH, "-y",
                "-ss", str(start_sec),
                "-t", str(clip_duration),
            ]
            if proxy_url:
                p_cmd.extend(["-http_proxy", proxy_url])
            p_cmd.extend([
                "-i", p_url,
                "-c:v", "libx264", "-preset", "ultrafast", "-crf", "22",
                "-c:a", "aac", "-b:a", "128k",
                "-movflags", "+faststart",
                str(target_file)
            ])
            env = os.environ.copy()
            if proxy_url:
                env["http_proxy"] = proxy_url
                env["https_proxy"] = proxy_url
            subprocess.run(p_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=45, env=env)
            if is_valid_video_file(target_file):
                file_size_mb = target_file.stat().st_size / (1024 * 1024)
                logger.info(f"✅ [3차 최후 프로그레시브 성공] {target_file.name} ({file_size_mb:.2f} MB)")
                return target_file
    except Exception as e3:
        logger.error(f"❌ 3차 최후 폴백 실패: {e3}")

    raise RuntimeError("유튜브 클립 추출 완전 실패 (3차 시도 모두 moov atom 결함 또는 네트워크 오류 발생)")

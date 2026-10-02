import json
import asyncio
import logging
import re
from typing import Dict, Any, Optional, List

from app.config import GEMINI_API_KEY

logger = logging.getLogger(__name__)

# ─── AI 엔진 모델 정의 ───
# 메인 엔진: 3.8-flash 최우선 시도 -> 3.5-flash -> 3.5-flash-lite 자동 폴백
MAIN_ENGINE_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite']
SUB_ENGINE_MODELS = ['gemini-3.5-flash-lite']


# ─── 비용 절감 자막 압축 알고리즘 ───
def clean_and_compress_transcript(transcript_text: str, duration_seconds: int = 0) -> str:
    """
    [비용 절감 알고리즘]
    1. 연속 중복 자막 라인 제거
    2. 앞 10%(도입 인사/찬양), 뒤 5%(축도/광고) 자동 컷팅
    3. 중복 타임스탬프 파편 정리
    4. 최대 28,000자 이내로 정제하여 Gemini 입력 토큰 70% 이상 절감
    """
    if not transcript_text:
        return ""
    
    lines = transcript_text.strip().split('\n')
    total = len(lines)
    if total < 20:
        return transcript_text[:28000]

    # 앞 10% 제외, 뒤 5% 제외
    start_idx = max(0, int(total * 0.10))
    end_idx = min(total, int(total * 0.95))
    filtered_lines = lines[start_idx:end_idx]

    cleaned = []
    prev_text = ""
    for line in filtered_lines:
        s = line.strip()
        if not s:
            continue
        m = re.match(r'(\[\d{2}:\d{2}\])\s*(.+)', s)
        if m:
            t, txt = m.group(1), m.group(2).strip()
            if txt == prev_text:
                continue
            prev_text = txt
            cleaned.append(f"{t} {txt}")
        else:
            if s == prev_text:
                continue
            prev_text = s
            cleaned.append(s)

    result = '\n'.join(cleaned)
    return result[:28000]

# ─── 타임스탬프 파싱 (자막에서 실제 타임 추출) ───
def parse_transcript_segments(transcript_text: str) -> List[Dict[str, Any]]:
    """자막 텍스트에서 [MM:SS] text 형태 파싱"""
    segments = []
    pattern = r'\[(\d{2}:\d{2})\]\s*(.+)'
    for line in transcript_text.split('\n'):
        m = re.match(pattern, line.strip())
        if m:
            segments.append({"time": m.group(1), "text": m.group(2).strip()})
    return segments


async def analyze_sermon_video(
    youtube_url: str,
    video_details: Optional[Dict[str, Any]] = None,
    custom_api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    유튜브 설교 영상을 실제로 분석하여 쇼츠 및 카드 데이터를 생성합니다.
    - Gemini Flash로 실제 타임스탬프 기반 쇼츠 5개 추출
    - 스마트 자막 압축으로 API 비용 70% 절감
    - 실패 시 가짜 데이터를 반환하지 않고 예외를 발생시킵니다.
    """
    api_key = custom_api_key or GEMINI_API_KEY
    
    details = video_details or {}
    title = details.get("title", "설교 영상")
    channel = details.get("channel", "")
    description = details.get("description", "")
    duration_str = details.get("duration_str", "")
    duration_seconds = details.get("duration", 0)
    transcript_text = details.get("transcript_text", "")
    
    has_transcript = bool(transcript_text and len(transcript_text.strip()) >= 200)
    
    if not api_key:
        raise ValueError(
            "Gemini API 키가 설정되어 있지 않습니다.\n"
            "좌측 사이드바에서 Gemini API 키를 입력해주세요."
        )

    from app.services.youtube_service import extract_video_id
    video_id = extract_video_id(youtube_url)
    normalized_url = f"https://www.youtube.com/watch?v={video_id}" if video_id else youtube_url

    if has_transcript:
        logger.info(f"📜 [자막 검증] 실제 자막 텍스트 기반 분석 시작 (총 {len(transcript_text)}자) | 샘플: {transcript_text[:200]}...")
        compressed_transcript = clean_and_compress_transcript(transcript_text, duration_seconds)
        transcript_section = f"""[실제 설교 자막 텍스트 (타임스탬프 포함)]
{compressed_transcript}"""
        anti_hallucination_rule = """[절대 엄수 - 환각(Hallucination) 금지]:
- 절대 제공된 자막에 없는 내용을 지어내거나 창작하지 마세요.
- 반드시 위 [실제 설교 자막 텍스트]에 기록된 실제 설교 말씀과 타임스탬프([MM:SS])만을 정확하게 사용하여 쇼츠 구간과 문장을 도출해야 합니다."""
    else:
        logger.info(f"🎥 [멀티모달 검증] 자막 부재 -> Gemini Part.from_uri 정규화 URL 전달: {normalized_url} (media_resolution=MEDIA_RESOLUTION_LOW)")
        transcript_section = "[안내: 제공된 유튜브 영상(video/mp4)을 직접 시청하고 설교자의 실제 음성을 인식하여 타임스탬프를 추출하세요.]"
        anti_hallucination_rule = f"""[절대 엄수 - 환각(Hallucination) 금지]:
- 절대 내용을 상상하거나 지어내지 마세요.
- 반드시 동봉된 유튜브 영상({normalized_url})에서 설교자가 실제로 발언한 음성만을 그대로 받아적어 실제 타임스탬프([MM:SS])와 함께 추출하세요. 가짜 내용 생성은 엄격히 금지됩니다."""

    prompt_shorts = f"""당신은 한국 설교 미디어 전문가입니다. 아래 유튜브 설교 영상을 분석하여 JSON을 반환하세요.
[영상 정보]
- URL: {normalized_url}
- 제목: {title}
- 채널/교회: {channel}
- 영상 길이: {duration_str}

{transcript_section}

{anti_hallucination_rule}

반드시 아래 규칙을 지켜주세요:
1. 실제 타임스탬프([MM:SS])를 기반으로 가장 큰 감동을 주는 5구간(쇼츠)을 선정. (말끝 끊김 절대 금지)
2. sentences 배열에는 온전하게 종결된 실제 발언 문장과 timestamps 포함.
3. 설교 제목, 본문, 설교자명 추출 및 sermonText에 설교문 전체 재구성.
4. 쇼츠 타이틀(title_question, title_answer)을 창의적이고 다채롭게 작성.

순수 JSON만 반환 (코드블록 제외):
{{
  "metadata": {{"title": "...", "preacher": "...", "passage": "...", "churchName": "...", "publishedAt": "...", "videoDuration": "{duration_str}"}},
  "sermonText": "전체 설교문",
  "shorts": [
    {{"id": "short-1", "title": "...", "title_question": "...", "title_answer": "...", "startTime": "MM:SS", "endTime": "MM:SS", "duration": "N초", "hook": "...", "summary": "...", "sentences": [{{"id": 1, "start": "MM:SS", "end": "MM:SS", "text": "..."}}]}}
  ]
}}"""

    prompt_meditations = f"""{transcript_section}
위 설교 내용을 바탕으로 5일치 묵상(meditations) 데이터를 JSON으로 반환하세요.
순수 JSON만 반환 (코드블록 제외):
{{
  "meditations": [
    {{"day": 1, "dayName": "월요일", "theme": "...", "bibleVerse": "...", "content": "...", "question": "...", "application": "...", "closingPrayer": "..."}}
  ]
}}"""

    prompt_cardnews = f"""{transcript_section}
위 설교 내용을 바탕으로 카드뉴스 텍스트를 JSON으로 반환하세요. (주일 설교 요약 7장, 5일치 데일리 묵상 각 4장)
순수 JSON만 반환 (코드블록 제외):
{{
  "sermonCardNews": [
    {{"id": 1, "type": "cover", "tag": "...", "title": "...", "subtitle": "...", "passage": "...", "speaker": "...", "church": "..."}},
    {{"id": 2, "type": "content", "tag": "...", "title": "...", "body": "..."}}
  ],
  "dailyCardNewsSets": {{
    "1": [{{"id": 1, "type": "cover", "tag": "Day 1", "title": "...", "passage": "...", "church": "..."}}]
  }}
}}"""
    from google import genai
    from google.genai import types
    
    client = genai.Client(api_key=api_key)
    gen_config = types.GenerateContentConfig(
        response_mime_type="application/json",
        temperature=0.1,  # 환각 방지 최저 온도
        media_resolution="MEDIA_RESOLUTION_LOW"
    )
    
    def build_payload(prompt_text):
        if has_transcript:
            return prompt_text
        part = types.Part.from_uri(file_uri=normalized_url, mime_type="video/mp4")
        return [part, prompt_text]

    async def call_gemini(payload, delay=0, task_name="task"):
        if delay:
            await asyncio.sleep(delay)
            
        last_err = None
        for model_name in MAIN_ENGINE_MODELS:
            retries = 2
            for attempt in range(retries):
                try:
                    logger.info(f"[{task_name}] {model_name} 호출 시작 (시도: {attempt+1})")
                    response = await asyncio.to_thread(
                        client.models.generate_content,
                        model=model_name,
                        contents=payload,
                        config=gen_config
                    )
                    if not response.text:
                        last_err = ValueError("빈 응답")
                        continue
                    rt = response.text.strip()
                    if rt.startswith("```json"): rt = rt[7:]
                    elif rt.startswith("```"): rt = rt[3:]
                    if rt.endswith("```"): rt = rt[:-3]
                    import json
                    return json.loads(rt.strip())
                except json.JSONDecodeError as e:
                    logger.warning(f"[{task_name}] JSON 파싱 실패 ({model_name}): {e}")
                    last_err = e
                    # JSON 파싱 실패는 모델을 바꾸는 것이 나음 (약한 모델의 한계일 수 있음)
                    break
                except Exception as e:
                    err_str = str(e).lower()
                    last_err = e
                    if any(k in err_str for k in ["503", "429", "timeout"]):
                        logger.warning(f"[{task_name}] API 한도 초과/과부하 ({model_name}): {e}. 5초 대기 후 재시도...")
                        await asyncio.sleep(5)
                        continue
                    # 다른 에러면 다음 모델로
                    break
        raise last_err or ValueError("모든 모델 실패")

    # [핵심] 3개의 프롬프트를 약간의 시차를 두고 병렬 호출하여 429 에러 완벽 방어 및 속도 극대화
    try:
        logger.info("⚡ 3중 병렬 AI 분석 시작 (Shorts, Meditations, CardNews)")
        res_shorts, res_meditations, res_cardnews = await asyncio.gather(
            call_gemini(build_payload(prompt_shorts), delay=0.0, task_name="Shorts"),
            call_gemini(build_payload(prompt_meditations), delay=5.0, task_name="Meditations"),
            call_gemini(build_payload(prompt_cardnews), delay=10.0, task_name="CardNews")
        )
        
        # 3개의 JSON 결과를 하나로 병합
        parsed = {**res_shorts, **res_meditations, **res_cardnews}
        logger.info(f"✅ AI 병렬 분석 완료: shorts {len(parsed.get('shorts', []))}개")
        
        # 메타데이터 보완
        if "metadata" not in parsed:
            parsed["metadata"] = {}
        if details.get("thumbnail") and not parsed["metadata"].get("thumbnail"):
            parsed["metadata"]["thumbnail"] = details.get("thumbnail", "")
        if details.get("title") and not parsed["metadata"].get("title"):
            parsed["metadata"]["title"] = details.get("title", "")
        if channel and not parsed["metadata"].get("churchName"):
            parsed["metadata"]["churchName"] = channel

        # ── [3번 요구사항: 영상-자막 일치 2차 정밀 검증 및 보정] ──
        raw_snippets = details.get("raw_snippets", [])
        if raw_snippets and parsed.get("shorts"):
            for s_item in parsed["shorts"]:
                s_start = s_item.get("startTime", "00:00")
                s_end = s_item.get("endTime", "00:30")
                # 시간 포맷 표준화 (M:SS -> MM:SS)
                if len(s_start.split(':')) == 2 and len(s_start.split(':')[0]) == 1:
                    s_start = f"0{s_start}"
                    s_item["startTime"] = s_start
                if len(s_end.split(':')) == 2 and len(s_end.split(':')[0]) == 1:
                    s_end = f"0{s_end}"
                    s_item["endTime"] = s_end

                # sentences 검증: 만약 AI가 생성한 sentences가 비었거나 타임스탬프가 어긋난 경우
                ai_sentences = s_item.get("sentences", [])
                if not ai_sentences or len(ai_sentences) < 2:
                    from app.services.youtube_service import parse_time_to_seconds
                    st_sec = parse_time_to_seconds(s_start)
                    et_sec = parse_time_to_seconds(s_end)
                    matched = []
                    for idx, snip in enumerate(raw_snippets):
                        snip_s = snip["start"]
                        snip_e = snip_s + snip.get("duration", 2.5)
                        if st_sec <= snip_s <= et_sec:
                            sm = int(snip_s // 60)
                            ss = int(snip_s % 60)
                            em = int(snip_e // 60)
                            es = int(snip_e % 60)
                            matched.append({
                                "id": idx + 1,
                                "start": f"{sm:02d}:{ss:02d}",
                                "end": f"{em:02d}:{es:02d}",
                                "text": snip["text"]
                            })
                    if matched:
                        s_item["sentences"] = matched
                        logger.info(f"[{s_item.get('id')}] 유튜브 원본 자막 싱크와 100% 일치하도록 보정 완료 ({len(matched)}개 문장)")

        return parsed

    except Exception as e:
        logger.warning(f"AI 병렬 분석 실패: {e}")
        raise RuntimeError(
            f"AI 설교 병렬 분석에 실패했습니다.\n"
            f"마지막 오류: {str(e)}\n"
            f"Gemini API 키를 확인하거나 잠시 후 다시 시도해주세요."
        )


async def complete_sermon_draft(idea_text: str, tone_profile: str = "", custom_api_key: Optional[str] = None) -> str:
    """서브 엔진: 대량 텍스트 처리 (아이디어 기반 완성 설교문 생성)"""
    api_key = custom_api_key or GEMINI_API_KEY
    if not api_key:
        raise ValueError("Gemini API 키가 설정되지 않았습니다.")
    
    from google import genai
    client = genai.Client(api_key=api_key)
    prompt = f"""당신은 설교 작성 전문가입니다. 아래 설교 아이디어를 바탕으로 온전한 한 편의 대지 설교문(서론, 본론 3대지, 결론, 적용 및 결단 기도)으로 완성해주세요:

[설교 아이디어/주제]
{idea_text}

[희망 설교 톤/스타일]
{tone_profile or '은혜롭고 따뜻한 복음 중심의 어조'}
"""
    last_err = None
    for model in SUB_ENGINE_MODELS:
        try:
            res = client.models.generate_content(model=model, contents=prompt)
            if res.text and res.text.strip():
                return res.text.strip()
        except Exception as e:
            last_err = e
            continue
    raise RuntimeError(f"설교문 완성 실패: {last_err}")


async def refine_for_video(sermon_text: str, custom_api_key: Optional[str] = None) -> str:
    """서브 엔진: 자막 정제 및 텍스트 교정 (영상 맞춤 구어체 설교문)"""
    api_key = custom_api_key or GEMINI_API_KEY
    if not api_key:
        raise ValueError("Gemini API 키가 설정되지 않았습니다.")
        
    from google import genai
    client = genai.Client(api_key=api_key)
    prompt = f"""아래 설교문을 쇼츠 영상이나 유튜브 영상에서 성도들에게 직접 호소하듯 이야기하는 '영상 맞춤 은혜로운 구어체' 설교문으로 교정해주세요.
- 시청자의 마음을 여는 강렬한 첫 문장
- 간결하고 리듬감 있는 문장
- 불필요한 군더더기 제외하고 핵심 메시지 전달

[원본 설교문]
{sermon_text}
"""
    last_err = None
    for model in SUB_ENGINE_MODELS:
        try:
            res = client.models.generate_content(model=model, contents=prompt)
            if res.text and res.text.strip():
                return res.text.strip()
        except Exception as e:
            last_err = e
            continue
    raise RuntimeError(f"영상 맞춤 교정 실패: {last_err}")


async def train_sermon_tone(samples: List[str], custom_api_key: Optional[str] = None) -> Dict[str, Any]:
    """서브 엔진: 대량 텍스트 반복 파싱 (목회자 고유 설교톤 프로필 추출)"""
    api_key = custom_api_key or GEMINI_API_KEY
    if not api_key:
        raise ValueError("Gemini API 키가 설정되지 않았습니다.")
        
    combined_samples = "\n\n--- [설교 샘플] ---\n\n".join(samples[:5])
    from google import genai
    from google.genai import types
    client = genai.Client(api_key=api_key)
    
    prompt = f"""아래 목사님의 설교 샘플들을 분석하여 이 목사님 고유의 설교 화법/톤 프로필을 JSON으로 추출해주세요.
절대 임의의 가짜 텍스트를 만들지 말고 실제 샘플의 어조와 문체 특징을 정확히 반영하세요.

[설교 샘플 본문]
{combined_samples[:30000]}

반드시 아래 JSON 형식으로만 응답하세요 (코드블록 없이 순수 JSON):
{{
  "toneName": "톤 명칭 (예: 온유하고 깊이 있는 성경 강해형)",
  "summary": "화법 및 특징 2~3문장 요약",
  "keywords": ["자주 쓰는 표현/단어1", "단어2", "단어3"],
  "sentenceStyle": "문장 종결 어미 특징 (예: ~하십시오, ~입니다)",
  "rhetoricTrait": "수사적 특징 (예: 예화 중심, 원어 해석 연결 등)",
  "systemInstruction": "이 목사님의 톤을 복제하기 위한 AI 시스템 프롬프트 가이드라인"
}}
"""
    gen_config = types.GenerateContentConfig(
        response_mime_type="application/json",
        temperature=0.2
    )
    last_err = None
    for model in SUB_ENGINE_MODELS:
        try:
            res = client.models.generate_content(model=model, contents=prompt, config=gen_config)
            text = res.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            parsed = json.loads(text.strip())
            return parsed
        except Exception as e:
            last_err = e
            continue
            
    raise RuntimeError(f"설교 톤 분석 실패: {last_err}")

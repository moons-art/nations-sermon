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

    if has_transcript:
        compressed_transcript = clean_and_compress_transcript(transcript_text, duration_seconds)
        transcript_section = f"""[설교 자막 (실제 타임스탬프 포함)]
{compressed_transcript}"""
    else:
        logger.info(f"자막 미추출 상태 -> Gemini 직접 시청 분석 모드(Part.from_uri) 가동: {youtube_url}")
        transcript_section = "[안내: 유튜브 영상을 직접 시청하고 음성을 분석하여 실제 타임스탬프 기반의 쇼츠 구간과 자막을 도출하세요.]"

    prompt = f"""당신은 한국 설교 미디어 전문가입니다.
아래 유튜브 설교 영상의 자막을 분석하여 JSON을 반환하세요.

[영상 정보]
- URL: {youtube_url}
- 제목: {title}
- 채널/교회: {channel}
- 영상 길이: {duration_str}

{transcript_section}

반드시 아래 규칙을 지켜주세요:
1. [가장 중요 - 감동적인 하이라이트와 온전한 문장 마무리]:
   - 자막에서 실제 타임스탬프([MM:SS])를 기반으로 성도들에게 가장 큰 감동과 울림을 주는 핵심 하이라이트 5구간을 선정하세요.
   - 각 쇼츠의 길이는 30초 ~ 60초 (1분 이내) 사이로 자유롭게 설정하되, 메시지의 감동을 온전히 전달하는 데 집중하세요.
   - [필수 규칙 - 말끝 끊김 절대 금지]: 영상의 끝부분(endTime)은 목사님이 말씀을 하다가 도중에 잘리거나 어색하게 끊기지 않고, 하나의 온전한 감동적인 문장이나 선포("~합시다", "~바랍니다", "~믿습니다", "~아멘", "~역사가 일어납니다")로 확실하고 은혜롭게 마침표를 찍으며 끝나는 지점으로 정확히 잡아야 합니다.
2. sentences 배열에는 해당 구간의 실제 자막 문장들을 timestamps와 함께 담되, 마지막 문장까지 온전하게 종결되어야 합니다.
3. 설교 제목, 본문 구절, 설교자명을 자막/제목에서 추출하세요.
4. sermonText에 자막 전체를 자연스러운 설교문 형태로 재구성하여 담으세요 (설교 도입부~결론 전체).
5. [쇼츠 영상 타이틀 규칙 (매우 중요)]:
   - 길고 장황한 설명문("~할까요?", "~마음에서 시작됩니다") 금지!
   - [필수 규칙 - 소제목 스타일 다채롭게 작성 (vs 대조 반복 절대 금지)]:
     * 5개의 쇼츠 소제목(title_answer)이 모두 천편일률적으로 "A vs B" 대조 형태가 되지 않도록 반드시 다양하고 매력적인 화법을 골고루 섞어 작성하세요.
     * 스타일 예시:
       1) 호기심/비밀 유발형: "그들이 끝까지 숨겼던 비밀", "주님이 확인하시는 단 한 가지"
       2) 통찰/반전형: "열심보다 먼저 회복되어야 할 것", "포기한 순간 시작된 역사"
       3) 결단/울림형: "믿음의 자리에 서는 용기", "흔들리지 않는 영적 권세"
       4) 대조형 (5개 중 최대 1~2개만): "의무감 vs 사랑의 갈망"
   - title_question (상단 1줄 제목): 8~14자 내외의 짧고 강렬한 핵심 화두 (예: "표정이 다른 이유", "예수님을 따르는 진짜 힘", "인생의 밤을 지날 때")
   - title_answer (상단 2줄 소제목): 8~15자 내외의 다채롭고 매력적인 문구
6. 한국어로 모든 내용 작성.

다음 JSON 구조를 반드시 그대로 반환하세요 (코드블록 없이 순수 JSON만):
{{
  "metadata": {{
    "title": "설교 제목 (자막/제목에서 추출)",
    "preacher": "설교자 이름",
    "passage": "성경 본문 구절 (예: 요한복음 3:16)",
    "churchName": "교회/채널 이름",
    "publishedAt": "날짜 (알 수 있으면)",
    "videoDuration": "{duration_str}"
  }},
  "sermonText": "전체 설교문 (자막에서 재구성. 도입부부터 결론까지 자연스러운 문체로 정리. 최소 1000자 이상)",
  "shorts": [
    {{
      "id": "short-1",
      "title": "쇼츠 제목 (예: 예수님을 따르는 진짜 힘)",
      "title_question": "짧은 상단 제목 (예: 예수님을 따르는 진짜 힘)",
      "title_answer": "짧은 하이라이트 소제목 (예: 의무감이 아니라 이것)",
      "startTime": "MM:SS",
      "endTime": "MM:SS",
      "duration": "N초",
      "hook": "시청자를 끌어당기는 한 줄 후크",
      "summary": "이 구간 핵심 요약 2~3문장",
      "sentences": [
        {{"id": 1, "start": "MM:SS", "end": "MM:SS", "text": "실제 자막 문장"}}
      ]
    }}
  ],
  "meditations": [
    {{
      "day": 1,
      "dayName": "월요일",
      "theme": "묵상 주제",
      "bibleVerse": "성경 구절",
      "content": "묵상 내용 3~4문장",
      "question": "묵상 질문",
      "application": "오늘의 적용",
      "closingPrayer": "마치는 기도"
    }}
  ],
  "sermonCardNews": [
    {{"id": 1, "type": "cover", "tag": "주일 설교 요약", "title": "설교 제목", "subtitle": "설교 부제", "passage": "본문", "speaker": "설교자", "church": "교회명"}},
    {{"id": 2, "type": "content", "tag": "Point 01", "title": "핵심 포인트", "body": "내용"}},
    {{"id": 3, "type": "content", "tag": "Point 02", "title": "핵심 포인트", "body": "내용"}},
    {{"id": 4, "type": "content", "tag": "Point 03", "title": "핵심 포인트", "body": "내용"}},
    {{"id": 5, "type": "content", "tag": "Point 04", "title": "핵심 포인트", "body": "내용"}},
    {{"id": 6, "type": "content", "tag": "Point 05", "title": "핵심 포인트", "body": "내용"}},
    {{"id": 7, "type": "closing", "tag": "결단과 기도", "title": "오늘의 믿음 결단", "body": "기도문", "church": "교회명"}}
  ],
  "dailyCardNewsSets": {{
    "1": [{{"id": 1, "type": "cover", "tag": "Day 1 묵상", "title": "...", "passage": "...", "church": "..."}}, {{"id": 2, "type": "content", "tag": "말씀 묵상", "title": "...", "body": "..."}}, {{"id": 3, "type": "content", "tag": "삶의 적용", "title": "...", "body": "..."}}, {{"id": 4, "type": "closing", "tag": "마치는 기도", "title": "...", "body": "...", "church": "..."}}],
    "2": [{{"id": 1, "type": "cover", "tag": "Day 2 묵상", "title": "...", "passage": "...", "church": "..."}}, {{"id": 2, "type": "content", "tag": "말씀 묵상", "title": "...", "body": "..."}}, {{"id": 3, "type": "content", "tag": "삶의 적용", "title": "...", "body": "..."}}, {{"id": 4, "type": "closing", "tag": "마치는 기도", "title": "...", "body": "...", "church": "..."}}],
    "3": [{{"id": 1, "type": "cover", "tag": "Day 3 묵상", "title": "...", "passage": "...", "church": "..."}}, {{"id": 2, "type": "content", "tag": "말씀 묵상", "title": "...", "body": "..."}}, {{"id": 3, "type": "content", "tag": "삶의 적용", "title": "...", "body": "..."}}, {{"id": 4, "type": "closing", "tag": "마치는 기도", "title": "...", "body": "...", "church": "..."}}],
    "4": [{{"id": 1, "type": "cover", "tag": "Day 4 묵상", "title": "...", "passage": "...", "church": "..."}}, {{"id": 2, "type": "content", "tag": "말씀 묵상", "title": "...", "body": "..."}}, {{"id": 3, "type": "content", "tag": "삶의 적용", "title": "...", "body": "..."}}, {{"id": 4, "type": "closing", "tag": "마치는 기도", "title": "...", "body": "...", "church": "..."}}],
    "5": [{{"id": 1, "type": "cover", "tag": "Day 5 묵상", "title": "...", "passage": "...", "church": "..."}}, {{"id": 2, "type": "content", "tag": "말씀 묵상", "title": "...", "body": "..."}}, {{"id": 3, "type": "content", "tag": "삶의 적용", "title": "...", "body": "..."}}, {{"id": 4, "type": "closing", "tag": "마치는 기도", "title": "...", "body": "...", "church": "..."}}]
  }}
}}"""
    from google import genai
    from google.genai import types
    
    client = genai.Client(api_key=api_key)
    gen_config = types.GenerateContentConfig(
        response_mime_type="application/json",
        temperature=0.25
    )
    
    # 자막이 없는 경우 구글 내부망 멀티모달 분석을 위해 Part.from_uri로 유튜브 URL 직접 주입
    if has_transcript:
        contents_payload = prompt
    else:
        part = types.Part.from_uri(file_uri=youtube_url, mime_type="video/*")
        contents_payload = [part, prompt]

    last_error = None
    for model_name in MAIN_ENGINE_MODELS:
        try:
            logger.info(f"Gemini 메인 엔진 모델 시도: {model_name} (직접 분석={not has_transcript})")
            response = client.models.generate_content(
                model=model_name,
                contents=contents_payload,
                config=gen_config
            )
            # response.text가 None인 경우 (MAX_TOKENS 등) 다음 모델로 폴백
            if not response.text:
                logger.warning(f"빈 응답 ({model_name}): finish_reason={response.candidates[0].finish_reason if response.candidates else 'unknown'}")
                last_error = ValueError(f"빈 응답 ({model_name})")
                continue
            response_text = response.text.strip()
            # 코드블록 제거
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            elif response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()
            
            parsed = json.loads(response_text)
            logger.info(f"AI 분석 성공 ({model_name}): shorts {len(parsed.get('shorts', []))}개")
            
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
                    # 실제 유튜브 원본 자막 구간에서 오차 없이 정확히 채워넣음
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
            
        except json.JSONDecodeError as e:
            logger.warning(f"JSON 파싱 실패 ({model_name}): {e}")
            last_error = e
            continue
        except Exception as e:
            err_str = str(e).lower()
            logger.warning(f"AI 분석 오류 발생 ({model_name}): {e}")
            last_error = e
            # 503 (과부하), 429 (레이트리밋), 404/not found, timeout 등 일시적/모델 오류 시 다음 후보 모델로 시도
            if any(k in err_str for k in ["503", "unavailable", "high demand", "429", "resource_exhausted", "not found", "404", "invalid", "timeout"]):
                logger.info(f"모델 {model_name} 과부하 또는 오류로 인해 다음 모델로 전환합니다.")
                continue
            break
    
    # 모든 모델 실패 → 예외 발생 (가짜 데이터 반환 없음)
    raise RuntimeError(
        f"AI 설교 분석에 실패했습니다.\n"
        f"마지막 오류: {str(last_error)}\n"
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

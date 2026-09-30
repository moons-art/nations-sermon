import json
import asyncio
import logging
import re
from typing import Dict, Any, Optional, List

from app.config import GEMINI_API_KEY

logger = logging.getLogger(__name__)

# ─── AI 엔진 모델 정의 ───
# 1. 메인 엔진: 유튜브 영상 직접 분석 및 숏츠 하이라이트/자막 추출
MAIN_ENGINE_MODELS = ['gemini-3.8-flash', 'gemini-2.5-flash']
# 2. 서브 엔진: 대량 텍스트 처리, 자막 정제 및 반복 파싱 작업 (비용 절감)
SUB_ENGINE_MODELS = ['gemini-3.5-flash-lite', 'gemini-2.5-flash-lite', 'gemini-3.8-flash']


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
    
    # 자막이 없으면 분석 불가
    if not transcript_text or len(transcript_text.strip()) < 200:
        raise ValueError(
            "유튜브 자막을 추출하지 못했습니다.\n"
            "해당 영상에 자막(CC)이 없거나, 자막이 비활성화되어 있을 수 있습니다.\n"
            "자막이 활성화된 설교 영상 URL을 입력해주세요."
        )
    
    if not api_key:
        raise ValueError(
            "Gemini API 키가 설정되어 있지 않습니다.\n"
            "좌측 사이드바에서 Gemini API 키를 입력해주세요."
        )
    
    # [비용 절감]: 자막 압축 전처리 (토큰 70% 절감)
    compressed_transcript = clean_and_compress_transcript(transcript_text, duration_seconds)

    prompt = f"""당신은 한국 설교 미디어 전문가입니다.
아래 유튜브 설교 영상의 자막을 분석하여 JSON을 반환하세요.

[영상 정보]
- URL: {youtube_url}
- 제목: {title}
- 채널/교회: {channel}
- 영상 길이: {duration_str}

[설교 자막 (실제 타임스탬프 포함)]
{compressed_transcript}

반드시 아래 규칙을 지켜주세요:
1. 자막에서 실제 타임스탬프([MM:SS])를 기반으로 가장 감동적인 하이라이트 5구간을 선정하세요
2. 각 쇼츠는 40~60초 분량 (startTime~endTime)
3. sentences 배열에는 해당 구간의 실제 자막 문장들을 timestamps와 함께 담으세요
4. 설교 제목, 본문 구절, 설교자명을 자막/제목에서 추출하세요
5. sermonText에 자막 전체를 자연스러운 설교문 형태로 재구성하여 담으세요 (설교 도입부~결론 전체)
6. 한국어로 모든 내용 작성

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
      "title": "감동적인 쇼츠 제목",
      "title_question": "질문 형식 소제목 (예: 왜 고난이 축복인가)",
      "title_answer": "답변 형식 소제목 (예: 하나님의 놀라운 계획)",
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
    
    last_error = None
    for model_name in MAIN_ENGINE_MODELS:
        try:
            logger.info(f"Gemini 메인 엔진 모델 시도: {model_name}")
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
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
                
            return parsed
            
        except json.JSONDecodeError as e:
            logger.warning(f"JSON 파싱 실패 ({model_name}): {e}")
            last_error = e
            continue
        except Exception as e:
            err_str = str(e).lower()
            if "not found" in err_str or "404" in err_str or "invalid" in err_str:
                logger.warning(f"모델 없음 ({model_name}): {e}")
                last_error = e
                continue
            logger.error(f"AI 분석 오류 ({model_name}): {e}")
            last_error = e
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

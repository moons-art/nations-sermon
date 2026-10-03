import re

with open("backend/app/services/ai_service.py", "r") as f:
    code = f.read()

# We want to replace the `prompt = ...` all the way to the end of `analyze_sermon_video` (line 326).
# We will use regex or string replace.
marker_start = '    prompt = f"""당신은 한국 설교 미디어 전문가입니다.'
marker_end = '        f"Gemini API 키를 확인하거나 잠시 후 다시 시도해주세요."\n    )'

start_idx = code.find(marker_start)
end_idx = code.find(marker_end) + len(marker_end)

if start_idx == -1 or end_idx == -1:
    print("Could not find markers")
    exit(1)

new_logic = '''    prompt_shorts = f"""당신은 한국 설교 미디어 전문가입니다. 아래 유튜브 설교 영상을 분석하여 JSON을 반환하세요.
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

    async def call_gemini(payload, delay=0):
        if delay:
            await asyncio.sleep(delay)
            
        last_err = None
        for model_name in MAIN_ENGINE_MODELS:
            try:
                # 동기 클라이언트를 스레드풀에서 실행하여 이벤트루프 블로킹 방지
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
            except Exception as e:
                err_str = str(e).lower()
                if any(k in err_str for k in ["503", "429", "timeout"]):
                    await asyncio.sleep(2)
                    continue
                last_err = e
        raise last_err or ValueError("모든 모델 실패")

    # [핵심] 3개의 프롬프트를 약간의 시차를 두고 병렬 호출하여 429 에러 완벽 방어 및 속도 극대화
    try:
        logger.info("⚡ 3중 병렬 AI 분석 시작 (Shorts, Meditations, CardNews)")
        res_shorts, res_meditations, res_cardnews = await asyncio.gather(
            call_gemini(build_payload(prompt_shorts), delay=0.0),
            call_gemini(build_payload(prompt_meditations), delay=1.5),
            call_gemini(build_payload(prompt_cardnews), delay=3.0)
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
            f"AI 설교 병렬 분석에 실패했습니다.\\n"
            f"마지막 오류: {str(e)}\\n"
            f"Gemini API 키를 확인하거나 잠시 후 다시 시도해주세요."
        )'''

new_code = code[:start_idx] + new_logic + code[end_idx:]
with open("backend/app/services/ai_service.py", "w") as f:
    f.write(new_code)
print("Rewrite successful")

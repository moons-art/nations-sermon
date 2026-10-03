import re

with open("backend/app/services/ai_service.py", "r") as f:
    code = f.read()

# Replace call_gemini
old_func = '''    async def call_gemini(payload, delay=0):
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
        raise last_err or ValueError("모든 모델 실패")'''

new_func = '''    async def call_gemini(payload, delay=0, task_name="task"):
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
        raise last_err or ValueError("모든 모델 실패")'''

if old_func in code:
    code = code.replace(old_func, new_func)
    
    # Also update the gather call to pass task_name
    old_gather = '''        res_shorts, res_meditations, res_cardnews = await asyncio.gather(
            call_gemini(build_payload(prompt_shorts), delay=0.0),
            call_gemini(build_payload(prompt_meditations), delay=1.5),
            call_gemini(build_payload(prompt_cardnews), delay=3.0)
        )'''
    new_gather = '''        res_shorts, res_meditations, res_cardnews = await asyncio.gather(
            call_gemini(build_payload(prompt_shorts), delay=0.0, task_name="Shorts"),
            call_gemini(build_payload(prompt_meditations), delay=5.0, task_name="Meditations"),
            call_gemini(build_payload(prompt_cardnews), delay=10.0, task_name="CardNews")
        )'''
    code = code.replace(old_gather, new_gather)

    with open("backend/app/services/ai_service.py", "w") as f:
        f.write(code)
    print("Rewrite successful")
else:
    print("Could not find old_func")

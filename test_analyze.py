import asyncio
import os
import sys
from dotenv import load_dotenv

sys.path.append(os.getcwd() + '/backend')
load_dotenv(os.getcwd() + '/backend/.env')

from app.services.ai_service import analyze_sermon_video
import logging

logging.basicConfig(level=logging.INFO)

async def test():
    details = {
        "title": "Test Title",
        "channel": "Test Channel",
        "description": "Test Desc",
        "duration_str": "10:00",
        "duration": 600,
        "transcript_text": "[00:00] 안녕하세요\n[00:05] 반갑습니다\n" * 50
    }
    try:
        res = await analyze_sermon_video("https://youtube.com/watch?v=123", details)
        print("Success:", list(res.keys()))
    except Exception as e:
        print("Failed:", repr(e))

asyncio.run(test())

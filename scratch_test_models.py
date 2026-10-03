import os
from google import genai
from dotenv import load_dotenv

load_dotenv("frontend/.env")
api_key = os.environ.get("VITE_GEMINI_API_KEY")

client = genai.Client(api_key=api_key)
for m in ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-1.5-flash']:
    try:
        response = client.models.generate_content(
            model=m,
            contents="hello"
        )
        print(f"{m}: Success")
    except Exception as e:
        print(f"{m}: Failed - {e}")

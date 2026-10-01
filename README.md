# 설교 AI (Seolgyo AI)

설교 영상 분석 및 AI 숏츠 렌더링, 묵상글, 카드뉴스 생성 풀스택 애플리케이션입니다.

## 🚀 아키텍처 및 실행 방법

### 1. 백엔드 (FastAPI / Python) - 포트 8000
```bash
cd backend
source .venv/bin/activate  # (Windows는 .venv\Scripts\activate)
python run.py
```
- API 문서: http://localhost:8000/docs

### 2. 프론트엔드 (React / Vite) - 포트 5173
```bash
cd frontend
npm install
npm run dev
```
- 웹 애플리케이션: http://localhost:5173

---

### 💻 윈도우 원클릭 실행
루트의 `start.bat` 파일을 더블클릭하면 백엔드와 프론트엔드가 동시에 실행됩니다.

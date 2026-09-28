# ✝️ 설교 AI (Seolgyo AI) 풀스택 웹 애플리케이션 프로토타입

`seolgyo-ai.com` 서비스를 벤치마킹하여, **유튜브 설교 영상 링크 하나로 쇼츠 영상 6편, 주간 5일치 설교 묵상집, 2종류 인스타 카드뉴스**를 전자동으로 추출·제작·편집·다운로드할 수 있는 올인원 풀스택 미디어 솔루션입니다.

---

## 🌟 핵심 기능 및 아키텍처

### 1. 쇼츠 자동 생성 (탭 1)
- **유튜브 URL 입력 & 설정 폼**: 템플릿(블러 배경 쇼츠 vs 스마트 중앙 크롭), BGM(은혜로운 피아노/기도/소망), 교회 로고 및 교회명(2줄 지원) 설정.
- **AI 하이라이트 6개 추출**: 설교 핵심 메시지를 기반으로 바이럴 잠재력이 높은 쇼츠 후보 6개 자동 추출 (제목, 시작/종료 타임스탬프, 후킹 멘트, 내용 요약, 문장별 자막 세그먼트).
- **'자막 수정' 모달**: 문장별로 타임스탬프와 대사를 확인하며 텍스트 추가, 수정, 삭제 가능.
- **[비용 절감형 순차 렌더링]**: 사용자가 원하는 쇼츠만 체크박스로 골라 요청하면, 백엔드(`asyncio.Queue` 기반 Sequential Worker)에서 서버 과부하를 막기 위해 **1개씩 차례대로(Sequential)** 안전하게 인코딩 처리.
- **[FFmpeg 파이프라인]**:
  - 16:9 가로 비디오를 세련된 9:16 세로 비율로 변환 (상하 블러 배경 + 원본 오버레이)
  - 가독성 높은 ASS 자막 영구 Burn-in 합성 (노란색/화이트 하이라이트 & 아웃라인)
  - **오디오 더킹 (Audio Ducking)**: 목소리가 나올 때 BGM 볼륨이 자동으로 줄어들고, 멘트 사이에 자연스럽게 살아나는 전문가급 사운드 믹싱 적용 (`sidechaincompress` & `amix`).

### 2. 5일치 설교 묵상 (탭 2)
- **주간 묵상집 자동 생성**: 주일 설교를 바탕으로 월~금 5일치 묵상(주제, 성경구절, 본문 묵상, 묵상 질문, 삶의 적용점, 닫는 기도문) 표시.
- **카카오톡 공유용 원클릭 복사**: 단체 카톡방, 문자, 사역 나눔용으로 최적화된 정갈한 텍스트 포맷 복사 지원.

### 3. 2종류 카드뉴스 에디터 (탭 3)
- **[종류 선택 서브탭]**:
  - `설교 전체 카드뉴스 (7장)`: 표지(제목/설교자/본문), 5개 핵심 포인트, 마치는 기도문
  - `일별 묵상 카드뉴스 (월~금 각 4장)`: 각 요일별 묵상 세트 전환 지원
- **[에디터 컨트롤바]**: 5종 배경 프리셋 테마 + 사용자 커스텀 이미지 업로드, 폰트 스타일(명조체 vs 고딕체), 글자 크기, 비율 전환 (9:16 인스타 스토리 vs 4:5 인스타 피드), 2줄 교회명 설정.
- **[슬라이드 뷰어 & 인라인 편집]**: 슬라이드 내부 텍스트를 마우스로 직접 클릭하여 워드프로세서처럼 자유롭게 **인라인(Inline) 수정** 가능.
- **[이미지 다운로드]**: `html2canvas`를 활용하여 현재 슬라이드 1장 다운로드 및 전체 슬라이드 순차 일괄 다운로드 지원.

---

## 🛠️ 기술 스택

| 영역 | 기술 |
|---|---|
| **Frontend** | React (Vite), Tailwind CSS (v4), Lucide Icons, html2canvas |
| **Backend** | Python 3.12, FastAPI, Uvicorn, yt-dlp, asyncio Queue |
| **미디어 처리** | FFmpeg (9:16 크롭, ASS 자막 Burn-in, Sidechain Audio Ducking) |
| **AI 엔진** | Google Gemini API (`google-genai`), 무설치 즉시 체험 가능한 Mock Fallback 엔진 탑재 |

---

## 🚀 빠른 시작 가이드 (로컬 실행)

### 방법 1. 윈도우 원클릭 실행
프로젝트 루트 폴더에서 `start.bat`을 더블 클릭합니다.

### 방법 2. 수동 실행 (터미널 2개 분리)

#### 1) 백엔드 실행 (터미널 1)
```bash
cd backend
python run.py
```
- 백엔드 서버: `http://localhost:8000`
- Swagger API 문서: `http://localhost:8000/docs`

#### 2) 프론트엔드 실행 (터미널 2)
```bash
cd frontend
npm run dev
```
- 브라우저 접속: `http://localhost:5173`

---

## 📂 프로젝트 구조

```
sermon.nations/
├── backend/
│   ├── app/
│   │   ├── config.py              # 경로 및 FFmpeg 자동 탐색 모듈
│   │   ├── main.py                # FastAPI 앱 진입점 및 백그라운드 워커 기동
│   │   ├── routers/
│   │   │   ├── analyze.py         # 유튜브 분석 라우터 (/api/analyze)
│   │   │   ├── render.py          # 순차 렌더링 큐 및 상태 조회 (/api/render/queue, /api/render/jobs)
│   │   │   └── assets.py          # BGM 목록 및 비디오 다운로드 (/api/assets/bgm, /api/outputs/{file})
│   │   └── services/
│   │       ├── ai_service.py      # Gemini API 및 고품질 Mock Fallback 데이터셋
│   │       ├── ffmpeg_service.py  # 9:16 크롭, 자막 번인, 오디오 더킹 믹싱 파이프라인
│   │       ├── render_queue.py    # 비용 절감형 Sequential Worker & asyncio Queue
│   │       └── youtube_service.py # yt-dlp 비디오 클립 추출 및 테스트 소스 생성
│   ├── static/bgm/                # 자동 생성된 로열티 프리 BGM (.mp3)
│   ├── outputs/                   # 렌더링 완료된 세로 쇼츠 비디오 (.mp4)
│   ├── requirements.txt
│   └── run.py
│
├── frontend/
│   ├── src/
│   │   ├── api/client.js          # 백엔드 API 클라이언트
│   │   ├── components/
│   │   │   ├── Navbar.jsx         # 헤더 & Gemini 키 설정 모달
│   │   │   ├── UrlInputBar.jsx    # 유튜브 URL 입력 & AI 분석 바
│   │   │   ├── YoutubeIcon.jsx    # 유튜브 로고 SVG
│   │   │   ├── shorts/
│   │   │   │   ├── ShortsTab.jsx          # 쇼츠 탭 메인
│   │   │   │   ├── HighlightCard.jsx      # 쇼츠 후보 카드
│   │   │   │   ├── SubtitleModal.jsx      # 문장별 자막 수정 모달
│   │   │   │   └── RenderQueueStatus.jsx  # 순차 렌더링 진행 큐 상태바
│   │   │   ├── meditation/
│   │   │   │   ├── MeditationTab.jsx      # 5일치 설교 묵상 탭
│   │   │   │   └── KakaoCopyButton.jsx    # 카카오톡 공유용 포맷팅 복사
│   │   │   └── cardnews/
│   │   │       ├── CardNewsTab.jsx        # 2종류 카드뉴스 에디터 메인
│   │   │       ├── EditorControls.jsx     # 배경/폰트/크기/비율/교회명 컨트롤바
│   │   │       ├── SlideCanvas.jsx        # 인라인 텍스트 편집 캔버스 프리뷰
│   │   │       └── SlideNavigator.jsx     # 슬라이드 네비 & html2canvas 다운로드
│   │   ├── utils/
│   │   │   ├── mockData.js        # 즉시 시연 가능한 설교 목업 데이터셋
│   │   │   └── exportImage.js     # html2canvas 고해상도 캡처 유틸
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── start.bat                      # 원클릭 실행 배치 파일
└── README.md
```

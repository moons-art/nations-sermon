# 🏛️ Sermon AI (Seolgyo AI) System Architecture & Status

> **최종 갱신 일자**: 2026-10-02  
> **핵심 목표**: 무중단 서버리스 숏츠 제작 파이프라인, 프록시(1GB) 과금 방어, Cloud Run OOM/CPU 스로틀링 완전 방어, 브라우저 새로고침/이동 시 영속성 보장.

---

## 1. 시스템 핵심 파이프라인 흐름

```mermaid
sequenceDiagram
    autonumber
    actor User as 사용자 (React Frontend)
    participant Hosting as Firebase Hosting (CDN)
    participant CloudRun as Cloud Run (API: nations-sermon)
    participant Firestore as Google Cloud Firestore
    participant CloudTasks as Cloud Tasks (sermon-worker-queue)
    participant YouTube as YouTube / ThorData Proxy
    participant Gemini as Google Gemini API (Flash)
    participant Storage as Firebase Storage (7-Day TTL)

    User->>Hosting: 1. 유튜브 분석 요청 (POST /api/analyze/start)
    Hosting->>CloudRun: Rewrite 프록시 전달
    CloudRun->>Firestore: task_id 발급 및 상태 'QUEUED' 저장
    CloudRun->>CloudTasks: 작업 디스패치 등록 (/api/worker/analyze)
    CloudRun-->>User: 즉시 task_id 반환 (HTTP 200)

    par 상태 폴링 및 영속화
        User->>User: localStorage에 task_id 저장 (새로고침 복원 보장)
        loop 2초 간격 폴링
            User->>CloudRun: GET /api/analyze/status/{task_id}
            CloudRun->>Firestore: 작업 진행도(%) 및 단계 조회
            CloudRun-->>User: 진행 상태 전달
        end
    and Cloud Tasks 비동기 실행 (속도/동시성 제어)
        CloudTasks->>CloudRun: POST /api/worker/analyze (Rate: 1.0/s, Max Conc: 2)
        CloudRun->>YouTube: 자막 추출 (GCP IP 차단 방지용 프록시 연동, 20~30KB 소모)
        CloudRun->>Gemini: 자막 70% 압축 프롬프트 분석 (gemini-3.8-flash -> 3.5-flash)
        CloudRun->>Firestore: 쇼츠 5구간 & 묵상글 & 카드뉴스 영구 캐시 저장
        CloudRun->>Firestore: task_id 상태 'COMPLETED' 갱신
    end

    User->>User: 분석 완료 데이터 로컬 렌더링 및 보관함 자동 등록
    
    opt 쇼츠 렌더링 요청
        User->>CloudRun: POST /api/render/start
        CloudRun->>CloudTasks: 작업 등록 (/api/worker/render)
        CloudTasks->>CloudRun: 워커 실행 (동시성 1개씩 격리 실행)
        CloudRun->>YouTube: 필요한 30초 구간만 HTTP Range 스트리밍 다운로드 (프록시)
        CloudRun->>CloudRun: FFmpeg 오버레이 렌더링 (자막/타이틀 합성)
        CloudRun->>Storage: 완성된 MP4 업로드 (7일 자동 삭제 룰 적용)
        CloudRun->>CloudRun: finally 블록에서 임시 소스/출력 MP4 100% 삭제 (OOM 차단)
        CloudRun->>Firestore: render_jobs 'COMPLETED' 및 Storage URL 저장
    end
```

---

## 2. 파일별 핵심 역할 및 책임

| 디렉토리 / 파일 | 역할 및 핵심 기능 | 과금 및 안정성 방어 로직 |
| :--- | :--- | :--- |
| `frontend/src/api/client.js` | 백엔드 API 통신 클라이언트 | `/api/analyze/start` 비동기 호출 후 2초 간격 폴링으로 Cloud Run 60초 타임아웃 회피 |
| `frontend/src/App.jsx` | 전역 상태 및 탭/작업 관리 | `localStorage`에 `current_analysis_state`를 동기화하여 **새로고침 시 분석 상태 복원** |
| `backend/app/routers/analyze.py` | 설교 분석 요청 접수 및 조회 | Firestore 영구 캐시 확인 후 Cloud Tasks에 작업 등록 (`/api/worker/analyze`) |
| `backend/app/routers/worker.py` | Cloud Tasks 웹훅 실행 엔드포인트 | 렌더링/분석 실패 시 재시도 제어, **`finally` 블록에서 MP4 즉시 삭제로 OOM 차단** |
| `backend/app/services/youtube_service.py` | 유튜브 메타데이터, 자막, 클립 다운로드 | 자막 추출 시 프록시 적용(0.5초 완료, 수십 KB 소모), 비디오는 30초 구간만 HTTP Range 다운로드 |
| `backend/app/services/ai_service.py` | Gemini 기반 설교 분석 및 하이라이트 추출 | 자막 압축 알고리즘(토큰 70% 절감), `MAIN_ENGINE_MODELS` 체인 폴백, 환각 차단 온도(0.1) |
| `backend/app/services/firestore_service.py` | 영구 데이터베이스 연동 | `analysis_jobs`, `render_jobs`, `analysis_cache` 영구 저장 및 인메모리 의존 탈피 |
| `backend/app/services/storage_service.py` | Firebase Storage 업로드 및 수명주기 관리 | `ensure_7day_lifecycle_rule()` 및 7일 만료 Signed URL 생성 |
| `backend/deploy.sh` | Cloud Run 및 Cloud Tasks 자동 배포 스크립트 | 서비스명 `nations-sermon` 통일, Concurrency=4, 큐 동시성=2, 7일 자동삭제 Lifecycle 등록 |
| `backend/lifecycle.json` | Google Cloud Storage 수명주기 정책 | `shorts/` 프리픽스 파일 7일 경과 시 자동 영구 삭제 규칙 |
| `firebase.json` | Firebase Hosting 설정 | `/api/**` 경로를 Cloud Run 서비스 `nations-sermon`으로 정확히 리라이트 |

---

## 3. 핵심 환경 변수 및 인프라 명세

### 3.1 Cloud Run (`nations-sermon`)
- **Region**: `asia-northeast3` (서울)
- **Memory**: `2Gi` (FFmpeg 실행 시 OOM 방지)
- **CPU**: `2`
- **Concurrency**: `4` (상태 조회 엔드포인트 블로킹 방지 및 인스턴스 효율화)
- **Timeout**: `3600s`

### 3.2 Cloud Tasks (`sermon-worker-queue`)
- **Max Dispatches Per Second**: `1.0`
- **Max Concurrent Dispatches**: `2` (동시 무거운 작업 제어로 메모리 폭증 방지)
- **Max Attempts**: `2` (일시적 네트워크 에러 1회 재시도 후 즉시 종료로 프록시 중복 낭비 방지)

### 3.3 백엔드 필수 환경변수 (`backend/.env`)
```env
GEMINI_API_KEY=AIzaSy...                # Gemini Pay-as-you-go API Key
YOUTUBE_PROXY=http://user:pass@host:port # 주거용 프록시 (ThorData)
GOOGLE_CLOUD_PROJECT=sermon-ym         # GCP 프로젝트 ID
CLOUD_TASKS_LOCATION=asia-northeast3   # Cloud Tasks 리전
CLOUD_TASKS_QUEUE=sermon-worker-queue  # Cloud Tasks 큐 이름
FIREBASE_STORAGE_BUCKET=sermon-ym.appspot.com
WORKER_HOST=https://nations-sermon-...run.app # 배포 시 deploy.sh가 자동 주입
```

---

## 4. 4대 과금 & 오류 방어 원칙 요약
1. **주거용 프록시(1GB) 절약**:
   - 1시간짜리 전체 영상 다운로드 절대 금지.
   - 자막 추출 시에만 가벼운 텍스트(20~30KB) 프록시 사용.
   - 영상 렌더링 시에는 `-ss` HTTP Range로 추출할 30~50초 구간(수 MB)만 정밀 다운로드.
2. **Gemini API 비용 & 토큰 70% 절약**:
   - 동일 유튜브 URL 재요청 시 Firestore 캐시에서 0.001초 만에 즉시 반환 (API 호출 0회).
   - 설교 도입 찬양/인사(10%)와 축도/광고(5%)를 자동 필터링하고 중복 어절을 압축해 28,000자 이내로 정제 후 전송.
3. **Cloud Run OOM(메모리 초과) 방지**:
   - 컨테이너 RAM 2GB 할당 및 Cloud Tasks 동시 처리량 2개 제한.
   - 워커 작업 완료 즉시 `finally` 구문에서 로컬 MP4 파일 강제 삭제.
4. **새로고침 및 세션 유지**:
   - 프론트엔드 `App.jsx`가 작업 `task_id`를 `localStorage`에 즉시 기록하므로 브라우저를 새로고침하거나 창을 닫아도 백그라운드 분석 상태가 그대로 복구됨.
5. **분석 5분 멈춤(Hang) 및 무한 루프 완전 방어**:
   - **자막 추출 yt-dlp 프록시 복구**: Cloud Run IP 차단 시에도 2순위 yt-dlp가 주거용 프록시(20~30KB 소모)로 자막을 100% 정상 수집할 수 있도록 복구하고 10초 타임아웃 부여.
   - **자막 부재 시 즉각 실패 안내 (Fail-Fast)**: 자막이 없는 영상에 대해 1시간짜리 유튜브 URL을 Gemini Part.from_uri로 넘겨 5~10분간 멈추는 행위를 전면 차단하고, 10초 이내에 사용자에게 텍스트 직접 입력 탭 사용을 안내.
   - **Gemini 모델당 75초 비동기 타임아웃**: 동기 SDK 블로킹을 비동기 스레드로 격리하고, 응답 지연 시 75초 내에 다음 순위 모델로 자동 전환.
   - **Cloud Tasks 재시도 지옥 차단**: 영구적 실패(자막 미제공/오류) 시 500 에러를 던져 Cloud Tasks가 5회 이상 반복 실행하는 루프를 차단하고, Firestore에 실패 사유를 보존한 채 즉시 종료.
   - **실시간 단계 안내 및 수동 중단**: 프론트엔드에 실시간 단계(자막 추출 중, AI 분석 중 등)와 언제든 멈출 수 있는 [중단] 버튼 및 명확한 에러 안내 제공.


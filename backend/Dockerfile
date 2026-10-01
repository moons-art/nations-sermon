FROM python:3.12-slim

# 시스템 필수 유틸, FFmpeg, 한국어 폰트, curl, git 및 Node.js 20.x (LTS) 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    fonts-nanum \
    fonts-noto-cjk \
    curl \
    ca-certificates \
    git \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# bgutil-ytdlp-pot-provider 서버 복사 (공식 검증 빌드)
COPY --from=brainicism/bgutil-ytdlp-pot-provider:latest /app /opt/bgutil-provider

# 작업 디렉토리 설정
WORKDIR /app

# 파이썬 의존성 파일 복사 및 설치 (최신 yt-dlp 및 bgutil 플러그인 -U --pre 설치)
COPY requirements.txt .
RUN pip install --no-cache-dir -U --pre yt-dlp[default] bgutil-ytdlp-pot-provider -r requirements.txt

# 애플리케이션 코드 및 정적 에셋, 실행 스크립트 복사
COPY app ./app
COPY static ./static
COPY run.py .
COPY entrypoint.sh .
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh

# 포트 및 환경변수 설정 (Cloud Run 기본 포트 8080)
ENV PORT=8080
ENV PYTHONUNBUFFERED=1

EXPOSE 8080

# 진입점 스크립트 실행 (POT Provider 4416 백그라운드 구동 후 Uvicorn 실행)
ENTRYPOINT ["/app/entrypoint.sh"]

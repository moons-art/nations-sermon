@echo off
chcp 65001 > nul
echo ========================================================
echo   설교 AI (Seolgyo AI) 풀스택 웹 애플리케이션 시작
echo ========================================================
echo.

echo [1/2] FastAPI 백엔드 서버 시작 중 (포트 8000)...
start "Seolgyo AI Backend (FastAPI)" cmd /k "cd backend && python run.py"

echo [2/2] React 프론트엔드 서버 시작 중 (포트 5173)...
start "Seolgyo AI Frontend (Vite)" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo   서비스가 성공적으로 시작되었습니다!
echo   - 프론트엔드: http://localhost:5173
echo   - 백엔드 API: http://localhost:8000/docs
echo ========================================================
pause

@echo off
REM 프론트엔드 + 백엔드를 한 번에 실행하는 스크립트.
REM 더블클릭하거나 "start.bat"으로 실행하면 됩니다.

echo [1/3] 백엔드 서버를 새 창에서 시작합니다 (http://localhost:4000)...
start "Portfolio Backend" cmd /k "cd /d %~dp0backend && npm start"

echo [2/3] 프론트엔드 서버를 새 창에서 시작합니다 (http://localhost:8000)...
start "Portfolio Frontend" cmd /k "cd /d %~dp0frontend && python -m http.server 8000"

echo [3/3] 잠시 후 브라우저에서 사이트를 엽니다...
timeout /t 2 /nobreak > nul
start http://localhost:8000/index.html

echo.
echo 실행 완료! 창을 닫으면 서버도 함께 종료됩니다.
echo   - 사이트:      http://localhost:8000/index.html
echo   - 관리자 페이지: http://localhost:8000/admin.html

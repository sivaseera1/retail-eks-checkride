@echo off
setlocal
set "ROOT=%~dp0"
cd /d "%ROOT%"

echo ==================================================
echo  Northstar Retail - Starting Backend and Frontend
echo ==================================================
echo.

where python >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH.
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js / npm is not installed or not in PATH.
    pause
    exit /b 1
)

set "VENV_OK=0"
if exist "%ROOT%.venv\Scripts\uvicorn.exe" (
    "%ROOT%.venv\Scripts\uvicorn.exe" --version >nul 2>&1
    if not errorlevel 1 set "VENV_OK=1"
)

if "%VENV_OK%"=="0" (
    echo [1/4] Setting up Python virtual environment and backend packages...
    if exist "%ROOT%.venv" (
        echo       Removing stale virtual environment...
        rmdir /s /q "%ROOT%.venv"
    )
    python -m venv "%ROOT%.venv"
    if errorlevel 1 (
        echo [ERROR] Failed to create Python virtual environment.
        pause
        exit /b 1
    )
    "%ROOT%.venv\Scripts\python.exe" -m pip install -r "%ROOT%backend\requirements.txt"
    if errorlevel 1 (
        echo [ERROR] Failed to install backend requirements.
        pause
        exit /b 1
    )
) else (
    echo [1/4] Backend virtual environment ready.
)

if not exist "%ROOT%frontend\node_modules" (
    echo [2/4] Installing frontend npm dependencies...
    pushd "%ROOT%frontend"
    call npm install
    if errorlevel 1 (
        popd
        echo [ERROR] Failed to install frontend dependencies.
        pause
        exit /b 1
    )
    popd
) else (
    echo [2/4] Frontend dependencies ready.
)

echo [3/4] Launching Backend API on http://127.0.0.1:8080 ...
pushd "%ROOT%backend"
start "Retail Order API (Backend :8080)" cmd /k "..\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8080"
popd

echo [4/4] Launching Frontend Console on http://localhost:5173 ...
pushd "%ROOT%frontend"
start "Retail Operations Console (Frontend :5173)" cmd /k "npm run dev"
popd

timeout /t 3 /nobreak >nul
start "" "http://localhost:5173/"

echo.
echo Both services are starting in separate windows:
echo   - Frontend UI : http://localhost:5173/
echo   - Backend API : http://127.0.0.1:8080
echo   - API Docs    : http://127.0.0.1:8080/docs
echo   - Slides      : %ROOT%docs\presentation\presentation.html
echo.
echo Close the two server windows when you want to stop them.
echo Press any key to close this launcher window...
pause >nul

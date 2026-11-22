@echo off
setlocal
set "ROOT=%~dp0"
cd /d "%ROOT%"
title Retail EKS Platform Controller

echo ==================================================
echo   Retail Application Reliability Platform
echo ==================================================
echo.
echo  [1] Start Application (Backend :8080 + Frontend :5173) [Default]
echo  [2] Run Backend Unit Tests (pytest)
echo  [3] Check EKS Status (kubectl siva-p)
echo  [4] Rollback EKS Deployment (kubectl rollout undo)
echo  [5] Exit
echo.
set "CHOICE=1"
set /p "CHOICE=Enter choice [1-5, default=1]: "

if "%CHOICE%"=="1" goto START_ALL
if "%CHOICE%"=="2" goto RUN_TESTS
if "%CHOICE%"=="3" goto CHECK_EKS
if "%CHOICE%"=="4" goto ROLLBACK_EKS
if "%CHOICE%"=="5" goto EXIT
goto START_ALL

:START_ALL
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
if exist "%ROOT%.venv\Scripts\python.exe" (
    "%ROOT%.venv\Scripts\python.exe" -c "import fastapi, uvicorn" >nul 2>&1
    if not errorlevel 1 set "VENV_OK=1"
)

if "%VENV_OK%"=="0" (
    echo [1/3] Setting up Python virtual environment...
    if exist "%ROOT%.venv" rmdir /s /q "%ROOT%.venv"
    python -m venv "%ROOT%.venv"
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
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
    echo [1/3] Backend environment ready.
)

if not exist "%ROOT%frontend\node_modules" (
    echo [2/3] Installing frontend dependencies...
    pushd "%ROOT%frontend"
    call npm install
    popd
) else (
    echo [2/3] Frontend dependencies ready.
)

echo [3/3] Launching services...
pushd "%ROOT%backend"
start "Retail Order API (Backend :8080)" cmd /k "..\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8080"
popd

pushd "%ROOT%frontend"
start "Retail Operations Console (Frontend :5173)" cmd /k "npm run dev"
popd

timeout /t 3 /nobreak >nul
start "" "http://localhost:5173/"

echo.
echo ==================================================
echo Services are running:
echo   - Frontend UI : http://localhost:5173/
echo   - Backend API : http://127.0.0.1:8080/
echo   - API Docs    : http://127.0.0.1:8080/docs
echo ==================================================
echo Close the two server windows to stop.
echo.
pause
goto EXIT

:RUN_TESTS
echo Running backend pytest suite...
if exist "%ROOT%.venv\Scripts\python.exe" (
    set "PYTHONPATH=%ROOT%backend"
    "%ROOT%.venv\Scripts\python.exe" -m pytest -q "%ROOT%backend\tests"
) else (
    python -m pytest -q "%ROOT%backend\tests"
)
pause
goto EXIT

:CHECK_EKS
echo Querying EKS namespace siva-p...
kubectl get deployment,pods,svc,endpoints -n siva-p -l app=retail-order-api
pause
goto EXIT

:ROLLBACK_EKS
echo Rolling back deployment/retail-order-api in namespace siva-p...
kubectl rollout undo deployment/retail-order-api -n siva-p
kubectl rollout status deployment/retail-order-api -n siva-p --timeout=180s
pause
goto EXIT

:EXIT
exit /b 0

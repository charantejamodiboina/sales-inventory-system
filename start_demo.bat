@echo off
title ApexTrack Sales ^& Inventory Management System - Demo Launcher
echo ====================================================================
echo  ApexTrack Sales ^& Inventory Management System - Assessment Demo
echo ====================================================================
echo.

cd /d "%~dp0backend"

echo [1/3] Checking backend dependencies and database seed...
python -m app.seed
if %errorlevel% neq 0 (
    echo [ERROR] Failed to run database seed. Please verify Python installation.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Seed verified successfully!
echo [3/3] Starting ApexTrack application server...
echo.
echo --------------------------------------------------------------------
echo   Application UI:       http://127.0.0.1:8000
echo   Interactive API Docs: http://127.0.0.1:8000/docs
echo   Health Check:         http://127.0.0.1:8000/api/health
echo --------------------------------------------------------------------
echo   DEMO CREDENTIALS:
echo     Sales User:    sales    / Sales@123
echo     Manager:       manager  / Manager@123
echo     Administrator: admin    / Admin@123
echo --------------------------------------------------------------------
echo.
echo Press Ctrl+C anytime to terminate the server.
echo.

python run_server.py
pause


@echo off
title TOEFL Practice App Server
echo ===================================================
echo   TOEFL iBT Complete the Words Server Starting...
echo ===================================================
echo.

:: Get the directory of this script and move to backend folder
cd /d "%~dp0\backend"

:: Automatically open browser
echo Opening practice app in your browser...
start http://localhost:8000

:: Start FastAPI server
if exist "C:\miniconda\envs\tofel\python.exe" (
    echo Using Miniconda tofel environment...
    C:\miniconda\envs\tofel\python.exe -m uvicorn main:app --port 8000
) else (
    echo Using system Python/Active virtual environment...
    python -m uvicorn main:app --port 8000
)

pause

@echo off
title Tauhidku - Server Lokal
cd /d "%~dp0"

rem Cari Python (py atau python)
where py >nul 2>nul
if not errorlevel 1 (set PY=py) else (
  where python >nul 2>nul
  if not errorlevel 1 (set PY=python) else (
    echo [ERROR] Python tidak ditemukan di komputer ini.
    echo Install dulu dari https://www.python.org/downloads/
    echo (centang opsi "Add Python to PATH" saat proses install)
    pause
    exit /b 1
  )
)

echo ============================================
echo   TAUHIDKU - Server Lokal
echo   URL  : http://localhost:8080
echo   Berhenti: tekan Ctrl+C atau tutup jendela ini
echo ============================================
echo.

rem Buka browser otomatis setelah 2 detik
start "" cmd /c "ping -n 3 127.0.0.1 >nul & start http://localhost:8080"

%PY% -m http.server 8080
pause

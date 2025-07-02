@echo off
echo === HubTrack Service Status Check ===
echo.

echo Checking if services are running on required ports...
echo.

echo Backend API (port 5000):
netstat -an | findstr ":5000" >nul
if %errorlevel% equ 0 (
    echo [OK] Backend API is running
) else (
    echo [FAIL] Backend API is not running
)

echo.
echo LabJack Server (port 5001):
netstat -an | findstr ":5001" >nul
if %errorlevel% equ 0 (
    echo [OK] LabJack Server is running
) else (
    echo [FAIL] LabJack Server is not running
)

echo.
echo Frontend Dev Server (port 5173):
netstat -an | findstr ":5173" >nul
if %errorlevel% equ 0 (
    echo [OK] Frontend Dev Server is running
) else (
    echo [FAIL] Frontend Dev Server is not running
)

echo.
echo Loading Server (port 8080):
netstat -an | findstr ":8080" >nul
if %errorlevel% equ 0 (
    echo [OK] Loading Server is running
) else (
    echo [FAIL] Loading Server is not running
)

echo.
echo Chrome processes:
tasklist /FI "IMAGENAME eq chrome.exe" 2>nul | findstr "chrome.exe" >nul
if %errorlevel% equ 0 (
    echo [OK] Chrome is running
) else (
    echo [FAIL] Chrome is not running
)

echo.
echo === Summary ===
echo If any services are marked as [FAIL], the system may not be working properly.
echo.
echo To restart all services, run: startup-hub-user.ps1
echo.
pause 
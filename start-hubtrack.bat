@echo off
echo Starting HubTrack...
echo.

REM Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"

REM Change to the script directory
cd /d "%SCRIPT_DIR%"

REM Run the PowerShell startup script
powershell.exe -ExecutionPolicy Bypass -File "startup-hubtrack.ps1"

REM Keep the window open if there's an error
if %ERRORLEVEL% neq 0 (
    echo.
    echo HubTrack startup failed with error code: %ERRORLEVEL%
    echo Press any key to exit...
    pause >nul
) 
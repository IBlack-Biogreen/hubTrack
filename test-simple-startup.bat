@echo off
echo === Testing Simple Startup Approach ===
echo.

echo Step 1: Opening Chrome to simple loading page...
echo.

REM Find Chrome
set "CHROME_PATH="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
)

if "%CHROME_PATH%"=="" (
    echo Chrome not found!
    pause
    exit /b 1
)

echo Found Chrome at: %CHROME_PATH%

REM Get the current directory
set "SCRIPT_DIR=%~dp0"
set "LOADING_PAGE=%SCRIPT_DIR%simple-loading.html"

REM Convert to file:// URL
set "LOADING_URL=file:///%LOADING_PAGE:\=/%"

echo Loading page: %LOADING_PAGE%
echo Loading URL: %LOADING_URL%

REM Open Chrome to the loading page
echo Opening Chrome to loading page...
start "" "%CHROME_PATH%" --start-fullscreen --kiosk --disable-web-security --no-first-run --no-default-browser-check --disable-default-apps --disable-popup-blocking --disable-notifications --disable-extensions --disable-plugins --disable-sync --disable-translate --disable-logging --disable-dev-shm-usage --disable-gpu --disable-software-rasterizer --disable-background-networking --disable-component-extensions-with-background-pages --disable-background-mode --disable-client-side-phishing-detection --disable-component-update --disable-domain-reliability --disable-features=AudioServiceOutOfProcess --disable-hang-monitor --disable-prompt-on-repost --disable-sync-preferences --disable-web-resources --force-color-profile=srgb --metrics-recording-only --no-sandbox --safebrowsing-disable-auto-update --silent-launch "%LOADING_URL%"

echo.
echo Chrome should now be open showing the loading page.
echo.
echo Next steps would be:
echo 1. Start backend services
echo 2. Start frontend services
echo 3. Navigate Chrome to http://localhost:5173
echo.
pause 
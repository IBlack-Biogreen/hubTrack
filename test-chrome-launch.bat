@echo off
echo === Testing Chrome Launch ===
echo.

echo Step 1: Finding Chrome...
set "CHROME_PATH="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
    echo Found Chrome at: %CHROME_PATH%
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
    echo Found Chrome at: %CHROME_PATH%
) else (
    echo Chrome not found!
    pause
    exit /b 1
)

echo.
echo Step 2: Creating test HTML file...
echo ^<!DOCTYPE html^>^
echo ^<html^>^
echo ^<head^>^<title^>HubTrack Test^</title^>^</head^>
echo ^<body style="background: blue; color: white; font-size: 24px; text-align: center; padding-top: 100px;"^>^
echo ^<h1^>HubTrack Loading Test^</h1^>^
echo ^<p^>If you can see this, Chrome launched correctly!^</p^>^
echo ^</body^>^</html^> > test-loading.html

echo Test HTML file created: test-loading.html

echo.
echo Step 3: Launching Chrome with simple arguments...
echo Command: "%CHROME_PATH%" --start-fullscreen --kiosk --disable-web-security "file:///%~dp0test-loading.html"

start "" "%CHROME_PATH%" --start-fullscreen --kiosk --disable-web-security "file:///%~dp0test-loading.html"

echo.
echo Chrome should now open to the test page.
echo If it opens to Google instead, there's an issue with the file:// URL or arguments.
echo.
pause 
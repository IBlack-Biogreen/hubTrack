# HubTrack Kiosk Mode Test
# This script tests the kiosk mode browser launch

param(
    [string]$Url = "http://localhost:5173",
    [string]$BrowserPath = "",
    [switch]$KioskMode = $true
)

Write-Host "=== HubTrack Kiosk Mode Test ===" -ForegroundColor Cyan
Write-Host "URL: $Url" -ForegroundColor Yellow
Write-Host "Kiosk Mode: $KioskMode" -ForegroundColor Yellow
Write-Host "===============================" -ForegroundColor Cyan

# Determine browser path
if ([string]::IsNullOrEmpty($BrowserPath)) {
    # Try to find Chrome/Edge
    $chromePaths = @(
        "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe",
        "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
    )
    
    foreach ($path in $chromePaths) {
        if (Test-Path $path) {
            $BrowserPath = $path
            Write-Host "Found browser: $BrowserPath" -ForegroundColor Green
            break
        }
    }
    
    if ([string]::IsNullOrEmpty($BrowserPath)) {
        Write-Host "No suitable browser found. Using default browser." -ForegroundColor Yellow
        $BrowserPath = "start"
    }
}

Write-Host "Using browser: $BrowserPath" -ForegroundColor Green

if ($KioskMode) {
    if ($BrowserPath -eq "start") {
        # Use default browser with kiosk-like arguments
        Write-Host "Launching default browser in maximized mode..." -ForegroundColor Yellow
        Start-Process $Url -WindowStyle Maximized
    } else {
        # Use Chrome's built-in fullscreen flag
        $fullscreenArgs = @(
            "--start-fullscreen",
            "--disable-web-security",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-default-apps",
            "--disable-extensions",
            "--disable-plugins",
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-renderer-backgrounding",
            "--disable-features=TranslateUI",
            "--disable-ipc-flooding-protection",
            "--disable-infobars",
            "--disable-notifications",
            "--disable-popup-blocking",
            "--disable-save-password-bubble",
            "--disable-translate",
            "--allow-running-insecure-content",
            "--disable-features=VizDisplayCompositor",
            "--disable-blink-features=AutomationControlled",
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            $Url
        )
        
        try {
            Write-Host "Launching browser with --start-fullscreen flag..." -ForegroundColor Yellow
            Write-Host "Arguments: $($fullscreenArgs -join ' ')" -ForegroundColor Cyan
            $browserProcess = Start-Process -FilePath $BrowserPath -ArgumentList $fullscreenArgs -PassThru
            Write-Host "Browser launched with PID: $($browserProcess.Id)" -ForegroundColor Green
            Write-Host "Browser should now be in full-screen mode!" -ForegroundColor Green
            
        } catch {
            Write-Host "Error launching browser in full-screen mode: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "Falling back to normal mode..." -ForegroundColor Yellow
            Start-Process $Url -WindowStyle Maximized
        }
    }
} else {
    # Normal mode
    Write-Host "Launching browser in normal mode..." -ForegroundColor Yellow
    Start-Process $Url
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Green
Write-Host "Browser should now be open in full-screen mode. Press any key to exit..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 
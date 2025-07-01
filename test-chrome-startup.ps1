# Test Chrome Startup Script
# This script tests the new Chrome startup functionality

param(
    [switch]$StartLoadingServer = $false
)

Write-Host "=== HubTrack Chrome Startup Test ===" -ForegroundColor Cyan

# Set the project path
$projectPath = "C:\Users\Public\Documents\hubTrack\hubTrack"
$chromeStartupScript = Join-Path $projectPath "start-chrome.ps1"

if (-not (Test-Path $chromeStartupScript)) {
    Write-Host "Chrome startup script not found: $chromeStartupScript" -ForegroundColor Red
    exit 1
}

Write-Host "Chrome startup script: $chromeStartupScript" -ForegroundColor Yellow

# Check if loading server is running
Write-Host "`nChecking if loading server is running..." -ForegroundColor Green
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "Loading server is running!" -ForegroundColor Green
    } else {
        Write-Host "Loading server responded with status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Loading server is not running: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($StartLoadingServer) {
        Write-Host "`nStarting loading server..." -ForegroundColor Green
        Set-Location $projectPath
        $loadingProcess = Start-Process -FilePath "node" -ArgumentList "loading-server.js" -NoNewWindow -PassThru
        Write-Host "Loading server started with PID: $($loadingProcess.Id)" -ForegroundColor Green
        
        Write-Host "Waiting for loading server to be ready..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
        
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Host "Loading server is now ready!" -ForegroundColor Green
            }
        } catch {
            Write-Host "Loading server still not ready" -ForegroundColor Red
        }
    } else {
        Write-Host "`nTo start the loading server, run: .\test-loading-page.ps1 -StartOnly" -ForegroundColor Yellow
        Write-Host "Or use the -StartLoadingServer parameter with this script" -ForegroundColor Yellow
    }
}

Write-Host "`nTesting Chrome startup script..." -ForegroundColor Green
Write-Host "This will open Chrome in kiosk mode to the loading page" -ForegroundColor Yellow
Write-Host "Press any key to continue..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

try {
    Write-Host "`nRunning Chrome startup script..." -ForegroundColor Green
    & $chromeStartupScript
    
    Write-Host "`nChrome startup script completed!" -ForegroundColor Green
    Write-Host "Check if Chrome opened correctly to the loading page" -ForegroundColor Yellow
} catch {
    Write-Host "Error running Chrome startup script: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Green 
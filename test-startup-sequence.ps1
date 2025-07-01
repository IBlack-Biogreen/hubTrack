# Test Startup Sequence Script
# This script tests the new startup sequence that launches Chrome after loading server is ready

param(
    [switch]$FullTest = $false
)

Write-Host "=== HubTrack Startup Sequence Test ===" -ForegroundColor Cyan

# Set the project path
$projectPath = "C:\Users\Public\Documents\hubTrack\hubTrack"
$startupScript = Join-Path $projectPath "startup-hub-user.ps1"

if (-not (Test-Path $startupScript)) {
    Write-Host "Startup script not found: $startupScript" -ForegroundColor Red
    exit 1
}

Write-Host "Startup script: $startupScript" -ForegroundColor Yellow

if ($FullTest) {
    Write-Host "`nRunning full startup sequence test..." -ForegroundColor Green
    Write-Host "This will start all services and launch Chrome" -ForegroundColor Yellow
    Write-Host "Press any key to continue..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    
    try {
        Write-Host "`nStarting HubTrack services..." -ForegroundColor Green
        & $startupScript
        
        Write-Host "`nStartup sequence completed!" -ForegroundColor Green
        Write-Host "Check if Chrome opened correctly to the loading page" -ForegroundColor Yellow
    } catch {
        Write-Host "Error running startup sequence: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "`nTesting loading server startup..." -ForegroundColor Green
    
    # Kill any existing processes
    Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
    try {
        $connections = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
        foreach ($conn in $connections) {
            $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "Stopping existing loading server (PID: $($process.Id))" -ForegroundColor Yellow
                Stop-Process -Id $process.Id -Force
            }
        }
        Start-Sleep -Seconds 2
    } catch {
        Write-Host "No existing loading server found." -ForegroundColor Green
    }
    
    # Start loading server
    Set-Location $projectPath
    Write-Host "`nStarting loading server..." -ForegroundColor Green
    $loadingProcess = Start-Process -FilePath "node" -ArgumentList "loading-server.js" -NoNewWindow -PassThru
    Write-Host "Loading server started with PID: $($loadingProcess.Id)" -ForegroundColor Green
    
    # Wait for loading server
    Write-Host "Waiting for loading server to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    
    # Test loading server
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "Loading server is ready!" -ForegroundColor Green
            
            # Test Chrome startup
            Write-Host "`nTesting Chrome startup..." -ForegroundColor Green
            $chromeStartupScript = Join-Path $projectPath "start-chrome.ps1"
            if (Test-Path $chromeStartupScript) {
                Write-Host "Launching Chrome..." -ForegroundColor Yellow
                & $chromeStartupScript
                Write-Host "Chrome startup completed!" -ForegroundColor Green
            } else {
                Write-Host "Chrome startup script not found: $chromeStartupScript" -ForegroundColor Red
            }
        } else {
            Write-Host "Loading server responded with status: $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Loading server health check failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Cleanup
    Write-Host "`nCleaning up..." -ForegroundColor Green
    if ($loadingProcess -and -not $loadingProcess.HasExited) {
        Stop-Process -Id $loadingProcess.Id -Force
        Write-Host "Loading server stopped." -ForegroundColor Green
    }
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Green 
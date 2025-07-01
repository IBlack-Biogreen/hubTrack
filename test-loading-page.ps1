# Test Loading Page Script
# This script tests the loading page functionality

param(
    [switch]$StartOnly = $false
)

Write-Host "=== HubTrack Loading Page Test ===" -ForegroundColor Cyan

# Set the project path
$projectPath = "C:\Users\Public\Documents\hubTrack\hubTrack"

if (-not (Test-Path $projectPath)) {
    Write-Host "Project directory not found: $projectPath" -ForegroundColor Red
    exit 1
}

$loadingPagePath = Join-Path $projectPath "loading.html"
$loadingServerPath = Join-Path $projectPath "loading-server.js"

if (-not (Test-Path $loadingPagePath)) {
    Write-Host "Loading page not found: $loadingPagePath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $loadingServerPath)) {
    Write-Host "Loading server not found: $loadingServerPath" -ForegroundColor Red
    exit 1
}

Write-Host "Loading Page: $loadingPagePath" -ForegroundColor Yellow
Write-Host "Loading Server: $loadingServerPath" -ForegroundColor Yellow

# Kill any existing loading server
Write-Host "`nCleaning up existing processes..." -ForegroundColor Green
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

# Start the loading server
Write-Host "`nStarting loading server..." -ForegroundColor Green
Set-Location $projectPath

try {
    $loadingProcess = Start-Process -FilePath "node" -ArgumentList "loading-server.js" -NoNewWindow -PassThru
    Write-Host "Loading server started with PID: $($loadingProcess.Id)" -ForegroundColor Green
    
    # Wait for server to start
    Write-Host "Waiting for loading server to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    
    # Test the server
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "Loading server is ready!" -ForegroundColor Green
        } else {
            Write-Host "Loading server responded with status: $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Loading server health check failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host "`nLoading page should be available at: http://localhost:8080" -ForegroundColor Cyan
    Write-Host "Health check: http://localhost:8080/health" -ForegroundColor Cyan
    
    if (-not $StartOnly) {
        Write-Host "`nOpening loading page in default browser..." -ForegroundColor Green
        Start-Process "http://localhost:8080"
        
        Write-Host "`nPress any key to stop the loading server..." -ForegroundColor Yellow
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        
        Write-Host "`nStopping loading server..." -ForegroundColor Green
        Stop-Process -Id $loadingProcess.Id -Force
        Write-Host "Loading server stopped." -ForegroundColor Green
    } else {
        Write-Host "`nLoading server is running in the background." -ForegroundColor Green
        Write-Host "To stop it, find the process with PID: $($loadingProcess.Id)" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "Error starting loading server: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Green 
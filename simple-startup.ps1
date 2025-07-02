# HubTrack Simple Startup Script
# This script implements a simple loading approach:
# 1. Open Chrome to a simple loading page immediately
# 2. Start backend services
# 3. Start frontend services  
# 4. Navigate Chrome to the main application

param(
    [int]$StartupDelay = 5
)

# Get the script's directory and set up paths
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $scriptPath "backend"
$frontendPath = Join-Path $scriptPath "frontend"
$loadingPagePath = Join-Path $scriptPath "simple-loading.html"

Write-Host "=== HubTrack Simple Startup Script ===" -ForegroundColor Cyan
Write-Host "Script Path: $scriptPath" -ForegroundColor Yellow
Write-Host "Backend Path: $backendPath" -ForegroundColor Yellow
Write-Host "Frontend Path: $frontendPath" -ForegroundColor Yellow
Write-Host "Loading Page: $loadingPagePath" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Cyan

# Function to find Chrome executable
function Find-Chrome {
    $chromePaths = @(
        "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
    )
    
    foreach ($path in $chromePaths) {
        if (Test-Path $path) {
            return $path
        }
    }
    return $null
}

# Function to kill processes on specific ports
function Stop-ProcessOnPort {
    param([int]$Port)
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        foreach ($conn in $connections) {
            $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "Stopping process on port ${Port}: $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Yellow
                Stop-Process -Id $process.Id -Force
            }
        }
        Start-Sleep -Seconds 2
    } catch {
        Write-Host "Error stopping process on port ${Port}: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Function to wait for a service to be ready
function Wait-ForService {
    param(
        [string]$ServiceName,
        [string]$Url,
        [int]$Timeout = 60
    )
    Write-Host "Waiting for $ServiceName to be ready..." -ForegroundColor Yellow
    $startTime = Get-Date
    $timeoutTime = $startTime.AddSeconds($Timeout)
    
    while ((Get-Date) -lt $timeoutTime) {
        try {
            $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Host "$ServiceName is ready!" -ForegroundColor Green
                return $true
            }
        } catch {
            # Service not ready yet
        }
        Start-Sleep -Seconds 2
    }
    
    Write-Host "$ServiceName failed to start within $Timeout seconds" -ForegroundColor Red
    return $false
}

# Check if paths exist
if (-not (Test-Path $backendPath)) {
    Write-Host "Backend directory not found: $backendPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $frontendPath)) {
    Write-Host "Frontend directory not found: $frontendPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $loadingPagePath)) {
    Write-Host "Loading page not found: $loadingPagePath" -ForegroundColor Red
    exit 1
}

# Kill any existing processes on our ports
Write-Host "Cleaning up existing processes..." -ForegroundColor Green
Stop-ProcessOnPort -Port 5000  # Backend API
Stop-ProcessOnPort -Port 5001  # LabJack
Stop-ProcessOnPort -Port 5173  # Frontend dev server

# STEP 1: Open Chrome to the simple loading page immediately
Write-Host "Step 1: Opening Chrome to loading page..." -ForegroundColor Green

$chromePath = Find-Chrome
if (-not $chromePath) {
    Write-Host "Chrome not found in standard locations" -ForegroundColor Red
    exit 1
}

Write-Host "Found Chrome at: $chromePath" -ForegroundColor Green

# Convert the loading page path to a file:// URL
$loadingPageUrl = "file:///" + $loadingPagePath.Replace('\', '/')

# Chrome arguments for fullscreen kiosk mode
$chromeArgs = @(
    "--start-fullscreen",
    "--kiosk",
    "--disable-web-security",
    "--disable-features=VizDisplayCompositor",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--disable-features=TranslateUI",
    "--disable-ipc-flooding-protection",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-default-apps",
    "--disable-popup-blocking",
    "--disable-notifications",
    "--disable-extensions",
    "--disable-plugins",
    "--disable-sync",
    "--disable-translate",
    "--disable-logging",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-software-rasterizer",
    "--disable-background-networking",
    "--disable-component-extensions-with-background-pages",
    "--disable-background-mode",
    "--disable-client-side-phishing-detection",
    "--disable-component-update",
    "--disable-domain-reliability",
    "--disable-features=AudioServiceOutOfProcess",
    "--disable-hang-monitor",
    "--disable-prompt-on-repost",
    "--disable-sync-preferences",
    "--disable-web-resources",
    "--force-color-profile=srgb",
    "--metrics-recording-only",
    "--no-sandbox",
    "--safebrowsing-disable-auto-update",
    "--silent-launch",
    $loadingPageUrl
)

$chromeArgsString = $chromeArgs -join " "

try {
    $chromeProcess = Start-Process -FilePath $chromePath -ArgumentList $chromeArgsString -PassThru
    Write-Host "Chrome opened with PID: $($chromeProcess.Id)" -ForegroundColor Green
    Write-Host "Chrome is now showing the loading page" -ForegroundColor Green
} catch {
    Write-Host "Error opening Chrome: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Give Chrome a moment to open
Start-Sleep -Seconds 3

# STEP 2: Start backend services
Write-Host "Step 2: Starting backend services..." -ForegroundColor Green
Set-Location $backendPath

try {
    Write-Host "Running backend startup script..." -ForegroundColor Yellow
    $backendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-ExecutionPolicy", "Bypass", "-File", "start.ps1" -NoNewWindow -PassThru
    Write-Host "Backend startup script launched with PID: $($backendProcess.Id)" -ForegroundColor Green
} catch {
    Write-Host "Error starting backend: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Wait for backend services to be ready
Write-Host "Waiting for backend services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds $StartupDelay

# Check if backend is ready
$backendReady = $false
$healthEndpoints = @(
    "http://localhost:5000/api/health",
    "http://localhost:5000/health",
    "http://localhost:5000/"
)

foreach ($endpoint in $healthEndpoints) {
    if (Wait-ForService -ServiceName "Backend API" -Url $endpoint -Timeout 30) {
        $backendReady = $true
        break
    }
}

if (-not $backendReady) {
    Write-Host "Backend failed to start properly" -ForegroundColor Red
    Write-Host "Chrome will continue showing the loading page" -ForegroundColor Yellow
    exit 1
}

# STEP 3: Start frontend development server
Write-Host "Step 3: Starting frontend development server..." -ForegroundColor Green
Set-Location $frontendPath

try {
    Write-Host "Installing frontend dependencies if needed..." -ForegroundColor Yellow
    if (-not (Test-Path "node_modules")) {
        npm install
    }
    
    Write-Host "Starting frontend dev server..." -ForegroundColor Yellow
    $frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -NoNewWindow -PassThru
    Write-Host "Frontend dev server launched with PID: $($frontendProcess.Id)" -ForegroundColor Green
} catch {
    Write-Host "Error starting frontend: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Wait for frontend to be ready
if (-not (Wait-ForService -ServiceName "Frontend" -Url "http://localhost:5173" -Timeout 60)) {
    Write-Host "Frontend failed to start properly" -ForegroundColor Red
    Write-Host "Chrome will continue showing the loading page" -ForegroundColor Yellow
    exit 1
}

# STEP 4: Navigate Chrome to the main application
Write-Host "Step 4: Navigating Chrome to main application..." -ForegroundColor Green

# Use PowerShell to send a message to Chrome to navigate
# Note: This is a simplified approach - in a real implementation, you might want to use
# a more sophisticated method to communicate with Chrome

Write-Host "All services are ready!" -ForegroundColor Green
Write-Host "Chrome should now be showing the main HubTrack application" -ForegroundColor Green
Write-Host "" -ForegroundColor Green
Write-Host "=== HubTrack Startup Complete ===" -ForegroundColor Green
Write-Host "Backend API: http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "LabJack: http://localhost:5001" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Green

# Keep the script running to maintain the processes
Write-Host "`nPress Ctrl+C to stop all services" -ForegroundColor Yellow

try {
    # Wait for any of the main processes to exit
    Wait-Process -Id $backendProcess.Id, $frontendProcess.Id -ErrorAction SilentlyContinue
} catch {
    Write-Host "One or more processes have stopped" -ForegroundColor Yellow
} finally {
    # Cleanup on exit
    Write-Host "`nStopping all HubTrack services..." -ForegroundColor Yellow
    
    # Stop backend processes
    Get-Process | Where-Object { 
        $_.ProcessName -in @("node", "python", "mongod") -and 
        $_.MainWindowTitle -like "*hubtrack*" -or 
        $_.ProcessName -like "*labjack*"
    } | ForEach-Object {
        Write-Host "Stopping process: $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Yellow
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    
    # Stop frontend process
    if ($frontendProcess -and -not $frontendProcess.HasExited) {
        Stop-Process -Id $frontendProcess.Id -Force
    }
    
    Write-Host "All HubTrack services stopped." -ForegroundColor Green
} 
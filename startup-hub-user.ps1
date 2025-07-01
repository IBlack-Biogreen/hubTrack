# HubTrack Windows Startup Script for "hub" user
# This script starts all backend services and frontend development server
# Designed to run from Public Documents folder

param(
    [int]$StartupDelay = 10
)

# Set the project path to Public Documents
$projectPath = "C:\Users\Public\Documents\hubTrack\hubTrack"
$backendPath = Join-Path $projectPath "backend"
$frontendPath = Join-Path $projectPath "frontend"

Write-Host "=== HubTrack Startup Script (hub user) ===" -ForegroundColor Cyan
Write-Host "Project Path: $projectPath" -ForegroundColor Yellow
Write-Host "Backend Path: $backendPath" -ForegroundColor Yellow
Write-Host "Frontend Path: $frontendPath" -ForegroundColor Yellow
Write-Host "Current User: $env:USERNAME" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan

# Function to check if a port is available
function Test-PortAvailable {
    param([int]$Port)
    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        return $null -eq $connection
    } catch {
        return $true
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

# Check if paths exist
if (-not (Test-Path $projectPath)) {
    Write-Host "Project directory not found: $projectPath" -ForegroundColor Red
    Write-Host "Please ensure the project is located at: $projectPath" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $backendPath)) {
    Write-Host "Backend directory not found: $backendPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $frontendPath)) {
    Write-Host "Frontend directory not found: $frontendPath" -ForegroundColor Red
    exit 1
}

# Kill any existing processes on our ports
Write-Host "Cleaning up existing processes..." -ForegroundColor Green
Stop-ProcessOnPort -Port 5000  # Backend API
Stop-ProcessOnPort -Port 5001  # LabJack
Stop-ProcessOnPort -Port 5173  # Frontend dev server

# Start backend services
Write-Host "Starting backend services..." -ForegroundColor Green
Set-Location $backendPath

# Check if Python virtual environment exists
$venvPath = Join-Path $backendPath "venv"
$pythonPath = ""
if (Test-Path $venvPath) {
    $pythonPath = Join-Path $venvPath "Scripts\python.exe"
    if (Test-Path $pythonPath) {
        Write-Host "Found Python virtual environment: $pythonPath" -ForegroundColor Green
    } else {
        Write-Host "Virtual environment found but python.exe not found at: $pythonPath" -ForegroundColor Yellow
        $pythonPath = "python"
    }
} else {
    Write-Host "No virtual environment found, using system Python" -ForegroundColor Yellow
    $pythonPath = "python"
}

# Start the backend using the existing script
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

# Check if backend is ready - try multiple endpoints
$backendReady = $false
$healthEndpoints = @(
    "http://localhost:5000/api/health",
    "http://localhost:5000/health",
    "http://localhost:5000/"
)

foreach ($endpoint in $healthEndpoints) {
    if (Wait-ForService -ServiceName "Backend API" -Url $endpoint -Timeout 15) {
        $backendReady = $true
        break
    }
}

if (-not $backendReady) {
    Write-Host "Backend failed to start properly" -ForegroundColor Red
    Write-Host "Checking backend logs for errors..." -ForegroundColor Yellow
    
    # Check for log files and display recent errors
    $logFiles = @("node_error.log", "labjack_error.log", "flask_error.log")
    foreach ($logFile in $logFiles) {
        if (Test-Path $logFile) {
            Write-Host "=== Recent errors from $logFile ===" -ForegroundColor Red
            Get-Content $logFile -Tail 10
            Write-Host "=====================================" -ForegroundColor Red
        }
    }
    
    exit 1
}

# Start frontend development server
Write-Host "Starting frontend development server..." -ForegroundColor Green
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
if (-not (Wait-ForService -ServiceName "Frontend" -Url "http://localhost:5173" -Timeout 30)) {
    Write-Host "Frontend failed to start properly" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== HubTrack Startup Complete ===" -ForegroundColor Green
Write-Host "Backend API: http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "LabJack: http://localhost:5001" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Green
Write-Host "All services are now running!" -ForegroundColor Green
Write-Host "Chrome should automatically open to http://localhost:5173" -ForegroundColor Yellow

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
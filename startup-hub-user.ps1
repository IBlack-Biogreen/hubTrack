# HubTrack Windows Startup Script for "hub" user
# This script starts all backend services and frontend development server
# Designed to run from Public Documents folder

param(
    [int]$StartupDelay = 10
)

# Set up logging to file instead of console
$logPath = Join-Path $PSScriptRoot "startup.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $logMessage = "[$timestamp] [$Level] $Message"
    Add-Content -Path $logPath -Value $logMessage
}

Write-Log "=== HubTrack Startup Script (hub user) ==="
Write-Log "Project Path: $projectPath"
Write-Log "Backend Path: $backendPath"
Write-Log "Frontend Path: $frontendPath"
Write-Log "Current User: $env:USERNAME"
Write-Log "========================================="

# Set the project path to Public Documents
$projectPath = "C:\Users\Public\Documents\hubTrack\hubTrack"
$backendPath = Join-Path $projectPath "backend"
$frontendPath = Join-Path $projectPath "frontend"

Write-Log "=== HubTrack Startup Script (hub user) ==="
Write-Log "Project Path: $projectPath"
Write-Log "Backend Path: $backendPath"
Write-Log "Frontend Path: $frontendPath"
Write-Log "Current User: $env:USERNAME"
Write-Log "========================================="

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
    Write-Log "Waiting for $ServiceName to be ready..."
    $startTime = Get-Date
    $timeoutTime = $startTime.AddSeconds($Timeout)
    
    while ((Get-Date) -lt $timeoutTime) {
        try {
            $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Log "$ServiceName is ready!"
                return $true
            }
        } catch {
            # Service not ready yet
        }
        Start-Sleep -Seconds 2
    }
    
    Write-Log "$ServiceName failed to start within $Timeout seconds" "ERROR"
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
            Write-Log "Stopping process on port ${Port}: $($process.ProcessName) (PID: $($process.Id))"
            Stop-Process -Id $process.Id -Force
        }
    }
    Start-Sleep -Seconds 2
} catch {
    Write-Log "Error stopping process on port ${Port}: $($_.Exception.Message)" "ERROR"
}
}

# Check if paths exist
if (-not (Test-Path $projectPath)) {
    Write-Log "Project directory not found: $projectPath" "ERROR"
    Write-Log "Please ensure the project is located at: $projectPath" "ERROR"
    exit 1
}

if (-not (Test-Path $backendPath)) {
    Write-Log "Backend directory not found: $backendPath" "ERROR"
    exit 1
}

if (-not (Test-Path $frontendPath)) {
    Write-Log "Frontend directory not found: $frontendPath" "ERROR"
    exit 1
}

# Kill any existing processes on our ports
Write-Log "Cleaning up existing processes..."
Stop-ProcessOnPort -Port 5000  # Backend API
Stop-ProcessOnPort -Port 5001  # LabJack
Stop-ProcessOnPort -Port 5173  # Frontend dev server
Stop-ProcessOnPort -Port 8080  # Loading server

# Start loading server first
Write-Log "Starting loading server..."
Set-Location $projectPath

try {
    Write-Log "Starting loading server on port 8080..."
    $loadingProcess = Start-Process -FilePath "node" -ArgumentList "loading-server.js" -NoNewWindow -PassThru
    Write-Log "Loading server launched with PID: $($loadingProcess.Id)"
    
    # Wait for loading server to be ready before proceeding
    Write-Log "Waiting for loading server to be ready..."
    if (Wait-ForService -ServiceName "Loading Server" -Url "http://localhost:8080/health" -Timeout 15) {
        Write-Log "Loading server is ready - Chrome can now open safely"
        
        # Launch Chrome now that loading server is ready
        Write-Log "Launching Chrome..."
        $chromeStartupScript = Join-Path $projectPath "start-chrome.ps1"
        if (Test-Path $chromeStartupScript) {
            try {
                $chromeProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", $chromeStartupScript -NoNewWindow -PassThru
                Write-Log "Chrome startup script launched with PID: $($chromeProcess.Id)"
            } catch {
                Write-Log "Error launching Chrome: $($_.Exception.Message)" "ERROR"
            }
        } else {
            Write-Log "Chrome startup script not found: $chromeStartupScript" "WARN"
        }
    } else {
        Write-Log "Loading server failed to start properly - Chrome may show connection error" "WARN"
    }
} catch {
    Write-Log "Error starting loading server: $($_.Exception.Message)" "ERROR"
    # Continue anyway as this is not critical
}

# Start backend services
Write-Log "Starting backend services..."
Set-Location $backendPath

# Check if Python virtual environment exists
$venvPath = Join-Path $backendPath "venv"
$pythonPath = ""
if (Test-Path $venvPath) {
    $pythonPath = Join-Path $venvPath "Scripts\python.exe"
    if (Test-Path $pythonPath) {
        Write-Log "Found Python virtual environment: $pythonPath"
    } else {
        Write-Log "Virtual environment found but python.exe not found at: $pythonPath" "WARN"
        $pythonPath = "python"
    }
} else {
    Write-Log "No virtual environment found, using system Python" "WARN"
    $pythonPath = "python"
}

# Start the backend using the existing script
try {
    Write-Log "Running backend startup script..."
    $backendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", "start.ps1" -NoNewWindow -PassThru
    Write-Log "Backend startup script launched with PID: $($backendProcess.Id)"
} catch {
    Write-Log "Error starting backend: $($_.Exception.Message)" "ERROR"
    exit 1
}

# Wait for backend services to be ready
Write-Log "Waiting for backend services to initialize..."
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
    Write-Log "Backend failed to start properly" "ERROR"
    Write-Log "Checking backend logs for errors..." "ERROR"
    
    # Check for log files and display recent errors
    $logFiles = @("node_error.log", "labjack_error.log", "flask_error.log")
    foreach ($logFile in $logFiles) {
        if (Test-Path $logFile) {
            Write-Log "=== Recent errors from $logFile ===" "ERROR"
            $logContent = Get-Content $logFile -Tail 10
            foreach ($line in $logContent) {
                Write-Log $line "ERROR"
            }
            Write-Log "=====================================" "ERROR"
        }
    }
    
    exit 1
}

# Start frontend development server
Write-Log "Starting frontend development server..."
Set-Location $frontendPath

try {
    Write-Log "Installing frontend dependencies if needed..."
    if (-not (Test-Path "node_modules")) {
        npm install
    }
    
    Write-Log "Starting frontend dev server..."
    $frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -NoNewWindow -PassThru
    Write-Log "Frontend dev server launched with PID: $($frontendProcess.Id)"
} catch {
    Write-Log "Error starting frontend: $($_.Exception.Message)" "ERROR"
    exit 1
}

# Wait for frontend to be ready
if (-not (Wait-ForService -ServiceName "Frontend" -Url "http://localhost:5173" -Timeout 30)) {
    Write-Log "Frontend failed to start properly" "ERROR"
    exit 1
}

Write-Log "=== HubTrack Startup Complete ==="
Write-Log "Loading Server: http://localhost:8080"
Write-Log "Backend API: http://localhost:5000"
Write-Log "Frontend: http://localhost:5173"
Write-Log "LabJack: http://localhost:5001"
Write-Log "==============================="
Write-Log "All services are now running!"
Write-Log "Chrome should automatically open to http://localhost:8080 (loading page)"

# Keep the script running to maintain the processes
Write-Log "Startup script completed successfully - keeping processes alive"

try {
    # Wait for any of the main processes to exit
    Wait-Process -Id $backendProcess.Id, $frontendProcess.Id -ErrorAction SilentlyContinue
} catch {
    Write-Log "One or more processes have stopped" "WARN"
} finally {
    # Cleanup on exit
    Write-Log "Stopping all HubTrack services..."
    
    # Stop loading server process
    if ($loadingProcess -and -not $loadingProcess.HasExited) {
        Stop-Process -Id $loadingProcess.Id -Force
    }
    
    # Stop backend processes
    Get-Process | Where-Object { 
        $_.ProcessName -in @("node", "python", "mongod") -and 
        $_.MainWindowTitle -like "*hubtrack*" -or 
        $_.ProcessName -like "*labjack*"
    } | ForEach-Object {
        Write-Log "Stopping process: $($_.ProcessName) (PID: $($_.Id))"
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    
    # Stop frontend process
    if ($frontendProcess -and -not $frontendProcess.HasExited) {
        Stop-Process -Id $frontendProcess.Id -Force
    }
    
    Write-Log "All HubTrack services stopped."
} 
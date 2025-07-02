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
$loadingPagePath = Join-Path $projectPath "auto-loading.html"

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

# STEP 1: Open Chrome to the auto-loading page immediately
Write-Log "Step 1: Opening Chrome to auto-loading page..."

$chromePath = Find-Chrome
if (-not $chromePath) {
    Write-Log "Chrome not found in standard locations" "ERROR"
    exit 1
}

Write-Log "Found Chrome at: $chromePath"

# Check if auto-loading page exists
if (-not (Test-Path $loadingPagePath)) {
    Write-Log "Auto-loading page not found: $loadingPagePath" "ERROR"
    exit 1
}

# Convert the loading page path to a file:// URL
$loadingPageUrl = "file:///" + $loadingPagePath.Replace('\', '/')

# Chrome arguments for fullscreen kiosk mode (simplified)
$chromeArgs = @(
    "--start-fullscreen",
    "--kiosk",
    "--disable-web-security",
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
    "--no-sandbox",
    "--silent-launch",
    $loadingPageUrl
)

$chromeArgsString = $chromeArgs -join " "

try {
    $chromeProcess = Start-Process -FilePath $chromePath -ArgumentList $chromeArgsString -PassThru
    Write-Log "Chrome opened with PID: $($chromeProcess.Id)"
    Write-Log "Chrome is now showing the auto-loading page"
} catch {
    Write-Log "Error opening Chrome: $($_.Exception.Message)" "ERROR"
    exit 1
}

# Give Chrome a moment to open
Start-Sleep -Seconds 3

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
Write-Log "Backend API: http://localhost:5000"
Write-Log "Frontend: http://localhost:5173"
Write-Log "LabJack: http://localhost:5001"
Write-Log "==============================="
Write-Log "All services are now running!"
Write-Log "Chrome should automatically redirect to the main application when ready"

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
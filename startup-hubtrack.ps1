# HubTrack Startup Script with PM2 Process Management
# This script starts all HubTrack services with enhanced crash recovery

param(
    [switch]$UsePM2 = $true,
    [switch]$StartMonitor = $true
)

# Function to write colored output
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "ERROR" { "Red" }
        "WARN" { "Yellow" }
        "SUCCESS" { "Green" }
        default { "White" }
    }
    
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

# Function to stop processes on specific ports
function Stop-ProcessOnPort {
    param([int]$Port)
    
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        foreach ($conn in $connections) {
            $processId = $conn.OwningProcess
            $processName = (Get-Process -Id $processId -ErrorAction SilentlyContinue).ProcessName
            Write-Log "Stopping $processName (PID: $processId) on port $Port" "WARN"
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 2
    } catch {
        Write-Log "Error stopping processes on port $Port : $($_.Exception.Message)" "ERROR"
    }
}

# Set working directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Log "=== HubTrack Startup Script ===" "SUCCESS"
Write-Log "Working directory: $scriptDir"

# Clean up existing processes
Write-Log "Cleaning up existing processes..." "INFO"
Stop-ProcessOnPort -Port 5000  # Backend API
Stop-ProcessOnPort -Port 5001  # LabJack
Stop-ProcessOnPort -Port 5173  # Frontend dev server

# Kill any existing PM2 processes
try {
    $pm2Processes = Get-Process | Where-Object { $_.ProcessName -like "*pm2*" }
    foreach ($proc in $pm2Processes) {
        Write-Log "Stopping PM2 process: $($proc.ProcessName) (PID: $($proc.Id))" "WARN"
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
} catch {
    Write-Log "Error stopping PM2 processes: $($_.Exception.Message)" "ERROR"
}

# Start MongoDB if not running
Write-Log "Starting MongoDB..." "INFO"
$mongodProcess = Start-Process -FilePath "mongod" -ArgumentList "--dbpath", ".\data" -NoNewWindow -PassThru
Start-Sleep -Seconds 3

# Start LabJack server
Write-Log "Starting LabJack server..." "INFO"
Set-Location ".\backend"
$labjackProcess = Start-Process -FilePath "python" -ArgumentList "labjack_server.py" -NoNewWindow -PassThru
Start-Sleep -Seconds 5

# Install PM2 if not installed
if ($UsePM2) {
    Write-Log "Checking PM2 installation..." "INFO"
    try {
        $pm2Version = npm list -g pm2 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Log "Installing PM2 globally..." "INFO"
            npm install -g pm2
        } else {
            Write-Log "PM2 already installed" "SUCCESS"
        }
    } catch {
        Write-Log "Error checking/installing PM2: $($_.Exception.Message)" "ERROR"
    }
}

# Start backend with PM2 or direct
if ($UsePM2) {
    Write-Log "Starting backend with PM2..." "INFO"
    try {
        # Install dependencies if needed
        if (-not (Test-Path "node_modules")) {
            Write-Log "Installing backend dependencies..." "INFO"
            npm install
        }
        
        # Start with PM2
        pm2 start ecosystem.config.js
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Backend started with PM2 successfully" "SUCCESS"
        } else {
            throw "PM2 start failed"
        }
    } catch {
        Write-Log "PM2 start failed, falling back to direct start: $($_.Exception.Message)" "ERROR"
        $backendProcess = Start-Process -FilePath "node" -ArgumentList "server.js" -NoNewWindow -PassThru
    }
} else {
    Write-Log "Starting backend directly..." "INFO"
    $backendProcess = Start-Process -FilePath "node" -ArgumentList "server.js" -NoNewWindow -PassThru
}

# Start crash monitor if requested
if ($StartMonitor) {
    Write-Log "Starting crash monitor..." "INFO"
    Start-Process -FilePath "node" -ArgumentList "monitor-crashes.js" -NoNewWindow -PassThru
}

# Start frontend
Write-Log "Starting frontend..." "INFO"
Set-Location "..\frontend"

try {
    if (-not (Test-Path "node_modules")) {
        Write-Log "Installing frontend dependencies..." "INFO"
        npm install
    }
    
    $frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -NoNewWindow -PassThru
    Write-Log "Frontend started successfully" "SUCCESS"
} catch {
    Write-Log "Error starting frontend: $($_.Exception.Message)" "ERROR"
}

# Wait for services to be ready
Write-Log "Waiting for services to be ready..." "INFO"
Start-Sleep -Seconds 10

# Check service health
Write-Log "Checking service health..." "INFO"

# Check backend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Log "Backend health check: OK" "SUCCESS"
    } else {
        Write-Log "Backend health check: FAILED" "ERROR"
    }
} catch {
    Write-Log "Backend health check failed: $($_.Exception.Message)" "ERROR"
}

# Check LabJack
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5001/api/labjack/ain1" -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Log "LabJack health check: OK" "SUCCESS"
    } else {
        Write-Log "LabJack health check: FAILED" "ERROR"
    }
} catch {
    Write-Log "LabJack health check failed: $($_.Exception.Message)" "ERROR"
}

# Check frontend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Log "Frontend health check: OK" "SUCCESS"
    } else {
        Write-Log "Frontend health check: FAILED" "ERROR"
    }
} catch {
    Write-Log "Frontend health check failed: $($_.Exception.Message)" "ERROR"
}

Write-Log "=== HubTrack Startup Complete ===" "SUCCESS"
Write-Log "Backend API: http://localhost:5000"
Write-Log "LabJack: http://localhost:5001"
Write-Log "Frontend: http://localhost:5173"

if ($UsePM2) {
    Write-Log "PM2 Commands:" "INFO"
    Write-Log "  pm2 status          - Check process status" "INFO"
    Write-Log "  pm2 logs            - View logs" "INFO"
    Write-Log "  pm2 restart all     - Restart all processes" "INFO"
    Write-Log "  pm2 stop all        - Stop all processes" "INFO"
}

Write-Log "Press Ctrl+C to stop all services" "WARN"

# Keep script running and handle cleanup
try {
    if ($UsePM2) {
        # Wait for PM2 processes
        pm2 logs
    } else {
        # Wait for direct processes
        Wait-Process -Id $backendProcess.Id, $frontendProcess.Id -ErrorAction SilentlyContinue
    }
} catch {
    Write-Log "One or more processes have stopped" "WARN"
} finally {
    # Cleanup on exit
    Write-Log "Stopping all HubTrack services..." "WARN"
    
    if ($UsePM2) {
        pm2 stop all
        pm2 delete all
    } else {
        # Stop direct processes
        if ($backendProcess -and -not $backendProcess.HasExited) {
            Stop-Process -Id $backendProcess.Id -Force
        }
        if ($frontendProcess -and -not $frontendProcess.HasExited) {
            Stop-Process -Id $frontendProcess.Id -Force
        }
    }
    
    # Stop LabJack
    if ($labjackProcess -and -not $labjackProcess.HasExited) {
        Stop-Process -Id $labjackProcess.Id -Force
    }
    
    Write-Log "All HubTrack services stopped." "SUCCESS"
} 
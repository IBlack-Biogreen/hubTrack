# MongoDB binary path
$mongodPath = "C:\Program Files (x86)\mongodb-win32-x86_64-windows-8.0.8\bin\mongod.exe"
$dataPath = "C:\data\db"  # Default MongoDB data directory

# Get the script's directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath
Write-Host "Script directory: $scriptPath" -ForegroundColor Yellow

# Enable verbose output for debugging
$VerbosePreference = "Continue"
$DebugPreference = "Continue"
$ErrorActionPreference = "Stop"

# Function to check if MongoDB is running
function Test-MongoDBRunning {
    try {
        Write-Verbose "Checking for MongoDB process..."
        $process = Get-Process mongod -ErrorAction SilentlyContinue
        $isRunning = $null -ne $process
        Write-Verbose "MongoDB process running: $isRunning"
        return $isRunning
    } catch {
        Write-Host "Error checking MongoDB process: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to safely remove log files
function Remove-LockedFile {
    param (
        [string]$Path
    )
    try {
        if (Test-Path $Path) {
            Write-Verbose "Removing file: $Path"
            Remove-Item $Path -Force
            Write-Verbose "File removed successfully"
        } else {
            Write-Verbose "File does not exist: $Path"
        }
    } catch {
        Write-Host "Could not remove ${Path}: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "Continuing anyway..."
    }
}

# Function to kill process using a specific port
function Stop-ProcessOnPort {
    param (
        [int]$Port
    )
    try {
        Write-Verbose "Checking for process using port $Port..."
        $tcpConnection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($tcpConnection) {
            $processId = $tcpConnection.OwningProcess
            Write-Host "Found process using port $Port (PID: $processId). Stopping it..." -ForegroundColor Yellow
            Stop-Process -Id $processId -Force
            Start-Sleep -Seconds 2
            Write-Verbose "Process stopped"
        } else {
            Write-Verbose "No process found using port $Port"
        }
    } catch {
        Write-Host "Error checking process on port ${Port}: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Check if MongoDB executable exists
Write-Host "Checking MongoDB executable path..." -ForegroundColor Green
if (Test-Path $mongodPath) {
    Write-Host "MongoDB executable found at: $mongodPath" -ForegroundColor Green
} else {
    Write-Host "MongoDB executable NOT FOUND at: $mongodPath" -ForegroundColor Red
    Write-Host "Please make sure MongoDB is installed correctly" -ForegroundColor Red
    exit 1
}

# Check data directory
Write-Host "Checking MongoDB data directory..." -ForegroundColor Green
if (Test-Path $dataPath) {
    Write-Host "MongoDB data directory exists: $dataPath" -ForegroundColor Green
} else {
    Write-Host "Creating MongoDB data directory: $dataPath" -ForegroundColor Yellow
    try {
        New-Item -ItemType Directory -Path $dataPath -Force | Out-Null
        Write-Host "Data directory created successfully" -ForegroundColor Green
    } catch {
        Write-Host "Failed to create data directory: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Check if MongoDB is running
Write-Host "Checking if MongoDB is running..." -ForegroundColor Green
if (-not (Test-MongoDBRunning)) {
    Write-Host "MongoDB is not running. Starting MongoDB..." -ForegroundColor Yellow
    
    try {
        # Start MongoDB with detailed output
        Write-Host "Command: $mongodPath --dbpath $dataPath" -ForegroundColor Cyan
        $mongoProcess = Start-Process -FilePath $mongodPath -ArgumentList "--dbpath", "`"$dataPath`"" -NoNewWindow -PassThru
        
        # Wait for MongoDB to start
        Write-Host "Waiting for MongoDB to start..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        
        if (-not (Test-MongoDBRunning)) {
            Write-Host "Failed to start MongoDB after waiting. Checking process status..." -ForegroundColor Red
            if ($mongoProcess.HasExited) {
                Write-Host "MongoDB process exited with code: $($mongoProcess.ExitCode)" -ForegroundColor Red
                Write-Host "Please check MongoDB logs in the data directory" -ForegroundColor Red
            } else {
                Write-Host "MongoDB process is running but not responding normally" -ForegroundColor Yellow
            }
            exit 1
        }
    } catch {
        Write-Host "Error starting MongoDB: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}
Write-Host "MongoDB is running." -ForegroundColor Green

# Kill any existing Python processes that might be using the LabJack
Write-Host "Checking for existing LabJack processes..." -ForegroundColor Green
try {
    $pythonProcesses = Get-Process | Where-Object { $_.ProcessName -like "*python*" }
    if ($pythonProcesses) {
        foreach ($proc in $pythonProcesses) {
            Write-Host "Stopping process: $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Yellow
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 2
        Write-Host "Python processes stopped" -ForegroundColor Green
    } else {
        Write-Host "No Python processes found" -ForegroundColor Green
    }
} catch {
    Write-Host "Error stopping Python processes: $($_.Exception.Message)" -ForegroundColor Red
    # Continue anyway
}

# Remove existing log files
Write-Host "Cleaning up log files..." -ForegroundColor Green
Remove-LockedFile -Path "labjack_error.log"
Remove-LockedFile -Path "labjack_output.log"
Remove-LockedFile -Path "node_error.log"
Remove-LockedFile -Path "node_output.log"

# Check if the labjack server script exists
Write-Host "Checking for LabJack server script..." -ForegroundColor Green
if (Test-Path ".\labjack_server.py") {
    Write-Host "LabJack server script found" -ForegroundColor Green
} else {
    Write-Host "LabJack server script NOT FOUND: .\labjack_server.py" -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Red
    Write-Host "Directory contents:" -ForegroundColor Red
    Get-ChildItem -Path "." | Format-Table Name, Length, LastWriteTime
    exit 1
}

# Start the LabJack Python script in the background with error handling
Write-Host "Starting LabJack Python script..." -ForegroundColor Green
# Create empty log files
New-Item -Path "labjack_error.log" -ItemType File -Force | Out-Null
New-Item -Path "labjack_output.log" -ItemType File -Force | Out-Null

# Start the process with more detailed output and a different port
try {
    $labjackProcess = Start-Process -FilePath python -ArgumentList "-u", ".\labjack_server.py", "--port", "5001" -NoNewWindow -PassThru -RedirectStandardError "labjack_error.log" -RedirectStandardOutput "labjack_output.log"
    Write-Host "LabJack process started with PID: $($labjackProcess.Id)" -ForegroundColor Green
} catch {
    Write-Host "Error starting LabJack process: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Wait longer for the server to start and check output
Write-Host "Waiting for LabJack server to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check the output logs
Write-Host "Checking LabJack server logs..." -ForegroundColor Green
Get-Content "labjack_output.log"
Get-Content "labjack_error.log"

# Check if the process is still running
if ($labjackProcess.HasExited) {
    Write-Host "LabJack server failed to start. Exit code: $($labjackProcess.ExitCode)" -ForegroundColor Red
    Write-Host "Check labjack_error.log for details." -ForegroundColor Red
    exit 1
} else {
    Write-Host "LabJack server started successfully." -ForegroundColor Green
}

# Start the Node.js server
Write-Host "Starting Node.js server..." -ForegroundColor Green
try {
    $nodeProcess = Start-Process -FilePath node -ArgumentList ".\server.js" -NoNewWindow -PassThru -RedirectStandardError "node_error.log" -RedirectStandardOutput "node_output.log"
    Write-Host "Node.js server started with PID: $($nodeProcess.Id)" -ForegroundColor Green
} catch {
    Write-Host "Error starting Node.js server: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Wait for the Node.js server to start
Write-Host "Waiting for Node.js server to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check if the Node.js process is still running
if ($nodeProcess.HasExited) {
    Write-Host "Node.js server failed to start. Exit code: $($nodeProcess.ExitCode)" -ForegroundColor Red
    Write-Host "Check node_error.log for details." -ForegroundColor Red
    exit 1
} else {
    Write-Host "Node.js server started successfully." -ForegroundColor Green
}

Write-Host "All services started successfully!" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow

# Keep the script running and handle cleanup on exit
try {
    Wait-Process -Id $labjackProcess.Id, $nodeProcess.Id
} catch {
    Write-Host "Error waiting for processes: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # Cleanup on exit
    Write-Host "`nStopping all services..." -ForegroundColor Yellow
    if (-not $labjackProcess.HasExited) {
        Stop-Process -Id $labjackProcess.Id -Force
    }
    if (-not $nodeProcess.HasExited) {
        Stop-Process -Id $nodeProcess.Id -Force
    }
    Write-Host "All services stopped." -ForegroundColor Green
} 
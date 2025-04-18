# MongoDB binary path
$mongodPath = "C:\Program Files (x86)\mongodb-win32-x86_64-windows-8.0.8\bin\mongod.exe"
$dataPath = "C:\data\db"  # Default MongoDB data directory

# Get the script's directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath
Write-Host "Script directory: $scriptPath"

# Check if MongoDB is already running
$mongoRunning = $false
try {
    $process = Get-Process mongod -ErrorAction SilentlyContinue
    $mongoRunning = $process -ne $null
} catch {
    Write-Host "Error checking MongoDB process"
}

# Start MongoDB if not running
if (-not $mongoRunning) {
    Write-Host "MongoDB is not running. Starting MongoDB..."
    
    # Create data directory if it doesn't exist
    if (-not (Test-Path $dataPath)) {
        Write-Host "Creating MongoDB data directory..."
        New-Item -ItemType Directory -Path $dataPath -Force
    }
    
    # Start MongoDB
    Start-Process -FilePath $mongodPath -ArgumentList "--dbpath", "`"$dataPath`"" -NoNewWindow
    
    # Wait for MongoDB to start
    Write-Host "Waiting for MongoDB to start..."
    Start-Sleep -Seconds 5
}
Write-Host "MongoDB check complete"

# Kill any Python processes that might be using the LabJack
Write-Host "Checking for existing Python processes..."
try {
    $pythonProcesses = Get-Process | Where-Object { $_.ProcessName -like "*python*" }
    foreach ($proc in $pythonProcesses) {
        Write-Host "Stopping process: $($proc.ProcessName) (PID: $($proc.Id))"
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
} catch {
    Write-Host "Error stopping Python processes"
}
Start-Sleep -Seconds 2

# Remove existing log files
Write-Host "Cleaning up log files..."
try {
    if (Test-Path "labjack_error.log") { Remove-Item "labjack_error.log" -Force }
    if (Test-Path "labjack_output.log") { Remove-Item "labjack_output.log" -Force }
    if (Test-Path "node_error.log") { Remove-Item "node_error.log" -Force }
    if (Test-Path "node_output.log") { Remove-Item "node_output.log" -Force }
} catch {
    Write-Host "Error cleaning up log files"
}

# Create empty log files
Write-Host "Creating log files..."
try {
    New-Item -Path "labjack_error.log" -ItemType File -Force
    New-Item -Path "labjack_output.log" -ItemType File -Force
    New-Item -Path "node_error.log" -ItemType File -Force
    New-Item -Path "node_output.log" -ItemType File -Force
} catch {
    Write-Host "Error creating log files"
}

# Start the LabJack server
Write-Host "Starting LabJack Python script..."
try {
    if (Test-Path ".\labjack_server.py") {
        $labjackProcess = Start-Process -FilePath python -ArgumentList "-u", ".\labjack_server.py", "--port", "5001" -NoNewWindow -PassThru -RedirectStandardError "labjack_error.log" -RedirectStandardOutput "labjack_output.log"
        Write-Host "LabJack process started with PID: $($labjackProcess.Id)"
    } else {
        Write-Host "LabJack server script not found"
    }
} catch {
    Write-Host "Error starting LabJack process"
}

# Wait for the server to start
Write-Host "Waiting for LabJack server to initialize..."
Start-Sleep -Seconds 5

# Kill any Node.js processes that might be using port 5000
Write-Host "Checking for processes using port 5000..."
try {
    $connections = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        $pid = $conn.OwningProcess
        Write-Host "Stopping process using port 5000 (PID: $pid)"
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
} catch {
    Write-Host "Error checking processes on port 5000"
}

# Start the Node.js server
Write-Host "Starting Node.js server..."
try {
    if (Test-Path "server.js") {
        $nodeProcess = Start-Process -FilePath node -ArgumentList "server.js" -NoNewWindow -PassThru -RedirectStandardError "node_error.log" -RedirectStandardOutput "node_output.log"
        Write-Host "Node.js process started with PID: $($nodeProcess.Id)"
    } else {
        Write-Host "server.js not found"
    }
} catch {
    Write-Host "Error starting Node.js process"
}

# Wait for the server to start
Write-Host "Waiting for Node.js server to initialize..."
Start-Sleep -Seconds 5

# Display content of log files
Write-Host "=== Node.js Server Logs ==="
if (Test-Path "node_output.log") { Get-Content "node_output.log" }
if (Test-Path "node_error.log") { Get-Content "node_error.log" }

Write-Host "=== LabJack Server Logs ==="
if (Test-Path "labjack_output.log") { Get-Content "labjack_output.log" }
if (Test-Path "labjack_error.log") { Get-Content "labjack_error.log" }

Write-Host "All servers have been started. You can now access the application." 
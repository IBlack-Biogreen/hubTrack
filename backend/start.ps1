# MongoDB binary path
$mongodPath = "C:\Program Files (x86)\mongodb-win32-x86_64-windows-8.0.8\bin\mongod.exe"
$dataPath = "C:\data\db"  # Default MongoDB data directory

# Function to check if MongoDB is running
function Test-MongoDBRunning {
    $process = Get-Process mongod -ErrorAction SilentlyContinue
    return $process -ne $null
}

# Function to safely remove log files
function Remove-LockedFile {
    param (
        [string]$Path
    )
    try {
        if (Test-Path $Path) {
            Remove-Item $Path -Force
        }
    } catch {
        Write-Host "Could not remove $Path, but continuing anyway..."
    }
}

# Function to kill process using a specific port
function Stop-ProcessOnPort {
    param (
        [int]$Port
    )
    $process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($process) {
        $pid = $process.OwningProcess
        Write-Host "Found process using port $Port (PID: $pid). Stopping it..."
        Stop-Process -Id $pid -Force
        Start-Sleep -Seconds 2
    }
}

# Check if MongoDB is running
Write-Host "Checking if MongoDB is running..."
if (-not (Test-MongoDBRunning)) {
    Write-Host "Starting MongoDB..."
    
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
    
    if (-not (Test-MongoDBRunning)) {
        Write-Host "Failed to start MongoDB. Please check the path and try again."
        exit 1
    }
}
Write-Host "MongoDB is running."

# Kill any existing Python processes that might be using the LabJack
Write-Host "Checking for existing LabJack processes..."
Get-Process | Where-Object { $_.ProcessName -like "*python*" } | ForEach-Object {
    Write-Host "Stopping process: $($_.ProcessName) (PID: $($_.Id))"
    Stop-Process -Id $_.Id -Force
}
Start-Sleep -Seconds 2

# Remove existing log files
Write-Host "Cleaning up log files..."
Remove-LockedFile -Path "labjack_error.log"
Remove-LockedFile -Path "labjack_output.log"

# Start the LabJack Python script in the background with error handling
Write-Host "Starting LabJack Python script..."
# Create empty log files
New-Item -Path "labjack_error.log" -ItemType File -Force
New-Item -Path "labjack_output.log" -ItemType File -Force

# Start the process with more detailed output and a different port
$labjackProcess = Start-Process -FilePath python -ArgumentList "-u", "labjack_server.py", "--port", "5001" -NoNewWindow -PassThru -RedirectStandardError "labjack_error.log" -RedirectStandardOutput "labjack_output.log"

# Wait longer for the server to start and check output
Write-Host "Waiting for LabJack server to initialize..."
Start-Sleep -Seconds 5

# Check the output logs
Write-Host "Checking LabJack server logs..."
Get-Content "labjack_output.log"
Get-Content "labjack_error.log"

# Check if the process is still running
if ($labjackProcess.HasExited) {
    Write-Host "LabJack server failed to start. Check labjack_error.log for details."
    exit 1
} else {
    Write-Host "LabJack server started successfully."
}

# Test the LabJack server with retries
Write-Host "Testing LabJack server connection..."
$maxRetries = 3
$retryCount = 0
$connected = $false

while (-not $connected -and $retryCount -lt $maxRetries) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5001/api/labjack/ain1" -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            $connected = $true
            Write-Host "LabJack server is responding successfully."
            Write-Host "Response: $($response.Content)"
        }
    } catch {
        $retryCount++
        if ($retryCount -lt $maxRetries) {
            Write-Host "Attempt $retryCount failed. Retrying in 2 seconds..."
            # Check logs again
            Write-Host "Current logs:"
            Get-Content "labjack_output.log"
            Get-Content "labjack_error.log"
            Start-Sleep -Seconds 2
        } else {
            Write-Host "Failed to connect to LabJack server after $maxRetries attempts."
            Write-Host "Final logs:"
            Get-Content "labjack_output.log"
            Get-Content "labjack_error.log"
            exit 1
        }
    }
}

# Check and kill any process using port 5000
Write-Host "Checking for processes using port 5000..."
Stop-ProcessOnPort -Port 5000

# Start the Node.js server
Write-Host "Starting Node.js server..."
node server.js 
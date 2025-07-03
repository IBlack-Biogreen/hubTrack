# HubTrack Log Viewer
# This script helps view and analyze logs for debugging crashes

param(
    [string]$LogType = "all",
    [int]$Lines = 50,
    [switch]$Follow = $false
)

# Function to write colored output
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $color = switch ($Level) {
        "ERROR" { "Red" }
        "WARN" { "Yellow" }
        "SUCCESS" { "Green" }
        "CRASH" { "Magenta" }
        default { "White" }
    }
    
    Write-Host $Message -ForegroundColor $color
}

# Set working directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Log "=== HubTrack Log Viewer ===" "SUCCESS"

# Define log files
$logFiles = @{
    "server" = ".\backend\logs\server-$(Get-Date -Format 'yyyy-MM-dd').log"
    "crashes" = ".\backend\logs\crashes.log"
    "pm2-error" = ".\backend\logs\pm2-error.log"
    "pm2-out" = ".\backend\logs\pm2-out.log"
    "pm2-combined" = ".\backend\logs\pm2-combined.log"
    "labjack-error" = ".\backend\labjack_error.log"
    "labjack-output" = ".\backend\labjack_output.log"
    "node-error" = ".\backend\node_error.log"
    "node-output" = ".\backend\node_output.log"
}

# Function to display log content
function Show-Log {
    param(
        [string]$LogPath,
        [string]$LogName,
        [int]$LineCount = 50
    )
    
    if (Test-Path $LogPath) {
        Write-Log "=== $LogName ===" "SUCCESS"
        Write-Log "File: $LogPath"
        
        try {
            $content = Get-Content $LogPath -Tail $LineCount -ErrorAction Stop
            
            if ($content.Count -eq 0) {
                Write-Log "Log file is empty" "WARN"
            } else {
                foreach ($line in $content) {
                    # Color code different log levels
                    if ($line -match "\[ERROR\]|\[FATAL\]") {
                        Write-Log $line "ERROR"
                    } elseif ($line -match "\[WARN\]") {
                        Write-Log $line "WARN"
                    } elseif ($line -match "CRASH:") {
                        Write-Log $line "CRASH"
                    } else {
                        Write-Host $line
                    }
                }
            }
        } catch {
            Write-Log "Error reading log file: $($_.Exception.Message)" "ERROR"
        }
        
        Write-Log ""
    } else {
        Write-Log "Log file not found: $LogPath" "WARN"
    }
}

# Function to show crash summary
function Show-CrashSummary {
    Write-Log "=== CRASH SUMMARY ===" "CRASH"
    
    $crashLog = $logFiles["crashes"]
    if (Test-Path $crashLog) {
        try {
            $crashes = Get-Content $crashLog | Where-Object { $_ -match "CRASH:" }
            $crashCount = $crashes.Count
            
            Write-Log "Total crashes recorded: $crashCount" "CRASH"
            
            if ($crashCount -gt 0) {
                Write-Log "Recent crashes:" "CRASH"
                $crashes | Select-Object -Last 5 | ForEach-Object {
                    Write-Log "  $_" "CRASH"
                }
            }
        } catch {
            Write-Log "Error reading crash log: $($_.Exception.Message)" "ERROR"
        }
    } else {
        Write-Log "No crash log found" "SUCCESS"
    }
    
    Write-Log ""
}

# Function to show system status
function Show-SystemStatus {
    Write-Log "=== SYSTEM STATUS ===" "SUCCESS"
    
    # Check if processes are running
    $processes = @{
        "Backend (Port 5000)" = @{ Port = 5000; Status = "Unknown" }
        "LabJack (Port 5001)" = @{ Port = 5001; Status = "Unknown" }
        "Frontend (Port 5173)" = @{ Port = 5173; Status = "Unknown" }
    }
    
    foreach ($service in $processes.Keys) {
        $port = $processes[$service].Port
        try {
            $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
            if ($connections) {
                $processes[$service].Status = "Running"
                Write-Log "$service : Running" "SUCCESS"
            } else {
                $processes[$service].Status = "Stopped"
                Write-Log "$service : Stopped" "ERROR"
            }
        } catch {
            $processes[$service].Status = "Unknown"
            Write-Log "$service : Unknown" "WARN"
        }
    }
    
    Write-Log ""
}

# Main execution
switch ($LogType.ToLower()) {
    "crashes" {
        Show-CrashSummary
        Show-Log $logFiles["crashes"] "CRASH LOG" $Lines
    }
    "server" {
        Show-Log $logFiles["server"] "SERVER LOG" $Lines
    }
    "pm2" {
        Show-Log $logFiles["pm2-error"] "PM2 ERROR LOG" $Lines
        Show-Log $logFiles["pm2-out"] "PM2 OUTPUT LOG" $Lines
    }
    "labjack" {
        Show-Log $logFiles["labjack-error"] "LABJACK ERROR LOG" $Lines
        Show-Log $logFiles["labjack-output"] "LABJACK OUTPUT LOG" $Lines
    }
    "node" {
        Show-Log $logFiles["node-error"] "NODE ERROR LOG" $Lines
        Show-Log $logFiles["node-output"] "NODE OUTPUT LOG" $Lines
    }
    "status" {
        Show-SystemStatus
    }
    default {
        Show-SystemStatus
        Show-CrashSummary
        Show-Log $logFiles["server"] "SERVER LOG" $Lines
        Show-Log $logFiles["crashes"] "CRASH LOG" $Lines
    }
}

if ($Follow) {
    Write-Log "Following logs (press Ctrl+C to stop)..." "INFO"
    try {
        Get-Content $logFiles["server"] -Wait -Tail 10
    } catch {
        Write-Log "Error following logs: $($_.Exception.Message)" "ERROR"
    }
}

Write-Log "=== Log Viewer Complete ===" "SUCCESS" 
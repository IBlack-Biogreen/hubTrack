# HubTrack Startup Log Viewer
# This script displays the startup log file for troubleshooting

param(
    [switch]$Follow = $false,
    [switch]$Clear = $false
)

$logPath = Join-Path $PSScriptRoot "startup.log"

Write-Host "=== HubTrack Startup Log Viewer ===" -ForegroundColor Cyan
Write-Host "Log File: $logPath" -ForegroundColor Yellow

if (-not (Test-Path $logPath)) {
    Write-Host "No startup log file found. The startup script may not have run yet." -ForegroundColor Yellow
    exit 0
}

if ($Clear) {
    Clear-Content $logPath
    Write-Host "Startup log cleared." -ForegroundColor Green
    exit 0
}

if ($Follow) {
    Write-Host "Following log file (press Ctrl+C to stop)..." -ForegroundColor Green
    Get-Content $logPath -Wait -Tail 0
} else {
    Write-Host "Recent startup log entries:" -ForegroundColor Green
    Get-Content $logPath -Tail 50
}

Write-Host "===============================" -ForegroundColor Cyan 
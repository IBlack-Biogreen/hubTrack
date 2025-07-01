# HubTrack Windows Startup Task Setup
# This script creates a Windows Task Scheduler task to run HubTrack on system startup

param(
    [string]$TaskName = "HubTrack Startup",
    [string]$TaskDescription = "Starts HubTrack backend and frontend services on system startup",
    [switch]$RunAsCurrentUser = $true,
    [switch]$RunAtLogon = $true,
    [switch]$RemoveTask = $false
)

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "This script requires administrator privileges to create scheduled tasks." -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    exit 1
}

# Get the script's directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$startupScriptPath = Join-Path $scriptPath "startup-hubtrack.ps1"

# Check if the startup script exists
if (-not (Test-Path $startupScriptPath)) {
    Write-Host "Startup script not found: $startupScriptPath" -ForegroundColor Red
    Write-Host "Please make sure startup-hubtrack.ps1 exists in the same directory." -ForegroundColor Yellow
    exit 1
}

Write-Host "=== HubTrack Startup Task Setup ===" -ForegroundColor Cyan
Write-Host "Script Path: $scriptPath" -ForegroundColor Yellow
Write-Host "Startup Script: $startupScriptPath" -ForegroundColor Yellow
Write-Host "Task Name: $TaskName" -ForegroundColor Yellow
Write-Host "===================================" -ForegroundColor Cyan

if ($RemoveTask) {
    # Remove existing task
    Write-Host "Removing existing task: $TaskName" -ForegroundColor Yellow
    try {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
        Write-Host "Task removed successfully." -ForegroundColor Green
    } catch {
        Write-Host "Task does not exist or could not be removed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    exit 0
}

# Remove existing task if it exists
Write-Host "Checking for existing task..." -ForegroundColor Yellow
try {
    $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Write-Host "Removing existing task..." -ForegroundColor Yellow
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "Existing task removed." -ForegroundColor Green
    }
} catch {
    Write-Host "No existing task found." -ForegroundColor Green
}

# Create the action
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"$startupScriptPath`" -KioskMode"

# Create the trigger
if ($RunAtLogon) {
    $trigger = New-ScheduledTaskTrigger -AtLogOn
} else {
    $trigger = New-ScheduledTaskTrigger -AtStartup
}

# Create the settings
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable

# Create the principal
if ($RunAsCurrentUser) {
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
} else {
    $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
}

# Create the task
Write-Host "Creating scheduled task..." -ForegroundColor Yellow
try {
    $task = Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description $TaskDescription
    
    Write-Host "Task created successfully!" -ForegroundColor Green
    Write-Host "Task Name: $($task.TaskName)" -ForegroundColor Cyan
    Write-Host "Task Path: $($task.TaskPath)" -ForegroundColor Cyan
    Write-Host "Next Run Time: $($task.NextRunTime)" -ForegroundColor Cyan
    
    # Enable the task
    Enable-ScheduledTask -TaskName $TaskName
    Write-Host "Task enabled and ready to run on startup." -ForegroundColor Green
    
} catch {
    Write-Host "Error creating task: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Setup Complete ===" -ForegroundColor Green
Write-Host "HubTrack will now start automatically on system startup." -ForegroundColor Cyan
Write-Host "To test the task manually, run:" -ForegroundColor Yellow
Write-Host "Start-ScheduledTask -TaskName `"$TaskName`"" -ForegroundColor White
Write-Host "To remove the task, run:" -ForegroundColor Yellow
Write-Host ".\setup-startup-task.ps1 -RemoveTask" -ForegroundColor White
Write-Host "=====================" -ForegroundColor Green 
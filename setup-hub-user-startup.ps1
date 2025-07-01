# HubTrack Windows Startup Task Setup for "hub" user
# This script creates a Windows Task Scheduler task to run HubTrack when "hub" user logs in

param(
    [string]$TaskName = "HubTrack Startup - hub user",
    [string]$TaskDescription = "Starts HubTrack backend and frontend services when hub user logs in",
    [string]$HubUsername = "hub",
    [switch]$RemoveTask = $false
)

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "This script requires administrator privileges to create scheduled tasks." -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    exit 1
}

# Set the project path to Public Documents
$projectPath = "C:\Users\Public\Documents\hubTrack\hubTrack"
$startupScriptPath = Join-Path $projectPath "startup-hub-user.ps1"

# Check if the startup script exists
if (-not (Test-Path $startupScriptPath)) {
    Write-Host "Startup script not found: $startupScriptPath" -ForegroundColor Red
    Write-Host "Please make sure startup-hub-user.ps1 exists in the project directory." -ForegroundColor Yellow
    exit 1
}

# Check if the hub user exists
try {
    $hubUser = Get-LocalUser -Name $HubUsername -ErrorAction Stop
    Write-Host "Found hub user: $($hubUser.Name)" -ForegroundColor Green
} catch {
    Write-Host "Hub user '$HubUsername' not found. Please create the user first." -ForegroundColor Red
    exit 1
}

Write-Host "=== HubTrack Startup Task Setup for hub user ===" -ForegroundColor Cyan
Write-Host "Project Path: $projectPath" -ForegroundColor Yellow
Write-Host "Startup Script: $startupScriptPath" -ForegroundColor Yellow
Write-Host "Task Name: $TaskName" -ForegroundColor Yellow
Write-Host "Hub Username: $HubUsername" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Cyan

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
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$startupScriptPath`""

# Create the trigger - run when hub user logs in
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $HubUsername

# Create the settings
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable -Hidden

# Create the principal - run as hub user
$principal = New-ScheduledTaskPrincipal -UserId $HubUsername -LogonType Interactive -RunLevel Highest

# Create the task
Write-Host "Creating scheduled task for hub user..." -ForegroundColor Yellow
try {
    $task = Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description $TaskDescription
    
    Write-Host "Task created successfully!" -ForegroundColor Green
    Write-Host "Task Name: $($task.TaskName)" -ForegroundColor Cyan
    Write-Host "Task Path: $($task.TaskPath)" -ForegroundColor Cyan
    Write-Host "Next Run Time: $($task.NextRunTime)" -ForegroundColor Cyan
    Write-Host "User: $HubUsername" -ForegroundColor Cyan
    
    # Enable the task
    Enable-ScheduledTask -TaskName $TaskName
    Write-Host "Task enabled and ready to run when hub user logs in." -ForegroundColor Green
    
} catch {
    Write-Host "Error creating task: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Setup Complete ===" -ForegroundColor Green
Write-Host "HubTrack will now start automatically when the hub user logs in." -ForegroundColor Cyan
Write-Host "Note: The PowerShell window will be hidden during startup." -ForegroundColor Yellow
Write-Host "To view startup logs, run: .\view-startup-log.ps1" -ForegroundColor White
Write-Host "To test the task manually, run:" -ForegroundColor Yellow
Write-Host "Start-ScheduledTask -TaskName `"$TaskName`"" -ForegroundColor White
Write-Host "To remove the task, run:" -ForegroundColor Yellow
Write-Host ".\setup-hub-user-startup.ps1 -RemoveTask" -ForegroundColor White
Write-Host "=====================" -ForegroundColor Green 
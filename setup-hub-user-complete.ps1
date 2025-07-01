# Complete Hub User Setup Script
# This script sets up everything needed for the hub user to run HubTrack automatically

param(
    [string]$HubUsername = "hub",
    [switch]$RemoveAll = $false
)

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "This script requires administrator privileges." -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host "=== Complete Hub User Setup ===" -ForegroundColor Cyan
Write-Host "Hub Username: $HubUsername" -ForegroundColor Yellow
Write-Host "Project Location: C:\Users\Public\Documents\hubTrack" -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Cyan

# Get the script's directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

if ($RemoveAll) {
    Write-Host "`nRemoving all HubTrack configurations for hub user..." -ForegroundColor Yellow
    
    # Remove scheduled task
    try {
        Unregister-ScheduledTask -TaskName "HubTrack Startup - hub user" -Confirm:$false -ErrorAction SilentlyContinue
        Write-Host "Removed scheduled task." -ForegroundColor Green
    } catch {
        Write-Host "No scheduled task found to remove." -ForegroundColor Yellow
    }
    
    # Remove Chrome shortcuts
    $hubUserProfile = "C:\Users\$HubUsername"
    $startupFolder = "$hubUserProfile\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup"
    $desktopFolder = "$hubUserProfile\Desktop"
    
    $chromeShortcuts = @(
        "$startupFolder\Chrome HubTrack.lnk",
        "$desktopFolder\Chrome HubTrack.lnk"
    )
    
    foreach ($shortcut in $chromeShortcuts) {
        if (Test-Path $shortcut) {
            Remove-Item $shortcut -Force
            Write-Host "Removed Chrome shortcut: $shortcut" -ForegroundColor Green
        }
    }
    
    Write-Host "All HubTrack configurations removed for hub user." -ForegroundColor Green
    exit 0
}

# Check if hub user exists
try {
    $hubUser = Get-LocalUser -Name $HubUsername -ErrorAction Stop
    Write-Host "Found hub user: $($hubUser.Name)" -ForegroundColor Green
} catch {
    Write-Host "Hub user '$HubUsername' not found. Please create the user first." -ForegroundColor Red
    Write-Host "You can create the user with: New-LocalUser -Name '$HubUsername' -Description 'HubTrack Kiosk User'" -ForegroundColor Yellow
    exit 1
}

# Check if project exists
$projectPath = "C:\Users\Public\Documents\hubTrack\hubTrack"
if (-not (Test-Path $projectPath)) {
    Write-Host "Project not found at: $projectPath" -ForegroundColor Red
    Write-Host "Please ensure the project is located at the correct path." -ForegroundColor Yellow
    exit 1
}

Write-Host "`nStep 1: Setting up HubTrack startup task..." -ForegroundColor Green
# Run the hub user startup task setup
$startupTaskScript = Join-Path $scriptPath "setup-hub-user-startup.ps1"
if (Test-Path $startupTaskScript) {
    try {
        & $startupTaskScript -HubUsername $HubUsername
        Write-Host "HubTrack startup task configured successfully." -ForegroundColor Green
    } catch {
        Write-Host "Error setting up startup task: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Startup task setup script not found: $startupTaskScript" -ForegroundColor Red
    exit 1
}

Write-Host "`nStep 2: Setting up Chrome startup configuration..." -ForegroundColor Green
# Run the Chrome startup configuration
$chromeSetupScript = Join-Path $scriptPath "setup-chrome-startup.ps1"
if (Test-Path $chromeSetupScript) {
    try {
        & $chromeSetupScript -HubUsername $HubUsername
        Write-Host "Chrome startup configuration completed successfully." -ForegroundColor Green
    } catch {
        Write-Host "Error setting up Chrome configuration: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Chrome setup script not found: $chromeSetupScript" -ForegroundColor Red
    exit 1
}

Write-Host "`nStep 3: Setting up user permissions..." -ForegroundColor Green
# Set up permissions for the hub user to access the project
try {
    $projectAcl = Get-Acl $projectPath
    $hubUserSid = (Get-LocalUser -Name $HubUsername).SID
    $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule($hubUserSid, "ReadAndExecute", "ContainerInherit,ObjectInherit", "None", "Allow")
    $projectAcl.SetAccessRule($accessRule)
    Set-Acl -Path $projectPath -AclObject $projectAcl
    
    Write-Host "Set project permissions for hub user." -ForegroundColor Green
} catch {
    Write-Host "Warning: Could not set project permissions: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Set up permissions for Node.js and Python if needed
$nodePaths = @(
    "${env:ProgramFiles}\nodejs",
    "${env:ProgramFiles(x86)}\nodejs"
)

foreach ($nodePath in $nodePaths) {
    if (Test-Path $nodePath) {
        try {
            $nodeAcl = Get-Acl $nodePath
            $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule($hubUserSid, "ReadAndExecute", "ContainerInherit,ObjectInherit", "None", "Allow")
            $nodeAcl.SetAccessRule($accessRule)
            Set-Acl -Path $nodePath -AclObject $nodeAcl
            Write-Host "Set Node.js permissions for hub user." -ForegroundColor Green
            break
        } catch {
            Write-Host "Warning: Could not set Node.js permissions: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

Write-Host "`nStep 4: Testing the setup..." -ForegroundColor Green
# Test if we can run the startup script manually
$startupScript = Join-Path $projectPath "startup-hub-user.ps1"
if (Test-Path $startupScript) {
    Write-Host "Startup script found and ready: $startupScript" -ForegroundColor Green
} else {
    Write-Host "Warning: Startup script not found: $startupScript" -ForegroundColor Yellow
}

Write-Host "`n=== Setup Complete ===" -ForegroundColor Green
Write-Host "HubTrack is now configured to start automatically when the hub user logs in." -ForegroundColor Cyan
Write-Host "" -ForegroundColor White
Write-Host "What happens when hub user logs in:" -ForegroundColor Yellow
Write-Host "1. HubTrack backend and frontend services will start automatically" -ForegroundColor White
Write-Host "2. Chrome will open in fullscreen kiosk mode to http://localhost:5173" -ForegroundColor White
Write-Host "3. The system will be ready for kiosk operation" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "To test the setup:" -ForegroundColor Yellow
Write-Host "1. Switch to the hub user account" -ForegroundColor White
Write-Host "2. Log in and wait for services to start" -ForegroundColor White
Write-Host "3. Chrome should open automatically in fullscreen mode" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "To remove all configurations:" -ForegroundColor Yellow
Write-Host ".\setup-hub-user-complete.ps1 -RemoveAll" -ForegroundColor White
Write-Host "=====================" -ForegroundColor Green 
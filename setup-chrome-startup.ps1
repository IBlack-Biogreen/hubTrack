# Chrome Startup Configuration for Hub User
# This script configures Chrome to start automatically in fullscreen mode for the hub user

param(
    [string]$HubUsername = "hub",
    [string]$ChromeShortcutName = "Chrome HubTrack",
    [switch]$RemoveConfig = $false
)

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "This script requires administrator privileges to configure startup items." -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    exit 1
}

# Get hub user profile path
$hubUserProfile = "C:\Users\$HubUsername"
$startupFolder = "$hubUserProfile\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup"
$desktopFolder = "$hubUserProfile\Desktop"

Write-Host "=== Chrome Startup Configuration for Hub User ===" -ForegroundColor Cyan
Write-Host "Hub Username: $HubUsername" -ForegroundColor Yellow
Write-Host "User Profile: $hubUserProfile" -ForegroundColor Yellow
Write-Host "Startup Folder: $startupFolder" -ForegroundColor Yellow
Write-Host "Desktop Folder: $desktopFolder" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan

# Check if hub user exists
try {
    $hubUser = Get-LocalUser -Name $HubUsername -ErrorAction Stop
    Write-Host "Found hub user: $($hubUser.Name)" -ForegroundColor Green
} catch {
    Write-Host "Hub user '$HubUsername' not found. Please create the user first." -ForegroundColor Red
    exit 1
}

# Check if Chrome is installed
$chromePaths = @(
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$hubUserProfile\AppData\Local\Google\Chrome\Application\chrome.exe"
)

$chromePath = $null
foreach ($path in $chromePaths) {
    if (Test-Path $path) {
        $chromePath = $path
        Write-Host "Found Chrome at: $chromePath" -ForegroundColor Green
        break
    }
}

if (-not $chromePath) {
    Write-Host "Chrome not found in standard locations. Please install Chrome first." -ForegroundColor Red
    exit 1
}

if ($RemoveConfig) {
    # Remove Chrome shortcut from startup
    $startupShortcut = Join-Path $startupFolder "$ChromeShortcutName.lnk"
    $desktopShortcut = Join-Path $desktopFolder "$ChromeShortcutName.lnk"
    
    if (Test-Path $startupShortcut) {
        Remove-Item $startupShortcut -Force
        Write-Host "Removed Chrome shortcut from startup folder." -ForegroundColor Green
    }
    
    if (Test-Path $desktopShortcut) {
        Remove-Item $desktopShortcut -Force
        Write-Host "Removed Chrome shortcut from desktop." -ForegroundColor Green
    }
    
    Write-Host "Chrome startup configuration removed." -ForegroundColor Green
    exit 0
}

# Create startup folder if it doesn't exist
if (-not (Test-Path $startupFolder)) {
    New-Item -ItemType Directory -Path $startupFolder -Force | Out-Null
    Write-Host "Created startup folder: $startupFolder" -ForegroundColor Green
}

# Create desktop folder if it doesn't exist
if (-not (Test-Path $desktopFolder)) {
    New-Item -ItemType Directory -Path $desktopFolder -Force | Out-Null
    Write-Host "Created desktop folder: $desktopFolder" -ForegroundColor Green
}

# Create Chrome shortcut for startup
$startupShortcut = Join-Path $startupFolder "$ChromeShortcutName.lnk"
$desktopShortcut = Join-Path $desktopFolder "$ChromeShortcutName.lnk"

# Chrome arguments for fullscreen kiosk mode with DevTools enabled
$chromeArgs = @(
    "--start-fullscreen",
    "--kiosk",
    "--disable-web-security",
    "--auto-open-devtools-for-tabs",
    "--disable-features=VizDisplayCompositor",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--disable-features=TranslateUI",
    "--disable-ipc-flooding-protection",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-default-apps",
    "--disable-popup-blocking",
    "--disable-notifications",
    "--disable-extensions",
    "--disable-plugins",
    "--disable-images",
    "--disable-javascript",
    "--disable-java",
    "--disable-sync",
    "--disable-translate",
    "--disable-logging",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-software-rasterizer",
    "--disable-background-networking",
    "--disable-component-extensions-with-background-pages",
    "--disable-background-mode",
    "--disable-client-side-phishing-detection",
    "--disable-component-update",
    "--disable-domain-reliability",
    "--disable-features=AudioServiceOutOfProcess",
    "--disable-hang-monitor",
    "--disable-prompt-on-repost",
    "--disable-sync-preferences",
    "--disable-web-resources",
    "--disable-features=VizDisplayCompositor",
    "--force-color-profile=srgb",
    "--metrics-recording-only",
    "--no-sandbox",
    "--safebrowsing-disable-auto-update",
    "--silent-launch",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "http://localhost:5173"
)

$chromeArgsString = $chromeArgs -join " "

# Create WScript Shell object for creating shortcuts
$WScriptShell = New-Object -ComObject WScript.Shell

# Create startup shortcut
try {
    $shortcut = $WScriptShell.CreateShortcut($startupShortcut)
    $shortcut.TargetPath = $chromePath
    $shortcut.Arguments = $chromeArgsString
    $shortcut.WorkingDirectory = Split-Path $chromePath
    $shortcut.Description = "Chrome HubTrack Kiosk Mode"
    $shortcut.WindowStyle = 7  # Minimized
    $shortcut.Save()
    
    Write-Host "Created Chrome startup shortcut: $startupShortcut" -ForegroundColor Green
} catch {
    Write-Host "Error creating startup shortcut: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Create desktop shortcut (for testing)
try {
    $shortcut = $WScriptShell.CreateShortcut($desktopShortcut)
    $shortcut.TargetPath = $chromePath
    $shortcut.Arguments = $chromeArgsString
    $shortcut.WorkingDirectory = Split-Path $chromePath
    $shortcut.Description = "Chrome HubTrack Kiosk Mode (Desktop)"
    $shortcut.WindowStyle = 7  # Minimized
    $shortcut.Save()
    
    Write-Host "Created Chrome desktop shortcut: $desktopShortcut" -ForegroundColor Green
} catch {
    Write-Host "Error creating desktop shortcut: $($_.Exception.Message)" -ForegroundColor Red
}

# Set proper permissions for the hub user
try {
    $acl = Get-Acl $startupFolder
    $hubUserSid = (Get-LocalUser -Name $HubUsername).SID
    $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule($hubUserSid, "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
    $acl.SetAccessRule($accessRule)
    Set-Acl -Path $startupFolder -AclObject $acl
    
    Write-Host "Set permissions for hub user on startup folder." -ForegroundColor Green
} catch {
    Write-Host "Warning: Could not set permissions for hub user: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n=== Chrome Configuration Complete ===" -ForegroundColor Green
Write-Host "Chrome will now start automatically in fullscreen kiosk mode when hub user logs in." -ForegroundColor Cyan
Write-Host "Target URL: http://localhost:5173" -ForegroundColor Yellow
Write-Host "Startup Shortcut: $startupShortcut" -ForegroundColor Yellow
Write-Host "Desktop Shortcut: $desktopShortcut" -ForegroundColor Yellow
Write-Host "To remove the configuration, run:" -ForegroundColor Yellow
Write-Host ".\setup-chrome-startup.ps1 -RemoveConfig" -ForegroundColor White
Write-Host "=====================================" -ForegroundColor Green 
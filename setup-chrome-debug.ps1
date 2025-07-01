# Chrome Debug Setup for Hub User
# This script creates a Chrome shortcut with DevTools enabled for debugging

param(
    [string]$HubUsername = "hub",
    [string]$ChromeShortcutName = "Chrome HubTrack Debug"
)

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "This script requires administrator privileges." -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    exit 1
}

# Get hub user profile path
$hubUserProfile = "C:\Users\$HubUsername"
$desktopFolder = "$hubUserProfile\Desktop"

Write-Host "=== Chrome Debug Setup for Hub User ===" -ForegroundColor Cyan
Write-Host "Hub Username: $HubUsername" -ForegroundColor Yellow
Write-Host "Desktop Folder: $desktopFolder" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Cyan

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

# Create desktop folder if it doesn't exist
if (-not (Test-Path $desktopFolder)) {
    New-Item -ItemType Directory -Path $desktopFolder -Force | Out-Null
    Write-Host "Created desktop folder: $desktopFolder" -ForegroundColor Green
}

# Create Chrome debug shortcut
$desktopShortcut = Join-Path $desktopFolder "$ChromeShortcutName.lnk"

# Chrome arguments for debug mode (not kiosk, with DevTools)
$chromeArgs = @(
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

# Create debug shortcut
try {
    $shortcut = $WScriptShell.CreateShortcut($desktopShortcut)
    $shortcut.TargetPath = $chromePath
    $shortcut.Arguments = $chromeArgsString
    $shortcut.WorkingDirectory = Split-Path $chromePath
    $shortcut.Description = "Chrome HubTrack Debug Mode (with DevTools)"
    $shortcut.WindowStyle = 1  # Normal window
    $shortcut.Save()
    
    Write-Host "Created Chrome debug shortcut: $desktopShortcut" -ForegroundColor Green
} catch {
    Write-Host "Error creating debug shortcut: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Chrome Debug Setup Complete ===" -ForegroundColor Green
Write-Host "Chrome debug shortcut created on hub user desktop." -ForegroundColor Cyan
Write-Host "This version will open DevTools automatically for debugging." -ForegroundColor Yellow
Write-Host "Shortcut: $desktopShortcut" -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Green 
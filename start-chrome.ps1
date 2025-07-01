# Chrome Startup Script for HubTrack
# This script opens Chrome with a static loading page

# Set the project path
$projectPath = "C:\Users\Public\Documents\hubTrack\hubTrack"
$logPath = Join-Path $projectPath "chrome-startup.log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Add-Content -Path $logPath -Value $logMessage
}

Write-Log "=== Chrome Startup Script ==="
Write-Log "Opening Chrome with static loading page..."

# Find Chrome executable
$chromePaths = @(
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
)

$chromePath = $null
foreach ($path in $chromePaths) {
    if (Test-Path $path) {
        $chromePath = $path
        Write-Log "Found Chrome at: $chromePath"
        break
    }
}

if (-not $chromePath) {
    Write-Log "Chrome not found in standard locations" "ERROR"
    exit 1
}

# Chrome arguments for fullscreen kiosk mode
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
    "file:///C:/Users/Public/Documents/hubTrack/hubTrack/static-loading.html"
)

$chromeArgsString = $chromeArgs -join " "

# Open Chrome immediately
Write-Log "Opening Chrome with kiosk mode..."
try {
    $chromeProcess = Start-Process -FilePath $chromePath -ArgumentList $chromeArgsString -PassThru
    Write-Log "Chrome opened with PID: $($chromeProcess.Id)"
} catch {
    Write-Log "Error opening Chrome: $($_.Exception.Message)" "ERROR"
    exit 1
}

Write-Log "Chrome startup complete" 
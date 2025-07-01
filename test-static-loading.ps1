# Test Static Loading Page
# This script tests the static loading page functionality

param(
    [switch]$OpenChrome = $false
)

# Set the project path
$projectPath = "C:\Users\Public\Documents\hubTrack\hubTrack"
$staticLoadingPath = Join-Path $projectPath "static-loading.html"

Write-Host "=== Testing Static Loading Page ===" -ForegroundColor Cyan
Write-Host "Static loading file: $staticLoadingPath" -ForegroundColor Yellow

# Check if static loading file exists
if (-not (Test-Path $staticLoadingPath)) {
    Write-Host "ERROR: Static loading file not found!" -ForegroundColor Red
    Write-Host "Expected location: $staticLoadingPath" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Static loading file found" -ForegroundColor Green

# Test file content
$content = Get-Content $staticLoadingPath -Raw
if ($content -match "HubTrack") {
    Write-Host "✓ File contains HubTrack branding" -ForegroundColor Green
} else {
    Write-Host "WARNING: File may not contain expected content" -ForegroundColor Yellow
}

if ($content -match "file:///") {
    Write-Host "✓ File contains file:// protocol references" -ForegroundColor Green
} else {
    Write-Host "WARNING: File may not contain file:// protocol" -ForegroundColor Yellow
}

# Test file:// URL
$fileUrl = "file:///$($staticLoadingPath.Replace('\', '/'))"
Write-Host "File URL: $fileUrl" -ForegroundColor Cyan

# Test if we can open the file in default browser
if ($OpenChrome) {
    Write-Host "`nOpening static loading page in default browser..." -ForegroundColor Yellow
    try {
        Start-Process $fileUrl
        Write-Host "✓ Static loading page opened successfully" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: Failed to open static loading page" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
} else {
    Write-Host "`nTo test opening the page, run: .\test-static-loading.ps1 -OpenChrome" -ForegroundColor Yellow
}

# Test Chrome startup script
Write-Host "`n=== Testing Chrome Startup Script ===" -ForegroundColor Cyan
$chromeScriptPath = Join-Path $projectPath "start-chrome.ps1"

if (Test-Path $chromeScriptPath) {
    Write-Host "✓ Chrome startup script found" -ForegroundColor Green
    
    # Check if script uses static loading page
    $chromeScriptContent = Get-Content $chromeScriptPath -Raw
    if ($chromeScriptContent -match "static-loading\.html") {
        Write-Host "✓ Chrome script references static loading page" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Chrome script may not reference static loading page" -ForegroundColor Yellow
    }
    
    if ($chromeScriptContent -match "file:///") {
        Write-Host "✓ Chrome script uses file:// protocol" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Chrome script may not use file:// protocol" -ForegroundColor Yellow
    }
} else {
    Write-Host "ERROR: Chrome startup script not found!" -ForegroundColor Red
}

Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
Write-Host "Static loading page: $staticLoadingPath" -ForegroundColor White
Write-Host "File URL: $fileUrl" -ForegroundColor White
Write-Host "Chrome script: $chromeScriptPath" -ForegroundColor White
Write-Host "===============================" -ForegroundColor Cyan

Write-Host "`nThe static loading page should:" -ForegroundColor Green
Write-Host "1. Display immediately when Chrome opens" -ForegroundColor White
Write-Host "2. Show animated loading progress" -ForegroundColor White
Write-Host "3. Check for services on localhost:5000 and localhost:5173" -ForegroundColor White
Write-Host "4. Automatically redirect to main app when services are ready" -ForegroundColor White
Write-Host "5. Show retry option if services take too long" -ForegroundColor White 
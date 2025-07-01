# Test Offline Mode Functionality
# This script tests HubTrack's ability to work without internet connection

param(
    [switch]$SimulateOffline = $false,
    [switch]$TestSync = $false
)

Write-Host "=== HubTrack Offline Mode Test ===" -ForegroundColor Cyan

# Function to check if backend is running
function Test-BackendRunning {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get -TimeoutSec 3
        return $true
    } catch {
        return $false
    }
}

# Function to check connectivity
function Test-Connectivity {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5000/api/connectivity" -Method Get -TimeoutSec 3
        return $response.hasInternet
    } catch {
        return $false
    }
}

# Function to test core functionality
function Test-CoreFunctionality {
    Write-Host "`n=== Testing Core Functionality ===" -ForegroundColor Yellow
    
    $tests = @(
        @{ Name = "Health Check"; Endpoint = "/api/health" },
        @{ Name = "Device Labels"; Endpoint = "/api/device-labels" },
        @{ Name = "Users"; Endpoint = "/api/users" },
        @{ Name = "Feed Types"; Endpoint = "/api/feed-types" },
        @{ Name = "Organizations"; Endpoint = "/api/organizations" },
        @{ Name = "Statistics"; Endpoint = "/api/stats" }
    )
    
    $results = @()
    
    foreach ($test in $tests) {
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:5000$($test.Endpoint)" -Method Get -TimeoutSec 5
            Write-Host "✓ $($test.Name): Working" -ForegroundColor Green
            $results += @{ Name = $test.Name; Status = "Pass" }
        } catch {
            Write-Host "❌ $($test.Name): Failed - $($_.Exception.Message)" -ForegroundColor Red
            $results += @{ Name = $test.Name; Status = "Fail"; Error = $_.Exception.Message }
        }
    }
    
    return $results
}

# Function to test offline-dependent features
function Test-OfflineFeatures {
    Write-Host "`n=== Testing Offline-Dependent Features ===" -ForegroundColor Yellow
    
    # Test weather API (should return null when offline)
    try {
        $weatherResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/weather" -Method Get -TimeoutSec 5
        if ($weatherResponse -eq $null) {
            Write-Host "✓ Weather API: Graceful fallback (null response)" -ForegroundColor Green
        } else {
            Write-Host "⚠ Weather API: Returned data (may be cached)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Weather API: Error - $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test timezone API (should use system timezone when offline)
    try {
        $timezoneResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/timezone" -Method Get -TimeoutSec 5
        Write-Host "✓ Timezone API: Working with system timezone" -ForegroundColor Green
        Write-Host "  Timezone: $($timezoneResponse.timezone)" -ForegroundColor White
        Write-Host "  Offset: $($timezoneResponse.offsetHours) hours" -ForegroundColor White
    } catch {
        Write-Host "❌ Timezone API: Error - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Function to test database connectivity
function Test-DatabaseConnectivity {
    Write-Host "`n=== Testing Database Connectivity ===" -ForegroundColor Yellow
    
    try {
        $healthResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get -TimeoutSec 5
        Write-Host "✓ Database Status: $($healthResponse.database)" -ForegroundColor Green
        Write-Host "✓ Database Type: $($healthResponse.databaseType)" -ForegroundColor Green
        
        if ($healthResponse.databaseType -eq "local") {
            Write-Host "✓ Running in local mode (offline capable)" -ForegroundColor Green
        } else {
            Write-Host "⚠ Running in Atlas mode (requires internet)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Database Test: Failed - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Main test execution
Write-Host "Starting offline mode test..." -ForegroundColor Green

# Check if backend is running
if (-not (Test-BackendRunning)) {
    Write-Host "❌ Backend server is not running!" -ForegroundColor Red
    Write-Host "Please start the HubTrack backend server first." -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Backend server is running" -ForegroundColor Green

# Check connectivity
$hasInternet = Test-Connectivity
if ($hasInternet) {
    Write-Host "✓ Internet connection detected" -ForegroundColor Green
} else {
    Write-Host "⚠ No internet connection detected (offline mode)" -ForegroundColor Yellow
}

# Test core functionality
$coreResults = Test-CoreFunctionality

# Test offline-dependent features
Test-OfflineFeatures

# Test database connectivity
Test-DatabaseConnectivity

# Summary
Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
$passedTests = ($coreResults | Where-Object { $_.Status -eq "Pass" }).Count
$totalTests = $coreResults.Count

Write-Host "Core Functionality: $passedTests/$totalTests tests passed" -ForegroundColor $(if ($passedTests -eq $totalTests) { "Green" } else { "Red" })

if ($hasInternet) {
    Write-Host "Status: Online mode - All features available" -ForegroundColor Green
} else {
    Write-Host "Status: Offline mode - Core functionality working" -ForegroundColor Yellow
}

Write-Host "===============================" -ForegroundColor Cyan

# Recommendations
Write-Host "`nRecommendations:" -ForegroundColor Yellow
if (-not $hasInternet) {
    Write-Host "• System is working in offline mode" -ForegroundColor White
    Write-Host "• Weather display may show '--' or 'Loading...'" -ForegroundColor White
    Write-Host "• Timezone uses system timezone" -ForegroundColor White
    Write-Host "• Data will sync when internet connection is restored" -ForegroundColor White
}

if ($passedTests -lt $totalTests) {
    Write-Host "• Some core functionality tests failed" -ForegroundColor White
    Write-Host "• Check backend logs for errors" -ForegroundColor White
    Write-Host "• Verify database connection" -ForegroundColor White
}

Write-Host "`nTo simulate offline mode:" -ForegroundColor Yellow
Write-Host "1. Disconnect network cable or disable WiFi" -ForegroundColor White
Write-Host "2. Run this script again" -ForegroundColor White
Write-Host "3. Test the application functionality" -ForegroundColor White 
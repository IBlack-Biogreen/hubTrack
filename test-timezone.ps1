# Test Timezone Functionality
# This script tests the timezone API endpoint

param(
    [switch]$TestWithCoordinates = $false,
    [double]$Latitude = 40.7128,
    [double]$Longitude = -74.0060
)

Write-Host "=== HubTrack Timezone Test ===" -ForegroundColor Cyan

# Set the project path
$projectPath = "C:\Users\Public\Documents\hubTrack\hubTrack"

if (-not (Test-Path $projectPath)) {
    Write-Host "Project directory not found: $projectPath" -ForegroundColor Red
    exit 1
}

Write-Host "Testing timezone API endpoint..." -ForegroundColor Green

if ($TestWithCoordinates) {
    Write-Host "Testing with coordinates: Lat $Latitude, Lon $Longitude" -ForegroundColor Yellow
    
    # First, update the device label with test coordinates
    Write-Host "`nUpdating device label with test coordinates..." -ForegroundColor Green
    try {
        $deviceLabelResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/device-labels" -Method Get
        $trackingCart = $deviceLabelResponse | Where-Object { $_.deviceType -eq 'trackingCart' } | Select-Object -First 1
        
        if ($trackingCart) {
            $updateBody = @{
                latitude = $Latitude
                longitude = $Longitude
            } | ConvertTo-Json
            
            $updateResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/device-labels/$($trackingCart.deviceLabel)/settings" -Method Post -Body $updateBody -ContentType "application/json"
            Write-Host "Device label updated successfully" -ForegroundColor Green
        } else {
            Write-Host "No tracking cart device label found" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "Error updating device label: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Test the timezone endpoint
Write-Host "`nTesting timezone endpoint..." -ForegroundColor Green
try {
    $timezoneResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/timezone" -Method Get
    
    Write-Host "Timezone: $($timezoneResponse.timezone)" -ForegroundColor Green
    Write-Host "Offset: $($timezoneResponse.offsetHours) hours" -ForegroundColor Green
    Write-Host "Local Time: $($timezoneResponse.currentTime)" -ForegroundColor Green
    Write-Host "UTC Time: $($timezoneResponse.utcTime)" -ForegroundColor Green
    
    # Convert the ISO strings to readable format
    $localTime = [DateTime]::Parse($timezoneResponse.currentTime)
    $utcTime = [DateTime]::Parse($timezoneResponse.utcTime)
    
    Write-Host "`nFormatted Times:" -ForegroundColor Green
    Write-Host "  Local Time: $($localTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Yellow
    Write-Host "  UTC Time: $($utcTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Yellow
    Write-Host "  System Time: $((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Yellow
    
    # Check if the timezone makes sense
    $expectedOffset = if ($TestWithCoordinates) {
        # For New York coordinates, expect around -5 hours (EST) or -4 hours (EDT)
        if ($Latitude -eq 40.7128 -and $Longitude -eq -74.0060) {
            "around -5 or -4 hours (EST/EDT)"
        } else {
            "based on coordinates"
        }
    } else {
        "system timezone"
    }
    
    Write-Host "`nExpected offset: $expectedOffset" -ForegroundColor Cyan
    Write-Host "Actual offset: $($timezoneResponse.offsetHours) hours" -ForegroundColor Cyan
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    # Check if the server is running
    try {
        $healthResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get
        Write-Host "Server is running, but timezone endpoint failed" -ForegroundColor Yellow
    } catch {
        Write-Host "Server is not running. Please start the HubTrack backend server first." -ForegroundColor Red
    }
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Green 
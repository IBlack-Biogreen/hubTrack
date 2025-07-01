# Test script for timezone fix
Write-Host "Testing timezone fix for Halifax, Canada..." -ForegroundColor Green
Write-Host ""

# Start the backend server if not running
Write-Host "Starting backend server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; node backend/server.js" -WindowStyle Hidden

# Wait for server to start
Write-Host "Waiting for server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Test the timezone API
Write-Host "Testing timezone API..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/timezone" -Method Get
    Write-Host "Timezone API Response:" -ForegroundColor Green
    Write-Host "  Timezone: $($response.timezone)" -ForegroundColor White
    Write-Host "  Offset: $($response.offset) seconds" -ForegroundColor White
    Write-Host "  Offset Hours: $($response.offsetHours)" -ForegroundColor White
    Write-Host "  Current Time: $($response.currentTime)" -ForegroundColor White
    Write-Host "  UTC Time: $($response.utcTime)" -ForegroundColor White
    Write-Host ""
    
    # Calculate expected Halifax time
    $utcTime = [DateTime]::UtcNow
    $halifaxOffset = $response.offset
    $halifaxTime = $utcTime.AddSeconds($halifaxOffset)
    
    Write-Host "Expected Halifax time: $($halifaxTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Cyan
    Write-Host "Current UTC time: $($utcTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Cyan
    Write-Host ""
    
    # Check if the timezone is correct for Halifax
    if ($response.timezone -like "*Halifax*" -or $response.timezone -like "*Atlantic*") {
        Write-Host "✓ Timezone correctly identified as Halifax/Atlantic" -ForegroundColor Green
    } else {
        Write-Host "⚠ Timezone may not be correct for Halifax" -ForegroundColor Yellow
    }
    
    # Check if offset is reasonable for Halifax (should be -3 or -4 hours)
    $offsetHours = $response.offsetHours
    if ($offsetHours -ge -4 -and $offsetHours -le -3) {
        Write-Host "✓ Timezone offset is reasonable for Halifax" -ForegroundColor Green
    } else {
        Write-Host "⚠ Timezone offset may not be correct for Halifax" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "Error testing timezone API: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "To test the frontend:" -ForegroundColor Yellow
Write-Host "1. Start the frontend: npm run dev" -ForegroundColor White
Write-Host "2. Open the app in Chrome" -ForegroundColor White
Write-Host "3. Check that the time shown matches Halifax time (should be ~2 PM if it's 2 PM in Halifax)" -ForegroundColor White
Write-Host ""

# Keep the server running for manual testing
Write-Host "Backend server is running. Press any key to stop..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 
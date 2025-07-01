# Test BinWeight Settings
# This script tests that binWeight is properly saved and loaded from device label settings

param(
    [string]$DeviceLabel = "BG-00061",
    [double]$TestBinWeight = 25.5
)

# Set the project path
$projectPath = "C:\Users\Public\Documents\hubTrack\hubTrack"

Write-Host "=== Testing BinWeight Settings ===" -ForegroundColor Cyan
Write-Host "Device Label: $DeviceLabel" -ForegroundColor Yellow
Write-Host "Test BinWeight: $TestBinWeight" -ForegroundColor Yellow

# Function to get current settings
function Get-DeviceSettings {
    param([string]$DeviceLabel)
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5000/api/device-labels/$DeviceLabel/settings" -Method Get
        return $response
    } catch {
        Write-Host "Error getting settings: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Function to save settings
function Save-DeviceSettings {
    param(
        [string]$DeviceLabel,
        [object]$Settings
    )
    
    try {
        $body = $Settings | ConvertTo-Json -Depth 10
        $response = Invoke-RestMethod -Uri "http://localhost:5000/api/device-labels/$DeviceLabel/settings" -Method Post -Body $body -ContentType "application/json"
        return $response
    } catch {
        Write-Host "Error saving settings: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Main test logic
try {
    Write-Host "`n1. Getting current settings..." -ForegroundColor Green
    $currentSettings = Get-DeviceSettings -DeviceLabel $DeviceLabel
    
    if ($currentSettings) {
        Write-Host "✓ Current settings retrieved" -ForegroundColor Green
        Write-Host "Current settings: $($currentSettings | ConvertTo-Json -Depth 3)" -ForegroundColor White
        
        if ($currentSettings.binWeight -ne $null) {
            Write-Host "Current binWeight: $($currentSettings.binWeight)" -ForegroundColor Cyan
        } else {
            Write-Host "No binWeight found in current settings" -ForegroundColor Yellow
        }
    } else {
        Write-Host "No current settings found, starting fresh" -ForegroundColor Yellow
        $currentSettings = @{}
    }
    
    # Test saving binWeight
    Write-Host "`n2. Testing binWeight setting..." -ForegroundColor Green
    $binWeightSettings = @{ binWeight = $TestBinWeight }
    
    Write-Host "Saving binWeight: $TestBinWeight" -ForegroundColor Yellow
    $result = Save-DeviceSettings -DeviceLabel $DeviceLabel -Settings $binWeightSettings
    
    if ($result) {
        Write-Host "✓ BinWeight saved successfully" -ForegroundColor Green
        
        # Verify the save
        $updatedSettings = Get-DeviceSettings -DeviceLabel $DeviceLabel
        if ($updatedSettings.binWeight -eq $TestBinWeight) {
            Write-Host "✓ BinWeight verified in database: $($updatedSettings.binWeight)" -ForegroundColor Green
        } else {
            Write-Host "❌ BinWeight not found or incorrect in database" -ForegroundColor Red
            Write-Host "Expected: $TestBinWeight, Found: $($updatedSettings.binWeight)" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Failed to save binWeight" -ForegroundColor Red
    }
    
    # Test that other settings are preserved
    Write-Host "`n3. Testing settings preservation..." -ForegroundColor Green
    if ($currentSettings) {
        $preservedSettings = @()
        foreach ($key in $currentSettings.Keys) {
            if ($key -ne 'binWeight') {
                if ($updatedSettings.$key -eq $currentSettings.$key) {
                    $preservedSettings += $key
                } else {
                    Write-Host "⚠ Setting '$key' changed: Expected '$($currentSettings.$key)', Found '$($updatedSettings.$key)'" -ForegroundColor Yellow
                }
            }
        }
        
        if ($preservedSettings.Count -gt 0) {
            Write-Host "✓ Preserved settings: $($preservedSettings -join ', ')" -ForegroundColor Green
        } else {
            Write-Host "⚠ No other settings to preserve" -ForegroundColor Yellow
        }
    }
    
    # Test loading binWeight multiple times
    Write-Host "`n4. Testing binWeight loading..." -ForegroundColor Green
    for ($i = 1; $i -le 3; $i++) {
        Write-Host "Loading attempt $i..." -ForegroundColor Yellow
        $loadedSettings = Get-DeviceSettings -DeviceLabel $DeviceLabel
        
        if ($loadedSettings.binWeight -eq $TestBinWeight) {
            Write-Host "✓ BinWeight loaded correctly on attempt $i: $($loadedSettings.binWeight)" -ForegroundColor Green
        } else {
            Write-Host "❌ BinWeight loading failed on attempt $i" -ForegroundColor Red
            Write-Host "Expected: $TestBinWeight, Found: $($loadedSettings.binWeight)" -ForegroundColor Red
        }
        
        Start-Sleep -Seconds 1
    }
    
    # Final verification
    Write-Host "`n5. Final settings verification..." -ForegroundColor Green
    $finalSettings = Get-DeviceSettings -DeviceLabel $DeviceLabel
    Write-Host "Final settings: $($finalSettings | ConvertTo-Json -Depth 3)" -ForegroundColor White
    
    Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
    Write-Host "Device Label: $DeviceLabel" -ForegroundColor White
    Write-Host "Test BinWeight: $TestBinWeight" -ForegroundColor White
    Write-Host "Final BinWeight: $($finalSettings.binWeight)" -ForegroundColor White
    Write-Host "Test Result: $(if ($finalSettings.binWeight -eq $TestBinWeight) { 'PASSED' } else { 'FAILED' })" -ForegroundColor $(if ($finalSettings.binWeight -eq $TestBinWeight) { 'Green' } else { 'Red' })
    Write-Host "===============================" -ForegroundColor Cyan
    
} catch {
    Write-Host "Error during testing: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nUsage examples:" -ForegroundColor Yellow
Write-Host "  .\test-binweight.ps1" -ForegroundColor White
Write-Host "  .\test-binweight.ps1 -DeviceLabel 'BG-00062'" -ForegroundColor White
Write-Host "  .\test-binweight.ps1 -TestBinWeight 30.0" -ForegroundColor White 
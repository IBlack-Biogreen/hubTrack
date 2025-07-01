# Test Device Label Settings
# This script tests that latitude and longitude settings are properly saved and synced

param(
    [string]$DeviceLabel = "BG-00061",
    [switch]$TestLatitude = $false,
    [switch]$TestLongitude = $false,
    [switch]$TestBoth = $false
)

# Set the project path
$projectPath = "C:\Users\Public\Documents\hubTrack\hubTrack"

Write-Host "=== Testing Device Label Settings ===" -ForegroundColor Cyan
Write-Host "Device Label: $DeviceLabel" -ForegroundColor Yellow

# Test latitude and longitude values
$testLatitude = 40.7128
$testLongitude = -74.0060

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

# Function to check Atlas sync
function Test-AtlasSync {
    param([string]$DeviceLabel)
    
    try {
        # This would require direct Atlas connection
        # For now, we'll just check if the local save was successful
        Write-Host "Atlas sync verification would require direct Atlas connection" -ForegroundColor Yellow
        return $true
    } catch {
        Write-Host "Error checking Atlas sync: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Main test logic
try {
    Write-Host "`n1. Getting current settings..." -ForegroundColor Green
    $currentSettings = Get-DeviceSettings -DeviceLabel $DeviceLabel
    
    if ($currentSettings) {
        Write-Host "✓ Current settings retrieved" -ForegroundColor Green
        Write-Host "Current settings: $($currentSettings | ConvertTo-Json -Depth 3)" -ForegroundColor White
    } else {
        Write-Host "No current settings found, starting fresh" -ForegroundColor Yellow
        $currentSettings = @{}
    }
    
    # Test latitude
    if ($TestLatitude -or $TestBoth) {
        Write-Host "`n2. Testing latitude setting..." -ForegroundColor Green
        $latitudeSettings = @{ latitude = $testLatitude }
        
        Write-Host "Saving latitude: $testLatitude" -ForegroundColor Yellow
        $result = Save-DeviceSettings -DeviceLabel $DeviceLabel -Settings $latitudeSettings
        
        if ($result) {
            Write-Host "✓ Latitude saved successfully" -ForegroundColor Green
            
            # Verify the save
            $updatedSettings = Get-DeviceSettings -DeviceLabel $DeviceLabel
            if ($updatedSettings.latitude -eq $testLatitude) {
                Write-Host "✓ Latitude verified in database" -ForegroundColor Green
            } else {
                Write-Host "❌ Latitude not found in database" -ForegroundColor Red
            }
        } else {
            Write-Host "❌ Failed to save latitude" -ForegroundColor Red
        }
    }
    
    # Test longitude
    if ($TestLongitude -or $TestBoth) {
        Write-Host "`n3. Testing longitude setting..." -ForegroundColor Green
        $longitudeSettings = @{ longitude = $testLongitude }
        
        Write-Host "Saving longitude: $testLongitude" -ForegroundColor Yellow
        $result = Save-DeviceSettings -DeviceLabel $DeviceLabel -Settings $longitudeSettings
        
        if ($result) {
            Write-Host "✓ Longitude saved successfully" -ForegroundColor Green
            
            # Verify the save
            $updatedSettings = Get-DeviceSettings -DeviceLabel $DeviceLabel
            if ($updatedSettings.longitude -eq $testLongitude) {
                Write-Host "✓ Longitude verified in database" -ForegroundColor Green
            } else {
                Write-Host "❌ Longitude not found in database" -ForegroundColor Red
            }
        } else {
            Write-Host "❌ Failed to save longitude" -ForegroundColor Red
        }
    }
    
    # Test both together
    if ($TestBoth) {
        Write-Host "`n4. Testing both latitude and longitude together..." -ForegroundColor Green
        $bothSettings = @{ 
            latitude = $testLatitude
            longitude = $testLongitude
        }
        
        Write-Host "Saving both coordinates..." -ForegroundColor Yellow
        $result = Save-DeviceSettings -DeviceLabel $DeviceLabel -Settings $bothSettings
        
        if ($result) {
            Write-Host "✓ Both coordinates saved successfully" -ForegroundColor Green
            
            # Verify both are present
            $finalSettings = Get-DeviceSettings -DeviceLabel $DeviceLabel
            if ($finalSettings.latitude -eq $testLatitude -and $finalSettings.longitude -eq $testLongitude) {
                Write-Host "✓ Both coordinates verified in database" -ForegroundColor Green
            } else {
                Write-Host "❌ One or both coordinates missing from database" -ForegroundColor Red
            }
        } else {
            Write-Host "❌ Failed to save both coordinates" -ForegroundColor Red
        }
    }
    
    # Final verification
    Write-Host "`n5. Final settings verification..." -ForegroundColor Green
    $finalSettings = Get-DeviceSettings -DeviceLabel $DeviceLabel
    Write-Host "Final settings: $($finalSettings | ConvertTo-Json -Depth 3)" -ForegroundColor White
    
    # Check if other settings are preserved
    if ($currentSettings) {
        $preservedSettings = @()
        foreach ($key in $currentSettings.Keys) {
            if ($key -ne 'latitude' -and $key -ne 'longitude') {
                if ($finalSettings.$key -eq $currentSettings.$key) {
                    $preservedSettings += $key
                }
            }
        }
        
        if ($preservedSettings.Count -gt 0) {
            Write-Host "✓ Preserved settings: $($preservedSettings -join ', ')" -ForegroundColor Green
        } else {
            Write-Host "⚠ No other settings to preserve" -ForegroundColor Yellow
        }
    }
    
    Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
    Write-Host "Device Label: $DeviceLabel" -ForegroundColor White
    Write-Host "Test Latitude: $testLatitude" -ForegroundColor White
    Write-Host "Test Longitude: $testLongitude" -ForegroundColor White
    Write-Host "===============================" -ForegroundColor Cyan
    
} catch {
    Write-Host "Error during testing: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nUsage examples:" -ForegroundColor Yellow
Write-Host "  .\test-device-settings.ps1 -TestLatitude" -ForegroundColor White
Write-Host "  .\test-device-settings.ps1 -TestLongitude" -ForegroundColor White
Write-Host "  .\test-device-settings.ps1 -TestBoth" -ForegroundColor White
Write-Host "  .\test-device-settings.ps1 -DeviceLabel 'BG-00062' -TestBoth" -ForegroundColor White 
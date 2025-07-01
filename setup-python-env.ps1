# HubTrack Python Environment Setup
# This script sets up the Python virtual environment and installs required dependencies

param(
    [switch]$ForceReinstall = $false
)

Write-Host "=== HubTrack Python Environment Setup ===" -ForegroundColor Cyan

# Get the script's directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $scriptPath "backend"
$venvPath = Join-Path $backendPath "venv"
$requirementsPath = Join-Path $backendPath "requirements.txt"

Write-Host "Backend Path: $backendPath" -ForegroundColor Yellow
Write-Host "Virtual Environment Path: $venvPath" -ForegroundColor Yellow
Write-Host "Requirements File: $requirementsPath" -ForegroundColor Yellow

# Check if we're in the right directory
if (-not (Test-Path $backendPath)) {
    Write-Host "Backend directory not found: $backendPath" -ForegroundColor Red
    Write-Host "Please run this script from the HubTrack root directory." -ForegroundColor Yellow
    exit 1
}

# Check if requirements.txt exists
if (-not (Test-Path $requirementsPath)) {
    Write-Host "Requirements file not found: $requirementsPath" -ForegroundColor Red
    exit 1
}

# Change to backend directory
Set-Location $backendPath

# Check if Python is available
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python version: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Python not found in PATH. Please install Python 3.7+ and try again." -ForegroundColor Red
    exit 1
}

# Remove existing virtual environment if force reinstall is requested
if ($ForceReinstall -and (Test-Path $venvPath)) {
    Write-Host "Removing existing virtual environment..." -ForegroundColor Yellow
    Remove-Item -Path $venvPath -Recurse -Force
    Write-Host "Existing virtual environment removed." -ForegroundColor Green
}

# Create virtual environment if it doesn't exist
if (-not (Test-Path $venvPath)) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
    try {
        python -m venv venv
        Write-Host "Virtual environment created successfully." -ForegroundColor Green
    } catch {
        Write-Host "Failed to create virtual environment: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Virtual environment already exists." -ForegroundColor Green
}

# Get the Python executable path
$pythonPath = Join-Path $venvPath "Scripts\python.exe"
if (-not (Test-Path $pythonPath)) {
    Write-Host "Python executable not found in virtual environment: $pythonPath" -ForegroundColor Red
    exit 1
}

Write-Host "Using Python: $pythonPath" -ForegroundColor Green

# Upgrade pip
Write-Host "Upgrading pip..." -ForegroundColor Yellow
try {
    & $pythonPath -m pip install --upgrade pip
    Write-Host "Pip upgraded successfully." -ForegroundColor Green
} catch {
    Write-Host "Failed to upgrade pip: $($_.Exception.Message)" -ForegroundColor Red
}

# Install requirements
Write-Host "Installing Python requirements..." -ForegroundColor Yellow
try {
    & $pythonPath -m pip install -r requirements.txt
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Requirements installed successfully." -ForegroundColor Green
    } else {
        Write-Host "Failed to install requirements." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error installing requirements: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test the LabJack module
Write-Host "Testing LabJack module..." -ForegroundColor Yellow
try {
    $testResult = & $pythonPath -c "import u3; print('LabJackPython module imported successfully')" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "LabJackPython module test passed!" -ForegroundColor Green
    } else {
        Write-Host "LabJackPython module test failed: $testResult" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error testing LabJack module: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test Flask module
Write-Host "Testing Flask module..." -ForegroundColor Yellow
try {
    $testResult = & $pythonPath -c "import flask; print('Flask module imported successfully')" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Flask module test passed!" -ForegroundColor Green
    } else {
        Write-Host "Flask module test failed: $testResult" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error testing Flask module: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Setup Complete ===" -ForegroundColor Green
Write-Host "Python virtual environment is ready!" -ForegroundColor Cyan
Write-Host "You can now run the HubTrack startup script." -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Green 
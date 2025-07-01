# HubTrack Windows Startup Scripts

This directory contains scripts to automatically start HubTrack on Windows startup with kiosk mode browser launch.

## Files Overview

- **`startup-hubtrack.ps1`** - Main startup script that starts backend, frontend, and launches browser
- **`setup-startup-task.ps1`** - Creates Windows Task Scheduler task for auto-startup
- **`start-hubtrack.bat`** - Simple batch file for manual startup
- **`start-chrome.ps1`** - Chrome startup script that opens static loading page
- **`static-loading.html`** - Static loading page that displays immediately
- **`test-static-loading.ps1`** - Test script for static loading page functionality
- **`STARTUP-README.md`** - This documentation file

## Quick Start

### Option 1: Manual Startup (Recommended for Testing)
1. Double-click `start-hubtrack.bat`
2. Or run: `powershell.exe -ExecutionPolicy Bypass -File "startup-hubtrack.ps1"`

### Option 2: Auto-Startup on Windows Boot
1. **Run PowerShell as Administrator**
2. Execute: `.\setup-startup-task.ps1`
3. HubTrack will now start automatically on every Windows startup

## Static Loading Page

The system uses a static loading page that displays immediately when Chrome opens, eliminating the "refused connection" issue:

### Features
- **No Server Dependency**: Loads immediately from filesystem using `file://` protocol
- **Immediate Display**: Shows instantly when Chrome starts, no waiting required
- **Service Monitoring**: Checks if backend (port 5000) and frontend (port 5173) services are ready
- **Auto-redirect**: Once all services are ready, automatically redirects to main app
- **Retry Logic**: If services take too long, users can manually retry the connection
- **Fallback Timer**: Attempts connection after 5 minutes regardless of service status

### File Location
```
C:\Users\Public\Documents\hubTrack\hubTrack\static-loading.html
```

### Testing
Run the test script to verify the static loading page:
```powershell
# Test configuration
.\test-static-loading.ps1

# Test opening in browser
.\test-static-loading.ps1 -OpenChrome
```

## Script Details

### `startup-hubtrack.ps1`

**Parameters:**
- `-KioskMode` (default: true) - Launch browser in kiosk mode
- `-BrowserPath` - Specify custom browser path (auto-detects Chrome/Edge)
- `-StartupDelay` (default: 10) - Seconds to wait for backend initialization

**What it does:**
1. Cleans up any existing processes on ports 5000, 5001, 5173
2. Starts MongoDB (if not running)
3. Starts LabJack Python server
4. Starts Node.js backend server
5. Starts frontend development server
6. Launches browser in kiosk mode to `http://localhost:5173`
7. Monitors all processes and handles cleanup on exit

**Example usage:**
```powershell
# Normal kiosk mode
.\startup-hubtrack.ps1

# Normal browser mode
.\startup-hubtrack.ps1 -KioskMode:$false

# Custom browser path
.\startup-hubtrack.ps1 -BrowserPath "C:\Program Files\Google\Chrome\Application\chrome.exe"

# Longer startup delay
.\startup-hubtrack.ps1 -StartupDelay 15
```

### `start-chrome.ps1`

**What it does:**
1. Finds Chrome executable in standard locations
2. Opens Chrome in kiosk mode with static loading page
3. Uses `file://` protocol to load static HTML immediately
4. No waiting for services - page loads instantly

**Chrome Arguments:**
- Fullscreen kiosk mode
- Disabled security features for local development
- Static loading page URL: `file:///C:/Users/Public/Documents/hubTrack/hubTrack/static-loading.html`

### `setup-startup-task.ps1`

**Parameters:**
- `-TaskName` (default: "HubTrack Startup") - Name of the scheduled task
- `-RunAsCurrentUser` (default: true) - Run as current user vs SYSTEM
- `-RunAtLogon` (default: true) - Run at user logon vs system startup
- `-RemoveTask` - Remove existing task instead of creating

**What it does:**
1. Creates a Windows Task Scheduler task
2. Configures it to run on system startup/user logon
3. Sets appropriate permissions and settings
4. Enables the task for automatic execution

**Example usage:**
```powershell
# Create startup task (requires admin)
.\setup-startup-task.ps1

# Remove startup task
.\setup-startup-task.ps1 -RemoveTask

# Create task that runs at system startup (not user logon)
.\setup-startup-task.ps1 -RunAtLogon:$false
```

## Troubleshooting

### Common Issues

1. **"Execution Policy" Error**
   - Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

2. **Port Already in Use**
   - The script automatically kills processes on required ports
   - If issues persist, manually close any running HubTrack processes

3. **Browser Not Found**
   - Script auto-detects Chrome/Edge
   - Falls back to default browser if not found
   - Specify custom path with `-BrowserPath` parameter

4. **Services Not Starting**
   - Check MongoDB installation
   - Ensure Python dependencies are installed
   - Check Node.js installation and dependencies

### Manual Process Management

**Stop all HubTrack processes:**
```powershell
Get-Process | Where-Object { 
    $_.ProcessName -in @("node", "python", "mongod") 
} | Stop-Process -Force
```

**Check running services:**
```powershell
Get-NetTCPConnection | Where-Object { 
    $_.LocalPort -in @(5000, 5001, 5173) 
}
```

### Logs and Debugging

The script provides colored output for different operations:
- **Green**: Success messages
- **Yellow**: Warning/info messages  
- **Red**: Error messages
- **Cyan**: Status information

Backend processes create log files in the `backend/` directory:
- `labjack_output.log` / `labjack_error.log`
- `node_output.log` / `node_error.log`

## Security Considerations

- The startup task runs with elevated privileges
- Consider running as current user instead of SYSTEM for better security
- Browser kiosk mode disables many security features for full-screen operation
- Ensure proper firewall rules for local development ports

## Customization

### Modify Startup Delay
Edit the `$StartupDelay` parameter in `startup-hubtrack.ps1` or pass it as a parameter.

### Change Browser Behavior
Modify the kiosk arguments in the script to customize browser behavior:
```powershell
$kioskArgs = @(
    "--kiosk",
    "--disable-web-security",
    # Add/remove arguments as needed
    $hubtrackUrl
)
```

### Add Additional Services
Extend the script to start additional services by adding new process starts and health checks.

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the colored output for error messages
3. Check backend log files for specific errors
4. Ensure all dependencies are properly installed 
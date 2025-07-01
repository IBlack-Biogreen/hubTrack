# Hub User Setup Guide

This guide explains how to set up the "hub" user account to automatically run HubTrack when logging in.

## Prerequisites

1. **Hub User Account**: A Windows user account named "hub" (or your preferred name)
2. **Project Location**: HubTrack project must be located at `C:\Users\Public\Documents\hubTrack`
3. **Administrator Access**: You need administrator privileges to run the setup scripts
4. **Chrome Browser**: Google Chrome must be installed on the system

## Quick Setup

### Step 1: Create the Hub User (if not already created)

Open PowerShell as Administrator and run:

```powershell
New-LocalUser -Name "hub" -Description "HubTrack Kiosk User" -NoPassword
```

### Step 2: Run the Complete Setup Script

Navigate to the project directory and run:

```powershell
cd "C:\Users\Public\Documents\hubTrack"
.\setup-hub-user-complete.ps1
```

This script will:
- Create a Windows Task Scheduler task that runs when the hub user logs in
- Configure Chrome to start automatically in fullscreen kiosk mode
- Set up proper permissions for the hub user
- Test the configuration

## What Gets Configured

### 1. HubTrack Startup Task
- **Task Name**: "HubTrack Startup - hub user"
- **Trigger**: When hub user logs in
- **Action**: Runs `startup-hub-user.ps1` which starts backend and frontend services
- **Location**: Windows Task Scheduler

### 2. Chrome Kiosk Mode
- **Startup Location**: `C:\Users\hub\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup`
- **Target URL**: `http://localhost:5173`
- **Mode**: Fullscreen kiosk mode with all unnecessary features disabled
- **Desktop Shortcut**: Also created for testing purposes

### 3. User Permissions
- **Project Access**: Hub user gets read/execute permissions on the project folder
- **Node.js Access**: Hub user can run Node.js applications
- **Startup Folder**: Hub user has access to their startup folder

## Manual Setup (Alternative)

If you prefer to run the setup scripts individually:

### 1. Setup HubTrack Startup Task
```powershell
.\setup-hub-user-startup.ps1
```

### 2. Setup Chrome Startup
```powershell
.\setup-chrome-startup.ps1
```

## Testing the Setup

1. **Switch to Hub User Account**:
   - Press `Win + L` to lock the screen
   - Click "Switch User" and select the hub account
   - Log in (no password required if set up without password)

2. **Wait for Services to Start**:
   - The startup script will run automatically
   - Backend services will start on ports 5000 and 5001
   - Frontend service will start on port 5173

3. **Chrome Should Open Automatically**:
   - Chrome will launch in fullscreen kiosk mode
   - It will navigate to `http://localhost:5173`
   - The HubTrack application should be visible

## Troubleshooting

### Services Not Starting
- Check the Task Scheduler for the "HubTrack Startup - hub user" task
- Run the startup script manually to see error messages:
  ```powershell
  cd "C:\Users\Public\Documents\hubTrack"
  .\startup-hub-user.ps1
  ```

### Chrome Not Opening
- Check if Chrome is installed in a standard location
- Verify the startup shortcut exists in the hub user's startup folder
- Test the Chrome shortcut manually from the desktop

### Permission Issues
- Ensure the hub user has access to the project folder
- Check that Node.js and Python are accessible to the hub user
- Verify the hub user can access their startup folder

### Port Conflicts
- The startup script automatically kills processes on ports 5000, 5001, and 5173
- If services still won't start, manually check for conflicting processes:
  ```powershell
  Get-NetTCPConnection -LocalPort 5000,5001,5173
  ```

## Removing the Setup

To remove all configurations:

```powershell
.\setup-hub-user-complete.ps1 -RemoveAll
```

This will:
- Remove the scheduled task
- Remove Chrome shortcuts
- Clean up all configurations

## Individual Removal

To remove specific components:

```powershell
# Remove startup task only
.\setup-hub-user-startup.ps1 -RemoveTask

# Remove Chrome configuration only
.\setup-chrome-startup.ps1 -RemoveConfig
```

## File Locations

### Scripts
- `startup-hub-user.ps1` - Main startup script for hub user
- `setup-hub-user-startup.ps1` - Creates Windows Task Scheduler task
- `setup-chrome-startup.ps1` - Configures Chrome kiosk mode
- `setup-hub-user-complete.ps1` - Complete setup script

### Chrome Shortcuts
- Startup: `C:\Users\hub\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\Chrome HubTrack.lnk`
- Desktop: `C:\Users\hub\Desktop\Chrome HubTrack.lnk`

### Task Scheduler
- Task Name: "HubTrack Startup - hub user"
- Location: Task Scheduler Library

## Security Considerations

- The hub user account should have limited privileges
- No password is required for the hub user (kiosk mode)
- The account is designed for single-purpose use
- All unnecessary Windows features are disabled in Chrome kiosk mode

## Customization

### Different Username
If you want to use a different username than "hub":

```powershell
.\setup-hub-user-complete.ps1 -HubUsername "your-username"
```

### Different Project Location
If your project is in a different location, modify the scripts to update the path:
- Update `$projectPath` in `startup-hub-user.ps1`
- Update `$projectPath` in `setup-hub-user-startup.ps1`

### Chrome Arguments
To modify Chrome startup behavior, edit the `$chromeArgs` array in `setup-chrome-startup.ps1`.

## Support

If you encounter issues:
1. Check the PowerShell output for error messages
2. Verify all prerequisites are met
3. Test components individually
4. Check Windows Event Viewer for system errors 
# Chrome Auto-Startup Setup for HubTrack

This guide shows you how to configure Chrome to start automatically in full-screen mode with HubTrack as the homepage.

## Method 1: Windows Startup Folder (Recommended)

### Step 1: Create Chrome Shortcut
1. Right-click on your desktop
2. Select "New" → "Shortcut"
3. In the location field, enter:
   ```
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --start-fullscreen --homepage="http://localhost:5173"
   ```
4. Name the shortcut "HubTrack Chrome"
5. Click "Finish"

### Step 2: Add to Startup
1. Press `Win + R` to open Run dialog
2. Type `shell:startup` and press Enter
3. Copy your "HubTrack Chrome" shortcut to this folder
4. Chrome will now start automatically in full-screen mode when Windows boots

## Method 2: Windows Task Scheduler

### Step 1: Create Task
1. Open Task Scheduler (search in Start menu)
2. Click "Create Basic Task"
3. Name: "HubTrack Chrome"
4. Trigger: "When the computer starts"
5. Action: "Start a program"
6. Program: `C:\Program Files\Google\Chrome\Application\chrome.exe`
7. Arguments: `--start-fullscreen --homepage="http://localhost:5173"`

### Step 2: Configure Task
1. Right-click the created task
2. Select "Properties"
3. Check "Run with highest privileges"
4. In "Conditions" tab, uncheck "Start the task only if the computer is on AC power"
5. Click "OK"

## Method 3: Registry (Advanced)

### Step 1: Create Registry Entry
1. Press `Win + R` and type `regedit`
2. Navigate to: `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`
3. Right-click in the right panel → "New" → "String Value"
4. Name: "HubTrackChrome"
5. Value: `"C:\Program Files\Google\Chrome\Application\chrome.exe" --start-fullscreen --homepage="http://localhost:5173"`

## Chrome Command Line Options

You can customize Chrome's startup behavior with these flags:

### Full-Screen Options
- `--start-fullscreen` - Start in full-screen mode
- `--kiosk` - Start in kiosk mode (no UI elements)
- `--app="http://localhost:5173"` - Start as app (borderless window)

### Additional Options
- `--disable-web-security` - Disable web security (for local development)
- `--no-first-run` - Skip first-run setup
- `--disable-default-apps` - Disable default apps
- `--disable-extensions` - Disable extensions
- `--disable-notifications` - Disable notifications
- `--disable-popup-blocking` - Disable popup blocking

### Complete Command Example
```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --start-fullscreen --homepage="http://localhost:5173" --disable-web-security --no-first-run --disable-default-apps --disable-extensions --disable-notifications
```

## Testing Your Setup

1. **Test Chrome Command**: Open Command Prompt and run your Chrome command to verify it works
2. **Test Auto-Startup**: Restart your computer to verify Chrome starts automatically
3. **Test HubTrack**: Make sure HubTrack services are running before Chrome starts

## Troubleshooting

### Chrome Doesn't Start Full-Screen
- Try using `--kiosk` instead of `--start-fullscreen`
- Check if Chrome is already running and close it first
- Try adding `--new-window` flag

### Chrome Opens Wrong Page
- Verify the URL is correct: `http://localhost:5173`
- Make sure HubTrack services are running
- Try using `--homepage` instead of just the URL

### Chrome Doesn't Start Automatically
- Check Windows startup folder permissions
- Verify the shortcut path is correct
- Try running the shortcut manually first

## Integration with HubTrack Startup Script

1. Set up Chrome auto-startup using one of the methods above
2. Use the HubTrack startup script to start backend services
3. Chrome will automatically connect to the running HubTrack frontend

The startup script will show:
```
=== HubTrack Startup Complete ===
Backend API: http://localhost:5000
Frontend: http://localhost:5173
LabJack: http://localhost:5001
===============================
All services are now running!
Configure Chrome to start automatically with http://localhost:5173 as homepage
Use --start-fullscreen flag in Chrome shortcut for full-screen mode
``` 
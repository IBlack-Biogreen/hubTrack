# HubTrack Crash Recovery System

This document explains the crash recovery and monitoring system implemented for HubTrack.

## Overview

The crash recovery system includes:
- **Enhanced logging** with file-based logs
- **PM2 process management** for automatic restarts
- **Crash monitoring** with health checks
- **Memory leak detection**
- **Graceful shutdown handling**

## Components

### 1. Enhanced Server Logging (`backend/server.js`)

**Features:**
- Daily log files in `backend/logs/`
- Structured logging with timestamps and levels
- Memory usage monitoring
- Global error handlers for uncaught exceptions

**Log Levels:**
- `INFO` - General information
- `WARN` - Warnings
- `ERROR` - Errors
- `FATAL` - Critical errors
- `DEBUG` - Debug information

### 2. PM2 Process Management

**Configuration:** `backend/ecosystem.config.js`

**Features:**
- Automatic restart on crashes
- Memory limit monitoring (1GB)
- Log file rotation
- Process health monitoring

**PM2 Commands:**
```bash
# Start with PM2
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs

# Restart all processes
pm2 restart all

# Stop all processes
pm2 stop all

# Delete all processes
pm2 delete all
```

### 3. Crash Monitor (`backend/monitor-crashes.js`)

**Features:**
- Health checks every 30 seconds
- Automatic restart on failure
- Crash frequency limiting (max 5 crashes per hour)
- Detailed crash logging

**Usage:**
```bash
node monitor-crashes.js
```

### 4. Log Viewer (`view-logs.ps1`)

**Features:**
- View different log types
- Color-coded output
- System status monitoring
- Crash summary

**Usage:**
```powershell
# View all logs
.\view-logs.ps1

# View only crashes
.\view-logs.ps1 -LogType crashes

# View server logs with more lines
.\view-logs.ps1 -LogType server -Lines 100

# Follow logs in real-time
.\view-logs.ps1 -Follow

# Check system status only
.\view-logs.ps1 -LogType status
```

## Startup Options

### Enhanced Startup Script (`startup-hubtrack.ps1`)

**Features:**
- PM2 integration
- Health checks
- Automatic dependency installation
- Process cleanup

**Usage:**
```powershell
# Start with PM2 (default)
.\startup-hubtrack.ps1

# Start without PM2
.\startup-hubtrack.ps1 -UsePM2:$false

# Start without crash monitor
.\startup-hubtrack.ps1 -StartMonitor:$false
```

## Log Files

### Backend Logs (`backend/logs/`)
- `server-YYYY-MM-DD.log` - Daily server logs
- `crashes.log` - Crash events
- `pm2-error.log` - PM2 error logs
- `pm2-out.log` - PM2 output logs
- `pm2-combined.log` - Combined PM2 logs

### Legacy Logs
- `labjack_error.log` - LabJack errors
- `labjack_output.log` - LabJack output
- `node_error.log` - Node.js errors
- `node_output.log` - Node.js output

## Crash Recovery Process

1. **Detection:** Crash monitor detects service failure
2. **Logging:** Error details logged to crash log
3. **Frequency Check:** Prevents restart loops (max 5/hour)
4. **Restart:** PM2 or direct restart after 30-second delay
5. **Health Check:** Verifies service is running
6. **Monitoring:** Continues monitoring for future issues

## Memory Management

**Memory Monitoring:**
- Checks every 5 minutes
- Alerts if heap usage > 500MB
- Automatic restart if memory limit exceeded

**Memory Leak Prevention:**
- Proper cleanup of intervals and timeouts
- Resource cleanup on shutdown
- Global interval tracking

## Troubleshooting

### Common Issues

**1. Service Won't Start**
```powershell
# Check logs
.\view-logs.ps1 -LogType server

# Check PM2 status
pm2 status

# Check system status
.\view-logs.ps1 -LogType status
```

**2. Frequent Crashes**
```powershell
# View crash log
.\view-logs.ps1 -LogType crashes

# Check memory usage
.\view-logs.ps1 -LogType server -Lines 100
```

**3. PM2 Issues**
```powershell
# Reset PM2
pm2 delete all
pm2 start ecosystem.config.js

# Check PM2 logs
.\view-logs.ps1 -LogType pm2
```

### Manual Recovery

**If PM2 fails:**
```powershell
# Stop PM2
pm2 stop all
pm2 delete all

# Start manually
cd backend
node server.js
```

**If crash monitor fails:**
```powershell
# Check crash monitor logs
Get-Content .\backend\logs\crashes.log -Tail 20
```

## Best Practices

1. **Regular Monitoring:** Check logs daily
2. **Backup Logs:** Archive old log files
3. **Memory Monitoring:** Watch for memory leaks
4. **Update Dependencies:** Keep packages updated
5. **Test Recovery:** Verify restart procedures work

## Configuration

### PM2 Configuration (`ecosystem.config.js`)
- `max_memory_restart`: 1GB memory limit
- `max_restarts`: 10 restart attempts
- `min_uptime`: 10 seconds minimum uptime
- `restart_delay`: 4 seconds between restarts

### Crash Monitor Configuration (`monitor-crashes.js`)
- `MAX_CRASHES_PER_HOUR`: 5 crashes maximum
- `RESTART_DELAY`: 30 seconds before restart
- Health check interval: 30 seconds

## Emergency Procedures

### Complete System Reset
```powershell
# Stop all services
pm2 stop all
pm2 delete all

# Kill remaining processes
Get-Process | Where-Object { $_.ProcessName -in @("node", "python") } | Stop-Process -Force

# Clear logs (optional)
Remove-Item .\backend\logs\* -Force

# Restart
.\startup-hubtrack.ps1
```

### Data Recovery
- Database files: `.\data\`
- Image files: `.\hubtrack_images\`
- Configuration: `.\backend\.env`

## Support

For issues with the crash recovery system:
1. Check logs first: `.\view-logs.ps1`
2. Verify system status: `.\view-logs.ps1 -LogType status`
3. Check PM2 status: `pm2 status`
4. Review crash log: `.\view-logs.ps1 -LogType crashes` 
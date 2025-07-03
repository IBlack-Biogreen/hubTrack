const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configuration
const LOG_DIR = path.join(__dirname, 'logs');
const CRASH_LOG = path.join(LOG_DIR, 'crashes.log');
const MAX_CRASHES_PER_HOUR = 5;
const RESTART_DELAY = 30000; // 30 seconds

// Crash tracking
let crashCount = 0;
let lastCrashTime = 0;

function logCrash(message, error = null) {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] CRASH: ${message}`;
    
    if (error) {
        logMessage += `\nError: ${error.message}`;
        if (error.stack) {
            logMessage += `\nStack: ${error.stack}`;
        }
    }
    
    logMessage += '\n';
    
    // Log to crash file
    fs.appendFileSync(CRASH_LOG, logMessage);
    console.log(logMessage);
    
    // Track crash frequency
    const now = Date.now();
    if (now - lastCrashTime < 3600000) { // Within last hour
        crashCount++;
    } else {
        crashCount = 1;
    }
    lastCrashTime = now;
    
    // Check if too many crashes
    if (crashCount >= MAX_CRASHES_PER_HOUR) {
        logCrash(`TOO MANY CRASHES (${crashCount} in last hour) - NOT RESTARTING`);
        return false;
    }
    
    return true;
}

function checkProcessHealth() {
    return new Promise((resolve) => {
        exec('netstat -an | findstr :5000', (error, stdout) => {
            if (error || !stdout.includes('LISTENING')) {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

function restartServer() {
    return new Promise((resolve, reject) => {
        console.log('Attempting to restart server...');
        
        // Try PM2 first
        exec('pm2 restart hubtrack-backend', (error, stdout, stderr) => {
            if (error) {
                console.log('PM2 restart failed, trying direct restart...');
                // Fallback to direct restart
                exec('node server.js', (error2, stdout2, stderr2) => {
                    if (error2) {
                        reject(error2);
                    } else {
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    });
}

async function monitorHealth() {
    try {
        const isHealthy = await checkProcessHealth();
        
        if (!isHealthy) {
            logCrash('Server process not responding on port 5000');
            
            if (crashCount < MAX_CRASHES_PER_HOUR) {
                console.log(`Waiting ${RESTART_DELAY/1000} seconds before restart...`);
                setTimeout(async () => {
                    try {
                        await restartServer();
                        console.log('Server restarted successfully');
                    } catch (error) {
                        logCrash('Failed to restart server', error);
                    }
                }, RESTART_DELAY);
            }
        }
    } catch (error) {
        logCrash('Error in health check', error);
    }
}

// Start monitoring
console.log('Starting crash monitor...');
console.log(`Crash log: ${CRASH_LOG}`);

// Check health every 30 seconds
setInterval(monitorHealth, 30000);

// Initial health check
monitorHealth();

// Handle process termination
process.on('SIGINT', () => {
    console.log('Crash monitor shutting down...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Crash monitor shutting down...');
    process.exit(0);
}); 
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
require('@electron/remote/main').initialize();
const wifi = require('node-wifi');
const axios = require('axios');

// Initialize wifi
wifi.init({
  iface: null // auto-select interface
});

// Store the main window reference
let mainWindow = null;

// Debug log to console and file
function debugLog(...args) {
  console.log(...args);
  
  // Also log to a file
  const logFile = path.join(app.getPath('userData'), 'hubtrack_debug.log');
  const logMessage = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : arg
  ).join(' ') + '\n';
  
  fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${logMessage}`);
}

// Create the main application window
function createWindow() {
  debugLog('Creating main window...');
  
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      enableRemoteModule: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  
  // Enable remote module for this window
  require('@electron/remote/main').enable(mainWindow.webContents);
  
  // Check if we're in development or production mode
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    // Load from local dev server in development
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
    debugLog('Opened in development mode');
  } else {
    // Load from built files in production
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    mainWindow.webContents.openDevTools(); // Keep DevTools open in production for now
    debugLog('Opened in production mode');
  }
  
  // Set up IPC listeners
  setupIPCListeners();
  
  // When window is closed, don't quit the app on macOS
  mainWindow.on('closed', function() {
    mainWindow = null;
  });
  
  debugLog('Main window created');
}

// Set up IPC listeners for main process
function setupIPCListeners() {
  debugLog('Setting up IPC listeners...');
  
  // Backend API proxy
  ipcMain.handle('backend-api', async (event, { method, endpoint, data }) => {
    try {
      debugLog(`Proxying ${method} request to ${endpoint}`);
      const response = await axios({
        method,
        url: `http://localhost:5000/api/${endpoint}`,
        data,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return { success: true, data: response.data };
    } catch (error) {
      debugLog('API proxy error:', error.message);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message 
      };
    }
  });

  // Listen for save-image events
  ipcMain.on('save-image', (event, { imageData, filename }) => {
    try {
      debugLog('Main process received save-image request for:', filename);
      
      // Create a simpler filename
      const simpleFilename = `hubtrack_image_${Date.now()}.jpg`;
      
      // Save to userData folder (guaranteed to exist and writable)
      const userDataPath = app.getPath('userData');
      const imagesDir = path.join(userDataPath, 'hubtrack_images');
      
      debugLog('UserData path:', userDataPath);
      debugLog('Images dir:', imagesDir);
      
      // Ensure images directory exists
      if (!fs.existsSync(imagesDir)) {
        debugLog('Creating images directory...');
        fs.mkdirSync(imagesDir, { recursive: true });
      }
      
      // Save the image
      const filePath = path.join(imagesDir, simpleFilename);
      
      // Clean up the base64 data
      let base64Data = imageData;
      if (base64Data.startsWith('data:image/jpeg;base64,')) {
        base64Data = base64Data.replace(/^data:image\/jpeg;base64,/, '');
      }
      
      debugLog('Writing file to:', filePath);
      debugLog('Base64 data length:', base64Data.length);
      
      // Write the file
      fs.writeFileSync(filePath, base64Data, 'base64');
      debugLog('Image saved successfully to:', filePath);
      
      // Also save a copy with the original filename
      const originalFilePath = path.join(imagesDir, filename);
      fs.writeFileSync(originalFilePath, base64Data, 'base64');
      debugLog('Also saved copy with original filename:', originalFilePath);
      
      // Send success response
      event.reply('save-image-response', { 
        success: true, 
        filePath,
        simpleFilename,
        originalFilePath
      });
      
    } catch (error) {
      debugLog('Error saving image in main process:', error);
      event.reply('save-image-response', { 
        success: false, 
        error: error.message || 'Unknown error' 
      });
    }
  });

  // WiFi functionality
  ipcMain.on('scan-networks', async (event) => {
    try {
      debugLog('Scanning for WiFi networks...');
      const networks = await wifi.scan();
      debugLog('Found networks:', networks);
      event.reply('scan-networks-response', { success: true, networks });
    } catch (error) {
      debugLog('Error scanning networks:', error);
      event.reply('scan-networks-response', { 
        success: false, 
        error: error.message || 'Failed to scan networks' 
      });
    }
  });

  ipcMain.on('connect-network', async (event, { ssid, password }) => {
    try {
      debugLog(`Connecting to network: ${ssid}`);
      await wifi.connect({ ssid, password });
      debugLog('Successfully connected to network');
      event.reply('connect-network-response', { success: true });
    } catch (error) {
      debugLog('Error connecting to network:', error);
      event.reply('connect-network-response', { 
        success: false, 
        error: error.message || 'Failed to connect to network' 
      });
    }
  });

  ipcMain.on('disconnect-network', async (event) => {
    try {
      debugLog('Disconnecting from current network...');
      await wifi.disconnect();
      debugLog('Successfully disconnected from network');
      event.reply('disconnect-network-response', { success: true });
    } catch (error) {
      debugLog('Error disconnecting from network:', error);
      event.reply('disconnect-network-response', { 
        success: false, 
        error: error.message || 'Failed to disconnect from network' 
      });
    }
  });

  ipcMain.on('get-current-connection', async (event) => {
    try {
      debugLog('Getting current connection...');
      const currentConnection = await wifi.getCurrentConnections();
      debugLog('Current connection:', currentConnection);
      event.reply('current-connection-response', { 
        success: true, 
        connection: currentConnection[0] || null 
      });
    } catch (error) {
      debugLog('Error getting current connection:', error);
      event.reply('current-connection-response', { 
        success: false, 
        error: error.message || 'Failed to get current connection' 
      });
    }
  });
  
  debugLog('IPC listeners set up');
}

// Create window when Electron is ready
app.on('ready', () => {
  debugLog('App ready event triggered');
  createWindow();
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') app.quit();
});

// On macOS, recreate window when dock icon is clicked
app.on('activate', function() {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
}); 
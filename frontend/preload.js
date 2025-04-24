const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const { app } = require('@electron/remote');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  fs: {
    writeFile: (filePath, data, encoding) => {
      return fs.writeFileSync(filePath, data, encoding);
    },
    mkdirSync: (dirPath, options) => {
      return fs.mkdirSync(dirPath, options);
    },
    existsSync: (path) => {
      return fs.existsSync(path);
    }
  },
  path: {
    join: (...args) => path.join(...args)
  },
  app: {
    getPath: (name) => app.getPath(name)
  },
  ipcRenderer: {
    saveImage: (imageData, filename) => {
      return new Promise((resolve, reject) => {
        try {
          // Set up one-time listener for the response
          ipcRenderer.once('save-image-response', (_, response) => {
            if (response.success) {
              resolve(response);
            } else {
              reject(new Error(response.error));
            }
          });
          
          // Send the request to the main process
          ipcRenderer.send('save-image', { imageData, filename });
        } catch (error) {
          reject(error);
        }
      });
    }
  }
}); 
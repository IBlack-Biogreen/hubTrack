console.log('Preload script loaded!');

import { contextBridge, ipcRenderer } from 'electron';
import fs from 'fs';
import path from 'path';
import { app } from '@electron/remote';

// Valid app.getPath parameter types
type AppGetPathName = 'home' | 'appData' | 'userData' | 'temp' | 'exe' | 'module' | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos' | 'logs' | 'sessionData' | 'recent' | 'crashDumps';

console.log('Exposing API to window.electron');
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  fs: {
    writeFile: (filePath: string, data: string | Buffer, encoding: BufferEncoding) => {
      return fs.writeFileSync(filePath, data, { encoding });
    },
    mkdirSync: (dirPath: string, options?: fs.MakeDirectoryOptions) => {
      return fs.mkdirSync(dirPath, options);
    },
    existsSync: (path: string) => {
      return fs.existsSync(path);
    }
  },
  path: {
    join: (...args: string[]) => path.join(...args)
  },
  app: {
    getPath: (name: AppGetPathName) => app.getPath(name)
  },
  api: {
    get: async (endpoint: string) => {
      const response = await ipcRenderer.invoke('backend-api', { method: 'GET', endpoint });
      if (response.success) {
        return response.data;
      }
      throw new Error(response.error);
    },
    post: async (endpoint: string, data: any) => {
      const response = await ipcRenderer.invoke('backend-api', { method: 'POST', endpoint, data });
      if (response.success) {
        return response.data;
      }
      throw new Error(response.error);
    }
  },
  ipcRenderer: {
    saveImage: (imageData: string, filename: string) => {
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
    },
    // WiFi functionality
    scanNetworks: () => {
      return new Promise((resolve, reject) => {
        try {
          ipcRenderer.once('scan-networks-response', (_, response) => {
            if (response.success) {
              resolve(response.networks);
            } else {
              reject(new Error(response.error));
            }
          });
          ipcRenderer.send('scan-networks');
        } catch (error) {
          reject(error);
        }
      });
    },
    connectToNetwork: (ssid: string, password: string) => {
      return new Promise((resolve, reject) => {
        try {
          ipcRenderer.once('connect-network-response', (_, response) => {
            if (response.success) {
              resolve(response);
            } else {
              reject(new Error(response.error));
            }
          });
          ipcRenderer.send('connect-network', { ssid, password });
        } catch (error) {
          reject(error);
        }
      });
    },
    disconnectFromNetwork: () => {
      return new Promise((resolve, reject) => {
        try {
          ipcRenderer.once('disconnect-network-response', (_, response) => {
            if (response.success) {
              resolve(response);
            } else {
              reject(new Error(response.error));
            }
          });
          ipcRenderer.send('disconnect-network');
        } catch (error) {
          reject(error);
        }
      });
    },
    getCurrentConnection: () => {
      return new Promise((resolve, reject) => {
        try {
          ipcRenderer.once('current-connection-response', (_, response) => {
            if (response.success) {
              resolve(response.connection);
            } else {
              reject(new Error(response.error));
            }
          });
          ipcRenderer.send('get-current-connection');
        } catch (error) {
          reject(error);
        }
      });
    }
  }
}); 
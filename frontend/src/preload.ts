console.log('Preload script loaded!');

import { contextBridge, ipcRenderer, shell } from 'electron';
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
  shell: {
    openExternal: (url: string) => shell.openExternal(url)
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
    saveImage: (imageData: string, filename: string) => ipcRenderer.invoke('save-image', { imageData, filename }),
    scanNetworks: () => ipcRenderer.invoke('scan-networks'),
    connectToNetwork: (ssid: string, password: string) => ipcRenderer.invoke('connect-to-network', { ssid, password }),
    disconnectFromNetwork: () => ipcRenderer.invoke('disconnect-from-network'),
    getCurrentConnection: () => ipcRenderer.invoke('get-current-connection')
  }
}); 
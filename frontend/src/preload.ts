import { contextBridge, ipcRenderer } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { app } from '@electron/remote';

// Valid app.getPath parameter types
type AppGetPathName = 'userData' | 'home' | 'appData' | 'sessionData' | 'temp' | 
                     'exe' | 'module' | 'desktop' | 'documents' | 'downloads' | 
                     'music' | 'pictures' | 'videos' | 'recent' | 'logs' | 'crashDumps';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  fs: {
    writeFile: (filePath: string, data: string | Buffer, encoding?: BufferEncoding) => {
      return fs.writeFileSync(filePath, data, encoding);
    },
    mkdirSync: (dirPath: string, options: fs.MakeDirectoryOptions) => {
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
  }
}); 
import { MakeDirectoryOptions } from 'fs';

// Valid app.getPath parameter types
type AppGetPathName = 'userData' | 'home' | 'appData' | 'sessionData' | 'temp' | 
                     'exe' | 'module' | 'desktop' | 'documents' | 'downloads' | 
                     'music' | 'pictures' | 'videos' | 'recent' | 'logs' | 'crashDumps';

interface SaveImageResponse {
  success: boolean;
  filePath?: string;
  simpleFilename?: string;
  originalFilePath?: string;
  error?: string;
}

interface ElectronAPI {
  fs: {
    writeFile: (filePath: string, data: string | Buffer, encoding?: BufferEncoding) => void;
    mkdirSync: (dirPath: string, options: MakeDirectoryOptions) => void;
    existsSync: (path: string) => boolean;
  };
  path: {
    join: (...args: string[]) => string;
  };
  app: {
    getPath: (name: AppGetPathName) => string;
  };
  ipcRenderer: {
    saveImage: (imageData: string, filename: string) => Promise<SaveImageResponse>;
  };
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

export {}; 
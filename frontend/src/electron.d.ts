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

interface WiFiNetwork {
  ssid: string;
  bssid: string;
  mac: string;
  channel: number;
  frequency: number;
  signal_level: number;
  quality: number;
  security: string[];
}

interface WiFiConnection {
  ssid: string;
  bssid: string;
  mac: string;
  channel: number;
  frequency: number;
  signal_level: number;
  quality: number;
  security: string[];
}

interface WiFiResponse {
  success: boolean;
  error?: string;
  networks?: WiFiNetwork[];
  connection?: WiFiConnection;
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
    scanNetworks: () => Promise<WiFiNetwork[]>;
    connectToNetwork: (ssid: string, password: string) => Promise<WiFiResponse>;
    disconnectFromNetwork: () => Promise<WiFiResponse>;
    getCurrentConnection: () => Promise<WiFiConnection>;
  };
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

export {}; 
declare global {
  interface Window {
    electron?: {
      fs: {
        writeFile: (filePath: string, data: string | Buffer, encoding: BufferEncoding) => void;
        mkdirSync: (dirPath: string, options?: any) => void;
        existsSync: (path: string) => boolean;
      };
      path: {
        join: (...args: string[]) => string;
      };
      app: {
        getPath: (name: string) => string;
      };
      api: {
        get: (endpoint: string) => Promise<any>;
        post: (endpoint: string, data: any) => Promise<any>;
      };
      ipcRenderer: {
        saveImage: (imageData: string, filename: string) => Promise<any>;
        scanNetworks: () => Promise<any>;
        connectToNetwork: (ssid: string, password: string) => Promise<any>;
        disconnectFromNetwork: () => Promise<any>;
        getCurrentConnection: () => Promise<any>;
      };
    };
  }
}

export {}; 
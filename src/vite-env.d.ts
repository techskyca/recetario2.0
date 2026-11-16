// Declaraciones de módulos para estilos CSS y entorno opcional de Electron
declare module '*.css' {}

declare module 'electron' {
  export const app: {
    getPath(name: string): string;
    whenReady(): Promise<void>;
    on(event: string, listener: (...args: unknown[]) => void): void;
    quit(): void;
  };
  export const ipcMain: {
    handle(channel: string, listener: (event: unknown, ...args: any[]) => unknown): void;
  };
  export class BrowserWindow {
    constructor(options: Record<string, unknown>);
    loadURL(url: string): Promise<void>;
    loadFile(filePath: string): Promise<void>;
  }
}


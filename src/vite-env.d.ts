/// <reference types="vite/client" />

declare module "*.jpeg" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  const src: string;
  export default src;
}

interface IElectronAPI {
  invoke: (channel: string, data?: any) => Promise<any>;
  on: (channel: string, callback: (...args: any[]) => void) => void;
  removeAllListeners: (channel: string) => void;
  getVersion: () => Promise<string>;
  getPlatformInfo: () => Promise<{
    platform: NodeJS.Platform;
    arch: string;
    version: string;
  }>;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
}

declare global {
  interface Window {
    electron: IElectronAPI;
    electronAPI: IElectronAPI;
  }
}

export {};

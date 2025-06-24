import { contextBridge, ipcRenderer } from 'electron';

export interface IElectronAPI {
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

const electronAPI: IElectronAPI = {
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  on: (channel, callback) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  getVersion: () => ipcRenderer.invoke('app:version'),
  getPlatformInfo: () => ipcRenderer.invoke('platform:info'),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
};

contextBridge.exposeInMainWorld('electron', electronAPI);
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electron: IElectronAPI;
    electronAPI: IElectronAPI;
  }
}
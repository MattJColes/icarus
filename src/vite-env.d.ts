/// <reference types="vite/client" />

declare global {
  interface Window {
    electron: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      on: (channel: string, callback: (...args: any[]) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

export {};

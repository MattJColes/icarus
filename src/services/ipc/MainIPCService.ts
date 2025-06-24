import { ipcMain, BrowserWindow } from 'electron';
import { IPCService, IPCMessage } from './IPCService';
import { v4 as uuidv4 } from 'uuid';

export class MainIPCService extends IPCService {
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    super({
      name: 'MainIPCService',
      version: '1.0.0',
    });
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  protected async onStart(): Promise<void> {
    this.setupDefaultHandlers();
    this.emit('ipc:ready');
  }

  protected async onStop(): Promise<void> {
    this.handlers.forEach((_, channel) => {
      ipcMain.removeHandler(channel);
    });
    this.handlers.clear();
    this.clearQueue();
  }

  async send<T = any>(channel: string, data: T): Promise<void> {
    if (!this.mainWindow) {
      throw new Error('Main window not set');
    }

    const message: IPCMessage<T> = {
      channel,
      data,
      timestamp: Date.now(),
      id: uuidv4(),
    };

    this.mainWindow.webContents.send(channel, message);
    this.emit('message:sent', { channel, id: message.id });
  }

  registerHandler<T = any, R = any>(channel: string, handler: (data: T) => Promise<R> | R): void {
    super.registerHandler(channel, handler);

    ipcMain.handle(channel, async (event, data: T) => {
      const message: IPCMessage<T> = {
        channel,
        data,
        timestamp: Date.now(),
        id: uuidv4(),
      };

      return this.handleMessage(message);
    });
  }

  unregisterHandler(channel: string): void {
    super.unregisterHandler(channel);
    ipcMain.removeHandler(channel);
  }

  private setupDefaultHandlers(): void {
    this.registerHandler('app:ping', () => ({
      pong: true,
      timestamp: Date.now(),
    }));

    this.registerHandler('app:getStatus', () => {
      return {
        services: Array.from(this.handlers.keys()),
        queueSize: this.getQueueSize(),
        isRunning: this.isRunning,
      };
    });
  }
}
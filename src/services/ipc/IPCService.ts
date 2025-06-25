import { Service, type ServiceConfig } from '../base/Service';

export interface IPCMessage<T = any> {
  channel: string;
  data: T;
  timestamp: number;
  id: string;
}

export interface IPCHandler<T = any, R = any> {
  (data: T): Promise<R> | R;
}

export abstract class IPCService extends Service {
  protected handlers: Map<string, IPCHandler> = new Map();
  private messageQueue: IPCMessage[] = [];
  private maxQueueSize = 1000;

  constructor(config: ServiceConfig) {
    super(config);
  }

  registerHandler<T = any, R = any>(channel: string, handler: IPCHandler<T, R>): void {
    if (this.handlers.has(channel)) {
      throw new Error(`Handler for channel ${channel} already exists`);
    }
    this.handlers.set(channel, handler);
    this.emit('handler:registered', channel);
  }

  unregisterHandler(channel: string): void {
    if (!this.handlers.has(channel)) {
      throw new Error(`Handler for channel ${channel} not found`);
    }
    this.handlers.delete(channel);
    this.emit('handler:unregistered', channel);
  }

  async handleMessage<T = any, R = any>(message: IPCMessage<T>): Promise<R> {
    const handler = this.handlers.get(message.channel);
    if (!handler) {
      throw new Error(`No handler registered for channel: ${message.channel}`);
    }

    try {
      const result = await handler(message.data);
      this.emit('message:handled', { channel: message.channel, id: message.id });
      return result;
    } catch (error) {
      this.emit('message:error', { channel: message.channel, id: message.id, error });
      throw error;
    }
  }

  protected queueMessage(message: IPCMessage): void {
    if (this.messageQueue.length >= this.maxQueueSize) {
      this.messageQueue.shift();
    }
    this.messageQueue.push(message);
  }

  protected processQueue(): void {
    while (this.messageQueue.length > 0 && this.isRunning) {
      const message = this.messageQueue.shift();
      if (message) {
        this.handleMessage(message).catch(error => {
          this.emit('queue:error', { message, error });
        });
      }
    }
  }

  getHandlers(): string[] {
    return Array.from(this.handlers.keys());
  }

  getQueueSize(): number {
    return this.messageQueue.length;
  }

  clearQueue(): void {
    this.messageQueue = [];
  }

  abstract send<T = any>(channel: string, data: T): Promise<void>;
}
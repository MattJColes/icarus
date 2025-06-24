import { EventEmitter } from 'events';

export interface ServiceConfig {
  name: string;
  version: string;
  enabled?: boolean;
}

export interface ServiceStatus {
  isRunning: boolean;
  lastError?: Error;
  lastStartTime?: Date;
  lastStopTime?: Date;
}

export abstract class Service extends EventEmitter {
  protected config: ServiceConfig;
  protected status: ServiceStatus;

  constructor(config: ServiceConfig) {
    super();
    this.config = config;
    this.status = {
      isRunning: false,
    };
  }

  get name(): string {
    return this.config.name;
  }

  get version(): string {
    return this.config.version;
  }

  get isRunning(): boolean {
    return this.status.isRunning;
  }

  get isEnabled(): boolean {
    return this.config.enabled ?? true;
  }

  getStatus(): ServiceStatus {
    return { ...this.status };
  }

  async start(): Promise<void> {
    if (!this.isEnabled) {
      throw new Error(`Service ${this.name} is disabled`);
    }

    if (this.status.isRunning) {
      throw new Error(`Service ${this.name} is already running`);
    }

    try {
      this.emit('starting');
      await this.onStart();
      this.status.isRunning = true;
      this.status.lastStartTime = new Date();
      this.emit('started');
    } catch (error) {
      this.status.lastError = error as Error;
      this.emit('error', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.status.isRunning) {
      throw new Error(`Service ${this.name} is not running`);
    }

    try {
      this.emit('stopping');
      await this.onStop();
      this.status.isRunning = false;
      this.status.lastStopTime = new Date();
      this.emit('stopped');
    } catch (error) {
      this.status.lastError = error as Error;
      this.emit('error', error);
      throw error;
    }
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  protected abstract onStart(): Promise<void>;
  protected abstract onStop(): Promise<void>;
}
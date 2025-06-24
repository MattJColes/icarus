import { Service, ServiceConfig } from './Service';
import { EventEmitter } from 'events';

export interface ServiceManagerConfig {
  autoStart?: boolean;
  startupDelay?: number;
}

export class ServiceManager extends EventEmitter {
  private services: Map<string, Service> = new Map();
  private config: ServiceManagerConfig;
  private startupOrder: string[] = [];

  constructor(config: ServiceManagerConfig = {}) {
    super();
    this.config = {
      autoStart: true,
      startupDelay: 100,
      ...config,
    };
  }

  register(service: Service, dependencies: string[] = []): void {
    if (this.services.has(service.name)) {
      throw new Error(`Service ${service.name} is already registered`);
    }

    this.services.set(service.name, service);
    this.updateStartupOrder(service.name, dependencies);

    service.on('error', (error) => {
      this.emit('service:error', { service: service.name, error });
    });

    service.on('started', () => {
      this.emit('service:started', service.name);
    });

    service.on('stopped', () => {
      this.emit('service:stopped', service.name);
    });

    this.emit('service:registered', service.name);
  }

  unregister(serviceName: string): void {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    if (service.isRunning) {
      throw new Error(`Cannot unregister running service ${serviceName}`);
    }

    this.services.delete(serviceName);
    this.startupOrder = this.startupOrder.filter(name => name !== serviceName);
    this.emit('service:unregistered', serviceName);
  }

  get(serviceName: string): Service | undefined {
    return this.services.get(serviceName);
  }

  getAll(): Service[] {
    return Array.from(this.services.values());
  }

  async startAll(): Promise<void> {
    for (const serviceName of this.startupOrder) {
      const service = this.services.get(serviceName);
      if (service && service.isEnabled && !service.isRunning) {
        await this.start(serviceName);
        if (this.config.startupDelay) {
          await this.delay(this.config.startupDelay);
        }
      }
    }
  }

  async stopAll(): Promise<void> {
    const reverseOrder = [...this.startupOrder].reverse();
    for (const serviceName of reverseOrder) {
      const service = this.services.get(serviceName);
      if (service && service.isRunning) {
        await this.stop(serviceName);
      }
    }
  }

  async start(serviceName: string): Promise<void> {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    await service.start();
  }

  async stop(serviceName: string): Promise<void> {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    await service.stop();
  }

  async restart(serviceName: string): Promise<void> {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    await service.restart();
  }

  getStatus(): Map<string, ReturnType<Service['getStatus']>> {
    const status = new Map();
    for (const [name, service] of this.services) {
      status.set(name, service.getStatus());
    }
    return status;
  }

  private updateStartupOrder(serviceName: string, dependencies: string[]): void {
    for (const dep of dependencies) {
      if (!this.services.has(dep) && !this.startupOrder.includes(dep)) {
        throw new Error(`Dependency ${dep} for service ${serviceName} not found`);
      }
    }

    const serviceIndex = this.startupOrder.findIndex(name => {
      const service = this.services.get(name);
      if (!service) return false;
      
      return dependencies.includes(name);
    });

    if (serviceIndex === -1) {
      this.startupOrder.push(serviceName);
    } else {
      this.startupOrder.splice(serviceIndex + 1, 0, serviceName);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
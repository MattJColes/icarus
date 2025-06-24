import { Service, ServiceConfig } from '../Service';

class TestService extends Service {
  constructor(config: ServiceConfig) {
    super(config);
  }

  protected async onStart(): Promise<void> {
    // Mock implementation
  }

  protected async onStop(): Promise<void> {
    // Mock implementation
  }
}

describe('Service', () => {
  let service: TestService;

  beforeEach(() => {
    service = new TestService({
      name: 'TestService',
      version: '1.0.0',
    });
  });

  describe('initialization', () => {
    it('should initialize with correct config', () => {
      expect(service.name).toBe('TestService');
      expect(service.version).toBe('1.0.0');
      expect(service.isRunning).toBe(false);
      expect(service.isEnabled).toBe(true);
    });

    it('should respect enabled flag', () => {
      const disabledService = new TestService({
        name: 'DisabledService',
        version: '1.0.0',
        enabled: false,
      });
      expect(disabledService.isEnabled).toBe(false);
    });
  });

  describe('start', () => {
    it('should start successfully', async () => {
      const startingHandler = jest.fn();
      const startedHandler = jest.fn();
      
      service.on('starting', startingHandler);
      service.on('started', startedHandler);

      await service.start();

      expect(service.isRunning).toBe(true);
      expect(startingHandler).toHaveBeenCalled();
      expect(startedHandler).toHaveBeenCalled();
    });

    it('should throw error if already running', async () => {
      await service.start();
      await expect(service.start()).rejects.toThrow('Service TestService is already running');
    });

    it('should throw error if disabled', async () => {
      const disabledService = new TestService({
        name: 'DisabledService',
        version: '1.0.0',
        enabled: false,
      });
      await expect(disabledService.start()).rejects.toThrow('Service DisabledService is disabled');
    });

    it('should emit error on failure', async () => {
      const errorService = new TestService({
        name: 'ErrorService',
        version: '1.0.0',
      });
      
      const testError = new Error('Start failed');
      errorService['onStart'] = jest.fn().mockRejectedValue(testError);
      
      const errorHandler = jest.fn();
      errorService.on('error', errorHandler);

      await expect(errorService.start()).rejects.toThrow('Start failed');
      expect(errorHandler).toHaveBeenCalledWith(testError);
    });
  });

  describe('stop', () => {
    beforeEach(async () => {
      await service.start();
    });

    it('should stop successfully', async () => {
      const stoppingHandler = jest.fn();
      const stoppedHandler = jest.fn();
      
      service.on('stopping', stoppingHandler);
      service.on('stopped', stoppedHandler);

      await service.stop();

      expect(service.isRunning).toBe(false);
      expect(stoppingHandler).toHaveBeenCalled();
      expect(stoppedHandler).toHaveBeenCalled();
    });

    it('should throw error if not running', async () => {
      await service.stop();
      await expect(service.stop()).rejects.toThrow('Service TestService is not running');
    });
  });

  describe('restart', () => {
    it('should restart successfully', async () => {
      await service.start();
      const stopSpy = jest.spyOn(service, 'stop');
      const startSpy = jest.spyOn(service, 'start');

      await service.restart();

      expect(stopSpy).toHaveBeenCalled();
      expect(startSpy).toHaveBeenCalled();
      expect(service.isRunning).toBe(true);
    });
  });

  describe('getStatus', () => {
    it('should return current status', async () => {
      const status = service.getStatus();
      expect(status.isRunning).toBe(false);
      expect(status.lastStartTime).toBeUndefined();

      await service.start();
      const runningStatus = service.getStatus();
      expect(runningStatus.isRunning).toBe(true);
      expect(runningStatus.lastStartTime).toBeInstanceOf(Date);
    });
  });
});
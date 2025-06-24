import { OllamaService } from '../OllamaService';
import axios from 'axios';

jest.mock('axios');
jest.mock('child_process');

describe('OllamaService', () => {
  let service: OllamaService;
  let mockAxiosInstance: any;

  beforeEach(() => {
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn(),
    };
    (axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);

    service = new OllamaService({
      name: 'OllamaService',
      version: '1.0.0',
      autoInstall: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isOllamaRunning', () => {
    it('should return true if Ollama is running', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { models: [] } });
      const result = await service.isOllamaRunning();
      expect(result).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/tags');
    });

    it('should return false if Ollama is not running', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Connection refused'));
      const result = await service.isOllamaRunning();
      expect(result).toBe(false);
    });
  });

  describe('listModels', () => {
    it('should return list of models', async () => {
      const mockModels = [
        { name: 'qwen2.5:7b', size: 4000000000 },
        { name: 'llama3:8b', size: 5000000000 },
      ];
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { models: mockModels } });

      const models = await service.listModels();
      expect(models).toEqual(mockModels);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/tags');
    });
  });

  describe('chat', () => {
    it('should send chat request and return response', async () => {
      const request = {
        model: 'qwen2.5:7b',
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };
      const mockResponse = {
        model: 'qwen2.5:7b',
        created_at: '2024-01-01T00:00:00Z',
        message: { role: 'assistant', content: 'Hello! How can I help you?' },
        done: true,
      };

      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

      const response = await service.chat(request);
      expect(response).toEqual(mockResponse);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/chat', {
        ...request,
        stream: false,
      });
    });
  });

  describe('recommendModel', () => {
    it('should recommend appropriate model based on available memory', async () => {
      const originalFreemem = jest.requireActual('os').freemem;
      jest.doMock('os', () => ({
        ...jest.requireActual('os'),
        freemem: jest.fn(),
        totalmem: jest.fn().mockReturnValue(16 * 1024 ** 3),
      }));

      const cases = [
        { memory: 2 * 1024 ** 3, expected: 'qwen2.5:0.5b' },
        { memory: 6 * 1024 ** 3, expected: 'qwen2.5:3b' },
        { memory: 12 * 1024 ** 3, expected: 'qwen2.5:7b' },
        { memory: 20 * 1024 ** 3, expected: 'qwen2.5:14b' },
      ];

      for (const testCase of cases) {
        const os = await import('os');
        (os.freemem as jest.Mock).mockReturnValue(testCase.memory);
        
        const recommendation = await service.recommendModel();
        expect(recommendation).toBe(testCase.expected);
      }
    });
  });

  describe('pullModel', () => {
    it('should pull model and report progress', async () => {
      const mockStream = {
        on: jest.fn((event, handler) => {
          if (event === 'data') {
            handler(Buffer.from(JSON.stringify({ status: 'downloading', percent: 50 }) + '\n'));
            handler(Buffer.from(JSON.stringify({ status: 'success' }) + '\n'));
          }
          if (event === 'end') {
            handler();
          }
        }),
      };

      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockStream });

      const progressCallback = jest.fn();
      await service.pullModel('qwen2.5:7b', progressCallback);

      expect(progressCallback).toHaveBeenCalledWith({ status: 'downloading', percent: 50 });
      expect(progressCallback).toHaveBeenCalledWith({ status: 'success' });
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/pull', 
        { name: 'qwen2.5:7b' }, 
        { responseType: 'stream' }
      );
    });
  });
});
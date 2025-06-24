import { Service, ServiceConfig } from '../base/Service';
import axios, { AxiosInstance } from 'axios';
import { spawn } from 'child_process';
import { platform } from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  OllamaModel,
  OllamaModelInfo,
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaPullProgress,
  OllamaEmbeddingRequest,
  OllamaEmbeddingResponse,
  OllamaGenerateRequest,
  OllamaGenerateResponse,
} from './types';

export interface OllamaServiceConfig extends ServiceConfig {
  baseUrl?: string;
  autoInstall?: boolean;
  modelsDir?: string;
}

export class OllamaService extends Service {
  private client: AxiosInstance;
  private ollamaProcess: any | null = null;
  private baseUrl: string;
  private autoInstall: boolean;
  private modelsDir: string;

  constructor(config: OllamaServiceConfig = { name: 'OllamaService', version: '1.0.0' }) {
    super(config);
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.autoInstall = config.autoInstall ?? true;
    this.modelsDir = config.modelsDir || path.join(process.env.HOME || '', '.ollama', 'models');

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 300000, // 5 minutes for model operations
    });
  }

  protected async onStart(): Promise<void> {
    const isInstalled = await this.isOllamaInstalled();
    
    if (!isInstalled) {
      if (this.autoInstall) {
        this.emit('installing');
        await this.installOllama();
      } else {
        throw new Error('Ollama is not installed. Please install it manually or enable autoInstall.');
      }
    }

    const isRunning = await this.isOllamaRunning();
    if (!isRunning) {
      await this.startOllamaServer();
    }

    await this.waitForServer();
    this.emit('ready');
  }

  protected async onStop(): Promise<void> {
    if (this.ollamaProcess) {
      this.ollamaProcess.kill();
      this.ollamaProcess = null;
    }
  }

  async isOllamaInstalled(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('ollama --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  async isOllamaRunning(): Promise<boolean> {
    try {
      await this.client.get('/api/tags');
      return true;
    } catch {
      return false;
    }
  }

  private async installOllama(): Promise<void> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const platformName = platform();
    let installCommand: string;

    switch (platformName) {
      case 'darwin':
        installCommand = 'curl -fsSL https://ollama.ai/install.sh | sh';
        break;
      case 'linux':
        installCommand = 'curl -fsSL https://ollama.ai/install.sh | sh';
        break;
      case 'win32':
        throw new Error('Windows installation not yet implemented. Please install Ollama manually.');
      default:
        throw new Error(`Unsupported platform: ${platformName}`);
    }

    this.emit('install:progress', { status: 'downloading' });
    await execAsync(installCommand);
    this.emit('install:complete');
  }

  private async startOllamaServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ollamaProcess = spawn('ollama', ['serve'], {
        detached: false,
        stdio: 'pipe',
      });

      this.ollamaProcess.on('error', (error) => {
        reject(new Error(`Failed to start Ollama server: ${error.message}`));
      });

      this.ollamaProcess.stdout?.on('data', (data) => {
        this.emit('server:log', data.toString());
      });

      this.ollamaProcess.stderr?.on('data', (data) => {
        this.emit('server:error', data.toString());
      });

      setTimeout(resolve, 2000);
    });
  }

  private async waitForServer(maxAttempts = 30, delay = 1000): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      if (await this.isOllamaRunning()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    throw new Error('Ollama server failed to start');
  }

  async listModels(): Promise<OllamaModel[]> {
    const response = await this.client.get<{ models: OllamaModel[] }>('/api/tags');
    return response.data.models;
  }

  async getModel(name: string): Promise<OllamaModelInfo> {
    const response = await this.client.get<OllamaModelInfo>(`/api/show`, {
      params: { name },
    });
    return response.data;
  }

  async pullModel(name: string, onProgress?: (progress: OllamaPullProgress) => void): Promise<void> {
    const response = await this.client.post('/api/pull', { name }, {
      responseType: 'stream',
    });

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().trim().split('\n');
        for (const line of lines) {
          try {
            const progress = JSON.parse(line) as OllamaPullProgress;
            if (onProgress) {
              onProgress(progress);
            }
            if (progress.status === 'success') {
              resolve();
            }
          } catch (error) {
            // Ignore JSON parse errors
          }
        }
      });

      response.data.on('error', reject);
      response.data.on('end', resolve);
    });
  }

  async deleteModel(name: string): Promise<void> {
    await this.client.delete('/api/delete', { data: { name } });
  }

  async chat(request: OllamaChatRequest): Promise<OllamaChatResponse> {
    const response = await this.client.post<OllamaChatResponse>('/api/chat', {
      ...request,
      stream: false,
    });
    return response.data;
  }

  async *chatStream(request: OllamaChatRequest): AsyncGenerator<OllamaChatResponse> {
    const response = await this.client.post('/api/chat', {
      ...request,
      stream: true,
    }, {
      responseType: 'stream',
    });

    for await (const chunk of response.data) {
      const lines = chunk.toString().trim().split('\n');
      for (const line of lines) {
        if (line) {
          try {
            yield JSON.parse(line) as OllamaChatResponse;
          } catch (error) {
            console.error('Failed to parse chat response:', error);
          }
        }
      }
    }
  }

  async generate(request: OllamaGenerateRequest): Promise<OllamaGenerateResponse> {
    const response = await this.client.post<OllamaGenerateResponse>('/api/generate', {
      ...request,
      stream: false,
    });
    return response.data;
  }

  async *generateStream(request: OllamaGenerateRequest): AsyncGenerator<OllamaGenerateResponse> {
    const response = await this.client.post('/api/generate', {
      ...request,
      stream: true,
    }, {
      responseType: 'stream',
    });

    for await (const chunk of response.data) {
      const lines = chunk.toString().trim().split('\n');
      for (const line of lines) {
        if (line) {
          try {
            yield JSON.parse(line) as OllamaGenerateResponse;
          } catch (error) {
            console.error('Failed to parse generate response:', error);
          }
        }
      }
    }
  }

  async embeddings(request: OllamaEmbeddingRequest): Promise<OllamaEmbeddingResponse> {
    const response = await this.client.post<OllamaEmbeddingResponse>('/api/embeddings', request);
    return response.data;
  }

  async getSystemInfo(): Promise<{
    totalMemory: number;
    availableMemory: number;
    gpuInfo?: any;
  }> {
    const { totalmem, freemem } = await import('os');
    return {
      totalMemory: totalmem(),
      availableMemory: freemem(),
    };
  }

  async recommendModel(): Promise<string> {
    const systemInfo = await this.getSystemInfo();
    const availableGB = systemInfo.availableMemory / (1024 ** 3);

    if (availableGB < 4) {
      return 'qwen2.5:0.5b';
    } else if (availableGB < 8) {
      return 'qwen2.5:3b';
    } else if (availableGB < 16) {
      return 'qwen2.5:7b';
    } else {
      return 'qwen2.5:14b';
    }
  }
}
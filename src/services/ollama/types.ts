export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    families?: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaModelInfo {
  license?: string;
  modelfile?: string;
  parameters?: string;
  template?: string;
  details?: {
    format: string;
    family: string;
    families?: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
  format?: 'json';
  options?: OllamaOptions;
  keep_alive?: string | number;
}

export interface OllamaOptions {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  repeat_penalty?: number;
  seed?: number;
  num_predict?: number;
  num_ctx?: number;
  stop?: string[];
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaChatMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaPullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
  percent?: number;
}

export interface OllamaEmbeddingRequest {
  model: string;
  prompt: string;
  options?: OllamaOptions;
  keep_alive?: string | number;
}

export interface OllamaEmbeddingResponse {
  embedding: number[];
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  images?: string[];
  format?: 'json';
  options?: OllamaOptions;
  system?: string;
  template?: string;
  context?: number[];
  stream?: boolean;
  raw?: boolean;
  keep_alive?: string | number;
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}
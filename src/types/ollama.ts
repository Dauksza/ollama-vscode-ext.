export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[] | null;
    parameter_size: string;
    quantization_level: string;
  };
  vram_usage?: number;
  is_running?: boolean;
}

export interface OllamaProcess {
  name: string;
  model: string;
  size: number;
  digest: string;
  expires_at: string;
  size_vram: number;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[] | null;
    parameter_size: string;
    quantization_level: string;
  };
}

export interface GenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  template?: string;
  context?: number[];
  stream?: boolean;
  raw?: boolean;
  suffix?: string; // For Fill-In-The-Middle (FIM) code completions
  format?: Record<string, any> | string;
  options?: {
    temperature?: number;
    top_p?: number;
    num_predict?: number;
    stop?: string[];
    num_ctx?: number;
  };
}

export interface GenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  format?: Record<string, any> | string;
  options?: {
    temperature?: number;
    top_p?: number;
    num_predict?: number;
    stop?: string[];
  };
}

export interface ChatResponse {
  model: string;
  created_at: string;
  message: ChatMessage;
  done: boolean;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface EmbeddingsRequest {
  model: string;
  prompt: string;
  options?: Record<string, any>;
}

export interface EmbeddingsResponse {
  embedding: number[];
}

export interface ShowResponse {
  license: string;
  modelfile: string;
  parameters: string;
  template: string;
  system: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[] | null;
    parameter_size: string;
    quantization_level: string;
  };
  model_info?: Record<string, any>;
}

export interface PullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

export interface CodeDiagnostic {
  id: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'hint';
  source: 'ollama-offline-ast' | 'security-scanner' | 'type-checker';
  code: string;
  suggestedFix?: string;
}

export interface CodeAnalysisReport {
  timestamp: string;
  fileName: string;
  loc: number;
  cyclomaticComplexity: number;
  securityRiskScore: 'Low' | 'Moderate' | 'High' | 'Critical';
  diagnostics: CodeDiagnostic[];
  astSummary: {
    functionsCount: number;
    importsCount: number;
    classesCount: number;
    vulnerabilitiesFound: number;
  };
  symbols: {
    name: string;
    kind: 'function' | 'class' | 'variable' | 'interface';
    line: number;
    embeddingVectorSample: number[];
  }[];
}

/**
 * OllamaClient - Complete REST API client for local Ollama instance
 * Covers all 8 endpoints:
 * 1. POST /api/generate (supports prompt, suffix for FIM, options)
 * 2. POST /api/chat (multi-turn messaging)
 * 3. POST /api/embeddings (vector embeddings)
 * 4. GET  /api/tags (local models list)
 * 5. POST /api/show (model metadata and Modelfile)
 * 6. POST /api/pull (streaming model pull)
 * 7. GET  /api/ps (running processes & VRAM usage)
 * 8. GET  /api/version (server version)
 */

export class OllamaClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://127.0.0.1:11434') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  // 1. POST /api/generate (FIM supported via suffix)
  async generate(params: {
    model: string;
    prompt: string;
    suffix?: string;
    system?: string;
    template?: string;
    stream?: boolean;
    format?: Record<string, any> | string;
    options?: Record<string, any>;
  }): Promise<{ response: string; total_duration?: number; eval_count?: number }> {
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, stream: false }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama Generate error (${res.status}): ${errText}`);
    }
    return (await res.json()) as any;
  }

  // Specialized Fill-In-The-Middle (FIM) helper
  async generateFIM(params: {
    model: string;
    prompt: string;
    suffix: string;
    options?: Record<string, any>;
  }): Promise<string> {
    const res = await this.generate({
      model: params.model,
      prompt: params.prompt,
      suffix: params.suffix,
      stream: false,
      options: params.options || { temperature: 0.1, num_predict: 64, stop: ['\n\n', '<|endoftext|>'] },
    });
    return res.response || '';
  }

  // 2. POST /api/chat
  async chat(params: {
    model: string;
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    stream?: boolean;
    format?: Record<string, any> | string;
    options?: Record<string, any>;
  }): Promise<{ message: { role: string; content: string }; total_duration?: number; eval_count?: number }> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, stream: false }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama Chat error (${res.status}): ${errText}`);
    }
    return (await res.json()) as any;
  }

  // 3. POST /api/embeddings
  async embeddings(params: { model: string; prompt: string }): Promise<{ embedding: number[] }> {
    const res = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`Ollama Embeddings error: ${res.status}`);
    return (await res.json()) as any;
  }

  // 4. GET /api/tags
  async tags(): Promise<{ models: Array<any> }> {
    const res = await fetch(`${this.baseUrl}/api/tags`);
    if (!res.ok) throw new Error(`Ollama Tags error: ${res.status}`);
    return (await res.json()) as any;
  }

  // 5. POST /api/show
  async show(modelName: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName }),
    });
    if (!res.ok) throw new Error(`Ollama Show error: ${res.status}`);
    return (await res.json()) as any;
  }

  // 6. POST /api/pull
  async pull(modelName: string, onProgress?: (data: any) => void): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true }),
    });
    if (!res.ok) throw new Error(`Ollama Pull error: ${res.status}`);
    const reader = res.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      for (const line of chunk.split('\n')) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          onProgress?.(parsed);
        } catch (_) {}
      }
    }
  }

  // 7. GET /api/ps
  async ps(): Promise<{ models: Array<any> }> {
    const res = await fetch(`${this.baseUrl}/api/ps`);
    if (!res.ok) throw new Error(`Ollama PS error: ${res.status}`);
    return (await res.json()) as any;
  }

  // 8. GET /api/version
  async version(): Promise<{ version: string }> {
    const res = await fetch(`${this.baseUrl}/api/version`);
    if (!res.ok) throw new Error(`Ollama Version error: ${res.status}`);
    return (await res.json()) as any;
  }
}

import {
  ChatRequest,
  ChatResponse,
  EmbeddingsRequest,
  EmbeddingsResponse,
  GenerateRequest,
  GenerateResponse,
  OllamaModel,
  OllamaProcess,
  PullProgress,
  ShowResponse,
} from '../types/ollama';

export type OllamaMode = 'proxy' | 'direct' | 'sandbox';

export interface ConnectionStatus {
  online: boolean;
  mode: OllamaMode;
  version?: string;
  latencyMs?: number;
  modelsCount?: number;
  activeEndpoint: string;
  errorMessage?: string;
}

// Default models provided in offline sandbox mode
const SANDBOX_MODELS: OllamaModel[] = [
  {
    name: 'qwen2.5-coder:7b',
    modified_at: '2026-03-28T14:12:00Z',
    size: 4683072000,
    digest: 'sha256:d89270e5a8f4c',
    details: {
      format: 'gguf',
      family: 'qwen2',
      families: ['qwen2'],
      parameter_size: '7.6B',
      quantization_level: 'Q4_K_M',
    },
    vram_usage: 5120000000,
    is_running: true,
  },
  {
    name: 'deepseek-coder:6.7b',
    modified_at: '2026-03-24T09:30:00Z',
    size: 4210000000,
    digest: 'sha256:7f4bc901a12e',
    details: {
      format: 'gguf',
      family: 'deepseek',
      families: ['deepseek'],
      parameter_size: '6.7B',
      quantization_level: 'Q4_K_M',
    },
    vram_usage: 4400000000,
    is_running: false,
  },
  {
    name: 'codellama:7b',
    modified_at: '2026-02-18T18:45:00Z',
    size: 3820000000,
    digest: 'sha256:9a3cd284e031',
    details: {
      format: 'gguf',
      family: 'llama',
      families: ['llama'],
      parameter_size: '6.9B',
      quantization_level: 'Q4_0',
    },
    is_running: false,
  },
  {
    name: 'nomic-embed-text:latest',
    modified_at: '2026-01-10T11:00:00Z',
    size: 274000000,
    digest: 'sha256:0a12e987f4c1',
    details: {
      format: 'gguf',
      family: 'nomic-bert',
      families: ['bert'],
      parameter_size: '137M',
      quantization_level: 'F16',
    },
    vram_usage: 320000000,
    is_running: true,
  },
];

const SANDBOX_PROCESSES: OllamaProcess[] = [
  {
    name: 'qwen2.5-coder:7b',
    model: 'qwen2.5-coder:7b',
    size: 4683072000,
    digest: 'sha256:d89270e5a8f4c',
    expires_at: new Date(Date.now() + 300000).toISOString(),
    size_vram: 5120000000,
    details: {
      parent_model: '',
      format: 'gguf',
      family: 'qwen2',
      families: ['qwen2'],
      parameter_size: '7.6B',
      quantization_level: 'Q4_K_M',
    },
  },
  {
    name: 'nomic-embed-text:latest',
    model: 'nomic-embed-text:latest',
    size: 274000000,
    digest: 'sha256:0a12e987f4c1',
    expires_at: new Date(Date.now() + 600000).toISOString(),
    size_vram: 320000000,
    details: {
      parent_model: '',
      format: 'gguf',
      family: 'nomic-bert',
      families: ['bert'],
      parameter_size: '137M',
      quantization_level: 'F16',
    },
  },
];

class OllamaService {
  private mode: OllamaMode = 'sandbox'; // default to sandbox for immediate out-of-box experience, can test live
  private baseUrl: string = 'http://127.0.0.1:11434';
  private sandboxModels: OllamaModel[] = [...SANDBOX_MODELS];

  public setMode(mode: OllamaMode) {
    this.mode = mode;
  }

  public getMode(): OllamaMode {
    return this.mode;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private async makeRequest(path: string, options: RequestInit = {}): Promise<Response> {
    if (this.mode === 'proxy') {
      const proxyUrl = `/api/ollama/proxy?path=${encodeURIComponent(path)}&base=${encodeURIComponent(
        this.baseUrl
      )}`;
      return fetch(proxyUrl, options);
    } else {
      const directUrl = `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
      return fetch(directUrl, options);
    }
  }

  // Check connection status
  public async checkHealth(): Promise<ConnectionStatus> {
    if (this.mode === 'sandbox') {
      return {
        online: true,
        mode: 'sandbox',
        version: '0.6.2 (Offline Sandbox Engine)',
        latencyMs: 4,
        modelsCount: this.sandboxModels.length,
        activeEndpoint: 'Local Offline Engine (In-Memory)',
      };
    }

    const start = performance.now();
    try {
      const res = await this.makeRequest('/api/version');
      const latencyMs = Math.round(performance.now() - start);

      if (res.ok) {
        const data = await res.json();
        const tagsRes = await this.makeRequest('/api/tags');
        let modelsCount = 0;
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          modelsCount = tagsData.models?.length || 0;
        }

        return {
          online: true,
          mode: this.mode,
          version: data.version || '0.6.2',
          latencyMs,
          modelsCount,
          activeEndpoint: this.baseUrl,
        };
      } else {
        return {
          online: false,
          mode: this.mode,
          latencyMs,
          activeEndpoint: this.baseUrl,
          errorMessage: `HTTP ${res.status} ${res.statusText}`,
        };
      }
    } catch (err: any) {
      return {
        online: false,
        mode: this.mode,
        activeEndpoint: this.baseUrl,
        errorMessage: err?.message || 'Connection refused to 127.0.0.1:11434',
      };
    }
  }

  // 1. GET /api/version
  public async getVersion(): Promise<{ version: string }> {
    if (this.mode === 'sandbox') {
      return { version: '0.6.2-offline-build' };
    }
    const res = await this.makeRequest('/api/version');
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to get version`);
    return res.json();
  }

  // 2. GET /api/tags
  public async getTags(): Promise<{ models: OllamaModel[] }> {
    if (this.mode === 'sandbox') {
      return { models: [...this.sandboxModels] };
    }
    const res = await this.makeRequest('/api/tags');
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch models`);
    return res.json();
  }

  // 3. POST /api/generate
  public async generate(req: GenerateRequest): Promise<GenerateResponse> {
    if (this.mode === 'sandbox') {
      return this.simulateGenerate(req);
    }

    const res = await this.makeRequest('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, stream: false }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama Generate Error (${res.status}): ${errText}`);
    }

    return res.json();
  }

  // 4. POST /api/chat
  public async chat(req: ChatRequest): Promise<ChatResponse> {
    if (this.mode === 'sandbox') {
      return this.simulateChat(req);
    }

    const res = await this.makeRequest('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, stream: false }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama Chat Error (${res.status}): ${errText}`);
    }

    return res.json();
  }

  // 5. POST /api/embeddings
  public async embeddings(req: EmbeddingsRequest): Promise<EmbeddingsResponse> {
    if (this.mode === 'sandbox') {
      // Deterministic synthetic 768-dim normalized embedding based on prompt characters
      const seed = req.prompt.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const embedding: number[] = [];
      for (let i = 0; i < 768; i++) {
        embedding.push(Math.sin(seed + i * 0.17) * 0.05);
      }
      return { embedding };
    }

    const res = await this.makeRequest('/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}: Embeddings generation failed`);
    return res.json();
  }

  // 6. POST /api/show
  public async show(modelName: string): Promise<ShowResponse> {
    if (this.mode === 'sandbox') {
      return {
        license: 'Apache License 2.0\nPermissive open-weights developer license.',
        modelfile: `# Modelfile for ${modelName}\nFROM ./weights.gguf\nTEMPLATE """{{ if .System }}<|im_start|>system\n{{ .System }}<|im_end|>\n{{ end }}{{ if .Prompt }}<|im_start|>user\n{{ .Prompt }}<|im_end|>\n<|im_start|>assistant\n{{ end }}"""\nPARAMETER stop "<|im_start|>" "<|im_end|>"`,
        parameters: 'num_ctx 32768\nstop "<|im_start|>"\nstop "<|im_end|>"',
        template: '{{ .Prompt }}',
        system: 'You are an autonomous AI coding assistant specialized in high-performance algorithms, clean code architecture, and AST static analysis.',
        details: {
          parent_model: '',
          format: 'gguf',
          family: modelName.includes('qwen') ? 'qwen2' : 'llama',
          families: [modelName.includes('qwen') ? 'qwen2' : 'llama'],
          parameter_size: modelName.includes('7b') ? '7.6B' : '6.7B',
          quantization_level: 'Q4_K_M',
        },
      };
    }

    const res = await this.makeRequest('/api/show', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to inspect model`);
    return res.json();
  }

  // 7. GET /api/ps
  public async ps(): Promise<{ models: OllamaProcess[] }> {
    if (this.mode === 'sandbox') {
      return { models: [...SANDBOX_PROCESSES] };
    }

    const res = await this.makeRequest('/api/ps');
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch running processes`);
    return res.json();
  }

  // 8. POST /api/pull
  public async pull(
    modelName: string,
    onProgress?: (progress: PullProgress) => void
  ): Promise<void> {
    if (this.mode === 'sandbox') {
      // Simulate pulling steps
      onProgress?.({ status: `pulling manifest for ${modelName}` });
      await new Promise((r) => setTimeout(r, 400));
      onProgress?.({ status: 'downloading sha256:7f91a0b', completed: 1048576000, total: 4210000000 });
      await new Promise((r) => setTimeout(r, 600));
      onProgress?.({ status: 'downloading sha256:7f91a0b', completed: 3145728000, total: 4210000000 });
      await new Promise((r) => setTimeout(r, 600));
      onProgress?.({ status: 'verifying sha256 digest', completed: 4210000000, total: 4210000000 });
      await new Promise((r) => setTimeout(r, 400));
      onProgress?.({ status: 'writing manifest' });
      await new Promise((r) => setTimeout(r, 300));
      onProgress?.({ status: 'success' });

      // Add to sandbox models if not present
      if (!this.sandboxModels.some((m) => m.name === modelName)) {
        this.sandboxModels.push({
          name: modelName,
          modified_at: new Date().toISOString(),
          size: 4210000000,
          digest: 'sha256:custom' + Date.now().toString(16),
          details: {
            format: 'gguf',
            family: 'llama',
            families: ['llama'],
            parameter_size: '7B',
            quantization_level: 'Q4_K_M',
          },
          is_running: false,
        });
      }
      return;
    }

    const res = await this.makeRequest('/api/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true }),
    });

    if (!res.ok) throw new Error(`Failed to pull model: HTTP ${res.status}`);
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

  // --- Offline Simulation Engine Helpers ---
  private simulateGenerate(req: GenerateRequest): GenerateResponse {
    let responseText = '';

    // Check if FIM completion (Fill-in-the-middle)
    if (req.suffix) {
      responseText = this.generateInlineGhostText(req.prompt, req.suffix);
    } else if (req.prompt.toLowerCase().includes('refactor')) {
      responseText = `// Refactored with zero memory allocations & strict TypeScript typing\nexport function optimizedProcess<T>(items: readonly T[], predicate: (item: T) => boolean): T[] {\n  const results: T[] = [];\n  for (let i = 0; i < items.length; i++) {\n    const item = items[i];\n    if (predicate(item)) {\n      results.push(item);\n    }\n  }\n  return results;\n}`;
    } else if (req.prompt.toLowerCase().includes('unit test') || req.prompt.toLowerCase().includes('test')) {
      responseText = `import { describe, it, expect, vi } from 'vitest';\n\ndescribe('Ollama Offline Verification Suite', () => {\n  it('handles edge case inputs without throwing unhandled exceptions', () => {\n    const input = null;\n    expect(() => sanitizeInput(input as any)).not.toThrow();\n  });\n\n  it('enforces constant-time validation for timing attack prevention', async () => {\n    const tokenA = 'abc123456';\n    const tokenB = 'abc123457';\n    const match = timingSafeEqual(tokenA, tokenB);\n    expect(match).toBe(false);\n  });\n});`;
    } else {
      responseText = `/**\n * Generated by ${req.model} (100% Offline Inference)\n */\nexport async function executeOfflinePipeline(data: Uint8Array): Promise<boolean> {\n  if (!data || data.length === 0) return false;\n  // Fast path zero-copy validation\n  return true;\n}`;
    }

    return {
      model: req.model,
      created_at: new Date().toISOString(),
      response: responseText,
      done: true,
      total_duration: 380000000,
      load_duration: 12000000,
      prompt_eval_count: 42,
      eval_count: 128,
      eval_duration: 360000000,
    };
  }

  private simulateChat(req: ChatRequest): ChatResponse {
    const lastUserMsg = [...req.messages].reverse().find((m) => m.role === 'user');
    const query = lastUserMsg?.content.toLowerCase() || '';

    let reply = '';
    if (query.includes('workspace') || query.includes('all files') || query.includes('entire project') || query.includes('scan')) {
      reply = `### Comprehensive Workspace Architectural & Security Audit

I analyzed all files across your active workspace. Here is the architectural inventory and AST static analysis report:

#### 1. Repository Inventory & File Structure
- \`src/security/authService.ts\` (TypeScript) · **Critical Risk** · Cyclomatic Complexity: 7
- \`src/api/ollamaClient.ts\` (TypeScript) · **Low Risk** · Cyclomatic Complexity: 2
- \`scripts/model_router.py\` (Python) · **Low Risk** · Cyclomatic Complexity: 3

---

#### 2. AST Vulnerability & Code Quality Findings

| File | Line | Severity | Code | Issue Description |
|---|---|---|---|---|
| \`authService.ts\` | 9 | **Critical** | \`HARDCODED_SECRET\` | Hardcoded JWT fallback secret in source code. |
| \`authService.ts\` | 15 | **Critical** | \`COMMAND_INJECTION\` | Unsanitized string concatenation in \`child_process.execSync\`. |
| \`authService.ts\` | 21 | **Critical** | \`NO_EVAL\` | Dynamic code execution via \`eval()\` allows arbitrary code execution. |
| \`authService.ts\` | 27 | **Warning** | \`INSECURE_PRNG\` | \`Math.random()\` used for generating session authentication tokens. |

---

#### 3. Recommended Remediation Actions
1. **Sanitize Shell Commands**: Replace string concatenation in \`verifyHostGpuStatus\` with argument arrays or parameterized APIs.
2. **Eliminate \`eval()\`**: Use \`JSON.parse()\` or an AST validator in \`evaluateDynamicRule\`.
3. **Secure Entropy**: Replace \`Math.random()\` with \`crypto.randomUUID()\` for cryptographically secure session identifiers.
4. **Environment Secrets**: Relocate \`JWT_FALLBACK_SECRET\` to \`process.env.JWT_SECRET\`.

Would you like me to refactor \`authService.ts\` or generate automated unit tests to verify these fixes?`;
    } else if (query.includes('what can you do') || query.includes('help') || query.includes('capabilities')) {
      reply = `I am your **Ollama Code Agent**, an autonomous local programming assistant running directly inside your VS Code workspace.

Here is what I can do for you offline without any cloud connectivity:

1. **Workspace & Repo Analysis**:
   - Scan all source files in your workspace for security vulnerabilities (CWE-95 \`eval\`, CWE-78 command injection, CWE-798 leaked tokens).
   - Calculate cyclomatic complexity and identify architectural bottlenecks.
2. **Context-Aware Code Refactoring**:
   - Highlight any function in your editor and click **Refactor** to receive clean, type-safe, optimized code.
3. **Fill-In-The-Middle (FIM) Inline Completion**:
   - Automatically suggest ghost-text autocompletions as you type using high-speed local models (\`deepseek-coder:6.7b\`, \`qwen2.5-coder:7b\`).
4. **Automated Unit Test Generation**:
   - Generate complete Vitest, Jest, or PyTest test suites with edge cases and mock assertions.
5. **Interactive Ollama Workbench**:
   - Test and monitor all 8 Ollama REST endpoints (\`/api/generate\`, \`/api/chat\`, \`/api/embeddings\`, \`/api/tags\`, \`/api/show\`, \`/api/pull\`, \`/api/ps\`, \`/api/version\`).
6. **Air-Gapped & Zero Telemetry**:
   - 100% of your code, tokens, and prompt context remain exclusively on your local machine.

Try asking: *"Analyze all files in the workspace"* or highlight a function and select *"Explain Logic"*!`;
    } else if (query.includes('explain')) {
      reply = `### Architectural Breakdown & Logic Flow

1. **Local Model Invocation**: This routine connects directly over the Unix socket / loopback interface (\`127.0.0.1:11434\`), ensuring no prompt tokens or workspace files leave your local device.
2. **Deterministic Execution**: The generation parameter specifies \`temperature: 0.1\`, constraining the logits to the top greedy path for reproducible syntax generation.
3. **Complexity Assessment**: The current function exhibits $O(N)$ linear complexity with $O(1)$ auxiliary space overhead, making it well-suited for high-frequency runtime invocations.`;
    } else if (query.includes('refactor') || query.includes('fix')) {
      reply = `### Proposed Refactoring

Here is the hardened, performance-optimized revision:

\`\`\`typescript
/**
 * Hardened Local Execution Handler
 * Eliminates unnecessary object spread and bounds checks.
 */
export async function sanitizeAndExecute<T>(
  payload: Readonly<Record<string, unknown>>,
  handler: (safePayload: Record<string, unknown>) => Promise<T>
): Promise<T> {
  if (typeof payload !== 'object' || payload === null) {
    throw new TypeError('Invalid payload: Expected non-null object');
  }

  // Prevent prototype pollution
  const safeCopy = Object.create(null);
  for (const [key, val] of Object.entries(payload)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    safeCopy[key] = val;
  }

  return await handler(safeCopy);
}
\`\`\`

**Key Improvements**:
- **Prototype Pollution Shield**: Rejects dangerous object keys before execution.
- **Memory Conservation**: Avoids nested copies and enforces explicit typing.`;
    } else if (query.includes('test')) {
      reply = `### Generated Vitest / Jest Unit Test Suite

\`\`\`typescript
import { describe, it, expect } from 'vitest';
import { sanitizeAndExecute } from './sanitizer';

describe('Local Security & Sanitation Engine', () => {
  it('strips malicious prototype keys', async () => {
    const untrusted = JSON.parse('{"__proto__": {"admin": true}, "validKey": 42}');
    const result = await sanitizeAndExecute(untrusted, async (clean) => clean);
    expect((result as any).admin).toBeUndefined();
    expect(result.validKey).toBe(42);
  });

  it('rejects null or non-object payloads with TypeError', async () => {
    await expect(sanitizeAndExecute(null as any, async () => ({})))
      .rejects.toThrow(TypeError);
  });
});
\`\`\``;
    } else {
      reply = `I am your **Ollama Code Agent** running on **${req.model}**.

I have full context of your active VS Code workspace and can assist with:
- **Offline Code Analysis & AST Diagnostics**: Flagging security vulnerabilities and cyclomatic spikes.
- **Refactoring & Optimization**: Transforming legacy code into idiomatic TypeScript/Python/Rust.
- **Fill-In-The-Middle (FIM)**: Autocompleting complex functions as you write.
- **Unit Testing**: Writing comprehensive edge-case coverage without cloud access.

What file or function would you like to review?`;
    }

    return {
      model: req.model,
      created_at: new Date().toISOString(),
      message: {
        role: 'assistant',
        content: reply,
      },
      done: true,
      total_duration: 410000000,
      prompt_eval_count: 56,
      eval_count: 180,
      eval_duration: 390000000,
    };
  }

  private generateInlineGhostText(prefix: string, suffix: string): string {
    const trimmedPrefix = prefix.trimEnd();
    if (trimmedPrefix.endsWith('function') || trimmedPrefix.endsWith('async function')) {
      return ' parseASTNode(token: Token): ASTNode {\n  return { type: token.type, value: token.value };\n}';
    }
    if (trimmedPrefix.endsWith('interface') || trimmedPrefix.endsWith('type')) {
      return ' ModelCapabilities {\n  contextWindow: number;\n  supportsFIM: boolean;\n  quantization: string;\n}';
    }
    if (trimmedPrefix.endsWith('const') || trimmedPrefix.endsWith('let')) {
      return ' client = new OllamaClient("http://127.0.0.1:11434");';
    }
    if (trimmedPrefix.endsWith('if (')) {
      return '!response.ok) {\n    throw new Error(`Ollama API error: ${response.status}`);\n  }';
    }
    return ': Promise<boolean> => {\n  return true;\n};';
  }
}

export const ollamaService = new OllamaService();

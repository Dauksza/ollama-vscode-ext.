export interface WorkspaceFile {
  id: string;
  name: string;
  path: string;
  language: string;
  content: string;
}

export const INITIAL_WORKSPACE_FILES: WorkspaceFile[] = [
  {
    id: 'authService',
    name: 'authService.ts',
    path: 'src/security/authService.ts',
    language: 'typescript',
    content: `import { execSync } from 'child_process';

export interface UserSession {
  userId: string;
  role: 'admin' | 'developer' | 'auditor';
  issuedAt: number;
}

// INSECURE HARDCODED SECRET - AST Rule Flagged
const JWT_FALLBACK_SECRET = "super_secret_ollama_local_auth_key_998811";

export class AuthenticationManager {
  private activeSessions = new Map<string, UserSession>();

  // DANGEROUS: Command injection vulnerability flagged by AST
  public verifyHostGpuStatus(deviceId: string): string {
    const output = execSync("nvidia-smi --query-gpu=name,memory.total --format=csv -i " + deviceId);
    return output.toString();
  }

  // DANGEROUS: Dynamic code execution via eval
  public evaluateDynamicRule(expression: string, context: Record<string, any>): boolean {
    const result = eval(expression);
    return Boolean(result);
  }

  // WEAK PRNG: Predictable Math.random token generation
  public generateSessionToken(): string {
    const randomSuffix = Math.random().toString(36).substring(2);
    return \`token_\${Date.now()}_\${randomSuffix}\`;
  }

  // High Cyclomatic Complexity & nested logic
  public validateAccessPermission(user: UserSession, resource: string, action: string): boolean {
    if (user.role === 'admin') {
      return true;
    } else if (user.role === 'developer') {
      if (resource.startsWith('repo/') || resource.startsWith('model/')) {
        if (action === 'read' || action === 'execute') {
          return true;
        } else if (action === 'delete') {
          return false;
        }
      }
    } else if (user.role === 'auditor') {
      if (action === 'read' && resource.startsWith('logs/')) {
        return true;
      }
    }
    return false;
  }
}
`,
  },
  {
    id: 'ollamaClient',
    name: 'ollamaClient.ts',
    path: 'src/api/ollamaClient.ts',
    language: 'typescript',
    content: `/**
 * Official TypeScript Ollama Client implementation
 * Covers all 8 endpoints: generate, chat, embeddings, tags, show, pull, ps, version
 */
export class OllamaClient {
  constructor(private readonly endpoint: string = 'http://127.0.0.1:11434') {}

  async listModels() {
    const res = await fetch(\`\${this.endpoint}/api/tags\`);
    return await res.json();
  }

  async runChat(model: string, messages: Array<{ role: string; content: string }>) {
    const res = await fetch(\`\${this.endpoint}/api/chat\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false })
    });
    return await res.json();
  }

  async generateEmbeddings(model: string, text: string) {
    const res = await fetch(\`\${this.endpoint}/api/embeddings\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: text })
    });
    return await res.json();
  }
}
`,
  },
  {
    id: 'modelRouter',
    name: 'model_router.py',
    path: 'scripts/model_router.py',
    language: 'python',
    content: `"""
Local Ollama Model Router
Selects optimal quantized GGUF weights based on prompt length and task complexity.
"""
import requests
import json

OLLAMA_HOST = "http://127.0.0.1:11434"

def select_model(task_type: str, vram_available_gb: float) -> str:
    if vram_available_gb >= 16.0:
        return "deepseek-coder-v2:16b"
    elif vram_available_gb >= 8.0:
        return "qwen2.5-coder:7b"
    else:
        return "codellama:7b"

def run_local_inference(prompt: str, model: str):
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.2,
            "num_predict": 256
        }
    }
    response = requests.post(f"{OLLAMA_HOST}/api/generate", json=payload)
    return response.json()
`,
  },
];

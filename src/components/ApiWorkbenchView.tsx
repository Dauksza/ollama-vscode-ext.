import React, { useState } from 'react';
import {
  Play,
  Copy,
  Check,
  RefreshCw,
  Code,
  Terminal,
  Activity,
  Layers,
  Database,
  ArrowRight,
} from 'lucide-react';
import { ollamaService, OllamaMode } from '../services/ollamaService';

interface ApiEndpointConfig {
  id: string;
  name: string;
  method: 'GET' | 'POST';
  path: string;
  description: string;
  defaultPayload?: string;
}

const OLLAMA_ENDPOINTS: ApiEndpointConfig[] = [
  {
    id: 'generate',
    name: 'Generate Completion / FIM',
    method: 'POST',
    path: '/api/generate',
    description: 'Prompt completion and Fill-In-The-Middle (FIM) code infilling with options.',
    defaultPayload: JSON.stringify(
      {
        model: 'qwen2.5-coder:7b',
        prompt: 'function calculateFibonacci(n: number): number {',
        suffix: '\n  return fib(n);\n}',
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 128,
        },
      },
      null,
      2
    ),
  },
  {
    id: 'chat',
    name: 'Multi-Turn Chat',
    method: 'POST',
    path: '/api/chat',
    description: 'Conversational agent messages with role history (system, user, assistant).',
    defaultPayload: JSON.stringify(
      {
        model: 'qwen2.5-coder:7b',
        messages: [
          {
            role: 'system',
            content: 'You are an autonomous offline code refactoring agent.',
          },
          {
            role: 'user',
            content: 'How do I avoid command injection in Node.js child_process?',
          },
        ],
        stream: false,
      },
      null,
      2
    ),
  },
  {
    id: 'embeddings',
    name: 'Generate Embeddings',
    method: 'POST',
    path: '/api/embeddings',
    description: 'Calculates high-dimensional vector embeddings for code retrieval / offline RAG.',
    defaultPayload: JSON.stringify(
      {
        model: 'nomic-embed-text:latest',
        prompt: 'export class AuthenticationManager { private token: string; }',
      },
      null,
      2
    ),
  },
  {
    id: 'tags',
    name: 'List Local Models',
    method: 'GET',
    path: '/api/tags',
    description: 'Retrieves all model weights and quantizations installed in the local storage.',
  },
  {
    id: 'show',
    name: 'Show Model Metadata',
    method: 'POST',
    path: '/api/show',
    description: 'Inspects model architecture, parameters, license, and Modelfile templates.',
    defaultPayload: JSON.stringify(
      {
        name: 'qwen2.5-coder:7b',
      },
      null,
      2
    ),
  },
  {
    id: 'ps',
    name: 'Running Processes & VRAM',
    method: 'GET',
    path: '/api/ps',
    description: 'Inspects active models loaded into memory/VRAM and expiration timers.',
  },
  {
    id: 'version',
    name: 'Ollama Version',
    method: 'GET',
    path: '/api/version',
    description: 'Queries the current Ollama server daemon build version.',
  },
  {
    id: 'pull',
    name: 'Pull Model',
    method: 'POST',
    path: '/api/pull',
    description: 'Downloads model weights from Ollama model library with streaming progress.',
    defaultPayload: JSON.stringify(
      {
        name: 'qwen2.5-coder:1.5b',
        stream: false,
      },
      null,
      2
    ),
  },
];

interface ApiWorkbenchViewProps {
  currentMode: OllamaMode;
  onModeChange: (mode: OllamaMode) => void;
  baseUrl: string;
  onBaseUrlChange: (url: string) => void;
}

export const ApiWorkbenchView: React.FC<ApiWorkbenchViewProps> = ({
  currentMode,
  onModeChange,
  baseUrl,
  onBaseUrlChange,
}) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpointConfig>(OLLAMA_ENDPOINTS[0]);
  const [payload, setPayload] = useState(OLLAMA_ENDPOINTS[0].defaultPayload || '');
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSelectEndpoint = (endpoint: ApiEndpointConfig) => {
    setSelectedEndpoint(endpoint);
    setPayload(endpoint.defaultPayload || '');
    setResponse(null);
    setStatusCode(null);
    setLatency(null);
  };

  const handleExecute = async () => {
    setIsLoading(true);
    setResponse(null);
    const start = performance.now();

    try {
      let result: any = null;
      let parsedBody: any = {};
      if (selectedEndpoint.method === 'POST' && payload.trim()) {
        try {
          parsedBody = JSON.parse(payload);
        } catch (err: any) {
          setIsLoading(false);
          setResponse({ error: 'Malformed JSON payload', details: err.message });
          setStatusCode(400);
          return;
        }
      }

      if (selectedEndpoint.id === 'version') {
        result = await ollamaService.getVersion();
      } else if (selectedEndpoint.id === 'tags') {
        result = await ollamaService.getTags();
      } else if (selectedEndpoint.id === 'generate') {
        result = await ollamaService.generate(parsedBody);
      } else if (selectedEndpoint.id === 'chat') {
        result = await ollamaService.chat(parsedBody);
      } else if (selectedEndpoint.id === 'embeddings') {
        result = await ollamaService.embeddings(parsedBody);
      } else if (selectedEndpoint.id === 'show') {
        result = await ollamaService.show(parsedBody.name || 'qwen2.5-coder:7b');
      } else if (selectedEndpoint.id === 'ps') {
        result = await ollamaService.ps();
      } else if (selectedEndpoint.id === 'pull') {
        await ollamaService.pull(parsedBody.name || 'qwen2.5-coder:1.5b');
        result = { status: 'success', model: parsedBody.name, message: 'Model pulled into local weights' };
      }

      const elapsed = Math.round(performance.now() - start);
      setLatency(elapsed);
      setStatusCode(200);
      setResponse(result);
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - start);
      setLatency(elapsed);
      setStatusCode(500);
      setResponse({
        error: err.message || 'Execution failed',
        endpoint: selectedEndpoint.path,
        mode: currentMode,
        hint: 'Verify Ollama is running or toggle to Offline Sandbox Mode.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateCurlCommand = () => {
    const fullUrl = `${baseUrl}${selectedEndpoint.path}`;
    if (selectedEndpoint.method === 'GET') {
      return `curl -s "${fullUrl}"`;
    }
    return `curl -s -X POST "${fullUrl}" \\\n  -H "Content-Type: application/json" \\\n  -d '${payload.replace(/'/g, "'\\''")}'`;
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(generateCurlCommand());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-[#e6edf3]">
      {/* Configuration Header */}
      <div className="p-4 border-b border-[#21262d] bg-[#161b22] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Ollama REST API Endpoints Workbench</span>
          </h2>
          <p className="text-xs text-[#8b949e] mt-0.5">
            Test and inspect all 8 official Ollama endpoints with real-time execution.
          </p>
        </div>

        {/* Mode & Base URL Selector */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-[#0d1117] p-1 rounded border border-[#30363d]">
            <span className="text-[#8b949e] text-[11px] px-1.5">Engine Mode:</span>
            <button
              onClick={() => onModeChange('sandbox')}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                currentMode === 'sandbox'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-medium'
                  : 'text-[#8b949e] hover:text-white'
              }`}
            >
              Offline Sandbox
            </button>
            <button
              onClick={() => onModeChange('proxy')}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                currentMode === 'proxy'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-medium'
                  : 'text-[#8b949e] hover:text-white'
              }`}
            >
              Backend Proxy (No-CORS)
            </button>
            <button
              onClick={() => onModeChange('direct')}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                currentMode === 'direct'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-medium'
                  : 'text-[#8b949e] hover:text-white'
              }`}
            >
              Direct Localhost
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => onBaseUrlChange(e.target.value)}
              placeholder="http://127.0.0.1:11434"
              className="bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1 text-xs font-mono text-cyan-300 w-48 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Main 2-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left column: Endpoints List */}
        <div className="w-72 border-r border-[#21262d] bg-[#161b22]/50 p-3 space-y-1 overflow-y-auto">
          <div className="text-[11px] font-semibold text-[#8b949e] px-2 py-1 uppercase tracking-wider">
            All API Endpoints ({OLLAMA_ENDPOINTS.length})
          </div>

          {OLLAMA_ENDPOINTS.map((ep) => {
            const isSelected = ep.id === selectedEndpoint.id;
            return (
              <button
                key={ep.id}
                onClick={() => handleSelectEndpoint(ep)}
                className={`w-full text-left p-2.5 rounded text-xs transition-all flex flex-col gap-1 border ${
                  isSelected
                    ? 'bg-[#1f6feb]/20 border-[#1f6feb]/60 text-white shadow-xs'
                    : 'bg-[#0d1117] border-[#30363d]/60 text-[#c9d1d9] hover:bg-[#21262d]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{ep.name}</span>
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                      ep.method === 'GET'
                        ? 'bg-blue-950 text-blue-300 border border-blue-800'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {ep.method}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-[#8b949e]">{ep.path}</div>
              </button>
            );
          })}
        </div>

        {/* Right column: Request & Response Workbench */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
          {/* Endpoint Bar & Run Button */}
          <div className="p-3 border-b border-[#21262d] bg-[#161b22] flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span
                className={`font-mono text-xs px-2 py-0.5 rounded font-bold ${
                  selectedEndpoint.method === 'GET'
                    ? 'bg-blue-900/60 text-blue-300 border border-blue-700'
                    : 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
                }`}
              >
                {selectedEndpoint.method}
              </span>
              <span className="font-mono text-xs text-white font-semibold">
                {selectedEndpoint.path}
              </span>
              <span className="text-xs text-[#8b949e] hidden sm:inline">
                - {selectedEndpoint.description}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={copyCurl}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] rounded border border-[#30363d] transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy cURL</span>
              </button>

              <button
                onClick={handleExecute}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-1 text-xs font-semibold bg-cyan-400 hover:bg-cyan-300 text-slate-900 rounded shadow-sm transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>{isLoading ? 'Executing...' : 'Send Request'}</span>
              </button>
            </div>
          </div>

          {/* Split Pane: Request Body on Top (if POST), Response on Bottom */}
          <div className="flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-[#21262d] overflow-hidden">
            {/* Request Payload */}
            <div className="flex-1 flex flex-col p-3 overflow-hidden">
              <div className="text-[11px] font-semibold text-[#8b949e] mb-2 flex items-center justify-between">
                <span>Request Payload (JSON)</span>
                {selectedEndpoint.method === 'GET' && (
                  <span className="text-[10px] text-[#8b949e] italic">GET request uses query parameters</span>
                )}
              </div>
              <textarea
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                disabled={selectedEndpoint.method === 'GET'}
                className="flex-1 w-full bg-[#161b22] border border-[#30363d] rounded p-3 font-mono text-xs text-[#7ee787] focus:outline-hidden focus:border-cyan-400 disabled:opacity-40 resize-none overflow-y-auto"
                placeholder={selectedEndpoint.method === 'GET' ? 'No request body for GET' : '{\n  "model": "..."\n}'}
              />
            </div>

            {/* Response Output */}
            <div className="flex-1 flex flex-col p-3 overflow-hidden bg-[#0d1117]">
              <div className="text-[11px] font-semibold text-[#8b949e] mb-2 flex items-center justify-between">
                <span>Response Body</span>
                <div className="flex items-center gap-3">
                  {statusCode && (
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                        statusCode === 200
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-red-950 text-red-300 border border-red-800'
                      }`}
                    >
                      HTTP {statusCode}
                    </span>
                  )}
                  {latency !== null && (
                    <span className="font-mono text-[10px] text-cyan-300 tabular-nums">
                      {latency} ms
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 bg-[#161b22] border border-[#30363d] rounded p-3 overflow-y-auto font-mono text-xs text-[#c9d1d9]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full text-[#8b949e] gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                    <span>Awaiting local response from {selectedEndpoint.path}...</span>
                  </div>
                ) : response ? (
                  <pre className="whitespace-pre-wrap leading-relaxed text-[#58a6ff]">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-[#8b949e] text-center p-4">
                    <Code className="w-8 h-8 mb-2 opacity-40 text-cyan-400" />
                    <span>Click "Send Request" to test this endpoint against your Ollama environment.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

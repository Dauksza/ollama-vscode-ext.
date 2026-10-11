import React, { useState } from 'react';
import {
  Download,
  Package,
  CheckCircle2,
  FileCode,
  Terminal,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  Layers,
  ArrowRight,
  AlertTriangle,
  FileCheck2,
} from 'lucide-react';
import {
  EXTENSION_SOURCE_FILES,
  ExtensionFileItem,
} from '../data/extensionSource';

interface VsixPackagingViewProps {
  onDownloadVsix: () => void;
  isBuilding: boolean;
}

export const VsixPackagingView: React.FC<VsixPackagingViewProps> = ({
  onDownloadVsix,
  isBuilding,
}) => {
  const [selectedFile, setSelectedFile] = useState<ExtensionFileItem>(EXTENSION_SOURCE_FILES[0]);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-[#e6edf3] overflow-y-auto">
      {/* Top Banner / Hero Card */}
      <div className="p-6 border-b border-[#21262d] bg-[#161b22] relative overflow-hidden">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 text-xs text-cyan-400 font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% Offline & Air-Gapped Ready · Standalone CommonJS Bundle</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Ollama Code Agent VS Code Extension (.VSIX)
            </h2>
            <p className="text-xs text-[#8b949e] max-w-xl leading-relaxed">
              Fully compiled and packaged for Visual Studio Code, Cursor, and VSCodium. Includes all 8 Ollama API endpoints, FIM inline completion, offline AST vulnerability analysis, and sidebar chat.
            </p>
          </div>

          <div className="flex flex-col items-center gap-2 shrink-0">
            <button
              onClick={onDownloadVsix}
              disabled={isBuilding}
              className="flex items-center gap-2 px-6 py-3 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-slate-900 font-bold text-sm rounded shadow-lg transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isBuilding ? 'Packaging VSIX...' : 'Download .VSIX (v1.0.0)'}</span>
            </button>
            <a
              href="/api/download-vsix"
              download="ollama-code-agent-1.0.0.vsix"
              className="text-[11px] font-mono text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>Direct Link: ollama-code-agent-1.0.0.vsix</span>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-8 w-full">
        {/* Verification & Integrity Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 bg-[#161b22] border border-[#30363d] rounded-lg space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <FileCheck2 className="w-4 h-4" />
              <span>Pre-Compiled Runtime</span>
            </div>
            <p className="text-[#8b949e] text-[11px]">
              Bundled with esbuild into pure CommonJS (<code className="text-white">dist/extension.js</code>). Zero missing imports or uncompiled TypeScript.
            </p>
          </div>

          <div className="p-3.5 bg-[#161b22] border border-[#30363d] rounded-lg space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Universal OPC Manifest</span>
            </div>
            <p className="text-[#8b949e] text-[11px]">
              Strict Open Packaging Conventions with validated <code className="text-white">extension.vsixmanifest</code> targeting engine <code className="text-white">^1.85.0</code>.
            </p>
          </div>

          <div className="p-3.5 bg-[#161b22] border border-[#30363d] rounded-lg space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Tree & Webview Wired</span>
            </div>
            <p className="text-[#8b949e] text-[11px]">
              All 3 contributed views (<code className="text-white">chatView</code>, <code className="text-white">diagnosticsView</code>, <code className="text-white">modelManager</code>) have active providers registered.
            </p>
          </div>
        </div>

        {/* Installation Instructions */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Installation Guide</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* GUI Install */}
            <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-lg space-y-3">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <span>Method 1: VS Code Command Palette (Recommended)</span>
              </h4>
              <ol className="space-y-2 text-[#c9d1d9] list-decimal list-inside leading-relaxed text-[11px]">
                <li>Download <span className="text-cyan-300 font-mono">ollama-code-agent-1.0.0.vsix</span> to your machine.</li>
                <li>In VS Code, press <kbd className="px-1.5 py-0.5 bg-[#0d1117] border border-[#30363d] rounded font-mono">Ctrl+Shift+P</kbd> (or <kbd className="px-1.5 py-0.5 bg-[#0d1117] border border-[#30363d] rounded font-mono">Cmd+Shift+P</kbd> on macOS).</li>
                <li>Type and select <span className="text-cyan-300 font-mono">Extensions: Install from VSIX...</span></li>
                <li>Browse and select the downloaded <span className="text-white font-mono">ollama-code-agent-1.0.0.vsix</span> file.</li>
                <li>A notification will confirm: <strong className="text-emerald-400">Completed installing Ollama Code Agent</strong>.</li>
                <li>Open Command Palette and run <span className="text-white font-mono">Developer: Reload Window</span>.</li>
              </ol>
            </div>

            {/* CLI Install */}
            <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-lg space-y-3">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <span>Method 2: Terminal Command Line (CLI)</span>
              </h4>
              <div className="space-y-2.5">
                <div>
                  <span className="text-[10px] text-[#8b949e] block mb-1">Standard Visual Studio Code:</span>
                  <div className="flex items-center justify-between p-2 bg-[#0d1117] border border-[#30363d] rounded font-mono text-[11px] text-[#7ee787]">
                    <code>code --install-extension ollama-code-agent-1.0.0.vsix</code>
                    <button
                      onClick={() => copyCommand('code --install-extension ollama-code-agent-1.0.0.vsix')}
                      className="text-[#8b949e] hover:text-white"
                    >
                      {copiedCmd === 'code --install-extension ollama-code-agent-1.0.0.vsix' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-[#8b949e] block mb-1">Cursor IDE:</span>
                  <div className="flex items-center justify-between p-2 bg-[#0d1117] border border-[#30363d] rounded font-mono text-[11px] text-[#7ee787]">
                    <code>cursor --install-extension ollama-code-agent-1.0.0.vsix</code>
                    <button
                      onClick={() => copyCommand('cursor --install-extension ollama-code-agent-1.0.0.vsix')}
                      className="text-[#8b949e] hover:text-white"
                    >
                      {copiedCmd === 'cursor --install-extension ollama-code-agent-1.0.0.vsix' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-[#8b949e] block mb-1">VSCodium:</span>
                  <div className="flex items-center justify-between p-2 bg-[#0d1117] border border-[#30363d] rounded font-mono text-[11px] text-[#7ee787]">
                    <code>codium --install-extension ollama-code-agent-1.0.0.vsix</code>
                    <button
                      onClick={() => copyCommand('codium --install-extension ollama-code-agent-1.0.0.vsix')}
                      className="text-[#8b949e] hover:text-white"
                    >
                      {copiedCmd === 'codium --install-extension ollama-code-agent-1.0.0.vsix' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Offline Architecture Visual */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
          <div className="p-4 border-b border-[#21262d] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Local Hardware Execution Flow (Zero Cloud Telemetry)</span>
            </div>
            <span className="text-[11px] text-[#8b949e] font-mono">Port 11434 · Localhost Loopback</span>
          </div>
          <div className="p-4 flex flex-col md:flex-row items-center gap-6">
            <div className="w-full md:w-1/2 aspect-video rounded overflow-hidden border border-[#30363d] bg-black">
              <img
                src="/src/assets/images/ollama_offline_arch_1791703280139.jpg"
                alt="Offline AI Architecture Diagram"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="w-full md:w-1/2 space-y-3 text-xs text-[#c9d1d9]">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Complete Privacy Boundary:</strong> Code never leaves your workstation. Every prompt and completion runs exclusively against local RAM/VRAM weights.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Fill-In-The-Middle (FIM):</strong> Inlines ghost-text autocompletions using models like <code className="text-cyan-300">deepseek-coder:6.7b</code> and <code className="text-cyan-300">qwen2.5-coder:7b</code>.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Offline AST & Security Scanner:</strong> Detects code vulnerabilities (eval, hardcoded tokens, command injection) without external dependencies.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Source Code & VSIX Archive Inspector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-cyan-400" />
              <span>VSIX Package Archive Contents ({EXTENSION_SOURCE_FILES.length} Files)</span>
            </h3>
            <span className="text-[11px] text-[#8b949e]">Click any file to inspect full source</span>
          </div>

          <div className="border border-[#30363d] rounded-lg overflow-hidden flex flex-col md:flex-row h-96">
            {/* File List */}
            <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#21262d] bg-[#161b22] p-2 overflow-y-auto space-y-1">
              {EXTENSION_SOURCE_FILES.map((file) => {
                const isSelected = file.path === selectedFile.path;
                return (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full text-left p-2 rounded text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-[#1f6feb] text-white font-medium'
                        : 'text-[#c9d1d9] hover:bg-[#21262d]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCode className="w-3.5 h-3.5 shrink-0 opacity-80" />
                      <span className="font-mono truncate">{file.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Code Viewer */}
            <div className="flex-1 flex flex-col bg-[#0d1117] overflow-hidden">
              <div className="p-2.5 border-b border-[#21262d] bg-[#161b22] flex items-center justify-between text-xs">
                <span className="font-mono text-cyan-300">{selectedFile.path}</span>
                <span className="text-[#8b949e]">{selectedFile.description}</span>
              </div>
              <pre className="flex-1 p-3 overflow-auto font-mono text-xs text-[#c9d1d9] leading-relaxed">
                <code>{selectedFile.content}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

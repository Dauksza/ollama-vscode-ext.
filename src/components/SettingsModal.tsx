import React from 'react';
import { Settings, X, Check, RefreshCw, Shield, Server, Cpu } from 'lucide-react';
import { OllamaMode, ConnectionStatus } from '../services/ollamaService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  endpoint: string;
  onEndpointChange: (endpoint: string) => void;
  mode: OllamaMode;
  onModeChange: (mode: OllamaMode) => void;
  chatModel: string;
  onChatModelChange: (model: string) => void;
  autocompleteModel: string;
  onAutocompleteModelChange: (model: string) => void;
  enableFIM: boolean;
  onEnableFIMChange: (enabled: boolean) => void;
  connectionStatus: ConnectionStatus | null;
  onTestConnection: () => Promise<void>;
  isTesting: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  endpoint,
  onEndpointChange,
  mode,
  onModeChange,
  chatModel,
  onChatModelChange,
  autocompleteModel,
  onAutocompleteModelChange,
  enableFIM,
  onEnableFIMChange,
  connectionStatus,
  onTestConnection,
  isTesting,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl p-5 text-[#e6edf3] space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#21262d]">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-cyan-400" />
            <span>Ollama Extension Configuration (Settings)</span>
          </h3>
          <button onClick={onClose} className="text-[#8b949e] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Connection Mode */}
          <div>
            <label className="text-white font-medium block mb-1.5">Connection Driver Mode</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onModeChange('sandbox')}
                className={`p-2 rounded border text-left flex flex-col gap-0.5 transition-all ${
                  mode === 'sandbox'
                    ? 'bg-cyan-500/20 border-cyan-400 text-white'
                    : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-white'
                }`}
              >
                <span className="font-semibold text-cyan-300">Offline Sandbox</span>
                <span className="text-[10px]">Zero setup needed</span>
              </button>

              <button
                type="button"
                onClick={() => onModeChange('proxy')}
                className={`p-2 rounded border text-left flex flex-col gap-0.5 transition-all ${
                  mode === 'proxy'
                    ? 'bg-emerald-500/20 border-emerald-400 text-white'
                    : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-white'
                }`}
              >
                <span className="font-semibold text-emerald-300">Backend Proxy</span>
                <span className="text-[10px]">Bypasses browser CORS</span>
              </button>

              <button
                type="button"
                onClick={() => onModeChange('direct')}
                className={`p-2 rounded border text-left flex flex-col gap-0.5 transition-all ${
                  mode === 'direct'
                    ? 'bg-purple-500/20 border-purple-400 text-white'
                    : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-white'
                }`}
              >
                <span className="font-semibold text-purple-300">Direct Local</span>
                <span className="text-[10px]">127.0.0.1 loopback</span>
              </button>
            </div>
          </div>

          {/* Endpoint URL */}
          <div>
            <label className="text-white font-medium block mb-1">
              Ollama Server Endpoint (<code className="text-cyan-300">ollama.endpoint</code>)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={endpoint}
                onChange={(e) => onEndpointChange(e.target.value)}
                placeholder="http://127.0.0.1:11434"
                className="flex-1 bg-[#0d1117] border border-[#30363d] rounded p-2 font-mono text-cyan-300 focus:outline-hidden focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={onTestConnection}
                disabled={isTesting}
                className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-white rounded border border-[#30363d] flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>Test</span>
              </button>
            </div>

            {/* Connection Test Banner */}
            {connectionStatus && (
              <div
                className={`mt-2 p-2 rounded text-[11px] font-mono flex items-center justify-between border ${
                  connectionStatus.online
                    ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300'
                    : 'bg-red-950/30 border-red-800 text-red-300'
                }`}
              >
                <span>
                  {connectionStatus.online
                    ? `Connected: ${connectionStatus.version} (${connectionStatus.modelsCount} models)`
                    : `Unreachable: ${connectionStatus.errorMessage}`}
                </span>
                {connectionStatus.latencyMs && (
                  <span className="tabular-nums">{connectionStatus.latencyMs}ms</span>
                )}
              </div>
            )}
          </div>

          {/* Models */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white font-medium block mb-1">
                Chat Model (<code className="text-cyan-300">ollama.chatModel</code>)
              </label>
              <input
                type="text"
                value={chatModel}
                onChange={(e) => onChatModelChange(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 font-mono text-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="text-white font-medium block mb-1">
                FIM Autocomplete Model
              </label>
              <input
                type="text"
                value={autocompleteModel}
                onChange={(e) => onAutocompleteModelChange(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 font-mono text-white focus:outline-hidden"
              />
            </div>
          </div>

          {/* FIM toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-[#21262d]">
            <div>
              <span className="text-white font-medium block">
                Fill-In-The-Middle (FIM) Ghost Text
              </span>
              <span className="text-[11px] text-[#8b949e]">
                Automatically trigger suggestions while typing
              </span>
            </div>
            <input
              type="checkbox"
              checked={enableFIM}
              onChange={(e) => onEnableFIMChange(e.target.checked)}
              className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-[#21262d] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-semibold text-xs rounded transition-colors"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};

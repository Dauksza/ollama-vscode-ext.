import React from 'react';
import {
  Cpu,
  AlertOctagon,
  AlertTriangle,
  Sparkles,
  Wifi,
  WifiOff,
  Radio,
} from 'lucide-react';
import { ConnectionStatus } from '../services/ollamaService';

interface StatusBarProps {
  connectionStatus: ConnectionStatus | null;
  activeModel: string;
  onOpenSettings: () => void;
  errorCount: number;
  warningCount: number;
  enableFIM: boolean;
  onSelectView: (view: string) => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  connectionStatus,
  activeModel,
  onOpenSettings,
  errorCount,
  warningCount,
  enableFIM,
  onSelectView,
}) => {
  return (
    <footer className="h-6 bg-[#161b22] border-t border-[#21262d] text-[#8b949e] text-[11px] font-mono px-3 flex items-center justify-between select-none shrink-0 z-20">
      {/* Left side items */}
      <div className="flex items-center gap-4">
        {/* Connection status */}
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 hover:text-white transition-colors"
          title="Click to configure Ollama connection"
        >
          {connectionStatus?.online ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          ) : (
            <span className="w-2 h-2 rounded-full bg-red-400"></span>
          )}
          <span>
            Ollama:{' '}
            <strong className="text-white">
              {connectionStatus?.mode === 'sandbox'
                ? 'Sandbox (Offline)'
                : connectionStatus?.online
                ? 'Online'
                : 'Offline'}
            </strong>
          </span>
        </button>

        {/* Active Model */}
        <button
          onClick={() => onSelectView('models')}
          className="flex items-center gap-1 hover:text-white transition-colors"
          title="Active inference model"
        >
          <Cpu className="w-3 h-3 text-cyan-400" />
          <span className="text-cyan-300 font-medium">{activeModel}</span>
        </button>

        {/* Diagnostics Summary */}
        <button
          onClick={() => onSelectView('diagnostics')}
          className="flex items-center gap-2 hover:text-white transition-colors"
          title="View AST diagnostics"
        >
          <span className="flex items-center gap-1 text-red-400">
            <AlertOctagon className="w-3 h-3" />
            <span className="tabular-nums">{errorCount}</span>
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            <span className="tabular-nums">{warningCount}</span>
          </span>
        </button>
      </div>

      {/* Right side items */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1 hover:text-white transition-colors"
          title="Toggle inline ghost text"
        >
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>FIM: {enableFIM ? 'Active' : 'Off'}</span>
        </button>

        <span>UTF-8</span>
        <span>Spaces: 2</span>
        <span className="text-[#58a6ff]">v1.0.0 (VSIX)</span>
      </div>
    </footer>
  );
};

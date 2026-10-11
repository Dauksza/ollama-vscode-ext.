import React from 'react';
import {
  Files,
  Bot,
  ShieldAlert,
  Cpu,
  Terminal,
  Package,
  Settings,
  Search,
} from 'lucide-react';

interface ActivityBarProps {
  activeView: string;
  onSelectView: (view: string) => void;
  diagnosticsCount: number;
  onOpenSettings: () => void;
  onOpenCommandPalette: () => void;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activeView,
  onSelectView,
  diagnosticsCount,
  onOpenSettings,
  onOpenCommandPalette,
}) => {
  return (
    <div className="w-12 bg-[#0d1117] border-r border-[#21262d] flex flex-col items-center py-3 justify-between select-none shrink-0 z-20">
      {/* Top Group */}
      <div className="flex flex-col items-center gap-4 w-full">
        {/* Explorer */}
        <button
          onClick={() => onSelectView('files')}
          title="Explorer & Files"
          className={`relative p-2.5 rounded hover:text-white transition-colors ${
            activeView === 'files'
              ? 'text-white border-l-2 border-cyan-400 bg-[#161b22]'
              : 'text-[#8b949e]'
          }`}
        >
          <Files className="w-5 h-5" />
        </button>

        {/* Ollama Chat */}
        <button
          onClick={() => onSelectView('agent')}
          title="Ollama Agent Chat"
          className={`relative p-2.5 rounded hover:text-white transition-colors ${
            activeView === 'agent'
              ? 'text-white border-l-2 border-cyan-400 bg-[#161b22]'
              : 'text-[#8b949e]'
          }`}
        >
          <Bot className="w-5 h-5 text-cyan-400" />
        </button>

        {/* Diagnostics & AST Scan */}
        <button
          onClick={() => onSelectView('diagnostics')}
          title="Offline AST & Security Diagnostics"
          className={`relative p-2.5 rounded hover:text-white transition-colors ${
            activeView === 'diagnostics'
              ? 'text-white border-l-2 border-cyan-400 bg-[#161b22]'
              : 'text-[#8b949e]'
          }`}
        >
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          {diagnosticsCount > 0 && (
            <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-amber-500 text-[9px] font-bold text-slate-950 rounded-full flex items-center justify-center font-mono">
              {diagnosticsCount}
            </span>
          )}
        </button>

        {/* All API Endpoints */}
        <button
          onClick={() => onSelectView('workbench')}
          title="All Ollama API Endpoints Workbench"
          className={`relative p-2.5 rounded hover:text-white transition-colors ${
            activeView === 'workbench'
              ? 'text-white border-l-2 border-cyan-400 bg-[#161b22]'
              : 'text-[#8b949e]'
          }`}
        >
          <Terminal className="w-5 h-5" />
        </button>

        {/* Model Hub & VRAM */}
        <button
          onClick={() => onSelectView('models')}
          title="Model Hub & VRAM Monitor (/api/ps)"
          className={`relative p-2.5 rounded hover:text-white transition-colors ${
            activeView === 'models'
              ? 'text-white border-l-2 border-cyan-400 bg-[#161b22]'
              : 'text-[#8b949e]'
          }`}
        >
          <Cpu className="w-5 h-5" />
        </button>

        {/* VSIX Downloader & Inspector */}
        <button
          onClick={() => onSelectView('vsix')}
          title="VSIX Extension Package & Offline Guide"
          className={`relative p-2.5 rounded hover:text-white transition-colors ${
            activeView === 'vsix'
              ? 'text-white border-l-2 border-cyan-400 bg-[#161b22]'
              : 'text-[#8b949e]'
          }`}
        >
          <Package className="w-5 h-5 text-emerald-400" />
        </button>
      </div>

      {/* Bottom Group */}
      <div className="flex flex-col items-center gap-3 w-full">
        <button
          onClick={onOpenCommandPalette}
          title="Command Palette (Ctrl+Shift+P)"
          className="p-2 text-[#8b949e] hover:text-white transition-colors"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenSettings}
          title="Ollama Extension Settings"
          className="p-2 text-[#8b949e] hover:text-white transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

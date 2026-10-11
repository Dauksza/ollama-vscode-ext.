import React from 'react';
import { Download, ShieldCheck, Terminal, Cpu } from 'lucide-react';

interface TopNavigationProps {
  activeView: string;
  onSelectView: (view: string) => void;
  onOpenCommandPalette: () => void;
  onDownloadVsix: () => void;
  connectionStatus: {
    online: boolean;
    mode: string;
    version?: string;
  };
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  activeView,
  onSelectView,
  onOpenCommandPalette,
  onDownloadVsix,
  connectionStatus,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3 bg-[#0d1117] border-b border-[#21262d] text-[#e6edf3] select-none">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="#editor"
          onClick={(e) => {
            e.preventDefault();
            onSelectView('files');
          }}
          className="text-base font-bold tracking-tight text-white flex items-center gap-2 whitespace-nowrap hover:text-cyan-400 transition-colors"
        >
          <Cpu className="w-5 h-5 text-cyan-400" />
          <span>Ollama Code Agent</span>
        </a>
      </div>

      {/* Zone 2: 4-5 concise single-line nav links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[#8b949e]">
        <button
          onClick={() => onSelectView('files')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
            activeView === 'files' ? 'text-white border-b-2 border-cyan-400' : ''
          }`}
        >
          IDE Workspace
        </button>
        <button
          onClick={() => onSelectView('agent')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
            activeView === 'agent' ? 'text-white border-b-2 border-cyan-400' : ''
          }`}
        >
          Agent Chat
        </button>
        <button
          onClick={() => onSelectView('diagnostics')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
            activeView === 'diagnostics' ? 'text-white border-b-2 border-cyan-400' : ''
          }`}
        >
          Offline AST Scan
        </button>
        <button
          onClick={() => onSelectView('workbench')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
            activeView === 'workbench' ? 'text-white border-b-2 border-cyan-400' : ''
          }`}
        >
          All API Endpoints
        </button>
        <button
          onClick={() => onSelectView('models')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
            activeView === 'models' ? 'text-white border-b-2 border-cyan-400' : ''
          }`}
        >
          Model Hub & VRAM
        </button>
        <button
          onClick={() => onSelectView('vsix')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
            activeView === 'vsix' ? 'text-white border-b-2 border-cyan-400' : ''
          }`}
        >
          VSIX Package
        </button>
      </nav>

      {/* Zone 3: 1 primary action + helper utilities */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-mono bg-[#161b22] hover:bg-[#21262d] text-[#8b949e] hover:text-[#e6edf3] border border-[#30363d] rounded transition-colors whitespace-nowrap"
          title="Open Command Palette"
        >
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span>Ctrl+Shift+P</span>
        </button>

        <button
          onClick={onDownloadVsix}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded shadow-sm transition-all whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download .VSIX</span>
        </button>
      </div>
    </header>
  );
};

import React from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { WorkspaceFile } from '../data/sampleFiles';
import { CodeDiagnostic } from '../types/ollama';

interface FileExplorerSidebarProps {
  files: WorkspaceFile[];
  activeFile: WorkspaceFile;
  onSelectFile: (file: WorkspaceFile) => void;
  diagnostics: CodeDiagnostic[];
  onTriggerWorkspaceScan: () => void;
  isScanning: boolean;
}

export const FileExplorerSidebar: React.FC<FileExplorerSidebarProps> = ({
  files,
  activeFile,
  onSelectFile,
  diagnostics,
  onTriggerWorkspaceScan,
  isScanning,
}) => {
  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-[#e6edf3] border-r border-[#21262d] select-none">
      {/* Header */}
      <div className="p-3 border-b border-[#21262d] bg-[#161b22] flex items-center justify-between">
        <span className="text-xs font-semibold text-white uppercase tracking-wider">
          Explorer
        </span>
        <button
          onClick={onTriggerWorkspaceScan}
          disabled={isScanning}
          title="Scan entire workspace with offline AST engine"
          className="text-[#8b949e] hover:text-white p-1 rounded transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Workspace Tree */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto text-xs">
        <div>
          <div className="flex items-center gap-1.5 px-2 py-1 text-[#8b949e] font-semibold text-[11px] uppercase tracking-wider">
            <ChevronDown className="w-3.5 h-3.5" />
            <span>Workspace: Ollama Agent</span>
          </div>

          <div className="pl-3 mt-1 space-y-0.5">
            {files.map((file) => {
              const isActive = file.id === activeFile.id;
              const fileDiagnostics = diagnostics.filter((d) => d.severity === 'error');

              return (
                <button
                  key={file.id}
                  onClick={() => onSelectFile(file)}
                  className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between transition-colors ${
                    isActive
                      ? 'bg-[#1f6feb]/20 text-white font-medium border border-[#1f6feb]/40'
                      : 'text-[#c9d1d9] hover:bg-[#161b22] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCode
                      className={`w-3.5 h-3.5 shrink-0 ${
                        file.language === 'python' ? 'text-amber-400' : 'text-cyan-400'
                      }`}
                    />
                    <span className="font-mono text-xs truncate">{file.name}</span>
                  </div>

                  {isActive && fileDiagnostics.length > 0 && (
                    <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-1.5 py-0.2 rounded font-mono">
                      {fileDiagnostics.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Extension Info Box in sidebar */}
        <div className="mt-6 p-3 bg-[#161b22] rounded border border-[#30363d] space-y-2 text-[11px]">
          <div className="text-white font-semibold flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ollama Offline Core</span>
          </div>
          <p className="text-[#8b949e] leading-relaxed">
            Running 100% locally. Zero telemetry is dispatched to any external server.
          </p>
          <div className="pt-2 border-t border-[#21262d] flex items-center justify-between text-[10px] text-[#8b949e]">
            <span>Extension State:</span>
            <span className="text-emerald-400 font-medium">Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};

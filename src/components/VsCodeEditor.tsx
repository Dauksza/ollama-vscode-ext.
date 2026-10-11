import React, { useState, useEffect } from 'react';
import {
  FileCode,
  Sparkles,
  AlertOctagon,
  AlertTriangle,
  Info,
  Wrench,
  Check,
  Terminal,
  Play,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { WorkspaceFile } from '../data/sampleFiles';
import { CodeDiagnostic } from '../types/ollama';

interface VsCodeEditorProps {
  files: WorkspaceFile[];
  activeFile: WorkspaceFile;
  onSelectFile: (file: WorkspaceFile) => void;
  onUpdateFileContent: (newContent: string) => void;
  diagnostics: CodeDiagnostic[];
  onApplyFix: (diag: CodeDiagnostic) => void;
  onTriggerFim: () => Promise<string>;
  onExplainCode: () => void;
  onRefactorCode: () => void;
  onGenerateTests: () => void;
  activeModelName: string;
}

export const VsCodeEditor: React.FC<VsCodeEditorProps> = ({
  files,
  activeFile,
  onSelectFile,
  onUpdateFileContent,
  diagnostics,
  onApplyFix,
  onTriggerFim,
  onExplainCode,
  onRefactorCode,
  onGenerateTests,
  activeModelName,
}) => {
  const [ghostText, setGhostText] = useState<string | null>(null);
  const [ghostLine, setGhostLine] = useState<number | null>(null);
  const [isGeneratingFim, setIsGeneratingFim] = useState(false);
  const [bottomTab, setBottomTab] = useState<'problems' | 'output' | 'terminal'>('problems');
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    'Ollama Language Server Extension Activated.',
    'Listening on local daemon at http://127.0.0.1:11434',
    'AST engine loaded 6 heuristic rules.',
    'Type "ollama list" or "ollama run <model>" to execute local commands.',
  ]);

  const lines = activeFile.content.split('\n');

  // Trigger FIM inline completion simulation
  const handleTriggerFim = async () => {
    setIsGeneratingFim(true);
    try {
      const suggestion = await onTriggerFim();
      setGhostText(suggestion);
      setGhostLine(Math.min(lines.length, 18)); // place suggestion near middle/active area
    } finally {
      setIsGeneratingFim(false);
    }
  };

  const handleAcceptGhostText = () => {
    if (!ghostText || ghostLine === null) return;
    const newLines = [...lines];
    newLines.splice(ghostLine, 0, ghostText);
    onUpdateFileContent(newLines.join('\n'));
    setGhostText(null);
    setGhostLine(null);
  };

  const handleDismissGhostText = () => {
    setGhostText(null);
    setGhostLine(null);
  };

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;
    const cmd = terminalInput.trim();
    setTerminalInput('');

    const newLogs = [...terminalLogs, `$ ${cmd}`];
    if (cmd === 'clear') {
      setTerminalLogs([]);
      return;
    } else if (cmd.startsWith('ollama list') || cmd === 'ollama tags') {
      newLogs.push('NAME                   ID              SIZE    MODIFIED');
      newLogs.push('qwen2.5-coder:7b       d89270e5a8f4    4.7GB   2 days ago');
      newLogs.push('deepseek-coder:6.7b    7f4bc901a12e    4.2GB   1 week ago');
      newLogs.push('nomic-embed-text       0a12e987f4c1    274MB   3 weeks ago');
    } else if (cmd.startsWith('ollama ps')) {
      newLogs.push('NAME                SIZE_VRAM   PROCESSOR   UNTIL');
      newLogs.push('qwen2.5-coder:7b    4.7GB       100% GPU    4 minutes');
    } else {
      newLogs.push(`Executed: ${cmd} (Local air-gapped simulation)`);
    }
    setTerminalLogs(newLogs);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0d1117] text-[#e6edf3] overflow-hidden">
      {/* File Tabs Bar */}
      <div className="flex items-center justify-between bg-[#161b22] border-b border-[#21262d] overflow-x-auto">
        <div className="flex items-center">
          {files.map((file) => {
            const isActive = file.id === activeFile.id;
            return (
              <button
                key={file.id}
                onClick={() => {
                  onSelectFile(file);
                  setGhostText(null);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs border-r border-[#21262d] transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[#0d1117] text-white border-t-2 border-t-cyan-400 font-medium'
                    : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#1c2128]'
                }`}
              >
                <FileCode
                  className={`w-3.5 h-3.5 ${
                    file.language === 'python' ? 'text-amber-400' : 'text-cyan-400'
                  }`}
                />
                <span>{file.name}</span>
              </button>
            );
          })}
        </div>

        {/* Quick In-Editor Ollama Assistant Actions */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1">
          <button
            onClick={handleTriggerFim}
            disabled={isGeneratingFim}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] bg-[#21262d] hover:bg-[#30363d] text-cyan-300 rounded border border-[#30363d] transition-colors"
            title="Simulate FIM Inline Completion"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>{isGeneratingFim ? 'Generating FIM...' : 'Inline Complete (FIM)'}</span>
          </button>
          <button
            onClick={onRefactorCode}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-[#21262d] hover:bg-[#30363d] text-emerald-300 rounded border border-[#30363d] transition-colors"
          >
            <span>Refactor</span>
          </button>
          <button
            onClick={onGenerateTests}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] rounded border border-[#30363d] transition-colors"
          >
            <span>Tests</span>
          </button>
        </div>
      </div>

      {/* Code Editor Body */}
      <div className="flex-1 overflow-auto flex font-mono text-xs relative bg-[#0d1117]">
        {/* Line Numbers with gutter diagnostics */}
        <div className="w-12 select-none text-[#484f58] text-right pr-3 pt-3 bg-[#0d1117] border-r border-[#21262d]/50 shrink-0 space-y-0.5">
          {lines.map((_, idx) => {
            const lineNum = idx + 1;
            const diag = diagnostics.find((d) => d.line === lineNum);

            return (
              <div key={lineNum} className="h-5 flex items-center justify-end gap-1">
                {diag && (
                  <span title={diag.message}>
                    {diag.severity === 'error' ? (
                      <AlertOctagon className="w-3 h-3 text-red-500 inline" />
                    ) : diag.severity === 'warning' ? (
                      <AlertTriangle className="w-3 h-3 text-amber-500 inline" />
                    ) : (
                      <Info className="w-3 h-3 text-blue-400 inline" />
                    )}
                  </span>
                )}
                <span>{lineNum}</span>
              </div>
            );
          })}
        </div>

        {/* Code Content */}
        <div className="flex-1 p-3 space-y-0.5 overflow-x-auto text-[#e6edf3]">
          {lines.map((line, idx) => {
            const lineNum = idx + 1;
            const diag = diagnostics.find((d) => d.line === lineNum);

            // Basic syntax color simulation for code readability
            const isComment = line.trim().startsWith('//') || line.trim().startsWith('#') || line.trim().startsWith('/*') || line.trim().startsWith('*');
            const isKeyword = /\b(import|export|class|interface|function|const|let|return|if|else|async|await|def)\b/.test(line);

            return (
              <React.Fragment key={idx}>
                <div
                  className={`h-5 flex items-center whitespace-pre font-mono transition-colors ${
                    diag
                      ? diag.severity === 'error'
                        ? 'bg-red-950/20 text-red-200 border-b border-red-500/40'
                        : 'bg-amber-950/20 text-amber-200 border-b border-amber-500/40'
                      : 'hover:bg-[#161b22]/60'
                  }`}
                >
                  <span
                    className={
                      isComment
                        ? 'text-[#8b949e] italic'
                        : isKeyword
                        ? 'text-[#ff7b72]'
                        : 'text-[#c9d1d9]'
                    }
                  >
                    {line || ' '}
                  </span>
                </div>

                {/* Inline FIM Ghost Text render */}
                {ghostLine === lineNum && ghostText && (
                  <div className="bg-cyan-950/30 border border-cyan-500/40 rounded p-2 my-1 text-xs font-mono">
                    <div className="flex items-center justify-between text-[10px] text-cyan-300 pb-1 mb-1 border-b border-cyan-500/20">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>Ollama FIM Infill Suggestion ({activeModelName})</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleAcceptGhostText}
                          className="px-2 py-0.5 bg-cyan-400 text-slate-900 rounded font-semibold hover:bg-cyan-300 transition-colors"
                        >
                          Tab to Accept
                        </button>
                        <button
                          onClick={handleDismissGhostText}
                          className="px-2 py-0.5 bg-[#21262d] text-[#c9d1d9] rounded hover:text-white transition-colors"
                        >
                          Esc to Dismiss
                        </button>
                      </div>
                    </div>
                    <pre className="text-cyan-200 whitespace-pre-wrap">{ghostText}</pre>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Bottom Panel (Problems, Output, Terminal) */}
      <div className="h-44 border-t border-[#21262d] bg-[#161b22] flex flex-col shrink-0">
        <div className="flex items-center justify-between px-3 border-b border-[#21262d] bg-[#0d1117] text-xs">
          <div className="flex items-center">
            <button
              onClick={() => setBottomTab('problems')}
              className={`px-3 py-1.5 transition-colors flex items-center gap-1.5 ${
                bottomTab === 'problems'
                  ? 'text-white border-b-2 border-cyan-400 font-medium'
                  : 'text-[#8b949e] hover:text-[#e6edf3]'
              }`}
            >
              <span>Problems</span>
              <span className="font-mono text-[10px] bg-[#21262d] px-1.5 rounded text-amber-400">
                {diagnostics.length}
              </span>
            </button>
            <button
              onClick={() => setBottomTab('output')}
              className={`px-3 py-1.5 transition-colors ${
                bottomTab === 'output'
                  ? 'text-white border-b-2 border-cyan-400 font-medium'
                  : 'text-[#8b949e] hover:text-[#e6edf3]'
              }`}
            >
              Ollama Extension Logs
            </button>
            <button
              onClick={() => setBottomTab('terminal')}
              className={`px-3 py-1.5 transition-colors flex items-center gap-1 ${
                bottomTab === 'terminal'
                  ? 'text-white border-b-2 border-cyan-400 font-medium'
                  : 'text-[#8b949e] hover:text-[#e6edf3]'
              }`}
            >
              <Terminal className="w-3 h-3" />
              <span>Terminal</span>
            </button>
          </div>

          <span className="text-[11px] font-mono text-[#8b949e]">
            {activeFile.language} · UTF-8 · Tab Size: 2
          </span>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-2 text-xs font-mono">
          {bottomTab === 'problems' ? (
            diagnostics.length === 0 ? (
              <div className="p-3 text-[#8b949e] text-center text-[11px]">
                No problems detected in workspace files.
              </div>
            ) : (
              <div className="space-y-1">
                {diagnostics.map((diag) => (
                  <div
                    key={diag.id}
                    className="flex items-center justify-between p-1.5 hover:bg-[#21262d] rounded transition-colors text-[11px]"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {diag.severity === 'error' ? (
                        <AlertOctagon className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                      <span className="text-white">Line {diag.line}:</span>
                      <span className="text-[#c9d1d9] truncate">{diag.message}</span>
                    </div>

                    {diag.suggestedFix && (
                      <button
                        onClick={() => onApplyFix(diag)}
                        className="ml-2 px-2 py-0.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded border border-cyan-500/40 text-[10px] flex items-center gap-1 shrink-0"
                      >
                        <Wrench className="w-2.5 h-2.5" />
                        <span>Quick Fix</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : bottomTab === 'output' ? (
            <div className="p-2 space-y-1 text-[#8b949e] text-[11px]">
              <div>[INFO] Initialized local Ollama client connected to endpoint.</div>
              <div>[INFO] Model {activeModelName} ready for Fill-In-The-Middle inference.</div>
              <div>[INFO] AST analyzer completed parse tree in 12ms (Offline).</div>
              <div className="text-emerald-400">[SUCCESS] Zero network egress detected. Air-gapped safe.</div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex-1 space-y-1 text-[#7ee787] text-[11px]">
                {terminalLogs.map((log, lIdx) => (
                  <div key={lIdx}>{log}</div>
                ))}
              </div>
              <form onSubmit={handleTerminalSubmit} className="flex items-center gap-2 pt-1 border-t border-[#30363d]">
                <span className="text-cyan-400 font-bold">$</span>
                <input
                  type="text"
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  placeholder="ollama ps, ollama list, or custom command..."
                  className="flex-1 bg-transparent text-xs text-white focus:outline-hidden"
                />
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

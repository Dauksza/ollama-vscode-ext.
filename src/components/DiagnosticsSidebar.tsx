import React from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  Wrench,
  RefreshCw,
  Cpu,
  Layers,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { CodeAnalysisReport, CodeDiagnostic } from '../types/ollama';

interface DiagnosticsSidebarProps {
  report: CodeAnalysisReport | null;
  isScanning: boolean;
  onRunScan: () => void;
  onApplyFix: (diagnostic: CodeDiagnostic) => void;
  onJumpToLine: (line: number) => void;
}

export const DiagnosticsSidebar: React.FC<DiagnosticsSidebarProps> = ({
  report,
  isScanning,
  onRunScan,
  onApplyFix,
  onJumpToLine,
}) => {
  if (!report) {
    return (
      <div className="p-4 text-center text-xs text-[#8b949e]">
        No analysis data available. Run AST Scan to inspect code.
      </div>
    );
  }

  const errors = report.diagnostics.filter((d) => d.severity === 'error');
  const warnings = report.diagnostics.filter((d) => d.severity === 'warning');
  const infos = report.diagnostics.filter((d) => d.severity === 'info');

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-[#e6edf3] border-r border-[#21262d] overflow-y-auto">
      {/* Header */}
      <div className="p-3 border-b border-[#21262d] bg-[#161b22] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-white">Offline AST & Security</span>
        </div>
        <button
          onClick={onRunScan}
          disabled={isScanning}
          className="flex items-center gap-1 px-2 py-1 text-[11px] bg-[#21262d] hover:bg-[#30363d] text-white rounded transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
          <span>Re-scan</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="p-3 border-b border-[#21262d] grid grid-cols-2 gap-2 text-xs">
        <div className="bg-[#161b22] p-2.5 rounded border border-[#30363d]">
          <div className="text-[10px] text-[#8b949e]">Risk Classification</div>
          <div
            className={`font-semibold mt-0.5 text-sm ${
              report.securityRiskScore === 'Critical'
                ? 'text-red-400'
                : report.securityRiskScore === 'High'
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          >
            {report.securityRiskScore}
          </div>
        </div>

        <div className="bg-[#161b22] p-2.5 rounded border border-[#30363d]">
          <div className="text-[10px] text-[#8b949e]">Cyclomatic Complexity</div>
          <div className="font-mono text-sm font-semibold mt-0.5 text-cyan-300 tabular-nums">
            {report.cyclomaticComplexity}
            <span className="text-[10px] text-[#8b949e] font-sans font-normal ml-1">
              ({report.cyclomaticComplexity > 10 ? 'High' : 'Moderate'})
            </span>
          </div>
        </div>
      </div>

      {/* AST Summary */}
      <div className="px-3 py-2 border-b border-[#21262d] text-[11px] text-[#8b949e] flex items-center justify-between">
        <span>LOC: <strong className="text-white font-mono">{report.loc}</strong></span>
        <span>Functions: <strong className="text-white font-mono">{report.astSummary.functionsCount}</strong></span>
        <span>Imports: <strong className="text-white font-mono">{report.astSummary.importsCount}</strong></span>
        <span>Issues: <strong className="text-amber-400 font-mono">{report.diagnostics.length}</strong></span>
      </div>

      {/* Diagnostic Issues List */}
      <div className="flex-1 p-3 space-y-2.5">
        <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
          Diagnostic Problems ({report.diagnostics.length})
        </div>

        {report.diagnostics.length === 0 ? (
          <div className="p-4 text-center text-xs text-emerald-400 bg-emerald-950/20 rounded border border-emerald-800/40 flex flex-col items-center gap-1.5">
            <CheckCircle2 className="w-5 h-5" />
            <span>Zero vulnerabilities or AST violations found.</span>
          </div>
        ) : (
          report.diagnostics.map((diag) => {
            const isError = diag.severity === 'error';
            const isWarning = diag.severity === 'warning';

            return (
              <div
                key={diag.id}
                className={`p-2.5 rounded border text-xs flex flex-col gap-1.5 transition-all ${
                  isError
                    ? 'bg-red-950/20 border-red-800/40 text-red-200'
                    : isWarning
                    ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                    : 'bg-blue-950/20 border-blue-800/40 text-blue-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-medium">
                    {isError ? (
                      <AlertOctagon className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    )}
                    <span className="font-mono text-[11px] text-white">Line {diag.line}</span>
                    <span className="text-[10px] text-[#8b949e] font-mono">[{diag.code}]</span>
                  </div>

                  <button
                    onClick={() => onJumpToLine(diag.line)}
                    className="text-[10px] text-cyan-400 hover:underline font-mono"
                  >
                    Jump
                  </button>
                </div>

                <div className="text-[11px] leading-relaxed text-[#c9d1d9] pl-5">
                  {diag.message}
                </div>

                {diag.suggestedFix && (
                  <div className="mt-1 pl-5 pt-1.5 border-t border-white/10 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-[#8b949e] italic truncate">
                      Fix: {diag.suggestedFix}
                    </span>
                    <button
                      onClick={() => onApplyFix(diag)}
                      className="px-2 py-0.5 text-[10px] bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded flex items-center gap-1 whitespace-nowrap"
                    >
                      <Wrench className="w-2.5 h-2.5" />
                      <span>Autofix</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Indexed Symbols & Embeddings */}
        {report.symbols.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[#21262d]">
            <div className="text-[11px] font-semibold text-[#8b949e] mb-2 flex items-center justify-between">
              <span>Indexed Symbols (Offline RAG)</span>
              <span className="text-[10px] font-mono text-cyan-400">nomic-embed</span>
            </div>
            <div className="space-y-1.5">
              {report.symbols.map((sym, sIdx) => (
                <div
                  key={sIdx}
                  className="flex items-center justify-between p-1.5 bg-[#161b22] border border-[#30363d] rounded text-[11px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-mono text-cyan-400">
                      {sym.kind.slice(0, 2)}
                    </span>
                    <span className="font-mono text-white">{sym.name}</span>
                  </div>
                  <span className="font-mono text-[10px] text-[#8b949e]">L{sym.line}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

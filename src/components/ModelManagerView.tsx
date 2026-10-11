import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Layers,
  Download,
  Trash2,
  HardDrive,
  RefreshCw,
  Info,
  CheckCircle2,
  Activity,
  Zap,
} from 'lucide-react';
import { OllamaModel, OllamaProcess, PullProgress } from '../types/ollama';
import { ollamaService } from '../services/ollamaService';

interface ModelManagerViewProps {
  models: OllamaModel[];
  runningProcesses: OllamaProcess[];
  onRefresh: () => Promise<void>;
  onPullModel: (name: string) => Promise<void>;
  isLoading: boolean;
}

export const ModelManagerView: React.FC<ModelManagerViewProps> = ({
  models,
  runningProcesses,
  onRefresh,
  onPullModel,
  isLoading,
}) => {
  const [pullInput, setPullInput] = useState('');
  const [pullingModel, setPullingModel] = useState<string | null>(null);
  const [pullProgress, setPullProgress] = useState<PullProgress | null>(null);
  const [inspectModel, setInspectModel] = useState<any | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);

  const POPULAR_MODELS = [
    { name: 'qwen2.5-coder:7b', desc: 'SOTA general coding & FIM', size: '4.7 GB' },
    { name: 'deepseek-coder:6.7b', desc: 'Specialized reasoning & refactoring', size: '4.2 GB' },
    { name: 'codellama:7b', desc: 'Meta code generation engine', size: '3.8 GB' },
    { name: 'nomic-embed-text', desc: 'Codebase semantic embeddings', size: '274 MB' },
  ];

  const handlePull = async (modelName: string) => {
    if (!modelName.trim()) return;
    setPullingModel(modelName);
    setPullProgress({ status: 'initiating pull' });

    try {
      await ollamaService.pull(modelName, (prog) => {
        setPullProgress(prog);
      });
      await onRefresh();
      setPullInput('');
    } catch (err: any) {
      alert(`Pull failed: ${err.message}`);
    } finally {
      setPullingModel(null);
      setPullProgress(null);
    }
  };

  const handleInspect = async (modelName: string) => {
    setIsInspecting(true);
    try {
      const data = await ollamaService.show(modelName);
      setInspectModel({ name: modelName, data });
    } catch (err: any) {
      alert(`Inspection failed: ${err.message}`);
    } finally {
      setIsInspecting(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-[#e6edf3] overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-[#21262d] bg-[#161b22] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Local Model Hub & VRAM Monitor</span>
          </h2>
          <p className="text-xs text-[#8b949e] mt-0.5">
            Manage local weights, inspect VRAM occupancy, and pull models from the library.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] rounded transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Hub</span>
        </button>
      </div>

      <div className="p-4 space-y-6 max-w-6xl">
        {/* Active VRAM & Running Processes Section (/api/ps) */}
        <div>
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Active Models in VRAM (/api/ps)</span>
          </h3>

          {runningProcesses.length === 0 ? (
            <div className="p-4 bg-[#161b22] border border-[#30363d] rounded text-xs text-[#8b949e]">
              No models currently loaded in GPU VRAM. Models load automatically on first prompt.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {runningProcesses.map((proc, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#161b22] border border-[#30363d] rounded flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-white font-mono flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      {proc.name}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800">
                      Active
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-[#8b949e] text-[11px]">
                      <span>VRAM Occupancy:</span>
                      <span className="font-mono text-cyan-300 tabular-nums">
                        {formatBytes(proc.size_vram)}
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-[#0d1117] h-1.5 rounded overflow-hidden">
                      <div
                        className="bg-cyan-400 h-full rounded"
                        style={{ width: `${Math.min(100, (proc.size_vram / 8589934592) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#8b949e] pt-1 border-t border-[#21262d]">
                    <span>Format: <strong className="font-mono text-white">{proc.details.format}</strong></span>
                    <span>Params: <strong className="font-mono text-white">{proc.details.parameter_size}</strong></span>
                    <span>Quant: <strong className="font-mono text-white">{proc.details.quantization_level}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pull New Model Section (/api/pull) */}
        <div className="p-4 bg-[#161b22] border border-[#30363d] rounded space-y-3">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Pull Model from Library (/api/pull)</span>
          </h3>

          <div className="flex flex-wrap gap-2 text-xs">
            {POPULAR_MODELS.map((pm) => (
              <button
                key={pm.name}
                onClick={() => handlePull(pm.name)}
                disabled={Boolean(pullingModel)}
                className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white rounded border border-[#30363d] flex items-center gap-2 transition-all disabled:opacity-40"
              >
                <Download className="w-3 h-3 text-cyan-400" />
                <span className="font-mono">{pm.name}</span>
                <span className="text-[10px] text-[#8b949e]">({pm.size})</span>
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={pullInput}
              onChange={(e) => setPullInput(e.target.value)}
              placeholder="e.g. qwen2.5-coder:1.5b or deepseek-r1:8b"
              className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-xs font-mono text-white placeholder-[#8b949e] focus:outline-hidden focus:border-cyan-400"
            />
            <button
              onClick={() => handlePull(pullInput)}
              disabled={!pullInput.trim() || Boolean(pullingModel)}
              className="px-4 py-1.5 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-900 text-xs font-semibold rounded transition-colors whitespace-nowrap"
            >
              Pull Model
            </button>
          </div>

          {/* Pull Progress indicator */}
          {pullProgress && (
            <div className="p-3 bg-[#0d1117] rounded border border-[#30363d] space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#8b949e]">
                <span className="font-mono text-cyan-300">{pullingModel}: {pullProgress.status}</span>
                {pullProgress.total && pullProgress.completed && (
                  <span className="font-mono tabular-nums text-white">
                    {Math.round((pullProgress.completed / pullProgress.total) * 100)}%
                  </span>
                )}
              </div>
              {pullProgress.total && pullProgress.completed && (
                <div className="w-full bg-[#161b22] h-2 rounded overflow-hidden">
                  <div
                    className="bg-cyan-400 h-full rounded transition-all duration-200"
                    style={{
                      width: `${(pullProgress.completed / pullProgress.total) * 100}%`,
                    }}
                  ></div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Installed Models Table (/api/tags) */}
        <div>
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <span>Installed Weights (/api/tags - {models.length} Models)</span>
          </h3>

          <div className="border border-[#30363d] rounded overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#161b22] text-[#8b949e] border-b border-[#30363d]">
                <tr>
                  <th className="py-2.5 px-3 font-medium">Model Tag</th>
                  <th className="py-2.5 px-3 font-medium">Parameters</th>
                  <th className="py-2.5 px-3 font-medium">Quantization</th>
                  <th className="py-2.5 px-3 font-medium">File Size</th>
                  <th className="py-2.5 px-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#21262d]">
                {models.map((model) => (
                  <tr key={model.name} className="hover:bg-[#161b22]/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-white">
                      {model.name}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#c9d1d9]">
                      {model.details?.parameter_size || 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-cyan-300">
                      {model.details?.quantization_level || 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#8b949e] tabular-nums">
                      {formatBytes(model.size)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleInspect(model.name)}
                        className="px-2.5 py-1 text-[11px] bg-[#21262d] hover:bg-[#30363d] text-cyan-300 rounded border border-[#30363d] transition-colors"
                      >
                        Inspect (/api/show)
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Model Metadata (/api/show) */}
        {inspectModel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-2xl bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl p-4 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#21262d]">
                <h4 className="text-sm font-semibold text-white font-mono flex items-center gap-2">
                  <Info className="w-4 h-4 text-cyan-400" />
                  <span>Model Details: {inspectModel.name}</span>
                </h4>
                <button
                  onClick={() => setInspectModel(null)}
                  className="text-xs text-[#8b949e] hover:text-white"
                >
                  Close
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[#8b949e] block mb-1">Architecture Details:</span>
                  <div className="bg-[#0d1117] p-2.5 rounded border border-[#30363d] font-mono text-cyan-300 text-[11px]">
                    Family: {inspectModel.data?.details?.family} · Parameters: {inspectModel.data?.details?.parameter_size} · Quant: {inspectModel.data?.details?.quantization_level}
                  </div>
                </div>

                <div>
                  <span className="text-[#8b949e] block mb-1">Modelfile:</span>
                  <pre className="bg-[#0d1117] p-2.5 rounded border border-[#30363d] font-mono text-[11px] text-[#7ee787] overflow-x-auto">
                    {inspectModel.data?.modelfile || 'N/A'}
                  </pre>
                </div>

                <div>
                  <span className="text-[#8b949e] block mb-1">License:</span>
                  <pre className="bg-[#0d1117] p-2.5 rounded border border-[#30363d] font-mono text-[11px] text-[#c9d1d9] overflow-x-auto">
                    {inspectModel.data?.license || 'N/A'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

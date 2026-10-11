import React, { useState } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Copy,
  Check,
  Code2,
  FileText,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { ChatMessage, OllamaModel } from '../types/ollama';
import { WorkspaceFile } from '../data/sampleFiles';

interface AgentChatSidebarProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  availableModels: OllamaModel[];
  activeFile: WorkspaceFile;
  onApplyCode: (code: string) => void;
  onClearChat: () => void;
  lastStats?: {
    totalDurationMs?: number;
    evalCount?: number;
    speedTokPerSec?: number;
  };
}

export const AgentChatSidebar: React.FC<AgentChatSidebarProps> = ({
  messages,
  onSendMessage,
  isLoading,
  selectedModel,
  onSelectModel,
  availableModels,
  activeFile,
  onApplyCode,
  onClearChat,
  lastStats,
}) => {
  const [input, setInput] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput('');
    await onSendMessage(text);
  };

  const handleQuickAction = (actionPrompt: string) => {
    onSendMessage(`${actionPrompt} for the active file (${activeFile.name}):\n\`\`\`${activeFile.language}\n${activeFile.content}\n\`\`\``);
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper to extract code snippets from markdown
  const extractCodeBlocks = (content: string) => {
    const blocks: { language: string; code: string }[] = [];
    const regex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'typescript',
        code: match[2].trim(),
      });
    }
    return blocks;
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-[#e6edf3] border-r border-[#21262d]">
      {/* Top Header & Model Selector */}
      <div className="p-3 border-b border-[#21262d] flex flex-col gap-2 bg-[#161b22]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-white">Ollama Assistant</span>
          </div>
          <button
            onClick={onClearChat}
            className="text-[11px] text-[#8b949e] hover:text-white flex items-center gap-1 transition-colors"
            title="Clear Chat History"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        {/* Model Selector */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-[#8b949e] whitespace-nowrap">Model:</label>
          <select
            value={selectedModel}
            onChange={(e) => onSelectModel(e.target.value)}
            className="w-full text-xs bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-cyan-300 focus:outline-hidden"
          >
            {availableModels.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name} ({m.details.parameter_size || '7B'})
              </option>
            ))}
          </select>
        </div>

        {/* Active Context Indicator */}
        <div className="flex items-center gap-2 text-[11px] text-[#8b949e]">
          <span>Context:</span>
          <span className="text-white font-mono flex items-center gap-1 bg-[#21262d] px-1.5 py-0.5 rounded">
            <FileText className="w-3 h-3 text-cyan-400" />
            {activeFile.name}
          </span>
          {lastStats?.speedTokPerSec ? (
            <span className="ml-auto font-mono text-[10px] text-emerald-400 tabular-nums">
              {lastStats.speedTokPerSec} tok/s
            </span>
          ) : null}
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="px-3 py-2 border-b border-[#21262d] flex items-center gap-1.5 overflow-x-auto text-[11px]">
        <button
          onClick={() => onSendMessage('Analyze all files in the workspace for architecture and security vulnerabilities.')}
          className="px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded whitespace-nowrap transition-colors font-medium flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Scan Workspace</span>
        </button>
        <button
          onClick={() => handleQuickAction('Explain code architecture and logic flow')}
          className="px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] rounded whitespace-nowrap transition-colors"
        >
          Explain Logic
        </button>
        <button
          onClick={() => handleQuickAction('Refactor for performance, cleanliness, and security')}
          className="px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-cyan-300 rounded whitespace-nowrap transition-colors"
        >
          Refactor Clean
        </button>
        <button
          onClick={() => handleQuickAction('Generate comprehensive unit test suite')}
          className="px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-emerald-300 rounded whitespace-nowrap transition-colors"
        >
          Unit Tests
        </button>
        <button
          onClick={() => handleQuickAction('Audit security vulnerabilities and apply fixes')}
          className="px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-amber-300 rounded whitespace-nowrap transition-colors"
        >
          Fix Security
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const codeBlocks = !isUser ? extractCodeBlocks(msg.content) : [];

          return (
            <div
              key={index}
              className={`flex flex-col gap-1.5 ${
                isUser ? 'items-end' : 'items-start'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[11px] text-[#8b949e]">
                {isUser ? (
                  <>
                    <span>You</span>
                    <User className="w-3 h-3 text-[#58a6ff]" />
                  </>
                ) : (
                  <>
                    <Bot className="w-3 h-3 text-cyan-400" />
                    <span>Ollama ({selectedModel})</span>
                  </>
                )}
              </div>

              <div
                className={`max-w-[95%] p-3 rounded-lg leading-relaxed ${
                  isUser
                    ? 'bg-[#1f6feb]/20 border border-[#1f6feb]/40 text-[#f0f6fc]'
                    : 'bg-[#161b22] border border-[#30363d] text-[#c9d1d9]'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                {/* If AI provided code blocks, provide Apply & Copy buttons */}
                {codeBlocks.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-[#30363d] space-y-2">
                    {codeBlocks.map((block, bIdx) => (
                      <div
                        key={bIdx}
                        className="bg-[#0d1117] rounded border border-[#30363d] p-2"
                      >
                        <div className="flex items-center justify-between text-[10px] text-[#8b949e] pb-1 border-b border-[#21262d] mb-1.5">
                          <span className="font-mono">{block.language}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyToClipboard(block.code, index * 10 + bIdx)}
                              className="hover:text-white flex items-center gap-1 transition-colors"
                            >
                              {copiedIndex === index * 10 + bIdx ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>Copy</span>
                            </button>
                            <button
                              onClick={() => onApplyCode(block.code)}
                              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors font-medium"
                            >
                              <Code2 className="w-3 h-3" />
                              <span>Apply to Editor</span>
                            </button>
                          </div>
                        </div>
                        <pre className="text-[11px] font-mono text-[#7ee787] overflow-x-auto max-h-48">
                          <code>{block.code}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-cyan-400 p-2">
            <Zap className="w-3.5 h-3.5 animate-bounce" />
            <span>Local model generating tokens...</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-[#21262d] bg-[#161b22]">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Ask Ollama or type 'refactor'..."
            rows={2}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 pr-10 text-xs text-[#e6edf3] placeholder-[#8b949e] focus:outline-hidden focus:border-cyan-400 resize-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2.5 p-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-900 rounded transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};

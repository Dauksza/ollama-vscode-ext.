import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Search, ArrowRight, X } from 'lucide-react';

export interface PaletteCommand {
  id: string;
  title: string;
  category: string;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  commands: PaletteCommand[];
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  commands,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredCommands = commands.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredCommands.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + (filteredCommands.length || 1)) % (filteredCommands.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl overflow-hidden text-[#e6edf3]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#21262d]">
          <Search className="w-4 h-4 text-[#8b949e]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search Ollama operations..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm focus:outline-hidden placeholder-[#8b949e]"
          />
          <button onClick={onClose} className="text-[#8b949e] hover:text-[#e6edf3]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto py-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-[#8b949e]">
              No matching Ollama commands found
            </div>
          ) : (
            filteredCommands.map((command, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={command.id}
                  onClick={() => {
                    command.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-4 py-2 cursor-pointer text-xs ${
                    isSelected ? 'bg-[#1f6feb] text-white' : 'hover:bg-[#21262d] text-[#c9d1d9]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span className="font-medium">
                      <span className="opacity-70">{command.category}:</span> {command.title}
                    </span>
                  </div>
                  {command.shortcut && (
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${
                        isSelected
                          ? 'border-white/30 text-white'
                          : 'border-[#30363d] text-[#8b949e] bg-[#0d1117]'
                      }`}
                    >
                      {command.shortcut}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

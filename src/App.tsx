import React, { useState, useEffect, useCallback } from 'react';
import { TopNavigation } from './components/TopNavigation';
import { ActivityBar } from './components/ActivityBar';
import { StatusBar } from './components/StatusBar';
import { FileExplorerSidebar } from './components/FileExplorerSidebar';
import { AgentChatSidebar } from './components/AgentChatSidebar';
import { DiagnosticsSidebar } from './components/DiagnosticsSidebar';
import { ApiWorkbenchView } from './components/ApiWorkbenchView';
import { ModelManagerView } from './components/ModelManagerView';
import { VsixPackagingView } from './components/VsixPackagingView';
import { VsCodeEditor } from './components/VsCodeEditor';
import { CommandPaletteModal, PaletteCommand } from './components/CommandPaletteModal';
import { SettingsModal } from './components/SettingsModal';
import { INITIAL_WORKSPACE_FILES, WorkspaceFile } from './data/sampleFiles';
import {
  ChatMessage,
  CodeAnalysisReport,
  CodeDiagnostic,
  OllamaModel,
  OllamaProcess,
} from './types/ollama';
import {
  ollamaService,
  OllamaMode,
  ConnectionStatus,
} from './services/ollamaService';
import { codeAnalyzerService } from './services/codeAnalyzerService';
import { buildVsixPackage, triggerDownload } from './services/vsixGenerator';

export default function App() {
  // Navigation & Views
  const [activeView, setActiveView] = useState<string>('files');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Workspace Files
  const [files, setFiles] = useState<WorkspaceFile[]>(INITIAL_WORKSPACE_FILES);
  const [activeFile, setActiveFile] = useState<WorkspaceFile>(INITIAL_WORKSPACE_FILES[0]);

  // Ollama Configuration & Status
  const [connectionMode, setConnectionMode] = useState<OllamaMode>('sandbox');
  const [endpoint, setEndpoint] = useState<string>('http://127.0.0.1:11434');
  const [chatModel, setChatModel] = useState<string>('qwen2.5-coder:7b');
  const [autocompleteModel, setAutocompleteModel] = useState<string>('deepseek-coder:6.7b');
  const [enableFIM, setEnableFIM] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Models & Processes
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [runningProcesses, setRunningProcesses] = useState<OllamaProcess[]>([]);
  const [isModelsLoading, setIsModelsLoading] = useState(false);

  // Agent Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hello! I am your **Ollama Code Agent** operating with 100% offline local inference on **${chatModel}**.\n\nI can analyze your active code for AST security vulnerabilities, refactor complex algorithms, generate unit tests, and provide instant inline ghost completions.`,
    },
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [lastStats, setLastStats] = useState<{
    totalDurationMs?: number;
    evalCount?: number;
    speedTokPerSec?: number;
  }>({});

  // Offline Diagnostics & AST
  const [analysisReport, setAnalysisReport] = useState<CodeAnalysisReport | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // VSIX Packaging
  const [isBuildingVsix, setIsBuildingVsix] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Run AST Analysis on the active file
  const runFileAnalysis = useCallback(async (fileToAnalyze: WorkspaceFile) => {
    setIsScanning(true);
    try {
      const report = await codeAnalyzerService.analyzeCode(
        fileToAnalyze.name,
        fileToAnalyze.content
      );
      setAnalysisReport(report);
    } catch (err: any) {
      console.error('Scan error:', err);
    } finally {
      setIsScanning(false);
    }
  }, []);

  // Fetch Models and Running Processes
  const refreshHub = useCallback(async () => {
    setIsModelsLoading(true);
    try {
      const tagsData = await ollamaService.getTags();
      setModels(tagsData.models);

      const psData = await ollamaService.ps();
      setRunningProcesses(psData.models);
    } catch (err: any) {
      console.warn('Hub refresh failed:', err);
    } finally {
      setIsModelsLoading(false);
    }
  }, []);

  // Test Connection
  const testConnection = useCallback(async () => {
    setIsTestingConnection(true);
    try {
      const status = await ollamaService.checkHealth();
      setConnectionStatus(status);
      if (status.online) {
        await refreshHub();
      }
    } finally {
      setIsTestingConnection(false);
    }
  }, [refreshHub]);

  // Initial setup
  useEffect(() => {
    ollamaService.setMode(connectionMode);
    ollamaService.setBaseUrl(endpoint);
    testConnection();
    runFileAnalysis(activeFile);
  }, []);

  // Sync mode changes
  const handleModeChange = async (newMode: OllamaMode) => {
    setConnectionMode(newMode);
    ollamaService.setMode(newMode);
    await testConnection();
    showToast(`Switched driver to: ${newMode.toUpperCase()}`);
  };

  const handleEndpointChange = (newUrl: string) => {
    setEndpoint(newUrl);
    ollamaService.setBaseUrl(newUrl);
  };

  // Re-run analysis when active file switches
  const handleSelectFile = (file: WorkspaceFile) => {
    setActiveFile(file);
    runFileAnalysis(file);
  };

  const handleUpdateActiveFileContent = (newContent: string) => {
    const updated = { ...activeFile, content: newContent };
    setActiveFile(updated);
    setFiles((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    runFileAnalysis(updated);
  };

  // Quick Fix diagnostic
  const handleApplyFix = (diag: CodeDiagnostic) => {
    if (!diag.suggestedFix) return;

    const lines = activeFile.content.split('\n');
    const targetIdx = diag.line - 1;

    if (diag.code === 'NO_EVAL') {
      lines[targetIdx] = '    // Replaced eval with secure JSON parsing\n    const result = JSON.parse(expression);';
    } else if (diag.code === 'HARDCODED_SECRET') {
      lines[targetIdx] = '// Extracted to secure environment\nconst JWT_FALLBACK_SECRET = process.env.JWT_SECRET || "";';
    } else if (diag.code === 'COMMAND_INJECTION') {
      lines[targetIdx] = '    // Sanitized: Pass arguments as array without shell string concatenation\n    const output = execSync("nvidia-smi", { encoding: "utf8" });';
    } else if (diag.code === 'INSECURE_PRNG') {
      lines[targetIdx] = '    // Secure PRNG\n    const randomSuffix = crypto.randomUUID();';
    } else {
      lines[targetIdx] = `    // Fixed: ${diag.suggestedFix}\n` + lines[targetIdx];
    }

    const updatedContent = lines.join('\n');
    handleUpdateActiveFileContent(updatedContent);
    showToast(`Applied Quick Fix for line ${diag.line}: ${diag.code}`);
  };

  // Chat message send
  const handleSendMessage = async (text: string) => {
    const newHistory: ChatMessage[] = [...chatMessages, { role: 'user', content: text }];
    setChatMessages(newHistory);
    setIsChatLoading(true);

    const start = performance.now();
    try {
      const res = await ollamaService.chat({
        model: chatModel,
        messages: newHistory,
      });

      const elapsed = Math.round(performance.now() - start);
      const evalCount = res.eval_count || 120;
      const speed = Math.round((evalCount / (elapsed / 1000)) * 10) / 10;

      setLastStats({
        totalDurationMs: elapsed,
        evalCount,
        speedTokPerSec: speed,
      });

      setChatMessages((prev) => [...prev, res.message]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error calling Ollama API on ${endpoint}: ${err.message}. Ensure your local daemon is running or switch to Offline Sandbox Mode in Settings.`,
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Trigger FIM inline completion
  const handleTriggerFim = async (): Promise<string> => {
    try {
      const res = await ollamaService.generate({
        model: autocompleteModel,
        prompt: activeFile.content.slice(0, 500),
        suffix: activeFile.content.slice(500, 1000),
        options: { temperature: 0.1, num_predict: 64 },
      });
      return res.response || '// inline completion generated';
    } catch (err: any) {
      return '// Completion failed: verify Ollama status';
    }
  };

  // VSIX Download handler
  const handleDownloadVsix = async () => {
    setIsBuildingVsix(true);
    try {
      try {
        const response = await fetch('/api/download-vsix');
        if (response.ok) {
          const blob = await response.blob();
          triggerDownload(blob, 'ollama-code-agent-1.0.0.vsix');
          showToast(`Downloaded ollama-code-agent-1.0.0.vsix (${(blob.size / 1024).toFixed(1)} KB)`);
          return;
        }
      } catch (_) {}

      // Fallback to client-side generator
      const pkg = await buildVsixPackage();
      triggerDownload(pkg.blob, pkg.fileName);
      showToast(`Downloaded ${pkg.fileName} (${(pkg.sizeBytes / 1024).toFixed(1)} KB)`);
    } catch (err: any) {
      alert(`VSIX build failed: ${err.message}`);
    } finally {
      setIsBuildingVsix(false);
    }
  };

  // Command Palette commands
  const commands: PaletteCommand[] = [
    {
      id: 'download-vsix',
      title: 'Download .VSIX Extension Package',
      category: 'Ollama VSIX',
      action: handleDownloadVsix,
    },
    {
      id: 'trigger-fim',
      title: 'Trigger Fill-In-The-Middle (FIM) Completion',
      category: 'Ollama Autocomplete',
      shortcut: 'Ctrl+Alt+Space',
      action: async () => {
        setActiveView('files');
        const ghost = await handleTriggerFim();
        showToast('Generated FIM Suggestion');
      },
    },
    {
      id: 'explain-selection',
      title: 'Explain Active File Logic',
      category: 'Ollama Chat',
      shortcut: 'Ctrl+Shift+E',
      action: () => {
        setActiveView('agent');
        handleSendMessage(`Explain the logic and architecture of ${activeFile.name}`);
      },
    },
    {
      id: 'refactor-selection',
      title: 'Refactor for Performance & Clean Code',
      category: 'Ollama Refactor',
      action: () => {
        setActiveView('agent');
        handleSendMessage(`Refactor ${activeFile.name} to remove vulnerabilities and optimize runtime execution.`);
      },
    },
    {
      id: 'generate-tests',
      title: 'Generate Comprehensive Unit Tests',
      category: 'Ollama Tests',
      action: () => {
        setActiveView('agent');
        handleSendMessage(`Generate a complete test suite for ${activeFile.name} with edge cases.`);
      },
    },
    {
      id: 'run-ast-scan',
      title: 'Run Offline AST & Security Scan',
      category: 'Ollama AST',
      action: () => {
        setActiveView('diagnostics');
        runFileAnalysis(activeFile);
      },
    },
    {
      id: 'open-workbench',
      title: 'Open All API Endpoints Workbench',
      category: 'Ollama API',
      action: () => setActiveView('workbench'),
    },
    {
      id: 'open-models',
      title: 'Manage Local Models & VRAM Occupancy',
      category: 'Ollama Hub',
      action: () => setActiveView('models'),
    },
    {
      id: 'open-settings',
      title: 'Configure Extension Settings',
      category: 'Ollama Config',
      action: () => setIsSettingsOpen(true),
    },
  ];

  // Global key listener for Ctrl+Shift+P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const errorCount = analysisReport?.diagnostics.filter((d) => d.severity === 'error').length || 0;
  const warningCount = analysisReport?.diagnostics.filter((d) => d.severity === 'warning').length || 0;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0d1117] text-[#e6edf3] overflow-hidden select-none">
      {/* Top Bar Contract (Wordmark, Nav links, Action button) */}
      <TopNavigation
        activeView={activeView}
        onSelectView={setActiveView}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onDownloadVsix={handleDownloadVsix}
        connectionStatus={{
          online: Boolean(connectionStatus?.online),
          mode: connectionMode,
          version: connectionStatus?.version,
        }}
      />

      {/* Main VS Code IDE Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar on Left */}
        <ActivityBar
          activeView={activeView}
          onSelectView={setActiveView}
          diagnosticsCount={analysisReport?.diagnostics.length || 0}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        {/* View Switcher Container */}
        {activeView === 'files' ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Explorer sidebar */}
            <div className="w-56 shrink-0 hidden md:block">
              <FileExplorerSidebar
                files={files}
                activeFile={activeFile}
                onSelectFile={handleSelectFile}
                diagnostics={analysisReport?.diagnostics || []}
                onTriggerWorkspaceScan={() => runFileAnalysis(activeFile)}
                isScanning={isScanning}
              />
            </div>

            {/* Code Editor */}
            <VsCodeEditor
              files={files}
              activeFile={activeFile}
              onSelectFile={handleSelectFile}
              onUpdateFileContent={handleUpdateActiveFileContent}
              diagnostics={analysisReport?.diagnostics || []}
              onApplyFix={handleApplyFix}
              onTriggerFim={handleTriggerFim}
              onExplainCode={() => {
                setActiveView('agent');
                handleSendMessage(`Explain this code: ${activeFile.content}`);
              }}
              onRefactorCode={() => {
                setActiveView('agent');
                handleSendMessage(`Refactor this code: ${activeFile.content}`);
              }}
              onGenerateTests={() => {
                setActiveView('agent');
                handleSendMessage(`Generate tests for this code: ${activeFile.content}`);
              }}
              activeModelName={autocompleteModel}
            />

            {/* Collapsible right sidebar for quick chat assistant */}
            <div className="w-80 shrink-0 hidden xl:block border-l border-[#21262d]">
              <AgentChatSidebar
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                isLoading={isChatLoading}
                selectedModel={chatModel}
                onSelectModel={setChatModel}
                availableModels={models}
                activeFile={activeFile}
                onApplyCode={handleUpdateActiveFileContent}
                onClearChat={() => setChatMessages([])}
                lastStats={lastStats}
              />
            </div>
          </div>
        ) : activeView === 'agent' ? (
          <div className="flex-1 flex overflow-hidden">
            <div className="w-96 shrink-0">
              <AgentChatSidebar
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                isLoading={isChatLoading}
                selectedModel={chatModel}
                onSelectModel={setChatModel}
                availableModels={models}
                activeFile={activeFile}
                onApplyCode={handleUpdateActiveFileContent}
                onClearChat={() => setChatMessages([])}
                lastStats={lastStats}
              />
            </div>
            {/* Main pane remains the active code for reference */}
            <VsCodeEditor
              files={files}
              activeFile={activeFile}
              onSelectFile={handleSelectFile}
              onUpdateFileContent={handleUpdateActiveFileContent}
              diagnostics={analysisReport?.diagnostics || []}
              onApplyFix={handleApplyFix}
              onTriggerFim={handleTriggerFim}
              onExplainCode={() => {}}
              onRefactorCode={() => {}}
              onGenerateTests={() => {}}
              activeModelName={autocompleteModel}
            />
          </div>
        ) : activeView === 'diagnostics' ? (
          <div className="flex-1 flex overflow-hidden">
            <div className="w-96 shrink-0">
              <DiagnosticsSidebar
                report={analysisReport}
                isScanning={isScanning}
                onRunScan={() => runFileAnalysis(activeFile)}
                onApplyFix={handleApplyFix}
                onJumpToLine={() => {}}
              />
            </div>
            <VsCodeEditor
              files={files}
              activeFile={activeFile}
              onSelectFile={handleSelectFile}
              onUpdateFileContent={handleUpdateActiveFileContent}
              diagnostics={analysisReport?.diagnostics || []}
              onApplyFix={handleApplyFix}
              onTriggerFim={handleTriggerFim}
              onExplainCode={() => {}}
              onRefactorCode={() => {}}
              onGenerateTests={() => {}}
              activeModelName={autocompleteModel}
            />
          </div>
        ) : activeView === 'workbench' ? (
          <div className="flex-1 overflow-hidden">
            <ApiWorkbenchView
              currentMode={connectionMode}
              onModeChange={handleModeChange}
              baseUrl={endpoint}
              onBaseUrlChange={handleEndpointChange}
            />
          </div>
        ) : activeView === 'models' ? (
          <div className="flex-1 overflow-hidden">
            <ModelManagerView
              models={models}
              runningProcesses={runningProcesses}
              onRefresh={refreshHub}
              onPullModel={async (name) => {
                await ollamaService.pull(name);
                await refreshHub();
                showToast(`Pulled model: ${name}`);
              }}
              isLoading={isModelsLoading}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <VsixPackagingView
              onDownloadVsix={handleDownloadVsix}
              isBuilding={isBuildingVsix}
            />
          </div>
        )}
      </div>

      {/* VS Code Bottom Status Bar */}
      <StatusBar
        connectionStatus={connectionStatus}
        activeModel={chatModel}
        onOpenSettings={() => setIsSettingsOpen(true)}
        errorCount={errorCount}
        warningCount={warningCount}
        enableFIM={enableFIM}
        onSelectView={setActiveView}
      />

      {/* Modals & Overlays */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={commands}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        endpoint={endpoint}
        onEndpointChange={handleEndpointChange}
        mode={connectionMode}
        onModeChange={handleModeChange}
        chatModel={chatModel}
        onChatModelChange={setChatModel}
        autocompleteModel={autocompleteModel}
        onAutocompleteModelChange={setAutocompleteModel}
        enableFIM={enableFIM}
        onEnableFIMChange={setEnableFIM}
        connectionStatus={connectionStatus}
        onTestConnection={testConnection}
        isTesting={isTestingConnection}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-9 right-4 z-50 bg-[#161b22] border border-cyan-400/60 shadow-xl rounded px-4 py-2 text-xs text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

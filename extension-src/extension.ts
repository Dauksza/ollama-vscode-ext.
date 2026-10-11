/**
 * Ollama Code Agent - VS Code Extension Entry Point
 * Full offline local AI coding assistant & AST analyzer.
 */
import * as vscode from 'vscode';
import { OllamaClient } from './ollamaClient';
import { OfflineCodeAnalyzer } from './codeAnalyzer';
import { OllamaChatViewProvider } from './chatViewProvider';
import { OllamaDiagnosticsTreeProvider, OllamaModelTreeProvider } from './treeProviders';

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('ollama');
  const endpoint = config.get<string>('endpoint', 'http://127.0.0.1:11434');
  const client = new OllamaClient(endpoint);
  const analyzer = new OfflineCodeAnalyzer();

  const diagnosticCollection = vscode.languages.createDiagnosticCollection('ollama-ast');
  context.subscriptions.push(diagnosticCollection);

  // 1. Register Webview Sidebar View Provider
  const chatProvider = new OllamaChatViewProvider(context.extensionUri, client, analyzer);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('ollama.chatView', chatProvider)
  );

  // 2. Register Tree View Providers for declared views
  const diagnosticsTreeProvider = new OllamaDiagnosticsTreeProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('ollama.diagnosticsView', diagnosticsTreeProvider)
  );

  const modelTreeProvider = new OllamaModelTreeProvider(client);
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('ollama.modelManager', modelTreeProvider)
  );

  // Helper to run analysis
  const runAnalysis = (document: vscode.TextDocument) => {
    const text = document.getText();
    const report = analyzer.analyzeDocument(document.fileName, text);

    const vsDiags: vscode.Diagnostic[] = report.diagnostics.map((d) => {
      const range = new vscode.Range(
        new vscode.Position(d.line - 1, d.column),
        new vscode.Position(d.endLine - 1, d.endColumn)
      );
      const sev =
        d.severity === 'error'
          ? vscode.DiagnosticSeverity.Error
          : d.severity === 'warning'
          ? vscode.DiagnosticSeverity.Warning
          : vscode.DiagnosticSeverity.Information;
      const diag = new vscode.Diagnostic(range, d.message, sev);
      diag.source = d.source;
      diag.code = d.code;
      return diag;
    });

    diagnosticCollection.set(document.uri, vsDiags);
    diagnosticsTreeProvider.updateDiagnostics(report.diagnostics);
    return report;
  };

  // 3. Register Inline Completion Provider (Fill-In-The-Middle / FIM)
  const inlineProvider: vscode.InlineCompletionItemProvider = {
    async provideInlineCompletionItems(document, position, _token) {
      const enabled = vscode.workspace.getConfiguration('ollama').get<boolean>('enableInlineCompletion', true);
      if (!enabled) return undefined;

      const prefix = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
      const suffix = document.getText(
        new vscode.Range(position, new vscode.Position(document.lineCount, 0))
      );
      const model = vscode.workspace
        .getConfiguration('ollama')
        .get<string>('autocompleteModel', 'deepseek-coder:6.7b');

      try {
        const suggestion = await client.generateFIM({
          model,
          prompt: prefix.slice(-1500), // context window boundary
          suffix: suffix.slice(0, 1000),
          options: { temperature: 0.1, num_predict: 64, stop: ['\n\n', '<|endoftext|>'] },
        });

        if (!suggestion || suggestion.trim().length === 0) return undefined;

        return [
          new vscode.InlineCompletionItem(
            suggestion,
            new vscode.Range(position, position)
          ),
        ];
      } catch (err) {
        return undefined;
      }
    },
  };

  context.subscriptions.push(
    vscode.languages.registerInlineCompletionItemProvider(
      [{ pattern: '**/*' }],
      inlineProvider
    )
  );

  // 4. Command: Trigger Inline Completion
  context.subscriptions.push(
    vscode.commands.registerCommand('ollama.triggerCompletion', async () => {
      vscode.commands.executeCommand('editor.action.inlineSuggest.trigger');
    })
  );

  // 5. Command: Explain Selection
  context.subscriptions.push(
    vscode.commands.registerCommand('ollama.explainSelection', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const selection = editor.document.getText(editor.selection);
      if (!selection) {
        vscode.window.showInformationMessage('Please highlight code to explain.');
        return;
      }
      chatProvider.sendToChat(
        `Explain this ${editor.document.languageId} code snippet in depth:\n\`\`\`${editor.document.languageId}\n${selection}\n\`\`\``
      );
      vscode.commands.executeCommand('ollama.chatView.focus');
    })
  );

  // 6. Command: Refactor Selection
  context.subscriptions.push(
    vscode.commands.registerCommand('ollama.refactorSelection', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const selection = editor.document.getText(editor.selection);
      if (!selection) {
        vscode.window.showInformationMessage('Please highlight code to refactor.');
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Ollama: Refactoring selection with local model...',
          cancellable: false,
        },
        async () => {
          const model = vscode.workspace.getConfiguration('ollama').get<string>('chatModel', 'qwen2.5-coder:7b');
          const prompt = `Refactor this ${editor.document.languageId} code for clean architecture, zero memory leaks, and performance. Output only the replacement code inside markdown code block:\n\`\`\`${editor.document.languageId}\n${selection}\n\`\`\``;
          try {
            const result = await client.generate({ model, prompt, options: { temperature: 0.1 } });
            chatProvider.sendToChat(`### Refactor Proposal\n${result.response}`);
            vscode.commands.executeCommand('ollama.chatView.focus');
          } catch (err: any) {
            vscode.window.showErrorMessage(`Refactor failed: ${err.message}`);
          }
        }
      );
    })
  );

  // 7. Command: Generate Unit Tests
  context.subscriptions.push(
    vscode.commands.registerCommand('ollama.generateUnitTests', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const selection = editor.document.getText(editor.selection) || editor.document.getText();
      const model = vscode.workspace.getConfiguration('ollama').get<string>('chatModel', 'qwen2.5-coder:7b');

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Ollama: Generating unit tests...',
        },
        async () => {
          try {
            const prompt = `Generate comprehensive unit tests with edge cases for this ${editor.document.languageId} code:\n\`\`\`\n${selection}\n\`\`\``;
            const res = await client.generate({ model, prompt });
            chatProvider.sendToChat(`### Unit Test Suite\n${res.response}`);
            vscode.commands.executeCommand('ollama.chatView.focus');
          } catch (err: any) {
            vscode.window.showErrorMessage(`Test generation error: ${err.message}`);
          }
        }
      );
    })
  );

  // 8. Command: Analyze File (AST)
  context.subscriptions.push(
    vscode.commands.registerCommand('ollama.analyzeFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const report = runAnalysis(editor.document);
      vscode.window.showInformationMessage(
        `Ollama AST Scan: ${report.diagnostics.length} issues found. Complexity: ${report.cyclomaticComplexity}`
      );
    })
  );

  // 9. Command: Open Settings
  context.subscriptions.push(
    vscode.commands.registerCommand('ollama.openSettings', () => {
      vscode.commands.executeCommand('workbench.action.openSettings', 'ollama');
    })
  );

  // 10. Command: Scan Entire Workspace
  context.subscriptions.push(
    vscode.commands.registerCommand('ollama.scanWorkspace', async () => {
      chatProvider.sendToChat('Analyze all files in the workspace for architecture and security vulnerabilities.');
      vscode.commands.executeCommand('ollama.chatView.focus');
    })
  );

  // Auto-scan on file save or active editor change
  if (vscode.window.activeTextEditor) {
    runAnalysis(vscode.window.activeTextEditor.document);
  }

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      runAnalysis(doc);
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((ed) => {
      if (ed) runAnalysis(ed.document);
    })
  );

  // Refresh model tree view
  context.subscriptions.push(
    vscode.commands.registerCommand('ollama.refreshModels', () => {
      modelTreeProvider.refresh();
    })
  );

  console.log('Ollama Code Agent activated successfully.');
}

export function deactivate() {}

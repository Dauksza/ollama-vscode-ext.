import * as vscode from 'vscode';
import { OllamaClient } from './ollamaClient';
import { OfflineCodeAnalyzer } from './codeAnalyzer';
import { WorkspaceToolKit, WorkspaceSummary } from './agentTools';
import { WORKSPACE_AUDIT_SCHEMA, REFACTOR_SCHEMA } from './schemas';

export class OllamaChatViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private tools: WorkspaceToolKit;
  private messageHistory: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly client: OllamaClient,
    private readonly analyzer: OfflineCodeAnalyzer
  ) {
    this.tools = new WorkspaceToolKit(analyzer);
  }

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHtml();

    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message.command === 'sendMessage') {
        await this.handleUserMessage(message.text, message.enforceJson);
      } else if (message.command === 'quickAction') {
        await this.handleQuickAction(message.action);
      } else if (message.command === 'applyCode') {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          editor.edit((editBuilder) => {
            if (!editor.selection.isEmpty) {
              editBuilder.replace(editor.selection, message.code);
            } else {
              editBuilder.insert(editor.selection.active, message.code);
            }
          });
          vscode.window.showInformationMessage('Applied code snippet to active editor.');
        } else {
          vscode.window.showInformationMessage('No active editor open to insert code.');
        }
      } else if (message.command === 'openFile') {
        try {
          const folders = vscode.workspace.workspaceFolders;
          if (folders && folders.length > 0) {
            const uri = vscode.Uri.joinPath(folders[0].uri, message.file);
            const doc = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(doc);
            if (message.line) {
              const pos = new vscode.Position(message.line - 1, 0);
              editor.selection = new vscode.Selection(pos, pos);
              editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
            }
          }
        } catch (_) {}
      } else if (message.command === 'getWorkspaceContext') {
        this.updateContextUI();
      }
    });

    vscode.window.onDidChangeActiveTextEditor(() => {
      this.updateContextUI();
    });

    setTimeout(() => this.updateContextUI(), 400);
  }

  private async updateContextUI() {
    if (!this.view) return;
    try {
      const summary = await this.tools.getWorkspaceSummary();
      this.view.webview.postMessage({
        command: 'setContext',
        workspaceName: summary.workspaceName,
        filesCount: summary.fileList.length,
        activeFile: summary.activeFile?.path || 'None',
      });
    } catch (_) {}
  }

  public sendToChat(text: string) {
    this.view?.webview.postMessage({ command: 'injectPrompt', text });
  }

  private buildSystemPrompt(summary: WorkspaceSummary): string {
    const timestamp = new Date().toISOString();
    const filesPreview = summary.fileList.slice(0, 50).map((f) => `  - ${f}`).join('\n');
    const extraCount = summary.fileList.length > 50 ? `\n  - ... and ${summary.fileList.length - 50} more files` : '';

    return `You are Ollama Code Agent, an autonomous, local-first software engineering assistant running inside the user's Visual Studio Code IDE.

## TEMPORAL & ENVIRONMENT CONTEXT
- Timestamp: ${timestamp}
- Host: Visual Studio Code (Local Model Inference)
- Active Workspace: ${summary.workspaceName}
- Workspace Root: ${summary.workspacePath}
- User Application Files (${summary.fileList.length} files, excluding .venv/node_modules):
${filesPreview || '  (No application files found)'}${extraCount}

${
  summary.activeFile
    ? `## ACTIVE EDITOR CONTEXT
- File: ${summary.activeFile.path} (${summary.activeFile.language})
${
  summary.activeFile.selection
    ? `- Selected Code:\n\`\`\`${summary.activeFile.language}\n${summary.activeFile.selection}\n\`\`\``
    : `- File Snippet:\n\`\`\`${summary.activeFile.language}\n${summary.activeFile.content.slice(0, 3000)}\n\`\`\``
}`
    : '## ACTIVE EDITOR CONTEXT\nNo editor file currently open.'
}

## BEHAVIOR RULES
1. Ground every statement in the actual workspace files listed above.
2. Third-party virtual environments and library packages (.venv, site-packages, node_modules) are strictly excluded from your analysis scope. Focus solely on the user's project files.
3. If requested to analyze the workspace or output JSON, you MUST output valid JSON strictly conforming to the requested schema with zero hallucinated files.
4. When answering "what can you do?", explain your direct VS Code IDE powers: offline AST scanning, FIM code completion, local refactoring, and test generation.`;
  }

  private async handleUserMessage(userText: string, enforceJson: boolean = false) {
    if (!this.view) return;

    const summary = await this.tools.getWorkspaceSummary();
    const config = vscode.workspace.getConfiguration('ollama');
    const model = config.get<string>('chatModel', 'qwen2.5-coder:7b');

    const isWorkspaceScan =
      /(analyze|audit|scan|check|inspect|review).*(workspace|all files|project|repo|codebase)/i.test(userText) ||
      /workspace analysis/i.test(userText);

    let formatSchema: Record<string, any> | undefined = undefined;
    let enrichedUserPrompt = userText;

    if (isWorkspaceScan) {
      formatSchema = WORKSPACE_AUDIT_SCHEMA;

      this.view.webview.postMessage({
        command: 'botStatus',
        status: `Running AST scanner across ${summary.fileList.length} project files (excluding .venv)...`,
      });

      const report = await this.tools.analyzeWorkspace();

      const findingsText = report.results
        .filter((r) => r.diagnostics.length > 0)
        .map(
          (r) =>
            `File: ${r.file} (LOC: ${r.loc}, Complexity: ${r.complexity})\n` +
            r.diagnostics.map((d) => `  - Line ${d.line} [${d.severity.toUpperCase()} / ${d.code}]: ${d.message} (Fix: ${d.suggestedFix || 'Refactor'})`).join('\n')
        )
        .join('\n\n');

      enrichedUserPrompt = `Perform a comprehensive architectural and security audit of the workspace.
You MUST output a valid JSON object strictly matching the schema:
{
  "overview": {
    "workspace_name": "${summary.workspaceName}",
    "primary_languages": ["${summary.activeFile?.language || 'python'}"],
    "total_source_files_scanned": ${report.scannedFilesCount},
    "excluded_directories": [".venv", "node_modules", "site-packages", "__pycache__", "dist"],
    "health_score": ${report.highRiskCount > 0 ? 60 : 95},
    "overall_risk": "${report.highRiskCount > 1 ? 'CRITICAL' : report.highRiskCount === 1 ? 'HIGH' : report.totalIssues > 2 ? 'MODERATE' : 'LOW'}",
    "executive_summary": "Summary of codebase state"
  },
  "findings": [...],
  "architecture_analysis": { "entry_points": [...], "core_modules": [...], "dependencies_observed": [...], "architectural_strengths": [...], "design_concerns": [...] },
  "action_plan": [...]
}

AST SCAN INPUT (Actual user files only):
Scanned Files: ${report.scannedFilesCount}
Detected Issues: ${report.totalIssues}
${findingsText || 'No critical issues flagged in scanned application files.'}`;
    } else if (enforceJson) {
      formatSchema = { type: 'object' };
    }

    const systemPrompt = this.buildSystemPrompt(summary);

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...this.messageHistory.slice(-6),
      { role: 'user' as const, content: enrichedUserPrompt },
    ];

    this.messageHistory.push({ role: 'user', content: userText });

    try {
      this.view.webview.postMessage({
        command: 'botStatus',
        status: `Ollama (${model}) processing with schema grammar...`,
      });

      const res = await this.client.chat({
        model,
        messages,
        format: formatSchema,
      });

      const rawContent = res.message.content;
      this.messageHistory.push({ role: 'assistant', content: rawContent });

      // Check if response is valid JSON from schema
      let isJsonObj = false;
      let parsedData: any = null;
      try {
        const cleaned = rawContent.trim().replace(/^```json\n/, '').replace(/\n```$/, '');
        parsedData = JSON.parse(cleaned);
        if (parsedData && typeof parsedData === 'object') {
          isJsonObj = true;
        }
      } catch (_) {}

      if (isJsonObj && parsedData.overview && parsedData.findings) {
        this.view.webview.postMessage({
          command: 'renderStructuredAudit',
          data: parsedData,
          rawJson: rawContent,
        });
      } else {
        this.view.webview.postMessage({
          command: 'botResponse',
          text: rawContent,
        });
      }
    } catch (err: any) {
      this.view.webview.postMessage({
        command: 'botError',
        text: `Ollama error: ${err.message}. Verify that Ollama daemon is active at ${this.client.getBaseUrl()}`,
      });
    }
  }

  private async handleQuickAction(action: string) {
    if (action === 'scan_workspace') {
      await this.handleUserMessage('Analyze all files in the workspace with strict structured output.', true);
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('Open a file in your editor to run this action.');
      return;
    }

    const selectedText = editor.document.getText(editor.selection);
    const codeText = selectedText || editor.document.getText();
    const fileName = vscode.workspace.asRelativePath(editor.document.uri);
    const lang = editor.document.languageId;

    let prompt = '';
    if (action === 'explain') {
      prompt = `Explain the architecture, algorithms, and logic of ${fileName}:\n\`\`\`${lang}\n${codeText}\n\`\`\``;
    } else if (action === 'refactor') {
      prompt = `Refactor this ${lang} code in ${fileName} for clean architecture and high performance:\n\`\`\`${lang}\n${codeText}\n\`\`\``;
    } else if (action === 'test') {
      prompt = `Generate a full unit test suite with edge cases for ${fileName}:\n\`\`\`${lang}\n${codeText}\n\`\`\``;
    }

    await this.handleUserMessage(prompt);
  }

  private getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      color: var(--vscode-foreground, #cccccc);
      background-color: var(--vscode-sideBar-background, #1e1e1e);
      padding: 10px;
      margin: 0;
      font-size: var(--vscode-font-size, 13px);
      display: flex;
      flex-direction: column;
      height: 100vh;
      box-sizing: border-box;
    }
    .header {
      padding-bottom: 8px;
      border-bottom: 1px solid var(--vscode-widget-border, #333);
      margin-bottom: 8px;
    }
    .brand-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
      font-size: 13px;
    }
    .context-row {
      margin-top: 6px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      font-size: 11px;
      color: var(--vscode-descriptionForeground, #888);
    }
    .context-item {
      display: flex;
      align-items: center;
      gap: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .context-pill {
      background: var(--vscode-badge-background, #333);
      color: var(--vscode-badge-foreground, #fff);
      padding: 1px 5px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 10px;
    }
    .quick-actions {
      display: flex;
      gap: 4px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }
    .quick-btn {
      background: var(--vscode-button-secondaryBackground, #2d333b);
      color: var(--vscode-button-secondaryForeground, #cdd9e5);
      border: 1px solid var(--vscode-widget-border, #444c56);
      padding: 4px 8px;
      font-size: 11px;
      cursor: pointer;
      border-radius: 4px;
      transition: background 0.15s;
    }
    .quick-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground, #373e47);
    }
    .quick-btn.primary {
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #fff);
      border: none;
      font-weight: 500;
    }
    .quick-btn.primary:hover {
      background: var(--vscode-button-hoverBackground, #1177bb);
    }
    #chat-log {
      flex: 1;
      overflow-y: auto;
      margin-bottom: 8px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding-right: 4px;
    }
    .msg {
      padding: 8px 10px;
      border-radius: 6px;
      line-height: 1.45;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .msg-user {
      background: var(--vscode-badge-background, #005fb8);
      color: var(--vscode-badge-foreground, #fff);
      align-self: flex-end;
      max-width: 90%;
    }
    .msg-bot {
      background: var(--vscode-editor-background, #1e1e1e);
      border: 1px solid var(--vscode-widget-border, #333);
      color: var(--vscode-editor-foreground, #ccc);
      align-self: flex-start;
      max-width: 98%;
    }
    .msg-status {
      font-size: 11px;
      color: var(--vscode-textLink-foreground, #3794ff);
      font-style: italic;
      padding: 4px;
    }
    /* Structured Card Styling */
    .audit-card {
      background: var(--vscode-editor-background, #1e1e1e);
      border: 1px solid var(--vscode-widget-border, #333);
      border-radius: 6px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 100%;
    }
    .kpi-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    .kpi-box {
      background: rgba(255,255,255,0.04);
      padding: 6px;
      border-radius: 4px;
      font-size: 11px;
      border: 1px solid rgba(255,255,255,0.06);
    }
    .kpi-val {
      font-size: 14px;
      font-weight: 700;
      font-family: monospace;
      margin-top: 2px;
    }
    .badge-critical { color: #f85149; }
    .badge-high { color: #d29922; }
    .badge-low { color: #3fb950; }
    .findings-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-top: 4px;
    }
    .findings-table th, .findings-table td {
      border: 1px solid var(--vscode-widget-border, #333);
      padding: 4px 6px;
      text-align: left;
    }
    .findings-table th {
      background: rgba(255,255,255,0.05);
      color: var(--vscode-descriptionForeground, #888);
    }
    .jump-link {
      color: var(--vscode-textLink-foreground, #3794ff);
      cursor: pointer;
      text-decoration: underline;
    }
    .input-box {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: auto;
    }
    textarea {
      width: 100%;
      box-sizing: border-box;
      background: var(--vscode-input-background, #252526);
      color: var(--vscode-input-foreground, #ccc);
      border: 1px solid var(--vscode-input-border, #3c3c3c);
      border-radius: 4px;
      padding: 6px 8px;
      font-family: inherit;
      font-size: 12px;
      resize: vertical;
      min-height: 50px;
    }
    textarea:focus {
      outline: 1px solid var(--vscode-focusBorder, #007acc);
    }
    .send-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .schema-toggle {
      font-size: 11px;
      color: var(--vscode-descriptionForeground, #888);
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .send-btn {
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #fff);
      border: none;
      padding: 6px 14px;
      cursor: pointer;
      border-radius: 4px;
      font-weight: 500;
      font-size: 12px;
    }
    .send-btn:hover {
      background: var(--vscode-button-hoverBackground, #1177bb);
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand-row">
      <span>Ollama Code Assistant</span>
      <span style="font-size: 10px; opacity: 0.8; color: #4ec9b0;">Strict Schema v1.0</span>
    </div>
    <div class="context-row">
      <div class="context-item">
        <span>📁 Workspace:</span>
        <span id="wsName" class="context-pill">Detecting...</span>
        <span id="wsFilesCount" style="opacity: 0.7;"></span>
      </div>
      <div class="context-item">
        <span>📄 Active File:</span>
        <span id="activeFileName" style="font-family: monospace; color: #9cdcfe;">Detecting...</span>
      </div>
    </div>
  </div>

  <div class="quick-actions">
    <button class="quick-btn primary" onclick="sendAction('scan_workspace')">⚡ Scan Workspace (JSON Schema)</button>
    <button class="quick-btn" onclick="sendAction('explain')">Explain File</button>
    <button class="quick-btn" onclick="sendAction('refactor')">Refactor</button>
    <button class="quick-btn" onclick="sendAction('test')">Unit Tests</button>
  </div>

  <div id="chat-log">
    <div class="msg msg-bot">I am your Ollama Code Agent running with strict schema support. Virtual environments and vendor directories (.venv, node_modules) are automatically excluded.</div>
  </div>

  <div class="input-box">
    <textarea id="promptInput" rows="2" placeholder="Ask about workspace or request architectural audit..."></textarea>
    <div class="send-row">
      <label class="schema-toggle">
        <input type="checkbox" id="jsonCheckbox"> Enforce Strict JSON Schema
      </label>
      <button class="send-btn" id="sendBtn">Send Message</button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const chatLog = document.getElementById('chat-log');
    const promptInput = document.getElementById('promptInput');
    const sendBtn = document.getElementById('sendBtn');
    const jsonCheckbox = document.getElementById('jsonCheckbox');
    const wsName = document.getElementById('wsName');
    const wsFilesCount = document.getElementById('wsFilesCount');
    const activeFileName = document.getElementById('activeFileName');

    let currentStatusMsg = null;

    function appendMessage(text, isUser) {
      if (currentStatusMsg) {
        currentStatusMsg.remove();
        currentStatusMsg = null;
      }
      const msg = document.createElement('div');
      msg.className = 'msg ' + (isUser ? 'msg-user' : 'msg-bot');
      msg.textContent = text;
      chatLog.appendChild(msg);
      chatLog.scrollTop = chatLog.scrollHeight;
    }

    function showStatus(text) {
      if (!currentStatusMsg) {
        currentStatusMsg = document.createElement('div');
        currentStatusMsg.className = 'msg-status';
        chatLog.appendChild(currentStatusMsg);
      }
      currentStatusMsg.textContent = text;
      chatLog.scrollTop = chatLog.scrollHeight;
    }

    function renderStructuredAuditCard(data, rawJson) {
      if (currentStatusMsg) {
        currentStatusMsg.remove();
        currentStatusMsg = null;
      }

      const card = document.createElement('div');
      card.className = 'audit-card';

      const ov = data.overview || {};
      const riskClass = ov.overall_risk === 'CRITICAL' ? 'badge-critical' : ov.overall_risk === 'HIGH' ? 'badge-high' : 'badge-low';

      let findingsRows = '';
      if (data.findings && data.findings.length > 0) {
        data.findings.forEach(f => {
          findingsRows += '<tr>' +
            '<td><a class="jump-link" onclick="jumpToFile(\\'' + f.file + '\\', ' + f.line + ')">' + f.file + ':' + f.line + '</a></td>' +
            '<td class="' + (f.severity === 'CRITICAL' ? 'badge-critical' : 'badge-high') + '">' + f.severity + '</td>' +
            '<td><strong>' + f.rule + '</strong>: ' + f.title + '<br><span style="opacity:0.8">' + f.description + '</span><br><em style="color:#4ec9b0">Fix: ' + f.remediation + '</em></td>' +
            '</tr>';
        });
      } else {
        findingsRows = '<tr><td colspan="3" style="text-align:center; color:#3fb950">Zero security vulnerabilities detected in scanned application files!</td></tr>';
      }

      let actionRows = '';
      if (data.action_plan && data.action_plan.length > 0) {
        data.action_plan.forEach(a => {
          actionRows += '<li><strong>' + a.action + '</strong> on <code>' + a.target_file + '</code> (' + a.benefit + ')</li>';
        });
      }

      card.innerHTML = 
        '<div style="font-weight:600; font-size:13px; color:#4ec9b0">📊 Structured Workspace Audit Report</div>' +
        '<div class="kpi-row">' +
          '<div class="kpi-box"><div>Health Score</div><div class="kpi-val">' + (ov.health_score || 95) + '/100</div></div>' +
          '<div class="kpi-box"><div>Risk Level</div><div class="kpi-val ' + riskClass + '">' + (ov.overall_risk || 'LOW') + '</div></div>' +
        '</div>' +
        '<div style="font-size:11px; opacity:0.9">' + (ov.executive_summary || 'Analysis complete.') + '</div>' +
        '<div style="font-size:10px; color:#888">Scanned: ' + (ov.total_source_files_scanned || 0) + ' app files. Excluded: ' + ((ov.excluded_directories || []).join(', ') || '.venv, node_modules') + '</div>' +
        '<div style="font-weight:600; font-size:12px; margin-top:4px">Issues Detected (' + ((data.findings && data.findings.length) || 0) + ')</div>' +
        '<table class="findings-table">' +
          '<thead><tr><th>Location</th><th>Severity</th><th>Finding & Remediation</th></tr></thead>' +
          '<tbody>' + findingsRows + '</tbody>' +
        '</table>' +
        (actionRows ? '<div style="font-weight:600; font-size:12px; margin-top:4px">Action Plan</div><ol style="margin:0; padding-left:18px; font-size:11px">' + actionRows + '</ol>' : '') +
        '<details style="font-size:10px; margin-top:6px"><summary style="cursor:pointer; color:#888">View Raw Structured JSON</summary><pre style="background:#111; padding:6px; border-radius:4px; max-height:160px; overflow:auto">' + rawJson + '</pre></details>';

      chatLog.appendChild(card);
      chatLog.scrollTop = chatLog.scrollHeight;
    }

    function jumpToFile(file, line) {
      vscode.postMessage({ command: 'openFile', file, line });
    }

    sendBtn.addEventListener('click', () => {
      const text = promptInput.value.trim();
      if (!text) return;
      appendMessage(text, true);
      const enforceJson = jsonCheckbox.checked;
      promptInput.value = '';
      vscode.postMessage({ command: 'sendMessage', text, enforceJson });
    });

    promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
      }
    });

    function sendAction(action) {
      vscode.postMessage({ command: 'quickAction', action });
    }

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.command === 'renderStructuredAudit') {
        renderStructuredAuditCard(msg.data, msg.rawJson);
      } else if (msg.command === 'botResponse') {
        appendMessage(msg.text, false);
      } else if (msg.command === 'botStatus') {
        showStatus(msg.status);
      } else if (msg.command === 'botError') {
        appendMessage('[Error] ' + msg.text, false);
      } else if (msg.command === 'injectPrompt') {
        promptInput.value = msg.text;
        sendBtn.click();
      } else if (msg.command === 'setContext') {
        wsName.textContent = msg.workspaceName || 'Single File';
        wsFilesCount.textContent = '(' + (msg.filesCount || 0) + ' app files)';
        activeFileName.textContent = msg.activeFile || 'None';
      }
    });

    vscode.postMessage({ command: 'getWorkspaceContext' });
  </script>
</body>
</html>`;
  }
}

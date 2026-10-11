import * as vscode from 'vscode';
import { OllamaClient } from './ollamaClient';
import { DiagnosticItem } from './codeAnalyzer';

export class OllamaDiagnosticsTreeProvider implements vscode.TreeDataProvider<DiagnosticTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<DiagnosticTreeItem | undefined | null | void> = new vscode.EventEmitter<DiagnosticTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<DiagnosticTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private items: DiagnosticItem[] = [];

  public updateDiagnostics(diagnostics: DiagnosticItem[]) {
    this.items = diagnostics;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: DiagnosticTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: DiagnosticTreeItem): Thenable<DiagnosticTreeItem[]> {
    if (element) return Promise.resolve([]);
    if (this.items.length === 0) {
      const emptyItem = new DiagnosticTreeItem('No AST issues found in active file', vscode.TreeItemCollapsibleState.None, 'info');
      return Promise.resolve([emptyItem]);
    }
    return Promise.resolve(
      this.items.map((item) => {
        const treeItem = new DiagnosticTreeItem(
          `Line ${item.line}: ${item.message}`,
          vscode.TreeItemCollapsibleState.None,
          item.severity,
          item.line
        );
        treeItem.tooltip = item.suggestedFix ? `Fix: ${item.suggestedFix}` : item.message;
        return treeItem;
      })
    );
  }
}

export class DiagnosticTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly severity: 'error' | 'warning' | 'info',
    public readonly line?: number
  ) {
    super(label, collapsibleState);
    if (line !== undefined) {
      this.command = {
        command: 'revealLine',
        title: 'Go to Line',
        arguments: [{ lineNumber: line - 1, at: 'center' }],
      };
    }
    if (severity === 'error') {
      this.iconPath = new vscode.ThemeIcon('error');
    } else if (severity === 'warning') {
      this.iconPath = new vscode.ThemeIcon('warning');
    } else {
      this.iconPath = new vscode.ThemeIcon('info');
    }
  }
}

export class OllamaModelTreeProvider implements vscode.TreeDataProvider<ModelTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ModelTreeItem | undefined | null | void> = new vscode.EventEmitter<ModelTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ModelTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(private readonly client: OllamaClient) {}

  public refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ModelTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ModelTreeItem): Promise<ModelTreeItem[]> {
    if (element) return [];
    try {
      const data = await this.client.tags();
      if (!data.models || data.models.length === 0) {
        return [new ModelTreeItem('No local models found (Run ollama pull)', 'none')];
      }
      return data.models.map((m: any) => {
        const sizeGb = (m.size / (1024 * 1024 * 1024)).toFixed(1);
        const item = new ModelTreeItem(`${m.name} (${sizeGb} GB)`, 'model');
        item.description = m.details?.parameter_size || '';
        item.tooltip = `Format: ${m.details?.format} | Quant: ${m.details?.quantization_level}`;
        return item;
      });
    } catch (err: any) {
      return [new ModelTreeItem(`Ollama offline: ${err.message}`, 'error')];
    }
  }
}

export class ModelTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly kind: 'model' | 'error' | 'none'
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    if (kind === 'model') {
      this.iconPath = new vscode.ThemeIcon('chip');
    } else if (kind === 'error') {
      this.iconPath = new vscode.ThemeIcon('plug');
    }
  }
}

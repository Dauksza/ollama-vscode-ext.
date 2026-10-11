import * as vscode from 'vscode';
import { OfflineCodeAnalyzer, DiagnosticItem } from './codeAnalyzer';

export interface WorkspaceSummary {
  workspaceName: string;
  workspacePath: string;
  fileList: string[];
  activeFile?: {
    path: string;
    language: string;
    content: string;
    selection?: string;
  };
}

// Strict exclusion pattern eliminating virtual environments, vendor libraries, package caches
export const WORKSPACE_EXCLUDE_GLOB =
  '**/{node_modules,.git,dist,build,out,.next,.venv,venv,env,.env,site-packages,__pycache__,.pytest_cache,.mypy_cache,.tox,target,vendor,bin,obj,packages,Lib}/**';

export function isVendorOrVenvPath(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, '/').toLowerCase();
  return (
    normalized.includes('/.venv/') ||
    normalized.startsWith('.venv/') ||
    normalized.includes('/venv/') ||
    normalized.startsWith('venv/') ||
    normalized.includes('/site-packages/') ||
    normalized.includes('/__pycache__/') ||
    normalized.includes('/node_modules/') ||
    normalized.includes('/dist/') ||
    normalized.includes('/build/') ||
    normalized.includes('/lib/site-packages/')
  );
}

export class WorkspaceToolKit {
  constructor(private readonly analyzer: OfflineCodeAnalyzer) {}

  public async getWorkspaceSummary(): Promise<WorkspaceSummary> {
    const folders = vscode.workspace.workspaceFolders;
    const workspaceName = folders && folders.length > 0 ? folders[0].name : 'Single File / Unsaved';
    const workspacePath = folders && folders.length > 0 ? folders[0].uri.fsPath : process.cwd();

    // Find up to 100 actual user source files in workspace, strictly excluding venvs
    let fileList: string[] = [];
    try {
      const uris = await vscode.workspace.findFiles(
        '**/*.{ts,js,tsx,jsx,py,json,md,html,css,go,rs,java,c,cpp,yaml,yml}',
        WORKSPACE_EXCLUDE_GLOB,
        150
      );
      fileList = uris
        .map((u) => vscode.workspace.asRelativePath(u))
        .filter((p) => !isVendorOrVenvPath(p))
        .slice(0, 100);
    } catch (_) {}

    let activeFile: WorkspaceSummary['activeFile'] = undefined;
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const rel = vscode.workspace.asRelativePath(editor.document.uri);
      activeFile = {
        path: rel,
        language: editor.document.languageId,
        content: editor.document.getText(),
        selection: editor.document.getText(editor.selection) || undefined,
      };
    }

    return {
      workspaceName,
      workspacePath,
      fileList,
      activeFile,
    };
  }

  public async listFiles(subDir?: string): Promise<string[]> {
    const pattern = subDir ? `${subDir}/**/*.{ts,js,tsx,jsx,py,json,md}` : '**/*.{ts,js,tsx,jsx,py,json,md}';
    const uris = await vscode.workspace.findFiles(
      pattern,
      WORKSPACE_EXCLUDE_GLOB,
      100
    );
    return uris
      .map((u) => vscode.workspace.asRelativePath(u))
      .filter((p) => !isVendorOrVenvPath(p));
  }

  public async readFile(relativePath: string, maxLines: number = 300): Promise<string> {
    try {
      const folders = vscode.workspace.workspaceFolders;
      if (!folders || folders.length === 0) return 'Error: No open workspace folder.';
      const uri = vscode.Uri.joinPath(folders[0].uri, relativePath);
      const data = await vscode.workspace.fs.readFile(uri);
      const text = Buffer.from(data).toString('utf8');
      const lines = text.split('\n');
      if (lines.length > maxLines) {
        return lines.slice(0, maxLines).join('\n') + `\n\n// ... Truncated (${lines.length - maxLines} more lines)`;
      }
      return text;
    } catch (err: any) {
      return `Error reading file ${relativePath}: ${err.message}`;
    }
  }

  public async analyzeWorkspace(): Promise<{
    scannedFilesCount: number;
    totalIssues: number;
    highRiskCount: number;
    results: Array<{
      file: string;
      loc: number;
      complexity: number;
      diagnostics: DiagnosticItem[];
    }>;
  }> {
    // Only scan actual user application files, never library dependencies
    const uris = await vscode.workspace.findFiles(
      '**/*.{ts,js,tsx,jsx,py}',
      WORKSPACE_EXCLUDE_GLOB,
      50
    );

    const validUris = uris.filter((u) => !isVendorOrVenvPath(vscode.workspace.asRelativePath(u)));

    const results: Array<{
      file: string;
      loc: number;
      complexity: number;
      diagnostics: DiagnosticItem[];
    }> = [];

    let totalIssues = 0;
    let highRiskCount = 0;

    for (const uri of validUris) {
      try {
        const data = await vscode.workspace.fs.readFile(uri);
        const text = Buffer.from(data).toString('utf8');
        const relPath = vscode.workspace.asRelativePath(uri);
        const report = this.analyzer.analyzeDocument(relPath, text);

        results.push({
          file: relPath,
          loc: text.split('\n').length,
          complexity: report.cyclomaticComplexity,
          diagnostics: report.diagnostics,
        });

        totalIssues += report.diagnostics.length;
        highRiskCount += report.diagnostics.filter((d) => d.severity === 'error').length;
      } catch (_) {}
    }

    return {
      scannedFilesCount: results.length,
      totalIssues,
      highRiskCount,
      results,
    };
  }
}

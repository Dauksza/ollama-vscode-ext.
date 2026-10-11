/**
 * OfflineCodeAnalyzer - Static AST and Security Heuristics Engine
 * Runs 100% locally with zero cloud dependencies.
 */
export interface DiagnosticItem {
  id: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  source: string;
  code: string;
  suggestedFix?: string;
}

export class OfflineCodeAnalyzer {
  public analyzeDocument(fileName: string, content: string) {
    const lines = content.split('\n');
    const diagnostics: DiagnosticItem[] = [];
    let cyclomaticComplexity = 1;

    lines.forEach((lineText, idx) => {
      const lineNum = idx + 1;

      // 1. Dynamic code evaluation (eval / Function constructor)
      if (/\beval\s*\(|\bnew\s+Function\s*\(/.test(lineText)) {
        diagnostics.push({
          id: `sec-eval-${lineNum}`,
          line: lineNum,
          column: 0,
          endLine: lineNum,
          endColumn: lineText.length,
          message: 'Security Risk: Dynamic code execution via eval/Function() allows arbitrary code injection.',
          severity: 'error',
          source: 'ollama-security',
          code: 'NO_EVAL',
          suggestedFix: 'Replace dynamic eval() with structured parsers or JSON.parse().',
        });
      }

      // 2. Hardcoded Secrets
      if (/(?:api[_-]?key|secret|password|token)\s*[:=]\s*['"][a-zA-Z0-9_\-\.]{16,}['"]/i.test(lineText)) {
        diagnostics.push({
          id: `sec-secret-${lineNum}`,
          line: lineNum,
          column: 0,
          endLine: lineNum,
          endColumn: lineText.length,
          message: 'Hardcoded Secret Detected: Credentials stored directly in source files.',
          severity: 'error',
          source: 'ollama-security',
          code: 'LEAKED_CREDENTIAL',
          suggestedFix: 'Extract to process.env or secret manager.',
        });
      }

      // 3. Command Injection
      if (/\b(?:exec|execSync|spawn)\s*\([^)]*\+/.test(lineText)) {
        diagnostics.push({
          id: `sec-cmd-${lineNum}`,
          line: lineNum,
          column: 0,
          endLine: lineNum,
          endColumn: lineText.length,
          message: 'Command Injection: Unsanitized concatenation in child_process command.',
          severity: 'error',
          source: 'ollama-security',
          code: 'CMD_INJECTION',
          suggestedFix: 'Pass command arguments as an array instead of string concatenation.',
        });
      }

      // 4. Insecure PRNG
      if (/Math\.random\(\)/.test(lineText) && /(?:token|session|key|hash|nonce)/i.test(lineText)) {
        diagnostics.push({
          id: `sec-prng-${lineNum}`,
          line: lineNum,
          column: 0,
          endLine: lineNum,
          endColumn: lineText.length,
          message: 'Insecure PRNG: Math.random() is predictable and unsafe for cryptographical tokens.',
          severity: 'warning',
          source: 'ollama-security',
          code: 'INSECURE_PRNG',
          suggestedFix: 'Use crypto.randomUUID() or crypto.getRandomValues().',
        });
      }

      // 5. Cyclomatic Complexity
      if (/\b(if|else if|for|while|case|catch)\b/.test(lineText) || /&&|\|\|/.test(lineText)) {
        cyclomaticComplexity++;
      }
    });

    return {
      fileName,
      cyclomaticComplexity,
      diagnostics,
    };
  }
}

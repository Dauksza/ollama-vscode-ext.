/**
 * Strict JSON Schemas for Ollama Structured Output
 * Constrains model logits via GGUF grammar-based sampling to eliminate hallucinations.
 */

export const WORKSPACE_AUDIT_SCHEMA = {
  type: 'object',
  properties: {
    overview: {
      type: 'object',
      properties: {
        workspace_name: { type: 'string' },
        primary_languages: { type: 'array', items: { type: 'string' } },
        total_source_files_scanned: { type: 'integer' },
        excluded_directories: { type: 'array', items: { type: 'string' } },
        health_score: { type: 'integer' },
        overall_risk: { type: 'string', enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] },
        executive_summary: { type: 'string' },
      },
      required: [
        'workspace_name',
        'primary_languages',
        'total_source_files_scanned',
        'excluded_directories',
        'health_score',
        'overall_risk',
        'executive_summary',
      ],
    },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          line: { type: 'integer' },
          severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'WARNING', 'INFO'] },
          rule: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          remediation: { type: 'string' },
        },
        required: ['file', 'line', 'severity', 'rule', 'title', 'description', 'remediation'],
      },
    },
    architecture_analysis: {
      type: 'object',
      properties: {
        entry_points: { type: 'array', items: { type: 'string' } },
        core_modules: { type: 'array', items: { type: 'string' } },
        dependencies_observed: { type: 'array', items: { type: 'string' } },
        architectural_strengths: { type: 'array', items: { type: 'string' } },
        design_concerns: { type: 'array', items: { type: 'string' } },
      },
      required: [
        'entry_points',
        'core_modules',
        'dependencies_observed',
        'architectural_strengths',
        'design_concerns',
      ],
    },
    action_plan: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          priority: { type: 'integer' },
          action: { type: 'string' },
          target_file: { type: 'string' },
          benefit: { type: 'string' },
        },
        required: ['priority', 'action', 'target_file', 'benefit'],
      },
    },
  },
  required: ['overview', 'findings', 'architecture_analysis', 'action_plan'],
};

export const REFACTOR_SCHEMA = {
  type: 'object',
  properties: {
    target: { type: 'string' },
    issues_addressed: { type: 'array', items: { type: 'string' } },
    refactored_code: { type: 'string' },
    explanation: { type: 'string' },
    breaking_changes: { type: 'boolean' },
  },
  required: ['target', 'issues_addressed', 'refactored_code', 'explanation', 'breaking_changes'],
};

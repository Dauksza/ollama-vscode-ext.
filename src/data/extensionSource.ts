import { COMPILED_EXTENSION_JS } from './bundledExtensionCode';

export interface ExtensionFileItem {
  path: string;
  name: string;
  language: string;
  description: string;
  content: string;
}

export const EXTENSION_MANIFEST_JSON = JSON.stringify(
  {
    name: 'ollama-code-agent',
    displayName: 'Ollama Code Agent (Offline AI & AST Analysis)',
    description: 'Autonomous offline AI coding agent powered by local Ollama models. Seamless FIM inline completion, multi-turn chat, AST vulnerability scanning, and semantic code analysis without internet access.',
    version: '1.0.0',
    publisher: 'local-ai-tools',
    repository: {
      type: 'git',
      url: 'https://github.com/local-ai-tools/ollama-code-agent',
    },
    engines: {
      vscode: '^1.85.0',
    },
    categories: ['Programming Languages', 'Snippets', 'Machine Learning', 'Education'],
    keywords: [
      'ollama',
      'offline',
      'local-ai',
      'deepseek-coder',
      'qwen2.5-coder',
      'codellama',
      'code-completion',
      'copilot-alternative',
    ],
    activationEvents: ['onStartupFinished'],
    main: './dist/extension.js',
    contributes: {
      viewsContainers: {
        activitybar: [
          {
            id: 'ollama-sidebar-container',
            title: 'Ollama Local Agent',
            icon: '$(robot)',
          },
        ],
      },
      views: {
        'ollama-sidebar-container': [
          {
            type: 'webview',
            id: 'ollama.chatView',
            name: 'Ollama Assistant',
          },
          {
            type: 'tree',
            id: 'ollama.diagnosticsView',
            name: 'Offline AST & Security Diagnostics',
          },
          {
            type: 'tree',
            id: 'ollama.modelManager',
            name: 'Local Models & VRAM',
          },
        ],
      },
      commands: [
        {
          command: 'ollama.triggerCompletion',
          title: 'Trigger Inline Code Completion',
          category: 'Ollama',
        },
        {
          command: 'ollama.explainSelection',
          title: 'Explain Selected Code',
          category: 'Ollama',
        },
        {
          command: 'ollama.refactorSelection',
          title: 'Refactor Code (Performance & Cleanliness)',
          category: 'Ollama',
        },
        {
          command: 'ollama.generateUnitTests',
          title: 'Generate Unit Tests for Selection',
          category: 'Ollama',
        },
        {
          command: 'ollama.analyzeFile',
          title: 'Run Offline AST & Security Scan',
          category: 'Ollama',
        },
        {
          command: 'ollama.scanWorkspace',
          title: 'Scan Entire Workspace Architecture & Security',
          category: 'Ollama',
        },
        {
          command: 'ollama.openSettings',
          title: 'Configure Local Endpoints & Models',
          category: 'Ollama',
        },
        {
          command: 'ollama.refreshModels',
          title: 'Refresh Local Models List',
          category: 'Ollama',
        },
      ],
      keybindings: [
        {
          command: 'ollama.triggerCompletion',
          key: 'ctrl+alt+space',
          mac: 'cmd+alt+space',
          when: 'editorTextFocus',
        },
        {
          command: 'ollama.explainSelection',
          key: 'ctrl+shift+e',
          mac: 'cmd+shift+e',
          when: 'editorHasSelection',
        },
      ],
      configuration: {
        title: 'Ollama Code Agent',
        properties: {
          'ollama.endpoint': {
            type: 'string',
            default: 'http://127.0.0.1:11434',
            description: 'Local or LAN base URL for Ollama server.',
          },
          'ollama.chatModel': {
            type: 'string',
            default: 'qwen2.5-coder:7b',
            description: 'Model used for multi-turn assistant chat and code refactoring.',
          },
          'ollama.autocompleteModel': {
            type: 'string',
            default: 'deepseek-coder:6.7b',
            description: 'Fast model used for Fill-In-The-Middle (FIM) inline completions.',
          },
          'ollama.embeddingModel': {
            type: 'string',
            default: 'nomic-embed-text',
            description: 'Model used for offline codebase semantic indexing and symbol embeddings.',
          },
          'ollama.enableInlineCompletion': {
            type: 'boolean',
            default: true,
            description: 'Enable ghost-text inline completion as you type.',
          },
          'ollama.temperature': {
            type: 'number',
            default: 0.2,
            minimum: 0.0,
            maximum: 1.0,
            description: 'Sampling temperature (lower = more deterministic code).',
          },
        },
      },
    },
  },
  null,
  2
);

export const EXTENSION_README_MD = `# Ollama Code Agent for VS Code

Autonomous, 100% offline AI coding companion powered by local Ollama models. Zero telemetry, zero cloud data transfer, and zero subscription fees.

## Quick Installation via VSIX

### Method 1: VS Code Command Palette
1. Open Visual Studio Code.
2. Press \`Ctrl+Shift+P\` (Windows/Linux) or \`Cmd+Shift+P\` (macOS).
3. Type and select **Extensions: Install from VSIX...**
4. Select the downloaded \`ollama-code-agent-1.0.0.vsix\` file.
5. Click **Reload Now** when prompted.

### Method 2: Command Line (CLI)
\`\`\`bash
code --install-extension ollama-code-agent-1.0.0.vsix
\`\`\`

*(For VSCodium: \`codium --install-extension ollama-code-agent-1.0.0.vsix\`)*
*(For Cursor: \`cursor --install-extension ollama-code-agent-1.0.0.vsix\`)*

## Setting up Ollama Locally

1. Install Ollama from [ollama.com](https://ollama.com).
2. Pull your preferred coding models:
\`\`\`bash
# General coding & FIM
ollama pull qwen2.5-coder:7b

# Deep reasoning & refactoring
ollama pull deepseek-coder:6.7b

# Embeddings for codebase semantic search
ollama pull nomic-embed-text
\`\`\`
3. Ensure the service is running:
\`\`\`bash
ollama serve
\`\`\`

## Extension Features
- **Fill-In-The-Middle (FIM)**: Inline ghost-text autocompletion as you type.
- **Offline AST & Security Scanner**: Identifies dangerous \`eval\`, hardcoded secrets, and command injections.
- **Context-Aware Sidebar Chat**: Ask questions, refactor selections, and generate tests directly in your IDE.
- **Model Hub & VRAM Monitor**: Inspect running models and GPU memory directly in the VS Code tree view.

## License
MIT License - Air-gapped and local-first.
`;

export const EXTENSION_VSIX_MANIFEST_XML = `<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Id="ollama-code-agent" Version="1.0.0" Publisher="local-ai-tools" TargetPlatform="universal" />
    <DisplayName>Ollama Code Agent (Offline AI &amp; AST Analysis)</DisplayName>
    <Description xml:space="preserve">Autonomous offline AI coding agent powered by local Ollama models with seamless FIM inline completion and AST analysis.</Description>
    <Tags>ollama,offline,local-ai,copilot,deepseek,qwen</Tags>
    <Categories>Programming Languages,Snippets,Machine Learning</Categories>
    <GalleryFlags>Public</GalleryFlags>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="^1.85.0" />
      <Property Id="Microsoft.VisualStudio.Code.ExtensionDependencies" Value="" />
      <Property Id="Microsoft.VisualStudio.Code.ExtensionPack" Value="" />
      <Property Id="Microsoft.VisualStudio.Code.ExtensionKind" Value="workspace,web" />
      <Property Id="Microsoft.VisualStudio.Code.LocalizedLanguages" Value="" />
    </Properties>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code" />
  </Installation>
  <Dependencies />
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/README.md" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.License" Path="extension/LICENSE" Addressable="true" />
  </Assets>
</PackageManifest>`;

export const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="manifest" ContentType="application/xml" />
  <Default Extension="vsixmanifest" ContentType="application/xml" />
  <Default Extension="json" ContentType="application/json" />
  <Default Extension="js" ContentType="application/javascript" />
  <Default Extension="ts" ContentType="text/plain" />
  <Default Extension="md" ContentType="text/markdown" />
  <Default Extension="txt" ContentType="text/plain" />
  <Default Extension="xml" ContentType="application/xml" />
</Types>`;

export const EXTENSION_SOURCE_FILES: ExtensionFileItem[] = [
  {
    path: 'package.json',
    name: 'package.json',
    language: 'json',
    description: 'Extension manifest, commands, views, and configuration schema',
    content: EXTENSION_MANIFEST_JSON,
  },
  {
    path: 'dist/extension.js',
    name: 'extension.js (Compiled Bundle)',
    language: 'javascript',
    description: 'Production CommonJS bundle executed by VS Code extension host',
    content: COMPILED_EXTENSION_JS,
  },
  {
    path: 'README.md',
    name: 'README.md',
    language: 'markdown',
    description: 'Extension documentation, VSIX installation, and Ollama configuration',
    content: EXTENSION_README_MD,
  },
  {
    path: 'extension.vsixmanifest',
    name: 'extension.vsixmanifest',
    language: 'xml',
    description: 'Open Packaging Conventions (OPC) Visual Studio metadata manifest',
    content: EXTENSION_VSIX_MANIFEST_XML,
  },
  {
    path: '[Content_Types].xml',
    name: '[Content_Types].xml',
    language: 'xml',
    description: 'Open Packaging Conventions MIME types configuration',
    content: CONTENT_TYPES_XML,
  },
];

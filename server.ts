import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ollama-agent-hub', timestamp: new Date().toISOString() });
});

// Ollama Local Proxy Helper
// Allows web UI to communicate with user's local Ollama server at 127.0.0.1:11434 without CORS block
app.all('/api/ollama/proxy', async (req, res) => {
  const targetPath = (req.query.path as string) || '/api/version';
  const ollamaBase = (req.query.base as string) || 'http://127.0.0.1:11434';
  const targetUrl = `${ollamaBase.replace(/\/$/, '')}${targetPath.startsWith('/') ? '' : '/'}${targetPath}`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && Object.keys(req.body || {}).length > 0) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const contentType = response.headers.get('content-type') || '';

    res.status(response.status);

    if (contentType.includes('application/json')) {
      const data = await response.json();
      res.json(data);
    } else {
      const text = await response.text();
      res.send(text);
    }
  } catch (error: any) {
    // If Ollama is offline or unreachable on local machine, return structured info
    res.status(503).json({
      error: 'Ollama local server unreachable',
      message: error?.message || 'Could not connect to http://127.0.0.1:11434',
      code: 'ECONNREFUSED',
      hint: 'Run "ollama serve" in your local terminal or switch to Built-in Offline Simulation Engine.',
    });
  }
});

// Check Ollama connectivity
app.get('/api/ollama/check', async (req, res) => {
  const ollamaBase = (req.query.base as string) || 'http://127.0.0.1:11434';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`${ollamaBase}/api/version`, { signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      res.json({ connected: true, version: data.version, endpoint: ollamaBase });
    } else {
      res.json({ connected: false, status: response.status, endpoint: ollamaBase });
    }
  } catch (err: any) {
    res.json({ connected: false, message: err?.message, endpoint: ollamaBase });
  }
});

// Download verified .vsix package directly via HTTP
app.get('/api/download-vsix', async (req, res) => {
  try {
    const JSZip = (await import('jszip')).default;
    const fs = await import('fs');
    const zip = new JSZip();

    const typesXml = `<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="manifest" ContentType="application/xml" />
  <Default Extension="vsixmanifest" ContentType="application/xml" />
  <Default Extension="json" ContentType="application/json" />
  <Default Extension="js" ContentType="application/javascript" />
  <Default Extension="md" ContentType="text/markdown" />
  <Default Extension="txt" ContentType="text/plain" />
  <Default Extension="xml" ContentType="application/xml" />
</Types>`;

    const manifestXml = `<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Id="ollama-code-agent" Version="1.0.0" Publisher="local-ai-tools" TargetPlatform="universal" />
    <DisplayName>Ollama Code Agent (Offline AI &amp; AST Analysis)</DisplayName>
    <Description xml:space="preserve">Autonomous offline AI coding agent powered by local Ollama models. Seamless FIM inline completion, multi-turn chat, AST vulnerability scanning, and semantic code analysis without internet access.</Description>
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

    zip.file('[Content_Types].xml', typesXml);
    zip.file('extension.vsixmanifest', manifestXml);

    const ext = zip.folder('extension');
    if (ext) {
      const packageJson = fs.readFileSync(path.resolve(__dirname, 'extension-src/package.json'), 'utf8');
      const compiledJs = fs.readFileSync(path.resolve(__dirname, 'extension-src/dist/extension.js'), 'utf8');
      const readme = `# Ollama Code Agent for VS Code\nAutonomous, 100% offline AI coding companion powered by local Ollama models. Zero telemetry, zero cloud data transfer.\n\n## Installation\n\`code --install-extension ollama-code-agent-1.0.0.vsix\`\n`;

      ext.file('package.json', packageJson);
      ext.file('README.md', readme);
      ext.file('LICENSE', 'MIT License\n\nCopyright (c) 2026 Local AI Tools');
      ext.file('dist/extension.js', compiledJs);
    }

    const buffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    });

    res.setHeader('Content-Type', 'application/vsix');
    res.setHeader('Content-Disposition', 'attachment; filename="ollama-code-agent-1.0.0.vsix"');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate VSIX package', message: err.message });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
}

startServer();

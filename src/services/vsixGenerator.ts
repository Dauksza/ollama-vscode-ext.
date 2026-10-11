import JSZip from 'jszip';
import {
  CONTENT_TYPES_XML,
  EXTENSION_MANIFEST_JSON,
  EXTENSION_README_MD,
  EXTENSION_VSIX_MANIFEST_XML,
} from '../data/extensionSource';
import { COMPILED_EXTENSION_JS } from '../data/bundledExtensionCode';

export interface VsixPackageResult {
  blob: Blob;
  fileName: string;
  sizeBytes: number;
  filesCount: number;
}

export async function buildVsixPackage(): Promise<VsixPackageResult> {
  const zip = new JSZip();

  // Root Open Packaging Conventions (OPC) manifests required for VS Code
  zip.file('[Content_Types].xml', CONTENT_TYPES_XML);
  zip.file('extension.vsixmanifest', EXTENSION_VSIX_MANIFEST_XML);

  // VS Code package files MUST reside under the 'extension/' subfolder
  const extensionFolder = zip.folder('extension');
  if (extensionFolder) {
    extensionFolder.file('package.json', EXTENSION_MANIFEST_JSON);
    extensionFolder.file('README.md', EXTENSION_README_MD);
    extensionFolder.file(
      'LICENSE',
      `MIT License\n\nCopyright (c) 2026 Local AI Engineering\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files.`
    );

    // Compiled production bundle (Clean CommonJS)
    extensionFolder.file('dist/extension.js', COMPILED_EXTENSION_JS);
  }

  // Generate binary zip / vsix with DEFLATE compression
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  const fileName = 'ollama-code-agent-1.0.0.vsix';

  return {
    blob,
    fileName,
    sizeBytes: blob.size,
    filesCount: Object.keys(zip.files).length,
  };
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

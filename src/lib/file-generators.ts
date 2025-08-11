/**
 * File generators for VS Code extension structure
 * Converted to TypeScript with comprehensive type safety
 */

import { promises as fs } from 'fs';
import { join, basename } from 'path';
import {
  GenerationOptions,
  GeneratedFile,
  GenerationResults,
  VSCodeTheme,
  GenerationError,
} from '@/utils/types';

// ============================================================================
// Package Name Utilities
// ============================================================================

/**
 * Converts theme name to package-safe identifier
 */
export const toPackageName = (name: string): string => {
  return name.toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

/**
 * Creates a display name from theme name
 */
export const toDisplayName = (name: string): string => {
  return name.trim();
};

// ============================================================================
// Package.json Generation
// ============================================================================

interface PackageJsonContribution {
  themes: Array<{
    label: string;
    uiTheme: string;
    path: string;
  }>;
}

interface ExtensionPackageJson {
  name: string;
  displayName: string;
  description: string;
  version: string;
  engines: {
    vscode: string;
  };
  categories: string[];
  keywords: string[];
  contributes: PackageJsonContribution;
  publisher?: string;
  license?: string;
  author?: string;
  repository?: {
    type: string;
    url: string;
  };
  bugs?: {
    url: string;
  };
  homepage?: string;
}

/**
 * Generates package.json for the VS Code extension
 */
export const generatePackageJson = (
  themeName: string,
  options: GenerationOptions,
  themeFileName: string
): string => {
  const packageName = toPackageName(themeName);
  const displayName = toDisplayName(themeName);
  const description = options.description || 
    `**${themeName}** is a carefully crafted VS Code theme converted from a Ghostty terminal theme. ` +
    `It features thoughtful color choices and excellent readability for extended coding sessions.`;
  
  const packageJson: ExtensionPackageJson = {
    name: packageName,
    displayName: displayName,
    description: description,
    version: options.version,
    engines: {
      vscode: '^1.102.0'
    },
    categories: ['Themes'],
    keywords: ['theme', 'dark theme', 'color theme', themeName.toLowerCase()],
    contributes: {
      themes: [
        {
          label: displayName,
          uiTheme: 'vs-dark',
          path: `./themes/${basename(themeFileName)}`
        }
      ]
    }
  };
  
  if (options.publisher) {
    packageJson.publisher = options.publisher;
    packageJson.repository = {
      type: 'git',
      url: `https://github.com/${options.publisher}/${packageName}`
    };
    packageJson.bugs = {
      url: `https://github.com/${options.publisher}/${packageName}/issues`
    };
    packageJson.homepage = `https://github.com/${options.publisher}/${packageName}#readme`;
  }

  if (options.license) {
    packageJson.license = options.license;
  }

  return JSON.stringify(packageJson, null, 2);
};

// ============================================================================
// README Generation
// ============================================================================

/**
 * Generates README.md content
 */
export const generateReadme = (themeName: string, options: GenerationOptions): string => {
  const packageName = toPackageName(themeName);
  const displayName = toDisplayName(themeName);
  
  return `# ${displayName}

${options.description || `A carefully crafted VS Code theme converted from a Ghostty terminal theme.`}

## Installation

### Via VS Code Marketplace
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "${displayName}"
4. Click Install

### Via Command Line
\`\`\`bash
code --install-extension ${options.publisher ? `${options.publisher}.${packageName}` : packageName}
\`\`\`

## Usage

1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Type "Preferences: Color Theme"
3. Select "${displayName}"

## Features

- 🎨 Carefully selected colors for optimal readability
- 🌙 Dark theme optimized for low-light environments
- 💻 Converted from Ghostty terminal theme for consistency
- 🔧 Works with all popular programming languages
- ✨ Thoughtful syntax highlighting

## Screenshots

Add screenshots of your theme in action here.

## Development

This theme was generated using the [VS Code Theme Generator](https://github.com/your-repo/vscode-theme-generator).

## License

${options.license || 'MIT'}

## Contributing

Issues and pull requests are welcome! Please check the [issue tracker](${options.publisher ? `https://github.com/${options.publisher}/${packageName}/issues` : '#'}) for existing issues before creating new ones.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release notes.
`;
};

// ============================================================================
// CHANGELOG Generation
// ============================================================================

/**
 * Generates CHANGELOG.md content
 */
export const generateChangelog = (themeName: string, options: GenerationOptions): string => {
  const today = new Date().toISOString().split('T')[0];
  
  return `# Changelog

All notable changes to the "${themeName}" theme will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [${options.version}] - ${today}

### Added
- Initial release of ${themeName} theme
- Dark theme optimized for readability
- Support for all major programming languages
- Converted from Ghostty terminal theme for consistency

### Features
- Carefully selected color palette
- Optimized syntax highlighting
- Comfortable for extended coding sessions
- Consistent with terminal theme colors

---

## Release Notes

### ${options.version}
- First release of ${themeName}
- Generated from Ghostty terminal theme
- Optimized for VS Code interface
`;
};

// ============================================================================
// VS Code Configuration Generation
// ============================================================================

/**
 * Generates .vscode/launch.json for extension debugging
 */
export const generateLaunchJson = (): string => {
  return JSON.stringify({
    version: '0.2.0',
    configurations: [
      {
        name: 'Extension Development Host',
        type: 'extensionHost',
        request: 'launch',
        runtimeExecutable: '${execPath}',
        args: ['--extensionDevelopmentPath=${workspaceFolder}'],
        outFiles: ['${workspaceFolder}/out/**/*.js'],
        preLaunchTask: '${workspaceFolder}/.vscode/tasks.json'
      }
    ]
  }, null, 2);
};

// ============================================================================
// License Generation
// ============================================================================

/**
 * Generates LICENSE file content
 */
export const generateLicense = (options: GenerationOptions): string => {
  const year = new Date().getFullYear();
  const author = options.publisher || 'Theme Author';
  
  switch (options.license.toUpperCase()) {
    case 'MIT':
      return `MIT License

Copyright (c) ${year} ${author}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

    case 'ISC':
      return `ISC License

Copyright (c) ${year} ${author}

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
`;

    default:
      return `Copyright (c) ${year} ${author}

All rights reserved.
`;
  }
};

// ============================================================================
// Quickstart Guide Generation
// ============================================================================

/**
 * Generates QUICKSTART.md guide
 */
export const generateQuickstart = (themeName: string, options: GenerationOptions): string => {
  const displayName = toDisplayName(themeName);
  
  return `# ${displayName} - Quick Start Guide

Welcome to ${displayName}! This guide will help you get started with your new VS Code theme.

## 🚀 Installation

### Method 1: VS Code Marketplace (Recommended)
1. Open VS Code
2. Click on Extensions icon (or press Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "${displayName}"
4. Click "Install"

### Method 2: Manual Installation
1. Download the .vsix file from releases
2. Open VS Code
3. Go to Extensions
4. Click "..." menu → "Install from VSIX"
5. Select the downloaded file

## 🎨 Activation

1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Type "Preferences: Color Theme"
3. Select "${displayName}" from the list

## ⌨️ Keyboard Shortcut
- **Windows/Linux**: Ctrl+K Ctrl+T
- **macOS**: Cmd+K Cmd+T

## 🔧 Customization

### Override Theme Colors
Add to your VS Code settings.json:

\`\`\`json
{
  "workbench.colorCustomizations": {
    "[${displayName}]": {
      "editor.background": "#your-color-here"
    }
  }
}
\`\`\`

### Override Syntax Colors
\`\`\`json
{
  "editor.tokenColorCustomizations": {
    "[${displayName}]": {
      "comments": "#your-color-here"
    }
  }
}
\`\`\`

## 🐛 Troubleshooting

### Theme Not Appearing?
1. Restart VS Code
2. Check if the extension is enabled in Extensions tab
3. Try reloading the window (Ctrl+Shift+P → "Developer: Reload Window")

### Colors Look Wrong?
1. Ensure you're using VS Code version 1.102.0 or later
2. Check if other extensions are overriding colors
3. Reset color customizations in settings.json

## 📚 Learn More

- [VS Code Theme Documentation](https://code.visualstudio.com/api/extension-guides/color-theme)
- [Color Theme Guide](https://code.visualstudio.com/docs/getstarted/themes)

## 💡 Tips

- Use the theme with the Fira Code font for best experience
- Enable bracket pair colorization for better code structure
- Consider using the built-in terminal with matching colors

## 🤝 Support

Having issues? Found a bug? Want to suggest improvements?

- [Report Issues](${options.publisher ? `https://github.com/${options.publisher}/${toPackageName(themeName)}/issues` : '#'})
- [Contribute](${options.publisher ? `https://github.com/${options.publisher}/${toPackageName(themeName)}` : '#'})

Enjoy coding with ${displayName}! 🎉
`;
};

// ============================================================================
// File Generation Orchestration
// ============================================================================

/**
 * Generates all extension files
 */
export const generateExtensionFiles = async (
  theme: VSCodeTheme,
  options: GenerationOptions
): Promise<GenerationResults> => {
  const startTime = Date.now();
  const generatedFiles: GeneratedFile[] = [];
  
  try {
    const { outputPath, themeName } = options;
    const packageName = toPackageName(themeName);
    const themeFileName = `${packageName}-color-theme.json`;
    
    // Ensure output directory exists
    await fs.mkdir(outputPath, { recursive: true });
    await fs.mkdir(join(outputPath, 'themes'), { recursive: true });
    
    if (options.generateFullExtension) {
      await fs.mkdir(join(outputPath, '.vscode'), { recursive: true });
    }

    // Generate theme file
    const themeContent = JSON.stringify(theme, null, 2);
    const themeFilePath = join(outputPath, 'themes', themeFileName);
    await fs.writeFile(themeFilePath, themeContent);
    
    const themeFile: GeneratedFile = {
      path: themeFilePath,
      content: themeContent,
      type: 'json',
      size: Buffer.byteLength(themeContent, 'utf8'),
    };
    generatedFiles.push(themeFile);

    // Generate package.json
    const packageContent = generatePackageJson(themeName, options, themeFileName);
    const packageFilePath = join(outputPath, 'package.json');
    await fs.writeFile(packageFilePath, packageContent);
    
    const packageFile: GeneratedFile = {
      path: packageFilePath,
      content: packageContent,
      type: 'json',
      size: Buffer.byteLength(packageContent, 'utf8'),
    };
    generatedFiles.push(packageFile);

    // Generate README if requested
    if (options.generateReadme) {
      const readmeContent = generateReadme(themeName, options);
      const readmeFilePath = join(outputPath, 'README.md');
      await fs.writeFile(readmeFilePath, readmeContent);
      
      generatedFiles.push({
        path: readmeFilePath,
        content: readmeContent,
        type: 'markdown',
        size: Buffer.byteLength(readmeContent, 'utf8'),
      });
    }

    // Generate CHANGELOG if requested
    if (options.generateChangelog) {
      const changelogContent = generateChangelog(themeName, options);
      const changelogFilePath = join(outputPath, 'CHANGELOG.md');
      await fs.writeFile(changelogFilePath, changelogContent);
      
      generatedFiles.push({
        path: changelogFilePath,
        content: changelogContent,
        type: 'markdown',
        size: Buffer.byteLength(changelogContent, 'utf8'),
      });
    }

    // Generate quickstart if requested
    if (options.generateQuickstart) {
      const quickstartContent = generateQuickstart(themeName, options);
      const quickstartFilePath = join(outputPath, 'QUICKSTART.md');
      await fs.writeFile(quickstartFilePath, quickstartContent);
      
      generatedFiles.push({
        path: quickstartFilePath,
        content: quickstartContent,
        type: 'markdown',
        size: Buffer.byteLength(quickstartContent, 'utf8'),
      });
    }

    // Generate development files if full extension
    if (options.generateFullExtension) {
      // Launch configuration
      const launchContent = generateLaunchJson();
      const launchFilePath = join(outputPath, '.vscode', 'launch.json');
      await fs.writeFile(launchFilePath, launchContent);
      
      generatedFiles.push({
        path: launchFilePath,
        content: launchContent,
        type: 'json',
        size: Buffer.byteLength(launchContent, 'utf8'),
      });

      // License file
      const licenseContent = generateLicense(options);
      const licenseFilePath = join(outputPath, 'LICENSE');
      await fs.writeFile(licenseFilePath, licenseContent);
      
      generatedFiles.push({
        path: licenseFilePath,
        content: licenseContent,
        type: 'text',
        size: Buffer.byteLength(licenseContent, 'utf8'),
      });
    }

    const duration = Date.now() - startTime;
    const totalSize = generatedFiles.reduce((sum, file) => sum + file.size, 0);

    return {
      success: true,
      outputPath,
      generatedFiles,
      themeFile,
      packageFile,
      totalFiles: generatedFiles.length,
      totalSize,
      duration,
    };
  } catch (error) {
    throw new GenerationError(
      `Failed to generate extension files: ${(error as Error).message}`,
      { options, filesGenerated: generatedFiles.length }
    );
  }
};

// ============================================================================
// Export All Functions - main exports already declared above
// ============================================================================
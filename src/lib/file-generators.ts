/**
 * File generators for VS Code extension structure
 *
 * Comprehensive file generation system for creating complete VS Code extension
 * packages from theme data. Generates all necessary files including manifest,
 * documentation, configuration files, and development support files.
 *
 * Features:
 * - Complete VS Code extension structure generation
 * - Package.json with proper metadata and contributions
 * - README, CHANGELOG, and QUICKSTART documentation
 * - LICENSE file generation for multiple license types
 * - Development configuration (.vscode/launch.json)
 * - Proper file naming and sanitization
 *
 * @fileoverview VS Code extension file generation with comprehensive structure support
 * @since 1.0.0
 */

import { promises as fs } from 'fs';
import { join, basename } from 'path';
import {
  GenerationOptions,
  GeneratedFile,
  GenerationResults,
  VSCodeTheme,
  GenerationError,
  ValidationError,
} from '@/types';
import { fileUtils } from './utils-simple';

// ============================================================================
// Package Name Utilities
// ============================================================================

/**
 * Converts theme name to package-safe identifier
 *
 * Transforms a theme name into a valid npm package name by:
 * - Converting to lowercase
 * - Replacing invalid characters with hyphens
 * - Removing consecutive hyphens
 * - Trimming leading and trailing hyphens
 *
 * @param name - Original theme name
 * @returns Package-safe identifier suitable for npm/VS Code
 *
 * @example
 * ```typescript
 * toPackageName('My Awesome Theme!'); // 'my-awesome-theme'
 * toPackageName('Cool_Theme_v2'); // 'cool-theme-v2'
 * toPackageName('  Spaced Theme  '); // 'spaced-theme'
 * ```
 *
 * @since 1.0.0
 */
export const toPackageName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

/**
 * Creates a display name from theme name
 *
 * Prepares a theme name for display purposes by trimming whitespace
 * while preserving the original formatting and capitalization.
 *
 * @param name - Original theme name
 * @returns Clean display name
 *
 * @example
 * ```typescript
 * toDisplayName('  My Theme  '); // 'My Theme'
 * toDisplayName('Dark Professional'); // 'Dark Professional'
 * ```
 *
 * @since 1.0.0
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
  galleryBanner?: {
    color: string;
    theme: 'dark' | 'light';
  };
  icon?: string;
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
  badges?: Array<{
    url: string;
    href: string;
    description: string;
  }>;
  sponsor?: {
    url: string;
  };
}

/**
 * Generates package.json for the VS Code extension
 *
 * Creates a complete VS Code extension manifest with all required fields,
 * theme contributions, and optional metadata. Includes proper repository
 * links, categories, and keywords for marketplace discoverability.
 *
 * @param themeName - Name of the theme
 * @param options - Generation options with metadata
 * @param themeFileName - Generated theme file name
 * @returns Formatted package.json as string
 *
 * @example
 * ```typescript
 * const packageJson = generatePackageJson(
 *   'Dark Professional',
 *   {
 *     version: '1.0.0',
 *     publisher: 'my-company',
 *     description: 'Professional dark theme',
 *     license: 'MIT'
 *   },
 *   'dark-professional-color-theme.json'
 * );
 * ```
 *
 * @since 1.0.0
 */
export const generatePackageJson = (
  themeName: string,
  options: GenerationOptions,
  themeFileName: string,
): string => {
  const packageName = toPackageName(themeName);
  const displayName = toDisplayName(themeName);
  const description =
    options.description ||
    `**${themeName}** is a carefully crafted VS Code theme converted from a Ghostty terminal theme. ` +
      `It features thoughtful color choices and excellent readability for extended coding sessions.`;

  const packageJson: ExtensionPackageJson = {
    name: packageName,
    displayName,
    description,
    version: options.version,
    engines: {
      vscode: '^1.102.0',
    },
    categories: ['Themes'],
    keywords: ['theme', 'dark theme', 'color theme', themeName.toLowerCase()],
    galleryBanner: {
      color: options.galleryBannerColor || '#1e1e1e',
      theme: 'dark',
    },
    contributes: {
      themes: [
        {
          label: displayName,
          uiTheme: 'vs-dark',
          path: `./themes/${basename(themeFileName)}`,
        },
      ],
    },
  };

  if (options.publisher) {
    packageJson.publisher = options.publisher;
    packageJson.repository = {
      type: 'git',
      url: `https://github.com/${options.publisher}/${packageName}`,
    };
    packageJson.bugs = {
      url: `https://github.com/${options.publisher}/${packageName}/issues`,
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
 * Generates README.md content with comprehensive documentation
 *
 * Creates a professional README file with installation instructions,
 * usage guide, features list, and development information. Includes
 * proper marketplace installation commands and repository links.
 *
 * @param themeName - Name of the theme
 * @param options - Generation options with metadata
 * @returns Complete README.md content as string
 *
 * @example
 * ```typescript
 * const readme = generateReadme('Dark Professional', {
 *   description: 'Professional dark theme for coding',
 *   publisher: 'my-company',
 *   license: 'MIT'
 * });
 * ```
 *
 * @since 1.0.0
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

- Carefully selected colors for optimal readability
- Dark theme optimized for low-light environments
- Converted from Ghostty terminal theme for consistency
- Works with all popular programming languages
- Thoughtful syntax highlighting

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
 * Generates CHANGELOG.md content following Keep a Changelog format
 *
 * Creates a structured changelog following the Keep a Changelog format
 * with semantic versioning. Includes initial release entry with
 * features and version information.
 *
 * @param themeName - Name of the theme
 * @param options - Generation options with version info
 * @returns Complete CHANGELOG.md content as string
 *
 * @example
 * ```typescript
 * const changelog = generateChangelog('Dark Professional', {
 *   version: '1.0.0',
 *   description: 'Professional theme'
 * });
 * ```
 *
 * @since 1.0.0
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
 *
 * Creates VS Code launch configuration for debugging the theme extension
 * during development. Enables Extension Development Host debugging.
 *
 * @returns VS Code launch configuration as JSON string
 *
 * @example
 * ```typescript
 * const launchConfig = generateLaunchJson();
 * // Creates configuration for F5 debugging in VS Code
 * ```
 *
 * @since 1.0.0
 */
export const generateLaunchJson = (): string => {
  return JSON.stringify(
    {
      version: '0.2.0',
      configurations: [
        {
          name: 'Extension',
          type: 'extensionHost',
          request: 'launch',
          args: [
            '--extensionDevelopmentPath=${workspaceFolder}',
          ],
        },
      ],
    },
    null,
    2,
  );
};

// ============================================================================
// License Generation
// ============================================================================

/**
 * Generates LICENSE file content for multiple license types
 *
 * Creates appropriate license text based on the specified license type.
 * Supports MIT, ISC, and custom licenses with proper copyright attribution.
 *
 * @param options - Generation options with license and publisher info
 * @returns Complete license text
 *
 * @example
 * ```typescript
 * const license = generateLicense({
 *   license: 'MIT',
 *   publisher: 'my-company'
 * });
 * ```
 *
 * @since 1.0.0
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
 * Generates QUICKSTART.md guide with comprehensive user instructions
 *
 * Creates an extensive quick start guide with installation methods,
 * activation instructions, customization examples, troubleshooting,
 * and helpful tips for theme users.
 *
 * @param themeName - Name of the theme
 * @param options - Generation options with publisher info
 * @returns Complete QUICKSTART.md content as string
 *
 * @example
 * ```typescript
 * const quickstart = generateQuickstart('Dark Professional', {
 *   publisher: 'my-company'
 * });
 * ```
 *
 * @since 1.0.0
 */
export const generateQuickstart = (themeName: string, options: GenerationOptions): string => {
  const displayName = toDisplayName(themeName);

  return `# ${displayName} - Quick Start Guide

Welcome to ${displayName}! This guide will help you get started with your new VS Code theme.

## Installation

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

## Activation

1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Type "Preferences: Color Theme"
3. Select "${displayName}" from the list

## Keyboard Shortcut
- **Windows/Linux**: Ctrl+K Ctrl+T
- **macOS**: Cmd+K Cmd+T

## Customization

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

## Tips

- Use the theme with the Fira Code font for best experience
- Enable bracket pair colorization for better code structure
- Consider using the built-in terminal with matching colors

## 🤝 Support

Having issues? Found a bug? Want to suggest improvements?

- [Report Issues](${options.publisher ? `https://github.com/${options.publisher}/${toPackageName(themeName)}/issues` : '#'})
- [Contribute](${options.publisher ? `https://github.com/${options.publisher}/${toPackageName(themeName)}` : '#'})

Enjoy coding with ${displayName}!
`;
};

// ============================================================================
// Additional Extension Files
// ============================================================================

/**
 * Generates .vscodeignore file for VS Code extension packaging
 *
 * Excludes unnecessary files from the extension package when using vsce.
 * Based on VS Code extension best practices.
 *
 * @returns .vscodeignore file content
 * @since 2.0.0
 */
export const generateVSCodeIgnore = (): string => {
  return `.vscode/**
.vscode-test/**
.gitignore
vsc-extension-quickstart.md
src-theme/**
*.vsix
**/.DS_Store
node_modules/
*.log
.git/
`;
};

/**
 * Generates .gitignore file for version control
 *
 * Standard .gitignore for VS Code extension development.
 *
 * @returns .gitignore file content
 * @since 2.0.0
 */
export const generateGitIgnore = (): string => {
  return `node_modules/
*.vsix
.vscode-test/
*.log
.DS_Store
out/
dist/
`;
};

/**
 * Generates VS Code extension quickstart guide
 *
 * Replaces the custom quickstart with the standard VS Code extension
 * development guide that matches what VS Code generates.
 *
 * @param themeName - Name of the theme
 * @param options - Generation options
 * @returns VS Code extension quickstart content
 * @since 2.0.0
 */
export const generateVSCodeQuickstart = (themeName: string, _options: GenerationOptions): string => {
  const displayName = toDisplayName(themeName);

  return `# ${displayName} - Developer Guide

## Getting Started

This extension was generated from a Ghostty terminal theme file using an interactive CLI tool.

## What's in the folder

* \`package.json\` - Extension manifest defining theme location and metadata
* \`themes/\` - Contains the theme JSON file(s)
* \`.vscode/launch.json\` - Debug configuration for Extension Development Host
* \`README.md\` - User-facing documentation
* \`CHANGELOG.md\` - Version history
* This file - Developer quick start guide

## Testing the Theme

1. Press \`F5\` to open a new VS Code window with your extension loaded
2. Open the Command Palette (\`Ctrl+Shift+P\` or \`Cmd+Shift+P\` on Mac)
3. Type "Color Theme" and select \`Preferences: Color Theme\`
4. Choose "${displayName}" from the list
5. Open various file types to test syntax highlighting

## Making Changes

### Theme Colors

Edit \`themes/*.json\` to modify:
- **Workbench colors**: UI elements like sidebar, tabs, status bar
- **Token colors**: Syntax highlighting rules
- **Semantic colors**: Language-specific semantic tokens

Changes are automatically applied to the Extension Development Host window.

### Testing Token Scopes

1. Open a file with syntax highlighting
2. Use Command Palette: \`Developer: Inspect Editor Tokens and Scopes\`
3. Click on any text to see its token scope
4. Use this information to customize token colors

## Publishing

### First Time Setup

1. Install vsce: \`npm install -g vsce\`
2. Create a publisher account at [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage)
3. Get a Personal Access Token from Azure DevOps

### Publishing Steps

1. Update version in \`package.json\`
2. Update \`CHANGELOG.md\`
3. Package: \`vsce package\`
4. Publish: \`vsce publish\`

## Resources

- [VS Code Theme Documentation](https://code.visualstudio.com/api/extension-guides/color-theme)
- [Theme Color Reference](https://code.visualstudio.com/api/references/theme-color)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

## Tips

- Use the built-in theme editor: \`Developer: Generate Color Theme From Current Settings\`
- Test with different file types and languages
- Check accessibility with high contrast themes
- Validate JSON files before publishing
`;
};

/**
 * Copies the original source theme file to src-theme directory
 *
 * Preserves the original Ghostty theme file for reference and future updates.
 * Creates the src-theme directory structure.
 *
 * @param sourcePath - Path to the original Ghostty theme file
 * @param normalizedOutputPath - Extension output directory
 * @returns Promise resolving to the copied file information
 * @since 2.0.0
 */
export const copySourceTheme = async (sourcePath: string, outputPath: string): Promise<{
  path: string;
  content: string;
  size: number;
}> => {
  const { promises: fs } = await import('fs');
  const { basename, join } = await import('path');

  // Normalize output path
  const normalizedOutputPath = fileUtils.normalizePath(outputPath);

  // Create src-theme directory
  const srcThemeDir = join(normalizedOutputPath, 'src-theme');
  await fs.mkdir(srcThemeDir, { recursive: true });

  // Copy the source file
  const fileName = basename(sourcePath);
  const destPath = join(srcThemeDir, fileName);
  const content = await fs.readFile(sourcePath, 'utf8');
  await fs.writeFile(destPath, content);

  return {
    path: destPath,
    content,
    size: Buffer.byteLength(content, 'utf8'),
  };
};

// ============================================================================
// File Generation Orchestration
// ============================================================================

/**
 * Generates all extension files in a complete VS Code extension structure
 *
 * Orchestrates the generation of all files needed for a VS Code theme extension:
 * - Theme JSON file with color definitions
 * - package.json with extension manifest
 * - README.md with usage instructions (optional)
 * - CHANGELOG.md with version history (optional)
 * - QUICKSTART.md with user guide (optional)
 * - LICENSE file with legal text (optional)
 * - .vscode/launch.json for debugging (optional)
 *
 * Creates proper directory structure and tracks all generated files
 * with size and performance metrics.
 *
 * @param theme - Complete VS Code theme object
 * @param options - Generation options controlling what files to create
 * @returns Promise resolving to generation results with file list and metrics
 *
 * @throws {GenerationError} When file generation fails
 *
 * @example
 * ```typescript
 * const results = await generateExtensionFiles(theme, {
 *   themeName: 'Dark Professional',
 *   version: '1.0.0',
 *   normalizedOutputPath: './my-theme-extension',
 *   publisher: 'my-company',
 *   generateReadme: true,
 *   generateChangelog: true,
 *   generateFullExtension: true
 * });
 *
 * console.log(`Generated ${results.totalFiles} files`);
 * console.log(`Total size: ${results.totalSize} bytes`);
 * console.log(`Duration: ${results.duration}ms`);
 * ```
 *
 * @since 1.0.0
 */
export const generateExtensionFiles = async (
  theme: VSCodeTheme,
  options: GenerationOptions,
): Promise<GenerationResults> => {
  const startTime = Date.now();
  const generatedFiles: GeneratedFile[] = [];

  try {
    // Validate and normalize output path to handle tilde expansion and cross-platform paths
    if (!options.outputPath) {
      throw new ValidationError('Output path is required', 'outputPath', [
        'Provide a valid output directory path',
        'Example: ./my-theme-extension',
      ]);
    }

    // Additional input validation for outputPath
    if (typeof options.outputPath !== 'string') {
      throw new ValidationError('Output path must be a string', 'outputPath', [
        'Ensure the output path is provided as a string',
        'Example: "./my-theme-extension"',
      ]);
    }

    if (options.outputPath.trim().length === 0) {
      throw new ValidationError('Output path cannot be empty', 'outputPath', [
        'Provide a non-empty output directory path',
        'Example: ./my-theme-extension',
      ]);
    }

    const normalizedOutputPath = fileUtils.normalizePath(options.outputPath);
    if (!normalizedOutputPath) {
      throw new ValidationError('Failed to normalize output path', 'outputPath', [
        'Check that the output path format is correct',
        'Avoid invalid characters in the path',
      ]);
    }

    const { themeName } = options;
    const packageName = toPackageName(themeName);
    const themeFileName = `${packageName}-color-theme.json`;

    // Ensure output directory exists
    await fs.mkdir(normalizedOutputPath, { recursive: true });
    await fs.mkdir(join(normalizedOutputPath, 'themes'), { recursive: true });

    if (options.generateFullExtension) {
      await fs.mkdir(join(normalizedOutputPath, '.vscode'), { recursive: true });
    }

    // Generate theme file
    const themeContent = JSON.stringify(theme, null, 2);
    const themeFilePath = join(normalizedOutputPath, 'themes', themeFileName);
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
    const packageFilePath = join(normalizedOutputPath, 'package.json');
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
      const readmeFilePath = join(normalizedOutputPath, 'README.md');
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
      const changelogFilePath = join(normalizedOutputPath, 'CHANGELOG.md');
      await fs.writeFile(changelogFilePath, changelogContent);

      generatedFiles.push({
        path: changelogFilePath,
        content: changelogContent,
        type: 'markdown',
        size: Buffer.byteLength(changelogContent, 'utf8'),
      });
    }

    // Generate VS Code quickstart if requested (replaces custom quickstart)
    if (options.generateQuickstart) {
      const quickstartContent = generateVSCodeQuickstart(themeName, options);
      const quickstartFilePath = join(normalizedOutputPath, 'vsc-extension-quickstart.md');
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
      const launchFilePath = join(normalizedOutputPath, '.vscode', 'launch.json');
      await fs.writeFile(launchFilePath, launchContent);

      generatedFiles.push({
        path: launchFilePath,
        content: launchContent,
        type: 'json',
        size: Buffer.byteLength(launchContent, 'utf8'),
      });

      // License file
      const licenseContent = generateLicense(options);
      const licenseFilePath = join(normalizedOutputPath, 'LICENSE');
      await fs.writeFile(licenseFilePath, licenseContent);

      generatedFiles.push({
        path: licenseFilePath,
        content: licenseContent,
        type: 'text',
        size: Buffer.byteLength(licenseContent, 'utf8'),
      });
    }

    // Generate .vscodeignore if requested or for full extension
    if (options.generateVSCodeIgnore || options.generateFullExtension) {
      const vsCodeIgnoreContent = generateVSCodeIgnore();
      const vsCodeIgnoreFilePath = join(normalizedOutputPath, '.vscodeignore');
      await fs.writeFile(vsCodeIgnoreFilePath, vsCodeIgnoreContent);

      generatedFiles.push({
        path: vsCodeIgnoreFilePath,
        content: vsCodeIgnoreContent,
        type: 'text',
        size: Buffer.byteLength(vsCodeIgnoreContent, 'utf8'),
      });
    }

    // Generate .gitignore if requested or for full extension
    if (options.generateGitIgnore || options.generateFullExtension) {
      const gitIgnoreContent = generateGitIgnore();
      const gitIgnoreFilePath = join(normalizedOutputPath, '.gitignore');
      await fs.writeFile(gitIgnoreFilePath, gitIgnoreContent);

      generatedFiles.push({
        path: gitIgnoreFilePath,
        content: gitIgnoreContent,
        type: 'text',
        size: Buffer.byteLength(gitIgnoreContent, 'utf8'),
      });
    }

    // Copy source theme if requested and source path provided
    if (options.preserveSourceTheme && options.sourcePath) {
      try {
        const copiedTheme = await copySourceTheme(options.sourcePath, normalizedOutputPath);

        generatedFiles.push({
          path: copiedTheme.path,
          content: copiedTheme.content,
          type: 'text',
          size: copiedTheme.size,
        });
      } catch (error) {
        // Log warning but don't fail the entire generation
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Failed to copy source theme: ${(error as Error).message}`);
        }
      }
    }

    const duration = Date.now() - startTime;
    const totalSize = generatedFiles.reduce((sum, file) => sum + (file.size ?? 0), 0);

    // Log generation statistics for debugging
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(
        `Generated ${generatedFiles.length} files in ${duration}ms (${totalSize} bytes total)`,
      );
    }

    return {
      success: true,
      outputPath: normalizedOutputPath,
      files: generatedFiles,
    };
  } catch (error) {
    throw new GenerationError(
      `Failed to generate extension files: ${(error as Error).message}`,
      'generateExtensionFiles',
    );
  }
};

// ============================================================================
// Export All Functions - main exports already declared above
// ============================================================================

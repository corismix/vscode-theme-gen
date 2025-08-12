/**
 * Comprehensive tests for file-generators.ts
 * Tests VS Code extension file generation and structure creation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  toPackageName,
  toDisplayName,
  generatePackageJson,
  generateReadme,
  generateChangelog,
  generateLaunchJson,
  generateLicense,
  generateQuickstart,
  generateExtensionFiles,
} from '../../lib/file-generators';
import { VSCodeTheme, GenerationOptions } from '../../types';

// Mock fs module to prevent actual file system operations
vi.mock('fs', () => ({
  promises: {
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}));

// ============================================================================
// Test Data Setup
// ============================================================================

const mockVSCodeTheme: VSCodeTheme = {
  name: 'Test Theme',
  type: 'dark',
  colors: {
    'editor.background': '#1e1e1e',
    'editor.foreground': '#d4d4d4',
    'terminal.ansiBlack': '#000000',
    'terminal.ansiRed': '#cd3131',
    'terminal.ansiGreen': '#0dbc79',
    'terminal.ansiYellow': '#e5e510',
    'terminal.ansiBlue': '#2472c8',
    'terminal.ansiMagenta': '#bc3fbc',
    'terminal.ansiCyan': '#11a8cd',
    'terminal.ansiWhite': '#e5e5e5',
  },
  tokenColors: [
    { scope: 'comment', settings: { foreground: '#608b4e', fontStyle: 'italic' } },
    { scope: 'string', settings: { foreground: '#ce9178' } },
    { scope: 'keyword', settings: { foreground: '#569cd6' } },
  ],
};

const mockOptions: GenerationOptions = {
  themeName: 'Dark Professional Theme',
  version: '1.0.0',
  outputPath: '/test/output',
  description: 'A professional dark theme for coding',
  publisher: 'my-company',
  license: 'MIT',
  generateReadme: true,
  generateChangelog: true,
  generateQuickstart: false,
  generateFullExtension: true,
};

// Get the mock functions after dynamic import
let mockWriteFile: vi.MockedFunction<typeof import('fs/promises').writeFile>;
let mockMkdir: vi.MockedFunction<typeof import('fs/promises').mkdir>;

beforeEach(async () => {
  vi.clearAllMocks();

  // Get mocked functions
  const fs = await import('fs');
  mockWriteFile = vi.mocked(fs.promises.writeFile);
  mockMkdir = vi.mocked(fs.promises.mkdir);

  mockWriteFile.mockResolvedValue(undefined);
  mockMkdir.mockResolvedValue(undefined);
});

// ============================================================================
// Package Name Utilities Tests
// ============================================================================

describe('toPackageName', () => {
  it('converts theme names to valid package names', () => {
    expect(toPackageName('My Awesome Theme!')).toBe('my-awesome-theme');
    expect(toPackageName('Cool_Theme_v2')).toBe('cool-theme-v2');
    expect(toPackageName('  Spaced Theme  ')).toBe('spaced-theme');
    expect(toPackageName('Theme@#$%^&*()With Special')).toBe('theme-with-special');
    expect(toPackageName('multiple---dashes')).toBe('multiple-dashes');
    expect(toPackageName('---leading-trailing---')).toBe('leading-trailing');
  });

  it('handles edge cases', () => {
    expect(toPackageName('')).toBe('');
    expect(toPackageName('123')).toBe('123');
    expect(toPackageName('a')).toBe('a');
    expect(toPackageName('theme-with-numbers-123')).toBe('theme-with-numbers-123');
  });
});

describe('toDisplayName', () => {
  it('preserves original formatting and trims whitespace', () => {
    expect(toDisplayName('  My Theme  ')).toBe('My Theme');
    expect(toDisplayName('Dark Professional')).toBe('Dark Professional');
    expect(toDisplayName('Theme With CAPS')).toBe('Theme With CAPS');
  });

  it('handles empty strings', () => {
    expect(toDisplayName('')).toBe('');
    expect(toDisplayName('   ')).toBe('');
  });
});

// ============================================================================
// Package.json Generation Tests
// ============================================================================

describe('generatePackageJson', () => {
  it('generates valid package.json with all required fields', () => {
    const result = generatePackageJson('Dark Professional', mockOptions, 'theme.json');
    const packageJson = JSON.parse(result);

    expect(packageJson.name).toBe('dark-professional');
    expect(packageJson.displayName).toBe('Dark Professional');
    expect(packageJson.description).toBe(mockOptions.description);
    expect(packageJson.version).toBe('1.0.0');
    expect(packageJson.engines.vscode).toBe('^1.102.0');
    expect(packageJson.categories).toEqual(['Themes']);
    expect(packageJson.publisher).toBe('my-company');
    expect(packageJson.license).toBe('MIT');
  });

  it('includes theme contribution correctly', () => {
    const result = generatePackageJson('Test Theme', mockOptions, 'test-theme.json');
    const packageJson = JSON.parse(result);

    expect(packageJson.contributes).toBeDefined();
    expect(packageJson.contributes.themes).toHaveLength(1);

    const theme = packageJson.contributes.themes[0];
    expect(theme.label).toBe('Test Theme');
    expect(theme.uiTheme).toBe('vs-dark');
    expect(theme.path).toBe('./themes/test-theme.json');
  });

  it('generates repository links when publisher is provided', () => {
    const result = generatePackageJson('My Theme', mockOptions, 'theme.json');
    const packageJson = JSON.parse(result);

    expect(packageJson.repository).toBeDefined();
    expect(packageJson.repository.type).toBe('git');
    expect(packageJson.repository.url).toBe('https://github.com/my-company/my-theme');
    expect(packageJson.bugs.url).toBe('https://github.com/my-company/my-theme/issues');
    expect(packageJson.homepage).toBe('https://github.com/my-company/my-theme#readme');
  });

  it('generates default description when none provided', () => {
    const optionsWithoutDescription = { ...mockOptions, description: undefined };
    const result = generatePackageJson('Test Theme', optionsWithoutDescription, 'theme.json');
    const packageJson = JSON.parse(result);

    expect(packageJson.description).toContain('Test Theme');
    expect(packageJson.description).toContain('carefully crafted');
    expect(packageJson.description).toContain('Ghostty terminal theme');
  });

  it('includes appropriate keywords', () => {
    const result = generatePackageJson('Dark Professional', mockOptions, 'theme.json');
    const packageJson = JSON.parse(result);

    expect(packageJson.keywords).toContain('theme');
    expect(packageJson.keywords).toContain('dark theme');
    expect(packageJson.keywords).toContain('color theme');
    expect(packageJson.keywords).toContain('dark professional');
  });
});

// ============================================================================
// README Generation Tests
// ============================================================================

describe('generateReadme', () => {
  it('generates comprehensive README content', () => {
    const result = generateReadme('Dark Professional', mockOptions);

    expect(result).toContain('# Dark Professional');
    expect(result).toContain(mockOptions.description);
    expect(result).toContain('## Installation');
    expect(result).toContain('## Usage');
    expect(result).toContain('## Features');
    expect(result).toContain('## Development');
    expect(result).toContain('## License');
  });

  it('includes marketplace installation instructions', () => {
    const result = generateReadme('Test Theme', mockOptions);

    expect(result).toContain('code --install-extension my-company.test-theme');
    expect(result).toContain('Search for "Test Theme"');
  });

  it('includes proper command palette instructions', () => {
    const result = generateReadme('My Theme', mockOptions);

    expect(result).toContain('Preferences: Color Theme');
    expect(result).toContain('Select "My Theme"');
  });

  it('includes repository links when publisher is provided', () => {
    const result = generateReadme('Theme Name', mockOptions);

    expect(result).toContain('https://github.com/my-company/theme-name/issues');
  });

  it('handles missing description gracefully', () => {
    const optionsWithoutDesc = { ...mockOptions, description: undefined };
    const result = generateReadme('Test Theme', optionsWithoutDesc);

    expect(result).toContain('carefully crafted VS Code theme');
    expect(result).toContain('Ghostty terminal theme');
  });
});

// ============================================================================
// CHANGELOG Generation Tests
// ============================================================================

describe('generateChangelog', () => {
  it('generates properly formatted changelog', () => {
    const result = generateChangelog('Test Theme', mockOptions);

    expect(result).toContain('# Changelog');
    expect(result).toContain('Keep a Changelog');
    expect(result).toContain('Semantic Versioning');
    expect(result).toContain(`## [${mockOptions.version}]`);
  });

  it("includes today's date", () => {
    const result = generateChangelog('Test Theme', mockOptions);
    const today = new Date().toISOString().split('T')[0];

    expect(result).toContain(today);
  });

  it('includes version-specific sections', () => {
    const result = generateChangelog('Test Theme', mockOptions);

    expect(result).toContain('### Added');
    expect(result).toContain('### Features');
    expect(result).toContain('Initial release of Test Theme');
    expect(result).toContain('Converted from Ghostty terminal theme');
  });

  it('includes release notes section', () => {
    const result = generateChangelog('Test Theme', mockOptions);

    expect(result).toContain('## Release Notes');
    expect(result).toContain(`### ${mockOptions.version}`);
  });
});

// ============================================================================
// Launch Configuration Tests
// ============================================================================

describe('generateLaunchJson', () => {
  it('generates valid VS Code launch configuration', () => {
    const result = generateLaunchJson();
    const launchConfig = JSON.parse(result);

    expect(launchConfig.version).toBe('0.2.0');
    expect(launchConfig.configurations).toHaveLength(1);

    const config = launchConfig.configurations[0];
    expect(config.name).toBe('Extension Development Host');
    expect(config.type).toBe('extensionHost');
    expect(config.request).toBe('launch');
    expect(config.runtimeExecutable).toBe('${execPath}');
  });

  it('includes proper workspace folder references', () => {
    const result = generateLaunchJson();
    const launchConfig = JSON.parse(result);
    const config = launchConfig.configurations[0];

    expect(config.args).toContain('--extensionDevelopmentPath=${workspaceFolder}');
    expect(config.outFiles).toContain('${workspaceFolder}/out/**/*.js');
  });
});

// ============================================================================
// License Generation Tests
// ============================================================================

describe('generateLicense', () => {
  it('generates MIT license correctly', () => {
    const options = { ...mockOptions, license: 'MIT' };
    const result = generateLicense(options);
    const currentYear = new Date().getFullYear();

    expect(result).toContain('MIT License');
    expect(result).toContain(`Copyright (c) ${currentYear} my-company`);
    expect(result).toContain('Permission is hereby granted');
    expect(result).toContain('THE SOFTWARE IS PROVIDED "AS IS"');
  });

  it('generates ISC license correctly', () => {
    const options = { ...mockOptions, license: 'ISC' };
    const result = generateLicense(options);
    const currentYear = new Date().getFullYear();

    expect(result).toContain('ISC License');
    expect(result).toContain(`Copyright (c) ${currentYear} my-company`);
    expect(result).toContain('Permission to use, copy, modify');
  });

  it('generates generic copyright for unknown licenses', () => {
    const options = { ...mockOptions, license: 'Custom' };
    const result = generateLicense(options);
    const currentYear = new Date().getFullYear();

    expect(result).toContain(`Copyright (c) ${currentYear} my-company`);
    expect(result).toContain('All rights reserved');
  });

  it('uses fallback author when no publisher provided', () => {
    const options = { ...mockOptions, publisher: undefined };
    const result = generateLicense(options);

    expect(result).toContain('Theme Author');
  });
});

// ============================================================================
// Quickstart Generation Tests
// ============================================================================

describe('generateQuickstart', () => {
  it('generates comprehensive quickstart guide', () => {
    const result = generateQuickstart('Test Theme', mockOptions);

    expect(result).toContain('# Test Theme - Quick Start Guide');
    expect(result).toContain('## 🚀 Installation');
    expect(result).toContain('## 🎨 Activation');
    expect(result).toContain('## 🔧 Customization');
    expect(result).toContain('## 🐛 Troubleshooting');
  });

  it('includes installation methods', () => {
    const result = generateQuickstart('Test Theme', mockOptions);

    expect(result).toContain('Method 1: VS Code Marketplace');
    expect(result).toContain('Method 2: Manual Installation');
    expect(result).toContain('Install from VSIX');
  });

  it('includes keyboard shortcuts', () => {
    const result = generateQuickstart('Test Theme', mockOptions);

    expect(result).toContain('Ctrl+K Ctrl+T');
    expect(result).toContain('Cmd+K Cmd+T');
  });

  it('includes customization examples', () => {
    const result = generateQuickstart('Test Theme', mockOptions);

    expect(result).toContain('workbench.colorCustomizations');
    expect(result).toContain('editor.tokenColorCustomizations');
    expect(result).toContain('[Test Theme]');
  });

  it('includes troubleshooting section', () => {
    const result = generateQuickstart('Test Theme', mockOptions);

    expect(result).toContain('Theme Not Appearing?');
    expect(result).toContain('Colors Look Wrong?');
    expect(result).toContain('Reload Window');
  });

  it('includes repository links when publisher provided', () => {
    const result = generateQuickstart('Test Theme', mockOptions);

    expect(result).toContain('https://github.com/my-company/test-theme/issues');
    expect(result).toContain('Report Issues');
  });
});

// ============================================================================
// Full Extension Generation Tests
// ============================================================================

describe('generateExtensionFiles', () => {
  it('generates complete extension structure', async () => {
    const result = await generateExtensionFiles(mockVSCodeTheme, mockOptions);

    expect(result.success).toBe(true);
    expect(result.outputPath).toBe('/test/output');
    expect(result.files).toBeDefined();
    expect(result.files.length).toBeGreaterThan(0);

    // Verify directories are created
    expect(mockMkdir).toHaveBeenCalledWith('/test/output', { recursive: true });
    expect(mockMkdir).toHaveBeenCalledWith('/test/output/themes', { recursive: true });
    expect(mockMkdir).toHaveBeenCalledWith('/test/output/.vscode', { recursive: true });
  });

  it('generates all required files', async () => {
    const result = await generateExtensionFiles(mockVSCodeTheme, mockOptions);

    const filePaths = result.files.map(f => f.path);

    // Check required files
    expect(filePaths.some(p => p.includes('package.json'))).toBe(true);
    expect(filePaths.some(p => p.includes('themes/') && p.endsWith('.json'))).toBe(true);
    expect(filePaths.some(p => p.includes('README.md'))).toBe(true);
    expect(filePaths.some(p => p.includes('CHANGELOG.md'))).toBe(true);
    expect(filePaths.some(p => p.includes('LICENSE'))).toBe(true);
    expect(filePaths.some(p => p.includes('launch.json'))).toBe(true);
  });

  it('respects file generation options', async () => {
    const customOptions = {
      ...mockOptions,
      generateReadme: false,
      generateChangelog: false,
      generateQuickstart: true,
      generateFullExtension: false,
    };

    const result = await generateExtensionFiles(mockVSCodeTheme, customOptions);
    const filePaths = result.files.map(f => f.path);

    // Should not generate README or CHANGELOG
    expect(filePaths.some(p => p.includes('README.md'))).toBe(false);
    expect(filePaths.some(p => p.includes('CHANGELOG.md'))).toBe(false);

    // Should generate quickstart
    expect(filePaths.some(p => p.includes('QUICKSTART.md'))).toBe(true);

    // Should not generate development files
    expect(filePaths.some(p => p.includes('launch.json'))).toBe(false);
    expect(filePaths.some(p => p.includes('LICENSE'))).toBe(false);
  });

  it('tracks file metadata correctly', async () => {
    const result = await generateExtensionFiles(mockVSCodeTheme, mockOptions);

    result.files.forEach(file => {
      expect(file.path).toBeDefined();
      expect(file.content).toBeDefined();
      expect(file.type).toBeDefined();
      expect(file.size).toBeGreaterThan(0);
      expect(['json', 'markdown', 'text'].includes(file.type)).toBe(true);
    });
  });

  it('writes theme file with correct structure', async () => {
    await generateExtensionFiles(mockVSCodeTheme, mockOptions);

    // Find the theme file write call
    const themeFileCall = mockWriteFile.mock.calls.find(
      call => call[0].includes('themes/') && call[0].endsWith('.json'),
    );

    expect(themeFileCall).toBeDefined();

    const themeContent = JSON.parse(themeFileCall[1]);
    expect(themeContent.name).toBe('Test Theme');
    expect(themeContent.type).toBe('dark');
    expect(themeContent.colors).toBeDefined();
    expect(themeContent.tokenColors).toBeDefined();
  });

  it('handles write errors gracefully', async () => {
    mockWriteFile.mockRejectedValueOnce(new Error('Write failed'));

    await expect(generateExtensionFiles(mockVSCodeTheme, mockOptions)).rejects.toThrow(
      'Failed to generate extension files',
    );
  });

  it('handles directory creation errors gracefully', async () => {
    mockMkdir.mockRejectedValueOnce(new Error('Mkdir failed'));

    await expect(generateExtensionFiles(mockVSCodeTheme, mockOptions)).rejects.toThrow(
      'Failed to generate extension files',
    );
  });

  it('generates correct package-safe theme file name', async () => {
    const customOptions = {
      ...mockOptions,
      themeName: 'My Awesome Theme!',
    };

    await generateExtensionFiles(mockVSCodeTheme, customOptions);

    const themeFileCall = mockWriteFile.mock.calls.find(
      call => call[0].includes('themes/') && call[0].endsWith('.json'),
    );

    expect(themeFileCall[0]).toContain('my-awesome-theme-color-theme.json');
  });
});

/**
 * Test setup and global mocks for VS Code Theme Generator
 * Provides essential mocks for file system operations and utilities
 */

import { vi, beforeAll, afterAll, afterEach, expect } from 'vitest';

// ============================================================================
// Global Test Setup
// ============================================================================

// Note: Test timeout is configured in vitest.config.ts instead of here
// vi.setConfig is not available in Bun's vitest environment

// ============================================================================
// File System Mocks
// ============================================================================

// Mock fs/promises to prevent actual file system operations during tests
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  stat: vi.fn(),
}));

// Mock fs for sync operations
vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

// Mock path utilities (usually don't need mocking, but ensure consistency)
vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    // Keep actual path utilities but allow for specific overrides if needed
  };
});

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Creates a mock file system structure for testing
 */
export const createMockFileSystem = () => {
  const files = new Map<string, string>();

  return {
    addFile: (path: string, content: string) => {
      files.set(path, content);
    },

    getFile: (path: string): string | undefined => {
      return files.get(path);
    },

    hasFile: (path: string): boolean => {
      return files.has(path);
    },

    clear: () => {
      files.clear();
    },

    getAllFiles: () => files,
  };
};

/**
 * Sample Ghostty theme content for testing
 */
export const SAMPLE_GHOSTTY_THEME = `# Dark theme
background = #1e1e1e
foreground = #d4d4d4
cursor = #ffffff

# Colors
palette = 0=#000000
palette = 1=#cd3131
palette = 2=#0dbc79
palette = 3=#e5e510
palette = 4=#2472c8
palette = 5=#bc3fbc
palette = 6=#11a8cd
palette = 7=#e5e5e5
palette = 8=#666666
palette = 9=#f14c4c
palette = 10=#23d18b
palette = 11=#f5f543
palette = 12=#3b8eea
palette = 13=#d670d6
palette = 14=#29b8db
palette = 15=#ffffff`;

/**
 * Invalid Ghostty theme for error testing
 */
export const INVALID_GHOSTTY_THEME = `# Invalid theme
background = invalid-color
palette = not-a-number=#ffffff
this-is-not-valid-format`;

/**
 * Minimal valid Ghostty theme
 */
export const MINIMAL_GHOSTTY_THEME = `background = #000000
foreground = #ffffff`;

// ============================================================================
// Mock Data Helpers
// ============================================================================

/**
 * Creates mock file stats for fs.stat operations
 */
export const createMockStats = (overrides: Partial<{ size: number; mtime: Date }> = {}) => ({
  size: overrides.size ?? 1024,
  mtime: overrides.mtime ?? new Date('2024-01-01'),
  isFile: () => true,
  isDirectory: () => false,
});

/**
 * Expected VS Code theme structure for validation
 */
export const EXPECTED_VSCODE_THEME_KEYS = ['name', 'type', 'colors', 'tokenColors'] as const;

/**
 * Expected VS Code color keys that should be present
 */
export const EXPECTED_COLOR_KEYS = [
  'editor.background',
  'editor.foreground',
  'terminal.ansiBlack',
  'terminal.ansiRed',
  'terminal.ansiGreen',
  'terminal.ansiYellow',
  'terminal.ansiBlue',
  'terminal.ansiMagenta',
  'terminal.ansiCyan',
  'terminal.ansiWhite',
] as const;

// ============================================================================
// Test Assertions Helpers
// ============================================================================

/**
 * Validates that a VS Code theme has the correct structure
 */
export const validateVSCodeTheme = (theme: unknown): void => {
  expect(theme).toBeDefined();
  expect(typeof theme).toBe('object');

  // Check required top-level properties
  for (const key of EXPECTED_VSCODE_THEME_KEYS) {
    expect(theme).toHaveProperty(key);
  }

  // Validate theme metadata
  expect(typeof theme.name).toBe('string');
  expect(theme.name.length).toBeGreaterThan(0);
  expect(theme.type).toBe('dark');

  // Validate colors object
  expect(typeof theme.colors).toBe('object');
  expect(theme.colors).not.toBeNull();

  // Check essential color keys are present
  for (const colorKey of EXPECTED_COLOR_KEYS) {
    expect(theme.colors).toHaveProperty(colorKey);
    expect(typeof theme.colors[colorKey]).toBe('string');
    expect(theme.colors[colorKey]).toMatch(/^#[0-9a-fA-F]/);
  }

  // Validate tokenColors array
  expect(Array.isArray(theme.tokenColors)).toBe(true);
  expect(theme.tokenColors.length).toBeGreaterThan(0);

  // Validate tokenColor structure
  theme.tokenColors.forEach((tokenColor: unknown, _index: number) => {
    expect(tokenColor).toHaveProperty('scope');
    expect(tokenColor).toHaveProperty('settings');
    expect(typeof tokenColor.scope).toBe('string');
    expect(typeof tokenColor.settings).toBe('object');
    // Token colors should have either foreground or fontStyle (or both)
    expect(tokenColor.settings.foreground || tokenColor.settings.fontStyle).toBeDefined();
  });
};

/**
 * Validates hex color format
 */
export const validateHexColor = (color: string): void => {
  expect(color).toMatch(/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/);
};

// ============================================================================
// Console Mocking
// ============================================================================

// Store original console methods
const originalConsole = {
  // eslint-disable-next-line no-console
  log: console.log,
  warn: console.warn,
  error: console.error,
};

// Mock console methods to reduce noise during tests
export const mockConsole = () => {
  // eslint-disable-next-line no-console
  console.log = vi.fn();
  console.warn = vi.fn();
  console.error = vi.fn();
};

export const restoreConsole = () => {
  // eslint-disable-next-line no-console
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
};

// ============================================================================
// Setup and Cleanup
// ============================================================================

// Global setup - runs before all tests
beforeAll(() => {
  mockConsole();
});

// Global cleanup - runs after all tests
afterAll(() => {
  restoreConsole();
});

// Clean up between tests
afterEach(() => {
  vi.clearAllMocks();
});

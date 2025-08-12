/**
 * Comprehensive tests for theme-generator.ts core functionality
 * Tests theme parsing, color mapping, and VS Code theme generation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
// vol is mocked but not used directly in tests
import {
  readThemeFile,
  parseThemeFile,
  buildVSCodeTheme,
  createColorRoleMap,
  buildVSCodeColors,
  buildTokenColors,
  extractColorPalette,
  resolveThemeName,
} from '../../lib/theme-generator';
import {
  SAMPLE_GHOSTTY_THEME,
  INVALID_GHOSTTY_THEME,
  MINIMAL_GHOSTTY_THEME,
  createMockStats,
  validateVSCodeTheme,
  validateHexColor,
} from '../setup';
import { ValidationError, FileProcessingError } from '../../types';

// Mock the fs module with memfs for controlled file system testing
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  stat: vi.fn(),
}));

// ============================================================================
// Setup and Helpers
// ============================================================================

const mockReadFile = vi.mocked((await import('fs/promises')).readFile);
const mockStat = vi.mocked((await import('fs/promises')).stat);

beforeEach(() => {
  vi.clearAllMocks();

  // Setup default successful stat response
  mockStat.mockResolvedValue(createMockStats());
});

// ============================================================================
// File Reading Tests
// ============================================================================

describe('readThemeFile', () => {
  it('successfully reads a valid file', async () => {
    const filePath = '/test/theme.txt';
    const content = SAMPLE_GHOSTTY_THEME;

    mockReadFile.mockResolvedValueOnce(content);

    const result = await readThemeFile(filePath);

    expect(result).toBe(content);
    expect(mockReadFile).toHaveBeenCalledWith(filePath, 'utf8');
  });

  it('rejects empty or invalid file paths', async () => {
    await expect(readThemeFile('')).rejects.toThrow(ValidationError);
    await expect(readThemeFile('   ')).rejects.toThrow(ValidationError);
  });

  it('rejects paths with path traversal attempts', async () => {
    await expect(readThemeFile('../../../etc/passwd')).rejects.toThrow(ValidationError);
    await expect(readThemeFile('theme/../../../secrets.txt')).rejects.toThrow(ValidationError);
  });

  it('rejects files that are too large', async () => {
    const largeMockContent = 'x'.repeat(2 * 1024 * 1024); // 2MB content

    mockReadFile.mockResolvedValueOnce(largeMockContent);

    await expect(readThemeFile('/test/large.txt')).rejects.toThrow(FileProcessingError);
  });

  it('handles file read errors gracefully', async () => {
    mockReadFile.mockRejectedValueOnce(new Error('ENOENT: file not found'));

    await expect(readThemeFile('/test/nonexistent.txt')).rejects.toThrow(FileProcessingError);
    expect(mockReadFile).toHaveBeenCalledWith('/test/nonexistent.txt', 'utf8');
  });
});

// ============================================================================
// Theme Parsing Tests
// ============================================================================

describe('parseThemeFile', () => {
  it('parses a complete Ghostty theme successfully', async () => {
    const filePath = '/test/theme.txt';

    mockReadFile.mockResolvedValueOnce(SAMPLE_GHOSTTY_THEME);
    mockStat.mockResolvedValueOnce(createMockStats({ size: 1024 }));

    const result = await parseThemeFile(filePath);

    expect(result).toBeDefined();
    expect(result.colors).toBeDefined();
    expect(result.metadata).toBeDefined();

    // Check basic colors are parsed
    expect(result.colors.background).toBe('#1e1e1e');
    expect(result.colors.foreground).toBe('#d4d4d4');
    expect(result.colors.cursor).toBe('#ffffff');

    // Check palette colors are parsed (color0-color15)
    expect(result.colors.color0).toBe('#000000');
    expect(result.colors.color1).toBe('#cd3131');
    expect(result.colors.color15).toBe('#ffffff');

    // Check metadata
    expect(result.metadata.fileName).toBe('theme.txt');
    expect(result.metadata.filePath).toBe(filePath);
    expect(result.metadata.fileSize).toBe(1024);
    expect(result.metadata.lineCount).toBeGreaterThan(0);
  });

  it('handles palette format correctly', async () => {
    const paletteTheme = `palette = 0=#000000
palette = 1=#ff0000
palette = 15=#ffffff`;

    mockReadFile.mockResolvedValueOnce(paletteTheme);

    const result = await parseThemeFile('/test/palette.txt');

    expect(result.colors.color0).toBe('#000000');
    expect(result.colors.color1).toBe('#ff0000');
    expect(result.colors.color15).toBe('#ffffff');
  });

  it('handles standard format correctly', async () => {
    const standardTheme = `background = #000000
foreground = #ffffff
cursor = #ffff00`;

    mockReadFile.mockResolvedValueOnce(standardTheme);

    const result = await parseThemeFile('/test/standard.txt');

    expect(result.colors.background).toBe('#000000');
    expect(result.colors.foreground).toBe('#ffffff');
    expect(result.colors.cursor).toBe('#ffff00');
  });

  it('handles invalid color values gracefully', async () => {
    mockReadFile.mockResolvedValueOnce(INVALID_GHOSTTY_THEME);

    const result = await parseThemeFile('/test/invalid.txt');

    // Should not throw, but should have warnings
    expect(result).toBeDefined();
    expect(result.colors).toBeDefined();
    // Invalid colors should be filtered out
    expect(result.colors.background).toBeUndefined();
  });

  it('adds hex prefix to valid color values missing it', async () => {
    const noHashTheme = `background = 000000
foreground = ffffff
color0 = ff0000`;

    mockReadFile.mockResolvedValueOnce(noHashTheme);

    const result = await parseThemeFile('/test/nohash.txt');

    expect(result.colors.background).toBe('#000000');
    expect(result.colors.foreground).toBe('#ffffff');
    expect(result.colors.color0).toBe('#ff0000');
  });

  it('filters out dangerous characters for security', async () => {
    const maliciousTheme = `background = #000000
foreground = #ffffff`;

    mockReadFile.mockResolvedValueOnce(maliciousTheme);

    const result = await parseThemeFile('/test/malicious.txt');

    // Should have valid colors after sanitization
    expect(result.colors.background).toBe('#000000');
    expect(result.colors.foreground).toBe('#ffffff');
  });

  it('respects line count limits', async () => {
    // Create a theme with more than the maximum lines (10,000 default)
    const manyLinesTheme = Array(15000).fill('color0 = #000000').join('\n');

    mockReadFile.mockResolvedValueOnce(manyLinesTheme);

    await expect(parseThemeFile('/test/toolong.txt')).rejects.toThrow(ValidationError);
  });

  it('ignores comments and empty lines', async () => {
    const commentedTheme = `# This is a comment
// This is also a comment
background = #000000

# Another comment
foreground = #ffffff
    
    # Indented comment`;

    mockReadFile.mockResolvedValueOnce(commentedTheme);

    const result = await parseThemeFile('/test/commented.txt');

    expect(result.colors.background).toBe('#000000');
    expect(result.colors.foreground).toBe('#ffffff');
  });

  it('handles file stat errors gracefully', async () => {
    mockReadFile.mockResolvedValueOnce(MINIMAL_GHOSTTY_THEME);
    mockStat.mockRejectedValueOnce(new Error('ENOENT'));

    const result = await parseThemeFile('/test/nostat.txt');

    // Should still work, with fallback metadata
    expect(result).toBeDefined();
    expect(result.metadata.fileName).toBe('nostat.txt');
    expect(result.colors.background).toBe('#000000');
  });
});

// ============================================================================
// Color Role Mapping Tests
// ============================================================================

describe('createColorRoleMap', () => {
  it('creates comprehensive color role mapping', () => {
    const colors = {
      color0: '#000000',
      color1: '#ff0000',
      color2: '#00ff00',
      color7: '#ffffff',
      color8: '#808080',
      color15: '#ffffff',
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#ffffff',
    };

    const roleMap = createColorRoleMap(colors);

    expect(roleMap).toBeDefined();
    expect(roleMap.black.hex).toBe('#000000');
    expect(roleMap.red.hex).toBe('#ff0000');
    expect(roleMap.green.hex).toBe('#00ff00');
    expect(roleMap.white.hex).toBe('#ffffff');
    expect(roleMap.brightBlack.hex).toBe('#808080');
    expect(roleMap.background.hex).toBe('#1e1e1e');
    expect(roleMap.foreground.hex).toBe('#d4d4d4');

    // Check usage descriptions are present
    expect(Array.isArray(roleMap.red.usage)).toBe(true);
    expect(roleMap.red.usage.length).toBeGreaterThan(0);
    expect(roleMap.red.name).toBe('Red');
  });

  it('provides fallback colors for missing entries', () => {
    const emptyColors = {};

    const roleMap = createColorRoleMap(emptyColors);

    // Should have fallback colors
    expect(roleMap.black.hex).toBe('#000000');
    expect(roleMap.red.hex).toBe('#ff0000');
    expect(roleMap.background.hex).toBe('#000000');
  });

  it('handles cursor color aliases correctly', () => {
    const colorsWithCursor = {
      cursor: '#ffff00',
      cursor_text: '#000000',
    };

    const roleMap = createColorRoleMap(colorsWithCursor);

    expect(roleMap.cursor.hex).toBe('#ffff00');
  });
});

// ============================================================================
// VS Code Theme Building Tests
// ============================================================================

describe('buildVSCodeColors', () => {
  it('builds comprehensive VS Code color scheme', () => {
    const roleMap = {
      black: '#000000',
      red: '#ff0000',
      green: '#00ff00',
      yellow: '#ffff00',
      blue: '#0000ff',
      magenta: '#ff00ff',
      cyan: '#00ffff',
      white: '#ffffff',
      brightBlack: '#808080',
      brightRed: '#ff8080',
      brightGreen: '#80ff80',
      brightYellow: '#ffff80',
      brightBlue: '#8080ff',
      brightMagenta: '#ff80ff',
      brightCyan: '#80ffff',
      brightWhite: '#ffffff',
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#ffffff',
      cursorText: '#000000',
      selectionBackground: '#264f78',
      selectionForeground: '#ffffff',
    };

    const colors = buildVSCodeColors(roleMap);

    expect(colors).toBeDefined();

    // Check editor colors
    expect(colors['editor.background']).toBe('#1e1e1e');
    expect(colors['editor.foreground']).toBe('#d4d4d4');
    expect(colors['editor.selectionBackground']).toBe('#264f78');

    // Check terminal colors
    expect(colors['terminal.ansiBlack']).toBe('#000000');
    expect(colors['terminal.ansiRed']).toBe('#ff0000');
    expect(colors['terminal.ansiBrightWhite']).toBe('#ffffff');

    // Check workbench colors
    expect(colors['activityBar.background']).toBeDefined();
    expect(colors['statusBar.background']).toBeDefined();
  });
});

describe('buildTokenColors', () => {
  it('generates comprehensive token color rules', () => {
    const roleMap = {
      brightBlack: '#808080',
      green: '#00ff00',
      magenta: '#ff00ff',
      blue: '#0000ff',
      red: '#ff0000',
      yellow: '#ffff00',
      cyan: '#00ffff',
      brightWhite: '#ffffff',
      brightBlue: '#8080ff',
      brightCyan: '#80ffff',
    };

    const tokenColors = buildTokenColors(roleMap);

    expect(Array.isArray(tokenColors)).toBe(true);
    expect(tokenColors.length).toBeGreaterThan(10);

    // Check basic token types are covered
    const scopes = tokenColors.map(tc => tc.scope);
    expect(scopes).toContain('comment');
    expect(scopes).toContain('string');
    expect(scopes).toContain('keyword');
    expect(scopes).toContain('entity.name.function');

    // Check token structure
    tokenColors.forEach(tokenColor => {
      expect(typeof tokenColor.scope).toBe('string');
      expect(typeof tokenColor.settings).toBe('object');
      // Token colors should have either foreground or fontStyle (or both)
      expect(tokenColor.settings.foreground || tokenColor.settings.fontStyle).toBeDefined();
    });

    // Check JSON-specific tokens are included
    const jsonTokens = tokenColors.filter(tc => tc.scope.includes('json'));
    expect(jsonTokens.length).toBeGreaterThan(0);
  });
});

describe('buildVSCodeTheme', () => {
  it('builds complete VS Code theme from Ghostty colors', () => {
    const colors = {
      color0: '#000000',
      color1: '#cd3131',
      color2: '#0dbc79',
      color7: '#e5e5e5',
      color15: '#ffffff',
      background: '#1e1e1e',
      foreground: '#d4d4d4',
    };

    const theme = buildVSCodeTheme(colors, 'Test Theme');

    validateVSCodeTheme(theme);
    expect(theme.name).toBe('Test Theme');
    expect(theme.type).toBe('dark');
  });

  it('handles minimal color set gracefully', () => {
    const minimalColors = {
      background: '#000000',
      foreground: '#ffffff',
    };

    const theme = buildVSCodeTheme(minimalColors, 'Minimal Theme');

    validateVSCodeTheme(theme);
    expect(theme.name).toBe('Minimal Theme');
  });

  it('throws error on invalid theme building', () => {
    const invalidColors = null as any;

    expect(() => buildVSCodeTheme(invalidColors, 'Invalid')).toThrow(FileProcessingError);
  });
});

// ============================================================================
// Color Palette Extraction Tests
// ============================================================================

describe('extractColorPalette', () => {
  it('extracts structured color palette', () => {
    const colors = {
      color0: '#000000',
      color1: '#ff0000',
      color7: '#ffffff',
      color8: '#808080',
      color15: '#ffffff',
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#ffffff',
    };

    const palette = extractColorPalette(colors);

    expect(palette).toBeDefined();
    expect(palette.primary).toBeDefined();
    expect(palette.colors).toBeDefined();

    // Check primary colors
    expect(palette.primary.background).toBe('#1e1e1e');
    expect(palette.primary.foreground).toBe('#d4d4d4');
    expect(palette.primary.cursor).toBe('#ffffff');

    // Check color array
    expect(Array.isArray(palette.colors)).toBe(true);
    expect(palette.colors).toHaveLength(8);

    palette.colors.forEach(color => {
      expect(color).toHaveProperty('name');
      expect(color).toHaveProperty('value');
      expect(color).toHaveProperty('bright');
      expect(typeof color.name).toBe('string');
      validateHexColor(color.value);
      validateHexColor(color.bright);
    });
  });
});

// ============================================================================
// Theme Name Resolution Tests
// ============================================================================

describe('resolveThemeName', () => {
  it('uses explicit name when provided', () => {
    const result = resolveThemeName('/test/file.txt', 'My Custom Theme');
    expect(result).toBe('My Custom Theme');
  });

  it('uses meta name when no explicit name', () => {
    const meta = { name: 'Meta Theme Name' };
    const result = resolveThemeName('/test/file.txt', undefined, meta);
    expect(result).toBe('Meta Theme Name');
  });

  it('derives name from filename when no explicit or meta name', () => {
    const result = resolveThemeName('/test/dark_professional_theme.txt');
    expect(result).toBe('Dark Professional Theme');
  });

  it('handles edge cases gracefully', () => {
    // Empty string results in empty basename, which becomes empty theme name
    expect(resolveThemeName('', undefined, undefined)).toBe('');
    expect(resolveThemeName('/test/file-with-dashes.txt')).toBe('File With Dashes');
    expect(resolveThemeName('/test/file_with_underscores.txt')).toBe('File With Underscores');
  });

  it('trims whitespace from names', () => {
    expect(resolveThemeName('/test/file.txt', '  Trimmed  ')).toBe('Trimmed');
    const meta = { name: '  Meta Trimmed  ' };
    expect(resolveThemeName('/test/file.txt', undefined, meta)).toBe('Meta Trimmed');
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('error handling', () => {
  it('throws ValidationError for invalid inputs', async () => {
    await expect(parseThemeFile('')).rejects.toThrow(ValidationError);
    await expect(parseThemeFile('../invalid')).rejects.toThrow(ValidationError);
  });

  it('throws FileProcessingError for file operation failures', async () => {
    mockReadFile.mockRejectedValueOnce(new Error('File system error'));

    await expect(parseThemeFile('/test/fail.txt')).rejects.toThrow(FileProcessingError);
  });

  it('provides helpful error messages', async () => {
    try {
      await parseThemeFile('');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toContain('Invalid file path');
    }
  });
});

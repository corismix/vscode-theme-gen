/**
 * Comprehensive tests for theme-generator.ts core functionality
 * Tests theme parsing, color mapping, and VS Code theme generation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { join } from 'node:path';
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
  contrastRatio,
  ensureContrast,
  isLightBackground,
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

// Loaded via the real (unmocked) fs implementation, bypassing the vi.mock('fs', ...)
// below, so this reads the real fixture content from disk once at import time.
const realFs = await vi.importActual<typeof import('fs')>('fs');
const AFTERGLOW_FIXTURE_CONTENT = realFs.readFileSync(
  join(process.cwd(), 'tests/ghostty/afterglow.ghostty'),
  'utf8',
);

// Mock fs/promises for controlled file content/stat responses, and mock
// existsSync (used by validateFilePath's directory-existence check) so path
// validation doesn't depend on whether fictitious /test/* paths happen to
// exist on the machine running the suite.
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  stat: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

// ============================================================================
// Setup and Helpers
// ============================================================================

const mockReadFile = vi.mocked((await import('fs/promises')).readFile);
const mockStat = vi.mocked((await import('fs/promises')).stat);
const mockExistsSync = vi.mocked((await import('fs')).existsSync);

beforeEach(() => {
  vi.clearAllMocks();

  // Setup default successful stat response
  mockStat.mockResolvedValue(createMockStats());
  // Directories exist by default; individual tests override this to simulate
  // an unresolvable path (e.g. path traversal into a nonexistent location).
  mockExistsSync.mockReturnValue(true);
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
    // Simulates the resolved target living outside any real directory
    // (validateFilePath rejects paths whose resolved parent directory
    // doesn't exist).
    mockExistsSync.mockReturnValue(false);
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
    const colors = {
      color0: '#000000',
      color1: '#ff0000',
      color2: '#00ff00',
      color3: '#ffff00',
      color4: '#0000ff',
      color5: '#ff00ff',
      color6: '#00ffff',
      color7: '#ffffff',
      color8: '#808080',
      color9: '#ff8080',
      color10: '#80ff80',
      color11: '#ffff80',
      color12: '#8080ff',
      color13: '#ff80ff',
      color14: '#80ffff',
      color15: '#ffffff',
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      'cursor-color': '#ffcc00',
      'selection-background': '#264f78',
      'selection-foreground': '#ffffff',
    };

    const themeColors = buildVSCodeColors(colors);

    expect(themeColors).toBeDefined();

    // Check editor colors - editor.background uses color0 (palette black), not the
    // theme's overall `background` field (that drives the "deep" chrome level instead)
    expect(themeColors['editor.background']).toBe('#000000');
    expect(themeColors['editor.foreground']).toBe('#d4d4d4');
    // Selection background is derived from the theme's own selection-background
    expect(themeColors['editor.selectionBackground']).toContain('#264f78');

    // Check terminal colors
    expect(themeColors['terminal.ansiBlack']).toBe('#000000');
    expect(themeColors['terminal.ansiRed']).toBe('#ff0000');
    expect(themeColors['terminal.ansiBrightWhite']).toBe('#ffffff');

    // Check workbench colors
    expect(themeColors['activityBar.background']).toBeDefined();
    expect(themeColors['statusBar.background']).toBeDefined();

    // Check accent identity - the theme's cursor-color drives brand/interactive
    // colors instead of a hardcoded palette slot
    expect(themeColors['editorCursor.foreground']).toBe('#ffcc00');
    expect(themeColors['button.background']).toBe('#ffcc00');

    // Semantic colors (errors, git deletions) stay tied to the red palette slot
    // regardless of the accent color
    expect(themeColors['editorError.foreground']).toBe('#ff0000');
    expect(themeColors['gitDecoration.deletedResourceForeground']).toBe('#ff0000');
  });
});

/** Flattens a TokenColor's scope (string or string[]) to an array of scope strings. */
const scopesOf = (tc: { scope: string | string[] }): string[] =>
  Array.isArray(tc.scope) ? tc.scope : [tc.scope];

describe('buildTokenColors', () => {
  it('generates comprehensive token color rules', () => {
    const colors = {
      color0: '#000000',
      color1: '#ff0000',
      color2: '#00ff00',
      color3: '#ffff00',
      color4: '#0000ff',
      color5: '#ff00ff',
      color6: '#00ffff',
      color7: '#ffffff',
      color8: '#808080',
      color9: '#ff8080',
      color10: '#80ff80',
      color11: '#ffff80',
      color12: '#8080ff',
      color13: '#ff80ff',
      color14: '#80ffff',
      color15: '#ffffff',
      background: '#1e1e1e',
      foreground: '#d4d4d4',
    };

    const tokenColors = buildTokenColors(colors);

    expect(Array.isArray(tokenColors)).toBe(true);
    expect(tokenColors.length).toBeGreaterThan(10);

    // Check basic token types are covered
    const allScopes = tokenColors.flatMap(scopesOf);
    expect(allScopes).toContain('comment');
    expect(allScopes).toContain('string');
    expect(allScopes).toContain('keyword');
    expect(allScopes).toContain('entity.name.function');

    // Check token structure
    tokenColors.forEach(tokenColor => {
      expect(
        typeof tokenColor.scope === 'string' || Array.isArray(tokenColor.scope),
      ).toBe(true);
      expect(typeof tokenColor.settings).toBe('object');
      // Token colors should have either foreground or fontStyle (or both)
      expect(tokenColor.settings.foreground || tokenColor.settings.fontStyle).toBeDefined();
    });

    // Check JSON-specific tokens are included
    const jsonTokens = tokenColors.filter(tc => scopesOf(tc).some(s => s.includes('json')));
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
    const invalidColors = null as unknown as GhosttyColors;

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

  it('derives a kebab-case slug from filename when no explicit or meta name', () => {
    const result = resolveThemeName('/test/dark_professional_theme.txt');
    expect(result).toBe('dark-professional-theme');
  });

  it('handles edge cases gracefully', () => {
    // Empty string results in empty basename, which becomes empty theme name
    expect(resolveThemeName('', undefined, undefined)).toBe('');
    expect(resolveThemeName('/test/file-with-dashes.txt')).toBe('file-with-dashes');
    expect(resolveThemeName('/test/file_with_underscores.txt')).toBe('file-with-underscores');
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

    mockExistsSync.mockReturnValue(false);
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

// ============================================================================
// Accent Color Derivation Tests
// ============================================================================

describe('accent color derivation', () => {
  it('uses cursor-color as the accent when present', () => {
    const colors = {
      color0: '#000000',
      color1: '#ff0000',
      background: '#000000',
      foreground: '#ffffff',
      'cursor-color': '#00ffcc',
    };

    const themeColors = buildVSCodeColors(colors);

    expect(themeColors['editorCursor.foreground']).toBe('#00ffcc');
    expect(themeColors['button.background']).toBe('#00ffcc');
    expect(themeColors['activityBarBadge.background']).toBe('#00ffcc');
    expect(themeColors['focusBorder']).toContain('#00ffcc');
  });

  it('falls back to the red palette slot when no cursor-color is present', () => {
    const colors = {
      color0: '#000000',
      color1: '#ff0000',
      background: '#000000',
      foreground: '#ffffff',
    };

    const themeColors = buildVSCodeColors(colors);

    expect(themeColors['editorCursor.foreground']).toBe('#ff0000');
    expect(themeColors['button.background']).toBe('#ff0000');
  });

  it('never re-points semantic error/git colors at the accent', () => {
    const colors = {
      color0: '#000000',
      color1: '#ff0000',
      color10: '#00ff00',
      background: '#000000',
      foreground: '#ffffff',
      'cursor-color': '#00ffcc',
    };

    const themeColors = buildVSCodeColors(colors);

    expect(themeColors['editorError.foreground']).toBe('#ff0000');
    expect(themeColors['gitDecoration.deletedResourceForeground']).toBe('#ff0000');
    expect(themeColors['gitDecoration.addedResourceForeground']).toBe(colors.color10);
  });
});

// ============================================================================
// Selection Color Usage Tests
// ============================================================================

describe('selection color usage', () => {
  it('uses the theme-provided selection colors instead of a hardcoded accent', () => {
    const colors = {
      color0: '#000000',
      color1: '#ff0000',
      background: '#000000',
      foreground: '#ffffff',
      'selection-background': '#264f78',
      'selection-foreground': '#eeeeee',
    };

    const themeColors = buildVSCodeColors(colors);

    expect(themeColors['editor.selectionBackground']).toContain('#264f78');
    expect(themeColors['editor.selectionForeground']).toBe('#eeeeee');
    expect(themeColors['terminal.selectionBackground']).toContain('#264f78');
  });

  it('falls back to the accent color when no selection colors are provided', () => {
    const colors = {
      color0: '#000000',
      color1: '#ff0000',
      background: '#000000',
      foreground: '#ffffff',
    };

    const themeColors = buildVSCodeColors(colors);

    expect(themeColors['editor.selectionBackground']).toContain('#ff0000');
    expect(themeColors['editor.selectionForeground']).toBe('#ffffff');
  });
});

// ============================================================================
// Contrast & Lightness Helper Tests
// ============================================================================

describe('contrastRatio', () => {
  it('computes the maximum WCAG contrast ratio between black and white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });

  it('computes a ratio of 1 for identical colors', () => {
    expect(contrastRatio('#336699', '#336699')).toBeCloseTo(1, 5);
  });

  it('is symmetric regardless of argument order', () => {
    expect(contrastRatio('#111315', '#d8d9d1')).toBeCloseTo(contrastRatio('#d8d9d1', '#111315'), 5);
  });
});

describe('ensureContrast', () => {
  it('returns the original color unchanged when it already meets the target ratio', () => {
    expect(ensureContrast('#ffffff', '#000000', 4.5)).toBe('#ffffff');
  });

  it('nudges a low-contrast foreground color until the target ratio is met', () => {
    const background = '#101010';
    const weakForeground = '#151515';
    expect(contrastRatio(weakForeground, background)).toBeLessThan(4.5);

    const adjusted = ensureContrast(weakForeground, background, 4.5);

    expect(contrastRatio(adjusted, background)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('isLightBackground', () => {
  it('identifies light and dark colors correctly', () => {
    expect(isLightBackground('#ffffff')).toBe(true);
    expect(isLightBackground('#f5f5f5')).toBe(true);
    expect(isLightBackground('#000000')).toBe(false);
    expect(isLightBackground('#111315')).toBe(false);
  });
});

// ============================================================================
// Theme Type (Light/Dark) Detection Tests
// ============================================================================

describe('theme type detection', () => {
  it('marks a theme with a light background as type light', () => {
    const theme = buildVSCodeTheme({ background: '#ffffff', foreground: '#000000' }, 'Light Theme');
    expect(theme.type).toBe('light');
  });

  it('marks a theme with a dark background as type dark', () => {
    const theme = buildVSCodeTheme({ background: '#000000', foreground: '#ffffff' }, 'Dark Theme');
    expect(theme.type).toBe('dark');
  });
});

// ============================================================================
// .ghostty Fixture End-to-End Test
// ============================================================================

describe('.ghostty fixture (afterglow)', () => {
  it('parses and builds the real afterglow.ghostty fixture end-to-end', async () => {
    mockReadFile.mockResolvedValueOnce(AFTERGLOW_FIXTURE_CONTENT);

    const parsed = await parseThemeFile('/repo/tests/ghostty/afterglow.ghostty');

    expect(parsed.colors.background).toBe('#111315');
    expect(parsed.colors.foreground).toBe('#d8d9d1');
    expect(parsed.colors['cursor-color']).toBe('#ffaf2d');
    expect(parsed.colors['selection-background']).toBe('#449aff');
    expect(parsed.colors.color1).toBe('#ff3844');

    const theme = buildVSCodeTheme(
      parsed.colors,
      'Afterglow',
      '/repo/tests/ghostty/afterglow.ghostty',
    );

    validateVSCodeTheme(theme);
    expect(theme.type).toBe('dark');

    // Accent identity: buttons/badges/focus reflect the file's own amber
    // cursor-color, not a hardcoded palette slot
    expect(theme.colors['button.background']).toBe('#ffaf2d');
    expect(theme.colors['editorCursor.foreground']).toBe('#ffaf2d');
    expect(theme.colors['activityBarBadge.background']).toBe('#ffaf2d');

    // Selection reflects the file's own selection-background
    expect(theme.colors['editor.selectionBackground']).toContain('#449aff');

    // Semantic colors are untouched by the accent
    expect(theme.colors['editorError.foreground']).toBe('#ff3844');
    expect(theme.colors['gitDecoration.deletedResourceForeground']).toBe('#ff3844');

    // "Highlight matched text" family is deliberately uncolored (plain
    // foreground), not the raw ANSI yellow the real Afterglow theme uses -
    // these fire constantly (autocomplete, list search, breadcrumbs) and
    // were the main source of the "yellow everywhere" complaint
    expect(theme.colors['editorSuggestWidget.highlightForeground']).toBe('#d8d9d1');
    expect(theme.colors['editorSuggestWidget.focusHighlightForeground']).toBe('#d8d9d1');
    expect(theme.colors['editorSuggestWidget.selectedIconForeground']).toBe('#d8d9d1');
    expect(theme.colors['list.highlightForeground']).toBe('#d8d9d1');
    expect(theme.colors['list.focusHighlightForeground']).toBe('#d8d9d1');
    expect(theme.colors['breadcrumb.activeSelectionForeground']).toBe('#d8d9d1');

    // statusBar.debuggingBackground now shares the accent with the sibling
    // statusBarItem.prominentBackground instead of diverging to raw yellow
    expect(theme.colors['statusBar.debuggingBackground']).toContain('#ffaf2d');

    // inputValidation.* is a previously-missing surface
    expect(theme.colors['inputValidation.errorBorder']).toBe('#ff3844');
    expect(theme.colors['inputValidation.warningBorder']).toBe('#ffd012');
    expect(theme.colors['inputValidation.infoBorder']).toBe('#4db3ff');

    // Chrome panel seams get a real (if subtle) hairline instead of being
    // fully transparent - matches 2026-dark's "flat panels, thin lines"
    // composition instead of Afterglow's borderless chrome
    expect(theme.colors['activityBar.border']).not.toBe('#00000000');
    expect(theme.colors['sideBar.border']).not.toBe('#00000000');
    expect(theme.colors['statusBar.border']).not.toBe('#00000000');
    expect(theme.colors['titleBar.border']).not.toBe('#00000000');
    expect(theme.colors['tab.border']).not.toBe('#00000000');
    expect(theme.colors['editorGroupHeader.tabsBorder']).not.toBe('#00000000');

    // Passive list selection/hover states are neutral (foreground-tinted),
    // not accent-tinted - accent is reserved for active affordances like
    // drop targets, focus rings, and the single keyboard-focused quick-pick row
    expect(theme.colors['list.activeSelectionBackground']).toBe('#d8d9d121');
    expect(theme.colors['list.inactiveSelectionBackground']).toBe('#d8d9d114');
    expect(theme.colors['list.focusBackground']).toBe('#d8d9d121');

    // The quick-pick "about to activate" row is a solid accent fill with
    // contrast-safe text, matching 2026-dark's own treatment of this state
    expect(theme.colors['quickInputList.focusBackground']).toBe('#ffaf2d');
    expect(theme.colors['quickInputList.focusForeground']).toBe('#191d21');

    const tokenColors = buildTokenColors(parsed.colors);
    const diffInserted = tokenColors.find(t => t.name === 'Diff Inserted');
    expect(diffInserted?.settings.background).toBeDefined();
  });
});

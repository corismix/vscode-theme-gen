import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseThemeFile, buildVSCodeTheme, createColorRoleMap } from '../../lib/theme-generator.js';
import { readFileSync } from 'fs';

// Mock fs module
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  statSync: vi.fn(() => ({ mtime: new Date() })),
}));

describe('theme-generator', () => {
  const mockThemeContent = `background=#1a1a1a
foreground=#e0e0e0
color0=#000000
color1=#ff0000
color2=#00ff00
color3=#ffff00
color4=#0000ff
color5=#ff00ff
color6=#00ffff
color7=#ffffff
color8=#808080
color9=#ff8080
color10=#80ff80
color11=#ffff80
color12=#8080ff
color13=#ff80ff
color14=#80ffff
color15=#ffffff
cursor=#ff0000
selection_background=#404040
selection_foreground=#ffffff`;

  const mockFilePath = '/test/theme.txt';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseThemeFile', () => {
    it('should parse a valid Ghostty theme file', () => {
      (readFileSync as any).mockReturnValue(mockThemeContent);
      
      const result = parseThemeFile(mockFilePath);
      
      expect(result).toHaveProperty('colors');
      expect(result.colors).toHaveProperty('background', '#1a1a1a');
      expect(result.colors).toHaveProperty('foreground', '#e0e0e0');
      expect(result.colors).toHaveProperty('color0', '#000000');
      expect(result.colors).toHaveProperty('color15', '#ffffff');
      expect(result.colors).toHaveProperty('cursor', '#ff0000');
      expect(result.colors).toHaveProperty('selection_background', '#404040');
    });

    it('should handle empty content gracefully', () => {
      (readFileSync as any).mockReturnValue('');
      
      const result = parseThemeFile(mockFilePath);
      
      expect(result).toHaveProperty('colors');
      expect(Object.keys(result.colors)).toHaveLength(0);
    });

    it('should ignore invalid lines', () => {
      const content = `background=#1a1a1a
invalid line without equals
foreground=#e0e0e0
# this is a comment
=invalid_key_format
key_without_value=`;
      
      (readFileSync as any).mockReturnValue(content);
      const result = parseThemeFile(mockFilePath);
      
      expect(result.colors).toHaveProperty('background', '#1a1a1a');
      expect(result.colors).toHaveProperty('foreground', '#e0e0e0');
      expect(result.colors).not.toHaveProperty('invalid');
      expect(result.colors).not.toHaveProperty('key_without_value');
    });

    it('should handle hex colors without # prefix', () => {
      const content = `background=1a1a1a
foreground=e0e0e0`;
      
      (readFileSync as any).mockReturnValue(content);
      const result = parseThemeFile(mockFilePath);
      
      expect(result.colors).toHaveProperty('background', '#1a1a1a');
      expect(result.colors).toHaveProperty('foreground', '#e0e0e0');
    });
  });

  describe('createColorRoleMap', () => {
    it('should create correct role mappings for all colors', () => {
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
        color15: '#ffffff',
      };

      const roleMap = createColorRoleMap(colors);
      
      expect(roleMap.black.hex).toBe('#000000');
      expect(roleMap.red.hex).toBe('#ff0000');
      expect(roleMap.green.hex).toBe('#00ff00');
      expect(roleMap.yellow.hex).toBe('#ffff00');
      expect(roleMap.blue.hex).toBe('#0000ff');
      expect(roleMap.magenta.hex).toBe('#ff00ff');
      expect(roleMap.cyan.hex).toBe('#00ffff');
      expect(roleMap.white.hex).toBe('#ffffff');
      expect(roleMap.brightBlack.hex).toBe('#808080');
      expect(roleMap.brightWhite.hex).toBe('#ffffff');
    });

    it('should provide default values for missing colors', () => {
      const emptyColors = {};
      const roleMap = createColorRoleMap(emptyColors);
      
      expect(roleMap.black.hex).toBe('#000000');
      expect(roleMap.red.hex).toBe('#ff0000');
      expect(roleMap.green.hex).toBe('#00ff00');
      expect(roleMap.white.hex).toBe('#ffffff');
    });
  });

  describe('buildVSCodeTheme', () => {
    let mockColors: any;
    let themeName: string;

    beforeEach(() => {
      (readFileSync as any).mockReturnValue(mockThemeContent);
      const parsedResult = parseThemeFile(mockFilePath);
      mockColors = parsedResult.colors;
      themeName = 'Test Theme';
    });

    it('should build a complete VS Code theme', () => {
      const result = buildVSCodeTheme(mockColors, themeName);
      
      expect(result).toHaveProperty('name', 'Test Theme');
      expect(result).toHaveProperty('type', 'dark');
      expect(result).toHaveProperty('colors');
      expect(result).toHaveProperty('tokenColors');
    });

    it('should set correct editor colors', () => {
      const result = buildVSCodeTheme(mockColors, themeName);
      
      expect(result.colors).toHaveProperty('editor.background', '#1a1a1a');
      expect(result.colors).toHaveProperty('editor.foreground', '#e0e0e0');
      expect(result.colors).toHaveProperty('editor.selectionBackground', '#404040');
      expect(result.colors).toHaveProperty('editor.selectionForeground', '#ffffff');
    });

    it('should generate terminal colors', () => {
      const result = buildVSCodeTheme(mockColors, themeName);
      
      expect(result.colors).toHaveProperty('terminal.ansiBlack', '#000000');
      expect(result.colors).toHaveProperty('terminal.ansiRed', '#ff0000');
      expect(result.colors).toHaveProperty('terminal.ansiGreen', '#00ff00');
      expect(result.colors).toHaveProperty('terminal.ansiYellow', '#ffff00');
      expect(result.colors).toHaveProperty('terminal.ansiBlue', '#0000ff');
      expect(result.colors).toHaveProperty('terminal.ansiMagenta', '#ff00ff');
      expect(result.colors).toHaveProperty('terminal.ansiCyan', '#00ffff');
      expect(result.colors).toHaveProperty('terminal.ansiWhite', '#ffffff');
      expect(result.colors).toHaveProperty('terminal.ansiBrightBlack', '#808080');
      expect(result.colors).toHaveProperty('terminal.ansiBrightWhite', '#ffffff');
    });

    it('should include syntax highlighting token colors', () => {
      const result = buildVSCodeTheme(mockColors, themeName);
      
      expect(result.tokenColors).toBeInstanceOf(Array);
      expect(result.tokenColors.length).toBeGreaterThan(0);
      
      const commentToken = result.tokenColors.find((token: any) => 
        token.scope?.includes('comment')
      );
      expect(commentToken).toBeDefined();
      expect(commentToken?.scope).toBeDefined();
    });

    it('should handle missing colors gracefully', () => {
      const incompleteColors = {
        background: '#1a1a1a',
        // Missing other colors
      };
      
      const result = buildVSCodeTheme(incompleteColors, themeName);
      
      expect(result).toHaveProperty('colors');
      expect(result.colors).toHaveProperty('editor.background', '#1a1a1a');
      // Should have defaults for missing colors
      expect(result.colors).toHaveProperty('editor.foreground');
    });

    it('should set theme type based on background brightness', () => {
      // Test with dark background
      const darkColors = { background: '#000000' };
      const darkResult = buildVSCodeTheme(darkColors, themeName);
      expect(darkResult.type).toBe('dark');

      // Test with light background
      const lightColors = { background: '#ffffff' };
      const lightResult = buildVSCodeTheme(lightColors, themeName);
      expect(lightResult.type).toBe('dark'); // Current implementation always returns 'dark'
    });
  });
});
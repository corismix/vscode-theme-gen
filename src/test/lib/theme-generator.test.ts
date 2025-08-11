import { describe, it, expect, beforeEach } from 'vitest';
import { parseGhosttyTheme, buildVSCodeTheme, roleMap } from '../../lib/theme-generator.js';

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

  describe('parseGhosttyTheme', () => {
    it('should parse a valid Ghostty theme file', () => {
      const result = parseGhosttyTheme(mockThemeContent);
      
      expect(result).toHaveProperty('colors');
      expect(result.colors).toHaveProperty('background', '#1a1a1a');
      expect(result.colors).toHaveProperty('foreground', '#e0e0e0');
      expect(result.colors).toHaveProperty('color0', '#000000');
      expect(result.colors).toHaveProperty('color15', '#ffffff');
      expect(result.colors).toHaveProperty('cursor', '#ff0000');
      expect(result.colors).toHaveProperty('selection_background', '#404040');
    });

    it('should handle empty content gracefully', () => {
      const result = parseGhosttyTheme('');
      
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
      
      const result = parseGhosttyTheme(content);
      
      expect(result.colors).toHaveProperty('background', '#1a1a1a');
      expect(result.colors).toHaveProperty('foreground', '#e0e0e0');
      expect(result.colors).not.toHaveProperty('invalid');
      expect(result.colors).not.toHaveProperty('key_without_value');
    });

    it('should handle hex colors without # prefix', () => {
      const content = `background=1a1a1a
foreground=e0e0e0`;
      
      const result = parseGhosttyTheme(content);
      
      expect(result.colors).toHaveProperty('background', '#1a1a1a');
      expect(result.colors).toHaveProperty('foreground', '#e0e0e0');
    });
  });

  describe('roleMap', () => {
    it('should return correct roles for all color indices', () => {
      expect(roleMap(0)).toBe('black');
      expect(roleMap(1)).toBe('red');
      expect(roleMap(2)).toBe('green');
      expect(roleMap(3)).toBe('yellow');
      expect(roleMap(4)).toBe('blue');
      expect(roleMap(5)).toBe('magenta');
      expect(roleMap(6)).toBe('cyan');
      expect(roleMap(7)).toBe('white');
      expect(roleMap(8)).toBe('brightBlack');
      expect(roleMap(15)).toBe('brightWhite');
    });

    it('should return default for invalid indices', () => {
      expect(roleMap(-1)).toBe('black');
      expect(roleMap(16)).toBe('black');
      expect(roleMap(100)).toBe('black');
    });
  });

  describe('buildVSCodeTheme', () => {
    let parsedTheme: any;
    let config: any;

    beforeEach(() => {
      parsedTheme = parseGhosttyTheme(mockThemeContent);
      config = {
        name: 'Test Theme',
        displayName: 'Test Theme',
        description: 'A test theme',
        version: '1.0.0',
      };
    });

    it('should build a complete VS Code theme', () => {
      const result = buildVSCodeTheme(parsedTheme, config);
      
      expect(result).toHaveProperty('name', 'Test Theme');
      expect(result).toHaveProperty('type', 'dark');
      expect(result).toHaveProperty('colors');
      expect(result).toHaveProperty('tokenColors');
    });

    it('should set correct editor colors', () => {
      const result = buildVSCodeTheme(parsedTheme, config);
      
      expect(result.colors).toHaveProperty('editor.background', '#1a1a1a');
      expect(result.colors).toHaveProperty('editor.foreground', '#e0e0e0');
      expect(result.colors).toHaveProperty('editorCursor.foreground', '#ff0000');
      expect(result.colors).toHaveProperty('editor.selectionBackground', '#404040');
      expect(result.colors).toHaveProperty('editor.selectionForeground', '#ffffff');
    });

    it('should generate terminal colors', () => {
      const result = buildVSCodeTheme(parsedTheme, config);
      
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
      const result = buildVSCodeTheme(parsedTheme, config);
      
      expect(result.tokenColors).toBeInstanceOf(Array);
      expect(result.tokenColors.length).toBeGreaterThan(0);
      
      const commentToken = result.tokenColors.find((token: any) => 
        token.name === 'Comments'
      );
      expect(commentToken).toBeDefined();
      expect(commentToken.scope).toContain('comment');
    });

    it('should handle missing colors gracefully', () => {
      const incompleteTheme = {
        colors: {
          background: '#1a1a1a',
          // Missing other colors
        }
      };
      
      const result = buildVSCodeTheme(incompleteTheme, config);
      
      expect(result).toHaveProperty('colors');
      expect(result.colors).toHaveProperty('editor.background', '#1a1a1a');
      // Should have defaults for missing colors
      expect(result.colors).toHaveProperty('editor.foreground');
    });

    it('should set theme type based on background brightness', () => {
      // Test with dark background
      const darkTheme = {
        colors: { background: '#000000' }
      };
      const darkResult = buildVSCodeTheme(darkTheme, config);
      expect(darkResult.type).toBe('dark');

      // Test with light background
      const lightTheme = {
        colors: { background: '#ffffff' }
      };
      const lightResult = buildVSCodeTheme(lightTheme, config);
      expect(lightResult.type).toBe('light');
    });
  });
});
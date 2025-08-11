/**
 * Theme generation functions for converting Ghostty themes to VS Code themes
 * Converted to TypeScript with comprehensive type safety
 */

import { readFileSync, statSync } from 'fs';
import { resolve, basename } from 'path';
import {
  GhosttyColors,
  VSCodeTheme,
  VSCodeThemeColors,
  TokenColor,
  ColorRoleMap,
  ParsedThemeFile,
  FileValidationResult,
  FileProcessingError,
  ValidationError,
} from '@/utils/types';

// ============================================================================
// Constants
// ============================================================================

const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1MB
const MAX_LINES = 10000;
const MAX_CONFIG_LINES = 1000;
const MAX_KEY_LENGTH = 100;
const MAX_VALUE_LENGTH = 200;

const VALID_COLOR_KEYS = [
  'background', 'foreground', 'cursor', 'cursor_text', 'cursor-text',
  'selection_background', 'selection_foreground', 'selection-background', 'selection-foreground',
  'cursor-color'
] as const;

const COLOR_KEY_REGEX = /^color\d+$/;
const PALETTE_REGEX = /^palette\s*=\s*(\d+)\s*=\s*(.+)$/;
const LINE_REGEX = /^(\w+)[\s=:]+(.+)$/;
const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validates if a string is a valid hex color
 */
const isValidHexColor = (color: string): boolean => {
  return HEX_COLOR_REGEX.test(color);
};

/**
 * Sanitizes and validates a color value
 */
const sanitizeColorValue = (value: string): string | null => {
  if (!value || typeof value !== 'string') {
    return null;
  }
  
  let sanitized = value.trim();
  
  // Add # prefix if missing
  if (sanitized.length === 6 && /^[0-9a-fA-F]{6}$/.test(sanitized)) {
    sanitized = `#${sanitized}`;
  } else if (sanitized.length === 3 && /^[0-9a-fA-F]{3}$/.test(sanitized)) {
    sanitized = `#${sanitized}`;
  }
  
  return isValidHexColor(sanitized) ? sanitized.toLowerCase() : null;
};

// ============================================================================
// File Reading Functions
// ============================================================================

/**
 * Reads text content from a file with validation
 */
export const readThemeFile = (filePath: string): string => {
  if (typeof filePath !== 'string' || !filePath.trim()) {
    throw new ValidationError('Invalid file path provided');
  }
  
  try {
    const resolvedPath = resolve(filePath);
    const content = readFileSync(resolvedPath, 'utf8');
    
    // Validate file size
    if (content.length > MAX_FILE_SIZE_BYTES) {
      throw new FileProcessingError(
        'File is too large',
        { fileSize: content.length, maxSize: MAX_FILE_SIZE_BYTES },
        ['Choose a smaller file', 'File must be under 1MB']
      );
    }
    
    return content;
  } catch (error) {
    if (error instanceof FileProcessingError || error instanceof ValidationError) {
      throw error;
    }
    
    throw new FileProcessingError(
      `Failed to read file: ${(error as Error).message}`,
      { filePath },
      ['Check that the file exists', 'Verify file permissions', 'Ensure file is readable']
    );
  }
};

// ============================================================================
// Theme Parsing Functions
// ============================================================================

/**
 * Parses a Ghostty theme file into structured data
 */
export const parseThemeFile = (filePath: string): ParsedThemeFile => {
  const validation: FileValidationResult = {
    isValid: true,
    warnings: [],
  };
  
  try {
    const content = readThemeFile(filePath).trim();
    const lines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && !line.startsWith('//'));
    
    // Validate line count
    if (lines.length > MAX_LINES) {
      throw new ValidationError(
        `Too many lines in file (maximum ${MAX_LINES})`,
        { lineCount: lines.length, maxLines: MAX_LINES }
      );
    }
    
    const colors: GhosttyColors = {};
    const meta: Record<string, string> = {};
    let processedLines = 0;

    for (const line of lines) {
      processedLines++;
      if (processedLines > MAX_CONFIG_LINES) {
        validation.warnings?.push('Too many configuration lines, some may be ignored');
        break;
      }
      
      // Check for Ghostty palette format: palette = N=#color
      const paletteMatch = line.match(PALETTE_REGEX);
      if (paletteMatch) {
        const [, paletteNumber, colorValue] = paletteMatch;
        const colorKey = `color${paletteNumber}` as keyof GhosttyColors;
        const sanitizedColor = sanitizeColorValue(colorValue.trim());
        
        if (sanitizedColor) {
          colors[colorKey] = sanitizedColor;
        } else {
          validation.warnings?.push(`Invalid color value for ${colorKey}: ${colorValue}`);
        }
        continue;
      }
      
      // Check for regular format: key = value
      const match = line.match(LINE_REGEX);
      if (match) {
        const [, key, value] = match;
        const trimmedKey = key.trim();
        const trimmedValue = value.trim();
        
        // Validate key length
        if (trimmedKey.length > MAX_KEY_LENGTH) {
          validation.warnings?.push(`Skipping line with overly long key: ${trimmedKey.substring(0, 20)}...`);
          continue;
        }
        
        if (COLOR_KEY_REGEX.test(trimmedKey)) {
          const sanitizedColor = sanitizeColorValue(trimmedValue);
          if (sanitizedColor) {
            (colors as any)[trimmedKey] = sanitizedColor;
          } else {
            validation.warnings?.push(`Invalid color value for ${trimmedKey}: ${trimmedValue}`);
          }
        } else if (VALID_COLOR_KEYS.includes(trimmedKey as any)) {
          const sanitizedColor = sanitizeColorValue(trimmedValue);
          if (sanitizedColor) {
            // Normalize key names (convert hyphens to underscores for consistency)
            const normalizedKey = trimmedKey.replace(/-/g, '_') as keyof GhosttyColors;
            colors[normalizedKey] = sanitizedColor;
          } else {
            validation.warnings?.push(`Invalid color value for ${trimmedKey}: ${trimmedValue}`);
          }
        } else {
          // For meta values, limit length and sanitize
          const sanitizedValue = trimmedValue.length > MAX_VALUE_LENGTH 
            ? trimmedValue.substring(0, MAX_VALUE_LENGTH) 
            : trimmedValue;
          meta[trimmedKey] = sanitizedValue;
        }
      }
    }

    // Get file metadata
    const stats = readFileSync(filePath);
    const fileStats = statSync(filePath);
    
    return {
      colors,
      metadata: {
        fileName: basename(filePath),
        filePath,
        fileSize: stats.length,
        lastModified: fileStats.mtime,
      },
      validation,
    };
  } catch (error) {
    if (error instanceof FileProcessingError || error instanceof ValidationError) {
      throw error;
    }
    
    throw new FileProcessingError(
      `Failed to parse theme file: ${(error as Error).message}`,
      { filePath }
    );
  }
};

// ============================================================================
// Color Role Mapping
// ============================================================================

/**
 * Maps parsed colors to semantic roles
 */
export const createColorRoleMap = (colors: GhosttyColors): ColorRoleMap => {
  return {
    black: {
      name: 'Black',
      hex: colors.color0 || '#000000',
      usage: ['Terminal black', 'Dark backgrounds', 'Shadows']
    },
    red: {
      name: 'Red',
      hex: colors.color1 || '#ff0000',
      usage: ['Errors', 'Keywords', 'Warnings']
    },
    green: {
      name: 'Green',
      hex: colors.color2 || '#00ff00',
      usage: ['Strings', 'Success messages', 'Growth indicators']
    },
    yellow: {
      name: 'Yellow',
      hex: colors.color3 || '#ffff00',
      usage: ['Functions', 'Warnings', 'Highlights']
    },
    blue: {
      name: 'Blue',
      hex: colors.color4 || '#0000ff',
      usage: ['Keywords', 'Links', 'Selection']
    },
    magenta: {
      name: 'Magenta',
      hex: colors.color5 || '#ff00ff',
      usage: ['Constants', 'Numbers', 'Special characters']
    },
    cyan: {
      name: 'Cyan',
      hex: colors.color6 || '#00ffff',
      usage: ['Classes', 'Types', 'Info messages']
    },
    white: {
      name: 'White',
      hex: colors.color7 || '#ffffff',
      usage: ['Text', 'Light backgrounds', 'Highlights']
    },
    brightBlack: {
      name: 'Bright Black',
      hex: colors.color8 || '#808080',
      usage: ['Comments', 'Disabled text', 'Borders']
    },
    brightRed: {
      name: 'Bright Red',
      hex: colors.color9 || '#ff8080',
      usage: ['Critical errors', 'Urgent warnings']
    },
    brightGreen: {
      name: 'Bright Green',
      hex: colors.color10 || '#80ff80',
      usage: ['Success confirmations', 'Positive indicators']
    },
    brightYellow: {
      name: 'Bright Yellow',
      hex: colors.color11 || '#ffff80',
      usage: ['Active highlights', 'Important notes']
    },
    brightBlue: {
      name: 'Bright Blue',
      hex: colors.color12 || '#8080ff',
      usage: ['Active links', 'Primary buttons']
    },
    brightMagenta: {
      name: 'Bright Magenta',
      hex: colors.color13 || '#ff80ff',
      usage: ['Special constants', 'Accent colors']
    },
    brightCyan: {
      name: 'Bright Cyan',
      hex: colors.color14 || '#80ffff',
      usage: ['Support functions', 'Helper text']
    },
    brightWhite: {
      name: 'Bright White',
      hex: colors.color15 || '#ffffff',
      usage: ['Primary text', 'Main content']
    },
  };
};

/**
 * Creates simplified role mappings for theme generation
 */
const createSimpleRoleMap = (colors: GhosttyColors) => {
  const roleMap = createColorRoleMap(colors);
  
  return {
    black: roleMap.black.hex,
    red: roleMap.red.hex,
    green: roleMap.green.hex,
    yellow: roleMap.yellow.hex,
    blue: roleMap.blue.hex,
    magenta: roleMap.magenta.hex,
    cyan: roleMap.cyan.hex,
    white: roleMap.white.hex,
    brightBlack: roleMap.brightBlack.hex,
    brightRed: roleMap.brightRed.hex,
    brightGreen: roleMap.brightGreen.hex,
    brightYellow: roleMap.brightYellow.hex,
    brightBlue: roleMap.brightBlue.hex,
    brightMagenta: roleMap.brightMagenta.hex,
    brightCyan: roleMap.brightCyan.hex,
    brightWhite: roleMap.brightWhite.hex,
    background: colors.background || roleMap.black.hex,
    foreground: colors.foreground || roleMap.brightWhite.hex,
    cursor: colors.cursor || colors.cursor_text || roleMap.brightWhite.hex,
    cursorText: colors.cursor_text || roleMap.black.hex,
    selectionBackground: colors.selection_background || roleMap.blue.hex,
    selectionForeground: colors.selection_foreground || roleMap.brightWhite.hex,
  };
};

// ============================================================================
// VS Code Theme Building
// ============================================================================

/**
 * Builds VS Code workbench colors from role mappings
 */
export const buildVSCodeColors = (roleMap: ReturnType<typeof createSimpleRoleMap>): VSCodeThemeColors => {
  return {
    // Editor colors
    'editor.background': roleMap.background,
    'editor.foreground': roleMap.foreground,
    'editor.lineHighlightBackground': `${roleMap.brightBlack}40`,
    'editor.selectionBackground': roleMap.selectionBackground,
    'editor.selectionForeground': roleMap.selectionForeground,
    'editor.inactiveSelectionBackground': `${roleMap.selectionBackground}60`,
    'editor.wordHighlightBackground': `${roleMap.yellow}40`,
    'editor.wordHighlightStrongBackground': `${roleMap.yellow}60`,
    'editor.findMatchBackground': `${roleMap.magenta}60`,
    'editor.findMatchHighlightBackground': `${roleMap.magenta}40`,
    'editor.hoverHighlightBackground': `${roleMap.brightBlack}60`,
    'editor.lineHighlightBorder': roleMap.brightBlack,
    'editor.rangeHighlightBackground': `${roleMap.blue}20`,
    
    // Workbench colors
    'workbench.colorTheme': 'dark',
    'activityBar.background': roleMap.black,
    'activityBar.foreground': roleMap.white,
    'sideBar.background': roleMap.black,
    'sideBar.foreground': roleMap.white,
    'statusBar.background': roleMap.black,
    'statusBar.foreground': roleMap.white,
    'titleBar.activeBackground': roleMap.black,
    'titleBar.activeForeground': roleMap.white,
    
    // Terminal colors
    'terminal.background': roleMap.background,
    'terminal.foreground': roleMap.foreground,
    'terminal.ansiBlack': roleMap.black,
    'terminal.ansiRed': roleMap.red,
    'terminal.ansiGreen': roleMap.green,
    'terminal.ansiYellow': roleMap.yellow,
    'terminal.ansiBlue': roleMap.blue,
    'terminal.ansiMagenta': roleMap.magenta,
    'terminal.ansiCyan': roleMap.cyan,
    'terminal.ansiWhite': roleMap.white,
    'terminal.ansiBrightBlack': roleMap.brightBlack,
    'terminal.ansiBrightRed': roleMap.brightRed,
    'terminal.ansiBrightGreen': roleMap.brightGreen,
    'terminal.ansiBrightYellow': roleMap.brightYellow,
    'terminal.ansiBrightBlue': roleMap.brightBlue,
    'terminal.ansiBrightMagenta': roleMap.brightMagenta,
    'terminal.ansiBrightCyan': roleMap.brightCyan,
    'terminal.ansiBrightWhite': roleMap.brightWhite,
  } as VSCodeThemeColors;
};

/**
 * Builds token colors for syntax highlighting
 */
export const buildTokenColors = (roleMap: ReturnType<typeof createSimpleRoleMap>): TokenColor[] => {
  const baseTokens: TokenColor[] = [
    { scope: 'comment', settings: { foreground: roleMap.brightBlack, fontStyle: 'italic' } },
    { scope: 'string', settings: { foreground: roleMap.green } },
    { scope: 'constant.numeric', settings: { foreground: roleMap.magenta } },
    { scope: 'constant.language', settings: { foreground: roleMap.blue } },
    { scope: 'keyword', settings: { foreground: roleMap.red } },
    { scope: 'storage', settings: { foreground: roleMap.red } },
    { scope: 'entity.name.function', settings: { foreground: roleMap.yellow } },
    { scope: 'entity.name.class', settings: { foreground: roleMap.cyan } },
    { scope: 'entity.name.type', settings: { foreground: roleMap.cyan } },
    { scope: 'variable.parameter', settings: { foreground: roleMap.brightWhite } },
    { scope: 'support.function', settings: { foreground: roleMap.brightBlue } },
    { scope: 'support.class', settings: { foreground: roleMap.brightCyan } },
    { scope: 'markup.heading', settings: { foreground: roleMap.yellow, fontStyle: 'bold' } },
    { scope: 'markup.bold', settings: { fontStyle: 'bold' } },
    { scope: 'markup.italic', settings: { fontStyle: 'italic' } },
  ];

  // JSON Rainbow colors (specialized token colors for JSON files)
  const jsonTokens: TokenColor[] = [
    { scope: 'punctuation.definition.dictionary.begin.json', settings: { foreground: '#f6b34c' } },
    { scope: 'punctuation.definition.dictionary.end.json', settings: { foreground: '#f6b34c' } },
    { scope: 'punctuation.definition.array.begin.json', settings: { foreground: '#83e96c' } },
    { scope: 'punctuation.definition.array.end.json', settings: { foreground: '#83e96c' } },
    { scope: 'punctuation.definition.string.begin.json', settings: { foreground: '#c89ef0' } },
    { scope: 'punctuation.definition.string.end.json', settings: { foreground: '#c89ef0' } },
    { scope: 'punctuation.separator.dictionary.key-value.json', settings: { foreground: '#3ad4b7' } },
    { scope: 'punctuation.separator.dictionary.pair.json', settings: { foreground: '#e4e5df' } },
    { scope: 'punctuation.separator.array.json', settings: { foreground: '#e4e5df' } },
  ];

  return [...baseTokens, ...jsonTokens];
};

// ============================================================================
// Theme Name Resolution
// ============================================================================

/**
 * Resolves the theme name from various sources
 */
export const resolveThemeName = (
  filePath: string,
  explicitName?: string,
  meta?: Record<string, string>
): string => {
  // Priority: explicit name > meta name > filename
  if (explicitName && typeof explicitName === 'string' && explicitName.trim()) {
    return explicitName.trim();
  }
  
  if (meta?.name && typeof meta.name === 'string' && meta.name.trim()) {
    return meta.name.trim();
  }
  
  if (typeof filePath !== 'string') {
    return 'Unknown Theme';
  }
  
  try {
    const baseName = basename(filePath, '.txt');
    return baseName.replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  } catch {
    return 'Unknown Theme';
  }
};

// ============================================================================
// Main Theme Building Function
// ============================================================================

/**
 * Builds a complete VS Code theme from parsed Ghostty data
 */
export const buildVSCodeTheme = (
  colors: GhosttyColors,
  themeName: string,
  filePath?: string
): VSCodeTheme => {
  try {
    const roleMap = createSimpleRoleMap(colors);
    const name = themeName || resolveThemeName(filePath || '', themeName);
    const themeColors = buildVSCodeColors(roleMap);
    const tokenColors = buildTokenColors(roleMap);
    
    return {
      name,
      type: 'dark',
      colors: themeColors,
      tokenColors,
    };
  } catch (error) {
    throw new FileProcessingError(
      `Failed to build VS Code theme: ${(error as Error).message}`,
      { themeName, filePath }
    );
  }
};

// ============================================================================
// Color Palette Extraction
// ============================================================================

/**
 * Extracts a color palette for preview purposes
 */
export const extractColorPalette = (colors: GhosttyColors) => {
  const roleMap = createColorRoleMap(colors);
  
  return {
    primary: {
      background: colors.background || roleMap.black.hex,
      foreground: colors.foreground || roleMap.brightWhite.hex,
      cursor: colors.cursor || colors.cursor_text || roleMap.brightWhite.hex,
    },
    colors: [
      { name: 'Black', value: roleMap.black.hex, bright: roleMap.brightBlack.hex },
      { name: 'Red', value: roleMap.red.hex, bright: roleMap.brightRed.hex },
      { name: 'Green', value: roleMap.green.hex, bright: roleMap.brightGreen.hex },
      { name: 'Yellow', value: roleMap.yellow.hex, bright: roleMap.brightYellow.hex },
      { name: 'Blue', value: roleMap.blue.hex, bright: roleMap.brightBlue.hex },
      { name: 'Magenta', value: roleMap.magenta.hex, bright: roleMap.brightMagenta.hex },
      { name: 'Cyan', value: roleMap.cyan.hex, bright: roleMap.brightCyan.hex },
      { name: 'White', value: roleMap.white.hex, bright: roleMap.brightWhite.hex },
    ]
  };
};

// ============================================================================
// Export all functions - main exports already declared above
// ============================================================================
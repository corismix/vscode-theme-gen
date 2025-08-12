/**
 * Theme generation functions for converting Ghostty themes to VS Code themes
 *
 * This module provides comprehensive functionality for parsing Ghostty terminal theme files
 * and converting them to VS Code color themes with full workbench and token color support.
 *
 * Features:
 * - Secure file parsing with validation and sanitization
 * - Comprehensive color mapping from terminal colors to editor colors
 * - Token color generation for syntax highlighting
 * - Color role mapping for semantic color usage
 * - Theme name resolution from multiple sources
 * - Color palette extraction for previews
 *
 * @fileoverview Ghostty to VS Code theme conversion with comprehensive validation
 * @since 1.0.0
 */

import { basename } from 'path';
import {
  GhosttyColors,
  VSCodeTheme,
  VSCodeThemeColors,
  TokenColor,
  ColorRoleMap,
  ParsedThemeFile,
  ColorValidationResult as FileValidationResult,
  FileProcessingError,
  ValidationError,
} from '@/types';
import { FILE_LIMITS, SECURITY_LIMITS } from '@/config';

// ============================================================================
// Constants
// ============================================================================

// Configuration constants now imported from centralized config
// These remain as constants for easy access in this module
const MAX_FILE_SIZE_BYTES = FILE_LIMITS.MAX_SIZE_BYTES;
const MAX_LINES = FILE_LIMITS.MAX_LINES;
const MAX_CONFIG_LINES = FILE_LIMITS.MAX_CONFIG_LINES;
const MAX_KEY_LENGTH = SECURITY_LIMITS.MAX_KEY_LENGTH;
const MAX_VALUE_LENGTH = SECURITY_LIMITS.MAX_VALUE_LENGTH;

const VALID_COLOR_KEYS = [
  'background',
  'foreground',
  'cursor',
  'cursor_text',
  'cursor-text',
  'selection_background',
  'selection_foreground',
  'selection-background',
  'selection-foreground',
  'cursor-color',
] as const;

const COLOR_KEY_REGEX = /^color\d+$/;
const PALETTE_REGEX = /^palette\s*=\s*(\d+)\s*=\s*(.+)$/;
const LINE_REGEX = /^(\w+)[\s=:]+(.+)$/;
const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a key is a valid GhosttyColors key
 *
 * Validates whether a string key corresponds to a valid Ghostty color property.
 * Accepts standard color names, numbered color keys, and palette entries.
 *
 * @param key - The key to validate
 * @returns True if the key is valid for Ghostty colors
 *
 * @example
 * ```typescript
 * isValidGhosttyColorKey('background'); // true
 * isValidGhosttyColorKey('color0'); // true
 * isValidGhosttyColorKey('invalid'); // false
 * ```
 *
 * @since 1.0.0
 */
const isValidGhosttyColorKey = (key: string): boolean => {
  return (
    (VALID_COLOR_KEYS as readonly string[]).includes(key) ||
    COLOR_KEY_REGEX.test(key) ||
    key.startsWith('color')
  );
};

/**
 * Safely assigns a color value to a colors object using type guards
 *
 * Validates the key and assigns the color value to the colors object.
 * Logs warnings for unknown keys but doesn't throw to maintain parsing resilience.
 *
 * @param colors - The Ghostty colors object to modify
 * @param key - The color key to assign
 * @param value - The color value to assign
 *
 * @example
 * ```typescript
 * const colors: GhosttyColors = {};
 * safeAssignColor(colors, 'background', '#000000');
 * safeAssignColor(colors, 'invalid_key', '#ffffff'); // Logs warning, doesn't assign
 * ```
 *
 * @since 1.0.0
 */
const safeAssignColor = (colors: GhosttyColors, key: string, value: string): void => {
  if (!isValidGhosttyColorKey(key)) {
    // Log warning for unknown keys but don't throw
    console.warn(`Unknown color key ignored: ${key}`);
    return;
  }

  // Safe assignment with known key using index signature
  (colors as Record<string, string>)[key] = value;
};

/**
 * Validates if a string is a valid hex color
 *
 * Checks if the provided string matches the standard hex color format
 * supporting both 3-digit (#RGB) and 6-digit (#RRGGBB) formats.
 *
 * @param color - The color string to validate
 * @returns True if the color is a valid hex format
 *
 * @example
 * ```typescript
 * isValidHexColor('#ff0000'); // true
 * isValidHexColor('#f00'); // true
 * isValidHexColor('red'); // false
 * isValidHexColor('#gg0000'); // false
 * ```
 *
 * @since 1.0.0
 */
const isValidHexColor = (color: string): boolean => {
  return HEX_COLOR_REGEX.test(color);
};

/**
 * Sanitizes and validates a color value with security checks
 *
 * Performs comprehensive sanitization of color values including:
 * - Removal of dangerous characters for security
 * - Length validation
 * - Automatic hex prefix addition for valid patterns
 * - Final format validation
 *
 * @param value - The color value to sanitize
 * @param key - Optional key name for debugging/logging
 * @returns Sanitized color value in lowercase hex format, or null if invalid
 *
 * @example
 * ```typescript
 * sanitizeColorValue('ff0000'); // '#ff0000'
 * sanitizeColorValue('#FF0000'); // '#ff0000'
 * sanitizeColorValue('invalid'); // null
 * sanitizeColorValue('red<script>'); // null (dangerous characters)
 * ```
 *
 * @since 1.0.0
 */
const sanitizeColorValue = (value: string, key?: string): string | null => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  try {
    // Basic security validation - remove dangerous characters
    const cleaned = value.replace(/[;<>"'\\]/g, '').trim();

    if (cleaned.length === 0 || cleaned.length > MAX_VALUE_LENGTH) {
      return null;
    }

    let sanitized = cleaned;

    // Add # prefix if missing for valid hex patterns
    if (sanitized.length === 6 && /^[0-9a-fA-F]{6}$/.test(sanitized)) {
      sanitized = `#${sanitized}`;
    } else if (sanitized.length === 3 && /^[0-9a-fA-F]{3}$/.test(sanitized)) {
      sanitized = `#${sanitized}`;
    }

    // Validate the final color format
    if (!isValidHexColor(sanitized)) {
      return null;
    }

    return sanitized.toLowerCase();
  } catch (error) {
    console.warn(`Color sanitization failed for key ${key}: ${error}`);
    return null;
  }
};

// ============================================================================
// File Reading Functions
// ============================================================================

/**
 * Basic file path validation
 */
const validateFilePath = (filePath: string): string => {
  if (typeof filePath !== 'string' || !filePath.trim()) {
    throw new ValidationError('Invalid file path provided');
  }

  // Basic security check - prevent path traversal
  if (filePath.includes('..') || filePath.includes('\0')) {
    throw new ValidationError('Invalid file path: path traversal detected');
  }

  return filePath.trim();
};

/**
 * Reads text content from a theme file with comprehensive validation
 *
 * Securely reads and validates a theme file with size limits, path validation,
 * and comprehensive error handling. Prevents path traversal attacks and
 * validates file size constraints.
 *
 * @param filePath - Path to the theme file to read
 * @returns Promise resolving to the file content as a string
 *
 * @throws {ValidationError} When file path is invalid or contains path traversal
 * @throws {FileProcessingError} When file is too large or cannot be read
 *
 * @example
 * ```typescript
 * try {
 *   const content = await readThemeFile('./my-theme.txt');
 *   console.log('File content loaded');
 * } catch (error) {
 *   if (error instanceof FileProcessingError) {
 *     console.error('File processing failed:', error.message);
 *     console.log('Suggestions:', error.suggestions);
 *   }
 * }
 * ```
 *
 * @since 1.0.0
 */
export const readThemeFile = async (filePath: string): Promise<string> => {
  const validatedPath = validateFilePath(filePath);

  try {
    // Use dynamic import to avoid issues with bundling
    const { readFile } = await import('fs/promises');
    const content = await readFile(validatedPath, 'utf8');

    // Validate file size
    if (content.length > MAX_FILE_SIZE_BYTES) {
      throw new FileProcessingError(
        'File is too large',
        { fileSize: content.length, maxSize: MAX_FILE_SIZE_BYTES },
        [
          'Choose a smaller file',
          `File must be under ${(MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(1)}MB`,
        ],
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
      ['Check that the file exists', 'Verify file permissions', 'Ensure file is readable'],
    );
  }
};

// ============================================================================
// Theme Parsing Functions
// ============================================================================

/**
 * Parses a Ghostty theme file into structured data with validation
 *
 * Comprehensively parses a Ghostty theme file extracting color definitions,
 * metadata, and providing validation results. Supports multiple Ghostty formats
 * including palette entries and standard key-value pairs.
 *
 * Parsing features:
 * - Support for palette format: `palette = N=#color`
 * - Support for standard format: `key = value`
 * - Color validation and sanitization
 * - Metadata extraction
 * - Line count and size validation
 * - Comprehensive warning and error reporting
 *
 * @param filePath - Path to the Ghostty theme file
 * @returns Promise resolving to parsed theme data with validation results
 *
 * @throws {ValidationError} When file format or content is invalid
 * @throws {FileProcessingError} When file cannot be processed
 *
 * @example
 * ```typescript
 * const parsed = await parseThemeFile('./dark-theme.txt');
 * if (parsed.validation.isValid) {
 *   console.log('Colors found:', Object.keys(parsed.colors).length);
 *   console.log('Background:', parsed.colors.background);
 * }
 * if (parsed.validation.warnings?.length) {
 *   console.warn('Warnings:', parsed.validation.warnings);
 * }
 * ```
 *
 * @since 1.0.0
 */
export const parseThemeFile = async (filePath: string): Promise<ParsedThemeFile> => {
  const validation: FileValidationResult = {
    isValid: true,
    warnings: [],
  };

  try {
    const content = (await readThemeFile(filePath)).trim();
    const lines = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && !line.startsWith('//'));

    // Validate line count
    if (lines.length > MAX_LINES) {
      throw new ValidationError(`Too many lines in file (maximum ${MAX_LINES})`, {
        lineCount: lines.length,
        maxLines: MAX_LINES,
      });
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
        const colorKey = `color${paletteNumber}`;
        const sanitizedColor = sanitizeColorValue(colorValue?.trim() ?? '', colorKey);

        if (sanitizedColor) {
          safeAssignColor(colors, colorKey, sanitizedColor);
        } else {
          validation.warnings?.push(`Invalid color value for ${colorKey}: ${colorValue}`);
        }
        continue;
      }

      // Check for regular format: key = value
      const match = line.match(LINE_REGEX);
      if (match) {
        const [, key, value] = match;
        const trimmedKey = key?.trim() ?? '';
        const trimmedValue = value?.trim() ?? '';

        // Validate key length
        if (trimmedKey.length > MAX_KEY_LENGTH) {
          validation.warnings?.push(
            `Skipping line with overly long key: ${trimmedKey.substring(0, 20)}...`,
          );
          continue;
        }

        if (COLOR_KEY_REGEX.test(trimmedKey)) {
          const sanitizedColor = sanitizeColorValue(trimmedValue, trimmedKey);
          if (sanitizedColor) {
            safeAssignColor(colors, trimmedKey, sanitizedColor);
          } else {
            validation.warnings?.push(`Invalid color value for ${trimmedKey}: ${trimmedValue}`);
          }
        } else if ((VALID_COLOR_KEYS as readonly string[]).includes(trimmedKey)) {
          const sanitizedColor = sanitizeColorValue(trimmedValue, trimmedKey);
          if (sanitizedColor) {
            // Normalize key names (convert hyphens to underscores for consistency)
            const normalizedKey = trimmedKey.replace(/-/g, '_');
            safeAssignColor(colors, normalizedKey, sanitizedColor);
          } else {
            validation.warnings?.push(`Invalid color value for ${trimmedKey}: ${trimmedValue}`);
          }
        } else {
          // For meta values, limit length and sanitize
          const sanitizedValue =
            trimmedValue.length > MAX_VALUE_LENGTH
              ? trimmedValue.substring(0, MAX_VALUE_LENGTH)
              : trimmedValue;
          meta[trimmedKey] = sanitizedValue;
        }
      }
    }

    // Get file metadata using simple stat
    try {
      const { stat } = await import('fs/promises');
      const fileStats = await stat(filePath);

      return {
        colors,
        metadata: {
          fileName: basename(filePath),
          filePath,
          fileSize: fileStats.size,
          lineCount: content.split('\n').length,
          lastModified: fileStats.mtime,
        },
      };
    } catch (statError) {
      // If stat fails, return without metadata
      return {
        colors,
        metadata: {
          fileName: basename(filePath),
          filePath,
          fileSize: content.length,
          lineCount: content.split('\n').length,
          lastModified: new Date(),
        },
      };
    }
  } catch (error) {
    if (error instanceof FileProcessingError || error instanceof ValidationError) {
      throw error;
    }

    throw new FileProcessingError(`Failed to parse theme file: ${(error as Error).message}`, {
      filePath,
    });
  }
};

// ============================================================================
// Color Role Mapping
// ============================================================================

/**
 * Maps parsed colors to semantic roles with usage descriptions
 *
 * Creates a comprehensive mapping of terminal colors to semantic roles
 * with descriptive names and usage suggestions for each color. Provides
 * fallback colors for missing entries.
 *
 * @param colors - Parsed Ghostty colors object
 * @returns ColorRoleMap with semantic color assignments and usage descriptions
 *
 * @example
 * ```typescript
 * const roleMap = createColorRoleMap(parsedColors);
 * console.log(roleMap.red.name); // 'Red'
 * console.log(roleMap.red.hex); // '#ff0000'
 * console.log(roleMap.red.usage); // ['Errors', 'Keywords', 'Warnings']
 * ```
 *
 * @since 1.0.0
 */
export const createColorRoleMap = (colors: GhosttyColors): ColorRoleMap => {
  return {
    black: {
      name: 'Black',
      hex: colors.color0 || '#000000',
      usage: ['Terminal black', 'Dark backgrounds', 'Shadows'],
    },
    red: {
      name: 'Red',
      hex: colors.color1 || '#ff0000',
      usage: ['Errors', 'Keywords', 'Warnings'],
    },
    green: {
      name: 'Green',
      hex: colors.color2 || '#00ff00',
      usage: ['Strings', 'Success messages', 'Growth indicators'],
    },
    yellow: {
      name: 'Yellow',
      hex: colors.color3 || '#ffff00',
      usage: ['Functions', 'Warnings', 'Highlights'],
    },
    blue: {
      name: 'Blue',
      hex: colors.color4 || '#0000ff',
      usage: ['Keywords', 'Links', 'Selection'],
    },
    magenta: {
      name: 'Magenta',
      hex: colors.color5 || '#ff00ff',
      usage: ['Constants', 'Numbers', 'Special characters'],
    },
    cyan: {
      name: 'Cyan',
      hex: colors.color6 || '#00ffff',
      usage: ['Classes', 'Types', 'Info messages'],
    },
    white: {
      name: 'White',
      hex: colors.color7 || '#ffffff',
      usage: ['Text', 'Light backgrounds', 'Highlights'],
    },
    brightBlack: {
      name: 'Bright Black',
      hex: colors.color8 || '#808080',
      usage: ['Comments', 'Disabled text', 'Borders'],
    },
    brightRed: {
      name: 'Bright Red',
      hex: colors.color9 || '#ff8080',
      usage: ['Critical errors', 'Urgent warnings'],
    },
    brightGreen: {
      name: 'Bright Green',
      hex: colors.color10 || '#80ff80',
      usage: ['Success confirmations', 'Positive indicators'],
    },
    brightYellow: {
      name: 'Bright Yellow',
      hex: colors.color11 || '#ffff80',
      usage: ['Active highlights', 'Important notes'],
    },
    brightBlue: {
      name: 'Bright Blue',
      hex: colors.color12 || '#8080ff',
      usage: ['Active links', 'Primary buttons'],
    },
    brightMagenta: {
      name: 'Bright Magenta',
      hex: colors.color13 || '#ff80ff',
      usage: ['Special constants', 'Accent colors'],
    },
    brightCyan: {
      name: 'Bright Cyan',
      hex: colors.color14 || '#80ffff',
      usage: ['Support functions', 'Helper text'],
    },
    brightWhite: {
      name: 'Bright White',
      hex: colors.color15 || '#ffffff',
      usage: ['Primary text', 'Main content'],
    },
    background: {
      name: 'Background',
      hex: colors.background || '#000000',
      usage: ['Editor background', 'Panel backgrounds'],
    },
    foreground: {
      name: 'Foreground',
      hex: colors.foreground || '#ffffff',
      usage: ['Main text', 'Default foreground'],
    },
    cursor: {
      name: 'Cursor',
      hex: colors.cursor || colors['cursor-color'] || '#ffffff',
      usage: ['Cursor indicator', 'Active position'],
    },
    selection: {
      name: 'Selection',
      hex: colors.selection_background || colors['selection-background'] || '#333333',
      usage: ['Selected text background', 'Highlights'],
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
 *
 * Generates a comprehensive VS Code color theme including editor colors,
 * workbench colors, and terminal colors. Maps semantic color roles to
 * specific VS Code UI elements with appropriate opacity and styling.
 *
 * @param roleMap - Simplified color role mapping
 * @returns Complete VS Code theme colors object
 *
 * @example
 * ```typescript
 * const roleMap = createSimpleRoleMap(colors);
 * const vscodeColors = buildVSCodeColors(roleMap);
 * console.log(vscodeColors['editor.background']); // '#000000'
 * console.log(vscodeColors['terminal.ansiRed']); // '#ff0000'
 * ```
 *
 * @since 1.0.0
 */
export const buildVSCodeColors = (
  roleMap: ReturnType<typeof createSimpleRoleMap>,
): VSCodeThemeColors => {
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
 *
 * Creates comprehensive token color definitions for syntax highlighting
 * across multiple programming languages. Includes base token colors and
 * specialized JSON rainbow coloring for enhanced JSON file readability.
 *
 * @param roleMap - Simplified color role mapping
 * @returns Array of token color definitions for VS Code themes
 *
 * @example
 * ```typescript
 * const tokenColors = buildTokenColors(roleMap);
 * // Token colors include:
 * // - Comments (italic, muted)
 * // - Strings (green)
 * // - Keywords (red)
 * // - Functions (yellow)
 * // - Classes (cyan)
 * // - JSON-specific coloring
 * ```
 *
 * @since 1.0.0
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
    {
      scope: 'punctuation.separator.dictionary.key-value.json',
      settings: { foreground: '#3ad4b7' },
    },
    { scope: 'punctuation.separator.dictionary.pair.json', settings: { foreground: '#e4e5df' } },
    { scope: 'punctuation.separator.array.json', settings: { foreground: '#e4e5df' } },
  ];

  return [...baseTokens, ...jsonTokens];
};

// ============================================================================
// Theme Name Resolution
// ============================================================================

/**
 * Resolves the theme name from various sources with priority handling
 *
 * Determines the theme name using a priority system:
 * 1. Explicit name parameter (highest priority)
 * 2. Name from theme file metadata
 * 3. Derived from filename (lowest priority)
 *
 * Applies formatting to filename-derived names by replacing separators
 * with spaces and applying title case.
 *
 * @param filePath - Path to the theme file
 * @param explicitName - Explicitly provided theme name (optional)
 * @param meta - Metadata extracted from theme file (optional)
 * @returns Resolved theme name
 *
 * @example
 * ```typescript
 * resolveThemeName('./dark_theme.txt'); // 'Dark Theme'
 * resolveThemeName('./theme.txt', 'My Custom Theme'); // 'My Custom Theme'
 * resolveThemeName('./theme.txt', undefined, { name: 'Meta Theme' }); // 'Meta Theme'
 * ```
 *
 * @since 1.0.0
 */
export const resolveThemeName = (
  filePath: string,
  explicitName?: string,
  meta?: Record<string, string>,
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
    return baseName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  } catch {
    return 'Unknown Theme';
  }
};

// ============================================================================
// Main Theme Building Function
// ============================================================================

/**
 * Builds a complete VS Code theme from parsed Ghostty data
 *
 * Orchestrates the complete theme building process by combining color role mapping,
 * workbench colors, token colors, and theme metadata into a complete VS Code theme.
 * This is the main function for theme generation.
 *
 * @param colors - Parsed Ghostty colors object
 * @param themeName - Name for the generated theme
 * @param filePath - Original file path for fallback naming (optional)
 * @returns Complete VS Code theme object ready for serialization
 *
 * @throws {FileProcessingError} When theme building fails
 *
 * @example
 * ```typescript
 * const parsed = await parseThemeFile('./theme.txt');
 * const theme = buildVSCodeTheme(
 *   parsed.colors,
 *   'My Dark Theme',
 *   './theme.txt'
 * );
 *
 * // Theme ready for VS Code
 * console.log(theme.name); // 'My Dark Theme'
 * console.log(theme.type); // 'dark'
 * console.log(theme.colors['editor.background']); // Background color
 * console.log(theme.tokenColors.length); // Number of token color rules
 * ```
 *
 * @since 1.0.0
 */
export const buildVSCodeTheme = (
  colors: GhosttyColors,
  themeName: string,
  filePath?: string,
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
    throw new FileProcessingError(`Failed to build VS Code theme: ${(error as Error).message}`, {
      themeName,
      filePath,
    });
  }
};

// ============================================================================
// Color Palette Extraction
// ============================================================================

/**
 * Extracts a color palette for preview purposes
 *
 * Creates a structured color palette suitable for UI previews and color
 * picker components. Organizes colors into primary colors (background,
 * foreground, cursor) and the 16-color terminal palette with bright variants.
 *
 * @param colors - Parsed Ghostty colors object
 * @returns Structured palette with primary colors and 16-color array
 *
 * @example
 * ```typescript
 * const palette = extractColorPalette(parsedColors);
 *
 * // Primary colors for main UI elements
 * console.log(palette.primary.background); // '#000000'
 * console.log(palette.primary.foreground); // '#ffffff'
 * console.log(palette.primary.cursor); // '#ffffff'
 *
 * // 16-color palette for terminal and syntax highlighting
 * palette.colors.forEach(color => {
 *   console.log(`${color.name}: ${color.value} / ${color.bright}`);
 * });
 * // Output: Red: #ff0000 / #ff8080
 * ```
 *
 * @since 1.0.0
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
    ],
  };
};

// ============================================================================
// Export all functions - main exports already declared above
// ============================================================================

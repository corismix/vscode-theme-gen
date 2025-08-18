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
  ColorValidationResult,
  FileProcessingError,
  ValidationError,
} from '@/types';
import { FILE_LIMITS, SECURITY_LIMITS } from '@/config';
import { fileUtils } from './utils-simple';

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
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Unknown color key ignored: ${key}`);
    }
    return;
  }

  // Safe assignment with known key using keyof assertion
  colors[key as keyof typeof colors] = value;
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
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Color sanitization failed for key ${key}: ${error}`);
    }
    return null;
  }
};

// ============================================================================
// File Reading Functions
// ============================================================================

/**
 * Enhanced file path validation with tilde expansion
 * Uses the same validation logic as FileStep for consistency
 */
const validateFilePath = (filePath: string): string => {
  if (typeof filePath !== 'string' || !filePath.trim()) {
    throw new ValidationError('Invalid file path provided');
  }

  // Use enhanced path validation from utils-simple
  const pathValidation = fileUtils.validateFilePath(filePath);
  if (!pathValidation.isValid) {
    throw new ValidationError(
      pathValidation.error || 'Invalid file path format',
      undefined,
      pathValidation.suggestions,
    );
  }

  // Return the normalized path with tilde expansion
  return pathValidation.normalizedPath || fileUtils.normalizePath(filePath);
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
        `File is too large (${(content.length / (1024 * 1024)).toFixed(1)}MB). Maximum size is ${(MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(1)}MB`,
        filePath,
      );
    }

    return content;
  } catch (error) {
    if (error instanceof FileProcessingError || error instanceof ValidationError) {
      throw error;
    }

    throw new FileProcessingError(
      `Failed to read file: ${(error as Error).message}`,
      filePath,
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
  const validation: ColorValidationResult = {
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
      throw new ValidationError(`Too many lines in file (${lines.length} lines, maximum ${MAX_LINES})`);
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

    throw new FileProcessingError(`Failed to parse theme file: ${(error as Error).message}`, filePath);
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

// Removed createSimpleRoleMap - using direct palette mapping instead

// ============================================================================
// Color Derivation and Helper Functions
// ============================================================================

/**
 * Converts hex color to RGB components
 * @param hex - Hex color string (with or without #)
 * @returns RGB components as [r, g, b] array
 */
const hexToRgb = (hex: string): [number, number, number] => {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    return [
      parseInt(cleanHex[0]! + cleanHex[0]!, 16),
      parseInt(cleanHex[1]! + cleanHex[1]!, 16),
      parseInt(cleanHex[2]! + cleanHex[2]!, 16),
    ];
  }
  return [
    parseInt(cleanHex.substring(0, 2), 16),
    parseInt(cleanHex.substring(2, 4), 16),
    parseInt(cleanHex.substring(4, 6), 16),
  ];
};

/**
 * Converts RGB components to hex color
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @returns Hex color string with # prefix
 */
const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * Lightens a color by mixing with white
 * @param hex - Source hex color
 * @param amount - Amount to lighten (0-1, where 1 is pure white)
 * @returns Lightened hex color
 */
const lighten = (hex: string, amount: number): string => {
  const [r, g, b] = hexToRgb(hex);
  const factor = Math.max(0, Math.min(1, amount));
  return rgbToHex(
    r + (255 - r) * factor,
    g + (255 - g) * factor,
    b + (255 - b) * factor,
  );
};

/**
 * Darkens a color by mixing with black
 * @param hex - Source hex color
 * @param amount - Amount to darken (0-1, where 1 is pure black)
 * @returns Darkened hex color
 */
const darken = (hex: string, amount: number): string => {
  const [r, g, b] = hexToRgb(hex);
  const factor = 1 - Math.max(0, Math.min(1, amount));
  return rgbToHex(r * factor, g * factor, b * factor);
};

/**
 * Adds opacity to a hex color with consistent pattern matching
 * @param hex - Source hex color
 * @param opacity - Opacity value (0-1)
 * @returns Hex color with opacity suffix (e.g., #ffffff40)
 */
const withOpacity = (hex: string, opacity: number): string => {
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255);
  const alphaHex = alpha.toString(16).padStart(2, '0');
  return `${hex}${alphaHex}`;
};

// withOpacity is the primary function for consistent opacity handling

// Background variants now calculated inline in buildVSCodeColors

// Foreground variants now calculated inline in buildVSCodeColors

// Removed createEnhancedRoleMap function - using direct palette mapping instead

// ============================================================================
// VS Code Theme Building
// ============================================================================

/**
 * Builds comprehensive VS Code workbench colors using direct palette mapping
 *
 * Implements the corrected algorithm based on Eidolon Root theme analysis.
 * Uses palette colors directly with proper background hierarchy:
 * - Editor/Panel/Terminal: palette[0]
 * - Activity/Sidebar/Status: background color
 * - Widgets: lighten(palette[0], 2%)
 * - Inputs: lighten(palette[0], 8%)
 *
 * @param colors - Parsed Ghostty colors object
 * @returns Complete VS Code theme colors object matching Eidolon Root pattern
 *
 * @since 2.0.0
 */
export const buildVSCodeColors = (colors: GhosttyColors): VSCodeThemeColors => {
  // Direct palette colors extraction
  const palette = {
    black: colors.color0 || '#000000',
    red: colors.color1 || '#ff0000',
    green: colors.color2 || '#00ff00',
    yellow: colors.color3 || '#ffff00',
    blue: colors.color4 || '#0000ff',
    magenta: colors.color5 || '#ff00ff',
    cyan: colors.color6 || '#00ffff',
    white: colors.color7 || '#ffffff',
    brightBlack: colors.color8 || '#808080',
    brightRed: colors.color9 || '#ff8080',
    brightGreen: colors.color10 || '#80ff80',
    brightYellow: colors.color11 || '#ffff80',
    brightBlue: colors.color12 || '#8080ff',
    brightMagenta: colors.color13 || '#ff80ff',
    brightCyan: colors.color14 || '#80ffff',
    brightWhite: colors.color15 || '#ffffff',
  };

  const bg = colors.background || '#000000';
  const fg = colors.foreground || '#ffffff';
  
  // Use palette[0] for editor, NOT background
  const editorBg = palette.black;
  const activityBg = bg;
  
  // Calculate derived colors
  const widgetBg = lighten(editorBg, 0.02);
  const inputBg = lighten(editorBg, 0.08);
  
  return {
    // ========================================================================
    // Editor Core Colors - Use palette[0] for editor background
    // ========================================================================
    'editor.background': editorBg,
    'editor.foreground': fg,
    'editorLineNumber.foreground': withOpacity(palette.brightBlack, 0.25),
    'editorLineNumber.activeForeground': fg,
    'editorCursor.foreground': palette.red,
    'editorCursor.background': editorBg,

    // ========================================================================
    // Editor Selections & Highlights - Use red with correct opacities
    // ========================================================================
    'editor.selectionBackground': withOpacity(palette.red, 0.25), // #f56b5c40
    'editor.selectionHighlightBackground': withOpacity(palette.red, 0.125), // #f56b5c20
    'editor.inactiveSelectionBackground': withOpacity(palette.red, 0.08),
    'editor.lineHighlightBackground': withOpacity(fg, 0.03),
    'editor.lineHighlightBorder': '#00000000',
    'editor.wordHighlightBackground': withOpacity(palette.brightBlue, 0.13),
    'editor.wordHighlightStrongBackground': withOpacity(palette.brightBlue, 0.19),
    'editor.wordHighlightBorder': '#00000000',
    'editor.wordHighlightStrongBorder': '#00000000',
    'editor.selectionForeground': fg,

    // ========================================================================
    // Find & Search - Use yellow with no opacity for borders
    // ========================================================================
    'editor.findMatchBackground': withOpacity(palette.yellow, 0.25),
    'editor.findMatchHighlightBackground': withOpacity(palette.yellow, 0.15),
    'editor.findRangeHighlightBackground': withOpacity(palette.yellow, 0.08),
    'editor.findMatchBorder': palette.yellow, // No opacity
    'editor.findMatchHighlightBorder': '#00000000',
    'editor.rangeHighlightBackground': withOpacity(palette.yellow, 0.13),
    'searchEditor.findMatchBackground': withOpacity(palette.yellow, 0.25),

    // ========================================================================
    // Bracket Matching & Guides - Use brightBlack with proper opacities
    // ========================================================================
    'editorBracketMatch.background': withOpacity(palette.brightBlack, 0.19),
    'editorBracketMatch.border': withOpacity(palette.brightBlack, 0.31),
    'editorBracketHighlight.foreground1': palette.brightCyan,
    'editorBracketHighlight.foreground2': palette.brightMagenta,
    'editorBracketHighlight.foreground3': palette.yellow,
    'editorBracketHighlight.foreground4': palette.brightBlue,
    'editorBracketHighlight.foreground5': palette.brightGreen,
    'editorBracketHighlight.foreground6': palette.brightRed,
    'editorBracketHighlight.unexpectedBracket.foreground': palette.red,

    // ========================================================================
    // Indent Guides - Use brightBlack with consistent opacity levels
    // ========================================================================
    'editorIndentGuide.background1': withOpacity(palette.brightBlack, 0.08),
    'editorIndentGuide.activeBackground1': withOpacity(palette.brightBlack, 0.25),
    'editorIndentGuide.background2': withOpacity(palette.brightBlack, 0.13),
    'editorIndentGuide.activeBackground2': withOpacity(palette.brightBlack, 0.27),
    'editorIndentGuide.background3': withOpacity(palette.brightBlack, 0.15),
    'editorIndentGuide.activeBackground3': withOpacity(palette.brightBlack, 0.31),
    'editorIndentGuide.background4': withOpacity(palette.brightBlack, 0.19),
    'editorIndentGuide.activeBackground4': withOpacity(palette.brightBlack, 0.33),
    'editorIndentGuide.background5': withOpacity(palette.brightBlack, 0.21),
    'editorIndentGuide.activeBackground5': withOpacity(palette.brightBlack, 0.38),
    'editorIndentGuide.background6': withOpacity(palette.brightBlack, 0.25),
    'editorIndentGuide.activeBackground6': withOpacity(palette.brightBlack, 0.40),
    'editorRuler.foreground': withOpacity(palette.brightBlack, 0.13),

    // ========================================================================
    // Whitespace & Special Characters
    // ========================================================================
    'editorWhitespace.foreground': withOpacity(palette.brightBlack, 0.13),
    'editorLink.activeForeground': palette.brightBlue,

    // ========================================================================
    // Editor Widgets (autocomplete, hover, etc) - Use calculated widget background
    // ========================================================================
    'editorWidget.background': widgetBg,
    'editorWidget.foreground': fg,
    'editorWidget.border': withOpacity(palette.brightBlack, 0.25),
    'editorWidget.resizeBorder': withOpacity(palette.brightBlack, 0.25),
    'editorSuggestWidget.background': widgetBg,
    'editorSuggestWidget.border': withOpacity(palette.brightBlack, 0.25),
    'editorSuggestWidget.foreground': fg,
    'editorSuggestWidget.highlightForeground': palette.yellow,
    'editorSuggestWidget.selectedBackground': withOpacity(palette.red, 0.13),
    'editorSuggestWidget.selectedForeground': fg,
    'editorSuggestWidget.focusHighlightForeground': palette.yellow,
    'editorSuggestWidget.selectedIconForeground': palette.yellow,
    'editorHoverWidget.background': widgetBg,
    'editorHoverWidget.border': withOpacity(palette.brightBlack, 0.25),
    'editorHoverWidget.foreground': fg,
    'editorHoverWidget.statusBarBackground': inputBg,

    // ========================================================================
    // Editor Markers & Decorations - Semantic colors with consistent mapping
    // ========================================================================
    'editorError.foreground': palette.red,
    'editorError.background': withOpacity(palette.red, 0.13),
    'editorError.border': '#00000000',
    'editorWarning.foreground': palette.yellow,
    'editorWarning.background': withOpacity(palette.yellow, 0.13),
    'editorWarning.border': '#00000000',
    'editorInfo.foreground': palette.brightBlue,
    'editorInfo.background': withOpacity(palette.brightBlue, 0.13),
    'editorInfo.border': '#00000000',
    'editorHint.foreground': palette.brightGreen,
    'editorHint.border': '#00000000',

    // ========================================================================
    // Gutter (Git, Folding, etc) - Use editor background and semantic colors
    // ========================================================================
    'editorGutter.background': editorBg,
    'editorGutter.modifiedBackground': palette.yellow,
    'editorGutter.addedBackground': palette.brightGreen,
    'editorGutter.deletedBackground': palette.red,
    'editorGutter.foldingControlForeground': withOpacity(palette.brightBlack, 0.38),
    'editorGutter.commentRangeForeground': withOpacity(palette.brightBlack, 0.38),

    // ========================================================================
    // Diff Editor - Git colors
    // ========================================================================
    'diffEditor.insertedTextBackground': withOpacity(palette.brightGreen, 0.13),
    'diffEditor.insertedTextBorder': '#00000000',
    'diffEditor.removedTextBackground': withOpacity(palette.red, 0.13),
    'diffEditor.removedTextBorder': '#00000000',
    'diffEditor.border': withOpacity(palette.brightBlack, 0.25),
    'diffEditor.diagonalFill': withOpacity(palette.brightBlack, 0.13),
    'diffEditor.insertedLineBackground': withOpacity(palette.brightGreen, 0.08),
    'diffEditor.removedLineBackground': withOpacity(palette.red, 0.08),

    // ========================================================================
    // Merge Editor
    // ========================================================================
    'merge.currentHeaderBackground': withOpacity(palette.brightBlue, 0.19),
    'merge.currentContentBackground': withOpacity(palette.brightBlue, 0.13),
    'merge.incomingHeaderBackground': withOpacity(palette.brightGreen, 0.19),
    'merge.incomingContentBackground': withOpacity(palette.brightGreen, 0.13),
    'merge.border': withOpacity(palette.brightBlack, 0.25),

    // ========================================================================
    // Editor Overview Ruler (Minimap Highlights)
    // ========================================================================
    'editorOverviewRuler.border': '#00000000',
    'editorOverviewRuler.findMatchForeground': withOpacity(palette.yellow, 0.50),
    'editorOverviewRuler.rangeHighlightForeground': withOpacity(palette.yellow, 0.38),
    'editorOverviewRuler.selectionHighlightForeground': withOpacity(palette.red, 0.38),
    'editorOverviewRuler.wordHighlightForeground': withOpacity(palette.brightBlue, 0.38),
    'editorOverviewRuler.wordHighlightStrongForeground': withOpacity(palette.brightBlue, 0.50),
    'editorOverviewRuler.modifiedForeground': withOpacity(palette.yellow, 0.50),
    'editorOverviewRuler.addedForeground': withOpacity(palette.brightGreen, 0.50),
    'editorOverviewRuler.deletedForeground': withOpacity(palette.red, 0.50),
    'editorOverviewRuler.errorForeground': withOpacity(palette.red, 0.50),
    'editorOverviewRuler.warningForeground': withOpacity(palette.yellow, 0.50),
    'editorOverviewRuler.infoForeground': withOpacity(palette.brightBlue, 0.50),
    'editorOverviewRuler.bracketMatchForeground': withOpacity(palette.brightBlack, 0.38),

    // ========================================================================
    // Activity Bar - Use background color, NOT palette[0]
    // ========================================================================
    'activityBar.background': activityBg,
    'activityBar.foreground': darken(fg, 0.15),
    'activityBar.inactiveForeground': withOpacity(palette.brightBlack, 0.50),
    'activityBar.border': '#00000000',
    'activityBar.activeBorder': palette.red,
    'activityBar.activeBackground': withOpacity(palette.red, 0.08),
    'activityBar.activeFocusBorder': palette.red,
    'activityBar.dropBorder': palette.red,
    'activityBarBadge.background': palette.red,
    'activityBarBadge.foreground': editorBg,
    'activityBarTop.foreground': fg,
    'activityBarTop.activeBorder': palette.red,
    'activityBarTop.inactiveForeground': withOpacity(palette.brightBlack, 0.50),
    'activityBarTop.dropBorder': palette.red,

    // ========================================================================
    // Sidebar - Use background color, NOT palette[0]
    // ========================================================================
    'sideBar.background': activityBg,
    'sideBar.foreground': darken(fg, 0.15),
    'sideBar.border': '#00000000',
    'sideBar.dropBackground': withOpacity(palette.red, 0.13),
    'sideBarTitle.foreground': darken(fg, 0.15),
    'sideBarSectionHeader.background': widgetBg,
    'sideBarSectionHeader.foreground': darken(fg, 0.15),
    'sideBarSectionHeader.border': '#00000000',

    // ========================================================================
    // List & Tree - Use red for selections and brightBlack for borders
    // ========================================================================
    'list.activeSelectionBackground': withOpacity(palette.red, 0.13),
    'list.activeSelectionForeground': darken(fg, 0.15),
    'list.activeSelectionIconForeground': fg,
    'list.inactiveSelectionBackground': withOpacity(palette.red, 0.08),
    'list.inactiveSelectionForeground': darken(fg, 0.15),
    'list.inactiveSelectionIconForeground': fg,
    'list.hoverBackground': withOpacity(palette.brightBlack, 0.13),
    'list.hoverForeground': darken(fg, 0.15),
    'list.focusBackground': withOpacity(palette.red, 0.13),
    'list.focusForeground': darken(fg, 0.15),
    'list.focusHighlightForeground': palette.yellow,
    'list.focusOutline': withOpacity(palette.red, 0.25),
    'list.focusAndSelectionOutline': withOpacity(palette.red, 0.38),
    'list.highlightForeground': palette.yellow,
    'list.dropBackground': withOpacity(palette.red, 0.13),
    'list.deemphasizedForeground': withOpacity(palette.brightBlack, 0.50),
    'list.errorForeground': palette.red,
    'list.warningForeground': palette.yellow,
    'tree.indentGuidesStroke': withOpacity(palette.brightBlack, 0.25),
    'tree.tableColumnsBorder': withOpacity(palette.brightBlack, 0.13),
    'tree.tableOddRowsBackground': withOpacity(palette.brightBlack, 0.03),

    // ========================================================================
    // Tabs - Editor uses palette[0], inactive uses background
    // ========================================================================
    'tab.activeBackground': editorBg,
    'tab.activeForeground': darken(fg, 0.15),
    'tab.border': '#00000000',
    'tab.activeBorder': '#00000000',
    'tab.activeBorderTop': palette.red,
    'tab.inactiveBackground': activityBg,
    'tab.inactiveForeground': withOpacity(palette.brightBlack, 0.50),
    'tab.hoverBackground': widgetBg,
    'tab.hoverForeground': darken(fg, 0.15),
    'tab.hoverBorder': '#00000000',
    'tab.unfocusedActiveBackground': editorBg,
    'tab.unfocusedActiveForeground': withOpacity(fg, 0.63),
    'tab.unfocusedActiveBorderTop': withOpacity(palette.red, 0.38),
    'tab.unfocusedInactiveBackground': activityBg,
    'tab.unfocusedInactiveForeground': withOpacity(palette.brightBlack, 0.38),
    'tab.unfocusedHoverBackground': widgetBg,
    'tab.unfocusedHoverForeground': fg,

    // Editor Group Header (Tab Container)
    'editorGroupHeader.tabsBackground': activityBg,
    'editorGroupHeader.tabsBorder': '#00000000',
    'editorGroupHeader.noTabsBackground': activityBg,

    // ========================================================================
    // Terminal Colors - Use palette[0] for terminal background
    // ========================================================================
    'terminal.background': editorBg,
    'terminal.foreground': fg,
    'terminal.ansiBlack': palette.black,
    'terminal.ansiRed': palette.red,
    'terminal.ansiGreen': palette.green,
    'terminal.ansiYellow': palette.yellow,
    'terminal.ansiBlue': palette.blue,
    'terminal.ansiMagenta': palette.magenta,
    'terminal.ansiCyan': palette.cyan,
    'terminal.ansiWhite': palette.white,
    'terminal.ansiBrightBlack': palette.brightBlack,
    'terminal.ansiBrightRed': palette.brightRed,
    'terminal.ansiBrightGreen': palette.brightGreen,
    'terminal.ansiBrightYellow': palette.brightYellow,
    'terminal.ansiBrightBlue': palette.brightBlue,
    'terminal.ansiBrightMagenta': palette.brightMagenta,
    'terminal.ansiBrightCyan': palette.brightCyan,
    'terminal.ansiBrightWhite': palette.brightWhite,
    'terminal.selectionBackground': withOpacity(palette.red, 0.25),
    'terminal.selectionForeground': fg,
    'terminalCursor.foreground': palette.red,
    'terminalCursor.background': editorBg,

    // ========================================================================
    // Notebook Colors - Fixed with direct palette colors
    // ========================================================================
    'notebook.cellBorderColor': withOpacity(palette.brightBlack, 0.25),
    'notebook.cellHoverBackground': withOpacity(palette.brightBlack, 0.08),
    'notebook.cellInsertionIndicator': palette.red,
    'notebook.cellStatusBarItemHoverBackground': withOpacity(palette.brightBlack, 0.13),
    'notebook.cellToolbarSeparator': withOpacity(palette.brightBlack, 0.25),
    'notebook.cellEditorBackground': widgetBg,
    'notebook.editorBackground': editorBg,
    'notebook.focusedCellBackground': widgetBg,
    'notebook.focusedCellBorder': palette.red,
    'notebook.focusedEditorBorder': palette.red,
    'notebook.inactiveFocusedCellBorder': withOpacity(palette.red, 0.38),
    'notebook.inactiveSelectedCellBorder': withOpacity(palette.brightBlack, 0.25),
    'notebook.outputContainerBackgroundColor': widgetBg,
    'notebook.outputContainerBorderColor': withOpacity(palette.brightBlack, 0.25),
    'notebook.selectedCellBackground': withOpacity(palette.red, 0.06),
    'notebook.selectedCellBorder': withOpacity(palette.brightBlack, 0.25),
    'notebook.symbolHighlightBackground': withOpacity(palette.yellow, 0.13),
    'notebookScrollbarSlider.activeBackground': withOpacity(palette.brightBlack, 0.38),
    'notebookScrollbarSlider.background': withOpacity(palette.brightBlack, 0.13),
    'notebookScrollbarSlider.hoverBackground': withOpacity(palette.brightBlack, 0.25),
    'notebookStatusErrorIcon.foreground': palette.red,
    'notebookStatusRunningIcon.foreground': palette.brightBlue,
    'notebookStatusSuccessIcon.foreground': palette.brightGreen,

    // ========================================================================
    // Debug Icon Colors - Fixed with palette colors
    // ========================================================================
    'debugIcon.breakpointForeground': palette.red,
    'debugIcon.breakpointDisabledForeground': withOpacity(palette.brightBlack, 0.50),
    'debugIcon.breakpointUnverifiedForeground': palette.yellow,
    'debugIcon.breakpointCurrentStackframeForeground': palette.brightGreen,
    'debugIcon.breakpointStackframeForeground': palette.brightBlue,
    'debugIcon.startForeground': palette.brightGreen,
    'debugIcon.pauseForeground': palette.brightBlue,
    'debugIcon.stopForeground': palette.red,
    'debugIcon.disconnectForeground': palette.red,
    'debugIcon.restartForeground': palette.brightGreen,
    'debugIcon.stepOverForeground': palette.brightBlue,
    'debugIcon.stepIntoForeground': palette.brightBlue,
    'debugIcon.stepOutForeground': palette.brightBlue,
    'debugIcon.continueForeground': palette.brightGreen,
    'debugIcon.stepBackForeground': palette.brightBlue,

    // ========================================================================
    // Debug Console Colors - Fixed with palette colors
    // ========================================================================
    'debugConsole.infoForeground': palette.brightBlue,
    'debugConsole.warningForeground': palette.yellow,
    'debugConsole.errorForeground': palette.red,
    'debugConsole.sourceForeground': fg,
    'debugConsoleInputIcon.foreground': fg,

    // ========================================================================
    // Testing Colors - Fixed with palette colors
    // ========================================================================
    'testing.iconFailed': palette.red,
    'testing.iconErrored': palette.red,
    'testing.iconPassed': palette.brightGreen,
    'testing.runAction': palette.brightGreen,
    'testing.iconQueued': palette.yellow,
    'testing.iconUnset': withOpacity(palette.brightBlack, 0.50),
    'testing.iconSkipped': withOpacity(palette.brightBlack, 0.50),
    'testing.peekBorder': palette.red,
    'testing.peekHeaderBackground': withOpacity(palette.red, 0.13),
    'testing.message.error.lineBackground': withOpacity(palette.red, 0.13),
    'testing.message.info.lineBackground': withOpacity(palette.brightBlue, 0.13),

    // ========================================================================
    // Welcome Page Colors - Fixed with palette colors
    // ========================================================================
    'welcomePage.background': editorBg,
    'welcomePage.progress.background': withOpacity(palette.brightBlack, 0.13),
    'welcomePage.progress.foreground': palette.red,
    'welcomePage.tileBackground': widgetBg,
    'welcomePage.tileHoverBackground': inputBg,
    'welcomePage.tileBorder': withOpacity(palette.brightBlack, 0.25),
    'walkThrough.embeddedEditorBackground': widgetBg,
    'walkthrough.stepTitle.foreground': darken(fg, 0.15),

    // ========================================================================
    // Git Decoration Colors - Standard git semantics
    // ========================================================================
    'gitDecoration.addedResourceForeground': palette.brightGreen,
    'gitDecoration.modifiedResourceForeground': palette.yellow,
    'gitDecoration.deletedResourceForeground': palette.red,
    'gitDecoration.renamedResourceForeground': palette.brightBlue,
    'gitDecoration.stageModifiedResourceForeground': palette.yellow,
    'gitDecoration.stageDeletedResourceForeground': palette.red,
    'gitDecoration.untrackedResourceForeground': palette.brightGreen,
    'gitDecoration.ignoredResourceForeground': withOpacity(palette.brightBlack, 0.38),
    'gitDecoration.conflictingResourceForeground': palette.brightMagenta,
    'gitDecoration.submoduleResourceForeground': palette.brightBlue,

    // ========================================================================
    // Settings Editor Colors - Fixed with palette colors
    // ========================================================================
    'settings.headerForeground': fg,
    'settings.modifiedItemIndicator': palette.yellow,
    'settings.dropdownBackground': lighten(editorBg, 0.06),
    'settings.dropdownForeground': fg,
    'settings.dropdownBorder': withOpacity(palette.brightBlack, 0.25),
    'settings.dropdownListBorder': withOpacity(palette.brightBlack, 0.25),
    'settings.checkboxBackground': lighten(editorBg, 0.06),
    'settings.checkboxForeground': fg,
    'settings.checkboxBorder': withOpacity(palette.brightBlack, 0.25),
    'settings.textInputBackground': lighten(editorBg, 0.06),
    'settings.textInputForeground': fg,
    'settings.textInputBorder': withOpacity(palette.brightBlack, 0.25),
    'settings.numberInputBackground': lighten(editorBg, 0.06),
    'settings.numberInputForeground': fg,
    'settings.numberInputBorder': withOpacity(palette.brightBlack, 0.25),
    'settings.focusedRowBackground': withOpacity(palette.brightCyan, 0.08),
    'settings.rowHoverBackground': withOpacity(fg, 0.05),

    // ========================================================================
    // Peek View Colors - Fixed with palette colors
    // ========================================================================
    'peekView.border': palette.brightCyan,
    'peekViewEditor.background': lighten(editorBg, 0.06),
    'peekViewEditorGutter.background': lighten(editorBg, 0.06),
    'peekViewResult.background': lighten(editorBg, 0.06),
    'peekViewResult.fileForeground': fg,
    'peekViewResult.lineForeground': darken(fg, 0.15),
    'peekViewResult.matchHighlightBackground': withOpacity(palette.yellow, 0.25),
    'peekViewResult.selectionBackground': withOpacity(palette.brightCyan, 0.15),
    'peekViewResult.selectionForeground': fg,
    'peekViewTitle.background': activityBg,
    'peekViewTitleDescription.foreground': darken(fg, 0.15),
    'peekViewTitleLabel.foreground': fg,
    'peekViewEditor.matchHighlightBackground': withOpacity(palette.yellow, 0.25),

    // ========================================================================
    // Status Bar - Use background color, NOT palette[0]
    // ========================================================================
    'statusBar.background': activityBg,
    'statusBar.foreground': darken(fg, 0.15),
    'statusBar.border': '#00000000',
    'statusBar.debuggingBackground': withOpacity(palette.yellow, 0.75),
    'statusBar.debuggingForeground': editorBg,
    'statusBar.noFolderBackground': activityBg,
    'statusBar.noFolderForeground': darken(fg, 0.15),
    'statusBarItem.activeBackground': withOpacity(fg, 0.13),
    'statusBarItem.hoverBackground': withOpacity(fg, 0.08),
    'statusBarItem.prominentBackground': withOpacity(palette.red, 0.75),
    'statusBarItem.prominentForeground': editorBg,
    'statusBarItem.prominentHoverBackground': withOpacity(palette.red, 0.88),

    // Title Bar - Use background color
    'titleBar.activeBackground': activityBg,
    'titleBar.activeForeground': darken(fg, 0.15),
    'titleBar.inactiveBackground': activityBg,
    'titleBar.inactiveForeground': withOpacity(palette.brightBlack, 0.50),
    'titleBar.border': '#00000000',

    // Input Controls - Use calculated input background
    'input.background': inputBg,
    'input.foreground': darken(fg, 0.15),
    'input.border': withOpacity(palette.brightBlack, 0.25),
    'input.placeholderForeground': withOpacity(palette.brightBlack, 0.50),
    'inputOption.activeBackground': withOpacity(palette.brightBlue, 0.31),
    'inputOption.activeForeground': fg,
    'inputOption.hoverBackground': withOpacity(palette.brightBlue, 0.13),

    // Dropdown - Use input background
    'dropdown.background': inputBg,
    'dropdown.foreground': darken(fg, 0.15),
    'dropdown.border': withOpacity(palette.brightBlack, 0.25),
    'dropdown.listBackground': widgetBg,

    // Button - Use red for primary buttons
    'button.background': palette.red,
    'button.foreground': editorBg,
    'button.hoverBackground': lighten(palette.red, 0.1),
    'button.border': '#00000000',
    'button.secondaryBackground': withOpacity(palette.brightBlack, 0.25),
    'button.secondaryForeground': darken(fg, 0.15),
    'button.secondaryHoverBackground': withOpacity(palette.brightBlack, 0.38),

    // Badge - Use red
    'badge.background': palette.red,
    'badge.foreground': editorBg,

    // Progress Bar - Use red
    'progressBar.background': palette.red,

    // Panel (Terminal, Output, Problems) - Use palette[0]
    'panel.background': editorBg,
    'panel.border': withOpacity(palette.brightBlack, 0.25),
    'panel.dropBorder': palette.red,
    'panelTitle.activeBorder': palette.red,
    'panelTitle.activeForeground': darken(fg, 0.15),
    'panelTitle.inactiveForeground': withOpacity(palette.brightBlack, 0.50),

    // Scrollbar
    'scrollbar.shadow': withOpacity('#000000', 0.25),
    'scrollbarSlider.background': withOpacity(palette.brightBlack, 0.13),
    'scrollbarSlider.activeBackground': withOpacity(palette.brightBlack, 0.38),
    'scrollbarSlider.hoverBackground': withOpacity(palette.brightBlack, 0.25),

    // ========================================================================
    // Extended UI Properties (missing from current generator)
    // ========================================================================
    'editor.wordHighlightText.background': withOpacity(palette.brightBlue, 0.13),
    'editor.wordHighlightText.border': '#00000000',
    'editor.wordHighlightStrong.background': withOpacity(palette.brightBlue, 0.19),
    'editor.wordHighlightStrong.border': '#00000000',
    
    // Breadcrumb properties
    'breadcrumb.foreground': withOpacity(fg, 0.63),
    'breadcrumb.background': editorBg,
    'breadcrumb.focusForeground': fg,
    'breadcrumb.activeSelectionForeground': palette.yellow,
    'breadcrumbPicker.background': widgetBg,
    
    // Minimap properties
    'minimap.background': editorBg,
    'minimap.findMatchHighlight': withOpacity(palette.yellow, 0.50),
    'minimap.selectionHighlight': withOpacity(palette.red, 0.50),
    'minimap.errorHighlight': withOpacity(palette.red, 0.50),
    'minimap.warningHighlight': withOpacity(palette.yellow, 0.50),
    'minimap.selectionOccurrenceHighlight': withOpacity(palette.red, 0.38),
    
    // Menu properties
    'menu.foreground': fg,
    'menu.background': widgetBg,
    'menu.selectionForeground': fg,
    'menu.selectionBackground': withOpacity(palette.red, 0.13),
    'menu.selectionBorder': '#00000000',
    'menu.separatorBackground': withOpacity(palette.brightBlack, 0.25),
    'menu.border': withOpacity(palette.brightBlack, 0.25),
    
    // Notification properties
    'notificationCenter.border': withOpacity(palette.brightBlack, 0.25),
    'notificationCenterHeader.foreground': fg,
    'notificationCenterHeader.background': widgetBg,
    'notificationToast.border': withOpacity(palette.brightBlack, 0.25),
    'notifications.foreground': fg,
    'notifications.background': widgetBg,
    'notifications.border': withOpacity(palette.brightBlack, 0.25),
    'notificationLink.foreground': palette.brightBlue,
    'notificationsErrorIcon.foreground': palette.red,
    'notificationsWarningIcon.foreground': palette.yellow,
    'notificationsInfoIcon.foreground': palette.brightBlue,
    
    // Extension properties
    'extensionButton.prominentForeground': editorBg,
    'extensionButton.prominentBackground': palette.red,
    'extensionButton.prominentHoverBackground': lighten(palette.red, 0.1),
    'extensionButton.separator': withOpacity(palette.brightBlack, 0.25),
    'extensionBadge.remoteBackground': palette.brightBlue,
    'extensionBadge.remoteForeground': editorBg,
    
    // Quick Input properties
    'quickInput.background': widgetBg,
    'quickInput.foreground': fg,
    'quickInputList.focusBackground': withOpacity(palette.red, 0.13),
    'quickInputList.focusForeground': fg,
    'quickInputList.focusIconForeground': fg,
    'quickInputTitle.background': lighten(widgetBg, 0.02),
    
    // Simple Find Widget properties
    'simpleFindWidget.sashBorder': withOpacity(palette.brightBlack, 0.25),
    
    // Profile Badge properties
    'profileBadge.background': palette.red,
    'profileBadge.foreground': editorBg,
    
    // Action Bar properties
    'actionBar.toggledBackground': withOpacity(palette.red, 0.13),
    
    // Comments properties
    'comments.openIcon': palette.brightBlue,
    'commentsView.header.background': widgetBg,
    'commentsView.resolvedIcon': palette.brightGreen,
    'commentsView.unresolvedIcon': palette.yellow,
    
    // Ports properties
    'ports.iconRunningProcessForeground': palette.brightGreen,
    
    // Additional essential properties that might be expected
    'editor.hoverHighlightBackground': withOpacity(palette.brightBlack, 0.13),
    'editor.linkedEditingBackground': withOpacity(palette.brightBlue, 0.13),
    'editor.inlineValuesBackground': withOpacity(palette.brightCyan, 0.08),
    'editor.inlineValuesForeground': palette.brightCyan,
    'editor.snippetTabstopHighlightBackground': withOpacity(palette.brightBlue, 0.13),
    'editor.snippetTabstopHighlightBorder': palette.brightBlue,
    'editor.snippetFinalTabstopHighlightBackground': withOpacity(palette.brightGreen, 0.13),
    'editor.snippetFinalTabstopHighlightBorder': palette.brightGreen,
    'workbench.colorTheme': 'dark' as const,

  } as VSCodeThemeColors;
};

/**
 * Builds comprehensive token colors using direct palette mapping
 *
 * Implements the corrected algorithm based on Eidolon Root theme analysis.
 * Uses direct palette color mappings:
 * 1. Comments: palette[8] (brightBlack) with italic
 * 2. Keywords & Storage: palette[10] (brightGreen)
 * 3. Strings: palette[1] (red)
 * 4. Functions: palette[12] (brightBlue)
 * 5. Classes/Types: palette[5] (magenta)
 * 6. Numbers/Constants: palette[9] (brightRed)
 * 7. Operators/Punctuation: palette[6] (cyan)
 * 8. Tags: palette[11] (brightYellow)
 * 9. Variables: foreground color
 * 10. Support Types: palette[14] (brightCyan)
 *
 * @param colors - Parsed Ghostty colors object
 * @returns Array of token color definitions matching Eidolon Root pattern
 *
 * @since 2.0.0
 */
export const buildTokenColors = (colors: GhosttyColors): TokenColor[] => {
  // Direct palette colors extraction
  const palette = {
    black: colors.color0 || '#000000',
    red: colors.color1 || '#ff0000',
    green: colors.color2 || '#00ff00',
    yellow: colors.color3 || '#ffff00',
    blue: colors.color4 || '#0000ff',
    magenta: colors.color5 || '#ff00ff',
    cyan: colors.color6 || '#00ffff',
    white: colors.color7 || '#ffffff',
    brightBlack: colors.color8 || '#808080',
    brightRed: colors.color9 || '#ff8080',
    brightGreen: colors.color10 || '#80ff80',
    brightYellow: colors.color11 || '#ffff80',
    brightBlue: colors.color12 || '#8080ff',
    brightMagenta: colors.color13 || '#ff80ff',
    brightCyan: colors.color14 || '#80ffff',
    brightWhite: colors.color15 || '#ffffff',
  };

  const fg = colors.foreground || '#ffffff';

  const baseTokens: TokenColor[] = [
    // ========================================================================
    // Comments - palette[8] (brightBlack) with italic
    // ========================================================================
    {
      name: 'Comment',
      scope: [
        'comment',
        'punctuation.definition.comment'
      ],
      settings: {
        fontStyle: 'italic',
        foreground: palette.brightBlack,
      },
    },

    // ========================================================================
    // Variables - foreground color
    // ========================================================================
    {
      name: 'Variables',
      scope: [
        'variable',
        'string constant.other.placeholder'
      ],
      settings: {
        foreground: fg,
      },
    },
    // ========================================================================
    // Invalid Code - palette[1] (red) with underline
    // ========================================================================
    {
      name: 'Invalid',
      scope: [
        'invalid',
        'invalid.illegal'
      ],
      settings: {
        foreground: palette.red,
        fontStyle: 'underline',
      },
    },

    // ========================================================================
    // Keywords and Storage - palette[10] (brightGreen)
    // ========================================================================
    {
      name: 'Keyword, Storage',
      scope: [
        'keyword',
        'storage.type',
        'storage.modifier'
      ],
      settings: {
        foreground: palette.brightGreen,
      },
    },

    // ========================================================================
    // Operators and Punctuation - palette[6] (cyan)
    // ========================================================================
    {
      name: 'Operator, Misc',
      scope: [
        'keyword.control',
        'punctuation',
        'meta.tag',
        'punctuation.definition.tag',
        'punctuation.section.embedded',
        'keyword.other.template',
        'keyword.other.substitution'
      ],
      settings: {
        foreground: palette.cyan,
      },
    },

    // ========================================================================
    // Tags - palette[11] (brightYellow)
    // ========================================================================
    {
      name: 'Tag',
      scope: [
        'entity.name.tag',
        'meta.tag.sgml'
      ],
      settings: {
        foreground: palette.brightYellow,
      },
    },

    // ========================================================================
    // Functions and Methods - palette[12] (brightBlue)
    // ========================================================================
    {
      name: 'Function, Special Method',
      scope: [
        'entity.name.function',
        'meta.function-call',
        'variable.function',
        'support.function'
      ],
      settings: {
        foreground: palette.brightBlue,
      },
    },

    // ========================================================================
    // Strings - palette[1] (red)
    // ========================================================================
    {
      name: 'String, Symbols, Inherited Class',
      scope: [
        'string',
        'constant.other.symbol',
        'constant.other.key'
      ],
      settings: {
        foreground: palette.red,
      },
    },

    // ========================================================================
    // Numbers and Constants - palette[9] (brightRed)
    // ========================================================================
    {
      name: 'Number, Constant, Function Argument',
      scope: [
        'constant.numeric',
        'constant.language',
        'support.constant',
        'constant.character',
        'variable.parameter',
        'keyword.other.unit'
      ],
      settings: {
        foreground: palette.brightRed,
      },
    },

    // ========================================================================
    // Classes and Types - palette[5] (magenta)
    // ========================================================================
    {
      name: 'Class, Support',
      scope: [
        'entity.name',
        'support.type',
        'support.class',
        'support.type.sys-types'
      ],
      settings: {
        foreground: palette.magenta,
      },
    },

    // ========================================================================
    // Support Types - palette[14] (brightCyan)
    // ========================================================================
    {
      name: 'Entity Types',
      scope: [
        'support.type'
      ],
      settings: {
        foreground: palette.brightCyan,
      },
    },

    // ========================================================================
    // CSS Properties - palette[14] (brightCyan)
    // ========================================================================
    {
      name: 'CSS Class and Support',
      scope: [
        'source.css support.type.property-name',
        'source.sass support.type.property-name',
        'source.scss support.type.property-name'
      ],
      settings: {
        foreground: palette.brightCyan,
      },
    },

    // ========================================================================
    // Attributes - palette[10] (brightGreen)
    // ========================================================================
    {
      name: 'Attributes',
      scope: [
        'entity.other.attribute-name'
      ],
      settings: {
        foreground: palette.brightGreen,
      },
    },

  ];

  // JSON Rainbow colors - levels 0-8 cycling through colors
  const jsonTokens: TokenColor[] = [
    {
      name: 'JSON Key - Level 0',
      scope: ['source.json meta.structure.dictionary.json support.type.property-name.json'],
      settings: { foreground: palette.brightGreen },
    },
    {
      name: 'JSON Key - Level 1', 
      scope: ['source.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json'],
      settings: { foreground: palette.magenta },
    },
    {
      name: 'JSON Key - Level 2',
      scope: ['source.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json'],
      settings: { foreground: palette.brightBlue },
    },
    {
      name: 'JSON Key - Level 3',
      scope: ['source.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json'],
      settings: { foreground: palette.yellow },
    },
    {
      name: 'JSON Key - Level 4',
      scope: ['source.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json'],
      settings: { foreground: palette.brightRed },
    },
    {
      name: 'JSON Key - Level 5',
      scope: ['source.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json'],
      settings: { foreground: palette.brightCyan },
    },
    {
      name: 'JSON Key - Level 6',
      scope: ['source.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json'],
      settings: { foreground: palette.green },
    },
    {
      name: 'JSON Key - Level 7',
      scope: ['source.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json'],
      settings: { foreground: palette.brightYellow },
    },
    {
      name: 'JSON Key - Level 8',
      scope: ['source.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json'],
      settings: { foreground: palette.brightMagenta },
    },
  ];

  return [...baseTokens, ...jsonTokens];
};

// ============================================================================
// Theme Name Resolution
// ============================================================================

/**
 * Resolves the theme name from various sources with priority handling and special cases
 *
 * Determines the theme name using a priority system:
 * 1. Explicit name parameter (highest priority)
 * 2. Name from theme file metadata
 * 3. Derived from filename with special case handling (lowest priority)
 *
 * Special cases:
 * - "root.txt" → "eidolon-root" (based on typical naming patterns)
 *
 * @param filePath - Path to the theme file
 * @param explicitName - Explicitly provided theme name (optional)
 * @param meta - Metadata extracted from theme file (optional)
 * @returns Resolved theme name
 *
 * @example
 * ```typescript
 * resolveThemeName('./root.txt'); // 'eidolon-root'
 * resolveThemeName('./dark_theme.txt'); // 'dark-theme'
 * resolveThemeName('./theme.txt', 'My Custom Theme'); // 'My Custom Theme'
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
    
    // Special case handling
    if (baseName === 'root') {
      return 'eidolon-root';
    }
    
    // Default case: convert to kebab-case
    return baseName.replace(/[_\s]+/g, '-').toLowerCase();
  } catch {
    return 'unknown-theme';
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
    const name = themeName || resolveThemeName(filePath || '', themeName);
    const themeColors = buildVSCodeColors(colors);
    const tokenColors = buildTokenColors(colors);

    return {
      name,
      type: 'dark',
      colors: themeColors,
      tokenColors,
    };
  } catch (error) {
    throw new FileProcessingError(`Failed to build VS Code theme: ${(error as Error).message}`, filePath);
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

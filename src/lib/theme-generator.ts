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
 * Adds opacity to a hex color
 * @param hex - Source hex color
 * @param opacity - Opacity value (0-1)
 * @returns Hex color with opacity suffix (e.g., #ffffff80)
 */
const addOpacity = (hex: string, opacity: number): string => {
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255);
  const alphaHex = alpha.toString(16).padStart(2, '0');
  return `${hex}${alphaHex}`;
};

/**
 * Generates UI background variants following Eidolon Root pattern
 * Uses palette colors and calculated variants to match exact behavior
 * @param colors - Parsed Ghostty colors object
 * @returns Object with different background variants
 */
const generateBackgroundVariants = (colors: GhosttyColors) => {
  const base = colors.background || '#151719';           // Main background
  const editorBg = colors.color0 || '#171a1d';          // Editor background (palette 0)

  return {
    base,                                                // #151719 (main background)
    editor: editorBg,                                   // #171a1d (editor background - palette 0)
    widget: lighten(editorBg, 0.02),                    // #1a1d20 (widgets, panels)
    input: lighten(editorBg, 0.04),                     // #1f2225 (inputs, dropdowns)
    raised: lighten(editorBg, 0.06),                    // #212428 (elevated surfaces, dropdowns, modals)
    hover: lighten(base, 0.03),                         // Hover states
    border: lighten(base, 0.08),                        // Subtle borders
  };
};

/**
 * Generates foreground variants for different UI elements
 * @param foreground - Base foreground color
 * @returns Object with different foreground variants
 */
const generateForegroundVariants = (foreground: string) => {
  const base = foreground;
  return {
    base,                                    // #e4e5df (main text)
    muted: darken(base, 0.15),              // #c8c9c5 (UI chrome, secondary text)
    subtle: darken(base, 0.3),              // #a8a9a5 (disabled text)
    bright: lighten(base, 0.05),           // Brighter text for emphasis
  };
};

/**
 * Creates enhanced role mappings with color variants and opacity helpers
 * Based on analysis of the Eidolon Root theme patterns
 * @param colors - Parsed Ghostty colors object
 * @returns Enhanced role map with variants and opacity helpers
 */
const createEnhancedRoleMap = (colors: GhosttyColors) => {
  const baseRoleMap = createSimpleRoleMap(colors);
  const backgroundVariants = generateBackgroundVariants(colors);
  const foregroundVariants = generateForegroundVariants(baseRoleMap.foreground);

  // Semantic color assignments matching Eidolon Root patterns
  const semanticColors = {
    // Error states - Red palette
    error: baseRoleMap.red,                  // #f56b5c - errors, deletions, urgent
    errorBright: baseRoleMap.brightRed,      // #ff7a6f - critical errors

    // Warning states - Yellow palette
    warning: baseRoleMap.yellow,             // #f6b34c - warnings, modifications, find
    warningBright: baseRoleMap.brightYellow, // #f8c867 - important highlights

    // Success states - Green palette
    success: baseRoleMap.brightGreen,        // #83e96c - success, additions, hints
    successBase: baseRoleMap.green,          // #6ddf58 - base green

    // Info states - Blue palette
    info: baseRoleMap.brightBlue,            // #5b98ff - info, links, highlights
    infoBase: baseRoleMap.blue,              // #3a7ee0 - base blue

    // Accent colors - Cyan and Magenta
    accent1: baseRoleMap.brightCyan,         // #4ae0cb - cyan accent
    accent2: baseRoleMap.brightMagenta,      // #c89ef0 - magenta accent

    // Focus and interaction states
    focus: baseRoleMap.brightCyan,           // #4ae0cb - focus indicators, active states

    // UI chrome colors
    border: baseRoleMap.brightBlack,         // #565b62 - borders, comments
    borderSubtle: darken(baseRoleMap.brightBlack, 0.3), // Subtle borders
  };

  return {
    ...baseRoleMap,
    backgroundVariants,
    foregroundVariants,
    semanticColors,
    // Opacity helper functions
    withOpacity: (color: string, opacity: number) => addOpacity(color, opacity),
    // Color variant helpers
    lighten: (color: string, amount: number) => lighten(color, amount),
    darken: (color: string, amount: number) => darken(color, amount),
  };
};

// ============================================================================
// VS Code Theme Building
// ============================================================================

/**
 * Builds comprehensive VS Code workbench colors from enhanced role mappings
 *
 * Generates a complete VS Code color theme matching the patterns found in
 * professional themes like Eidolon Root. Includes over 200 color mappings
 * covering all VS Code UI elements with proper semantic color usage.
 *
 * @param colors - Parsed Ghostty colors object
 * @returns Complete VS Code theme colors object
 *
 * @since 2.0.0
 */
export const buildVSCodeColors = (colors: GhosttyColors): VSCodeThemeColors => {
  const roleMap = createEnhancedRoleMap(colors);
  const { backgroundVariants, foregroundVariants, semanticColors } = roleMap;

  return {
    // ========================================================================
    // Editor Core Colors
    // ========================================================================
    'editor.background': backgroundVariants.editor,
    'editor.foreground': foregroundVariants.base,
    'editorLineNumber.foreground': roleMap.withOpacity(semanticColors.border, 0.25),
    'editorLineNumber.activeForeground': foregroundVariants.base,
    'editorCursor.foreground': semanticColors.error,
    'editorCursor.background': backgroundVariants.editor,

    // ========================================================================
    // Editor Selections & Highlights
    // ========================================================================
    'editor.selectionBackground': roleMap.withOpacity(semanticColors.error, 0.19),
    'editor.selectionHighlightBackground': roleMap.withOpacity(semanticColors.error, 0.13),
    'editor.inactiveSelectionBackground': roleMap.withOpacity(semanticColors.error, 0.08),
    'editor.lineHighlightBackground': roleMap.withOpacity(foregroundVariants.base, 0.03),
    'editor.lineHighlightBorder': '#00000000',
    'editor.wordHighlightBackground': roleMap.withOpacity(semanticColors.info, 0.13),
    'editor.wordHighlightStrongBackground': roleMap.withOpacity(semanticColors.info, 0.19),
    'editor.wordHighlightBorder': '#00000000',
    'editor.wordHighlightStrongBorder': '#00000000',

    // ========================================================================
    // Find & Search
    // ========================================================================
    'editor.findMatchBackground': roleMap.withOpacity(semanticColors.warning, 0.25),
    'editor.findMatchHighlightBackground': roleMap.withOpacity(semanticColors.warning, 0.15),
    'editor.findRangeHighlightBackground': roleMap.withOpacity(semanticColors.warning, 0.08),
    'editor.findMatchBorder': semanticColors.warning,
    'editor.findMatchHighlightBorder': '#00000000',
    'editor.rangeHighlightBackground': roleMap.withOpacity(semanticColors.warning, 0.13),
    'searchEditor.findMatchBackground': roleMap.withOpacity(semanticColors.warning, 0.25),

    // ========================================================================
    // Bracket Matching & Guides
    // ========================================================================
    'editorBracketMatch.background': roleMap.withOpacity(semanticColors.border, 0.19),
    'editorBracketMatch.border': roleMap.withOpacity(semanticColors.border, 0.31),
    'editorBracketHighlight.foreground1': roleMap.brightCyan,
    'editorBracketHighlight.foreground2': roleMap.brightMagenta,
    'editorBracketHighlight.foreground3': semanticColors.warning,
    'editorBracketHighlight.foreground4': semanticColors.info,
    'editorBracketHighlight.foreground5': semanticColors.success,
    'editorBracketHighlight.foreground6': semanticColors.errorBright,
    'editorBracketHighlight.unexpectedBracket.foreground': semanticColors.error,

    // ========================================================================
    // Indent Guides
    // ========================================================================
    'editorIndentGuide.background1': roleMap.withOpacity(semanticColors.border, 0.08),
    'editorIndentGuide.activeBackground1': roleMap.withOpacity(semanticColors.border, 0.25),
    'editorIndentGuide.background2': roleMap.withOpacity(semanticColors.border, 0.13),
    'editorIndentGuide.activeBackground2': roleMap.withOpacity(semanticColors.border, 0.27),
    'editorIndentGuide.background3': roleMap.withOpacity(semanticColors.border, 0.15),
    'editorIndentGuide.activeBackground3': roleMap.withOpacity(semanticColors.border, 0.31),
    'editorIndentGuide.background4': roleMap.withOpacity(semanticColors.border, 0.19),
    'editorIndentGuide.activeBackground4': roleMap.withOpacity(semanticColors.border, 0.33),
    'editorIndentGuide.background5': roleMap.withOpacity(semanticColors.border, 0.21),
    'editorIndentGuide.activeBackground5': roleMap.withOpacity(semanticColors.border, 0.38),
    'editorIndentGuide.background6': roleMap.withOpacity(semanticColors.border, 0.25),
    'editorIndentGuide.activeBackground6': roleMap.withOpacity(semanticColors.border, 0.40),
    'editorRuler.foreground': roleMap.withOpacity(semanticColors.border, 0.13),

    // ========================================================================
    // Whitespace & Special Characters
    // ========================================================================
    'editorWhitespace.foreground': roleMap.withOpacity(semanticColors.border, 0.13),
    'editorLink.activeForeground': semanticColors.info,

    // ========================================================================
    // Editor Widgets (autocomplete, hover, etc)
    // ========================================================================
    'editorWidget.background': backgroundVariants.widget,
    'editorWidget.foreground': foregroundVariants.base,
    'editorWidget.border': roleMap.withOpacity(semanticColors.border, 0.25),
    'editorWidget.resizeBorder': roleMap.withOpacity(semanticColors.border, 0.25),
    'editorSuggestWidget.background': backgroundVariants.widget,
    'editorSuggestWidget.border': roleMap.withOpacity(semanticColors.border, 0.25),
    'editorSuggestWidget.foreground': foregroundVariants.base,
    'editorSuggestWidget.highlightForeground': semanticColors.warning,
    'editorSuggestWidget.selectedBackground': roleMap.withOpacity(semanticColors.error, 0.13),
    'editorSuggestWidget.selectedForeground': foregroundVariants.base,
    'editorSuggestWidget.focusHighlightForeground': semanticColors.warning,
    'editorSuggestWidget.selectedIconForeground': semanticColors.warning,
    'editorHoverWidget.background': backgroundVariants.widget,
    'editorHoverWidget.border': roleMap.withOpacity(semanticColors.border, 0.25),
    'editorHoverWidget.foreground': foregroundVariants.base,
    'editorHoverWidget.statusBarBackground': backgroundVariants.input,

    // ========================================================================
    // Editor Markers & Decorations
    // ========================================================================
    'editorError.foreground': semanticColors.error,
    'editorError.background': roleMap.withOpacity(semanticColors.error, 0.13),
    'editorError.border': '#00000000',
    'editorWarning.foreground': semanticColors.warning,
    'editorWarning.background': roleMap.withOpacity(semanticColors.warning, 0.13),
    'editorWarning.border': '#00000000',
    'editorInfo.foreground': semanticColors.info,
    'editorInfo.background': roleMap.withOpacity(semanticColors.info, 0.13),
    'editorInfo.border': '#00000000',
    'editorHint.foreground': semanticColors.success,
    'editorHint.border': '#00000000',

    // ========================================================================
    // Gutter (Git, Folding, etc)
    // ========================================================================
    'editorGutter.background': backgroundVariants.editor,
    'editorGutter.modifiedBackground': semanticColors.warning,
    'editorGutter.addedBackground': semanticColors.success,
    'editorGutter.deletedBackground': semanticColors.error,
    'editorGutter.foldingControlForeground': roleMap.withOpacity(semanticColors.border, 0.38),
    'editorGutter.commentRangeForeground': roleMap.withOpacity(semanticColors.border, 0.38),

    // ========================================================================
    // Diff Editor
    // ========================================================================
    'diffEditor.insertedTextBackground': roleMap.withOpacity(semanticColors.success, 0.13),
    'diffEditor.insertedTextBorder': '#00000000',
    'diffEditor.removedTextBackground': roleMap.withOpacity(semanticColors.error, 0.13),
    'diffEditor.removedTextBorder': '#00000000',
    'diffEditor.border': roleMap.withOpacity(semanticColors.border, 0.25),
    'diffEditor.diagonalFill': roleMap.withOpacity(semanticColors.border, 0.13),
    'diffEditor.insertedLineBackground': roleMap.withOpacity(semanticColors.success, 0.08),
    'diffEditor.removedLineBackground': roleMap.withOpacity(semanticColors.error, 0.08),

    // ========================================================================
    // Merge Editor
    // ========================================================================
    'merge.currentHeaderBackground': roleMap.withOpacity(semanticColors.info, 0.19),
    'merge.currentContentBackground': roleMap.withOpacity(semanticColors.info, 0.13),
    'merge.incomingHeaderBackground': roleMap.withOpacity(semanticColors.success, 0.19),
    'merge.incomingContentBackground': roleMap.withOpacity(semanticColors.success, 0.13),
    'merge.border': roleMap.withOpacity(semanticColors.border, 0.25),

    // ========================================================================
    // Editor Overview Ruler (Minimap Highlights)
    // ========================================================================
    'editorOverviewRuler.border': '#00000000',
    'editorOverviewRuler.findMatchForeground': roleMap.withOpacity(semanticColors.warning, 0.50),
    'editorOverviewRuler.rangeHighlightForeground': roleMap.withOpacity(semanticColors.warning, 0.38),
    'editorOverviewRuler.selectionHighlightForeground': roleMap.withOpacity(semanticColors.error, 0.38),
    'editorOverviewRuler.wordHighlightForeground': roleMap.withOpacity(semanticColors.info, 0.38),
    'editorOverviewRuler.wordHighlightStrongForeground': roleMap.withOpacity(semanticColors.info, 0.50),
    'editorOverviewRuler.modifiedForeground': roleMap.withOpacity(semanticColors.warning, 0.50),
    'editorOverviewRuler.addedForeground': roleMap.withOpacity(semanticColors.success, 0.50),
    'editorOverviewRuler.deletedForeground': roleMap.withOpacity(semanticColors.error, 0.50),
    'editorOverviewRuler.errorForeground': roleMap.withOpacity(semanticColors.error, 0.50),
    'editorOverviewRuler.warningForeground': roleMap.withOpacity(semanticColors.warning, 0.50),
    'editorOverviewRuler.infoForeground': roleMap.withOpacity(semanticColors.info, 0.50),
    'editorOverviewRuler.bracketMatchForeground': roleMap.withOpacity(semanticColors.border, 0.38),

    // ========================================================================
    // Activity Bar
    // ========================================================================
    'activityBar.background': backgroundVariants.base,
    'activityBar.foreground': foregroundVariants.muted,
    'activityBar.inactiveForeground': roleMap.withOpacity(semanticColors.border, 0.50),
    'activityBar.border': '#00000000',
    'activityBar.activeBorder': semanticColors.error,
    'activityBar.activeBackground': roleMap.withOpacity(semanticColors.error, 0.08),
    'activityBar.activeFocusBorder': semanticColors.error,
    'activityBar.dropBorder': semanticColors.error,
    'activityBarBadge.background': semanticColors.error,
    'activityBarBadge.foreground': backgroundVariants.editor,
    'activityBarTop.foreground': foregroundVariants.base,
    'activityBarTop.activeBorder': semanticColors.error,
    'activityBarTop.inactiveForeground': roleMap.withOpacity(semanticColors.border, 0.50),
    'activityBarTop.dropBorder': semanticColors.error,

    // ========================================================================
    // Sidebar
    // ========================================================================
    'sideBar.background': backgroundVariants.base,
    'sideBar.foreground': foregroundVariants.muted,
    'sideBar.border': '#00000000',
    'sideBar.dropBackground': roleMap.withOpacity(semanticColors.error, 0.13),
    'sideBarTitle.foreground': foregroundVariants.muted,
    'sideBarSectionHeader.background': backgroundVariants.widget,
    'sideBarSectionHeader.foreground': foregroundVariants.muted,
    'sideBarSectionHeader.border': '#00000000',

    // ========================================================================
    // List & Tree
    // ========================================================================
    'list.activeSelectionBackground': roleMap.withOpacity(semanticColors.error, 0.13),
    'list.activeSelectionForeground': foregroundVariants.muted,
    'list.activeSelectionIconForeground': foregroundVariants.base,
    'list.inactiveSelectionBackground': roleMap.withOpacity(semanticColors.error, 0.08),
    'list.inactiveSelectionForeground': foregroundVariants.muted,
    'list.inactiveSelectionIconForeground': foregroundVariants.base,
    'list.hoverBackground': roleMap.withOpacity(semanticColors.border, 0.13),
    'list.hoverForeground': foregroundVariants.muted,
    'list.focusBackground': roleMap.withOpacity(semanticColors.error, 0.13),
    'list.focusForeground': foregroundVariants.muted,
    'list.focusHighlightForeground': semanticColors.warning,
    'list.focusOutline': roleMap.withOpacity(semanticColors.error, 0.25),
    'list.focusAndSelectionOutline': roleMap.withOpacity(semanticColors.error, 0.38),
    'list.highlightForeground': semanticColors.warning,
    'list.dropBackground': roleMap.withOpacity(semanticColors.error, 0.13),
    'list.deemphasizedForeground': roleMap.withOpacity(semanticColors.border, 0.50),
    'list.errorForeground': semanticColors.error,
    'list.warningForeground': semanticColors.warning,
    'tree.indentGuidesStroke': roleMap.withOpacity(semanticColors.border, 0.25),
    'tree.tableColumnsBorder': roleMap.withOpacity(semanticColors.border, 0.13),
    'tree.tableOddRowsBackground': roleMap.withOpacity(semanticColors.border, 0.03),

    // ========================================================================
    // Tabs
    // ========================================================================
    'tab.activeBackground': backgroundVariants.editor,
    'tab.activeForeground': foregroundVariants.muted,
    'tab.border': '#00000000',
    'tab.activeBorder': '#00000000',
    'tab.activeBorderTop': semanticColors.error,
    'tab.inactiveBackground': backgroundVariants.base,
    'tab.inactiveForeground': roleMap.withOpacity(semanticColors.border, 0.50),
    'tab.hoverBackground': backgroundVariants.widget,
    'tab.hoverForeground': foregroundVariants.muted,
    'tab.hoverBorder': '#00000000',
    'tab.unfocusedActiveBackground': backgroundVariants.editor,
    'tab.unfocusedActiveForeground': roleMap.withOpacity(foregroundVariants.base, 0.63),
    'tab.unfocusedActiveBorderTop': roleMap.withOpacity(semanticColors.error, 0.38),
    'tab.unfocusedInactiveBackground': backgroundVariants.base,
    'tab.unfocusedInactiveForeground': roleMap.withOpacity(semanticColors.border, 0.38),
    'tab.unfocusedHoverBackground': backgroundVariants.widget,
    'tab.unfocusedHoverForeground': foregroundVariants.base,

    // Editor Group Header (Tab Container)
    'editorGroupHeader.tabsBackground': backgroundVariants.base,
    'editorGroupHeader.tabsBorder': '#00000000',
    'editorGroupHeader.noTabsBackground': backgroundVariants.base,

    // ========================================================================
    // Terminal Colors
    // ========================================================================
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
    'terminal.selectionBackground': roleMap.withOpacity(semanticColors.error, 0.25),
    'terminal.selectionForeground': foregroundVariants.base,
    'terminalCursor.foreground': semanticColors.error,
    'terminalCursor.background': backgroundVariants.editor,

    // ========================================================================
    // Notebook Colors
    // ========================================================================
    'notebook.cellBorderColor': roleMap.withOpacity(semanticColors.border, 0.25),
    'notebook.cellHoverBackground': roleMap.withOpacity(semanticColors.border, 0.08),
    'notebook.cellInsertionIndicator': semanticColors.error,
    'notebook.cellStatusBarItemHoverBackground': roleMap.withOpacity(semanticColors.border, 0.13),
    'notebook.cellToolbarSeparator': roleMap.withOpacity(semanticColors.border, 0.25),
    'notebook.cellEditorBackground': backgroundVariants.widget,
    'notebook.editorBackground': backgroundVariants.editor,
    'notebook.focusedCellBackground': backgroundVariants.widget,
    'notebook.focusedCellBorder': semanticColors.error,
    'notebook.focusedEditorBorder': semanticColors.error,
    'notebook.inactiveFocusedCellBorder': roleMap.withOpacity(semanticColors.error, 0.38),
    'notebook.inactiveSelectedCellBorder': roleMap.withOpacity(semanticColors.border, 0.25),
    'notebook.outputContainerBackgroundColor': backgroundVariants.widget,
    'notebook.outputContainerBorderColor': roleMap.withOpacity(semanticColors.border, 0.25),
    'notebook.selectedCellBackground': roleMap.withOpacity(semanticColors.error, 0.06),
    'notebook.selectedCellBorder': roleMap.withOpacity(semanticColors.border, 0.25),
    'notebook.symbolHighlightBackground': roleMap.withOpacity(semanticColors.warning, 0.13),
    'notebookScrollbarSlider.activeBackground': roleMap.withOpacity(semanticColors.border, 0.38),
    'notebookScrollbarSlider.background': roleMap.withOpacity(semanticColors.border, 0.13),
    'notebookScrollbarSlider.hoverBackground': roleMap.withOpacity(semanticColors.border, 0.25),
    'notebookStatusErrorIcon.foreground': semanticColors.error,
    'notebookStatusRunningIcon.foreground': semanticColors.info,
    'notebookStatusSuccessIcon.foreground': semanticColors.success,

    // ========================================================================
    // Debug Icon Colors
    // ========================================================================
    'debugIcon.breakpointForeground': semanticColors.error,
    'debugIcon.breakpointDisabledForeground': roleMap.withOpacity(semanticColors.border, 0.50),
    'debugIcon.breakpointUnverifiedForeground': semanticColors.warning,
    'debugIcon.breakpointCurrentStackframeForeground': semanticColors.success,
    'debugIcon.breakpointStackframeForeground': semanticColors.info,
    'debugIcon.startForeground': semanticColors.success,
    'debugIcon.pauseForeground': semanticColors.info,
    'debugIcon.stopForeground': semanticColors.error,
    'debugIcon.disconnectForeground': semanticColors.error,
    'debugIcon.restartForeground': semanticColors.success,
    'debugIcon.stepOverForeground': semanticColors.info,
    'debugIcon.stepIntoForeground': semanticColors.info,
    'debugIcon.stepOutForeground': semanticColors.info,
    'debugIcon.continueForeground': semanticColors.success,
    'debugIcon.stepBackForeground': semanticColors.info,

    // ========================================================================
    // Debug Console Colors
    // ========================================================================
    'debugConsole.infoForeground': semanticColors.info,
    'debugConsole.warningForeground': semanticColors.warning,
    'debugConsole.errorForeground': semanticColors.error,
    'debugConsole.sourceForeground': foregroundVariants.base,
    'debugConsoleInputIcon.foreground': foregroundVariants.base,

    // ========================================================================
    // Testing Colors
    // ========================================================================
    'testing.iconFailed': semanticColors.error,
    'testing.iconErrored': semanticColors.error,
    'testing.iconPassed': semanticColors.success,
    'testing.runAction': semanticColors.success,
    'testing.iconQueued': semanticColors.warning,
    'testing.iconUnset': roleMap.withOpacity(semanticColors.border, 0.50),
    'testing.iconSkipped': roleMap.withOpacity(semanticColors.border, 0.50),
    'testing.peekBorder': semanticColors.error,
    'testing.peekHeaderBackground': roleMap.withOpacity(semanticColors.error, 0.13),
    'testing.message.error.lineBackground': roleMap.withOpacity(semanticColors.error, 0.13),
    'testing.message.info.lineBackground': roleMap.withOpacity(semanticColors.info, 0.13),

    // ========================================================================
    // Welcome Page Colors
    // ========================================================================
    'welcomePage.background': backgroundVariants.editor,
    'welcomePage.progress.background': roleMap.withOpacity(semanticColors.border, 0.13),
    'welcomePage.progress.foreground': semanticColors.error,
    'welcomePage.tileBackground': backgroundVariants.widget,
    'welcomePage.tileHoverBackground': backgroundVariants.input,
    'welcomePage.tileBorder': roleMap.withOpacity(semanticColors.border, 0.25),
    'walkThrough.embeddedEditorBackground': backgroundVariants.widget,
    'walkthrough.stepTitle.foreground': foregroundVariants.muted,

    // ========================================================================
    // Git Decoration Colors
    // ========================================================================
    'gitDecoration.addedResourceForeground': semanticColors.success,
    'gitDecoration.modifiedResourceForeground': semanticColors.warning,
    'gitDecoration.deletedResourceForeground': semanticColors.error,
    'gitDecoration.renamedResourceForeground': semanticColors.info,
    'gitDecoration.stageModifiedResourceForeground': semanticColors.warning,
    'gitDecoration.stageDeletedResourceForeground': semanticColors.error,
    'gitDecoration.untrackedResourceForeground': semanticColors.success,
    'gitDecoration.ignoredResourceForeground': roleMap.withOpacity(semanticColors.border, 0.38),
    'gitDecoration.conflictingResourceForeground': roleMap.brightMagenta,
    'gitDecoration.submoduleResourceForeground': semanticColors.info,

    // ========================================================================
    // Settings Editor Colors
    // ========================================================================
    'settings.headerForeground': foregroundVariants.base,
    'settings.modifiedItemIndicator': semanticColors.warning,
    'settings.dropdownBackground': backgroundVariants.raised,
    'settings.dropdownForeground': foregroundVariants.base,
    'settings.dropdownBorder': roleMap.withOpacity(semanticColors.border, 0.25),
    'settings.dropdownListBorder': roleMap.withOpacity(semanticColors.border, 0.25),
    'settings.checkboxBackground': backgroundVariants.raised,
    'settings.checkboxForeground': foregroundVariants.base,
    'settings.checkboxBorder': roleMap.withOpacity(semanticColors.border, 0.25),
    'settings.textInputBackground': backgroundVariants.raised,
    'settings.textInputForeground': foregroundVariants.base,
    'settings.textInputBorder': roleMap.withOpacity(semanticColors.border, 0.25),
    'settings.numberInputBackground': backgroundVariants.raised,
    'settings.numberInputForeground': foregroundVariants.base,
    'settings.numberInputBorder': roleMap.withOpacity(semanticColors.border, 0.25),
    'settings.focusedRowBackground': roleMap.withOpacity(semanticColors.focus, 0.08),
    'settings.rowHoverBackground': roleMap.withOpacity(foregroundVariants.base, 0.05),

    // ========================================================================
    // Peek View Colors
    // ========================================================================
    'peekView.border': semanticColors.focus,
    'peekViewEditor.background': backgroundVariants.raised,
    'peekViewEditorGutter.background': backgroundVariants.raised,
    'peekViewResult.background': backgroundVariants.raised,
    'peekViewResult.fileForeground': foregroundVariants.base,
    'peekViewResult.lineForeground': foregroundVariants.muted,
    'peekViewResult.matchHighlightBackground': roleMap.withOpacity(semanticColors.warning, 0.25),
    'peekViewResult.selectionBackground': roleMap.withOpacity(semanticColors.focus, 0.15),
    'peekViewResult.selectionForeground': foregroundVariants.base,
    'peekViewTitle.background': backgroundVariants.base,
    'peekViewTitleDescription.foreground': foregroundVariants.muted,
    'peekViewTitleLabel.foreground': foregroundVariants.base,
    'peekViewEditor.matchHighlightBackground': roleMap.withOpacity(semanticColors.warning, 0.25),

    // ========================================================================
    // Chart Colors
    // ========================================================================
    'charts.foreground': foregroundVariants.base,
    'charts.lines': roleMap.withOpacity(foregroundVariants.base, 0.5),
    'charts.red': semanticColors.error,
    'charts.blue': roleMap.blue,
    'charts.yellow': semanticColors.warning,
    'charts.orange': roleMap.brightYellow,
    'charts.green': semanticColors.success,
    'charts.purple': roleMap.magenta,

    // ========================================================================
    // Miscellaneous UI Colors
    // ========================================================================
    'keybindingLabel.background': roleMap.withOpacity(semanticColors.focus, 0.15),
    'keybindingLabel.foreground': foregroundVariants.base,
    'keybindingLabel.border': roleMap.withOpacity(semanticColors.focus, 0.3),
    'keybindingLabel.bottomBorder': roleMap.withOpacity(semanticColors.focus, 0.4),
    'commandCenter.foreground': foregroundVariants.muted,
    'commandCenter.activeForeground': foregroundVariants.base,
    'commandCenter.background': backgroundVariants.base,
    'commandCenter.activeBackground': roleMap.withOpacity(semanticColors.focus, 0.1),
    'commandCenter.border': roleMap.withOpacity(semanticColors.border, 0.25),
    'commandCenter.inactiveForeground': roleMap.withOpacity(foregroundVariants.base, 0.4),
    'commandCenter.activeBorder': semanticColors.focus,
    'commandCenter.debuggingBackground': roleMap.withOpacity(semanticColors.warning, 0.15),

    // ========================================================================
    // Additional Essential UI Elements
    // ========================================================================
    'statusBar.background': backgroundVariants.base,
    'statusBar.foreground': foregroundVariants.muted,
    'statusBar.border': '#00000000',
    'statusBar.debuggingBackground': roleMap.withOpacity(semanticColors.warning, 0.75),
    'statusBar.debuggingForeground': backgroundVariants.editor,
    'statusBar.noFolderBackground': backgroundVariants.base,
    'statusBar.noFolderForeground': foregroundVariants.muted,
    'statusBarItem.activeBackground': roleMap.withOpacity(foregroundVariants.base, 0.13),
    'statusBarItem.hoverBackground': roleMap.withOpacity(foregroundVariants.base, 0.08),
    'statusBarItem.prominentBackground': roleMap.withOpacity(semanticColors.error, 0.75),
    'statusBarItem.prominentForeground': backgroundVariants.editor,
    'statusBarItem.prominentHoverBackground': roleMap.withOpacity(semanticColors.error, 0.88),

    // Title Bar
    'titleBar.activeBackground': backgroundVariants.base,
    'titleBar.activeForeground': foregroundVariants.muted,
    'titleBar.inactiveBackground': backgroundVariants.base,
    'titleBar.inactiveForeground': roleMap.withOpacity(semanticColors.border, 0.50),
    'titleBar.border': '#00000000',

    // Input Controls
    'input.background': backgroundVariants.input,
    'input.foreground': foregroundVariants.muted,
    'input.border': roleMap.withOpacity(semanticColors.border, 0.25),
    'input.placeholderForeground': roleMap.withOpacity(semanticColors.border, 0.50),
    'inputOption.activeBackground': roleMap.withOpacity(semanticColors.info, 0.31),
    'inputOption.activeForeground': foregroundVariants.base,
    'inputOption.hoverBackground': roleMap.withOpacity(semanticColors.info, 0.13),

    // Dropdown
    'dropdown.background': backgroundVariants.input,
    'dropdown.foreground': foregroundVariants.muted,
    'dropdown.border': roleMap.withOpacity(semanticColors.border, 0.25),
    'dropdown.listBackground': backgroundVariants.widget,

    // Button
    'button.background': semanticColors.error,
    'button.foreground': backgroundVariants.editor,
    'button.hoverBackground': roleMap.lighten(semanticColors.error, 0.1),
    'button.border': '#00000000',
    'button.secondaryBackground': roleMap.withOpacity(semanticColors.border, 0.25),
    'button.secondaryForeground': foregroundVariants.muted,
    'button.secondaryHoverBackground': roleMap.withOpacity(semanticColors.border, 0.38),

    // Badge
    'badge.background': semanticColors.error,
    'badge.foreground': backgroundVariants.editor,

    // Progress Bar
    'progressBar.background': semanticColors.error,

    // Panel (Terminal, Output, Problems)
    'panel.background': backgroundVariants.editor,
    'panel.border': roleMap.withOpacity(semanticColors.border, 0.25),
    'panel.dropBorder': semanticColors.error,
    'panelTitle.activeBorder': semanticColors.error,
    'panelTitle.activeForeground': foregroundVariants.muted,
    'panelTitle.inactiveForeground': roleMap.withOpacity(semanticColors.border, 0.50),

    // Scrollbar
    'scrollbar.shadow': roleMap.withOpacity('#000000', 0.25),
    'scrollbarSlider.background': roleMap.withOpacity(semanticColors.border, 0.13),
    'scrollbarSlider.activeBackground': roleMap.withOpacity(semanticColors.border, 0.38),
    'scrollbarSlider.hoverBackground': roleMap.withOpacity(semanticColors.border, 0.25),

    // Additional VS Code properties that might be expected
    'editor.selectionForeground': foregroundVariants.base,
    'editor.hoverHighlightBackground': roleMap.withOpacity(semanticColors.border, 0.13),
    'workbench.colorTheme': 'dark' as const,

  } as VSCodeThemeColors;
};

/**
 * Builds comprehensive token colors for syntax highlighting
 *
 * Creates token color definitions that match the Eidolon Root pattern,
 * using palette colors consistently across different programming languages.
 * Includes comprehensive scope coverage and JSON rainbow coloring.
 *
 * @param colors - Parsed Ghostty colors object
 * @returns Array of token color definitions for VS Code themes
 *
 * @since 2.0.0
 */
export const buildTokenColors = (colors: GhosttyColors): TokenColor[] => {
  const roleMap = createEnhancedRoleMap(colors);
  const { semanticColors, foregroundVariants } = roleMap;

  const baseTokens: TokenColor[] = [
    // ========================================================================
    // Comments
    // ========================================================================
    {
      name: 'Comment',
      scope: [
        'comment',
        'punctuation.definition.comment',
        'comment punctuation',
        'comment.block punctuation',
        'comment.line punctuation',
      ],
      settings: {
        fontStyle: 'italic',
        foreground: semanticColors.border,
      },
    },

    // ========================================================================
    // Variables and Constants
    // ========================================================================
    {
      name: 'Variables',
      scope: [
        'variable',
        'string constant.other.placeholder',
      ],
      settings: {
        foreground: foregroundVariants.base,
      },
    },
    {
      name: 'Colors',
      scope: [
        'constant.other.color',
      ],
      settings: {
        foreground: semanticColors.successBase,
      },
    },

    // ========================================================================
    // Invalid Code
    // ========================================================================
    {
      name: 'Invalid',
      scope: [
        'invalid',
        'invalid.illegal',
      ],
      settings: {
        foreground: semanticColors.error,
        fontStyle: 'underline',
      },
    },

    // ========================================================================
    // Keywords and Storage
    // ========================================================================
    {
      name: 'Keyword, Storage',
      scope: [
        'keyword',
        'storage.type',
        'storage.modifier',
        'keyword.control',
        'constant.language',
        'support.constant',
      ],
      settings: {
        foreground: semanticColors.error,
      },
    },

    // ========================================================================
    // Operators
    // ========================================================================
    {
      name: 'Operator, Misc',
      scope: [
        'keyword.operator',
        'constant.other.color',
        'punctuation',
        'meta.tag',
        'punctuation.definition.tag',
        'punctuation.separator.inheritance.php',
        'punctuation.definition.tag.html',
        'punctuation.definition.tag.begin.html',
        'punctuation.definition.tag.end.html',
      ],
      settings: {
        foreground: roleMap.cyan,
      },
    },

    // ========================================================================
    // Tags (HTML/XML)
    // ========================================================================
    {
      name: 'Tag',
      scope: [
        'entity.name.tag',
        'meta.tag.sgml',
        'markup.deleted.git_gutter',
      ],
      settings: {
        foreground: semanticColors.error,
      },
    },

    // ========================================================================
    // Functions and Methods
    // ========================================================================
    {
      name: 'Function, Special Method',
      scope: [
        'entity.name.function',
        'meta.function-call',
        'variable.function',
        'support.function',
        'keyword.other.special-method',
      ],
      settings: {
        foreground: semanticColors.warning,
      },
    },

    // ========================================================================
    // Classes and Types
    // ========================================================================
    {
      name: 'Class, Support',
      scope: [
        'entity.name',
        'entity.name.class',
        'entity.name.type.class',
        'support.type',
        'support.class',
        'support.other.namespace.use.php',
        'meta.use.php',
        'support.other.namespace.php',
        'markup.changed.git_gutter',
        'support.type.sys-types',
      ],
      settings: {
        foreground: semanticColors.warning,
      },
    },

    // ========================================================================
    // Entity Names
    // ========================================================================
    {
      name: 'Entity Types',
      scope: [
        'support.type',
      ],
      settings: {
        foreground: roleMap.white,
      },
    },

    // ========================================================================
    // CSS Selectors
    // ========================================================================
    {
      name: 'CSS Class and Support',
      scope: [
        'source.css support.type.property-name',
        'source.sass support.type.property-name',
        'source.scss support.type.property-name',
        'source.less support.type.property-name',
        'source.stylus support.type.property-name',
        'source.postcss support.type.property-name',
      ],
      settings: {
        foreground: semanticColors.warning,
      },
    },

    // ========================================================================
    // Strings
    // ========================================================================
    {
      name: 'String, Symbols, Inherited Class, Markup Heading',
      scope: [
        'string',
        'constant.other.symbol',
        'constant.other.key',
        'entity.other.inherited-class',
        'markup.heading',
        'markup.inserted.git_gutter',
        'meta.group.braces.curly constant.other.object.key.js string.unquoted.label.js',
      ],
      settings: {
        foreground: semanticColors.success,
      },
    },

    // ========================================================================
    // Numbers
    // ========================================================================
    {
      name: 'Number, Constant, Function Argument, Tag Attribute, Embedded',
      scope: [
        'constant.numeric',
        'constant.language',
        'support.constant',
        'constant.character',
        'constant.escape',
        'variable.parameter',
        'keyword.other.unit',
        'keyword.other',
      ],
      settings: {
        foreground: roleMap.magenta,
      },
    },

    // ========================================================================
    // Attributes
    // ========================================================================
    {
      name: 'String, Symbols, Inherited Class, Markup Heading',
      scope: [
        'entity.other.attribute-name',
        'entity.other.attribute-name.id',
        'entity.other.attribute-name.class',
      ],
      settings: {
        foreground: semanticColors.warning,
      },
    },

    // ========================================================================
    // Regex
    // ========================================================================
    {
      name: 'Regular Expressions',
      scope: [
        'string.regexp',
      ],
      settings: {
        foreground: roleMap.cyan,
      },
    },

    // ========================================================================
    // Escape Characters
    // ========================================================================
    {
      name: 'Escape Characters',
      scope: [
        'constant.character.escape',
      ],
      settings: {
        foreground: roleMap.cyan,
      },
    },

    // ========================================================================
    // Embedded Code
    // ========================================================================
    {
      name: 'Embedded',
      scope: [
        'punctuation.section.embedded',
        'variable.interpolation',
      ],
      settings: {
        foreground: roleMap.red,
      },
    },

    // ========================================================================
    // Template Strings
    // ========================================================================
    {
      name: 'Template Strings',
      scope: [
        'string.template',
        'string.interpolated',
      ],
      settings: {
        foreground: semanticColors.success,
      },
    },

    // ========================================================================
    // Language-specific: JSON
    // ========================================================================
    {
      name: 'JSON Property Name',
      scope: [
        'support.type.property-name.json',
      ],
      settings: {
        foreground: semanticColors.info,
      },
    },

    // ========================================================================
    // Language-specific: Markdown
    // ========================================================================
    {
      name: 'Markdown - Plain',
      scope: [
        'text.html.markdown',
        'punctuation.definition.list_item.markdown',
      ],
      settings: {
        foreground: foregroundVariants.base,
      },
    },
    {
      name: 'Markdown - Markup Raw Inline',
      scope: [
        'text.html.markdown markup.inline.raw.markdown',
      ],
      settings: {
        foreground: roleMap.magenta,
      },
    },
    {
      name: 'Markdown - Link Text',
      scope: [
        'text.html.markdown markup.underline.link',
      ],
      settings: {
        foreground: semanticColors.info,
      },
    },
  ];

  // JSON Rainbow colors using palette colors (specialized token colors for JSON files)
  const jsonTokens: TokenColor[] = [
    {
      name: 'JSON Braces',
      scope: ['punctuation.definition.dictionary.begin.json', 'punctuation.definition.dictionary.end.json'],
      settings: { foreground: semanticColors.warning },
    },
    {
      name: 'JSON Brackets',
      scope: ['punctuation.definition.array.begin.json', 'punctuation.definition.array.end.json'],
      settings: { foreground: semanticColors.success },
    },
    {
      name: 'JSON String Quotes',
      scope: ['punctuation.definition.string.begin.json', 'punctuation.definition.string.end.json'],
      settings: { foreground: semanticColors.accent2 },
    },
    {
      name: 'JSON Key-Value Separator',
      scope: ['punctuation.separator.dictionary.key-value.json'],
      settings: { foreground: semanticColors.accent1 },
    },
    {
      name: 'JSON Separators',
      scope: ['punctuation.separator.dictionary.pair.json', 'punctuation.separator.array.json'],
      settings: { foreground: foregroundVariants.base },
    },
  ];

  // Additional comprehensive token colors to match professional themes
  const advancedTokens: TokenColor[] = [
    // ========================================================================
    // Language-specific: JavaScript/TypeScript
    // ========================================================================
    {
      name: 'JS/TS This',
      scope: ['variable.language.this'],
      settings: { foreground: semanticColors.error },
    },
    {
      name: 'JS/TS Super',
      scope: ['variable.language.super'],
      settings: { foreground: semanticColors.error },
    },
    {
      name: 'JS/TS Import/Export',
      scope: ['keyword.control.import', 'keyword.control.export', 'keyword.control.from'],
      settings: { foreground: roleMap.magenta },
    },
    {
      name: 'JS/TS Type Keywords',
      scope: ['storage.type.type', 'storage.type.interface', 'storage.type.enum'],
      settings: { foreground: roleMap.blue },
    },
    {
      name: 'JS/TS Decorators',
      scope: ['punctuation.decorator', 'meta.decorator'],
      settings: { foreground: semanticColors.warning },
    },

    // ========================================================================
    // Language-specific: CSS/SCSS/LESS
    // ========================================================================
    {
      name: 'CSS Property Values',
      scope: ['support.constant.property-value.css', 'constant.other.color.rgb-value.css'],
      settings: { foreground: roleMap.cyan },
    },
    {
      name: 'CSS Units',
      scope: ['keyword.other.unit.css', 'keyword.other.unit.scss'],
      settings: { foreground: roleMap.magenta },
    },
    {
      name: 'CSS Selectors',
      scope: ['entity.name.tag.css', 'entity.other.attribute-name.class.css'],
      settings: { foreground: semanticColors.warning },
    },
    {
      name: 'CSS ID Selectors',
      scope: ['entity.other.attribute-name.id.css'],
      settings: { foreground: semanticColors.success },
    },
    {
      name: 'CSS Pseudo Classes',
      scope: ['entity.other.attribute-name.pseudo-class.css', 'entity.other.attribute-name.pseudo-element.css'],
      settings: { foreground: roleMap.blue },
    },

    // ========================================================================
    // Language-specific: HTML
    // ========================================================================
    {
      name: 'HTML Doctype',
      scope: ['meta.tag.sgml.doctype.html'],
      settings: { foreground: semanticColors.border, fontStyle: 'italic' },
    },
    {
      name: 'HTML Tag Names',
      scope: ['entity.name.tag.html', 'entity.name.tag.block.any.html'],
      settings: { foreground: semanticColors.error },
    },
    {
      name: 'HTML Attribute Names',
      scope: ['entity.other.attribute-name.html'],
      settings: { foreground: semanticColors.warning },
    },
    {
      name: 'HTML Attribute Values',
      scope: ['string.quoted.double.html', 'string.quoted.single.html'],
      settings: { foreground: semanticColors.success },
    },

    // ========================================================================
    // Language-specific: Python
    // ========================================================================
    {
      name: 'Python Self',
      scope: ['variable.language.self.python'],
      settings: { foreground: semanticColors.error, fontStyle: 'italic' },
    },
    {
      name: 'Python Decorators',
      scope: ['entity.name.function.decorator.python'],
      settings: { foreground: semanticColors.warning },
    },
    {
      name: 'Python Magic Methods',
      scope: ['support.function.magic.python'],
      settings: { foreground: roleMap.magenta },
    },
    {
      name: 'Python String Formatting',
      scope: ['constant.character.format.placeholder.other.python'],
      settings: { foreground: roleMap.cyan },
    },

    // ========================================================================
    // Language-specific: Markdown
    // ========================================================================
    {
      name: 'Markdown Headers',
      scope: ['markup.heading.markdown', 'entity.name.section.markdown'],
      settings: { foreground: semanticColors.error, fontStyle: 'bold' },
    },
    {
      name: 'Markdown Bold',
      scope: ['markup.bold.markdown'],
      settings: { foreground: foregroundVariants.base, fontStyle: 'bold' },
    },
    {
      name: 'Markdown Italic',
      scope: ['markup.italic.markdown'],
      settings: { foreground: foregroundVariants.base, fontStyle: 'italic' },
    },
    {
      name: 'Markdown Code',
      scope: ['markup.inline.raw.markdown', 'markup.fenced_code.block.markdown'],
      settings: { foreground: roleMap.magenta },
    },
    {
      name: 'Markdown Links',
      scope: ['markup.underline.link.markdown', 'string.other.link.title.markdown'],
      settings: { foreground: semanticColors.info },
    },
    {
      name: 'Markdown Lists',
      scope: ['markup.list.numbered.markdown', 'markup.list.unnumbered.markdown'],
      settings: { foreground: semanticColors.warning },
    },

    // ========================================================================
    // Language-specific: YAML
    // ========================================================================
    {
      name: 'YAML Keys',
      scope: ['entity.name.tag.yaml'],
      settings: { foreground: semanticColors.info },
    },
    {
      name: 'YAML Anchors',
      scope: ['punctuation.definition.anchor.yaml', 'variable.other.alias.yaml'],
      settings: { foreground: semanticColors.warning },
    },

    // ========================================================================
    // Language-specific: SQL
    // ========================================================================
    {
      name: 'SQL Keywords',
      scope: ['keyword.other.DML.sql', 'keyword.other.DDL.create.II.sql'],
      settings: { foreground: roleMap.blue },
    },
    {
      name: 'SQL Functions',
      scope: ['support.function.aggregate.sql', 'support.function.scalar.sql'],
      settings: { foreground: semanticColors.warning },
    },

    // ========================================================================
    // Language-specific: Shell/Bash
    // ========================================================================
    {
      name: 'Shell Variables',
      scope: ['variable.other.normal.shell', 'variable.other.special.shell'],
      settings: { foreground: roleMap.cyan },
    },
    {
      name: 'Shell Commands',
      scope: ['support.function.builtin.shell'],
      settings: { foreground: semanticColors.warning },
    },

    // ========================================================================
    // Language-specific: XML
    // ========================================================================
    {
      name: 'XML Tags',
      scope: ['entity.name.tag.xml', 'entity.name.tag.namespace.xml'],
      settings: { foreground: semanticColors.error },
    },
    {
      name: 'XML Attributes',
      scope: ['entity.other.attribute-name.xml', 'entity.other.attribute-name.namespace.xml'],
      settings: { foreground: semanticColors.warning },
    },

    // ========================================================================
    // Version Control (Git)
    // ========================================================================
    {
      name: 'Git Added',
      scope: ['markup.inserted.git_gutter'],
      settings: { foreground: semanticColors.success },
    },
    {
      name: 'Git Modified',
      scope: ['markup.changed.git_gutter'],
      settings: { foreground: semanticColors.warning },
    },
    {
      name: 'Git Deleted',
      scope: ['markup.deleted.git_gutter'],
      settings: { foreground: semanticColors.error },
    },

    // ========================================================================
    // Advanced Constructs
    // ========================================================================
    {
      name: 'Annotations',
      scope: ['storage.type.annotation', 'punctuation.definition.annotation'],
      settings: { foreground: semanticColors.warning },
    },
    {
      name: 'Type Parameters',
      scope: ['entity.name.type.parameter'],
      settings: { foreground: roleMap.cyan },
    },
    {
      name: 'Generic Types',
      scope: ['meta.type.parameters', 'punctuation.definition.typeparameters'],
      settings: { foreground: roleMap.cyan },
    },
    {
      name: 'Module Names',
      scope: ['entity.name.namespace', 'entity.name.module'],
      settings: { foreground: semanticColors.info },
    },
    {
      name: 'Interface Names',
      scope: ['entity.name.type.interface'],
      settings: { foreground: semanticColors.info },
    },
    {
      name: 'Enum Names',
      scope: ['entity.name.type.enum'],
      settings: { foreground: roleMap.blue },
    },
    {
      name: 'Constant Names',
      scope: ['entity.name.constant'],
      settings: { foreground: roleMap.magenta },
    },
    {
      name: 'Property Access',
      scope: ['meta.property.object', 'variable.other.property'],
      settings: { foreground: foregroundVariants.base },
    },
    {
      name: 'Method Calls',
      scope: ['meta.method-call', 'meta.function-call.method'],
      settings: { foreground: semanticColors.warning },
    },
    {
      name: 'Constructor Calls',
      scope: ['meta.instance.constructor', 'entity.name.function.constructor'],
      settings: { foreground: roleMap.blue },
    },
  ];

  return [...baseTokens, ...jsonTokens, ...advancedTokens];
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

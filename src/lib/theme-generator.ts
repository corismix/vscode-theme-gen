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

import { basename, extname } from 'path';
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
const LINE_REGEX = /^([\w-]+)[\s=:]+(.+)$/;
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
        `File is too large (${(content.length / (1024 * 1024)).toFixed(1)}MB). ` +
        `Maximum size is ${(MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(1)}MB`,
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
            // Assign using the original key spelling - GhosttyColors declares both the
            // hyphenated and underscored forms for cursor-text/selection-*, but only the
            // hyphenated form for cursor-color, so normalizing to underscore would produce
            // an unrecognized key and silently drop the value.
            safeAssignColor(colors, trimmedKey, sanitizedColor);
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
    const r = cleanHex.charAt(0);
    const g = cleanHex.charAt(1);
    const b = cleanHex.charAt(2);
    return [
      parseInt(r + r, 16),
      parseInt(g + g, 16),
      parseInt(b + b, 16),
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
 * Converts RGB components (0-255) to HSL ([hue 0-360, saturation 0-100, lightness 0-100])
 */
const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) {
    return [0, 0, l * 100];
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
      break;
  }
  h *= 60;

  return [h, s * 100, l * 100];
};

/**
 * Converts HSL (hue 0-360, saturation 0-100, lightness 0-100) to RGB components (0-255)
 */
const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  const sn = s / 100;
  const ln = l / 100;

  if (sn === 0) {
    const v = ln * 255;
    return [v, v, v];
  }

  const hue2rgb = (p: number, q: number, t: number): number => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const hn = h / 360;

  return [
    hue2rgb(p, q, hn + 1 / 3) * 255,
    hue2rgb(p, q, hn) * 255,
    hue2rgb(p, q, hn - 1 / 3) * 255,
  ];
};

/**
 * Lightens a color by raising its HSL lightness toward 100, preserving hue/saturation
 * @param hex - Source hex color
 * @param amount - Amount to lighten (0-1, where 1 reaches maximum lightness)
 * @returns Lightened hex color
 */
const lighten = (hex: string, amount: number): string => {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const factor = Math.max(0, Math.min(1, amount));
  const newL = l + (100 - l) * factor;
  return rgbToHex(...hslToRgb(h, s, newL));
};

/**
 * Darkens a color by lowering its HSL lightness toward 0, preserving hue/saturation
 * @param hex - Source hex color
 * @param amount - Amount to darken (0-1, where 1 reaches minimum lightness)
 * @returns Darkened hex color
 */
const darken = (hex: string, amount: number): string => {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const factor = Math.max(0, Math.min(1, amount));
  const newL = l * (1 - factor);
  return rgbToHex(...hslToRgb(h, s, newL));
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

/**
 * Computes the WCAG relative luminance of a hex color (0 = black, 1 = white)
 * @param hex - Source hex color
 * @returns Relative luminance in the range 0-1
 */
export const relativeLuminance = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex);
  const channel = (c: number): number => {
    const cn = c / 255;
    return cn <= 0.03928 ? cn / 12.92 : Math.pow((cn + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

/**
 * Computes the WCAG contrast ratio between two hex colors (1:1 to 21:1)
 * @param hexA - First hex color
 * @param hexB - Second hex color
 * @returns Contrast ratio, always >= 1
 */
export const contrastRatio = (hexA: string, hexB: string): number => {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Nudges a foreground color toward white/black (in fixed steps) until it reaches
 * the target WCAG contrast ratio against a background color, or gives up after a
 * capped number of steps. Used to keep readability-critical text legible even when
 * a source theme's own foreground/background pairing is close in lightness.
 * @param fgHex - Foreground hex color to adjust
 * @param bgHex - Background hex color to contrast against
 * @param minRatio - Target minimum contrast ratio (e.g. 4.5 for WCAG AA)
 * @returns Adjusted (or original, if already sufficient) foreground hex color
 */
export const ensureContrast = (fgHex: string, bgHex: string, minRatio: number): string => {
  if (contrastRatio(fgHex, bgHex) >= minRatio) {
    return fgHex;
  }

  const preferLighten = relativeLuminance(fgHex) >= relativeLuminance(bgHex);
  const step = 0.05;
  const maxSteps = 20;
  let result = fgHex;

  for (let i = 1; i <= maxSteps; i++) {
    result = preferLighten ? lighten(fgHex, step * i) : darken(fgHex, step * i);
    if (contrastRatio(result, bgHex) >= minRatio) {
      return result;
    }
  }

  return result;
};

/**
 * Determines whether a hex color reads as a "light" background for theme-type detection
 * @param hex - Source hex color
 * @returns True when the color's relative luminance is above the midpoint
 */
export const isLightBackground = (hex: string): boolean => relativeLuminance(hex) > 0.5;

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

  // ========================================================================
  // Theme Identity: Accent & Selection Colors
  // ========================================================================
  // The theme's own cursor/selection colors (when the source file defines them)
  // express its actual "brand" identity better than a fixed palette slot does -
  // e.g. a theme with an amber cursor should show amber buttons/badges/focus
  // states, not a hardcoded red. Falls back to palette.red (the historical
  // default) when the source theme doesn't declare its own cursor color, so
  // themes without this metadata are unaffected.
  const sanitizeAccent = (value: string | undefined): string | undefined =>
    value && isValidHexColor(value) ? value : undefined;

  const accent = sanitizeAccent(colors['cursor-color']) || sanitizeAccent(colors.cursor) || palette.red;
  const selectionBg =
    sanitizeAccent(colors['selection-background']) || sanitizeAccent(colors.selection_background);
  const selectionFg =
    sanitizeAccent(colors['selection-foreground']) || sanitizeAccent(colors.selection_foreground) || fg;

  // ========================================================================
  // Professional Background Elevation System
  // ========================================================================
  // Based on analysis of professional themes - systematic hierarchy:
  // 1. Deep background (activity bar, sidebar, status) - use theme background
  // 2. Editor background (main editor, panels) - use palette[0]
  // 3. Elevated surfaces (widgets, hovers, sections) - +2% lightness
  // 4. Input surfaces (forms, settings) - +5% lightness
  // 5. Hover states - +3% lightness
  // 6. Elevated hover - +6% lightness

  const backgrounds = {
    // Level 0: Deepest background for chrome (activity bar, sidebar, status)
    deep: bg,

    // Level 1: Main editor background (editor, panels, terminal)
    editor: palette.black,

    // Level 2: Elevated surfaces (widgets, dropdowns, tooltips, section headers)
    elevated: lighten(palette.black, 0.02),

    // Level 3: Interactive hover states
    hover: lighten(palette.black, 0.03),

    // Level 4: Input fields and form controls
    input: lighten(palette.black, 0.05),

    // Level 5: Elevated hover states (welcome tiles, etc)
    elevatedHover: lighten(palette.black, 0.06),

    // Level 6: High contrast inputs (peek view backgrounds)
    highContrast: lighten(palette.black, 0.08),
  };

  return {
    // ========================================================================
    // Editor Core Colors - Use editor background level
    // ========================================================================
    'editor.background': backgrounds.editor,
    'editor.foreground': fg,
    'editorLineNumber.foreground': withOpacity(palette.brightBlack, 0.25),
    'editorLineNumber.activeForeground': fg,
    'editorCursor.foreground': accent,
    'editorCursor.background': backgrounds.editor,

    // ========================================================================
    // Editor Selections & Highlights - Use red with correct opacities
    // ========================================================================
    'editor.selectionBackground': withOpacity(selectionBg || accent, 0.25),
    'editor.selectionHighlightBackground': withOpacity(selectionBg || accent, 0.125),
    'editor.inactiveSelectionBackground': withOpacity(selectionBg || accent, 0.08),
    'editor.lineHighlightBackground': withOpacity(fg, 0.03),
    'editor.lineHighlightBorder': '#00000000',
    'editor.wordHighlightBackground': withOpacity(palette.brightBlue, 0.13),
    'editor.wordHighlightStrongBackground': withOpacity(palette.brightBlue, 0.19),
    'editor.wordHighlightBorder': '#00000000',
    'editor.wordHighlightStrongBorder': '#00000000',
    'editor.selectionForeground': selectionFg,

    // ========================================================================
    // Find & Search - Use yellow with no opacity for borders
    // ========================================================================
    'editor.findMatchBackground': withOpacity(palette.yellow, 0.25),
    'editor.findMatchHighlightBackground': withOpacity(palette.yellow, 0.15),
    'editor.findRangeHighlightBackground': withOpacity(fg, 0.05),
    'editor.findMatchBorder': palette.yellow, // No opacity
    'editor.findMatchHighlightBorder': '#00000000',
    'editor.rangeHighlightBackground': withOpacity(fg, 0.05),
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
    // Editor Widgets (autocomplete, hover, etc) - Use elevated background level
    // ========================================================================
    'editorWidget.background': backgrounds.elevated,
    'editorWidget.foreground': fg,
    'editorWidget.border': withOpacity(palette.brightBlack, 0.25),
    'editorWidget.resizeBorder': withOpacity(palette.brightBlack, 0.25),
    'editorSuggestWidget.background': backgrounds.elevated,
    'editorSuggestWidget.border': withOpacity(palette.brightBlack, 0.25),
    'editorSuggestWidget.foreground': fg,
    'editorSuggestWidget.highlightForeground': fg,
    'editorSuggestWidget.selectedBackground': withOpacity(fg, 0.15),
    'editorSuggestWidget.selectedForeground': fg,
    'editorSuggestWidget.focusHighlightForeground': fg,
    'editorSuggestWidget.selectedIconForeground': fg,
    'editorHoverWidget.background': backgrounds.elevated,
    'editorHoverWidget.border': withOpacity(palette.brightBlack, 0.25),
    'editorHoverWidget.foreground': fg,
    'editorHoverWidget.statusBarBackground': backgrounds.input,

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
    'editorGutter.background': backgrounds.editor,
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
    'editorOverviewRuler.selectionHighlightForeground': withOpacity(selectionBg || accent, 0.38),
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
    // Activity Bar - Use deep background level
    // ========================================================================
    'activityBar.background': backgrounds.deep,
    'activityBar.foreground': ensureContrast(darken(fg, 0.15), backgrounds.deep, 4.5),
    'activityBar.inactiveForeground': withOpacity(palette.brightBlack, 0.50),
    'activityBar.border': withOpacity(palette.brightBlack, 0.25),
    'activityBar.activeBorder': accent,
    'activityBar.activeBackground': withOpacity(accent, 0.08),
    'activityBar.activeFocusBorder': accent,
    'activityBar.dropBorder': accent,
    'activityBarBadge.background': accent,
    'activityBarBadge.foreground': backgrounds.editor,
    'activityBarTop.foreground': fg,
    'activityBarTop.activeBorder': accent,
    'activityBarTop.inactiveForeground': withOpacity(palette.brightBlack, 0.50),
    'activityBarTop.dropBorder': accent,

    // ========================================================================
    // Sidebar - Use deep background level
    // ========================================================================
    'sideBar.background': backgrounds.deep,
    'sideBar.foreground': ensureContrast(darken(fg, 0.15), backgrounds.deep, 4.5),
    'sideBar.border': withOpacity(palette.brightBlack, 0.25),
    'sideBar.dropBackground': withOpacity(accent, 0.13),
    'sideBarTitle.foreground': darken(fg, 0.15),
    'sideBarSectionHeader.background': backgrounds.elevated,
    'sideBarSectionHeader.foreground': darken(fg, 0.15),
    'sideBarSectionHeader.border': withOpacity(palette.brightBlack, 0.25),

    // ========================================================================
    // List & Tree - Passive selection/hover states stay neutral (foreground-
    // tinted, no injected accent hue); accent is reserved for active
    // interaction affordances (drop targets, focus rings, buttons)
    // ========================================================================
    'list.activeSelectionBackground': withOpacity(fg, 0.13),
    'list.activeSelectionForeground': darken(fg, 0.15),
    'list.activeSelectionIconForeground': fg,
    'list.inactiveSelectionBackground': withOpacity(fg, 0.08),
    'list.inactiveSelectionForeground': darken(fg, 0.15),
    'list.inactiveSelectionIconForeground': fg,
    'list.hoverBackground': withOpacity(palette.brightBlack, 0.13),
    'list.hoverForeground': darken(fg, 0.15),
    'list.focusBackground': withOpacity(fg, 0.13),
    'list.focusForeground': darken(fg, 0.15),
    'list.focusHighlightForeground': fg,
    'list.focusOutline': withOpacity(accent, 0.25),
    'list.focusAndSelectionOutline': withOpacity(accent, 0.38),
    'list.highlightForeground': fg,
    'list.dropBackground': withOpacity(accent, 0.13),
    'list.deemphasizedForeground': withOpacity(palette.brightBlack, 0.50),
    'list.errorForeground': palette.red,
    'list.warningForeground': palette.yellow,
    'tree.indentGuidesStroke': withOpacity(palette.brightBlack, 0.25),
    'tree.tableColumnsBorder': withOpacity(palette.brightBlack, 0.13),
    'tree.tableOddRowsBackground': withOpacity(palette.brightBlack, 0.03),

    // ========================================================================
    // Tabs - Editor uses editor background level, inactive uses deep background
    // ========================================================================
    'tab.activeBackground': backgrounds.editor,
    'tab.activeForeground': ensureContrast(darken(fg, 0.15), backgrounds.editor, 4.5),
    'tab.border': withOpacity(palette.brightBlack, 0.25),
    'tab.activeBorder': '#00000000',
    'tab.activeBorderTop': accent,
    'tab.inactiveBackground': backgrounds.deep,
    'tab.inactiveForeground': withOpacity(palette.brightBlack, 0.50),
    'tab.hoverBackground': backgrounds.elevated,
    'tab.hoverForeground': darken(fg, 0.15),
    'tab.hoverBorder': '#00000000',
    'tab.unfocusedActiveBackground': backgrounds.editor,
    'tab.unfocusedActiveForeground': withOpacity(fg, 0.63),
    'tab.unfocusedActiveBorderTop': withOpacity(accent, 0.38),
    'tab.unfocusedInactiveBackground': backgrounds.deep,
    'tab.unfocusedInactiveForeground': withOpacity(palette.brightBlack, 0.38),
    'tab.unfocusedHoverBackground': backgrounds.elevated,
    'tab.unfocusedHoverForeground': fg,

    // Editor Group Header (Tab Container)
    'editorGroupHeader.tabsBackground': backgrounds.deep,
    'editorGroupHeader.tabsBorder': withOpacity(palette.brightBlack, 0.25),
    'editorGroupHeader.noTabsBackground': backgrounds.deep,

    // ========================================================================
    // Terminal Colors - Use editor background level
    // ========================================================================
    'terminal.background': backgrounds.editor,
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
    'terminal.selectionBackground': withOpacity(selectionBg || accent, 0.25),
    'terminal.selectionForeground': selectionFg,
    'terminalCursor.foreground': accent,
    'terminalCursor.background': backgrounds.editor,

    // ========================================================================
    // Notebook Colors - Use elevated background levels
    // ========================================================================
    'notebook.cellBorderColor': withOpacity(palette.brightBlack, 0.25),
    'notebook.cellHoverBackground': withOpacity(palette.brightBlack, 0.08),
    'notebook.cellInsertionIndicator': accent,
    'notebook.cellStatusBarItemHoverBackground': withOpacity(palette.brightBlack, 0.13),
    'notebook.cellToolbarSeparator': withOpacity(palette.brightBlack, 0.25),
    'notebook.cellEditorBackground': backgrounds.elevated,
    'notebook.editorBackground': backgrounds.editor,
    'notebook.focusedCellBackground': backgrounds.elevated,
    'notebook.focusedCellBorder': accent,
    'notebook.focusedEditorBorder': accent,
    'notebook.inactiveFocusedCellBorder': withOpacity(accent, 0.38),
    'notebook.inactiveSelectedCellBorder': withOpacity(palette.brightBlack, 0.25),
    'notebook.outputContainerBackgroundColor': backgrounds.elevated,
    'notebook.outputContainerBorderColor': withOpacity(palette.brightBlack, 0.25),
    'notebook.selectedCellBackground': withOpacity(accent, 0.06),
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
    // Welcome Page Colors - Use systematic background levels
    // ========================================================================
    'welcomePage.background': backgrounds.editor,
    'welcomePage.progress.background': withOpacity(palette.brightBlack, 0.13),
    'welcomePage.progress.foreground': accent,
    'welcomePage.tileBackground': backgrounds.elevated,
    'welcomePage.tileHoverBackground': backgrounds.elevatedHover,
    'welcomePage.tileBorder': withOpacity(palette.brightBlack, 0.25),
    'walkThrough.embeddedEditorBackground': backgrounds.elevated,
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
    // Settings Editor Colors - Use systematic background levels
    // ========================================================================
    'settings.headerForeground': fg,
    'settings.modifiedItemIndicator': palette.yellow,
    'settings.dropdownBackground': backgrounds.input,
    'settings.dropdownForeground': fg,
    'settings.dropdownBorder': withOpacity(palette.brightBlack, 0.25),
    'settings.dropdownListBorder': withOpacity(palette.brightBlack, 0.25),
    'settings.checkboxBackground': backgrounds.input,
    'settings.checkboxForeground': fg,
    'settings.checkboxBorder': withOpacity(palette.brightBlack, 0.25),
    'settings.textInputBackground': backgrounds.input,
    'settings.textInputForeground': fg,
    'settings.textInputBorder': withOpacity(palette.brightBlack, 0.25),
    'settings.numberInputBackground': backgrounds.input,
    'settings.numberInputForeground': fg,
    'settings.numberInputBorder': withOpacity(palette.brightBlack, 0.25),
    'settings.focusedRowBackground': withOpacity(palette.brightCyan, 0.08),
    'settings.rowHoverBackground': withOpacity(fg, 0.05),

    // ========================================================================
    // Peek View Colors - Use high contrast background level
    // ========================================================================
    'peekView.border': withOpacity(palette.brightBlack, 0.25),
    'peekViewEditor.background': backgrounds.highContrast,
    'peekViewEditorGutter.background': backgrounds.highContrast,
    'peekViewResult.background': backgrounds.highContrast,
    'peekViewResult.fileForeground': fg,
    'peekViewResult.lineForeground': darken(fg, 0.15),
    'peekViewResult.matchHighlightBackground': withOpacity(palette.yellow, 0.25),
    'peekViewResult.selectionBackground': withOpacity(accent, 0.15),
    'peekViewResult.selectionForeground': fg,
    'peekViewTitle.background': backgrounds.deep,
    'peekViewTitleDescription.foreground': darken(fg, 0.15),
    'peekViewTitleLabel.foreground': fg,
    'peekViewEditor.matchHighlightBackground': withOpacity(palette.yellow, 0.25),

    // ========================================================================
    // Status Bar - Use deep background level
    // ========================================================================
    'statusBar.background': backgrounds.deep,
    'statusBar.foreground': ensureContrast(darken(fg, 0.15), backgrounds.deep, 4.5),
    'statusBar.border': withOpacity(palette.brightBlack, 0.25),
    'statusBar.debuggingBackground': withOpacity(accent, 0.75),
    'statusBar.debuggingForeground': backgrounds.editor,
    'statusBar.noFolderBackground': backgrounds.deep,
    'statusBar.noFolderForeground': darken(fg, 0.15),
    'statusBarItem.activeBackground': withOpacity(fg, 0.13),
    'statusBarItem.hoverBackground': withOpacity(fg, 0.08),
    'statusBarItem.prominentBackground': withOpacity(accent, 0.75),
    'statusBarItem.prominentForeground': backgrounds.editor,
    'statusBarItem.prominentHoverBackground': withOpacity(accent, 0.88),

    // Title Bar - Use deep background level
    'titleBar.activeBackground': backgrounds.deep,
    'titleBar.activeForeground': ensureContrast(darken(fg, 0.15), backgrounds.deep, 4.5),
    'titleBar.inactiveBackground': backgrounds.deep,
    'titleBar.inactiveForeground': withOpacity(palette.brightBlack, 0.50),
    'titleBar.border': withOpacity(palette.brightBlack, 0.25),

    // Input Controls - Use input background level
    'input.background': backgrounds.input,
    'input.foreground': darken(fg, 0.15),
    'input.border': withOpacity(palette.brightBlack, 0.25),
    'input.placeholderForeground': withOpacity(palette.brightBlack, 0.50),
    'inputOption.activeBackground': withOpacity(palette.brightBlue, 0.31),
    'inputOption.activeForeground': fg,
    'inputOption.hoverBackground': withOpacity(palette.brightBlue, 0.13),

    // Input Validation - Semantic info/warning/error states for form fields
    'inputValidation.infoBackground': withOpacity(palette.brightBlue, 0.13),
    'inputValidation.infoBorder': palette.brightBlue,
    'inputValidation.infoForeground': fg,
    'inputValidation.warningBackground': withOpacity(palette.yellow, 0.13),
    'inputValidation.warningBorder': palette.yellow,
    'inputValidation.warningForeground': fg,
    'inputValidation.errorBackground': withOpacity(palette.red, 0.13),
    'inputValidation.errorBorder': palette.red,
    'inputValidation.errorForeground': fg,

    // Dropdown - Use input background level
    'dropdown.background': backgrounds.input,
    'dropdown.foreground': darken(fg, 0.15),
    'dropdown.border': withOpacity(palette.brightBlack, 0.25),
    'dropdown.listBackground': backgrounds.elevated,

    // Button - Use red for primary buttons
    'button.background': accent,
    'button.foreground': backgrounds.editor,
    'button.hoverBackground': lighten(accent, 0.1),
    'button.border': accent,
    'button.secondaryBackground': withOpacity(palette.brightBlack, 0.25),
    'button.secondaryForeground': darken(fg, 0.15),
    'button.secondaryHoverBackground': withOpacity(palette.brightBlack, 0.38),

    // Badge - Use red
    'badge.background': accent,
    'badge.foreground': backgrounds.editor,

    // Progress Bar - Use red
    'progressBar.background': accent,

    // Panel (Terminal, Output, Problems) - Use editor background level
    'panel.background': backgrounds.editor,
    'panel.border': withOpacity(palette.brightBlack, 0.25),
    'panel.dropBorder': accent,
    'panelTitle.activeBorder': accent,
    'panelTitle.activeForeground': darken(fg, 0.15),
    'panelTitle.inactiveForeground': withOpacity(palette.brightBlack, 0.50),

    // Scrollbar
    'scrollbar.shadow': withOpacity('#000000', 0.25),
    'scrollbarSlider.background': withOpacity(palette.brightBlack, 0.13),
    'scrollbarSlider.activeBackground': withOpacity(palette.brightBlack, 0.38),
    'scrollbarSlider.hoverBackground': withOpacity(palette.brightBlack, 0.25),

    // ========================================================================
    // Extended UI Properties - Use systematic background levels
    // ========================================================================
    'editor.wordHighlightText.background': withOpacity(palette.brightBlue, 0.13),
    'editor.wordHighlightText.border': '#00000000',
    'editor.wordHighlightStrong.background': withOpacity(palette.brightBlue, 0.19),
    'editor.wordHighlightStrong.border': '#00000000',

    // Breadcrumb properties
    'breadcrumb.foreground': withOpacity(fg, 0.63),
    'breadcrumb.background': backgrounds.editor,
    'breadcrumb.focusForeground': fg,
    'breadcrumb.activeSelectionForeground': fg,
    'breadcrumbPicker.background': backgrounds.elevated,

    // Minimap properties
    'minimap.background': backgrounds.editor,
    'minimap.findMatchHighlight': withOpacity(palette.yellow, 0.50),
    'minimap.selectionHighlight': withOpacity(selectionBg || accent, 0.50),
    'minimap.errorHighlight': withOpacity(palette.red, 0.50),
    'minimap.warningHighlight': withOpacity(palette.yellow, 0.50),
    'minimap.selectionOccurrenceHighlight': withOpacity(accent, 0.38),

    // Menu properties
    'menu.foreground': fg,
    'menu.background': backgrounds.elevated,
    'menu.selectionForeground': fg,
    'menu.selectionBackground': withOpacity(accent, 0.13),
    'menu.selectionBorder': accent,
    'menu.separatorBackground': withOpacity(palette.brightBlack, 0.25),
    'menu.border': withOpacity(palette.brightBlack, 0.25),

    // Notification properties
    'notificationCenter.border': withOpacity(palette.brightBlack, 0.25),
    'notificationCenterHeader.foreground': fg,
    'notificationCenterHeader.background': backgrounds.elevated,
    'notificationToast.border': withOpacity(palette.brightBlack, 0.25),
    'notifications.foreground': fg,
    'notifications.background': backgrounds.elevated,
    'notifications.border': withOpacity(palette.brightBlack, 0.25),
    'notificationLink.foreground': palette.brightBlue,
    'notificationsErrorIcon.foreground': palette.red,
    'notificationsWarningIcon.foreground': palette.yellow,
    'notificationsInfoIcon.foreground': palette.brightBlue,

    // Extension properties
    'extensionButton.prominentForeground': backgrounds.editor,
    'extensionButton.prominentBackground': accent,
    'extensionButton.prominentHoverBackground': lighten(accent, 0.1),
    'extensionButton.separator': withOpacity(palette.brightBlack, 0.25),
    'extensionBadge.remoteBackground': palette.brightBlue,
    'extensionBadge.remoteForeground': backgrounds.editor,

    // Quick Input properties
    'quickInput.background': backgrounds.elevated,
    'quickInput.foreground': fg,
    'quickInputList.focusBackground': accent,
    'quickInputList.focusForeground': backgrounds.editor,
    'quickInputList.focusIconForeground': backgrounds.editor,
    'quickInputTitle.background': backgrounds.hover,

    // Simple Find Widget properties
    'simpleFindWidget.sashBorder': withOpacity(palette.brightBlack, 0.25),

    // Profile Badge properties
    'profileBadge.background': accent,
    'profileBadge.foreground': backgrounds.editor,

    // Action Bar properties
    'actionBar.toggledBackground': withOpacity(accent, 0.13),

    // Comments properties
    'comments.openIcon': palette.brightBlue,
    'commentsView.header.background': backgrounds.elevated,
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

    // ========================================================================
    // Modern VSCode Features & Professional State Variants
    // ========================================================================

    // Command Center (Modern VSCode command palette)
    'commandCenter.foreground': darken(fg, 0.15),
    'commandCenter.activeForeground': fg,
    'commandCenter.background': backgrounds.deep,
    'commandCenter.activeBackground': withOpacity(fg, 0.06),
    'commandCenter.border': withOpacity(palette.brightBlack, 0.25),
    'commandCenter.inactiveForeground': withOpacity(palette.brightBlack, 0.50),
    'commandCenter.inactiveBorder': withOpacity(palette.brightBlack, 0.13),
    'commandCenter.activeBorder': accent,

    // Sticky Scroll (Editor sticky headers)
    'editorStickyScroll.background': backgrounds.editor,
    'editorStickyScrollHover.background': backgrounds.hover,
    'editorStickyScroll.border': withOpacity(palette.brightBlack, 0.25),
    'editorStickyScroll.shadow': withOpacity('#000000', 0.25),

    // Ghost Text (GitHub Copilot suggestions)
    'editorGhostText.background': withOpacity(palette.brightBlack, 0.08),
    'editorGhostText.foreground': withOpacity(palette.brightBlack, 0.50),
    'editorGhostText.border': withOpacity(palette.brightBlack, 0.13),

    // Keybinding Labels
    'keybindingLabel.background': withOpacity(palette.brightBlack, 0.13),
    'keybindingLabel.foreground': withOpacity(fg, 0.75),
    'keybindingLabel.border': withOpacity(palette.brightBlack, 0.25),
    'keybindingLabel.bottomBorder': withOpacity(palette.brightBlack, 0.38),

    // Interactive Widget Hover States
    'widget.shadow': withOpacity('#000000', 0.25),
    'widget.border': withOpacity(palette.brightBlack, 0.25),

    // Advanced List States
    'list.invalidItemForeground': palette.red,
    'list.filterMatchBackground': withOpacity(palette.brightBlack, 0.13),
    'list.filterMatchBorder': withOpacity(palette.brightBlack, 0.25),

    // Editor Group Management
    'editorGroup.border': withOpacity(palette.brightBlack, 0.25),
    'editorGroup.dropBackground': withOpacity(accent, 0.13),
    'editorGroup.focusedEmptyBorder': withOpacity(accent, 0.38),
    'editorGroup.emptyBackground': backgrounds.deep,

    // Tab Well Management
    'editorGroupHeader.border': withOpacity(palette.brightBlack, 0.25),
    'tab.lastPinnedBorder': withOpacity(palette.brightBlack, 0.25),
    'tab.dragAndDropBorder': accent,

    // Selection in Inputs
    'input.selectionBackground': withOpacity(accent, 0.25),
    'input.selectionForeground': fg,

    // Enhanced Focus States
    'focusBorder': withOpacity(accent, 0.38),
    'widget.focusBackground': withOpacity(accent, 0.08),
    'widget.focusBorder': withOpacity(accent, 0.38),

    // Merge Conflict States (Advanced)
    'merge.commonContentBackground': withOpacity(palette.yellow, 0.08),
    'merge.commonHeaderBackground': withOpacity(palette.yellow, 0.13),
    'editorOverviewRuler.commonContentForeground': withOpacity(palette.yellow, 0.50),

    // Enhanced Notification States
    'notification.background': backgrounds.elevated,
    'notification.foreground': fg,
    'notification.hoverBackground': backgrounds.hover,
    'notification.buttonBackground': accent,
    'notification.buttonForeground': backgrounds.editor,
    'notification.buttonHoverBackground': lighten(accent, 0.1),
    'notification.infoBackground': withOpacity(palette.brightBlue, 0.13),
    'notification.infoForeground': palette.brightBlue,
    'notification.warningBackground': withOpacity(palette.yellow, 0.13),
    'notification.warningForeground': palette.yellow,
    'notification.errorBackground': withOpacity(palette.red, 0.13),
    'notification.errorForeground': palette.red,

    // Enhanced Button States
    'button.separator': withOpacity(palette.brightBlack, 0.38),
    'checkbox.background': backgrounds.input,
    'checkbox.foreground': fg,
    'checkbox.border': withOpacity(palette.brightBlack, 0.25),
    'checkbox.selectBackground': accent,
    'checkbox.selectBorder': accent,

    // Symbol Icons (Advanced semantic coloring)
    'symbolIcon.arrayForeground': palette.brightYellow,
    'symbolIcon.booleanForeground': palette.brightRed,
    'symbolIcon.classForeground': palette.magenta,
    'symbolIcon.colorForeground': palette.green,
    'symbolIcon.constantForeground': palette.brightRed,
    'symbolIcon.constructorForeground': palette.brightBlue,
    'symbolIcon.enumeratorForeground': palette.brightMagenta,
    'symbolIcon.enumeratorMemberForeground': palette.brightMagenta,
    'symbolIcon.eventForeground': palette.brightYellow,
    'symbolIcon.fieldForeground': palette.brightCyan,
    'symbolIcon.fileForeground': fg,
    'symbolIcon.folderForeground': palette.brightBlack,
    'symbolIcon.functionForeground': palette.brightBlue,
    'symbolIcon.interfaceForeground': palette.brightCyan,
    'symbolIcon.keyForeground': palette.brightGreen,
    'symbolIcon.keywordForeground': palette.brightGreen,
    'symbolIcon.methodForeground': palette.brightBlue,
    'symbolIcon.moduleForeground': palette.cyan,
    'symbolIcon.namespaceForeground': palette.cyan,
    'symbolIcon.nullForeground': palette.brightBlack,
    'symbolIcon.numberForeground': palette.brightRed,
    'symbolIcon.objectForeground': palette.brightYellow,
    'symbolIcon.operatorForeground': palette.cyan,
    'symbolIcon.packageForeground': palette.cyan,
    'symbolIcon.propertyForeground': palette.brightCyan,
    'symbolIcon.referenceForeground': palette.brightBlue,
    'symbolIcon.snippetForeground': palette.yellow,
    'symbolIcon.stringForeground': palette.red,
    'symbolIcon.structForeground': palette.magenta,
    'symbolIcon.textForeground': fg,
    'symbolIcon.typeParameterForeground': palette.brightCyan,
    'symbolIcon.unitForeground': palette.brightBlack,
    'symbolIcon.variableForeground': fg,

    // Interactive Toolbar States
    'toolbar.hoverBackground': backgrounds.hover,
    'toolbar.hoverOutline': withOpacity(palette.brightBlack, 0.25),
    'toolbar.activeBackground': withOpacity(fg, 0.2),

    // Enhanced Debug States
    'debugToolBar.background': backgrounds.elevated,
    'debugToolBar.border': withOpacity(palette.brightBlack, 0.25),
    'debugExceptionWidget.background': withOpacity(palette.red, 0.13),
    'debugExceptionWidget.border': palette.red,

    // Search Results Enhanced States
    'search.resultsInfoForeground': withOpacity(fg, 0.63),
    'searchEditor.textInputBorder': withOpacity(palette.brightBlack, 0.25),

    // Enhanced Welcome Page
    'welcomePage.buttonBackground': backgrounds.elevated,
    'welcomePage.buttonHoverBackground': backgrounds.hover,
    'welcomePage.buttonBorder': withOpacity(palette.brightBlack, 0.25),

    // Git Graph/Timeline States
    'gitlens.trailingLineForeground': withOpacity(palette.brightBlack, 0.50),
    'gitlens.lineHighlightBackgroundColor': withOpacity(palette.yellow, 0.08),
    'gitlens.lineHighlightOverviewRulerColor': withOpacity(palette.yellow, 0.38),

    // Enhanced Minimap States
    'minimap.foregroundOpacity': '#000000a0',
    'minimapSlider.background': withOpacity(palette.brightBlack, 0.13),
    'minimapSlider.hoverBackground': withOpacity(palette.brightBlack, 0.25),
    'minimapSlider.activeBackground': withOpacity(palette.brightBlack, 0.38),
    'minimapGutter.addedBackground': palette.brightGreen,
    'minimapGutter.modifiedBackground': palette.yellow,
    'minimapGutter.deletedBackground': palette.red,

    // Enhanced Terminal States
    'terminal.tab.activeBorder': accent,
    'terminal.dropBackground': withOpacity(accent, 0.13),
    'terminal.border': withOpacity(palette.brightBlack, 0.25),

    // Editor Inlay Hints (Modern TypeScript/LSP feature)
    'editorInlayHint.background': withOpacity(palette.brightBlack, 0.08),
    'editorInlayHint.foreground': withOpacity(palette.brightBlack, 0.63),
    'editorInlayHint.typeForeground': withOpacity(palette.brightCyan, 0.63),
    'editorInlayHint.typeBackground': withOpacity(palette.brightCyan, 0.08),
    'editorInlayHint.parameterForeground': withOpacity(palette.brightBlue, 0.63),
    'editorInlayHint.parameterBackground': withOpacity(palette.brightBlue, 0.08),

    // ========================================================================
    // Professional Charts & Data Visualization
    // ========================================================================

    // Chart Colors (for extension visualizations and data displays)
    'charts.foreground': fg,
    'charts.lines': withOpacity(palette.brightBlack, 0.38),
    'charts.red': palette.red,
    'charts.blue': palette.brightBlue,
    'charts.yellow': palette.yellow,
    'charts.orange': palette.brightRed,
    'charts.green': palette.brightGreen,
    'charts.purple': palette.brightMagenta,

    // Color palette for chart series (cycled through for multi-series charts)
    'charts.color1': palette.red,
    'charts.color2': palette.brightBlue,
    'charts.color3': palette.brightGreen,
    'charts.color4': palette.yellow,
    'charts.color5': palette.brightMagenta,
    'charts.color6': palette.brightCyan,
    'charts.color7': palette.brightRed,
    'charts.color8': palette.cyan,
    'charts.color9': palette.magenta,
    'charts.color10': palette.green,

    // ========================================================================
    // Professional Extension & Remote Badges
    // ========================================================================

    // Extension badges for different types and statuses
    'extensionBadge.verifiedForeground': backgrounds.editor,
    'extensionBadge.verifiedBackground': palette.brightGreen,
    'extensionBadge.preReleaseForeground': backgrounds.editor,
    'extensionBadge.preReleaseBackground': palette.brightYellow,
    'extensionBadge.sponsorForeground': backgrounds.editor,
    'extensionBadge.sponsorBackground': palette.brightMagenta,

    // Remote Development indicators
    'statusBarItem.remoteBackground': palette.brightBlue,
    'statusBarItem.remoteForeground': backgrounds.editor,
    'statusBarItem.remoteHoverBackground': lighten(palette.brightBlue, 0.1),
    'statusBarItem.offlineBackground': palette.brightBlack,
    'statusBarItem.offlineForeground': darken(fg, 0.15),
    'statusBarItem.offlineHoverBackground': withOpacity(palette.brightBlack, 0.75),

    // ========================================================================
    // Enhanced Picker & Selection States
    // ========================================================================

    // Color picker interface
    'colorPicker.background': backgrounds.elevated,
    'colorPicker.border': withOpacity(palette.brightBlack, 0.25),
    'colorPicker.foreground': fg,

    // Quick pick enhancements
    'quickInputFilter.background': backgrounds.input,
    'quickInputFilter.border': withOpacity(palette.brightBlack, 0.25),

    // ========================================================================
    // Timeline & History Visualization
    // ========================================================================

    // Timeline colors for git history and file changes
    'timeline.background': backgrounds.deep,
    'timeline.foreground': darken(fg, 0.15),
    'timeline.border': withOpacity(palette.brightBlack, 0.25),

    // Tree view enhancements
    'tree.inactiveIndentGuidesStroke': withOpacity(palette.brightBlack, 0.13),

    // ========================================================================
    // Settings Sync & Cloud Indicators
    // ========================================================================

    // Settings sync status indicators
    'settingsSync.foreground': darken(fg, 0.15),
    'settingsSync.modifiedForeground': palette.yellow,
    'settingsSync.addedForeground': palette.brightGreen,
    'settingsSync.removedForeground': palette.red,
    'settingsSync.conflictForeground': palette.brightMagenta,
    'settingsSync.errorForeground': palette.red,

    // Account management
    'account.foreground': darken(fg, 0.15),
    'account.activeBackground': withOpacity(palette.brightBlue, 0.13),
    'account.activeBorder': palette.brightBlue,

    // ========================================================================
    // Professional Status & Progress Indicators
    // ========================================================================

    // Enhanced progress indicators
    'progressBar.foreground': backgrounds.editor,

    // Load more actions
    'list.loadMoreBackground': backgrounds.hover,
    'list.loadMoreForeground': darken(fg, 0.15),

    // ========================================================================
    // Enhanced Editor States & Professional Features
    // ========================================================================

    // Unicode highlighting (security feature)
    'editorUnicodeHighlight.background': withOpacity(palette.yellow, 0.13),
    'editorUnicodeHighlight.border': withOpacity(palette.yellow, 0.38),

    // Unused code highlighting
    'editorUnnecessaryCode.opacity': '#000000aa',
    'editorUnnecessaryCode.border': withOpacity(palette.brightBlack, 0.25),

    // Code lens (show references, implementations, etc.)
    'editorCodeLens.foreground': withOpacity(palette.brightBlack, 0.50),

    // Light bulb (quick fixes indicator)
    'editorLightBulb.foreground': palette.yellow,
    'editorLightBulbAutoFix.foreground': palette.brightBlue,

    // ========================================================================
    // Integrated Terminal Enhancements
    // ========================================================================

    // Terminal tab decorations
    'terminal.inactiveSelectionBackground': withOpacity(selectionBg || accent, 0.13),
    'terminal.findMatchBackground': withOpacity(palette.yellow, 0.25),
    'terminal.findMatchBorder': withOpacity(palette.yellow, 0.38),
    'terminal.findMatchHighlightBackground': withOpacity(palette.yellow, 0.15),
    'terminal.hoverHighlightBackground': withOpacity(palette.brightBlack, 0.13),

    // ========================================================================
    // Enhanced Workbench & Professional Polish
    // ========================================================================

    // Workbench state indicators
    'workbench.foreground': fg,
    'workbench.errorForeground': palette.red,
    'workbench.warningForeground': palette.yellow,
    'workbench.infoForeground': palette.brightBlue,

    // Professional hover states for all interactive elements
    'button.commandCenter.foreground': darken(fg, 0.15),
    'button.commandCenter.background': backgrounds.deep,
    'button.commandCenter.hoverBackground': withOpacity(accent, 0.13),

    // Enhanced selection states
    'selection.background': withOpacity(selectionBg || accent, 0.25),
    'selection.foreground': fg,

    // Professional borders and separators
    'separator.foreground': withOpacity(palette.brightBlack, 0.25),
    'contrastBorder': withOpacity(palette.brightBlack, 0.13),
    'contrastActiveBorder': withOpacity(accent, 0.38),

    // ========================================================================
    // Final Professional Touches
    // ========================================================================

    // Enhanced icon states
    'icon.foreground': darken(fg, 0.15),
    'icon.activeForeground': fg,

    // Sash (resize handles) enhancements
    'sash.hoverBorder': withOpacity(accent, 0.38),
    'sash.activeBorder': accent,

    // Professional editor state management
    'editor.foldBackground': withOpacity(palette.brightBlack, 0.08),
    'editor.focusedStackFrameHighlightBackground': withOpacity(palette.brightGreen, 0.13),
    'editor.stackFrameHighlightBackground': withOpacity(palette.yellow, 0.13),

    // Professional workbench enhancement
    'workbench.backgroundNoise': withOpacity('#000000', 0.03),

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
        'punctuation.definition.comment',
        'comment punctuation',
        'comment.block punctuation',
        'comment.line punctuation',
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
        'string constant.other.placeholder',
      ],
      settings: {
        foreground: fg,
      },
    },

    // ========================================================================
    // Colors - palette[2] (green)
    // ========================================================================
    {
      name: 'Colors',
      scope: [
        'constant.other.color',
      ],
      settings: {
        foreground: palette.green,
      },
    },

    // ========================================================================
    // Invalid Code - palette[1] (red) with underline
    // ========================================================================
    {
      name: 'Invalid',
      scope: [
        'invalid',
        'invalid.illegal',
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
        'storage.modifier',
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
        'punctuation.separator.inheritance.php',
        'punctuation.definition.tag.html',
        'punctuation.definition.tag.begin.html',
        'punctuation.definition.tag.end.html',
        'punctuation.section.embedded',
        'keyword.other.template',
        'keyword.other.substitution',
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
        'meta.tag.sgml',
        'markup.deleted.git_gutter',
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
        'support.function',
        'keyword.other.special-method',
      ],
      settings: {
        foreground: palette.brightBlue,
      },
    },

    // ========================================================================
    // Block Level Variables - palette[11] (brightYellow)
    // ========================================================================
    {
      name: 'Block Level Variables',
      scope: [
        'meta.block variable.other',
      ],
      settings: {
        foreground: palette.brightYellow,
      },
    },

    // ========================================================================
    // Other Variable, String Link - palette[11] (brightYellow)
    // ========================================================================
    {
      name: 'Other Variable, String Link',
      scope: [
        'support.other.variable',
        'string.other.link',
      ],
      settings: {
        foreground: palette.brightYellow,
      },
    },

    // ========================================================================
    // Numbers and Constants - palette[9] (brightRed)
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
        foreground: palette.brightRed,
      },
    },

    // ========================================================================
    // Strings - palette[1] (red)
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
        foreground: palette.red,
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
        'support.other.namespace.use.php',
        'meta.use.php',
        'support.other.namespace.php',
        'markup.changed.git_gutter',
        'support.type.sys-types',
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
        'support.type',
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
        'source.scss support.type.property-name',
        'source.less support.type.property-name',
        'source.stylus support.type.property-name',
        'source.postcss support.type.property-name',
      ],
      settings: {
        foreground: palette.brightCyan,
      },
    },

    // ========================================================================
    // Sub-methods - palette[6] (cyan)
    // ========================================================================
    {
      name: 'Sub-methods',
      scope: [
        'entity.name.module.js',
        'variable.import.parameter.js',
        'variable.other.class.js',
      ],
      settings: {
        foreground: palette.cyan,
      },
    },

    // ========================================================================
    // Language methods - palette[6] (cyan) with italic
    // ========================================================================
    {
      name: 'Language methods',
      scope: [
        'variable.language',
      ],
      settings: {
        fontStyle: 'italic',
        foreground: palette.cyan,
      },
    },

    // ========================================================================
    // entity.name.method.js - palette[12] (brightBlue) with italic
    // ========================================================================
    {
      name: 'entity.name.method.js',
      scope: [
        'entity.name.method.js',
      ],
      settings: {
        fontStyle: 'italic',
        foreground: palette.brightBlue,
      },
    },

    // ========================================================================
    // meta.method.js - palette[12] (brightBlue)
    // ========================================================================
    {
      name: 'meta.method.js',
      scope: [
        'meta.class-method.js entity.name.function.js',
        'variable.function.constructor',
      ],
      settings: {
        foreground: palette.brightBlue,
      },
    },

    // ========================================================================
    // Attributes - palette[10] (brightGreen)
    // ========================================================================
    {
      name: 'Attributes',
      scope: [
        'entity.other.attribute-name',
      ],
      settings: {
        foreground: palette.brightGreen,
      },
    },

    // ========================================================================
    // HTML Attributes - palette[5] (magenta) with italic
    // ========================================================================
    {
      name: 'HTML Attributes',
      scope: [
        'text.html.basic entity.other.attribute-name.html',
        'text.html.basic entity.other.attribute-name',
      ],
      settings: {
        fontStyle: 'italic',
        foreground: palette.magenta,
      },
    },

    // ========================================================================
    // CSS Classes - palette[5] (magenta)
    // ========================================================================
    {
      name: 'CSS Classes',
      scope: [
        'entity.other.attribute-name.class',
      ],
      settings: {
        foreground: palette.magenta,
      },
    },

    // ========================================================================
    // CSS ID's - palette[12] (brightBlue)
    // ========================================================================
    {
      name: 'CSS ID\'s',
      scope: [
        'source.sass keyword.control',
      ],
      settings: {
        foreground: palette.brightBlue,
      },
    },

    // ========================================================================
    // Inserted - palette[1] (red)
    // ========================================================================
    {
      name: 'Inserted',
      scope: [
        'markup.inserted',
      ],
      settings: {
        foreground: palette.red,
        background: withOpacity(palette.brightGreen, 0.13),
      },
    },

    // ========================================================================
    // Deleted - palette[6] (cyan)
    // ========================================================================
    {
      name: 'Deleted',
      scope: [
        'markup.deleted',
      ],
      settings: {
        foreground: palette.cyan,
        background: withOpacity(palette.red, 0.13),
      },
    },

    // ========================================================================
    // Changed - palette[10] (brightGreen)
    // ========================================================================
    {
      name: 'Changed',
      scope: [
        'markup.changed',
      ],
      settings: {
        foreground: palette.brightGreen,
        background: withOpacity(palette.yellow, 0.13),
      },
    },

    // ========================================================================
    // Regular Expressions - palette[13] (brightMagenta)
    // ========================================================================
    {
      name: 'Regular Expressions',
      scope: [
        'string.regexp',
      ],
      settings: {
        foreground: palette.brightMagenta,
      },
    },

    // ========================================================================
    // Escape Characters - palette[13] (brightMagenta)
    // ========================================================================
    {
      name: 'Escape Characters',
      scope: [
        'constant.character.escape',
      ],
      settings: {
        foreground: palette.brightMagenta,
      },
    },

    // ========================================================================
    // URL - underline style
    // ========================================================================
    {
      name: 'URL',
      scope: [
        '*url*',
        '*link*',
        '*uri*',
      ],
      settings: {
        fontStyle: 'underline',
      },
    },

    // ========================================================================
    // Decorators - palette[12] (brightBlue) with italic
    // ========================================================================
    {
      name: 'Decorators',
      scope: [
        'tag.decorator.js entity.name.tag.js',
        'tag.decorator.js punctuation.definition.tag.js',
      ],
      settings: {
        fontStyle: 'italic',
        foreground: palette.brightBlue,
      },
    },

    // ========================================================================
    // ES7 Bind Operator - palette[6] (cyan) with italic
    // ========================================================================
    {
      name: 'ES7 Bind Operator',
      scope: [
        'source.js constant.other.object.key.js string.unquoted.label.js',
      ],
      settings: {
        fontStyle: 'italic',
        foreground: palette.cyan,
      },
    },

  ];

  // Comprehensive Markdown support tokens
  const markdownTokens: TokenColor[] = [
    // ========================================================================
    // Markdown - Plain text - palette[3] (yellow)
    // ========================================================================
    {
      name: 'Markdown - Plain',
      scope: [
        'text.html.markdown',
        'punctuation.definition.list_item.markdown',
      ],
      settings: {
        foreground: palette.yellow,
      },
    },

    // ========================================================================
    // Markdown - Inline Code - palette[10] (brightGreen)
    // ========================================================================
    {
      name: 'Markdown - Markup Raw Inline',
      scope: [
        'text.html.markdown markup.inline.raw.markdown',
      ],
      settings: {
        foreground: palette.brightGreen,
      },
    },

    // ========================================================================
    // Markdown - Code Block Punctuation - palette[8] (brightBlack)
    // ========================================================================
    {
      name: 'Markdown - Markup Raw Inline Punctuation',
      scope: [
        'text.html.markdown markup.inline.raw.markdown punctuation.definition.raw.markdown',
      ],
      settings: {
        foreground: palette.brightBlack,
      },
    },

    // ========================================================================
    // Markdown - Headings - palette[1] (red)
    // ========================================================================
    {
      name: 'Markdown - Heading',
      scope: [
        'markdown.heading',
        'markup.heading | markup.heading entity.name',
        'markup.heading.markdown punctuation.definition.heading.markdown',
      ],
      settings: {
        foreground: palette.red,
      },
    },

    // ========================================================================
    // Markdown - Italic - palette[11] (brightYellow) with italic
    // ========================================================================
    {
      name: 'Markup - Italic',
      scope: [
        'markup.italic',
      ],
      settings: {
        fontStyle: 'italic',
        foreground: palette.brightYellow,
      },
    },

    // ========================================================================
    // Markdown - Bold - palette[11] (brightYellow) with bold
    // ========================================================================
    {
      name: 'Markup - Bold',
      scope: [
        'markup.bold',
        'markup.bold string',
      ],
      settings: {
        fontStyle: 'bold',
        foreground: palette.brightYellow,
      },
    },

    // ========================================================================
    // Markdown - Bold-Italic - palette[11] (brightYellow) with bold
    // ========================================================================
    {
      name: 'Markup - Bold-Italic',
      scope: [
        'markup.bold markup.italic',
        'markup.italic markup.bold',
        'markup.quote markup.bold',
        'markup.bold markup.italic string',
        'markup.italic markup.bold string',
        'markup.quote markup.bold string',
      ],
      settings: {
        fontStyle: 'bold',
        foreground: palette.brightYellow,
      },
    },

    // ========================================================================
    // Markdown - Underline - palette[9] (brightRed) with underline
    // ========================================================================
    {
      name: 'Markup - Underline',
      scope: [
        'markup.underline',
      ],
      settings: {
        fontStyle: 'underline',
        foreground: palette.brightRed,
      },
    },

    // ========================================================================
    // Markdown - Blockquote - palette[8] (brightBlack)
    // ========================================================================
    {
      name: 'Markdown - Blockquote',
      scope: [
        'markup.quote punctuation.definition.blockquote.markdown',
      ],
      settings: {
        foreground: palette.brightBlack,
      },
    },

    // ========================================================================
    // Markdown - Quote - italic style
    // ========================================================================
    {
      name: 'Markup - Quote',
      scope: [
        'markup.quote',
      ],
      settings: {
        fontStyle: 'italic',
      },
    },

    // ========================================================================
    // Markdown - Link - palette[12] (brightBlue)
    // ========================================================================
    {
      name: 'Markdown - Link',
      scope: [
        'string.other.link.title.markdown',
      ],
      settings: {
        foreground: palette.brightBlue,
      },
    },

    // ========================================================================
    // Markdown - Link Description - palette[10] (brightGreen)
    // ========================================================================
    {
      name: 'Markdown - Link Description',
      scope: [
        'string.other.link.description.title.markdown',
      ],
      settings: {
        foreground: palette.brightGreen,
      },
    },

    // ========================================================================
    // Markdown - Link Anchor - palette[5] (magenta)
    // ========================================================================
    {
      name: 'Markdown - Link Anchor',
      scope: [
        'constant.other.reference.link.markdown',
      ],
      settings: {
        foreground: palette.magenta,
      },
    },

    // ========================================================================
    // Markdown - Raw Block - palette[10] (brightGreen)
    // ========================================================================
    {
      name: 'Markup - Raw Block',
      scope: [
        'markup.raw.block',
      ],
      settings: {
        foreground: palette.brightGreen,
      },
    },

    // ========================================================================
    // Markdown - Fenced Code Block - Semi-transparent
    // ========================================================================
    {
      name: 'Markdown - Raw Block Fenced',
      scope: [
        'markup.raw.block.fenced.markdown',
      ],
      settings: {
        foreground: '#00000050',
      },
    },

    // ========================================================================
    // Markdown - Code Fence - Semi-transparent
    // ========================================================================
    {
      name: 'Markdown - Fenced Code Block',
      scope: [
        'punctuation.definition.fenced.markdown',
      ],
      settings: {
        foreground: '#00000050',
      },
    },

    // ========================================================================
    // Markdown - Code Language - palette[3] (yellow)
    // ========================================================================
    {
      name: 'Markdown - Fenced Code Block Variable',
      scope: [
        'markup.raw.block.fenced.markdown',
        'variable.language.fenced.markdown',
        'punctuation.section.class.end',
      ],
      settings: {
        foreground: palette.yellow,
      },
    },

    // ========================================================================
    // Markdown - Language Identifier - palette[8] (brightBlack)
    // ========================================================================
    {
      name: 'Markdown - Fenced Language',
      scope: [
        'variable.language.fenced.markdown',
      ],
      settings: {
        foreground: palette.brightBlack,
      },
    },

    // ========================================================================
    // Markdown - Separator - palette[8] (brightBlack) with bold
    // ========================================================================
    {
      name: 'Markdown - Separator',
      scope: [
        'meta.separator',
      ],
      settings: {
        fontStyle: 'bold',
        foreground: palette.brightBlack,
      },
    },

    // ========================================================================
    // Markdown - Table - palette[3] (yellow)
    // ========================================================================
    {
      name: 'Markup - Table',
      scope: [
        'markup.table',
      ],
      settings: {
        foreground: palette.yellow,
      },
    },
  ];

  // Advanced language and framework support
  const advancedTokens: TokenColor[] = [
    // ========================================================================
    // Storage Type Modifier - palette[5] (magenta)
    // ========================================================================
    {
      name: 'Storage Type Modifier',
      scope: [
        'storage.type.class',
        'storage.type.function',
        'storage.type.interface',
        'storage.type.type',
      ],
      settings: {
        foreground: palette.magenta,
      },
    },

    // ========================================================================
    // This, Self, Me - palette[6] (cyan) with italic
    // ========================================================================
    {
      name: 'This, Self, Me',
      scope: [
        'variable.language.this',
        'variable.language.self',
        'variable.language.special.self',
        'variable.parameter.function.language.special.self',
      ],
      settings: {
        foreground: palette.cyan,
        fontStyle: 'italic',
      },
    },

    // ========================================================================
    // Punctuation - palette[8] (brightBlack) with reduced opacity
    // ========================================================================
    {
      name: 'Punctuation',
      scope: [
        'punctuation.definition.string',
        'punctuation.definition.array',
        'punctuation.definition.dict',
        'punctuation.definition.parameters',
        'punctuation.definition.arguments',
      ],
      settings: {
        foreground: palette.brightBlack,
      },
    },

    // ========================================================================
    // Template Strings - palette[1] (red)
    // ========================================================================
    {
      name: 'Template Strings',
      scope: [
        'string.template',
        'punctuation.definition.template-expression',
      ],
      settings: {
        foreground: palette.red,
      },
    },

    // ========================================================================
    // Embedded Code - foreground
    // ========================================================================
    {
      name: 'Embedded Code',
      scope: [
        'meta.embedded',
        'source.groovy.embedded',
        'string meta.embedded',
      ],
      settings: {
        foreground: fg,
      },
    },

    // ========================================================================
    // Property Names - palette[12] (brightBlue)
    // ========================================================================
    {
      name: 'Property Names',
      scope: [
        'support.type.property-name',
        'meta.property-name',
        'entity.name.tag.yaml',
      ],
      settings: {
        foreground: palette.brightBlue,
      },
    },

    // ========================================================================
    // Annotations & Decorators - palette[3] (yellow) with italic
    // ========================================================================
    {
      name: 'Annotations & Decorators',
      scope: [
        'meta.decorator',
        'meta.decorator punctuation',
        'meta.annotation',
        'storage.type.annotation',
        'punctuation.decorator',
      ],
      settings: {
        foreground: palette.yellow,
        fontStyle: 'italic',
      },
    },

    // ========================================================================
    // Diff Header - palette[12] (brightBlue) with bold
    // ========================================================================
    {
      name: 'Diff Header',
      scope: [
        'meta.diff.header',
        'meta.diff.index',
        'meta.diff.range',
      ],
      settings: {
        foreground: palette.brightBlue,
        fontStyle: 'bold',
      },
    },

    // ========================================================================
    // Diff Inserted - palette[10] (brightGreen)
    // ========================================================================
    {
      name: 'Diff Inserted',
      scope: [
        'markup.inserted.diff',
        'meta.diff.header.to-file',
        'punctuation.definition.inserted',
      ],
      settings: {
        foreground: palette.brightGreen,
        background: withOpacity(palette.brightGreen, 0.13),
      },
    },

    // ========================================================================
    // Diff Deleted - palette[1] (red)
    // ========================================================================
    {
      name: 'Diff Deleted',
      scope: [
        'markup.deleted.diff',
        'meta.diff.header.from-file',
        'punctuation.definition.deleted',
      ],
      settings: {
        foreground: palette.red,
        background: withOpacity(palette.red, 0.13),
      },
    },

    // ========================================================================
    // Diff Changed - palette[3] (yellow)
    // ========================================================================
    {
      name: 'Diff Changed',
      scope: [
        'markup.changed.diff',
        'punctuation.definition.changed',
      ],
      settings: {
        foreground: palette.yellow,
        background: withOpacity(palette.yellow, 0.13),
      },
    },

    // ========================================================================
    // GraphQL - palette[13] (brightMagenta)
    // ========================================================================
    {
      name: 'GraphQL',
      scope: [
        'support.type.graphql',
        'variable.fragment.graphql',
        'variable.operation.graphql',
      ],
      settings: {
        foreground: palette.brightMagenta,
      },
    },

    // ========================================================================
    // SQL Keywords - palette[10] (brightGreen) with bold
    // ========================================================================
    {
      name: 'SQL Keywords',
      scope: [
        'keyword.other.sql',
        'keyword.other.DML.sql',
        'keyword.other.DDL.sql',
        'keyword.other.alias.sql',
      ],
      settings: {
        foreground: palette.brightGreen,
        fontStyle: 'bold',
      },
    },

    // ========================================================================
    // Shell Variables - palette[14] (brightCyan)
    // ========================================================================
    {
      name: 'Shell Variables',
      scope: [
        'variable.other.bracket.shell',
        'variable.other.normal.shell',
        'punctuation.definition.variable.shell',
      ],
      settings: {
        foreground: palette.brightCyan,
      },
    },

    // ========================================================================
    // Dockerfile Keywords - palette[5] (magenta) with bold
    // ========================================================================
    {
      name: 'Dockerfile Keywords',
      scope: [
        'keyword.other.special-method.dockerfile',
        'keyword.control.dockerfile',
      ],
      settings: {
        foreground: palette.magenta,
        fontStyle: 'bold',
      },
    },

    // ========================================================================
    // TOML Keys - palette[12] (brightBlue)
    // ========================================================================
    {
      name: 'TOML Keys',
      scope: [
        'support.type.property-name.toml',
        'entity.name.section.toml',
        'entity.name.tag.toml',
      ],
      settings: {
        foreground: palette.brightBlue,
      },
    },

    // ========================================================================
    // INI Section Headers - palette[13] (brightMagenta) with bold
    // ========================================================================
    {
      name: 'INI Section Headers',
      scope: [
        'entity.name.section.ini',
        'meta.embedded.block.ini',
      ],
      settings: {
        foreground: palette.brightMagenta,
        fontStyle: 'bold',
      },
    },

    // ========================================================================
    // Type Annotations - palette[14] (brightCyan)
    // ========================================================================
    {
      name: 'Type Annotations',
      scope: [
        'meta.type.annotation',
        'meta.return-type',
        'support.type.primitive',
        'entity.name.type',
      ],
      settings: {
        foreground: palette.brightCyan,
      },
    },

    // ========================================================================
    // Documentation Comments - palette[8] (brightBlack) with italic
    // ========================================================================
    {
      name: 'Documentation Comments',
      scope: [
        'comment.block.documentation',
        'comment.line.documentation',
        'storage.type.class.jsdoc',
        'entity.name.type.instance.jsdoc',
        'variable.other.jsdoc',
        'punctuation.definition.block.tag.jsdoc',
        'comment.block.documentation punctuation',
        'comment.block.documentation punctuation.section',
        'comment.block.documentation punctuation.definition',
      ],
      settings: {
        foreground: palette.brightBlack,
        fontStyle: 'italic',
      },
    },

    // ========================================================================
    // Import/Export Keywords - palette[10] (brightGreen) with italic
    // ========================================================================
    {
      name: 'Import/Export Keywords',
      scope: [
        'keyword.control.import',
        'keyword.control.export',
        'keyword.control.from',
        'keyword.control.as',
        'keyword.control.default',
      ],
      settings: {
        foreground: palette.brightGreen,
        fontStyle: 'italic',
      },
    },

    // ========================================================================
    // Async/Await Keywords - palette[13] (brightMagenta) with italic
    // ========================================================================
    {
      name: 'Async/Await Keywords',
      scope: [
        'keyword.control.flow.js',
        'keyword.control.flow.ts',
        'keyword.control.flow.tsx',
        'keyword.control.flow.python',
      ],
      settings: {
        foreground: palette.brightMagenta,
        fontStyle: 'italic',
      },
    },

    // ========================================================================
    // Try/Catch/Finally - palette[1] (red) with italic
    // ========================================================================
    {
      name: 'Try/Catch/Finally',
      scope: [
        'keyword.control.trycatch',
        'keyword.control.exception',
      ],
      settings: {
        foreground: palette.red,
        fontStyle: 'italic',
      },
    },

    // ========================================================================
    // Output/Debug Console Log Levels - semantic info/warn/error/debug
    // ========================================================================
    {
      name: 'Output Log Levels',
      scope: [
        'token.info-token',
      ],
      settings: {
        foreground: palette.brightBlue,
      },
    },
    {
      name: 'Output Log Levels',
      scope: [
        'token.warn-token',
      ],
      settings: {
        foreground: palette.yellow,
      },
    },
    {
      name: 'Output Log Levels',
      scope: [
        'token.error-token',
      ],
      settings: {
        foreground: palette.red,
      },
    },
    {
      name: 'Output Log Levels',
      scope: [
        'token.debug-token',
      ],
      settings: {
        foreground: palette.brightMagenta,
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

  return [...baseTokens, ...markdownTokens, ...advancedTokens, ...jsonTokens];
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
 * resolveThemeName('./afterglow.ghostty'); // 'afterglow'
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
    const baseName = basename(filePath, extname(filePath));

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
    const type = isLightBackground(colors.background || '#000000') ? 'light' : 'dark';

    return {
      name,
      type,
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
  const accent = colors['cursor-color'] || colors.cursor || roleMap.red.hex;

  return {
    primary: {
      background: colors.background || roleMap.black.hex,
      foreground: colors.foreground || roleMap.brightWhite.hex,
      cursor: colors['cursor-color'] || colors.cursor || colors.cursor_text || roleMap.brightWhite.hex,
      accent,
    },
    selection: {
      background: colors['selection-background'] || colors.selection_background || accent,
      foreground: colors['selection-foreground'] || colors.selection_foreground || colors.foreground || roleMap.brightWhite.hex,
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

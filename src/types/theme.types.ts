/**
 * Theme-related type definitions for VS Code Theme Generator
 * Includes Ghostty color format, VS Code theme structure, and color mappings
 */

// ============================================================================
// Ghostty Theme Types
// ============================================================================

/**
 * Represents the color configuration from a Ghostty terminal theme file
 * Contains all supported colors including the 16-color palette
 */
export interface GhosttyColors {
  /** Terminal background color */
  background?: string;
  /** Default text color */
  foreground?: string;
  /** Cursor color */
  cursor?: string;
  /** Text color under the cursor */
  cursor_text?: string;
  /** Selected text foreground color */
  selection_foreground?: string;
  /** Selected text background color */
  selection_background?: string;

  // Terminal color palette (color0-color15)
  /** Black (ANSI color 0) */
  color0?: string;
  /** Red (ANSI color 1) */
  color1?: string;
  /** Green (ANSI color 2) */
  color2?: string;
  /** Yellow (ANSI color 3) */
  color3?: string;
  /** Blue (ANSI color 4) */
  color4?: string;
  /** Magenta (ANSI color 5) */
  color5?: string;
  /** Cyan (ANSI color 6) */
  color6?: string;
  /** White (ANSI color 7) */
  color7?: string;
  /** Bright black (ANSI color 8) */
  color8?: string;
  /** Bright red (ANSI color 9) */
  color9?: string;
  /** Bright green (ANSI color 10) */
  color10?: string;
  /** Bright yellow (ANSI color 11) */
  color11?: string;
  /** Bright blue (ANSI color 12) */
  color12?: string;
  /** Bright magenta (ANSI color 13) */
  color13?: string;
  /** Bright cyan (ANSI color 14) */
  color14?: string;
  /** Bright white (ANSI color 15) */
  color15?: string;

  /** Additional custom colors */
  [key: string]: string | undefined;
}

// ============================================================================
// VS Code Theme Types
// ============================================================================

/**
 * VS Code theme metadata for extension package.json
 */
export interface ThemeMetadata {
  /** Theme name (used internally) */
  name: string;
  /** Display name shown in VS Code */
  displayName: string;
  /** Theme description */
  description: string;
  /** Extension version */
  version: string;
  /** Extension publisher */
  publisher: string;
  /** License type */
  license: string;
  /** Extension author */
  author?: string;
  /** Search keywords */
  keywords?: string[];
  /** VS Code categories */
  categories?: string[];
  /** Repository information */
  repository?: {
    type: string;
    url: string;
  };
}

/**
 * VS Code workbench and editor color definitions
 * Maps VS Code color keys to hex color values
 */
export interface VSCodeThemeColors {
  // Editor colors
  'editor.background': string;
  'editor.foreground': string;
  'editor.lineHighlightBackground': string;
  'editor.selectionBackground': string;
  'editor.selectionForeground': string;
  'editor.inactiveSelectionBackground': string;
  'editor.wordHighlightBackground': string;
  'editor.wordHighlightStrongBackground': string;
  'editor.findMatchBackground': string;
  'editor.findMatchHighlightBackground': string;
  'editor.hoverHighlightBackground': string;
  'editor.lineHighlightBorder': string;
  'editor.rangeHighlightBackground': string;

  // Workbench colors
  'workbench.colorTheme': string;
  'activityBar.background': string;
  'activityBar.foreground': string;
  'sideBar.background': string;
  'sideBar.foreground': string;
  'statusBar.background': string;
  'statusBar.foreground': string;
  'titleBar.activeBackground': string;
  'titleBar.activeForeground': string;

  // Terminal colors
  'terminal.background': string;
  'terminal.foreground': string;
  'terminal.ansiBlack': string;
  'terminal.ansiRed': string;
  'terminal.ansiGreen': string;
  'terminal.ansiYellow': string;
  'terminal.ansiBlue': string;
  'terminal.ansiMagenta': string;
  'terminal.ansiCyan': string;
  'terminal.ansiWhite': string;
  'terminal.ansiBrightBlack': string;
  'terminal.ansiBrightRed': string;
  'terminal.ansiBrightGreen': string;
  'terminal.ansiBrightYellow': string;
  'terminal.ansiBrightBlue': string;
  'terminal.ansiBrightMagenta': string;
  'terminal.ansiBrightCyan': string;
  'terminal.ansiBrightWhite': string;

  /** Additional VS Code color keys */
  [key: string]: string | undefined;
}

/**
 * Token color definition for syntax highlighting
 */
export interface TokenColor {
  /** Human-readable name for the token rule */
  name?: string;
  /** TextMate scope(s) to match */
  scope: string | string[];
  /** Color and style settings */
  settings: {
    /** Foreground color */
    foreground?: string;
    /** Background color */
    background?: string;
    /** Font style (bold, italic, underline) */
    fontStyle?: string;
  };
}

/**
 * Complete VS Code theme structure
 */
export interface VSCodeTheme {
  /** Theme name */
  name: string;
  /** Theme type */
  type: 'dark' | 'light';
  /** Workbench and editor colors */
  colors: VSCodeThemeColors;
  /** Token colors for syntax highlighting */
  tokenColors: TokenColor[];
}

// ============================================================================
// Color Mapping Types
// ============================================================================

/**
 * Represents a semantic color role in the terminal palette
 */
export interface ColorRole {
  /** Color role name */
  name: string;
  /** Hex color value */
  hex: string;
  /** Usage contexts for this color */
  usage: string[];
}

/**
 * Complete mapping of all 16 terminal colors to their semantic roles
 */
export interface ColorRoleMap {
  black: ColorRole;
  red: ColorRole;
  green: ColorRole;
  yellow: ColorRole;
  blue: ColorRole;
  magenta: ColorRole;
  cyan: ColorRole;
  white: ColorRole;
  brightBlack: ColorRole;
  brightRed: ColorRole;
  brightGreen: ColorRole;
  brightYellow: ColorRole;
  brightBlue: ColorRole;
  brightMagenta: ColorRole;
  brightCyan: ColorRole;
  brightWhite: ColorRole;
}

// ============================================================================
// Color Validation Types
// ============================================================================

/**
 * Result of theme file validation
 */
export interface ColorValidationResult {
  /** Whether all colors are valid */
  isValid: boolean;
  /** Validation error message */
  error?: string;
  /** Suggested fixes */
  suggestions?: string[];
  /** Non-blocking warnings */
  warnings?: string[];
  /** Invalid color keys */
  invalidColors?: string[];
  /** Missing required colors */
  missingColors?: string[];
}

/**
 * Parsed theme file with validation results
 */
export interface ParsedThemeFile {
  /** Extracted color data */
  colors: GhosttyColors;
  /** File metadata */
  metadata?: {
    fileName: string;
    filePath: string;
    fileSize: number;
    lastModified: Date;
  };
  /** Validation results */
  validation: ColorValidationResult;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if an object is a valid GhosttyColors structure
 */
export const isGhosttyColors = (obj: unknown): obj is GhosttyColors => {
  return typeof obj === 'object' && obj !== null;
};

/**
 * Type guard to check if a string is a valid hex color
 */
export const isValidHexColor = (color: string): boolean => {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
};

/**
 * Consolidated type definitions for VS Code Theme Generator
 * All types unified for better maintainability
 */

// ============================================================================
// Core Form Data & Application State
// ============================================================================

export interface FormData {
  inputFile: string;
  themeName: string;
  description: string;
  version: string;
  publisher: string;
  license: string;
  outputPath: string;
  generateReadme: boolean;
  generateChangelog: boolean;
  generateFullExtension: boolean;
  generateQuickstart: boolean;
  preserveSourceTheme: boolean;
  generateGitIgnore: boolean;
  generateVSCodeIgnore: boolean;
  skipToStep?: string;
}

export interface ThemeData {
  colors: GhosttyColors;
  theme: VSCodeTheme;
}

export type Step = 'file' | 'theme' | 'options' | 'advanced' | 'process' | 'success' | 'error';

// ============================================================================
// Theme Types (Ghostty)
// ============================================================================

export interface GhosttyColors {
  background?: string;
  foreground?: string;
  cursor?: string;
  'cursor-color'?: string;
  'cursor-text'?: string;
  cursor_text?: string;
  selection_background?: string;
  'selection-background'?: string;
  selection_foreground?: string;
  'selection-foreground'?: string;

  // Terminal color palette (color0-color15)
  color0?: string;
  color1?: string;
  color2?: string;
  color3?: string;
  color4?: string;
  color5?: string;
  color6?: string;
  color7?: string;
  color8?: string;
  color9?: string;
  color10?: string;
  color11?: string;
  color12?: string;
  color13?: string;
  color14?: string;
  color15?: string;

  [key: string]: string | undefined;
}

// ============================================================================
// VS Code Theme Types
// ============================================================================

export interface VSCodeThemeColors {
  'editor.background': string;
  'editor.foreground': string;
  'editor.lineHighlightBackground'?: string;
  'editor.selectionBackground': string;
  'editor.selectionForeground'?: string;
  'editor.inactiveSelectionBackground'?: string;
  'editor.wordHighlightBackground'?: string;
  'editor.wordHighlightStrongBackground'?: string;
  'editor.findMatchBackground'?: string;
  'editor.findMatchHighlightBackground'?: string;
  'editor.hoverHighlightBackground'?: string;
  'editor.lineHighlightBorder'?: string;
  'editor.rangeHighlightBackground'?: string;
  'editorCursor.foreground': string;

  // Workbench colors
  'activityBar.background'?: string;
  'activityBar.foreground'?: string;
  'sideBar.background'?: string;
  'sideBar.foreground'?: string;
  'statusBar.background'?: string;
  'statusBar.foreground'?: string;
  'titleBar.activeBackground'?: string;
  'titleBar.activeForeground'?: string;

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

  [key: string]: string | undefined;
}

export interface TokenColor {
  name?: string;
  scope: string | string[];
  settings: {
    foreground?: string;
    background?: string;
    fontStyle?: string;
  };
}

export interface VSCodeTheme {
  name: string;
  type: 'dark' | 'light';
  colors: VSCodeThemeColors;
  tokenColors: TokenColor[];
}

// ============================================================================
// Generation Options & Results
// ============================================================================

export interface GenerationOptions {
  themeName: string;
  description: string;
  version: string;
  publisher: string;
  license: string;
  outputPath: string;
  generateReadme: boolean;
  generateChangelog: boolean;
  generateQuickstart?: boolean;
  generateFullExtension?: boolean;
  preserveSourceTheme?: boolean;
  sourcePath?: string;
  galleryBannerColor?: string;
  generateGitIgnore?: boolean;
  generateVSCodeIgnore?: boolean;
}

export interface GeneratedFile {
  filename?: string;
  content: string;
  type: 'json' | 'markdown' | 'text';
  path?: string;
  size?: number;
}

export interface GenerationResults {
  files: GeneratedFile[];
  generatedFiles?: number;
  outputPath: string;
  success: boolean;
  totalFiles?: number;
}

// ============================================================================
// Color Mapping & Analysis
// ============================================================================

export interface ColorRole {
  name: string;
  hex: string;
  usage: string[];
  description?: string;
}

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
  background: ColorRole;
  foreground: ColorRole;
  cursor: ColorRole;
  selection: ColorRole;
}

export interface ParsedThemeFile {
  colors: GhosttyColors;
  metadata?: {
    fileName: string;
    filePath: string;
    fileSize: number;
    lineCount: number;
    lastModified?: string | Date;
  };
}

// ============================================================================
// Validation & Error Types
// ============================================================================

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  suggestions?: string[];
  warnings?: string[];
  normalizedPath?: string;
  details?: {
    fileExists: boolean;
    hasValidExtension: boolean;
    isReadable: boolean;
    size?: number;
  };
}

export interface ColorValidationResult {
  isValid: boolean;
  normalizedColor?: string;
  error?: string;
  warnings?: string[];
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public suggestions?: string[],
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class FileProcessingError extends Error {
  constructor(
    message: string,
    public filePath?: string,
    public lineNumber?: number,
  ) {
    super(message);
    this.name = 'FileProcessingError';
  }
}

export class GenerationError extends Error {
  constructor(
    message: string,
    public operation?: string,
  ) {
    super(message);
    this.name = 'GenerationError';
  }
}

export class SecurityError extends Error {
  constructor(
    message: string,
    public operation?: string,
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

export const isValidHexColor = (color: string): boolean => {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
};

// ============================================================================
// Ink UI Types (for terminal interfaces)
// ============================================================================

export interface InkKeyEvent {
  // Basic navigation keys
  return?: boolean;
  escape?: boolean;
  tab?: boolean;
  backspace?: boolean;
  delete?: boolean;

  // Modifier keys
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;

  // Arrow keys
  leftArrow?: boolean;
  rightArrow?: boolean;
  upArrow?: boolean;
  downArrow?: boolean;

  // Extended navigation
  pageDown?: boolean;
  pageUp?: boolean;
  home?: boolean;
  end?: boolean;

  // Special function keys
  f1?: boolean;
  f2?: boolean;
  f3?: boolean;
  f4?: boolean;
  f5?: boolean;
  f12?: boolean;
}

export interface InputHandlerResult {
  shouldSubmit: boolean;
  value: string;
}

export interface TextInputHook {
  value: string;
  setValue: (newValue: string) => void;
  handleInput: (input: string, key: InkKeyEvent) => InputHandlerResult;
  clear: () => void;
  cursorOffset: number;
  cursorPos: number;
}

// ============================================================================
// CLI Types
// ============================================================================

export interface CLIFlags {
  input?: string;
  output?: string;
  name?: string;
  description?: string;
  publisher?: string;
  version?: string;
  license?: string;
  readme?: boolean;
  changelog?: boolean;
  quickstart?: boolean;
}

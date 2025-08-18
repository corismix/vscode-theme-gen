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

export interface SemanticTokenStyle {
  foreground?: string;
  background?: string;
  fontStyle?: 'italic' | 'bold' | 'underline' | 'italic bold';
}

export interface VSCodeTheme {
  name: string;
  type: 'dark' | 'light';
  colors: VSCodeThemeColors;
  tokenColors: TokenColor[];
  semanticTokenColors?: Record<string, SemanticTokenStyle>;
  semanticHighlighting?: boolean;
}

// ============================================================================
// Phase 1: Pro Theme Generation Types
// ============================================================================

export interface BackgroundHierarchy {
  void: string;        // Level 0: Deepest shadows, invisible borders
  shadow: string;      // Level 1: Deep borders, separators
  depth: string;       // Level 2: Activity bar, status bar background
  surface: string;     // Level 3: Sidebar, panel backgrounds
  canvas: string;      // Level 4: Main editor background (base)
  overlay: string;     // Level 5: Dropdown menus, tooltips
  interactive: string; // Level 6: Input fields, form controls
  elevated: string;    // Level 7: Hover states, active elements
}

export interface AccentSystem {
  primary: {
    base: string;
    light: string;
    dark: string;
    muted: string;
  };
  secondary?: {
    base: string;
    light: string;
    dark: string;
    muted: string;
  };
}

export interface ExtendedPalette {
  primary: {
    red: string;
    green: string;
    blue: string;
    yellow: string;
    purple: string;
    cyan: string;
  };
  derived: {
    // Lightness variations
    redLight: string;
    redDark: string;
    greenLight: string;
    greenDark: string;
    blueLight: string;
    blueDark: string;
    yellowLight: string;
    yellowDark: string;
    purpleLight: string;
    purpleDark: string;
    cyanLight: string;
    cyanDark: string;
    
    // Saturation variations
    redMuted: string;
    greenMuted: string;
    blueMuted: string;
    yellowMuted: string;
    purpleMuted: string;
    cyanMuted: string;
    
    // Special purpose colors
    orangeWarm: string;
    orangeLight: string;
    orangeDark: string;
    mutedYellow: string;
    mutedCyan: string;
    rainbowPrimary: string;
    snippetAccent: string;
    eventAccent: string;
    selfAccent: string;
    magicMethod: string;
    typeAnnotation: string;
    genericType: string;
    builtinType: string;
    destructured: string;
    lifetime: string;
    attribute: string;
    componentName: string;
    hookFunction: string;
  };
  foreground: string;
}

export interface ProTheme {
  name: string;
  type: 'dark' | 'light';
  colors: VSCodeThemeColors;
  tokenColors: TokenColor[];
  semanticTokenColors: Record<string, SemanticTokenStyle>;
  semanticHighlighting: boolean;
}

export interface ThemeOptions {
  name?: string;
  type?: 'dark' | 'light';
  borderPhilosophy?: 'minimal' | 'structured' | 'outlined';
  rainbowIntensity?: 'vibrant' | 'subtle' | 'pastel';
  fontStyleStrategy?: 'conservative' | 'standard' | 'expressive';
}

export interface OpacityLevels {
  invisible: number;    // 0.00
  ghost: number;        // 0.03
  whisper: number;      // 0.06
  subtle: number;       // 0.08
  light: number;        // 0.10
  soft: number;         // 0.13
  gentle: number;       // 0.16
  visible: number;      // 0.19
  clear: number;        // 0.22
  defined: number;      // 0.26
  medium: number;       // 0.30
  strong: number;       // 0.35
  prominent: number;    // 0.40
  solid: number;        // 0.50
  heavy: number;        // 0.60
  opaque: number;       // 0.75
}

export interface OpacitySemantics {
  hover: number;
  focus: number;
  selection: number;
  highlight: number;
  findMatch: number;
  lineHighlight: number;
  error: number;
  warning: number;
  info: number;
  success: number;
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

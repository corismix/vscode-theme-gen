/**
 * Simplified types for VS Code Theme Generator
 * Consolidated from complex type system for better maintainability
 */

// ============================================================================
// Core Form Data
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
  generateQuickstart?: boolean;
  generateFullExtension?: boolean;
  skipToStep?: string;
}

// ============================================================================
// Theme Types (essential only)
// ============================================================================

export interface GhosttyColors {
  background?: string;
  foreground?: string;
  cursor?: string;
  'cursor-color'?: string;
  'cursor-text'?: string;
  selection_background?: string;
  'selection-background'?: string;
  selection_foreground?: string;
  'selection-foreground'?: string;
  [key: string]: string | undefined;
}

export interface VSCodeTheme {
  name: string;
  type: 'dark' | 'light';
  colors: VSCodeThemeColors;
  tokenColors: TokenColor[];
}

export interface VSCodeThemeColors {
  'editor.background': string;
  'editor.foreground': string;
  'editor.selectionBackground': string;
  'editorCursor.foreground': string;
  'terminal.background': string;
  'terminal.foreground': string;
  [key: string]: string;
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

// ============================================================================
// Generation Options
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
// CLI Flags
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

// ============================================================================
// Error Types (minimal)
// ============================================================================

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
// Theme Parsing Results
// ============================================================================

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

// ============================================================================
// Validation Results
// ============================================================================

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  suggestions?: string[];
  warnings?: string[];
}

export interface ColorValidationResult {
  isValid: boolean;
  normalizedColor?: string;
  error?: string;
}

// ============================================================================
// Navigation & State Types
// ============================================================================

export type StepName =
  | 'welcome'
  | 'file-selection'
  | 'theme-config'
  | 'extension-options'
  | 'progress'
  | 'success';

export const STEPS = {
  WELCOME: 'welcome' as const,
  FILE_SELECTION: 'file-selection' as const,
  THEME_CONFIG: 'theme-config' as const,
  EXTENSION_OPTIONS: 'extension-options' as const,
  PROGRESS: 'progress' as const,
  SUCCESS: 'success' as const,
};

export const STEP_ORDER: StepName[] = [
  'welcome',
  'file-selection',
  'theme-config',
  'extension-options',
  'progress',
  'success',
];

export interface ThemeGeneratorState {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  themeData: GhosttyColors | null;
  setThemeData: (data: GhosttyColors | null) => void;
  navigation: {
    currentStep: StepName;
    goToNextStep: () => void;
    goToPreviousStep: () => void;
    goToStep: (step: StepName) => void;
    canGoBack: boolean;
    canGoNext: boolean;
  };
  generationResults: GenerationResults | null;
  setGenerationResults: (results: GenerationResults | null) => void;
  error: string | null;
  handleError: (error: string) => void;
  clearError: () => void;
  config: GeneratorConfig;
  updateConfig: (updateFn: (config: GeneratorConfig) => GeneratorConfig) => void;
  restart: () => void;
  exit: () => void;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface RecentFile {
  path: string;
  name: string;
  lastUsed: string;
}

export interface UserPreferences {
  defaultPublisher?: string;
  defaultLicense?: string;
  outputDirectory?: string;
}

export interface ThemeDefaults {
  version: string;
  license: string;
}

export interface GeneratorConfig {
  version: string;
  lastModified: string;
  recentFiles: RecentFile[];
  preferences: UserPreferences;
  themeDefaults: ThemeDefaults;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  defaultLicense: 'MIT',
  outputDirectory: './my-theme',
};

export const DEFAULT_THEME_DEFAULTS: ThemeDefaults = {
  version: '0.0.1',
  license: 'MIT',
};

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ============================================================================
// Legacy exports for backward compatibility
// ============================================================================

export type { GhosttyColors as LegacyGhosttyColors } from './theme.types';
export type { VSCodeTheme as LegacyVSCodeTheme } from './theme.types';

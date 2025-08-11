/**
 * Comprehensive type definitions for VS Code Theme Generator
 * Following TweakCC patterns for type-safe development
 */

// ============================================================================
// Core Theme Types
// ============================================================================

export interface GhosttyColors {
  background?: string;
  foreground?: string;
  cursor?: string;
  cursor_text?: string;
  selection_foreground?: string;
  selection_background?: string;
  // Terminal color palette (color0-color15)
  color0?: string;  // black
  color1?: string;  // red
  color2?: string;  // green
  color3?: string;  // yellow
  color4?: string;  // blue
  color5?: string;  // magenta
  color6?: string;  // cyan
  color7?: string;  // white
  color8?: string;  // bright black
  color9?: string;  // bright red
  color10?: string; // bright green
  color11?: string; // bright yellow
  color12?: string; // bright blue
  color13?: string; // bright magenta
  color14?: string; // bright cyan
  color15?: string; // bright white
  [key: string]: string | undefined;
}

export interface ThemeMetadata {
  name: string;
  displayName: string;
  description: string;
  version: string;
  publisher: string;
  license: string;
  author?: string;
  keywords?: string[];
  categories?: string[];
  repository?: {
    type: string;
    url: string;
  };
}

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
// Configuration Types
// ============================================================================

export interface UserPreferences {
  defaultPublisher?: string;
  defaultLicense?: string;
  defaultOutputPath?: string;
  autoOpenVSCode?: boolean;
  generateFullExtension?: boolean;
  generateReadme?: boolean;
  generateChangelog?: boolean;
  generateQuickstart?: boolean;
  maxRecentFiles?: number;
}

export interface RecentFile {
  path: string;
  name: string;
  lastUsed: string;
  isValid?: boolean;
}

export interface GeneratorConfig {
  version: string;
  lastModified: string;
  recentFiles: RecentFile[];
  preferences: UserPreferences;
  themeDefaults: ThemeDefaults;
}

export interface ThemeDefaults {
  version: string;
  license: string;
  publisher: string;
  description: string;
  keywords: string[];
  categories: string[];
}

// ============================================================================
// Application State Types
// ============================================================================

export interface FormData {
  inputFile: string;
  themeName: string;
  description: string;
  version: string;
  publisher: string;
  license: string;
  outputPath: string;
  generateFullExtension: boolean;
  generateReadme: boolean;
  generateChangelog: boolean;
  generateQuickstart: boolean;
  skipToStep?: string;
}

export type StepName = 
  | 'welcome'
  | 'file-selection'  
  | 'theme-config'
  | 'extension-options'
  | 'progress'
  | 'success';

export interface StepNavigation {
  currentStep: StepName;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  goToStep: (step: StepName) => void;
  canGoBack: boolean;
  canGoNext: boolean;
}

export interface ThemeGeneratorState {
  // Form data
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  
  // Theme data
  themeData: GhosttyColors | null;
  setThemeData: (data: GhosttyColors | null) => void;
  
  // Navigation
  navigation: StepNavigation;
  
  // Results
  generationResults: GenerationResults | null;
  setGenerationResults: (results: GenerationResults | null) => void;
  
  // Error handling
  error: string | null;
  handleError: (error: string) => void;
  clearError: () => void;
  
  // Configuration
  config: GeneratorConfig;
  updateConfig: (updateFn: (config: GeneratorConfig) => GeneratorConfig) => void;
  
  // Actions
  restart: () => void;
  exit: () => void;
}

// ============================================================================
// File Processing Types
// ============================================================================

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  suggestions?: string[];
  warnings?: string[];
}

export interface ParsedThemeFile {
  colors: GhosttyColors;
  metadata?: {
    fileName: string;
    filePath: string;
    fileSize: number;
    lastModified: Date;
  };
  validation: FileValidationResult;
}

// ============================================================================
// Generation Types
// ============================================================================

export interface GenerationOptions {
  themeName: string;
  description: string;
  publisher: string;
  version: string;
  license: string;
  outputPath: string;
  generateFullExtension: boolean;
  generateReadme: boolean;
  generateChangelog: boolean;
  generateQuickstart: boolean;
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'json' | 'markdown' | 'text' | 'other';
  size: number;
}

export interface GenerationResults {
  success: boolean;
  outputPath: string;
  generatedFiles: GeneratedFile[];
  themeFile: GeneratedFile;
  packageFile: GeneratedFile;
  totalFiles: number;
  totalSize: number;
  duration: number;
  error?: string;
  warnings?: string[];
}

export interface GenerationProgress {
  currentStep: string;
  progress: number; // 0-100
  message: string;
  isComplete: boolean;
  error?: string;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface BaseStepProps {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  themeData: GhosttyColors | null;
  setThemeData: (data: GhosttyColors | null) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  goToStep: (step: StepName) => void;
  handleError: (error: string) => void;
  clearError: () => void;
  error: string | null;
  generationResults: GenerationResults | null;
  setGenerationResults: (results: GenerationResults | null) => void;
  restart: () => void;
  exit: () => void;
}

export interface AppProps {
  initialData?: Partial<FormData>;
}

// ============================================================================
// UI Component Types
// ============================================================================

export interface SelectItem {
  name: string;
  value: string;
  description?: string;
  isValid?: boolean;
  metadata?: Record<string, unknown>;
}

export interface SelectInputProps {
  items: SelectItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onSubmit: (item: SelectItem) => void;
  placeholder?: string;
  searchable?: boolean;
  maxHeight?: number;
}

export interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  mask?: string;
  showCursor?: boolean;
  highlightPastedText?: boolean;
}

export interface NotificationProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onDismiss?: () => void;
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

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
  help?: boolean;
}

export interface CLIValidationError {
  flag: string;
  message: string;
  suggestion?: string;
}

// ============================================================================
// Theme Color Mapping Types
// ============================================================================

export interface ColorRole {
  name: string;
  hex: string;
  usage: string[];
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
}

// ============================================================================
// Error Types
// ============================================================================

export interface ThemeGeneratorError extends Error {
  code: string;
  context?: Record<string, unknown>;
  suggestions?: string[];
}

export class ValidationError extends Error implements ThemeGeneratorError {
  code = 'VALIDATION_ERROR';
  context?: Record<string, unknown>;
  suggestions?: string[];
  
  constructor(message: string, context?: Record<string, unknown>, suggestions?: string[]) {
    super(message);
    this.name = 'ValidationError';
    this.context = context;
    this.suggestions = suggestions;
  }
}

export class FileProcessingError extends Error implements ThemeGeneratorError {
  code = 'FILE_PROCESSING_ERROR';
  context?: Record<string, unknown>;
  suggestions?: string[];
  
  constructor(message: string, context?: Record<string, unknown>, suggestions?: string[]) {
    super(message);
    this.name = 'FileProcessingError';
    this.context = context;
    this.suggestions = suggestions;
  }
}

export class GenerationError extends Error implements ThemeGeneratorError {
  code = 'GENERATION_ERROR';
  context?: Record<string, unknown>;
  suggestions?: string[];
  
  constructor(message: string, context?: Record<string, unknown>, suggestions?: string[]) {
    super(message);
    this.name = 'GenerationError';
    this.context = context;
    this.suggestions = suggestions;
  }
}

// ============================================================================
// Type Guards
// ============================================================================

export const isGhosttyColors = (obj: unknown): obj is GhosttyColors => {
  return typeof obj === 'object' && obj !== null;
};

export const isValidStepName = (step: string): step is StepName => {
  return ['welcome', 'file-selection', 'theme-config', 'extension-options', 'progress', 'success'].includes(step);
};

export const isThemeGeneratorError = (error: unknown): error is ThemeGeneratorError => {
  return error instanceof Error && 'code' in error;
};

// ============================================================================
// Constants
// ============================================================================

export const STEPS = {
  WELCOME: 'welcome' as const,
  FILE_SELECTOR: 'file-selection' as const,
  THEME_CONFIG: 'theme-config' as const,
  EXTENSION_OPTIONS: 'extension-options' as const,
  PROGRESS: 'progress' as const,
  SUCCESS: 'success' as const,
} as const;

export const STEP_ORDER: readonly StepName[] = [
  STEPS.WELCOME,
  STEPS.FILE_SELECTOR,
  STEPS.THEME_CONFIG,
  STEPS.EXTENSION_OPTIONS,
  STEPS.PROGRESS,
  STEPS.SUCCESS,
] as const;

export const DEFAULT_THEME_DEFAULTS: ThemeDefaults = {
  version: '0.0.1',
  license: 'MIT',
  publisher: '',
  description: '',
  keywords: ['theme', 'color-theme', 'vscode', 'ghostty'],
  categories: ['Themes'],
} as const;

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  autoOpenVSCode: false,
  generateFullExtension: true,
  generateReadme: true,
  generateChangelog: true,
  generateQuickstart: true,
  maxRecentFiles: 10,
} as const;

// ============================================================================
// Export all types - removed circular export
// ============================================================================
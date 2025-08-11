/**
 * Configuration and preferences type definitions
 * Includes user preferences, defaults, and application configuration
 * 
 * Note: Magic numbers and hard-coded limits have been moved to @/config
 */

import { FILE_LIMITS, SECURITY_LIMITS, UI_LIMITS, DEFAULT_VALUES } from '@/config';

// ============================================================================
// User Preferences
// ============================================================================

/**
 * User preferences stored persistently
 */
export interface UserPreferences {
  /** Default extension publisher */
  defaultPublisher?: string;
  /** Default license type */
  defaultLicense?: string;
  /** Default output directory */
  defaultOutputPath?: string;
  /** Whether to auto-open VS Code after generation */
  autoOpenVSCode?: boolean;
  /** Whether to generate full extension structure */
  generateFullExtension?: boolean;
  /** Whether to generate README file */
  generateReadme?: boolean;
  /** Whether to generate CHANGELOG file */
  generateChangelog?: boolean;
  /** Whether to generate quickstart guide */
  generateQuickstart?: boolean;
  /** Maximum number of recent files to track */
  maxRecentFiles?: number;
}

/**
 * Default user preferences
 */
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  autoOpenVSCode: false,
  generateFullExtension: true,
  generateReadme: true,
  generateChangelog: true,
  generateQuickstart: true,
  maxRecentFiles: UI_LIMITS.MAX_RECENT_FILES,
} as const;

// ============================================================================
// Theme Defaults
// ============================================================================

/**
 * Default values for new themes
 */
export interface ThemeDefaults {
  /** Default theme version */
  version: string;
  /** Default license type */
  license: string;
  /** Default publisher name */
  publisher: string;
  /** Default theme description */
  description: string;
  /** Default keywords for search */
  keywords: string[];
  /** Default VS Code categories */
  categories: string[];
}

/**
 * Default theme configuration
 */
export const DEFAULT_THEME_DEFAULTS: ThemeDefaults = {
  version: DEFAULT_VALUES.THEME_VERSION,
  license: DEFAULT_VALUES.LICENSE,
  publisher: '',
  description: '',
  keywords: DEFAULT_VALUES.THEME_KEYWORDS,
  categories: DEFAULT_VALUES.VSCODE_CATEGORIES,
} as const;

// ============================================================================
// Recent Files
// ============================================================================

/**
 * Recently used theme file
 */
export interface RecentFile {
  /** Full file path */
  path: string;
  /** Display name */
  name: string;
  /** Last used timestamp (ISO string) */
  lastUsed: string;
  /** Whether file still exists and is valid */
  isValid?: boolean;
}

// ============================================================================
// Application Configuration
// ============================================================================

/**
 * Complete application configuration
 */
export interface GeneratorConfig {
  /** Configuration version for migrations */
  version: string;
  /** Last configuration modification timestamp */
  lastModified: string;
  /** Recently used theme files */
  recentFiles: RecentFile[];
  /** User preferences */
  preferences: UserPreferences;
  /** Default theme settings */
  themeDefaults: ThemeDefaults;
}

// ============================================================================
// CLI Configuration
// ============================================================================

/**
 * CLI flags and options
 */
export interface CLIFlags {
  /** Input theme file path */
  input?: string;
  /** Output directory path */
  output?: string;
  /** Theme name override */
  name?: string;
  /** Theme description override */
  description?: string;
  /** Publisher name override */
  publisher?: string;
  /** Version override */
  version?: string;
  /** License override */
  license?: string;
  /** Generate README file */
  readme?: boolean;
  /** Generate CHANGELOG file */
  changelog?: boolean;
  /** Generate quickstart guide */
  quickstart?: boolean;
  /** Show help */
  help?: boolean;
}

/**
 * CLI validation error
 */
export interface CLIValidationError {
  /** Flag that failed validation */
  flag: string;
  /** Error message */
  message: string;
  /** Suggested fix */
  suggestion?: string;
}

// ============================================================================
// File Configuration
// ============================================================================

/**
 * File operation configuration
 */
export interface FileOperationConfig {
  /** Maximum file size in bytes */
  maxFileSize: number;
  /** Allowed file extensions */
  allowedExtensions: string[];
  /** File encoding */
  encoding: BufferEncoding;
  /** Whether to create backup files */
  createBackups: boolean;
}

/**
 * Default file operation configuration
 */
export const DEFAULT_FILE_CONFIG: FileOperationConfig = {
  maxFileSize: FILE_LIMITS.MAX_SIZE_BYTES,
  allowedExtensions: SECURITY_LIMITS.ALLOWED_FILE_EXTENSIONS,
  encoding: DEFAULT_VALUES.FILE_ENCODING,
  createBackups: false,
} as const;

// ============================================================================
// Validation Configuration
// ============================================================================

/**
 * Validation rules configuration
 */
export interface ValidationConfig {
  /** Whether to enforce strict color format validation */
  strictColorFormat: boolean;
  /** Whether to allow missing colors (use defaults) */
  allowMissingColors: boolean;
  /** Whether to validate file paths */
  validateFilePaths: boolean;
  /** Maximum theme name length */
  maxThemeNameLength: number;
  /** Maximum description length */
  maxDescriptionLength: number;
}

/**
 * Default validation configuration
 */
export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  strictColorFormat: true,
  allowMissingColors: true,
  validateFilePaths: true,
  maxThemeNameLength: SECURITY_LIMITS.MAX_THEME_NAME_LENGTH,
  maxDescriptionLength: SECURITY_LIMITS.MAX_DESCRIPTION_LENGTH,
} as const;

// ============================================================================
// Environment Configuration
// ============================================================================

/**
 * Environment-specific configuration
 */
export interface EnvironmentConfig {
  /** Whether running in development mode */
  isDevelopment: boolean;
  /** Whether to enable debug logging */
  enableDebugLogging: boolean;
  /** Application data directory */
  dataDirectory: string;
  /** Temporary files directory */
  tempDirectory: string;
  /** Configuration file path */
  configFilePath: string;
}

// ============================================================================
// Export Configuration Helpers
// ============================================================================

/**
 * Creates a default configuration object
 */
export const createDefaultConfig = (): GeneratorConfig => ({
  version: '1.0.0',
  lastModified: new Date().toISOString(),
  recentFiles: [],
  preferences: { ...DEFAULT_USER_PREFERENCES },
  themeDefaults: { ...DEFAULT_THEME_DEFAULTS },
});

/**
 * Validates configuration object structure
 */
export const isValidConfig = (config: unknown): config is GeneratorConfig => {
  if (typeof config !== 'object' || config === null) return false;
  
  const c = config as GeneratorConfig;
  return (
    typeof c.version === 'string' &&
    typeof c.lastModified === 'string' &&
    Array.isArray(c.recentFiles) &&
    typeof c.preferences === 'object' &&
    typeof c.themeDefaults === 'object'
  );
};
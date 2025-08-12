/**
 * Centralized configuration limits for the VS Code Theme Generator
 *
 * Comprehensive configuration system that consolidates all limits, thresholds,
 * and default values into environment-variable-configurable constants. Provides
 * secure defaults with validation, range checking, and human-readable documentation.
 *
 * Features:
 * - Environment variable overrides with fallbacks
 * - Range validation with min/max constraints
 * - Security-focused default values
 * - File size parsing with K/M/G suffixes
 * - Type-safe configuration exports
 * - Helper functions for validation and formatting
 *
 * Configuration Categories:
 * - FILE_LIMITS: File operation size and count limits
 * - SECURITY_LIMITS: Input validation and sanitization rules
 * - RESOURCE_LIMITS: Operation concurrency and rate limiting
 * - PERFORMANCE_LIMITS: Timeout and response time thresholds
 * - UI_LIMITS: User interface behavior and display limits
 * - DEFAULT_VALUES: Default configuration values
 *
 * @fileoverview Centralized configuration system with environment variable support
 * @since 1.0.0
 */

// ============================================================================
// Environment Variable Helpers
// ============================================================================

/**
 * Parse environment variable as number with fallback
 *
 * Safely parses an environment variable as an integer with fallback to default value.
 * Returns the fallback if the environment variable is undefined or not a valid number.
 *
 * @param envVar - Environment variable value (may be undefined)
 * @param fallback - Default value to use if parsing fails
 * @returns Parsed number or fallback value
 *
 * @example
 * ```typescript
 * const maxSize = parseEnvNumber(process.env.MAX_SIZE, 1024);
 * ```
 *
 * @since 1.0.0
 */
const parseEnvNumber = (envVar: string | undefined, fallback: number): number => {
  if (!envVar) return fallback;
  const parsed = parseInt(envVar, 10);
  return isNaN(parsed) ? fallback : parsed;
};

/**
 * Parse environment variable as bytes with suffix support (K, M, G)
 *
 * Parses environment variables with size suffixes (K/KB, M/MB, G/GB) into byte values.
 * Supports decimal values and provides fallback for invalid input.
 *
 * @param envVar - Environment variable value with optional suffix
 * @param fallback - Default byte value to use if parsing fails
 * @returns Parsed byte value or fallback
 *
 * @example
 * ```typescript
 * parseEnvBytes('1.5M', 1024); // Returns 1572864 (1.5 * 1024 * 1024)
 * parseEnvBytes('512K', 1024); // Returns 524288 (512 * 1024)
 * parseEnvBytes('invalid', 1024); // Returns 1024
 * ```
 *
 * @since 1.0.0
 */
const parseEnvBytes = (envVar: string | undefined, fallback: number): number => {
  if (!envVar) return fallback;

  const match = envVar.match(/^(\d+(?:\.\d+)?)\s*([KMG]B?)?$/i);
  if (!match) return fallback;

  const value = parseFloat(match[1]!);
  const unit = match[2]?.toUpperCase() || '';

  switch (unit) {
    case 'K':
    case 'KB':
      return Math.floor(value * 1024);
    case 'M':
    case 'MB':
      return Math.floor(value * 1024 * 1024);
    case 'G':
    case 'GB':
      return Math.floor(value * 1024 * 1024 * 1024);
    default:
      return Math.floor(value);
  }
};

// ============================================================================
// File Operation Limits
// ============================================================================

/**
 * File operation limits with environment variable overrides
 */
export const FILE_LIMITS = {
  /**
   * Maximum file size for theme files and other inputs
   * Environment: THEME_MAX_FILE_SIZE (supports K/M/G suffixes)
   * Default: 1MB
   * Range: 1KB - 100MB
   */
  MAX_SIZE_BYTES: Math.max(
    1024, // Minimum 1KB
    Math.min(
      100 * 1024 * 1024, // Maximum 100MB
      parseEnvBytes(process.env.THEME_MAX_FILE_SIZE, 1024 * 1024)
    )
  ),

  /**
   * Maximum file size for streaming operations
   * Environment: THEME_STREAMING_SIZE (supports K/M/G suffixes)
   * Default: 10MB
   * Range: 1MB - 1GB
   */
  STREAMING_MAX_SIZE_BYTES: Math.max(
    1024 * 1024, // Minimum 1MB
    Math.min(
      1024 * 1024 * 1024, // Maximum 1GB
      parseEnvBytes(process.env.THEME_STREAMING_SIZE, 10 * 1024 * 1024)
    )
  ),

  /**
   * Threshold for switching to streaming operations
   * Environment: THEME_STREAMING_THRESHOLD (supports K/M/G suffixes)
   * Default: 10MB
   * Range: 1MB - 100MB
   */
  STREAMING_THRESHOLD: Math.max(
    1024 * 1024, // Minimum 1MB
    Math.min(
      100 * 1024 * 1024, // Maximum 100MB
      parseEnvBytes(process.env.THEME_STREAMING_THRESHOLD, 10 * 1024 * 1024)
    )
  ),

  /**
   * Maximum number of lines in theme files
   * Environment: THEME_MAX_LINES
   * Default: 10000
   * Range: 100 - 1000000
   */
  MAX_LINES: Math.max(
    100, // Minimum 100 lines
    Math.min(
      1000000, // Maximum 1M lines
      parseEnvNumber(process.env.THEME_MAX_LINES, 10000)
    )
  ),

  /**
   * Maximum number of configuration lines
   * Environment: THEME_MAX_CONFIG_LINES
   * Default: 1000
   * Range: 10 - 10000
   */
  MAX_CONFIG_LINES: Math.max(
    10, // Minimum 10 lines
    Math.min(
      10000, // Maximum 10K lines
      parseEnvNumber(process.env.THEME_MAX_CONFIG_LINES, 1000)
    )
  ),

  /**
   * Stream processing chunk size
   * Environment: THEME_STREAM_CHUNK_SIZE (supports K/M suffixes)
   * Default: 64KB
   * Range: 1KB - 1MB
   */
  STREAM_CHUNK_SIZE: Math.max(
    1024, // Minimum 1KB
    Math.min(
      1024 * 1024, // Maximum 1MB
      parseEnvBytes(process.env.THEME_STREAM_CHUNK_SIZE, 64 * 1024)
    )
  ),

  /**
   * Progress update interval for large file operations
   * Environment: THEME_PROGRESS_INTERVAL (supports K/M suffixes)
   * Default: 1MB
   * Range: 64KB - 10MB
   */
  PROGRESS_INTERVAL: Math.max(
    64 * 1024, // Minimum 64KB
    Math.min(
      10 * 1024 * 1024, // Maximum 10MB
      parseEnvBytes(process.env.THEME_PROGRESS_INTERVAL, 1024 * 1024)
    )
  ),
} as const;

// ============================================================================
// Security Limits
// ============================================================================

/**
 * Security-related limits and validation rules
 */
export const SECURITY_LIMITS = {
  /**
   * Maximum length of user input strings
   * Environment: THEME_MAX_INPUT_LENGTH
   * Default: 1000
   * Range: 10 - 10000
   */
  MAX_INPUT_LENGTH: Math.max(
    10, // Minimum 10 characters
    Math.min(
      10000, // Maximum 10K characters
      parseEnvNumber(process.env.THEME_MAX_INPUT_LENGTH, 1000)
    )
  ),

  /**
   * Maximum length of theme keys
   * Environment: THEME_MAX_KEY_LENGTH
   * Default: 100
   * Range: 5 - 500
   */
  MAX_KEY_LENGTH: Math.max(
    5, // Minimum 5 characters
    Math.min(
      500, // Maximum 500 characters
      parseEnvNumber(process.env.THEME_MAX_KEY_LENGTH, 100)
    )
  ),

  /**
   * Maximum length of theme values
   * Environment: THEME_MAX_VALUE_LENGTH
   * Default: 500
   * Range: 5 - 2000
   */
  MAX_VALUE_LENGTH: Math.max(
    5, // Minimum 5 characters
    Math.min(
      2000, // Maximum 2000 characters
      parseEnvNumber(process.env.THEME_MAX_VALUE_LENGTH, 500)
    )
  ),

  /**
   * Maximum theme name length
   * Environment: THEME_MAX_NAME_LENGTH
   * Default: 100
   * Range: 5 - 200
   */
  MAX_THEME_NAME_LENGTH: Math.max(
    5, // Minimum 5 characters
    Math.min(
      200, // Maximum 200 characters
      parseEnvNumber(process.env.THEME_MAX_NAME_LENGTH, 100)
    )
  ),

  /**
   * Maximum theme description length
   * Environment: THEME_MAX_DESCRIPTION_LENGTH
   * Default: 500
   * Range: 10 - 2000
   */
  MAX_DESCRIPTION_LENGTH: Math.max(
    10, // Minimum 10 characters
    Math.min(
      2000, // Maximum 2000 characters
      parseEnvNumber(process.env.THEME_MAX_DESCRIPTION_LENGTH, 500)
    )
  ),

  /**
   * Maximum publisher name length
   * Environment: THEME_MAX_PUBLISHER_LENGTH
   * Default: 100
   * Range: 3 - 200
   */
  MAX_PUBLISHER_LENGTH: Math.max(
    3, // Minimum 3 characters
    Math.min(
      200, // Maximum 200 characters
      parseEnvNumber(process.env.THEME_MAX_PUBLISHER_LENGTH, 100)
    )
  ),

  /**
   * Maximum length of file paths (for security validation)
   * Environment: THEME_MAX_PATH_LENGTH
   * Default: 500
   * Range: 50 - 4096
   */
  MAX_PATH_LENGTH: Math.max(
    50, // Minimum 50 characters
    Math.min(
      4096, // Maximum 4KB path
      parseEnvNumber(process.env.THEME_MAX_PATH_LENGTH, 500)
    )
  ),

  /**
   * Allowed file extensions for theme files
   * Environment: THEME_ALLOWED_EXTENSIONS (comma-separated)
   * Default: .txt,.theme,.conf,.json,.config
   */
  ALLOWED_FILE_EXTENSIONS: (
    process.env.THEME_ALLOWED_EXTENSIONS || '.txt,.theme,.conf,.json,.config'
  )
    .split(',')
    .map(ext => ext.trim()),

  /**
   * Regular expression pattern for dangerous characters
   * Environment: Not configurable for security reasons
   */
  DANGEROUS_CHARACTERS: /[;&|`$(){}[\]<>]/g,
} as const;

// ============================================================================
// Resource Operation Limits
// ============================================================================

/**
 * Resource usage and operation limits
 */
export const RESOURCE_LIMITS = {
  /**
   * Maximum concurrent file operations
   * Environment: THEME_MAX_CONCURRENT_OPS
   * Default: 10
   * Range: 1 - 100
   */
  MAX_CONCURRENT_OPS: Math.max(
    1, // Minimum 1 operation
    Math.min(
      100, // Maximum 100 operations
      parseEnvNumber(process.env.THEME_MAX_CONCURRENT_OPS, 10)
    )
  ),

  /**
   * Maximum file read operations per session
   * Environment: THEME_MAX_FILE_READS
   * Default: 100
   * Range: 10 - 1000
   */
  MAX_FILE_READS: Math.max(
    10, // Minimum 10 operations
    Math.min(
      1000, // Maximum 1000 operations
      parseEnvNumber(process.env.THEME_MAX_FILE_READS, 100)
    )
  ),

  /**
   * Maximum file write operations per session
   * Environment: THEME_MAX_FILE_WRITES
   * Default: 50
   * Range: 5 - 500
   */
  MAX_FILE_WRITES: Math.max(
    5, // Minimum 5 operations
    Math.min(
      500, // Maximum 500 operations
      parseEnvNumber(process.env.THEME_MAX_FILE_WRITES, 50)
    )
  ),

  /**
   * Resource counter reset interval (milliseconds)
   * Environment: THEME_RESOURCE_RESET_INTERVAL
   * Default: 3600000 (1 hour)
   * Range: 300000 (5 minutes) - 86400000 (24 hours)
   */
  RESOURCE_RESET_INTERVAL: Math.max(
    300000, // Minimum 5 minutes
    Math.min(
      86400000, // Maximum 24 hours
      parseEnvNumber(process.env.THEME_RESOURCE_RESET_INTERVAL, 3600000)
    )
  ),
} as const;

// ============================================================================
// Performance & Timeout Limits
// ============================================================================

/**
 * Performance and timeout configuration
 */
export const PERFORMANCE_LIMITS = {
  /**
   * Default operation timeout (milliseconds)
   * Environment: THEME_OPERATION_TIMEOUT
   * Default: 30000 (30 seconds)
   * Range: 5000 (5 seconds) - 300000 (5 minutes)
   */
  OPERATION_TIMEOUT: Math.max(
    5000, // Minimum 5 seconds
    Math.min(
      300000, // Maximum 5 minutes
      parseEnvNumber(process.env.THEME_OPERATION_TIMEOUT, 30000)
    )
  ),

  /**
   * Extended operation timeout for multi-file operations (milliseconds)
   * Environment: THEME_EXTENDED_TIMEOUT
   * Default: 60000 (1 minute)
   * Range: 10000 (10 seconds) - 600000 (10 minutes)
   */
  EXTENDED_TIMEOUT: Math.max(
    10000, // Minimum 10 seconds
    Math.min(
      600000, // Maximum 10 minutes
      parseEnvNumber(process.env.THEME_EXTENDED_TIMEOUT, 60000)
    )
  ),

  /**
   * Test operation timeout (milliseconds)
   * Environment: THEME_TEST_TIMEOUT
   * Default: 10000 (10 seconds)
   * Range: 1000 (1 second) - 60000 (1 minute)
   */
  TEST_TIMEOUT: Math.max(
    1000, // Minimum 1 second
    Math.min(
      60000, // Maximum 1 minute
      parseEnvNumber(process.env.THEME_TEST_TIMEOUT, 10000)
    )
  ),
} as const;

// ============================================================================
// UI & UX Limits
// ============================================================================

/**
 * User interface and experience limits
 */
export const UI_LIMITS = {
  /**
   * Default notification duration (milliseconds)
   * Environment: THEME_NOTIFICATION_DURATION
   * Default: 5000 (5 seconds)
   * Range: 1000 (1 second) - 30000 (30 seconds)
   */
  NOTIFICATION_DURATION: Math.max(
    1000, // Minimum 1 second
    Math.min(
      30000, // Maximum 30 seconds
      parseEnvNumber(process.env.THEME_NOTIFICATION_DURATION, 5000)
    )
  ),

  /**
   * Maximum number of recent files to track
   * Environment: THEME_MAX_RECENT_FILES
   * Default: 10
   * Range: 3 - 50
   */
  MAX_RECENT_FILES: Math.max(
    3, // Minimum 3 files
    Math.min(
      50, // Maximum 50 files
      parseEnvNumber(process.env.THEME_MAX_RECENT_FILES, 10)
    )
  ),

  /**
   * Progress percentage boundaries
   * Note: These are fixed values and not configurable
   */
  PROGRESS_MIN: 0,
  PROGRESS_MAX: 100,

  /**
   * Configuration cleanup threshold (days)
   * Environment: THEME_CLEANUP_THRESHOLD_DAYS
   * Default: 30
   * Range: 1 - 365
   */
  CLEANUP_THRESHOLD_DAYS: Math.max(
    1, // Minimum 1 day
    Math.min(
      365, // Maximum 1 year
      parseEnvNumber(process.env.THEME_CLEANUP_THRESHOLD_DAYS, 30)
    )
  ),
} as const;

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default values for theme configuration
 */
export const DEFAULT_VALUES = {
  /**
   * Default theme version
   * Environment: THEME_DEFAULT_VERSION
   */
  THEME_VERSION: process.env.THEME_DEFAULT_VERSION || '0.0.1',

  /**
   * Default license type
   * Environment: THEME_DEFAULT_LICENSE
   */
  LICENSE: process.env.THEME_DEFAULT_LICENSE || 'MIT',

  /**
   * Default file encoding
   * Environment: THEME_FILE_ENCODING
   */
  FILE_ENCODING: (process.env.THEME_FILE_ENCODING as BufferEncoding) || 'utf8',

  /**
   * Default theme keywords
   * Environment: THEME_DEFAULT_KEYWORDS (comma-separated)
   */
  THEME_KEYWORDS: (process.env.THEME_DEFAULT_KEYWORDS || 'theme,color-theme,vscode,ghostty')
    .split(',')
    .map(k => k.trim()),

  /**
   * Default VS Code categories
   * Environment: THEME_DEFAULT_CATEGORIES (comma-separated)
   */
  VSCODE_CATEGORIES: (process.env.THEME_DEFAULT_CATEGORIES || 'Themes')
    .split(',')
    .map(c => c.trim()),
} as const;

// ============================================================================
// Combined Configuration Export
// ============================================================================

/**
 * Complete configuration object combining all limit categories
 */
export const CONFIG = {
  FILE: FILE_LIMITS,
  SECURITY: SECURITY_LIMITS,
  RESOURCE: RESOURCE_LIMITS,
  PERFORMANCE: PERFORMANCE_LIMITS,
  UI: UI_LIMITS,
  DEFAULT: DEFAULT_VALUES,
} as const;

// ============================================================================
// Type Exports
// ============================================================================

export type FileLimits = typeof FILE_LIMITS;
export type SecurityLimits = typeof SECURITY_LIMITS;
export type ResourceLimits = typeof RESOURCE_LIMITS;
export type PerformanceLimits = typeof PERFORMANCE_LIMITS;
export type UILimits = typeof UI_LIMITS;
export type DefaultValues = typeof DEFAULT_VALUES;
export type CompleteConfig = typeof CONFIG;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate that a number is within the specified range
 *
 * Throws an error if the value is outside the specified min/max range.
 * Used for validating configuration values and user inputs.
 *
 * @param value - Number to validate
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @param name - Descriptive name for error messages
 *
 * @throws {Error} When value is outside the specified range
 *
 * @example
 * ```typescript
 * validateRange(50, 1, 100, 'file count'); // OK
 * validateRange(150, 1, 100, 'file count'); // Throws error
 * ```
 *
 * @since 1.0.0
 */
export const validateRange = (value: number, min: number, max: number, name: string): void => {
  if (value < min || value > max) {
    throw new Error(`${name} must be between ${min} and ${max}, got ${value}`);
  }
};

/**
 * Validate file size against configured limits
 *
 * Validates file size against either standard or streaming limits.
 * Provides informative error messages with human-readable sizes.
 *
 * @param size - File size in bytes to validate
 * @param useStreaming - Whether to use streaming limits (higher threshold)
 *
 * @throws {Error} When file size exceeds the configured limit
 *
 * @example
 * ```typescript
 * validateFileSize(1024 * 1024, false); // OK for 1MB file
 * validateFileSize(100 * 1024 * 1024, false); // May throw if over limit
 * ```
 *
 * @since 1.0.0
 */
export const validateFileSize = (size: number, useStreaming = false): void => {
  const maxSize = useStreaming ? FILE_LIMITS.STREAMING_MAX_SIZE_BYTES : FILE_LIMITS.MAX_SIZE_BYTES;

  if (size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    const actualSizeMB = (size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `File size ${actualSizeMB}MB exceeds maximum allowed size of ${maxSizeMB}MB${
        useStreaming ? ' (streaming mode)' : ''
      }`
    );
  }
};

/**
 * Validate string length against security limits
 *
 * Validates string length against maximum allowed length for security.
 * Used to prevent buffer overflow and DoS attacks through overly long inputs.
 *
 * @param value - String to validate
 * @param maxLength - Maximum allowed length in characters
 * @param fieldName - Field name for error messages
 *
 * @throws {Error} When string length exceeds the maximum
 *
 * @example
 * ```typescript
 * validateStringLength('short', 100, 'theme name'); // OK
 * validateStringLength('very'.repeat(100), 10, 'theme name'); // Throws
 * ```
 *
 * @since 1.0.0
 */
export const validateStringLength = (value: string, maxLength: number, fieldName: string): void => {
  if (value.length > maxLength) {
    throw new Error(
      `${fieldName} length ${value.length} exceeds maximum of ${maxLength} characters`
    );
  }
};

/**
 * Get human-readable size string from byte count
 *
 * Converts byte counts to human-readable format with appropriate units
 * (Bytes, KB, MB, GB). Uses decimal precision for fractional values.
 *
 * @param bytes - Number of bytes to format
 * @returns Human-readable size string
 *
 * @example
 * ```typescript
 * formatBytes(1024); // '1.0 KB'
 * formatBytes(1536); // '1.5 KB'
 * formatBytes(1048576); // '1.0 MB'
 * ```
 *
 * @since 1.0.0
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

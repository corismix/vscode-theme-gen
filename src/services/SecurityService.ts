/**
 * SecurityService - Centralized security validation and sanitization
 * 
 * Provides comprehensive security features including path traversal protection,
 * input sanitization, resource usage limiting, and file system access control.
 * Implements defense-in-depth security patterns for CLI application safety.
 * 
 * Features:
 * - Path traversal attack prevention
 * - Input sanitization and validation
 * - Resource usage monitoring and limiting
 * - File extension and location whitelisting
 * - Rate limiting for file operations
 * 
 * @fileoverview Security service with validation, sanitization and resource management
 * @since 1.0.0
 */

import { normalize, isAbsolute, relative, resolve } from 'path';
import { ValidationError, SecurityError } from '@/types';
import { SECURITY_LIMITS, RESOURCE_LIMITS } from '@/config';

// SecurityError is now imported from @/types

// Security limits now imported from centralized config
// Re-export for backward compatibility if needed elsewhere
export { SECURITY_LIMITS } from '@/config';

/**
 * Resource usage limiter
 */
export class ResourceLimiter {
  private operations = new Map<string, number>();
  private readonly limits = {
    fileReads: RESOURCE_LIMITS.MAX_FILE_READS,
    fileWrites: RESOURCE_LIMITS.MAX_FILE_WRITES,
    maxFileSize: SECURITY_LIMITS.MAX_INPUT_LENGTH,
    maxConcurrentOps: RESOURCE_LIMITS.MAX_CONCURRENT_OPS,
  };

  private resetTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Reset counters based on configured interval
    this.resetTimer = setInterval(() => {
      this.operations.clear();
    }, RESOURCE_LIMITS.RESOURCE_RESET_INTERVAL);
  }

  /**
   * Check if operation can be performed
   */
  canPerform(operation: string): boolean {
    const count = this.operations.get(operation) || 0;
    const limit = this.limits[operation as keyof typeof this.limits];
    return typeof limit === 'number' ? count < limit : true;
  }

  /**
   * Track an operation
   */
  track(operation: string): void {
    const count = this.operations.get(operation) || 0;
    this.operations.set(operation, count + 1);
  }

  /**
   * Get current operation counts for monitoring
   * 
   * @returns Object mapping operation names to their current counts
   * 
   * @example
   * ```typescript
   * const stats = limiter.getStats();
   * console.log('File reads:', stats.fileReads || 0);
   * ```
   */
  getStats(): Record<string, number> {
    return Object.fromEntries(this.operations);
  }

  /**
   * Clean up resources and stop reset timer
   * 
   * Should be called when shutting down to prevent memory leaks.
   * Clears all operation counters and stops the reset interval timer.
   */
  cleanup(): void {
    if (this.resetTimer) {
      clearInterval(this.resetTimer);
      this.resetTimer = null;
    }
    this.operations.clear();
  }
}

/**
 * Path validation with traversal protection and security checks
 * 
 * Static utility class providing comprehensive path validation including:
 * - Path traversal attack prevention
 * - File extension whitelisting
 * - Safe base directory validation
 * - Null byte injection prevention
 * 
 * @class PathValidator
 * @since 1.0.0
 */
export class PathValidator {
  private static readonly SAFE_BASE_DIRS = [
    process.cwd(),
    process.env.HOME || '/',
    '/tmp',
  ];

  /**
   * Validate and resolve a user-provided path safely
   * 
   * Normalizes the path, resolves to absolute form, and checks for path
   * traversal attempts. Prevents access outside the specified base directory.
   * 
   * @param userPath - User-provided path to validate
   * @param baseDir - Base directory to restrict access to (defaults to cwd)
   * @returns Validated and resolved absolute path
   * 
   * @throws {SecurityError} When path is invalid, too long, or contains traversal
   * @throws {SecurityError} When path contains null bytes or other dangerous characters
   * 
   * @example
   * ```typescript
   * const safePath = PathValidator.validatePath('./config.json');
   * const restrictedPath = PathValidator.validatePath('../../../etc/passwd'); // Throws SecurityError
   * ```
   */
  static validatePath(userPath: string, baseDir?: string): string {
    if (!userPath || typeof userPath !== 'string') {
      throw new SecurityError('Invalid path provided');
    }

    if (userPath.length > SECURITY_LIMITS.MAX_PATH_LENGTH) {
      throw new SecurityError('Path too long');
    }

    // Normalize the path to handle ./ and ../
    const normalized = normalize(userPath);
    
    // Resolve to absolute path
    const resolved = isAbsolute(normalized) 
      ? normalized 
      : resolve(baseDir || process.cwd(), normalized);

    // Check for path traversal
    const safeBase = baseDir || process.cwd();
    const relativePath = relative(safeBase, resolved);
    
    if (relativePath.startsWith('..')) {
      throw new SecurityError('Path traversal detected');
    }

    // Additional security checks
    if (resolved.includes('\0')) {
      throw new SecurityError('Null byte in path');
    }

    return resolved;
  }

  /**
   * Validate file extension against whitelist
   * 
   * Checks if the file extension is in the allowed list of extensions.
   * Case-insensitive comparison for security.
   * 
   * @param filePath - Path to check extension for
   * @returns True if extension is allowed, false otherwise
   * 
   * @example
   * ```typescript
   * PathValidator.validateFileExtension('theme.json'); // true
   * PathValidator.validateFileExtension('malware.exe'); // false
   * ```
   */
  static validateFileExtension(filePath: string): boolean {
    const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
    return SECURITY_LIMITS.ALLOWED_FILE_EXTENSIONS.includes(ext);
  }

  /**
   * Check if path is in allowed directories
   * 
   * Verifies that the resolved path falls within one of the safe base
   * directories to prevent access to sensitive system files.
   * 
   * @param filePath - Path to validate
   * @returns True if path is within safe directories, false otherwise
   * 
   * @example
   * ```typescript
   * PathValidator.isPathSafe('/tmp/theme.json'); // true
   * PathValidator.isPathSafe('/etc/passwd'); // false
   * ```
   */
  static isPathSafe(filePath: string): boolean {
    try {
      const resolved = resolve(filePath);
      return this.SAFE_BASE_DIRS.some(baseDir => {
        const rel = relative(baseDir, resolved);
        return !rel.startsWith('..');
      });
    } catch {
      return false;
    }
  }
}

/**
 * Input sanitization utilities with comprehensive validation
 * 
 * Static utility class providing secure input processing including:
 * - Dangerous character removal
 * - Length validation and truncation
 * - Theme-specific sanitization rules
 * - File path sanitization
 * 
 * @class InputSanitizer
 * @since 1.0.0
 */
export class InputSanitizer {
  /**
   * Remove dangerous characters from input string
   * 
   * Removes characters that could be used for injection attacks or
   * cause issues in file systems and terminals.
   * 
   * @param input - String to sanitize
   * @returns Sanitized string with dangerous characters removed
   * 
   * @throws {ValidationError} When input is not a string
   * 
   * @example
   * ```typescript
   * const safe = InputSanitizer.sanitizeInput('theme<script>alert(1)</script>'); 
   * // Returns: 'themealert(1)'
   * ```
   */
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      throw new ValidationError('Input must be a string');
    }

    return input.replace(SECURITY_LIMITS.DANGEROUS_CHARACTERS, '');
  }

  /**
   * Validate and sanitize user input with length limits
   * 
   * Comprehensive input processing that trims, sanitizes, and validates
   * length constraints. Ensures input is safe and within acceptable bounds.
   * 
   * @param input - User input to process
   * @param maxLength - Maximum allowed length after sanitization
   * @returns Processed and validated input string
   * 
   * @throws {ValidationError} When input is invalid, too long, or empty after sanitization
   * 
   * @example
   * ```typescript
   * const processed = InputSanitizer.processUserInput('  My Theme  ', 50);
   * // Returns: 'My Theme'
   * ```
   */
  static processUserInput(input: string, maxLength = SECURITY_LIMITS.MAX_INPUT_LENGTH): string {
    if (!input || typeof input !== 'string') {
      throw new ValidationError('Invalid input provided');
    }

    const sanitized = this.sanitizeInput(input.trim());
    
    if (sanitized.length > maxLength) {
      throw new ValidationError(`Input too long (max ${maxLength} characters)`);
    }

    if (sanitized.length === 0) {
      throw new ValidationError('Input cannot be empty after sanitization');
    }

    return sanitized;
  }

  /**
   * Sanitize theme name with specific rules for VS Code extensions
   * 
   * Applies theme-specific sanitization rules including alphanumeric
   * character restrictions and space normalization.
   * 
   * @param name - Theme name to sanitize
   * @returns Sanitized theme name safe for use in VS Code extensions
   * 
   * @throws {ValidationError} When name is invalid or too long
   * 
   * @example
   * ```typescript
   * const themeName = InputSanitizer.sanitizeThemeName('My @wesome Theme!!');
   * // Returns: 'My wesome Theme'
   * ```
   */
  static sanitizeThemeName(name: string): string {
    const sanitized = this.processUserInput(name, SECURITY_LIMITS.MAX_THEME_NAME_LENGTH);
    
    // Additional theme name rules
    return sanitized
      .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Only allow alphanumeric, spaces, hyphens, underscores
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  /**
   * Sanitize file paths by combining input processing and path validation
   * 
   * @param filePath - File path to sanitize and validate
   * @returns Validated and sanitized absolute file path
   * 
   * @throws {ValidationError} When path is invalid
   * @throws {SecurityError} When path fails security validation
   * 
   * @example
   * ```typescript
   * const safePath = InputSanitizer.sanitizeFilePath('./my-theme.json');
   * ```
   */
  static sanitizeFilePath(filePath: string): string {
    const sanitized = this.processUserInput(filePath, SECURITY_LIMITS.MAX_PATH_LENGTH);
    return PathValidator.validatePath(sanitized);
  }
}

/**
 * Main security service class with comprehensive validation and resource management
 * 
 * Orchestrates all security-related functionality including file path validation,
 * input sanitization, and resource usage limiting. Provides a unified interface
 * for all security operations in the application.
 * 
 * @class SecurityService
 * @since 1.0.0
 */
export class SecurityService {
  private resourceLimiter: ResourceLimiter;

  constructor() {
    this.resourceLimiter = new ResourceLimiter();
  }

  /**
   * Comprehensive file path validation with security checks and resource limiting
   * 
   * Performs complete validation including resource limit checks, input sanitization,
   * path traversal protection, file extension validation, and safe location verification.
   * 
   * @param filePath - User-provided file path to validate
   * @param baseDir - Base directory to restrict access to
   * @returns Validated absolute file path safe for file operations
   * 
   * @throws {SecurityError} When file read limit is exceeded
   * @throws {SecurityError} When path fails validation or security checks
   * @throws {ValidationError} When input is invalid
   * 
   * @example
   * ```typescript
   * const securityService = new SecurityService();
   * const safePath = securityService.validateFilePath('./themes/dark.json');
   * ```
   */
  validateFilePath(filePath: string, baseDir?: string): string {
    // Check resource limits
    if (!this.resourceLimiter.canPerform('fileReads')) {
      throw new SecurityError('File read limit exceeded');
    }

    // Sanitize and validate path
    const sanitizedPath = InputSanitizer.sanitizeFilePath(filePath);
    const validatedPath = PathValidator.validatePath(sanitizedPath, baseDir);

    // Check file extension
    if (!PathValidator.validateFileExtension(validatedPath)) {
      throw new SecurityError('File type not allowed');
    }

    // Check if path is in safe location
    if (!PathValidator.isPathSafe(validatedPath)) {
      throw new SecurityError('File location not allowed');
    }

    // Track the operation
    this.resourceLimiter.track('fileReads');

    return validatedPath;
  }

  /**
   * Validate theme configuration input with comprehensive sanitization
   * 
   * Sanitizes and validates all theme configuration fields according to
   * security policies and VS Code extension requirements.
   * 
   * @param input - Theme configuration object to validate
   * @param input.name - Theme display name
   * @param input.description - Theme description
   * @param input.version - Theme version string
   * @param input.publisher - Publisher identifier
   * @param input.outputPath - Optional output directory path
   * @returns Validated theme configuration object with sanitized values
   * 
   * @throws {ValidationError} When any field fails validation
   * @throws {SecurityError} When output path fails security validation
   * 
   * @example
   * ```typescript
   * const validated = securityService.validateThemeInput({
   *   name: 'My Dark Theme',
   *   description: 'A beautiful dark theme',
   *   version: '1.0.0',
   *   publisher: 'mycompany'
   * });
   * ```
   */
  validateThemeInput(input: {
    name?: string;
    description?: string;
    version?: string;
    publisher?: string;
    outputPath?: string;
  }): {
    name: string;
    description: string;
    version: string;
    publisher: string;
    outputPath?: string;
  } {
    return {
      name: input.name ? InputSanitizer.sanitizeThemeName(input.name) : '',
      description: input.description ? InputSanitizer.processUserInput(input.description, SECURITY_LIMITS.MAX_DESCRIPTION_LENGTH) : '',
      version: input.version ? InputSanitizer.processUserInput(input.version, 20) : '',
      publisher: input.publisher ? InputSanitizer.processUserInput(input.publisher, SECURITY_LIMITS.MAX_PUBLISHER_LENGTH) : '',
      outputPath: input.outputPath ? this.validateFilePath(input.outputPath) : undefined,
    };
  }

  /**
   * Get security statistics and current resource usage
   * 
   * Returns comprehensive security metrics including resource usage counters
   * and configured security limits for monitoring and debugging.
   * 
   * @returns Object containing resource usage statistics and security limits
   * 
   * @example
   * ```typescript
   * const stats = securityService.getSecurityStats();
   * console.log('File reads used:', stats.resourceUsage.fileReads || 0);
   * console.log('Max file size:', stats.limits.MAX_INPUT_LENGTH);
   * ```
   */
  getSecurityStats(): {
    resourceUsage: Record<string, number>;
    limits: typeof SECURITY_LIMITS;
  } {
    return {
      resourceUsage: this.resourceLimiter.getStats(),
      limits: SECURITY_LIMITS,
    };
  }

  /**
   * Clean up resources and reset security service state
   * 
   * Properly cleans up the resource limiter and resets internal state.
   * Should be called when shutting down the application.
   */
  cleanup(): void {
    this.resourceLimiter.cleanup();
  }
}

// Global security service instance
let globalSecurityService: SecurityService | null = null;

/**
 * Get the global security service instance (singleton pattern)
 * 
 * Lazy-initializes the global security service on first access.
 * Ensures consistent security policy enforcement throughout the application.
 * 
 * @returns The global SecurityService instance
 * 
 * @example
 * ```typescript
 * const securityService = getSecurityService();
 * const safePath = securityService.validateFilePath('./config.json');
 * ```
 * 
 * @since 1.0.0
 */
export function getSecurityService(): SecurityService {
  if (!globalSecurityService) {
    globalSecurityService = new SecurityService();
  }
  return globalSecurityService;
}

/**
 * Reset the global security service (for testing)
 * 
 * Cleans up the current global security service and resets it to null.
 * Primarily used in test environments to ensure clean state between tests.
 * 
 * @example
 * ```typescript
 * // In test teardown
 * afterEach(() => {
 *   resetSecurityService();
 * });
 * ```
 * 
 * @since 1.0.0
 */
export function resetSecurityService(): void {
  if (globalSecurityService) {
    globalSecurityService.cleanup();
    globalSecurityService = null;
  }
}
/**
 * Error handling and validation type definitions
 * Includes custom error classes and validation result types
 */

// ============================================================================
// Base Error Interface
// ============================================================================

/**
 * Base interface for all theme generator errors
 */
export interface ThemeGeneratorError extends Error {
  /** Error code for programmatic handling */
  code: string;
  /** Additional context information */
  context?: Record<string, unknown>;
  /** Suggested fixes or next steps */
  suggestions?: string[];
}

// ============================================================================
// Custom Error Classes
// ============================================================================

/**
 * Error thrown when input validation fails
 */
export class ValidationError extends Error implements ThemeGeneratorError {
  readonly code = 'VALIDATION_ERROR';
  context?: Record<string, unknown>;
  suggestions?: string[];

  constructor(message: string, context?: Record<string, unknown>, suggestions?: string[]) {
    super(message);
    this.name = 'ValidationError';
    if (context !== undefined) {
      this.context = context;
    }
    if (suggestions !== undefined) {
      this.suggestions = suggestions;
    }
  }
}

/**
 * Error thrown when file operations fail
 */
export class FileProcessingError extends Error implements ThemeGeneratorError {
  readonly code = 'FILE_PROCESSING_ERROR';
  context?: Record<string, unknown>;
  suggestions?: string[];

  constructor(message: string, context?: Record<string, unknown>, suggestions?: string[]) {
    super(message);
    this.name = 'FileProcessingError';
    if (context !== undefined) {
      this.context = context;
    }
    if (suggestions !== undefined) {
      this.suggestions = suggestions;
    }
  }
}

/**
 * Error thrown when theme generation fails
 */
export class GenerationError extends Error implements ThemeGeneratorError {
  readonly code = 'GENERATION_ERROR';
  context?: Record<string, unknown>;
  suggestions?: string[];

  constructor(message: string, context?: Record<string, unknown>, suggestions?: string[]) {
    super(message);
    this.name = 'GenerationError';
    if (context !== undefined) {
      this.context = context;
    }
    if (suggestions !== undefined) {
      this.suggestions = suggestions;
    }
  }
}

/**
 * Error thrown when configuration is invalid
 */
export class ConfigurationError extends Error implements ThemeGeneratorError {
  readonly code = 'CONFIGURATION_ERROR';
  context?: Record<string, unknown>;
  suggestions?: string[];

  constructor(message: string, context?: Record<string, unknown>, suggestions?: string[]) {
    super(message);
    this.name = 'ConfigurationError';
    if (context !== undefined) {
      this.context = context;
    }
    if (suggestions !== undefined) {
      this.suggestions = suggestions;
    }
  }
}

/**
 * Error thrown when security validation fails
 */
export class SecurityError extends Error implements ThemeGeneratorError {
  readonly code = 'SECURITY_ERROR';
  context?: Record<string, unknown>;
  suggestions?: string[];

  constructor(message: string, context?: Record<string, unknown>, suggestions?: string[]) {
    super(message);
    this.name = 'SecurityError';
    if (context !== undefined) {
      this.context = context;
    }
    if (suggestions !== undefined) {
      this.suggestions = suggestions;
    }
  }
}

// ============================================================================
// Validation Result Types
// ============================================================================

/**
 * Result of file validation operations
 */
export interface FileValidationResult {
  /** Whether file passed validation */
  isValid: boolean;
  /** Validation error message */
  error?: string;
  /** Suggested fixes */
  suggestions?: string[];
  /** Non-blocking warnings */
  warnings?: string[];
  /** Additional validation details */
  details?: {
    /** File size in bytes */
    fileSize?: number;
    /** File extension */
    extension?: string;
    /** MIME type */
    mimeType?: string;
    /** Whether file is readable */
    isReadable?: boolean;
    /** Whether file exists */
    exists?: boolean;
  };
}

/**
 * Result of form field validation
 */
export interface FieldValidationResult {
  /** Whether field value is valid */
  isValid: boolean;
  /** Validation error message */
  error?: string;
  /** Warning message (non-blocking) */
  warning?: string;
  /** Suggested corrections */
  suggestions?: string[];
  /** Field-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of complete form validation
 */
export interface FormValidationResult {
  /** Whether entire form is valid */
  isValid: boolean;
  /** Global form errors */
  errors?: string[];
  /** Global form warnings */
  warnings?: string[];
  /** Per-field validation results */
  fieldResults?: Record<string, FieldValidationResult>;
  /** Overall validation score (0-1) */
  score?: number;
}

/**
 * Security validation result
 */
export interface SecurityValidationResult {
  /** Whether content is safe */
  isSafe: boolean;
  /** Security violations found */
  violations?: string[];
  /** Risk level assessment */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Specific security checks performed */
  checks?: {
    /** File path validation */
    pathTraversal?: boolean;
    /** Content scanning */
    contentScan?: boolean;
    /** Permission checks */
    permissions?: boolean;
    /** Size limits */
    sizeValidation?: boolean;
  };
}

// ============================================================================
// Error Recovery Types
// ============================================================================

/**
 * Error recovery strategy
 */
export interface ErrorRecoveryStrategy {
  /** Strategy name/identifier */
  name: string;
  /** Human-readable description */
  description: string;
  /** Recovery action function */
  action: () => Promise<boolean>;
  /** Whether this strategy can be retried */
  retryable: boolean;
  /** Maximum retry attempts */
  maxRetries?: number;
}

/**
 * Error recovery context
 */
export interface ErrorRecoveryContext {
  /** Original error */
  error: ThemeGeneratorError;
  /** Available recovery strategies */
  strategies: ErrorRecoveryStrategy[];
  /** Current retry attempt */
  attempt: number;
  /** Context at time of error */
  errorContext?: Record<string, unknown>;
}

// ============================================================================
// Error Reporting Types
// ============================================================================

/**
 * Error report for logging/debugging
 */
export interface ErrorReport {
  /** Error identifier */
  id: string;
  /** Timestamp when error occurred */
  timestamp: string;
  /** Error details */
  error: {
    name: string;
    message: string;
    code: string;
    stack?: string;
  };
  /** Application context */
  context: {
    /** Application version */
    version: string;
    /** Current step/operation */
    currentStep?: string;
    /** User input data (sanitized) */
    userData?: Record<string, unknown>;
    /** System information */
    system?: {
      platform: string;
      nodeVersion: string;
    };
  };
  /** User environment */
  environment: {
    /** Current working directory */
    cwd: string;
    /** Environment variables (sanitized) */
    env?: Record<string, string>;
  };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if an error is a ThemeGeneratorError
 */
export const isThemeGeneratorError = (error: unknown): error is ThemeGeneratorError => {
  return error instanceof Error && 'code' in error && typeof (error as any).code === 'string';
};

/**
 * Type guard to check if an error is a ValidationError
 */
export const isValidationError = (error: unknown): error is ValidationError => {
  return error instanceof ValidationError;
};

/**
 * Type guard to check if an error is a FileProcessingError
 */
export const isFileProcessingError = (error: unknown): error is FileProcessingError => {
  return error instanceof FileProcessingError;
};

/**
 * Type guard to check if an error is a GenerationError
 */
export const isGenerationError = (error: unknown): error is GenerationError => {
  return error instanceof GenerationError;
};

/**
 * Type guard to check if an error is a SecurityError
 */
export const isSecurityError = (error: unknown): error is SecurityError => {
  return error instanceof SecurityError;
};

// ============================================================================
// Error Utilities
// ============================================================================

/**
 * Creates a standardized error report
 */
export const createErrorReport = (
  error: ThemeGeneratorError,
  context: Record<string, unknown> = {}
): ErrorReport => ({
  id: `error_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
  timestamp: new Date().toISOString(),
  error: {
    name: error.name,
    message: error.message,
    code: error.code,
    ...(error.stack !== undefined && { stack: error.stack }),
  },
  context: {
    version: process.env.npm_package_version || 'unknown',
    ...context,
    system: {
      platform: process.platform,
      nodeVersion: process.version,
    },
  },
  environment: {
    cwd: process.cwd(),
  },
});

/**
 * Sanitizes error context for safe logging
 */
export const sanitizeErrorContext = (context: Record<string, unknown>): Record<string, unknown> => {
  const sanitized = { ...context };

  // Remove sensitive information
  const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth'];

  Object.keys(sanitized).forEach(key => {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
  });

  return sanitized;
};

/**
 * Configuration module for VS Code Theme Generator
 *
 * This module provides centralized configuration management with environment
 * variable support, validation, and type safety.
 */

// Re-export all configuration from limits
export * from './limits.js';

// Additional convenience exports for commonly used configurations
export {
  CONFIG as THEME_CONFIG,
  FILE_LIMITS,
  SECURITY_LIMITS,
  RESOURCE_LIMITS,
  PERFORMANCE_LIMITS,
  UI_LIMITS,
  DEFAULT_VALUES,

  // Validation helpers
  validateFileSize,
  validateStringLength,
  validateRange,
  formatBytes,
} from './limits.js';

// Type exports for external use
export type {
  FileLimits,
  SecurityLimits,
  ResourceLimits,
  PerformanceLimits,
  UILimits,
  DefaultValues,
  CompleteConfig,
} from './limits';

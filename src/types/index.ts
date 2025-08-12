/**
 * Simplified type exports for VS Code Theme Generator
 * Consolidated from complex type system for better maintainability
 */

// Export simplified types as primary
export * from './simplified';

// Legacy exports for backward compatibility with existing lib files
export type { GhosttyColors, VSCodeTheme, TokenColor, VSCodeThemeColors } from './theme.types';
export type { FileValidationResult as ColorValidationResult } from './error.types';
export { ValidationError, FileProcessingError } from './error.types';
export { SecurityError } from './simplified';

// Keep essential validation functions
export { isValidHexColor } from './theme.types';

// Export missing types from original files for lib compatibility
export type { ParsedThemeFile, ColorRoleMap, ColorRole } from './simplified';

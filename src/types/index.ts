/**
 * Centralized type exports for VS Code Theme Generator
 * Re-exports all types from domain-specific modules for clean imports
 */

// ============================================================================
// Theme Types
// ============================================================================
export type {
  GhosttyColors,
  ThemeMetadata,
  VSCodeThemeColors,
  TokenColor,
  VSCodeTheme,
  ColorRole,
  ColorRoleMap,
  ColorValidationResult,
  ParsedThemeFile,
} from './theme.types';

export {
  isGhosttyColors,
  isValidHexColor,
} from './theme.types';

// ============================================================================
// UI Types
// ============================================================================
export type {
  StepName,
  StepNavigation,
  SelectItem,
  SelectInputProps,
  TextInputProps,
  NotificationProps,
  BaseStepProps,
  AppProps,
  KeyboardShortcut,
  KeyboardHandlerProps,
  FieldValidation,
  FormField,
} from './ui.types';

export {
  STEPS,
  STEP_ORDER,
  isValidStepName,
} from './ui.types';

// ============================================================================
// Configuration Types
// ============================================================================
export type {
  UserPreferences,
  ThemeDefaults,
  RecentFile,
  GeneratorConfig,
  CLIFlags,
  CLIValidationError,
  FileOperationConfig,
  ValidationConfig,
  EnvironmentConfig,
} from './config.types';

export {
  DEFAULT_USER_PREFERENCES,
  DEFAULT_THEME_DEFAULTS,
  DEFAULT_FILE_CONFIG,
  DEFAULT_VALIDATION_CONFIG,
  createDefaultConfig,
  isValidConfig,
} from './config.types';

// ============================================================================
// Error Types
// ============================================================================
export type {
  ThemeGeneratorError,
  FileValidationResult,
  FieldValidationResult,
  FormValidationResult,
  SecurityValidationResult,
  ErrorRecoveryStrategy,
  ErrorRecoveryContext,
  ErrorReport,
} from './error.types';

export {
  ValidationError,
  FileProcessingError,
  GenerationError,
  ConfigurationError,
  SecurityError,
  isThemeGeneratorError,
  isValidationError,
  isFileProcessingError,
  isGenerationError,
  isSecurityError,
  createErrorReport,
  sanitizeErrorContext,
} from './error.types';

// ============================================================================
// Service Types
// ============================================================================
export type {
  FormData,
  GenerationOptions,
  GeneratedFile,
  GenerationResults,
  GenerationProgress,
  FileOperationResult,
  FileService,
  ProcessResult,
  ProcessService,
  SecurityValidationOptions,
  SecurityService,
  ProgressCallback,
  ProgressTracker,
  ResourceUsage,
  ResourceManager,
  ThemeGeneratorState,
  ServiceConfig,
  ServiceFactory,
} from './service.types';

// ============================================================================
// Utility Types
// ============================================================================
export type {
  DeepPartial,
  RequiredKeys,
  OptionalKeys,
} from './service.types';

// ============================================================================
// Legacy Export Support (Backward Compatibility)
// ============================================================================
// These re-exports maintain backward compatibility with existing imports

/** @deprecated Use GhosttyColors instead */
export type { GhosttyColors as LegacyGhosttyColors } from './theme.types';

/** @deprecated Use VSCodeTheme instead */
export type { VSCodeTheme as LegacyVSCodeTheme } from './theme.types';

/** @deprecated Use FormData instead */
export type { FormData as LegacyFormData } from './service.types';

/** @deprecated Use StepName instead */
export type { StepName as LegacyStepName } from './ui.types';
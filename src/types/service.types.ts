/**
 * Service layer and operation type definitions
 * Includes file operations, progress tracking, and generation services
 */

import type { GhosttyColors } from './theme.types';

// ============================================================================
// Form Data Types
// ============================================================================

/**
 * Complete form data structure for theme generation
 */
export interface FormData {
  /** Path to input theme file */
  inputFile: string;
  /** Generated theme name */
  themeName: string;
  /** Theme description */
  description: string;
  /** Theme version */
  version: string;
  /** Extension publisher */
  publisher: string;
  /** License type */
  license: string;
  /** Output directory path */
  outputPath: string;
  /** Generate complete extension structure */
  generateFullExtension: boolean;
  /** Generate README file */
  generateReadme: boolean;
  /** Generate CHANGELOG file */
  generateChangelog: boolean;
  /** Generate quickstart guide */
  generateQuickstart: boolean;
  /** Skip to specific step (for CLI) */
  skipToStep?: string;
}

// ============================================================================
// Generation Types
// ============================================================================

/**
 * Options for theme generation
 */
export interface GenerationOptions {
  /** Theme name */
  themeName: string;
  /** Theme description */
  description: string;
  /** Extension publisher */
  publisher: string;
  /** Theme version */
  version: string;
  /** License type */
  license: string;
  /** Output directory */
  outputPath: string;
  /** Generate full extension structure */
  generateFullExtension: boolean;
  /** Generate README file */
  generateReadme: boolean;
  /** Generate CHANGELOG file */
  generateChangelog: boolean;
  /** Generate quickstart guide */
  generateQuickstart: boolean;
}

/**
 * Generated file information
 */
export interface GeneratedFile {
  /** File path relative to output directory */
  path: string;
  /** File content */
  content: string;
  /** File type classification */
  type: 'json' | 'markdown' | 'text' | 'other';
  /** File size in bytes */
  size: number;
}

/**
 * Complete generation results
 */
export interface GenerationResults {
  /** Whether generation succeeded */
  success: boolean;
  /** Output directory path */
  outputPath: string;
  /** All generated files */
  generatedFiles: GeneratedFile[];
  /** Main theme file */
  themeFile: GeneratedFile;
  /** Package.json file */
  packageFile: GeneratedFile;
  /** Total number of files generated */
  totalFiles: number;
  /** Total size of all files in bytes */
  totalSize: number;
  /** Generation duration in milliseconds */
  duration: number;
  /** Error message if generation failed */
  error?: string;
  /** Non-blocking warnings */
  warnings?: string[];
}

/**
 * Generation progress tracking
 */
export interface GenerationProgress {
  /** Current step description */
  currentStep: string;
  /** Progress percentage (0-100) */
  progress: number;
  /** Status message */
  message: string;
  /** Whether generation is complete */
  isComplete: boolean;
  /** Error message if step failed */
  error?: string;
}

// ============================================================================
// File Service Types
// ============================================================================

/**
 * File operation result
 */
export interface FileOperationResult<T = unknown> {
  /** Whether operation succeeded */
  success: boolean;
  /** Operation result data */
  data?: T;
  /** Error message if operation failed */
  error?: string;
  /** File metadata */
  metadata?: {
    path: string;
    size: number;
    lastModified: Date;
    permissions: {
      readable: boolean;
      writable: boolean;
    };
  };
}

/**
 * File service interface for file operations
 */
export interface FileService {
  /** Read file contents */
  readFile(filePath: string): Promise<FileOperationResult<string>>;
  /** Write file contents */
  writeFile(filePath: string, content: string): Promise<FileOperationResult<void>>;
  /** Check if file exists */
  exists(filePath: string): Promise<boolean>;
  /** Create directory recursively */
  createDirectory(dirPath: string): Promise<FileOperationResult<void>>;
  /** Get file stats */
  getFileStats(filePath: string): Promise<FileOperationResult<{
    size: number;
    lastModified: Date;
    isDirectory: boolean;
  }>>;
  /** Validate file path */
  validatePath(filePath: string): FileOperationResult<boolean>;
}

// ============================================================================
// Process Service Types
// ============================================================================

/**
 * Process execution result
 */
export interface ProcessResult {
  /** Exit code */
  exitCode: number;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Execution duration in milliseconds */
  duration: number;
  /** Whether process succeeded */
  success: boolean;
}

/**
 * Process service interface for external command execution
 */
export interface ProcessService {
  /** Execute command */
  execute(command: string, args?: string[], options?: {
    cwd?: string;
    timeout?: number;
    env?: Record<string, string>;
  }): Promise<ProcessResult>;
  /** Check if command is available */
  isCommandAvailable(command: string): Promise<boolean>;
  /** Open file/directory with system default app */
  openPath(path: string): Promise<ProcessResult>;
}

// ============================================================================
// Security Service Types
// ============================================================================

/**
 * Security validation options
 */
export interface SecurityValidationOptions {
  /** Check for path traversal attacks */
  checkPathTraversal: boolean;
  /** Validate file content */
  scanContent: boolean;
  /** Check file permissions */
  validatePermissions: boolean;
  /** Enforce size limits */
  enforceSizeLimit: boolean;
  /** Maximum allowed file size */
  maxFileSize: number;
}

/**
 * Security service interface for input validation
 */
export interface SecurityService {
  /** Validate file path for security issues */
  validateFilePath(filePath: string): Promise<{ isValid: boolean; violations: string[] }>;
  /** Scan file content for security issues */
  scanFileContent(content: string): Promise<{ isSafe: boolean; violations: string[] }>;
  /** Validate input data */
  validateInput(input: unknown, schema: Record<string, unknown>): { isValid: boolean; errors: string[] };
  /** Sanitize user input */
  sanitizeInput(input: string): string;
}

// ============================================================================
// Progress Tracking Types
// ============================================================================

/**
 * Progress callback function
 */
export type ProgressCallback = (progress: GenerationProgress) => void;

/**
 * Progress tracker for long-running operations
 */
export interface ProgressTracker {
  /** Start progress tracking */
  start(totalSteps: number): void;
  /** Update progress */
  update(step: number, message: string): void;
  /** Complete progress tracking */
  complete(message?: string): void;
  /** Report error */
  error(message: string): void;
  /** Get current progress */
  getProgress(): GenerationProgress;
  /** Register progress callback */
  onProgress(callback: ProgressCallback): void;
}

// ============================================================================
// Resource Management Types
// ============================================================================

/**
 * Resource usage information
 */
export interface ResourceUsage {
  /** Memory usage in bytes */
  memoryUsage: number;
  /** CPU usage percentage */
  cpuUsage: number;
  /** File handles in use */
  fileHandles: number;
  /** Temporary files created */
  tempFiles: string[];
}

/**
 * Resource manager interface
 */
export interface ResourceManager {
  /** Get current resource usage */
  getUsage(): Promise<ResourceUsage>;
  /** Clean up temporary resources */
  cleanup(): Promise<void>;
  /** Register resource for cleanup */
  registerResource(resource: string, type: 'file' | 'directory' | 'handle'): void;
  /** Check resource limits */
  checkLimits(): Promise<{ withinLimits: boolean; violations: string[] }>;
}

// ============================================================================
// Application State Types
// ============================================================================

/**
 * Complete application state
 */
export interface ThemeGeneratorState {
  // Form data
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  
  // Theme data
  themeData: GhosttyColors | null;
  setThemeData: (data: GhosttyColors | null) => void;
  
  // Navigation
  navigation: {
    currentStep: 'welcome' | 'file-selection' | 'theme-config' | 'extension-options' | 'progress' | 'success';
    goToNextStep: () => void;
    goToPreviousStep: () => void;
    goToStep: (step: 'welcome' | 'file-selection' | 'theme-config' | 'extension-options' | 'progress' | 'success') => void;
    canGoBack: boolean;
    canGoNext: boolean;
  };
  
  // Results
  generationResults: GenerationResults | null;
  setGenerationResults: (results: GenerationResults | null) => void;
  
  // Error handling
  error: string | null;
  handleError: (error: string) => void;
  clearError: () => void;
  
  // Configuration
  config: {
    version: string;
    lastModified: string;
    recentFiles: Array<{
      path: string;
      name: string;
      lastUsed: string;
      isValid?: boolean;
    }>;
    preferences: {
      defaultPublisher?: string;
      defaultLicense?: string;
      defaultOutputPath?: string;
      autoOpenVSCode?: boolean;
      generateFullExtension?: boolean;
      generateReadme?: boolean;
      generateChangelog?: boolean;
      generateQuickstart?: boolean;
      maxRecentFiles?: number;
    };
    themeDefaults: {
      version: string;
      license: string;
      publisher: string;
      description: string;
      keywords: string[];
      categories: string[];
    };
  };
  updateConfig: (updateFn: (config: any) => any) => void;
  
  // Actions
  restart: () => void;
  exit: () => void;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Deep partial type for optional nested properties
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make specific keys required
 */
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific keys optional
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Extract function return type
 */
export type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (...args: any) => Promise<infer R> ? R : never;

// ============================================================================
// Service Factory Types
// ============================================================================

/**
 * Service factory configuration
 */
export interface ServiceConfig {
  /** Enable debug logging */
  debug: boolean;
  /** Timeout for operations in milliseconds */
  timeout: number;
  /** Maximum concurrent operations */
  maxConcurrency: number;
  /** Temporary directory for operations */
  tempDirectory: string;
}

/**
 * Service factory for creating service instances
 */
export interface ServiceFactory {
  /** Create file service */
  createFileService(config?: Partial<ServiceConfig>): FileService;
  /** Create process service */
  createProcessService(config?: Partial<ServiceConfig>): ProcessService;
  /** Create security service */
  createSecurityService(config?: Partial<ServiceConfig>): SecurityService;
  /** Create progress tracker */
  createProgressTracker(callback?: ProgressCallback): ProgressTracker;
  /** Create resource manager */
  createResourceManager(config?: Partial<ServiceConfig>): ResourceManager;
}
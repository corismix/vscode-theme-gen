/**
 * Utility functions for file handling, validation, and data processing
 * Converted to TypeScript with comprehensive type safety
 */

import { existsSync, statSync, readFileSync, writeFileSync } from 'fs';
import { resolve, join, isAbsolute } from 'path';
import { homedir } from 'os';
import {
  FileValidationResult,
  FormData,
  RecentFile,
  ValidationError,
  FileProcessingError,
} from '@/utils/types';

// ============================================================================
// Constants
// ============================================================================

const RECENT_FILES_LIMIT = 10;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MIN_THEME_NAME_LENGTH = 2;
const MAX_THEME_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;
const MIN_PUBLISHER_NAME_LENGTH = 3;
const MAX_PUBLISHER_NAME_LENGTH = 256;
const FILE_PERMISSIONS_MODE = 0o600;

// Config file settings
const CONFIG_FILE_NAME = '.vscode-theme-generator-recent.json';
const ALLOWED_CONFIG_DIRS = [homedir(), process.cwd()];

// Pre-compiled regex patterns for performance
const GHOSTTY_COLOR_LINE_REGEX = /^(color\d+|background|foreground|cursor|selection_background|selection_foreground)[\s=:]/i;
const GHOSTTY_VALUE_REGEX = /[\s=:]+(#[A-Fa-f0-9]{3,8}|\w+)\s*$/;
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{8})$/;
const VERSION_REGEX = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
const PUBLISHER_NAME_REGEX = /^[a-z0-9\-]+$/i;

// ============================================================================
// File System Utilities
// ============================================================================

/**
 * Checks if a file exists safely
 */
export const fileExists = (filePath: string): boolean => {
  try {
    if (typeof filePath !== 'string') {
      return false;
    }
    const resolvedPath = resolve(filePath);
    return existsSync(resolvedPath);
  } catch {
    return false;
  }
};

/**
 * Validates if a path points to a valid file
 */
export const isValidFilePath = (filePath: string): boolean => {
  try {
    if (typeof filePath !== 'string') {
      return false;
    }
    const resolvedPath = resolve(filePath);
    const stats = statSync(resolvedPath);
    return stats.isFile();
  } catch {
    return false;
  }
};

/**
 * Validates if a path points to a valid directory
 */
export const isValidDirectory = (dirPath: string): boolean => {
  try {
    if (typeof dirPath !== 'string') {
      return false;
    }
    const resolvedPath = resolve(dirPath);
    const stats = statSync(resolvedPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
};

/**
 * Gets a secure config file path
 */
const getSecureConfigPath = (): string => {
  // Use the first available allowed directory
  for (const dir of ALLOWED_CONFIG_DIRS) {
    try {
      if (existsSync(dir) && statSync(dir).isDirectory()) {
        return resolve(dir, CONFIG_FILE_NAME);
      }
    } catch {
      continue;
    }
  }
  // Fallback to current directory if no other options
  return resolve(process.cwd(), CONFIG_FILE_NAME);
};

// ============================================================================
// File Validation Functions
// ============================================================================

/**
 * Validates a Ghostty theme file
 */
export const validateGhosttyFile = (filePath: string): FileValidationResult => {
  if (typeof filePath !== 'string') {
    return { 
      isValid: false, 
      error: 'Invalid file path',
      suggestions: ['Provide a valid file path string']
    };
  }

  const resolvedPath = resolve(filePath);
  
  if (!isValidFilePath(resolvedPath)) {
    return { 
      isValid: false, 
      error: 'File not found or not accessible',
      suggestions: [
        'Check that the file exists',
        'Verify file permissions',
        'Ensure the file path is correct'
      ]
    };
  }

  if (!resolvedPath.toLowerCase().endsWith('.txt')) {
    return { 
      isValid: false, 
      error: 'Invalid file extension. Expected .txt file',
      suggestions: [
        'Use a .txt file',
        'Rename your file with .txt extension',
        'Ensure the file is a text file'
      ]
    };
  }

  try {
    const content = readFileSync(resolvedPath, 'utf8');
    
    // Validate file size (prevent DoS)
    if (content.length > MAX_FILE_SIZE_BYTES) {
      return { 
        isValid: false, 
        error: `File is too large (${(content.length / 1024 / 1024).toFixed(1)}MB). Maximum size is ${MAX_FILE_SIZE_MB}MB`,
        suggestions: [
          'Use a smaller file',
          'Remove unnecessary content',
          'Split large files into smaller ones'
        ]
      };
    }
    
    const lines = content.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('//');
    });
    
    // Check for at least some color definitions
    const colorLines = lines.filter(line => GHOSTTY_COLOR_LINE_REGEX.test(line));
    
    if (colorLines.length === 0) {
      return { 
        isValid: false, 
        error: 'No valid color definitions found',
        suggestions: [
          'Add color definitions (e.g., background=#000000)',
          'Check the Ghostty theme format',
          'Ensure color lines are not commented out'
        ]
      };
    }

    // Validate color values in the file
    let invalidColors = 0;
    for (const line of colorLines) {
      const valueMatch = line.match(GHOSTTY_VALUE_REGEX);
      if (valueMatch && valueMatch[1].startsWith('#')) {
        if (!isValidHexColor(valueMatch[1])) {
          invalidColors++;
        }
      }
    }
    
    if (invalidColors > colorLines.length / 2) {
      return { 
        isValid: false, 
        error: 'Too many invalid color values found',
        suggestions: [
          'Use valid hex color format (#RRGGBB)',
          'Check color values for typos',
          'Ensure colors are properly formatted'
        ]
      };
    }

    const warnings: string[] = [];
    if (invalidColors > 0) {
      warnings.push(`${invalidColors} invalid color value(s) found`);
    }

    return { 
      isValid: true, 
      warnings: warnings.length > 0 ? warnings : undefined
    };
  } catch (error) {
    return { 
      isValid: false, 
      error: `Failed to read file: ${(error as Error).message}`,
      suggestions: [
        'Check file permissions',
        'Ensure the file is readable',
        'Verify the file is not corrupted'
      ]
    };
  }
};

// ============================================================================
// String Utilities
// ============================================================================

/**
 * Sanitizes a theme name by removing invalid characters
 */
export const sanitizeThemeName = (name: string): string => {
  return name.trim()
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Validates semantic version format
 */
export const isValidVersion = (version: string): boolean => {
  if (typeof version !== 'string') {
    return false;
  }
  return VERSION_REGEX.test(version.trim());
};

/**
 * Validates publisher name format
 */
export const isValidPublisherName = (name: string): boolean => {
  if (typeof name !== 'string') {
    return false;
  }
  const trimmed = name.trim();
  return PUBLISHER_NAME_REGEX.test(trimmed) && 
         trimmed.length >= MIN_PUBLISHER_NAME_LENGTH && 
         trimmed.length <= MAX_PUBLISHER_NAME_LENGTH;
};

/**
 * Validates hex color format
 */
export const isValidHexColor = (color: string): boolean => {
  if (typeof color !== 'string') {
    return false;
  }
  return HEX_COLOR_REGEX.test(color.trim());
};

/**
 * Sanitizes and validates color value
 */
export const sanitizeColorValue = (color: string): string | null => {
  if (typeof color !== 'string') {
    return null;
  }
  
  const trimmed = color.trim();
  if (!isValidHexColor(trimmed)) {
    return null;
  }
  
  return trimmed.toLowerCase();
};

/**
 * Formats color for display
 */
export const formatColorForDisplay = (color: string): string => {
  if (!color) return '';
  return color.toUpperCase();
};

// ============================================================================
// Path Utilities
// ============================================================================

/**
 * Resolves output path for theme extension
 */
export const resolveOutputPath = (outputPath: string, themeName: string): string => {
  if (!outputPath) {
    // Default to current directory
    const sanitizedName = sanitizeThemeName(themeName).toLowerCase().replace(/\s+/g, '-');
    return resolve(`./${sanitizedName}`);
  }

  // If it's a relative path, resolve it
  if (!isAbsolute(outputPath)) {
    return resolve(outputPath);
  }

  return outputPath;
};

/**
 * Gets theme file path within extension structure
 */
export const getThemeFilePath = (extensionRoot: string, themeName: string): string => {
  const sanitizedName = sanitizeThemeName(themeName).toLowerCase().replace(/\s+/g, '-');
  return join(extensionRoot, 'themes', `${sanitizedName}-color-theme.json`);
};

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Form validation result type
 */
export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates form data comprehensively
 */
export const validateFormData = (data: FormData): FormValidationResult => {
  const errors: Record<string, string> = {};

  if (!data.inputFile || !data.inputFile.trim()) {
    errors.inputFile = 'Input file is required';
  } else {
    const validation = validateGhosttyFile(data.inputFile);
    if (!validation.isValid) {
      errors.inputFile = validation.error || 'Invalid file';
    }
  }

  if (!data.themeName || !data.themeName.trim()) {
    errors.themeName = 'Theme name is required';
  } else if (data.themeName.length < MIN_THEME_NAME_LENGTH) {
    errors.themeName = `Theme name must be at least ${MIN_THEME_NAME_LENGTH} characters`;
  } else if (data.themeName.length > MAX_THEME_NAME_LENGTH) {
    errors.themeName = `Theme name must be less than ${MAX_THEME_NAME_LENGTH} characters`;
  }

  if (data.version && !isValidVersion(data.version)) {
    errors.version = 'Version must follow semantic versioning (e.g., 1.0.0)';
  }

  if (data.publisher && !isValidPublisherName(data.publisher)) {
    errors.publisher = 'Publisher name must be 3-256 characters, alphanumeric with hyphens only';
  }

  if (data.description && data.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Description must be less than ${MAX_DESCRIPTION_LENGTH} characters`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// ============================================================================
// Progress Tracking Utilities
// ============================================================================

export interface ProgressStep {
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  error?: string;
}

export interface ProgressTracker {
  addStep: (name: string, description?: string) => void;
  start: (stepIndex: number) => void;
  complete: (stepIndex: number) => void;
  error: (stepIndex: number, error: string) => void;
  getSteps: () => ProgressStep[];
  getCurrentStep: () => number;
  isComplete: () => boolean;
  hasErrors: () => boolean;
}

/**
 * Creates a progress tracker for multi-step operations
 */
export const createProgressTracker = (): ProgressTracker => {
  const steps: ProgressStep[] = [];
  let currentStep = 0;

  return {
    addStep(name: string, description = '') {
      steps.push({ name, description, status: 'pending' });
    },
    
    start(stepIndex: number) {
      if (steps[stepIndex]) {
        steps[stepIndex].status = 'running';
        currentStep = stepIndex;
      }
    },
    
    complete(stepIndex: number) {
      if (steps[stepIndex]) {
        steps[stepIndex].status = 'completed';
      }
    },
    
    error(stepIndex: number, error: string) {
      if (steps[stepIndex]) {
        steps[stepIndex].status = 'error';
        steps[stepIndex].error = error;
      }
    },
    
    getSteps() {
      return steps;
    },
    
    getCurrentStep() {
      return currentStep;
    },
    
    isComplete() {
      return steps.every(step => step.status === 'completed');
    },
    
    hasErrors() {
      return steps.some(step => step.status === 'error');
    }
  };
};

// ============================================================================
// Recent Files Management
// ============================================================================

/**
 * Gets list of recent files, filtering out non-existent ones
 */
export const getRecentFiles = (): RecentFile[] => {
  try {
    const configPath = getSecureConfigPath();
    if (!fileExists(configPath)) {
      return [];
    }
    
    const content = readFileSync(configPath, 'utf8');
    let files: any[];
    
    try {
      files = JSON.parse(content);
    } catch {
      return [];
    }
    
    // Validate that files is an array and sanitize entries
    if (!Array.isArray(files)) {
      return [];
    }
    
    // Validate files still exist and sanitize paths
    return files.filter((file: any): file is RecentFile => {
      if (!file || typeof file !== 'object' || typeof file.path !== 'string') {
        return false;
      }
      
      try {
        // Resolve and validate the path
        const resolvedPath = resolve(file.path);
        return fileExists(resolvedPath) && typeof file.name === 'string' && typeof file.lastUsed === 'string';
      } catch {
        return false;
      }
    }).map(file => ({
      ...file,
      isValid: true
    }));
  } catch {
    return [];
  }
};

/**
 * Adds a file to the recent files list
 */
export const addRecentFile = (filePath: string, themeName: string): void => {
  try {
    // Validate inputs
    if (typeof filePath !== 'string' || typeof themeName !== 'string') {
      throw new ValidationError('Invalid input parameters for recent file');
    }
    
    // Resolve and validate the file path
    const resolvedPath = resolve(filePath);
    if (!fileExists(resolvedPath)) {
      throw new FileProcessingError('File not found when adding to recent files');
    }
    
    const recent = getRecentFiles();
    const newFile: RecentFile = {
      path: resolvedPath,
      name: sanitizeThemeName(themeName),
      lastUsed: new Date().toISOString(),
      isValid: true
    };
    
    // Remove if already exists
    const filtered = recent.filter(file => file.path !== resolvedPath);
    
    // Add to beginning
    filtered.unshift(newFile);
    
    // Keep only last N files
    const limited = filtered.slice(0, RECENT_FILES_LIMIT);
    
    const configPath = getSecureConfigPath();
    writeFileSync(configPath, JSON.stringify(limited, null, 2), { mode: FILE_PERMISSIONS_MODE });
  } catch (error) {
    // Silent failure for adding recent file - this is not critical functionality
    console.warn('Failed to add recent file:', error);
  }
};

/**
 * Clears all recent files
 */
export const clearRecentFiles = (): void => {
  try {
    const configPath = getSecureConfigPath();
    if (fileExists(configPath)) {
      writeFileSync(configPath, '[]', { mode: FILE_PERMISSIONS_MODE });
    }
  } catch (error) {
    console.warn('Failed to clear recent files:', error);
  }
};

/**
 * Removes a specific file from recent files list
 */
export const removeRecentFile = (filePath: string): void => {
  try {
    const recent = getRecentFiles();
    const resolvedPath = resolve(filePath);
    const filtered = recent.filter(file => file.path !== resolvedPath);
    
    const configPath = getSecureConfigPath();
    writeFileSync(configPath, JSON.stringify(filtered, null, 2), { mode: FILE_PERMISSIONS_MODE });
  } catch (error) {
    console.warn('Failed to remove recent file:', error);
  }
};

// ============================================================================
// Export All Utilities
// ============================================================================

export const fileUtils = {
  fileExists,
  isValidFilePath,
  isValidDirectory,
  validateGhosttyFile,
} as const;

export const stringUtils = {
  sanitizeThemeName,
  isValidVersion,
  isValidPublisherName,
  isValidHexColor,
  sanitizeColorValue,
  formatColorForDisplay,
} as const;

export const pathUtils = {
  resolveOutputPath,
  getThemeFilePath,
} as const;

export const validationUtils = {
  validateFormData,
} as const;

export const progressUtils = {
  createProgressTracker,
} as const;

export const recentFilesUtils = {
  getRecentFiles,
  addRecentFile,
  clearRecentFiles,
  removeRecentFile,
} as const;

export default {
  ...fileUtils,
  ...stringUtils,
  ...pathUtils,
  ...validationUtils,
  ...progressUtils,
  ...recentFilesUtils,
};
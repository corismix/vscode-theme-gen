/**
 * Enhanced utils for the core theme generator functionality
 * Includes essential file utilities with modern path handling
 */

import { existsSync } from 'fs';
import { resolve, normalize, isAbsolute, extname, dirname } from 'path';
import { homedir } from 'os';
import { FileValidationResult } from '../types/error.types';

// ============================================================================
// Enhanced Path Utilities
// ============================================================================

/**
 * Expands tilde (~) to user home directory
 * Handles ~/path and ~username/path patterns
 */
export const expandTilde = (filePath: string): string => {
  if (!filePath.startsWith('~')) {
    return filePath;
  }

  // Handle ~/path pattern (most common)
  if (filePath.startsWith('~/') || filePath === '~') {
    return filePath.replace('~', homedir());
  }

  // For ~username/path patterns, we'll just use homedir() as fallback
  // since proper user lookup is complex and not commonly needed
  return filePath.replace(/^~[^/]*/, homedir());
};

/**
 * Normalizes and resolves a file path with cross-platform compatibility
 * Handles tilde expansion, relative paths, and path normalization
 */
export const normalizePath = (filePath: string): string => {
  if (!filePath) return filePath;

  try {
    // First expand tilde if present
    let expandedPath = expandTilde(filePath.trim());

    // Normalize path separators and resolve relative paths
    expandedPath = normalize(expandedPath);

    // If not already absolute, resolve relative to current working directory
    if (!isAbsolute(expandedPath)) {
      expandedPath = resolve(expandedPath);
    }

    return expandedPath;
  } catch (error) {
    // If path normalization fails, return the original path
    return filePath;
  }
};

/**
 * Validates a file path with enhanced checks and helpful suggestions
 */
export const validateFilePath = (filePath: string): FileValidationResult => {
  if (!filePath) {
    return {
      isValid: false,
      error: 'File path is required',
      suggestions: ['Please provide a valid file path', 'You can paste file paths with Ctrl+V or Cmd+V'],
    };
  }

  try {
    const normalizedPath = normalizePath(filePath);

    // Check if path contains invalid characters (basic check)
    if (/[<>:"|?*]/.test(normalizedPath) && process.platform === 'win32') {
      return {
        isValid: false,
        error: 'Path contains invalid characters',
        suggestions: ['Remove invalid characters: < > : " | ? *'],
      };
    }

    // Check if directory exists (for better user feedback)
    const dirPath = dirname(normalizedPath);
    if (!existsSync(dirPath)) {
      return {
        isValid: false,
        error: 'Directory does not exist',
        suggestions: [
          `Create the directory: ${dirPath}`,
          'Check that the directory path is correct',
        ],
      };
    }

    return {
      isValid: true,
      normalizedPath,
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid file path format',
      suggestions: ['Check that the path format is correct'],
    };
  }
};

// ============================================================================
// File Utilities - Enhanced
// ============================================================================

/**
 * Check if a file exists with path normalization
 */
export const fileExists = (filePath: string): boolean => {
  try {
    const normalizedPath = normalizePath(filePath);
    return existsSync(normalizedPath);
  } catch {
    return false;
  }
};

/**
 * Enhanced Ghostty file validation with path normalization and better feedback
 */
export const validateGhosttyFile = (filePath: string): FileValidationResult => {
  // First validate the path format
  const pathValidation = validateFilePath(filePath);
  if (!pathValidation.isValid) {
    return pathValidation;
  }

  const normalizedPath = pathValidation.normalizedPath || normalizePath(filePath);

  // Check if file exists
  if (!fileExists(normalizedPath)) {
    return {
      isValid: false,
      error: 'File does not exist',
      suggestions: [
        'Check that the file path is correct',
        'Ensure the file exists',
        `Looking for: ${normalizedPath}`,
      ],
    };
  }

  // Check file extension - accept .txt, .toml, .conf, and other common config formats
  const ext = extname(normalizedPath).toLowerCase();
  const validExtensions = ['.txt', '.toml', '.conf', '.config'];

  if (!validExtensions.includes(ext)) {
    return {
      isValid: false,
      error: `File must be a theme file (${validExtensions.join(', ')})`,
      suggestions: [
        'Ghostty theme files are typically .txt files',
        'Also accepts .toml, .conf, and .config files',
      ],
    };
  }

  return {
    isValid: true,
    normalizedPath,
  };
};

// Export as default object to match existing usage, now with enhanced path utilities
export const fileUtils = {
  // Enhanced path utilities
  expandTilde,
  normalizePath,
  validateFilePath,

  // File utilities (enhanced)
  fileExists,
  validateGhosttyFile,
};

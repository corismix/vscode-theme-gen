/**
 * Simplified utils for the core theme generator functionality
 * Only includes essential file utilities needed by ThemeGenerator
 */

import { existsSync } from 'fs';
import { FileValidationResult } from '../types';

// ============================================================================
// File Utilities - Simplified
// ============================================================================

/**
 * Check if a file exists
 */
export const fileExists = (filePath: string): boolean => {
  try {
    return existsSync(filePath);
  } catch {
    return false;
  }
};

/**
 * Basic Ghostty file validation
 */
export const validateGhosttyFile = (filePath: string): FileValidationResult => {
  if (!filePath) {
    return {
      isValid: false,
      error: 'File path is required',
      suggestions: ['Please provide a valid file path'],
    };
  }

  if (!fileExists(filePath)) {
    return {
      isValid: false,
      error: 'File does not exist',
      suggestions: ['Check that the file path is correct', 'Ensure the file exists'],
    };
  }

  if (!filePath.endsWith('.txt')) {
    return {
      isValid: false,
      error: 'File must be a .txt file',
      suggestions: ['Ghostty theme files should have .txt extension'],
    };
  }

  return {
    isValid: true,
  };
};

// Export as default object to match existing usage
export const fileUtils = {
  fileExists,
  validateGhosttyFile,
};

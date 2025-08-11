import fs from 'fs';
import path from 'path';
import os from 'os';
import { UI_TEXT, FILE_CONSTANTS } from './constants.js';

// Use constants from the main constants file
const RECENT_FILES_LIMIT = FILE_CONSTANTS.RECENT_FILES_LIMIT;
const MAX_FILE_SIZE_MB = FILE_CONSTANTS.MAX_FILE_SIZE_MB;
const MAX_FILE_SIZE_BYTES = FILE_CONSTANTS.MAX_FILE_SIZE_BYTES;
const MIN_THEME_NAME_LENGTH = FILE_CONSTANTS.MIN_THEME_NAME_LENGTH;
const MAX_THEME_NAME_LENGTH = FILE_CONSTANTS.MAX_THEME_NAME_LENGTH;
const MAX_DESCRIPTION_LENGTH = 500;
const MIN_PUBLISHER_NAME_LENGTH = 3;
const MAX_PUBLISHER_NAME_LENGTH = 256;
const FILE_PERMISSIONS_MODE = 0o600;

// Security constants
const CONFIG_FILE_NAME = '.theme-generator-recent';
const ALLOWED_CONFIG_DIRS = [
  os.homedir(),
  process.cwd()
];

// File system utilities
export function fileExists(filePath) {
  try {
    if (typeof filePath !== 'string') {
      return false;
    }
    const resolvedPath = path.resolve(filePath);
    return fs.existsSync(resolvedPath);
  } catch (error) {
    // Silent failure for file existence check
    return false;
  }
}

export function isValidFilePath(filePath) {
  try {
    if (typeof filePath !== 'string') {
      return false;
    }
    const resolvedPath = path.resolve(filePath);
    const stats = fs.statSync(resolvedPath);
    return stats.isFile();
  } catch (error) {
    // Silent failure for invalid paths
    return false;
  }
}

export function isValidDirectory(dirPath) {
  try {
    if (typeof dirPath !== 'string') {
      return false;
    }
    const resolvedPath = path.resolve(dirPath);
    const stats = fs.statSync(resolvedPath);
    return stats.isDirectory();
  } catch (error) {
    // Silent failure for invalid directory paths
    return false;
  }
}

// Pre-compiled regex for Ghostty validation
const GHOSTTY_COLOR_LINE_REGEX = /^(color\d+|background|foreground|cursor|selection_background|selection_foreground)[\s=:]/i;
const GHOSTTY_VALUE_REGEX = /[\s=:]+(#[A-Fa-f0-9]{3,8}|\w+)\s*$/;

export function validateGhosttyFile(filePath) {
  if (typeof filePath !== 'string') {
    return { valid: false, error: 'Invalid file path' };
  }

  const resolvedPath = path.resolve(filePath);
  if (!isValidFilePath(resolvedPath)) {
    return { valid: false, error: UI_TEXT.VALIDATION_MESSAGES.FILE_NOT_FOUND };
  }

  if (!resolvedPath.toLowerCase().endsWith('.txt')) {
    return { valid: false, error: UI_TEXT.VALIDATION_MESSAGES.FILE_INVALID_EXTENSION };
  }

  try {
    const content = fs.readFileSync(resolvedPath, 'utf8');
    
    // Validate file size (prevent DoS)
    if (content.length > MAX_FILE_SIZE_BYTES) {
      return { valid: false, error: UI_TEXT.VALIDATION_MESSAGES.FILE_TOO_LARGE };
    }
    
    const lines = content.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('//');
    });
    
    // Check for at least some color definitions
    const colorLines = lines.filter(line => GHOSTTY_COLOR_LINE_REGEX.test(line));
    
    if (colorLines.length === 0) {
      return { valid: false, error: UI_TEXT.VALIDATION_MESSAGES.FILE_NO_COLORS };
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
      return { valid: false, error: UI_TEXT.VALIDATION_MESSAGES.FILE_INVALID_COLORS };
    }

    return { valid: true, colorCount: colorLines.length };
  } catch (error) {
    return { valid: false, error: `Failed to read file: ${error.message}` };
  }
}

// String utilities
export function sanitizeThemeName(name) {
  return name.trim()
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isValidVersion(version) {
  if (typeof version !== 'string') {
    return false;
  }
  return VERSION_REGEX.test(version.trim());
}

export function isValidPublisherName(name) {
  if (typeof name !== 'string') {
    return false;
  }
  const trimmed = name.trim();
  return PUBLISHER_NAME_REGEX.test(trimmed) && 
         trimmed.length >= MIN_PUBLISHER_NAME_LENGTH && 
         trimmed.length <= MAX_PUBLISHER_NAME_LENGTH;
}

// Path utilities
export function resolveOutputPath(outputPath, themeName) {
  if (!outputPath) {
    // Default to current directory
    const sanitizedName = sanitizeThemeName(themeName).toLowerCase().replace(/\s+/g, '-');
    return path.resolve(`./${sanitizedName}`);
  }

  // If it's a relative path, resolve it
  if (!path.isAbsolute(outputPath)) {
    return path.resolve(outputPath);
  }

  return outputPath;
}

export function getThemeFilePath(extensionRoot, themeName) {
  const sanitizedName = sanitizeThemeName(themeName).toLowerCase().replace(/\s+/g, '-');
  return path.join(extensionRoot, 'themes', `${sanitizedName}-color-theme.json`);
}

// Validation utilities
export function validateFormData(data) {
  const errors = {};

  if (!data.inputFile || !data.inputFile.trim()) {
    errors.inputFile = 'Input file is required';
  } else {
    const validation = validateGhosttyFile(data.inputFile);
    if (!validation.valid) {
      errors.inputFile = validation.error;
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
}

// Color utilities - Pre-compiled regex for performance
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{8})$/;
const VERSION_REGEX = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
const PUBLISHER_NAME_REGEX = /^[a-z0-9\-]+$/i;

export function isValidHexColor(color) {
  if (typeof color !== 'string') {
    return false;
  }
  return HEX_COLOR_REGEX.test(color.trim());
}

export function sanitizeColorValue(color) {
  if (typeof color !== 'string') {
    return null;
  }
  
  const trimmed = color.trim();
  if (!isValidHexColor(trimmed)) {
    return null;
  }
  
  return trimmed.toUpperCase();
}

export function formatColorForDisplay(color) {
  if (!color) return '';
  return color.toUpperCase();
}

// Progress tracking utilities
export function createProgressTracker() {
  const steps = [];
  let currentStep = 0;

  return {
    addStep(name, description = '') {
      steps.push({ name, description, status: 'pending' });
    },
    
    start(stepIndex) {
      if (steps[stepIndex]) {
        steps[stepIndex].status = 'running';
        currentStep = stepIndex;
      }
    },
    
    complete(stepIndex) {
      if (steps[stepIndex]) {
        steps[stepIndex].status = 'completed';
      }
    },
    
    error(stepIndex, error) {
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
}

function getSecureConfigPath() {
  // Use the first available allowed directory
  for (const dir of ALLOWED_CONFIG_DIRS) {
    try {
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        return path.resolve(dir, CONFIG_FILE_NAME);
      }
    } catch {
      // Continue to next directory
      continue;
    }
  }
  // Fallback to current directory if no other options
  return path.resolve(process.cwd(), CONFIG_FILE_NAME);
}

export function getRecentFiles() {
  try {
    const configPath = getSecureConfigPath();
    if (!fileExists(configPath)) {
      return [];
    }
    
    const content = fs.readFileSync(configPath, 'utf8');
    let files;
    
    try {
      files = JSON.parse(content);
    } catch (parseError) {
      // Silent failure for corrupted config
      return [];
    }
    
    // Validate that files is an array and sanitize entries
    if (!Array.isArray(files)) {
      return [];
    }
    
    // Validate files still exist and sanitize paths
    return files.filter(file => {
      if (!file || typeof file !== 'object' || typeof file.path !== 'string') {
        return false;
      }
      
      try {
        // Resolve and validate the path
        const resolvedPath = path.resolve(file.path);
        return fileExists(resolvedPath);
      } catch {
        return false;
      }
    });
  } catch (error) {
    // Silent failure for reading recent files
    return [];
  }
}

export function addRecentFile(filePath, themeName) {
  try {
    // Validate inputs
    if (typeof filePath !== 'string' || typeof themeName !== 'string') {
      throw new Error('Invalid input parameters');
    }
    
    // Resolve and validate the file path
    const resolvedPath = path.resolve(filePath);
    if (!fileExists(resolvedPath)) {
      throw new Error(UI_TEXT.VALIDATION_MESSAGES.FILE_NOT_FOUND);
    }
    
    const recent = getRecentFiles();
    const newFile = {
      path: resolvedPath,
      name: sanitizeThemeName(themeName),
      timestamp: Date.now()
    };
    
    // Remove if already exists
    const filtered = recent.filter(file => file.path !== resolvedPath);
    
    // Add to beginning
    filtered.unshift(newFile);
    
    // Keep only last N files
    const limited = filtered.slice(0, RECENT_FILES_LIMIT);
    
    const configPath = getSecureConfigPath();
    fs.writeFileSync(configPath, JSON.stringify(limited, null, 2), { mode: FILE_PERMISSIONS_MODE });
  } catch (error) {
    // Silent failure for adding recent file
  }
}
/**
 * Tests for utils-simple.ts
 * Tests simplified file validation utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fileExists, validateGhosttyFile, fileUtils } from '../../lib/utils-simple';
import { existsSync } from 'fs';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

const mockExistsSync = vi.mocked(existsSync);

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// File Existence Tests
// ============================================================================

describe('fileExists', () => {
  it('returns true for existing files', () => {
    mockExistsSync.mockReturnValue(true);

    const result = fileExists('/test/exists.txt');

    expect(result).toBe(true);
    expect(mockExistsSync).toHaveBeenCalledWith('/test/exists.txt');
  });

  it('returns false for non-existing files', () => {
    mockExistsSync.mockReturnValue(false);

    const result = fileExists('/test/nonexistent.txt');

    expect(result).toBe(false);
    expect(mockExistsSync).toHaveBeenCalledWith('/test/nonexistent.txt');
  });

  it('returns false when fs operations throw errors', () => {
    mockExistsSync.mockImplementation(() => {
      throw new Error('Permission denied');
    });

    const result = fileExists('/test/protected.txt');

    expect(result).toBe(false);
  });

  it('handles various file paths correctly', () => {
    mockExistsSync.mockReturnValue(true);

    expect(fileExists('/absolute/path.txt')).toBe(true);
    expect(fileExists('./relative/path.txt')).toBe(true);
    expect(fileExists('simple.txt')).toBe(true);
    expect(fileExists('/path/with spaces/file.txt')).toBe(true);
  });
});

// ============================================================================
// Ghostty File Validation Tests
// ============================================================================

describe('validateGhosttyFile', () => {
  it('validates existing .txt files successfully', () => {
    mockExistsSync.mockReturnValue(true);

    const result = validateGhosttyFile('/test/theme.txt');

    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.suggestions).toBeUndefined();
  });

  it('rejects empty file paths', () => {
    const result = validateGhosttyFile('');

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('File path is required');
    expect(result.suggestions).toContain('Please provide a valid file path');
  });

  it('rejects non-existing files', () => {
    mockExistsSync.mockReturnValue(false);

    const result = validateGhosttyFile('/test/nonexistent.txt');

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('File does not exist');
    expect(result.suggestions).toContain('Check that the file path is correct');
    expect(result.suggestions).toContain('Ensure the file exists');
  });

  it('rejects files without .txt extension', () => {
    mockExistsSync.mockReturnValue(true);

    // Test various non-.txt extensions
    const testCases = [
      '/test/theme.json',
      '/test/theme.yaml',
      '/test/theme.conf',
      '/test/theme.md',
      '/test/theme',
      '/test/theme.',
    ];

    testCases.forEach(filePath => {
      const result = validateGhosttyFile(filePath);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('File must be a .txt file');
      expect(result.suggestions).toContain('Ghostty theme files should have .txt extension');
    });
  });

  it('accepts valid .txt files with various paths', () => {
    mockExistsSync.mockReturnValue(true);

    const validPaths = [
      '/test/theme.txt',
      './theme.txt',
      'theme.txt',
      '/path/to/my-theme.txt',
      '/path/with spaces/theme name.txt',
      '/test/theme-v2.txt',
    ];

    validPaths.forEach(filePath => {
      const result = validateGhosttyFile(filePath);
      expect(result.isValid).toBe(true);
    });
  });

  it('handles special characters in file paths', () => {
    mockExistsSync.mockReturnValue(true);

    const specialPaths = [
      '/test/theme-with-dashes.txt',
      '/test/theme_with_underscores.txt',
      '/test/theme with spaces.txt',
      '/test/theme.v1.0.txt',
    ];

    specialPaths.forEach(filePath => {
      const result = validateGhosttyFile(filePath);
      expect(result.isValid).toBe(true);
    });
  });

  it('rejects case-sensitive non-.txt extensions', () => {
    mockExistsSync.mockReturnValue(true);

    const invalidCases = [
      '/test/theme.TXT', // Should be case-sensitive
      '/test/theme.Txt',
      '/test/theme.tXt',
    ];

    invalidCases.forEach(filePath => {
      const result = validateGhosttyFile(filePath);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('File must be a .txt file');
    });
  });

  it('handles edge cases gracefully', () => {
    // Test null/undefined inputs
    expect(validateGhosttyFile(null as unknown as string).isValid).toBe(false);
    expect(validateGhosttyFile(undefined as unknown as string).isValid).toBe(false);

    // Test very long paths
    const longPath = `/test/${'a'.repeat(500)}.txt`;
    mockExistsSync.mockReturnValue(true);
    expect(validateGhosttyFile(longPath).isValid).toBe(true);

    // Test path with only extension
    mockExistsSync.mockReturnValue(true);
    expect(validateGhosttyFile('.txt').isValid).toBe(true);
  });

  it('provides helpful error messages and suggestions', () => {
    // Empty path
    const emptyResult = validateGhosttyFile('');
    expect(emptyResult.error).toContain('File path is required');
    expect(emptyResult.suggestions).toEqual(['Please provide a valid file path']);

    // Non-existent file
    mockExistsSync.mockReturnValue(false);
    const nonExistentResult = validateGhosttyFile('/test/missing.txt');
    expect(nonExistentResult.error).toContain('File does not exist');
    expect(nonExistentResult.suggestions).toContain('Check that the file path is correct');

    // Wrong extension
    mockExistsSync.mockReturnValue(true);
    const wrongExtResult = validateGhosttyFile('/test/theme.json');
    expect(wrongExtResult.error).toContain('File must be a .txt file');
    expect(wrongExtResult.suggestions).toContain('Ghostty theme files should have .txt extension');
  });
});

// ============================================================================
// File Utils Object Tests
// ============================================================================

describe('fileUtils', () => {
  it('exports all utility functions correctly', () => {
    expect(fileUtils).toBeDefined();
    expect(typeof fileUtils.fileExists).toBe('function');
    expect(typeof fileUtils.validateGhosttyFile).toBe('function');
  });

  it('maintains consistent API with direct function imports', () => {
    mockExistsSync.mockReturnValue(true);

    // Test fileExists consistency
    expect(fileUtils.fileExists('/test/file.txt')).toBe(fileExists('/test/file.txt'));

    // Test validateGhosttyFile consistency
    const directResult = validateGhosttyFile('/test/theme.txt');
    const utilsResult = fileUtils.validateGhosttyFile('/test/theme.txt');

    expect(utilsResult.isValid).toBe(directResult.isValid);
    expect(utilsResult.error).toBe(directResult.error);
    expect(utilsResult.suggestions).toEqual(directResult.suggestions);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('integration tests', () => {
  it('validates complete file validation workflow', () => {
    // Test successful validation workflow
    mockExistsSync.mockReturnValue(true);

    const validPath = '/test/my-theme.txt';

    // File should exist
    expect(fileExists(validPath)).toBe(true);

    // File should validate successfully
    const validation = validateGhosttyFile(validPath);
    expect(validation.isValid).toBe(true);
  });

  it('handles validation failure workflow', () => {
    // Test failed validation workflow
    mockExistsSync.mockReturnValue(false);

    const invalidPath = '/test/nonexistent.json';

    // File should not exist
    expect(fileExists(invalidPath)).toBe(false);

    // Multiple validation failures
    const validation = validateGhosttyFile(invalidPath);
    expect(validation.isValid).toBe(false);
    expect(validation.error).toBe('File does not exist'); // First error encountered
  });

  it('properly chains validation checks', () => {
    // Test that validation checks happen in correct order

    // First check: empty path (should fail before file existence check)
    const emptyResult = validateGhosttyFile('');
    expect(emptyResult.error).toBe('File path is required');
    expect(mockExistsSync).not.toHaveBeenCalled();

    // Second check: file existence (should fail before extension check)
    mockExistsSync.mockReturnValue(false);
    const nonExistentResult = validateGhosttyFile('/test/missing.json');
    expect(nonExistentResult.error).toBe('File does not exist');

    // Third check: extension validation (should run after file existence)
    mockExistsSync.mockReturnValue(true);
    const wrongExtResult = validateGhosttyFile('/test/theme.json');
    expect(wrongExtResult.error).toBe('File must be a .txt file');
  });

  it('handles filesystem errors during validation', () => {
    // Test that filesystem errors are handled gracefully
    mockExistsSync.mockImplementation(() => {
      throw new Error('Permission denied');
    });

    const result = validateGhosttyFile('/test/protected.txt');

    // Should treat as non-existent file
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('File does not exist');
  });
});

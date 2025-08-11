import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useThemeValidation } from '@/hooks/useThemeValidation';
import { SecurityService, getSecurityService, resetSecurityService } from '@/services/SecurityService';
import { ValidationError } from '@/types';

// Mock the SecurityService
vi.mock('@/services/SecurityService', () => ({
  getSecurityService: vi.fn(),
  resetSecurityService: vi.fn(),
  SecurityService: vi.fn(),
}));

describe('useThemeValidation', () => {
  let mockSecurityService: any;

  beforeEach(() => {
    mockSecurityService = {
      validateThemeInput: vi.fn(),
      cleanup: vi.fn(),
    };

    vi.mocked(getSecurityService).mockReturnValue(mockSecurityService);
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetSecurityService();
  });

  describe('configFields', () => {
    it('should return predefined configuration fields', () => {
      const { result } = renderHook(() => useThemeValidation());

      expect(result.current.configFields).toHaveLength(5);
      
      const fieldIds = result.current.configFields.map(field => field.id);
      expect(fieldIds).toEqual(['themeName', 'description', 'version', 'publisher', 'license']);

      const requiredFields = result.current.configFields.filter(field => field.required);
      expect(requiredFields).toHaveLength(3);
      expect(requiredFields.map(f => f.id)).toEqual(['themeName', 'version', 'publisher']);
    });

    it('should include validation functions for specific fields', () => {
      const { result } = renderHook(() => useThemeValidation());

      const versionField = result.current.configFields.find(f => f.id === 'version');
      const publisherField = result.current.configFields.find(f => f.id === 'publisher');
      const themeNameField = result.current.configFields.find(f => f.id === 'themeName');

      expect(versionField?.validation).toBeDefined();
      expect(publisherField?.validation).toBeDefined();
      expect(themeNameField?.validation).toBeUndefined();
    });

    it('should have proper field properties', () => {
      const { result } = renderHook(() => useThemeValidation());

      result.current.configFields.forEach(field => {
        expect(field).toHaveProperty('id');
        expect(field).toHaveProperty('label');
        expect(field).toHaveProperty('placeholder');
        expect(field).toHaveProperty('required');
        expect(typeof field.id).toBe('string');
        expect(typeof field.label).toBe('string');
        expect(typeof field.placeholder).toBe('string');
        expect(typeof field.required).toBe('boolean');
      });
    });
  });

  describe('sanitizeInput', () => {
    beforeEach(() => {
      mockSecurityService.validateThemeInput.mockReturnValue({
        name: 'Sanitized Theme',
        description: 'Sanitized description',
        version: '1.0.0',
        publisher: 'sanitized-publisher',
      });
    });

    it('should sanitize theme name input', () => {
      const { result } = renderHook(() => useThemeValidation());

      const sanitized = result.current.sanitizeInput('themeName', 'My Theme');

      expect(mockSecurityService.validateThemeInput).toHaveBeenCalledWith({
        name: 'My Theme',
        description: undefined,
        version: undefined,
        publisher: undefined,
      });
      expect(sanitized).toBe('Sanitized Theme');
    });

    it('should sanitize description input', () => {
      const { result } = renderHook(() => useThemeValidation());

      const sanitized = result.current.sanitizeInput('description', 'Theme description');

      expect(mockSecurityService.validateThemeInput).toHaveBeenCalledWith({
        name: undefined,
        description: 'Theme description',
        version: undefined,
        publisher: undefined,
      });
      expect(sanitized).toBe('Sanitized description');
    });

    it('should sanitize version input', () => {
      const { result } = renderHook(() => useThemeValidation());

      const sanitized = result.current.sanitizeInput('version', '1.0.0');

      expect(mockSecurityService.validateThemeInput).toHaveBeenCalledWith({
        name: undefined,
        description: undefined,
        version: '1.0.0',
        publisher: undefined,
      });
      expect(sanitized).toBe('1.0.0');
    });

    it('should sanitize publisher input', () => {
      const { result } = renderHook(() => useThemeValidation());

      const sanitized = result.current.sanitizeInput('publisher', 'my-publisher');

      expect(mockSecurityService.validateThemeInput).toHaveBeenCalledWith({
        name: undefined,
        description: undefined,
        version: undefined,
        publisher: 'my-publisher',
      });
      expect(sanitized).toBe('sanitized-publisher');
    });

    it('should handle license field without security service', () => {
      const { result } = renderHook(() => useThemeValidation());

      const sanitized = result.current.sanitizeInput('license', '  MIT  ');

      // License field should not call security service
      expect(sanitized).toBe('MIT');
    });

    it('should handle ValidationError from security service', () => {
      mockSecurityService.validateThemeInput.mockImplementation(() => {
        throw new ValidationError('Input too long');
      });

      const { result } = renderHook(() => useThemeValidation());

      expect(() => {
        result.current.sanitizeInput('themeName', 'Very long theme name');
      }).toThrow(ValidationError);
    });

    it('should handle non-ValidationError gracefully', () => {
      mockSecurityService.validateThemeInput.mockImplementation(() => {
        throw new Error('Security service error');
      });

      const { result } = renderHook(() => useThemeValidation());

      const sanitized = result.current.sanitizeInput('themeName', '  My Theme  ');

      // Should return trimmed original value as fallback
      expect(sanitized).toBe('My Theme');
    });
  });

  describe('validateField', () => {
    beforeEach(() => {
      mockSecurityService.validateThemeInput.mockReturnValue({
        name: 'Valid Theme',
        description: 'Valid description',
        version: '1.0.0',
        publisher: 'valid-publisher',
      });
    });

    it('should validate required fields', () => {
      const { result } = renderHook(() => useThemeValidation());
      const themeNameField = result.current.configFields.find(f => f.id === 'themeName')!;

      // Empty required field should fail
      const error1 = result.current.validateField(themeNameField, '');
      expect(error1).toBe('Theme Name is required');

      // Whitespace-only required field should fail
      const error2 = result.current.validateField(themeNameField, '   ');
      expect(error2).toBe('Theme Name is required');

      // Valid required field should pass
      const error3 = result.current.validateField(themeNameField, 'My Theme');
      expect(error3).toBeNull();
    });

    it('should allow empty optional fields', () => {
      const { result } = renderHook(() => useThemeValidation());
      const descriptionField = result.current.configFields.find(f => f.id === 'description')!;

      const error = result.current.validateField(descriptionField, '');
      expect(error).toBeNull();
    });

    it('should run field-specific validation', () => {
      const { result } = renderHook(() => useThemeValidation());
      const versionField = result.current.configFields.find(f => f.id === 'version')!;

      // Invalid version format
      const error1 = result.current.validateField(versionField, 'invalid');
      expect(error1).toBe('Version must follow semantic versioning (e.g., 1.0.0)');

      // Valid version format
      const error2 = result.current.validateField(versionField, '1.0.0');
      expect(error2).toBeNull();
    });

    it('should validate publisher field', () => {
      const { result } = renderHook(() => useThemeValidation());
      const publisherField = result.current.configFields.find(f => f.id === 'publisher')!;

      // Invalid publisher format
      const error1 = result.current.validateField(publisherField, 'invalid@publisher');
      expect(error1).toBe('Publisher must contain only letters, numbers, and hyphens');

      // Valid publisher format
      const error2 = result.current.validateField(publisherField, 'my-publisher');
      expect(error2).toBeNull();
    });

    it('should handle sanitization errors', () => {
      mockSecurityService.validateThemeInput.mockImplementation(() => {
        throw new ValidationError('Input contains invalid characters');
      });

      const { result } = renderHook(() => useThemeValidation());
      const themeNameField = result.current.configFields.find(f => f.id === 'themeName')!;

      const error = result.current.validateField(themeNameField, 'Invalid<script>');
      expect(error).toBe('Input contains invalid characters');
    });

    it('should handle unexpected validation errors', () => {
      mockSecurityService.validateThemeInput.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const { result } = renderHook(() => useThemeValidation());
      const themeNameField = result.current.configFields.find(f => f.id === 'themeName')!;

      const error = result.current.validateField(themeNameField, 'Theme');
      expect(error).toBe('Invalid input format');
    });

    it('should handle validation function errors', () => {
      const { result } = renderHook(() => useThemeValidation());

      // Create a field with validation that throws
      const fieldWithBadValidation = {
        id: 'version' as const,
        label: 'Version',
        placeholder: '1.0.0',
        required: true,
        validation: () => {
          throw new Error('Validation function error');
        }
      };

      const error = result.current.validateField(fieldWithBadValidation, '1.0.0');
      expect(error).toBe('Validation error: Validation function error');
    });
  });

  describe('validateAllFields', () => {
    beforeEach(() => {
      mockSecurityService.validateThemeInput.mockReturnValue({
        name: 'Valid Theme',
        description: 'Valid description',
        version: '1.0.0',
        publisher: 'valid-publisher',
      });
    });

    it('should validate all fields successfully', () => {
      const { result } = renderHook(() => useThemeValidation());

      const values = {
        themeName: 'My Theme',
        description: 'Theme description',
        version: '1.0.0',
        publisher: 'my-publisher',
        license: 'MIT',
      };

      const validation = result.current.validateAllFields(values);

      expect(validation.isValid).toBe(true);
      expect(Object.keys(validation.errors)).toHaveLength(0);
    });

    it('should return errors for invalid fields', () => {
      const { result } = renderHook(() => useThemeValidation());

      const values = {
        themeName: '', // Required field missing
        description: 'Valid description',
        version: 'invalid-version', // Invalid format
        publisher: 'invalid@publisher', // Invalid format
        license: 'MIT',
      };

      const validation = result.current.validateAllFields(values);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.themeName).toBe('Theme Name is required');
      expect(validation.errors.version).toBe('Version must follow semantic versioning (e.g., 1.0.0)');
      expect(validation.errors.publisher).toBe('Publisher must contain only letters, numbers, and hyphens');
      expect(validation.errors.description).toBeUndefined();
      expect(validation.errors.license).toBeUndefined();
    });

    it('should handle partial validation results', () => {
      const { result } = renderHook(() => useThemeValidation());

      const values = {
        themeName: 'Valid Theme',
        description: '', // Optional field, should be valid
        version: '1.0.0',
        publisher: '', // Required field missing
        license: '',
      };

      const validation = result.current.validateAllFields(values);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.publisher).toBe('Publisher is required');
      expect(validation.errors.themeName).toBeUndefined();
      expect(validation.errors.description).toBeUndefined();
      expect(validation.errors.version).toBeUndefined();
      expect(validation.errors.license).toBeUndefined();
    });
  });

  describe('validateVersion', () => {
    it('should validate semantic versioning format', () => {
      const { result } = renderHook(() => useThemeValidation());

      // Valid versions
      expect(result.current.validateVersion('1.0.0')).toBeNull();
      expect(result.current.validateVersion('10.20.30')).toBeNull();
      expect(result.current.validateVersion('1.0.0-alpha')).toBeNull();
      expect(result.current.validateVersion('1.0.0-alpha.1')).toBeNull();
      expect(result.current.validateVersion('1.0.0-alpha.beta')).toBeNull();
      expect(result.current.validateVersion('1.0.0-beta.1')).toBeNull();
      expect(result.current.validateVersion('1.0.0-rc.1')).toBeNull();

      // Invalid versions
      expect(result.current.validateVersion('1.0')).toBe('Version must follow semantic versioning (e.g., 1.0.0)');
      expect(result.current.validateVersion('1')).toBe('Version must follow semantic versioning (e.g., 1.0.0)');
      expect(result.current.validateVersion('1.0.0.')).toBe('Version must follow semantic versioning (e.g., 1.0.0)');
      expect(result.current.validateVersion('v1.0.0')).toBe('Version must follow semantic versioning (e.g., 1.0.0)');
      expect(result.current.validateVersion('1.0.0-')).toBe('Version must follow semantic versioning (e.g., 1.0.0)');
      expect(result.current.validateVersion('')).toBe('Version must follow semantic versioning (e.g., 1.0.0)');
    });
  });

  describe('validatePublisher', () => {
    it('should validate publisher format', () => {
      const { result } = renderHook(() => useThemeValidation());

      // Valid publishers
      expect(result.current.validatePublisher('publisher')).toBeNull();
      expect(result.current.validatePublisher('my-publisher')).toBeNull();
      expect(result.current.validatePublisher('publisher123')).toBeNull();
      expect(result.current.validatePublisher('123publisher')).toBeNull();
      expect(result.current.validatePublisher('my-cool-publisher-123')).toBeNull();
      expect(result.current.validatePublisher('a')).toBeNull(); // Single character

      // Invalid publishers
      expect(result.current.validatePublisher('my-publisher-')).toBe('Publisher must contain only letters, numbers, and hyphens');
      expect(result.current.validatePublisher('-my-publisher')).toBe('Publisher must contain only letters, numbers, and hyphens');
      expect(result.current.validatePublisher('my@publisher')).toBe('Publisher must contain only letters, numbers, and hyphens');
      expect(result.current.validatePublisher('my publisher')).toBe('Publisher must contain only letters, numbers, and hyphens');
      expect(result.current.validatePublisher('my.publisher')).toBe('Publisher must contain only letters, numbers, and hyphens');
      expect(result.current.validatePublisher('')).toBe('Publisher must contain only letters, numbers, and hyphens');
    });
  });

  describe('memoization and performance', () => {
    it('should memoize configFields to prevent unnecessary re-renders', () => {
      const { result, rerender } = renderHook(() => useThemeValidation());

      const firstFields = result.current.configFields;
      
      rerender();
      
      const secondFields = result.current.configFields;
      
      expect(firstFields).toBe(secondFields);
    });

    it('should memoize validation functions', () => {
      const { result, rerender } = renderHook(() => useThemeValidation());

      const firstValidateField = result.current.validateField;
      const firstValidateAllFields = result.current.validateAllFields;
      const firstSanitizeInput = result.current.sanitizeInput;
      
      rerender();
      
      const secondValidateField = result.current.validateField;
      const secondValidateAllFields = result.current.validateAllFields;
      const secondSanitizeInput = result.current.sanitizeInput;
      
      expect(firstValidateField).toBe(secondValidateField);
      expect(firstValidateAllFields).toBe(secondValidateAllFields);
      expect(firstSanitizeInput).toBe(secondSanitizeInput);
    });

    it('should maintain stable references across re-renders', () => {
      const { result, rerender } = renderHook(() => useThemeValidation());

      const firstValidateVersion = result.current.validateVersion;
      const firstValidatePublisher = result.current.validatePublisher;
      
      rerender();
      
      const secondValidateVersion = result.current.validateVersion;
      const secondValidatePublisher = result.current.validatePublisher;
      
      expect(firstValidateVersion).toBe(secondValidateVersion);
      expect(firstValidatePublisher).toBe(secondValidatePublisher);
    });
  });

  describe('security service integration', () => {
    it('should use security service for sanitization', () => {
      mockSecurityService.validateThemeInput.mockReturnValue({
        name: 'Sanitized Name',
        description: 'Sanitized Description',
        version: '1.0.0',
        publisher: 'sanitized-publisher',
      });

      const { result } = renderHook(() => useThemeValidation());

      result.current.sanitizeInput('themeName', 'Raw Theme Name');

      expect(mockSecurityService.validateThemeInput).toHaveBeenCalledWith({
        name: 'Raw Theme Name',
        description: undefined,
        version: undefined,
        publisher: undefined,
      });
    });

    it('should handle security service initialization failure', () => {
      vi.mocked(getSecurityService).mockImplementation(() => {
        throw new Error('Security service unavailable');
      });

      expect(() => {
        renderHook(() => useThemeValidation());
      }).toThrow('Security service unavailable');
    });

    it('should call security service once per hook instance', () => {
      const { result } = renderHook(() => useThemeValidation());

      // Multiple calls to sanitizeInput should use the same security service instance
      result.current.sanitizeInput('themeName', 'Theme 1');
      result.current.sanitizeInput('description', 'Description 1');
      result.current.sanitizeInput('publisher', 'Publisher 1');

      expect(getSecurityService).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle undefined field values', () => {
      const { result } = renderHook(() => useThemeValidation());
      const field = result.current.configFields[0];

      const error = result.current.validateField(field, undefined as any);
      expect(error).toBe('Theme Name is required');
    });

    it('should handle null field values', () => {
      const { result } = renderHook(() => useThemeValidation());
      const field = result.current.configFields[0];

      const error = result.current.validateField(field, null as any);
      expect(error).toBe('Theme Name is required');
    });

    it('should handle extremely long inputs', () => {
      const longInput = 'a'.repeat(10000);
      
      mockSecurityService.validateThemeInput.mockReturnValue({
        name: longInput.substring(0, 100), // Security service truncates
        description: '',
        version: '1.0.0',
        publisher: 'publisher',
      });

      const { result } = renderHook(() => useThemeValidation());

      const sanitized = result.current.sanitizeInput('themeName', longInput);
      expect(sanitized).toHaveLength(100);
    });

    it('should handle special characters in inputs', () => {
      const specialInput = 'Theme<>/"&\n\t';
      
      mockSecurityService.validateThemeInput.mockReturnValue({
        name: 'ThemeSanitized',
        description: '',
        version: '1.0.0',
        publisher: 'publisher',
      });

      const { result } = renderHook(() => useThemeValidation());

      const sanitized = result.current.sanitizeInput('themeName', specialInput);
      expect(sanitized).toBe('ThemeSanitized');
    });

    it('should handle multiple validation errors gracefully', () => {
      let callCount = 0;
      mockSecurityService.validateThemeInput.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new ValidationError('First error');
        } else if (callCount === 2) {
          throw new ValidationError('Second error');
        }
        return { name: '', description: '', version: '', publisher: '' };
      });

      const { result } = renderHook(() => useThemeValidation());

      const values = {
        themeName: 'Theme',
        description: 'Description',
        version: '1.0.0',
        publisher: 'publisher',
        license: 'MIT',
      };

      const validation = result.current.validateAllFields(values);

      expect(validation.isValid).toBe(false);
      expect(Object.keys(validation.errors).length).toBeGreaterThan(0);
    });
  });
});
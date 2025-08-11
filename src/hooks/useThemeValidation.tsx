/**
 * useThemeValidation - Theme validation logic hook
 * 
 * Comprehensive validation hook that centralizes all theme configuration validation
 * logic with SecurityService integration for input sanitization and security validation.
 * Provides performant field validation with memoization and comprehensive error handling.
 * 
 * Features:
 * - SecurityService integration for input sanitization
 * - Memoized configuration fields and validation functions
 * - Semantic version validation (SemVer)
 * - Publisher name validation for VS Code requirements
 * - Comprehensive form validation with detailed error reporting
 * - Performance optimized with useCallback and useMemo
 * 
 * Validation Rules:
 * - Theme name: Required, sanitized for security
 * - Description: Optional, length limited
 * - Version: Required, semantic versioning format (X.Y.Z)
 * - Publisher: Required, alphanumeric with hyphens only
 * - License: Optional, free-form text
 * 
 * @hook
 * @since 1.0.0
 */

import { useCallback, useMemo } from 'react';
import { getSecurityService } from '@/services/SecurityService';
import { ValidationError } from '@/types';

export interface ThemeConfigField {
  id: keyof ThemeConfigForm;
  label: string;
  placeholder: string;
  required: boolean;
  validation?: (value: string) => string | null;
}

export interface ThemeConfigForm {
  themeName: string;
  description: string;
  version: string;
  publisher: string;
  license: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ValidationHookReturn {
  configFields: ThemeConfigField[];
  validateField: (field: ThemeConfigField, value: string) => string | null;
  validateAllFields: (values: ThemeConfigForm) => {
    isValid: boolean;
    errors: Partial<Record<keyof ThemeConfigForm, string>>;
  };
  validateVersion: (version: string) => string | null;
  validatePublisher: (publisher: string) => string | null;
  sanitizeInput: (fieldId: keyof ThemeConfigForm, value: string) => string;
}

/**
 * Validates semantic version format (SemVer)
 * 
 * Ensures version follows semantic versioning specification (X.Y.Z)
 * with optional pre-release identifiers.
 * 
 * @param version - Version string to validate
 * @returns Error message if invalid, null if valid
 * 
 * @example
 * ```typescript
 * validateVersion('1.0.0'); // null (valid)
 * validateVersion('1.0.0-beta.1'); // null (valid)
 * validateVersion('1.0'); // error (invalid)
 * ```
 * 
 * @since 1.0.0
 */
const validateVersion = (version: string): string | null => {
  if (!version.match(/^\d+\.\d+\.\d+(-[\w.]+)?$/)) {
    return 'Version must follow semantic versioning (e.g., 1.0.0)';
  }
  return null;
};

/**
 * Validates publisher name format for VS Code extensions
 * 
 * Ensures publisher name meets VS Code Marketplace requirements:
 * alphanumeric characters and hyphens only, no leading/trailing hyphens.
 * 
 * @param publisher - Publisher name to validate
 * @returns Error message if invalid, null if valid
 * 
 * @example
 * ```typescript
 * validatePublisher('my-company'); // null (valid)
 * validatePublisher('company123'); // null (valid)
 * validatePublisher('my_company'); // error (underscore not allowed)
 * ```
 * 
 * @since 1.0.0
 */
const validatePublisher = (publisher: string): string | null => {
  if (!publisher.match(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/)) {
    return 'Publisher must contain only letters, numbers, and hyphens';
  }
  return null;
};

/**
 * Custom hook for theme validation logic
 * 
 * Provides comprehensive validation capabilities for theme configuration forms
 * with SecurityService integration and performance optimization.
 * 
 * Returns:
 * - configFields: Memoized array of form field configurations
 * - validateField: Function to validate individual fields
 * - validateAllFields: Function to validate entire form
 * - validateVersion: Semantic version validator
 * - validatePublisher: Publisher name validator
 * - sanitizeInput: Input sanitization function
 * 
 * @returns ValidationHookReturn object with validation functions and field configs
 * 
 * @example
 * ```typescript
 * const {
 *   configFields,
 *   validateField,
 *   validateAllFields,
 *   sanitizeInput
 * } = useThemeValidation();
 * 
 * // Validate single field
 * const error = validateField(configFields[0], 'My Theme');
 * 
 * // Validate all fields
 * const result = validateAllFields(formData);
 * if (!result.isValid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 * 
 * @since 1.0.0
 */
export const useThemeValidation = (): ValidationHookReturn => {
  const securityService = getSecurityService();

  // Memoized configuration fields to prevent unnecessary re-renders
  const configFields = useMemo<ThemeConfigField[]>(
    () => [
      {
        id: 'themeName',
        label: 'Theme Name',
        placeholder: 'Enter theme name (e.g., "Dark Terminal")',
        required: true
      },
      {
        id: 'description',
        label: 'Description',
        placeholder: 'Brief description of your theme',
        required: false
      },
      {
        id: 'version',
        label: 'Version',
        placeholder: '1.0.0',
        required: true,
        validation: validateVersion
      },
      {
        id: 'publisher',
        label: 'Publisher',
        placeholder: 'Your name or organization',
        required: true,
        validation: validatePublisher
      },
      {
        id: 'license',
        label: 'License',
        placeholder: 'MIT',
        required: false
      }
    ],
    []
  );

  /**
   * Sanitize input using security service
   */
  const sanitizeInput = useCallback((fieldId: keyof ThemeConfigForm, value: string): string => {
    try {
      const input = {
        name: fieldId === 'themeName' ? value : undefined,
        description: fieldId === 'description' ? value : undefined,
        version: fieldId === 'version' ? value : undefined,
        publisher: fieldId === 'publisher' ? value : undefined,
      };

      const sanitized = securityService.validateThemeInput(input);
      
      switch (fieldId) {
        case 'themeName':
          return sanitized.name;
        case 'description':
          return sanitized.description;
        case 'version':
          return sanitized.version;
        case 'publisher':
          return sanitized.publisher;
        case 'license':
          return value.trim(); // License doesn't need special sanitization
        default:
          return value.trim();
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      // Return original value if sanitization fails
      return value.trim();
    }
  }, [securityService]);

  /**
   * Validate a single field with memoization for performance
   */
  const validateField = useCallback((field: ThemeConfigField, value: string): string | null => {
    try {
      // Basic required field validation
      if (field.required && !value.trim()) {
        return `${field.label} is required`;
      }
      
      // Skip validation for empty optional fields
      if (!field.required && !value.trim()) {
        return null;
      }

      // Sanitize input first
      let sanitizedValue: string;
      try {
        sanitizedValue = sanitizeInput(field.id, value);
      } catch (error) {
        if (error instanceof ValidationError) {
          return error.message;
        }
        return 'Invalid input format';
      }

      // Run field-specific validation
      if (field.validation && sanitizedValue) {
        return field.validation(sanitizedValue);
      }
      
      return null;
    } catch (error) {
      return `Validation error: ${(error as Error).message}`;
    }
  }, [sanitizeInput]);

  /**
   * Validate all fields at once with comprehensive error reporting
   */
  const validateAllFields = useCallback((values: ThemeConfigForm): {
    isValid: boolean;
    errors: Partial<Record<keyof ThemeConfigForm, string>>;
  } => {
    const errors: Partial<Record<keyof ThemeConfigForm, string>> = {};
    let isValid = true;

    configFields.forEach(field => {
      const error = validateField(field, values[field.id]);
      if (error) {
        errors[field.id] = error;
        isValid = false;
      }
    });

    return { isValid, errors };
  }, [configFields, validateField]);

  return {
    configFields,
    validateField,
    validateAllFields,
    validateVersion,
    validatePublisher,
    sanitizeInput,
  };
};
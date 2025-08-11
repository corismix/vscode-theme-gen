import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThemeForm } from '@/hooks/useThemeForm';

// Mock all dependencies
vi.mock('@/context/AppContext', () => ({
  useAppContext: vi.fn(),
}));

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: vi.fn(),
}));

vi.mock('@/hooks/useThemeValidation', () => ({
  useThemeValidation: vi.fn(),
}));

describe('useThemeForm', () => {
  let mockAppContext: any;
  let mockNotifications: any;
  let mockThemeValidation: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock default return values
    mockAppContext = {
      formData: {
        themeName: '',
        description: '',
        version: '',
        publisher: '',
        license: '',
      },
      updateFormData: vi.fn(),
      navigation: {
        goToStep: vi.fn(),
      },
    };

    mockNotifications = {
      addNotification: vi.fn(),
    };

    mockThemeValidation = {
      configFields: [
        { id: 'themeName', label: 'Theme Name', required: true },
        { id: 'description', label: 'Description', required: false },
        { id: 'version', label: 'Version', required: true },
        { id: 'publisher', label: 'Publisher', required: true },
        { id: 'license', label: 'License', required: false },
      ],
      validateField: vi.fn(),
      validateAllFields: vi.fn(),
    };

    // Setup mocks
    vi.mocked(require('@/context/AppContext').useAppContext).mockReturnValue(mockAppContext);
    vi.mocked(require('@/hooks/useNotifications').useNotifications).mockReturnValue(mockNotifications);
    vi.mocked(require('@/hooks/useThemeValidation').useThemeValidation).mockReturnValue(mockThemeValidation);
  });

  describe('initialization', () => {
    it('should initialize with default values when no form data exists', () => {
      const { result } = renderHook(() => useThemeForm());

      expect(result.current.values).toEqual({
        themeName: '',
        description: '',
        version: '1.0.0',
        publisher: '',
        license: 'MIT',
      });
      expect(result.current.currentFieldIndex).toBe(0);
      expect(result.current.validationErrors).toEqual({});
    });

    it('should initialize with form data from context', () => {
      mockAppContext.formData = {
        themeName: 'Existing Theme',
        description: 'Existing description',
        version: '2.0.0',
        publisher: 'existing-publisher',
        license: 'Apache-2.0',
      };

      const { result } = renderHook(() => useThemeForm());

      expect(result.current.values).toEqual({
        themeName: 'Existing Theme',
        description: 'Existing description',
        version: '2.0.0',
        publisher: 'existing-publisher',
        license: 'Apache-2.0',
      });
    });

    it('should merge form data with defaults', () => {
      mockAppContext.formData = {
        themeName: 'Partial Theme',
        description: '',
        version: '',
        publisher: '',
        license: '',
      };

      const { result } = renderHook(() => useThemeForm());

      expect(result.current.values).toEqual({
        themeName: 'Partial Theme',
        description: '',
        version: '1.0.0',
        publisher: '',
        license: 'MIT',
      });
    });
  });

  describe('computed values', () => {
    it('should return current field correctly', () => {
      const { result } = renderHook(() => useThemeForm());

      expect(result.current.currentField).toEqual({
        id: 'themeName',
        label: 'Theme Name',
        required: true,
      });

      act(() => {
        result.current.setCurrentFieldIndex(1);
      });

      expect(result.current.currentField).toEqual({
        id: 'description',
        label: 'Description',
        required: false,
      });
    });

    it('should handle invalid field index gracefully', () => {
      const { result } = renderHook(() => useThemeForm());

      act(() => {
        result.current.setCurrentFieldIndex(-1);
      });

      expect(result.current.currentFieldIndex).toBe(0);
      expect(result.current.currentField).toEqual(mockThemeValidation.configFields[0]);

      act(() => {
        result.current.setCurrentFieldIndex(100);
      });

      expect(result.current.currentFieldIndex).toBe(4); // Last valid index
      expect(result.current.currentField).toEqual(mockThemeValidation.configFields[4]);
    });

    it('should calculate form validity correctly', () => {
      mockThemeValidation.validateAllFields.mockReturnValue({
        isValid: true,
        errors: {},
      });

      const { result } = renderHook(() => useThemeForm());

      expect(result.current.isFormValid).toBe(true);

      mockThemeValidation.validateAllFields.mockReturnValue({
        isValid: false,
        errors: { themeName: 'Required' },
      });

      // Force recomputation by changing values
      act(() => {
        result.current.handleFieldChange('themeName', '');
      });

      expect(result.current.isFormValid).toBe(false);
    });

    it('should detect form changes correctly', () => {
      const { result } = renderHook(() => useThemeForm());

      expect(result.current.hasChanges).toBe(false);

      act(() => {
        result.current.handleFieldChange('themeName', 'New Theme');
      });

      expect(result.current.hasChanges).toBe(true);
    });
  });

  describe('field operations', () => {
    it('should handle field changes', () => {
      const { result } = renderHook(() => useThemeForm());

      act(() => {
        result.current.handleFieldChange('themeName', 'My Theme');
      });

      expect(result.current.values.themeName).toBe('My Theme');
    });

    it('should clear validation errors on field change', () => {
      const { result } = renderHook(() => useThemeForm());

      // Set initial validation error
      act(() => {
        result.current.handleFieldChange('themeName', '');
      });

      // Manually set error to simulate validation failure
      result.current.validationErrors.themeName = 'Required field';

      act(() => {
        result.current.handleFieldChange('themeName', 'Valid Theme');
      });

      expect(result.current.validationErrors.themeName).toBeUndefined();
    });

    it('should get field errors correctly', () => {
      const { result } = renderHook(() => useThemeForm());

      // Manually set error
      act(() => {
        result.current.handleFieldChange('themeName', '');
      });

      result.current.validationErrors.themeName = 'Theme name is required';

      expect(result.current.getFieldError('themeName')).toBe('Theme name is required');
      expect(result.current.getFieldError('description')).toBeUndefined();
    });

    it('should check field validity correctly', () => {
      const { result } = renderHook(() => useThemeForm());

      // Valid field with value
      act(() => {
        result.current.handleFieldChange('themeName', 'Valid Theme');
      });

      expect(result.current.isFieldValid('themeName')).toBe(true);

      // Invalid field with error
      result.current.validationErrors.themeName = 'Some error';
      expect(result.current.isFieldValid('themeName')).toBe(false);

      // Empty field
      act(() => {
        result.current.handleFieldChange('themeName', '');
      });

      expect(result.current.isFieldValid('themeName')).toBe(false);
    });
  });

  describe('form progress calculation', () => {
    it('should calculate progress correctly', () => {
      const { result } = renderHook(() => useThemeForm());

      // Initial state - no fields completed
      let progress = result.current.getFormProgress();
      expect(progress).toEqual({
        completed: 0,
        total: 5,
        percentage: 0,
      });

      // Fill required fields
      act(() => {
        result.current.handleFieldChange('themeName', 'Theme');
        result.current.handleFieldChange('version', '1.0.0');
        result.current.handleFieldChange('publisher', 'publisher');
      });

      progress = result.current.getFormProgress();
      expect(progress.completed).toBe(3);
      expect(progress.percentage).toBe(60);

      // Fill optional fields
      act(() => {
        result.current.handleFieldChange('description', 'Description');
        result.current.handleFieldChange('license', 'MIT');
      });

      progress = result.current.getFormProgress();
      expect(progress).toEqual({
        completed: 5,
        total: 5,
        percentage: 100,
      });
    });

    it('should handle optional empty fields as valid', () => {
      const { result } = renderHook(() => useThemeForm());

      // Fill only required fields, leave optional empty
      act(() => {
        result.current.handleFieldChange('themeName', 'Theme');
        result.current.handleFieldChange('version', '1.0.0');
        result.current.handleFieldChange('publisher', 'publisher');
      });

      const progress = result.current.getFormProgress();
      expect(progress.completed).toBe(5); // Optional fields count as completed when empty
    });
  });

  describe('field submission', () => {
    it('should validate field on submission', () => {
      mockThemeValidation.validateField.mockReturnValue(null); // Valid

      const { result } = renderHook(() => useThemeForm());

      act(() => {
        result.current.handleFieldChange('themeName', 'Valid Theme');
        result.current.handleFieldSubmit();
      });

      expect(mockThemeValidation.validateField).toHaveBeenCalledWith(
        mockThemeValidation.configFields[0],
        'Valid Theme'
      );
      expect(result.current.currentFieldIndex).toBe(1); // Moved to next field
    });

    it('should show validation error on invalid submission', () => {
      mockThemeValidation.validateField.mockReturnValue('Theme name is required');

      const { result } = renderHook(() => useThemeForm());

      act(() => {
        result.current.handleFieldChange('themeName', '');
        result.current.handleFieldSubmit();
      });

      expect(result.current.validationErrors.themeName).toBe('Theme name is required');
      expect(mockNotifications.addNotification).toHaveBeenCalledWith({
        type: 'error',
        message: 'Validation Error',
        details: 'Theme name is required',
      });
      expect(result.current.currentFieldIndex).toBe(0); // Stayed on same field
    });

    it('should complete form on last field submission', () => {
      mockThemeValidation.validateField.mockReturnValue(null);
      mockThemeValidation.validateAllFields.mockReturnValue({
        isValid: true,
        errors: {},
      });

      const { result } = renderHook(() => useThemeForm());

      // Move to last field
      act(() => {
        result.current.setCurrentFieldIndex(4);
        result.current.handleFieldChange('license', 'MIT');
        result.current.handleFieldSubmit();
      });

      expect(mockAppContext.updateFormData).toHaveBeenCalledWith(result.current.values);
      expect(mockAppContext.navigation.goToStep).toHaveBeenCalledWith('extension-options');
      expect(mockNotifications.addNotification).toHaveBeenCalledWith({
        type: 'success',
        message: 'Configuration Complete',
        details: 'Theme configuration saved successfully',
      });
    });

    it('should handle missing current field gracefully', () => {
      mockThemeValidation.configFields = []; // No fields

      const { result } = renderHook(() => useThemeForm());

      act(() => {
        result.current.handleFieldSubmit();
      });

      expect(mockNotifications.addNotification).toHaveBeenCalledWith({
        type: 'error',
        message: 'Configuration Error',
        details: 'Invalid field configuration. Please restart the configuration process.',
      });
    });
  });

  describe('form completion', () => {
    it('should complete form with valid data', () => {
      mockThemeValidation.validateAllFields.mockReturnValue({
        isValid: true,
        errors: {},
      });

      const { result } = renderHook(() => useThemeForm());

      act(() => {
        result.current.handleFormComplete();
      });

      expect(mockAppContext.updateFormData).toHaveBeenCalledWith(result.current.values);
      expect(mockAppContext.navigation.goToStep).toHaveBeenCalledWith('extension-options');
      expect(mockNotifications.addNotification).toHaveBeenCalledWith({
        type: 'success',
        message: 'Configuration Complete',
        details: 'Theme configuration saved successfully',
      });
    });

    it('should handle validation errors on form completion', () => {
      mockThemeValidation.validateAllFields.mockReturnValue({
        isValid: false,
        errors: {
          themeName: 'Required field',
          version: 'Invalid format',
        },
      });

      const { result } = renderHook(() => useThemeForm());

      act(() => {
        result.current.handleFormComplete();
      });

      expect(result.current.validationErrors).toEqual({
        themeName: 'Required field',
        version: 'Invalid format',
      });
      expect(result.current.currentFieldIndex).toBe(0); // Moved to first error field
      expect(mockNotifications.addNotification).toHaveBeenCalledWith({
        type: 'error',
        message: 'Form Validation Failed',
        details: 'Please fix the validation errors and try again.',
      });
    });

    it('should focus on first error field when validation fails', () => {
      mockThemeValidation.validateAllFields.mockReturnValue({
        isValid: false,
        errors: {
          version: 'Invalid format',
          publisher: 'Required field',
        },
      });

      const { result } = renderHook(() => useThemeForm());

      act(() => {
        result.current.handleFormComplete();
      });

      expect(result.current.currentFieldIndex).toBe(2); // Index of 'version' field
    });
  });

  describe('form reset and prefill', () => {
    it('should reset form to defaults', () => {
      const { result } = renderHook(() => useThemeForm());

      // Make some changes
      act(() => {
        result.current.handleFieldChange('themeName', 'Test Theme');
        result.current.setCurrentFieldIndex(2);
      });

      // Reset form
      act(() => {
        result.current.resetForm();
      });

      expect(result.current.values).toEqual({
        themeName: '',
        description: '',
        version: '1.0.0',
        publisher: '',
        license: 'MIT',
      });
      expect(result.current.currentFieldIndex).toBe(0);
      expect(result.current.validationErrors).toEqual({});
    });

    it('should prefill form with provided data', () => {
      const { result } = renderHook(() => useThemeForm());

      const prefillData = {
        themeName: 'Prefilled Theme',
        description: 'Prefilled description',
      };

      act(() => {
        result.current.prefillForm(prefillData);
      });

      expect(result.current.values.themeName).toBe('Prefilled Theme');
      expect(result.current.values.description).toBe('Prefilled description');
      expect(result.current.values.version).toBe('1.0.0'); // Unchanged
    });
  });

  describe('field index management', () => {
    it('should set field index safely', () => {
      const { result } = renderHook(() => useThemeForm());

      // Valid index
      act(() => {
        result.current.setCurrentFieldIndex(2);
      });

      expect(result.current.currentFieldIndex).toBe(2);

      // Index too low
      act(() => {
        result.current.setCurrentFieldIndex(-5);
      });

      expect(result.current.currentFieldIndex).toBe(0);

      // Index too high
      act(() => {
        result.current.setCurrentFieldIndex(100);
      });

      expect(result.current.currentFieldIndex).toBe(4); // Max valid index
    });

    it('should handle empty config fields', () => {
      mockThemeValidation.configFields = [];

      const { result } = renderHook(() => useThemeForm());

      expect(result.current.currentField).toBeNull();

      act(() => {
        result.current.setCurrentFieldIndex(0);
      });

      expect(result.current.currentFieldIndex).toBe(0);
      expect(result.current.currentField).toBeNull();
    });
  });

  describe('memoization and performance', () => {
    it('should memoize computed values correctly', () => {
      const { result, rerender } = renderHook(() => useThemeForm());

      const firstCurrentField = result.current.currentField;
      const firstGetFieldError = result.current.getFieldError;
      const firstIsFieldValid = result.current.isFieldValid;
      const firstGetFormProgress = result.current.getFormProgress;

      rerender();

      expect(result.current.currentField).toBe(firstCurrentField);
      expect(result.current.getFieldError).toBe(firstGetFieldError);
      expect(result.current.isFieldValid).toBe(firstIsFieldValid);
      expect(result.current.getFormProgress).toBe(firstGetFormProgress);
    });

    it('should update computed values when dependencies change', () => {
      mockThemeValidation.validateAllFields.mockReturnValue({
        isValid: false,
        errors: {},
      });

      const { result } = renderHook(() => useThemeForm());

      const initialIsFormValid = result.current.isFormValid;

      mockThemeValidation.validateAllFields.mockReturnValue({
        isValid: true,
        errors: {},
      });

      act(() => {
        result.current.handleFieldChange('themeName', 'Valid Theme');
      });

      expect(result.current.isFormValid).not.toBe(initialIsFormValid);
    });

    it('should maintain stable callback references', () => {
      const { result, rerender } = renderHook(() => useThemeForm());

      const firstHandleFieldChange = result.current.handleFieldChange;
      const firstHandleFieldSubmit = result.current.handleFieldSubmit;
      const firstResetForm = result.current.resetForm;

      rerender();

      expect(result.current.handleFieldChange).toBe(firstHandleFieldChange);
      expect(result.current.handleFieldSubmit).toBe(firstHandleFieldSubmit);
      expect(result.current.resetForm).toBe(firstResetForm);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle missing config fields gracefully', () => {
      mockThemeValidation.configFields = [];

      const { result } = renderHook(() => useThemeForm());

      expect(result.current.configFields).toEqual([]);
      expect(result.current.currentField).toBeNull();

      const progress = result.current.getFormProgress();
      expect(progress).toEqual({
        completed: 0,
        total: 0,
        percentage: 0,
      });
    });

    it('should handle validation hook errors gracefully', () => {
      mockThemeValidation.validateField.mockImplementation(() => {
        throw new Error('Validation error');
      });

      const { result } = renderHook(() => useThemeForm());

      // Should not crash when validation throws
      expect(() => {
        result.current.handleFieldSubmit();
      }).not.toThrow();
    });

    it('should handle context update errors gracefully', () => {
      mockAppContext.updateFormData.mockImplementation(() => {
        throw new Error('Context update failed');
      });

      mockThemeValidation.validateAllFields.mockReturnValue({
        isValid: true,
        errors: {},
      });

      const { result } = renderHook(() => useThemeForm());

      // Should not crash when context update fails
      expect(() => {
        result.current.handleFormComplete();
      }).not.toThrow();
    });

    it('should handle rapid field changes correctly', () => {
      const { result } = renderHook(() => useThemeForm());

      // Rapid field changes should not cause issues
      act(() => {
        result.current.handleFieldChange('themeName', 'A');
        result.current.handleFieldChange('themeName', 'AB');
        result.current.handleFieldChange('themeName', 'ABC');
        result.current.handleFieldChange('themeName', 'ABCD');
      });

      expect(result.current.values.themeName).toBe('ABCD');
    });

    it('should handle concurrent field operations', () => {
      const { result } = renderHook(() => useThemeForm());

      act(() => {
        // Simulate concurrent operations
        result.current.handleFieldChange('themeName', 'Theme');
        result.current.setCurrentFieldIndex(1);
        result.current.handleFieldChange('description', 'Description');
      });

      expect(result.current.values.themeName).toBe('Theme');
      expect(result.current.values.description).toBe('Description');
      expect(result.current.currentFieldIndex).toBe(1);
    });
  });

  describe('integration with external hooks', () => {
    it('should integrate with app context correctly', () => {
      const { result } = renderHook(() => useThemeForm());

      act(() => {
        result.current.handleFormComplete();
      });

      expect(mockAppContext.updateFormData).toHaveBeenCalledWith(result.current.values);
      expect(mockAppContext.navigation.goToStep).toHaveBeenCalledWith('extension-options');
    });

    it('should integrate with notifications correctly', () => {
      mockThemeValidation.validateField.mockReturnValue('Validation error');

      const { result } = renderHook(() => useThemeForm());

      act(() => {
        result.current.handleFieldSubmit();
      });

      expect(mockNotifications.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: 'Validation Error',
        })
      );
    });

    it('should integrate with theme validation hook correctly', () => {
      const { result } = renderHook(() => useThemeForm());

      expect(result.current.configFields).toBe(mockThemeValidation.configFields);

      act(() => {
        result.current.handleFieldSubmit();
      });

      expect(mockThemeValidation.validateField).toHaveBeenCalled();
    });
  });
});
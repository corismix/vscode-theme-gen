/**
 * useThemeForm - Form state management hook
 * 
 * Comprehensive form state management hook for theme configuration with validation
 * integration, progress tracking, and optimized performance. Provides centralized
 * form handling with real-time validation, field navigation, and persistence.
 * 
 * Features:
 * - Centralized form state with AppContext integration
 * - Real-time validation with error handling
 * - Field-by-field navigation with progress tracking
 * - Form completion validation and error recovery
 * - Performance optimization with memoization
 * - Change detection and form dirty state
 * - Form reset and prefill capabilities
 * 
 * State Management:
 * - Form values synchronized with global AppContext
 * - Validation errors with field-specific error handling
 * - Current field index for navigation
 * - Progress calculation and completion tracking
 * 
 * @hook
 * @since 1.0.0
 */

import { useState, useCallback, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useThemeValidation, type ThemeConfigForm, type ThemeConfigField } from '@/hooks/useThemeValidation';

export interface FormState {
  values: ThemeConfigForm;
  validationErrors: Partial<Record<keyof ThemeConfigForm, string>>;
  currentFieldIndex: number;
}

export interface FormActions {
  handleFieldChange: (fieldId: keyof ThemeConfigForm, value: string) => void;
  handleFieldSubmit: () => void;
  handleFormComplete: () => void;
  setCurrentFieldIndex: (index: number) => void;
  resetForm: () => void;
  prefillForm: (data: Partial<ThemeConfigForm>) => void;
}

export interface FormHookReturn extends FormState, FormActions {
  configFields: ThemeConfigField[];
  currentField: ThemeConfigField | null;
  isFormValid: boolean;
  hasChanges: boolean;
  getFieldError: (fieldId: keyof ThemeConfigForm) => string | undefined;
  isFieldValid: (fieldId: keyof ThemeConfigForm) => boolean;
  getFormProgress: () => { completed: number; total: number; percentage: number };
}

/**
 * Default form values
 */
const DEFAULT_FORM_VALUES: ThemeConfigForm = {
  themeName: '',
  description: '',
  version: '1.0.0',
  publisher: '',
  license: 'MIT'
};

/**
 * Custom hook for theme form state management
 * 
 * Provides comprehensive form management capabilities including state handling,
 * validation integration, field navigation, and progress tracking. Integrates
 * with AppContext for persistence and useThemeValidation for validation logic.
 * 
 * Returns:
 * - Form state (values, errors, current field index)
 * - Form actions (change handlers, submit handlers, navigation)
 * - Computed values (current field, validation status, progress)
 * - Utility functions (error checking, progress calculation)
 * 
 * @returns FormHookReturn object with complete form management interface
 * 
 * @example
 * ```typescript
 * const {
 *   values,
 *   currentField,
 *   handleFieldChange,
 *   handleFieldSubmit,
 *   getFormProgress,
 *   isFormValid
 * } = useThemeForm();
 * 
 * // Handle field input
 * handleFieldChange('themeName', 'My Awesome Theme');
 * 
 * // Submit current field
 * handleFieldSubmit();
 * 
 * // Check form progress
 * const progress = getFormProgress();
 * console.log(`${progress.percentage}% complete`);
 * ```
 * 
 * @since 1.0.0
 */
export const useThemeForm = (): FormHookReturn => {
  const { formData, updateFormData, navigation } = useAppContext();
  const { addNotification } = useNotifications();
  const { configFields, validateField, validateAllFields } = useThemeValidation();

  // Initialize form values from context or defaults
  const initialValues = useMemo<ThemeConfigForm>(() => ({
    themeName: formData.themeName || DEFAULT_FORM_VALUES.themeName,
    description: formData.description || DEFAULT_FORM_VALUES.description,
    version: formData.version || DEFAULT_FORM_VALUES.version,
    publisher: formData.publisher || DEFAULT_FORM_VALUES.publisher,
    license: formData.license || DEFAULT_FORM_VALUES.license,
  }), [formData]);

  // Form state
  const [formValues, setFormValues] = useState<ThemeConfigForm>(initialValues);
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof ThemeConfigForm, string>>>({});
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);

  // Memoized computed values
  const currentField = useMemo<ThemeConfigField | null>(() => {
    const safeIndex = Math.max(0, Math.min(currentFieldIndex, configFields.length - 1));
    return configFields[safeIndex] || null;
  }, [currentFieldIndex, configFields]);

  const isFormValid = useMemo(() => {
    const { isValid } = validateAllFields(formValues);
    return isValid;
  }, [formValues, validateAllFields]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(formValues) !== JSON.stringify(initialValues);
  }, [formValues, initialValues]);

  // Utility functions
  const getFieldError = useCallback((fieldId: keyof ThemeConfigForm) => {
    return validationErrors[fieldId];
  }, [validationErrors]);

  const isFieldValid = useCallback((fieldId: keyof ThemeConfigForm) => {
    return !validationErrors[fieldId] && formValues[fieldId].trim() !== '';
  }, [validationErrors, formValues]);

  const getFormProgress = useCallback(() => {
    const completed = configFields.filter(field => 
      isFieldValid(field.id) || (!field.required && formValues[field.id] === '')
    ).length;
    const total = configFields.length;
    const percentage = Math.round((completed / total) * 100);
    
    return { completed, total, percentage };
  }, [configFields, isFieldValid, formValues]);

  // Form actions
  const handleFieldChange = useCallback((fieldId: keyof ThemeConfigForm, value: string) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
    
    // Clear validation error for this field immediately
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldId];
      return newErrors;
    });
  }, []);

  const handleFieldSubmit = useCallback(() => {
    if (!currentField) {
      addNotification({
        type: 'error',
        message: 'Configuration Error',
        details: 'Invalid field configuration. Please restart the configuration process.'
      });
      return;
    }
    
    const value = formValues[currentField.id];
    const error = validateField(currentField, value);
    
    if (error) {
      setValidationErrors(prev => ({ ...prev, [currentField.id]: error }));
      addNotification({
        type: 'error',
        message: 'Validation Error',
        details: error
      });
      return;
    }

    // Move to next field or complete form
    if (currentFieldIndex < configFields.length - 1) {
      setCurrentFieldIndex(prev => Math.min(prev + 1, configFields.length - 1));
    } else {
      handleFormComplete();
    }
  }, [currentField, formValues, validateField, currentFieldIndex, configFields.length, addNotification]);

  const handleFormComplete = useCallback(() => {
    const { isValid, errors } = validateAllFields(formValues);
    
    if (!isValid) {
      setValidationErrors(errors);
      
      // Find first error field and focus it
      const firstErrorField = configFields.find(field => errors[field.id]);
      if (firstErrorField) {
        const errorIndex = configFields.findIndex(field => field.id === firstErrorField.id);
        if (errorIndex !== -1) {
          setCurrentFieldIndex(errorIndex);
        }
      }
      
      addNotification({
        type: 'error',
        message: 'Form Validation Failed',
        details: 'Please fix the validation errors and try again.'
      });
      return;
    }

    // Update app context with form data
    updateFormData(formValues);
    
    addNotification({
      type: 'success',
      message: 'Configuration Complete',
      details: 'Theme configuration saved successfully'
    });
    
    navigation.goToStep('extension-options');
  }, [formValues, validateAllFields, configFields, updateFormData, navigation, addNotification]);

  const resetForm = useCallback(() => {
    setFormValues(DEFAULT_FORM_VALUES);
    setValidationErrors({});
    setCurrentFieldIndex(0);
  }, []);

  const prefillForm = useCallback((data: Partial<ThemeConfigForm>) => {
    setFormValues(prev => ({ ...prev, ...data }));
  }, []);

  // Safe currentFieldIndex setter with bounds checking
  const safeSetCurrentFieldIndex = useCallback((index: number) => {
    const safeIndex = Math.max(0, Math.min(index, configFields.length - 1));
    setCurrentFieldIndex(safeIndex);
  }, [configFields.length]);

  return {
    // State
    values: formValues,
    validationErrors,
    currentFieldIndex,
    
    // Actions
    handleFieldChange,
    handleFieldSubmit,
    handleFormComplete,
    setCurrentFieldIndex: safeSetCurrentFieldIndex,
    resetForm,
    prefillForm,
    
    // Computed values
    configFields,
    currentField,
    isFormValid,
    hasChanges,
    getFieldError,
    isFieldValid,
    getFormProgress,
  };
};
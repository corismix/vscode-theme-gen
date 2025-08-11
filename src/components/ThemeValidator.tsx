/**
 * ThemeValidator - Validation display and error handling component
 * 
 * Centralized validation feedback with comprehensive error display,
 * progress tracking, and user guidance with performance optimizations.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { InfoBox } from '@/components/shared/InfoBox';
import type { ThemeConfigForm, ThemeConfigField } from '@/hooks/useThemeValidation';

export interface ValidationSummary {
  totalFields: number;
  completedFields: number;
  requiredFields: number;
  completedRequiredFields: number;
  errorCount: number;
  isValid: boolean;
  progress: number;
}

export interface ThemeValidatorProps {
  values: ThemeConfigForm;
  errors: Partial<Record<keyof ThemeConfigForm, string>>;
  configFields: ThemeConfigField[];
  currentFieldIndex: number;
  showDetailedProgress?: boolean;
  showValidationSummary?: boolean;
}

/**
 * Calculate comprehensive validation summary
 */
const calculateValidationSummary = (
  values: ThemeConfigForm,
  errors: Partial<Record<keyof ThemeConfigForm, string>>,
  configFields: ThemeConfigField[]
): ValidationSummary => {
  const totalFields = configFields.length;
  const requiredFields = configFields.filter(field => field.required).length;
  const errorCount = Object.keys(errors).length;

  // Count completed fields (has value and no error)
  const completedFields = configFields.filter(field => {
    const value = values[field.id];
    const hasError = !!errors[field.id];
    return value.trim() !== '' && !hasError;
  }).length;

  // Count completed required fields
  const completedRequiredFields = configFields.filter(field => {
    const value = values[field.id];
    const hasError = !!errors[field.id];
    return field.required && value.trim() !== '' && !hasError;
  }).length;

  const progress = Math.round((completedFields / totalFields) * 100);
  const isValid = errorCount === 0 && completedRequiredFields === requiredFields;

  return {
    totalFields,
    completedFields,
    requiredFields,
    completedRequiredFields,
    errorCount,
    isValid,
    progress,
  };
};

/**
 * Get validation status for a specific field
 */
const getFieldValidationStatus = (
  field: ThemeConfigField,
  value: string,
  error?: string,
  isActive?: boolean
): {
  status: 'active' | 'completed' | 'error' | 'pending' | 'optional';
  color: string;
  icon: string;
} => {
  if (error) {
    return { status: 'error', color: '#ef4444', icon: '✗' };
  }
  
  if (isActive) {
    return { status: 'active', color: '#3b82f6', icon: '▶' };
  }
  
  if (value.trim() !== '') {
    return { status: 'completed', color: '#10b981', icon: '✓' };
  }
  
  if (!field.required) {
    return { status: 'optional', color: '#6b7280', icon: '◯' };
  }
  
  return { status: 'pending', color: '#6b7280', icon: '○' };
};

/**
 * Theme validator component for comprehensive validation feedback
 */
export const ThemeValidator: React.FC<ThemeValidatorProps> = React.memo(({
  values,
  errors,
  configFields,
  currentFieldIndex,
  showDetailedProgress = true,
  showValidationSummary = true
}) => {
  const summary = React.useMemo(
    () => calculateValidationSummary(values, errors, configFields),
    [values, errors, configFields]
  );

  const currentError = React.useMemo(() => {
    const currentField = configFields[currentFieldIndex];
    return currentField ? errors[currentField.id] : undefined;
  }, [configFields, currentFieldIndex, errors]);

  const validationMessage = React.useMemo(() => {
    if (currentError) {
      return currentError;
    }

    if (summary.isValid) {
      return 'All required fields completed successfully';
    }

    const remainingRequired = summary.requiredFields - summary.completedRequiredFields;
    if (remainingRequired > 0) {
      return `${remainingRequired} required field${remainingRequired > 1 ? 's' : ''} remaining`;
    }

    return 'Complete the form to continue';
  }, [currentError, summary]);

  const validationMessageType = React.useMemo(() => {
    if (currentError) return 'error';
    if (summary.isValid) return 'success';
    if (summary.errorCount > 0) return 'warning';
    return 'info';
  }, [currentError, summary]);

  return (
    <Box flexDirection="column" gap={1}>
      {/* Current Field Validation */}
      {currentError && (
        <InfoBox
          type="error"
          title="Field Validation Error"
          message={currentError}
        />
      )}

      {/* Validation Summary */}
      {showValidationSummary && !currentError && (
        <InfoBox
          type={validationMessageType}
          title="Form Validation"
          message={validationMessage}
        />
      )}

      {/* Detailed Progress */}
      {showDetailedProgress && (
        <Box flexDirection="column" gap={1}>
          <Box>
            <Text color="#6b7280">Progress: {summary.progress}% complete</Text>
          </Box>
          
          <Box flexDirection="column">
            {configFields.map((field, index) => {
              const value = values[field.id];
              const error = errors[field.id];
              const isActive = index === currentFieldIndex;
              const fieldStatus = getFieldValidationStatus(field, value, error, isActive);

              return (
                <Box key={field.id} alignItems="center" gap={1}>
                  <Text color={fieldStatus.color}>{fieldStatus.icon}</Text>
                  <Text color={fieldStatus.color}>
                    {field.label}
                    {field.required && <Text color="#ef4444">*</Text>}
                  </Text>
                  {isActive && (
                    <Text color="#6b7280" dimColor> ← current</Text>
                  )}
                </Box>
              );
            })}
          </Box>

          {/* Summary Stats */}
          <Box flexDirection="column" marginTop={1} gap={1}>
            <Text color="#6b7280">
              Completed: {summary.completedFields}/{summary.totalFields} fields
            </Text>
            <Text color="#6b7280">
              Required: {summary.completedRequiredFields}/{summary.requiredFields} fields
            </Text>
            {summary.errorCount > 0 && (
              <Text color="#ef4444">
                Errors: {summary.errorCount}
              </Text>
            )}
          </Box>
        </Box>
      )}

      {/* Form Status Indicator */}
      {summary.isValid && (
        <InfoBox
          type="success"
          title="Form Complete"
          message="Ready to proceed to the next step"
        />
      )}
    </Box>
  );
});

// Display name for React DevTools
ThemeValidator.displayName = 'ThemeValidator';
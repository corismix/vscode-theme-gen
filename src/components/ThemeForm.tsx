/**
 * ThemeForm - Form fields and validation component
 * 
 * Centralized form rendering with field management, validation integration,
 * and optimized performance using React.memo and composition patterns.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { FieldInput } from './FieldInput';
import { ThemeValidator } from './ThemeValidator';
import { InfoBox } from '@/components/shared/InfoBox';
import type { ThemeConfigForm, ThemeConfigField } from '@/hooks/useThemeValidation';

export interface ThemeFormProps {
  values: ThemeConfigForm;
  errors: Partial<Record<keyof ThemeConfigForm, string>>;
  configFields: ThemeConfigField[];
  currentFieldIndex: number;
  currentField: ThemeConfigField | null;
  onFieldChange: (fieldId: keyof ThemeConfigForm, value: string) => void;
  onFieldSubmit: () => void;
  showValidationSummary?: boolean;
  showProgressIndicator?: boolean;
  showCurrentFieldOnly?: boolean;
}

/**
 * Get step information for current field
 */
const getStepInfo = (currentFieldIndex: number, totalFields: number) => ({
  current: currentFieldIndex + 1,
  total: totalFields,
  percentage: Math.round(((currentFieldIndex + 1) / totalFields) * 100),
});

/**
 * Check if field is completed (has value and no error)
 */
const isFieldCompleted = (
  _field: ThemeConfigField,
  value: string,
  error?: string
): boolean => {
  return value.trim() !== '' && !error;
};

/**
 * Main theme form component with integrated validation and field management
 */
export const ThemeForm: React.FC<ThemeFormProps> = React.memo(({
  values,
  errors,
  configFields,
  currentFieldIndex,
  currentField,
  onFieldChange,
  onFieldSubmit,
  showValidationSummary = true,
  showProgressIndicator = true,
  showCurrentFieldOnly = false
}) => {
  // Safety check for current field
  if (!currentField) {
    return (
      <Box flexDirection="column">
        <InfoBox
          type="error"
          title="Configuration Error"
          message="Invalid field configuration. Please go back and try again."
        />
      </Box>
    );
  }

  const stepInfo = React.useMemo(
    () => getStepInfo(currentFieldIndex, configFields.length),
    [currentFieldIndex, configFields.length]
  );

  const fieldCompletionStates = React.useMemo(() => {
    return configFields.map(field => ({
      isCompleted: isFieldCompleted(field, values[field.id], errors[field.id]),
      hasError: !!errors[field.id],
    }));
  }, [configFields, values, errors]);

  return (
    <Box flexDirection="column" gap={2}>
      {/* Progress Header */}
      {showProgressIndicator && (
        <InfoBox
          type="info"
          title={`Step ${stepInfo.current} of ${stepInfo.total}`}
          message={`Configure your theme's ${currentField.label.toLowerCase()}`}
        />
      )}

      {/* Form Fields */}
      <Box flexDirection="column" gap={1}>
        {showCurrentFieldOnly ? (
          // Show only current field (compact mode)
          <FieldInput
            field={currentField}
            value={values[currentField.id]}
            error={errors[currentField.id]}
            isActive={true}
            isCompleted={false}
            onChange={(value) => onFieldChange(currentField.id, value)}
            onSubmit={onFieldSubmit}
            showCursor={true}
          />
        ) : (
          // Show all fields with states (detailed mode)
          configFields.map((field, index) => {
            const isActive = index === currentFieldIndex;
            const isCompleted = fieldCompletionStates[index].isCompleted;
            const error = errors[field.id];

            return (
              <FieldInput
                key={field.id}
                field={field}
                value={values[field.id]}
                error={error}
                isActive={isActive}
                isCompleted={isCompleted}
                onChange={(value) => onFieldChange(field.id, value)}
                onSubmit={onFieldSubmit}
                showCursor={isActive}
              />
            );
          })
        )}
      </Box>

      {/* Validation Summary */}
      {showValidationSummary && (
        <ThemeValidator
          values={values}
          errors={errors}
          configFields={configFields}
          currentFieldIndex={currentFieldIndex}
          showDetailedProgress={!showCurrentFieldOnly}
          showValidationSummary={true}
        />
      )}

      {/* Form Instructions */}
      <Box flexDirection="column" gap={1}>
        <Text color="#6b7280" dimColor>
          Instructions:
        </Text>
        <Text color="#6b7280" dimColor>
          • Press Enter to move to the next field
        </Text>
        <Text color="#6b7280" dimColor>
          • Use Tab/Shift+Tab to navigate between fields
        </Text>
        <Text color="#6b7280" dimColor>
          • Press Escape to go back
        </Text>
        <Text color="#6b7280" dimColor>
          • Fields marked with * are required
        </Text>
      </Box>
    </Box>
  );
});

// Display name for React DevTools
ThemeForm.displayName = 'ThemeForm';
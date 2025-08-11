/**
 * FieldInput - Reusable form field component
 * 
 * High-performance, memoized form field with integrated validation,
 * accessibility features, and consistent styling.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { TextInput } from './TextInput';
import type { ThemeConfigField } from '@/hooks/useThemeValidation';

export interface FieldInputProps {
  field: ThemeConfigField;
  value: string;
  error?: string;
  isActive: boolean;
  isCompleted: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  showCursor?: boolean;
}

/**
 * Get status indicator for field
 */
const getFieldStatusIndicator = (isActive: boolean, isCompleted: boolean, hasError: boolean): string => {
  if (hasError) return '✗';
  if (isActive) return '▶';
  if (isCompleted) return '✓';
  return '○';
};

/**
 * Get status color for field
 */
const getFieldStatusColor = (isActive: boolean, isCompleted: boolean, hasError: boolean): string => {
  if (hasError) return '#ef4444';      // red
  if (isActive) return '#3b82f6';      // blue
  if (isCompleted) return '#10b981';   // green
  return '#6b7280';                    // gray
};

/**
 * Reusable form field component with integrated validation and accessibility
 */
export const FieldInput: React.FC<FieldInputProps> = React.memo(({
  field,
  value,
  error,
  isActive,
  isCompleted,
  onChange,
  onSubmit,
  showCursor = true
}) => {
  const hasError = !!error;
  const statusIndicator = getFieldStatusIndicator(isActive, isCompleted, hasError);
  const statusColor = getFieldStatusColor(isActive, isCompleted, hasError);

  return (
    <Box flexDirection="column" gap={1}>
      {/* Field Label with Status */}
      <Box alignItems="center" gap={1}>
        <Text color={statusColor}>{statusIndicator}</Text>
        <Text color={isActive ? '#3b82f6' : '#f3f4f6'} bold={isActive}>
          {field.label}
          {field.required && <Text color="#ef4444">*</Text>}
        </Text>
      </Box>

      {/* Input Field */}
      {isActive && (
        <Box marginLeft={2}>
          <TextInput
            placeholder={field.placeholder}
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            showCursor={showCursor}
          />
        </Box>
      )}

      {/* Error Message */}
      {isActive && error && (
        <Box marginLeft={2}>
          <Text color="#ef4444">⚠ {error}</Text>
        </Box>
      )}

      {/* Field Help Text */}
      {isActive && !error && (
        <Box marginLeft={2}>
          <Text color="#6b7280" dimColor>
            {getFieldHelpText(field)}
          </Text>
        </Box>
      )}
    </Box>
  );
});

/**
 * Get contextual help text for field
 */
function getFieldHelpText(field: ThemeConfigField): string {
  switch (field.id) {
    case 'themeName':
      return 'Choose a descriptive name for your theme';
    case 'description':
      return 'Optional: Briefly describe your theme\'s style or purpose';
    case 'version':
      return 'Semantic version (major.minor.patch)';
    case 'publisher':
      return 'Your name or organization identifier';
    case 'license':
      return 'Optional: License type (e.g., MIT, Apache-2.0)';
    default:
      return 'Enter value and press Enter to continue';
  }
}

// Display name for React DevTools
FieldInput.displayName = 'FieldInput';
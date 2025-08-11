/**
 * TextInput component for VS Code Theme Generator
 * Wrapper around ink-text-input with additional features
 */

import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import InkTextInput from 'ink-text-input';

// ============================================================================
// Component Props
// ============================================================================

export interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  label?: string;
  showCursor?: boolean;
  mask?: string;
  error?: string;
  disabled?: boolean;
  maxLength?: number;
  validate?: (value: string) => string | null;
}

// ============================================================================
// TextInput Component
// ============================================================================

export const TextInput: React.FC<TextInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = '',
  label,
  showCursor = true,
  mask,
  error,
  disabled = false,
  maxLength,
  validate,
}) => {
  const [localError, setLocalError] = useState<string | null>(null);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleChange = useCallback((newValue: string) => {
    // Apply max length constraint
    if (maxLength && newValue.length > maxLength) {
      return;
    }

    // Clear previous validation error
    setLocalError(null);

    // Validate if validator is provided
    if (validate) {
      const validationError = validate(newValue);
      if (validationError) {
        setLocalError(validationError);
      }
    }

    onChange(newValue);
  }, [onChange, maxLength, validate]);

  const handleSubmit = useCallback((submittedValue: string) => {
    // Don't submit if there's an error
    if (localError || error) {
      return;
    }

    onSubmit?.(submittedValue);
  }, [onSubmit, localError, error]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const displayError = error || localError;
  const showMaxLength = maxLength && maxLength > 0;

  return (
    <Box flexDirection="column">
      {/* Label */}
      {label && (
        <Box marginBottom={1}>
          <Text>{label}</Text>
        </Box>
      )}

      {/* Input Container */}
      <Box flexDirection="column">
        {/* Input Field */}
        <Box>
          <InkTextInput
            value={value}
            onChange={handleChange}
            onSubmit={handleSubmit}
            placeholder={placeholder}
            showCursor={showCursor && !disabled}
            mask={mask}
          />
        </Box>

        {/* Error Message */}
        {displayError && (
          <Box marginTop={1}>
            <Text color="red">
              ✗ {displayError}
            </Text>
          </Box>
        )}

        {/* Character Count */}
        {showMaxLength && (
          <Box marginTop={displayError ? 0 : 1} justifyContent="flex-end">
            <Text color="dim">
              {value.length}/{maxLength}
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default TextInput;
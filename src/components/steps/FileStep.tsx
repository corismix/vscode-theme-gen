import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Header, useTextInput, NavigationHints, CursorText } from '../ui';
import { FormData } from '@/types';
import { fileUtils } from '../../lib/utils-simple';
import { FileValidationResult } from '../../types/error.types';

interface FileStepProps {
  formData: FormData;
  setFormData: (data: FormData) => void;
  onNext: () => void;
  error?: string | undefined;
}

/**
 * File selection step component
 * Allows user to input path to Ghostty theme file
 */
const FileStepComponent: React.FC<FileStepProps> = ({ formData, setFormData, onNext, error }) => {
  const textInput = useTextInput(formData.inputFile);
  const [validation, setValidation] = useState<FileValidationResult>({ isValid: true });
  const [isValidating, setIsValidating] = useState(false);

  // Real-time path validation with debouncing
  useEffect(() => {
    const validatePath = async () => {
      const currentPath = textInput.value.trim();

      if (!currentPath) {
        setValidation({ isValid: true });
        setIsValidating(false);
        return;
      }

      setIsValidating(true);

      try {
        // Use enhanced path validation
        const pathValidation = fileUtils.validateFilePath(currentPath);

        if (pathValidation.isValid) {
          // If path format is valid, check if it's a valid Ghostty file
          const fileValidation = fileUtils.validateGhosttyFile(currentPath);
          setValidation(fileValidation);
        } else {
          setValidation(pathValidation);
        }
      } catch (err) {
        setValidation({
          isValid: false,
          error: 'Path validation failed',
          suggestions: ['Check that the path is formatted correctly'],
        });
      } finally {
        setIsValidating(false);
      }
    };

    // Debounce validation to avoid excessive checks while typing
    const timeoutId = setTimeout(validatePath, 500);
    return () => clearTimeout(timeoutId);
  }, [textInput.value]);

  // Sync form data when the input value changes
  useEffect(() => {
    if (textInput.value !== formData.inputFile) {
      setFormData({ ...formData, inputFile: textInput.value });
    }
  }, [textInput.value, formData, setFormData]);

  useInput((input, key) => {
    const result = textInput.handleInput(input, key);
    if (result.shouldSubmit && result.value.trim()) {
      onNext();
    }
  });

  return (
    <Box flexDirection='column'>
      <Header title='VS Code Theme Generator - File Selection' />

      <Box marginBottom={1}>
        <Text>Select your Ghostty theme file:</Text>
      </Box>

      {/* Input field with validation indicator */}
      <Box borderStyle='single' padding={1} marginBottom={1}>
        <Box>
          <Text>File: </Text>
          <CursorText value={textInput.value} cursorPos={textInput.cursorPos} />

          {/* Validation indicator */}
          <Text> {
            textInput.value.trim() === '' ? '' :
            isValidating ? 'Validating...' :
            validation.isValid ? 'Valid' : 'Invalid'
          }</Text>
        </Box>
      </Box>

      {/* Normalized path preview (when different from input) */}
      {validation.normalizedPath && validation.normalizedPath !== textInput.value.trim() && (
        <Box marginBottom={1} paddingLeft={1}>
          <Text color='cyan'>→ Resolved: {validation.normalizedPath}</Text>
        </Box>
      )}

      {/* Real-time validation feedback */}
      {textInput.value.trim() && !validation.isValid && validation.error && (
        <Box marginBottom={1}>
          <Text color='red'>{validation.error}</Text>
          {validation.suggestions && validation.suggestions.map((suggestion, index) => (
            <Text key={index} color='yellow'>  Tip: {suggestion}</Text>
          ))}
        </Box>
      )}

      {/* Success feedback */}
      {textInput.value.trim() && validation.isValid && !isValidating && (
        <Box marginBottom={1}>
          <Text color='green'>Valid theme file path</Text>
        </Box>
      )}

      {error && (
        <Box marginBottom={1}>
          <Text color='red'>{error}</Text>
        </Box>
      )}

      <Box flexDirection='column'>
        <Text color='gray'>Type or paste the file path and press Enter</Text>
        <Text color='gray' dimColor>
          Supports: ~/home paths, .ghostty/.txt/.toml/.conf files
        </Text>
        <NavigationHints showInput showPaste />
      </Box>
    </Box>
  );
};

FileStepComponent.displayName = 'FileStep';

export const FileStep = React.memo(FileStepComponent);

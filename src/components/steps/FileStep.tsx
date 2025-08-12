import React from 'react';
import { Box, Text, useInput } from 'ink';
import { Header, useTextInput } from '../ui';
import { FormData } from '../types';

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
export const FileStep: React.FC<FileStepProps> = ({ formData, setFormData, onNext, error }) => {
  const textInput = useTextInput(formData.inputFile);

  // Sync form data when the input value changes
  React.useEffect(() => {
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
      <Header title='🎨 VS Code Theme Generator - File Selection' />

      <Box marginBottom={1}>
        <Text>Select your Ghostty theme file (.txt):</Text>
      </Box>

      <Box borderStyle='single' padding={1} marginBottom={1}>
        <Text>📁 {textInput.renderWithCursor()}</Text>
      </Box>

      {error && (
        <Box marginBottom={1}>
          <Text color='red'>❌ {error}</Text>
        </Box>
      )}

      <Box flexDirection='column'>
        <Text color='gray'>Type the file path and press Enter</Text>
        <Text color='gray' dimColor>
          Navigation: ←→ move cursor, Backspace/Delete to remove text
        </Text>
      </Box>
    </Box>
  );
};

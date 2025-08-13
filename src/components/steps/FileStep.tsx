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
        <Text>📁 {(() => {
          const { value, cursorPos } = textInput;

          if (value.length === 0) {
            return <Text><Text backgroundColor='cyan' color='black'> </Text></Text>;
          }

          if (cursorPos >= value.length) {
            return <Text>{value}<Text backgroundColor='cyan' color='black'> </Text></Text>;
          }

          const before = value.slice(0, cursorPos);
          const cursorChar = value.slice(cursorPos, cursorPos + 1);
          const after = value.slice(cursorPos + 1);

          return (
            <Text>
              {before}
              <Text backgroundColor='cyan' color='black'>{cursorChar}</Text>
              {after}
            </Text>
          );
        })()}</Text>
      </Box>

      {error && (
        <Box marginBottom={1}>
          <Text color='red'>❌ {error}</Text>
        </Box>
      )}

      <Box flexDirection='column'>
        <Text color='gray'>Type the file path and press Enter</Text>
        <Text color='gray' dimColor>
          Navigation: ←→ arrow keys, Backspace/Delete, Ctrl+A (home), Ctrl+E (end)
        </Text>
      </Box>
    </Box>
  );
};

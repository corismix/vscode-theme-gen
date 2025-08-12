import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Header, useTextInput } from '../ui';
import { FormData, ThemeData } from '../types';

interface ThemeStepProps {
  formData: FormData;
  setFormData: (data: FormData) => void;
  themeData: ThemeData | null;
  onNext: () => void;
  onBack: () => void;
  error?: string | undefined;
}

/**
 * Theme configuration step component
 * Allows user to set theme name and description
 */
export const ThemeStep: React.FC<ThemeStepProps> = ({
  formData,
  setFormData,
  themeData,
  onNext,
  onBack,
  error,
}) => {
  const [isEditingName, setIsEditingName] = useState(true);
  const nameInput = useTextInput(formData.themeName);
  const descInput = useTextInput(formData.description);

  // Sync form data with input values
  React.useEffect(() => {
    if (isEditingName && nameInput.value !== formData.themeName) {
      setFormData({ ...formData, themeName: nameInput.value });
    } else if (!isEditingName && descInput.value !== formData.description) {
      setFormData({ ...formData, description: descInput.value });
    }
  }, [nameInput.value, descInput.value, formData, setFormData, isEditingName]);

  useInput((input, key) => {
    if (key.escape) {
      onBack();
      return;
    }

    if (isEditingName) {
      const result = nameInput.handleInput(input, key);
      if (result.shouldSubmit && result.value.trim()) {
        setIsEditingName(false);
      }
    } else {
      if (key.tab) {
        if (descInput.value.trim()) {
          onNext();
        }
        return;
      }

      const result = descInput.handleInput(input, key);
      if (result.shouldSubmit && result.value.trim()) {
        onNext();
      }
    }
  });

  return (
    <Box flexDirection='column'>
      <Header title='🎨 Theme Configuration' />

      {themeData && (
        <Box marginBottom={1} padding={1} borderStyle='single' borderColor='green'>
          <Text color='green'>✅ Theme file parsed successfully!</Text>
        </Box>
      )}

      <Box marginBottom={1}>
        <Text>{isEditingName ? '📝' : '✅'} Theme Name:</Text>
      </Box>

      {isEditingName ? (
        <Box borderStyle='single' padding={1} marginBottom={1}>
          {nameInput.renderWithCursor()}
        </Box>
      ) : (
        <Box padding={1} marginBottom={1}>
          <Text color='green'>✅ {nameInput.value}</Text>
        </Box>
      )}

      {!isEditingName && (
        <>
          <Box marginBottom={1}>
            <Text>📝 Description:</Text>
          </Box>

          <Box borderStyle='single' padding={1} marginBottom={1}>
            {descInput.renderWithCursor()}
          </Box>
        </>
      )}

      {error && (
        <Box marginBottom={1}>
          <Text color='red'>❌ {error}</Text>
        </Box>
      )}

      <Box flexDirection='column'>
        <Text color='gray'>
          {isEditingName
            ? 'Enter theme name and press Enter'
            : 'Enter description and press Enter/Tab to continue, Esc to go back'}
        </Text>
        <Text color='gray' dimColor>
          Navigation: ←→ move cursor, Backspace/Delete to remove text
        </Text>
      </Box>
    </Box>
  );
};

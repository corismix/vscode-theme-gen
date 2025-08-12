import React from 'react';
import { Box, Text } from 'ink';
import { useTextInput } from '../../hooks/useTextInput';

interface TextInputProps {
  initialValue?: string;
  placeholder?: string;
  onSubmit: (value: string) => void;
  onUpdate?: (value: string) => void;
  icon?: string;
}

/**
 * Reusable text input component with cursor navigation
 */
export const TextInput: React.FC<TextInputProps> = ({
  initialValue = '',
  placeholder: _placeholder = '',
  onSubmit: _onSubmit,
  onUpdate,
  icon = '📝',
}) => {
  const textInput = useTextInput(initialValue);

  // Handle updates if callback provided
  React.useEffect(() => {
    if (onUpdate) {
      onUpdate(textInput.value);
    }
  }, [textInput.value, onUpdate]);

  // Removed unused handleInput function to satisfy strict mode

  return (
    <Box borderStyle='single' padding={1} marginBottom={1}>
      <Text>
        {icon} {textInput.renderWithCursor()}
      </Text>
    </Box>
  );
};

/**
 * Export the hook for components that need direct control
 */
export { useTextInput } from '../../hooks/useTextInput';

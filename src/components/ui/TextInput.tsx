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
 * Text input component with proper cursor positioning
 */
export const TextInput: React.FC<TextInputProps> = ({
  initialValue = '',
  placeholder = '',
  onSubmit: _onSubmit,
  onUpdate,
  icon = '>',
}) => {
  const textInput = useTextInput(initialValue);

  // Handle updates if callback provided
  React.useEffect(() => {
    if (onUpdate) {
      onUpdate(textInput.value);
    }
  }, [textInput.value, onUpdate]);

  const renderWithCursor = () => {
    const { value, cursorPos } = textInput;

    if (value.length === 0) {
      return (
        <Text>
          <Text backgroundColor='cyan' color='black'> </Text>
          {placeholder && <Text color='gray' dimColor> ({placeholder})</Text>}
        </Text>
      );
    }

    if (cursorPos >= value.length) {
      return (
        <Text>
          {value}
          <Text backgroundColor='cyan' color='black'> </Text>
        </Text>
      );
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
  };

  return (
    <Box borderStyle='single' padding={1} marginBottom={1}>
      <Text>{icon} {renderWithCursor()}</Text>
    </Box>
  );
};

/**
 * Export the hook for components that need direct control
 */
export { useTextInput } from '../../hooks/useTextInput';

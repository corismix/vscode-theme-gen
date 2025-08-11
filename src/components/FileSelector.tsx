/**
 * FileSelector component for VS Code Theme Generator
 * Simple file selection with basic validation
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useAppContext } from '../context/AppContext';

const FileSelector: React.FC = () => {
  const { formData } = useAppContext();

  return (
    <Box flexDirection="column" padding={2}>
      <Box marginBottom={2}>
        <Text color="blue" bold>Select Theme File</Text>
      </Box>
      <Box marginBottom={1}>
        <Text>Choose a Ghostty theme file (.txt)</Text>
      </Box>
      <Box marginBottom={2}>
        <Text color="dim">Current file: {formData.inputFile || 'None selected'}</Text>
      </Box>
    </Box>
  );
};

export default FileSelector;
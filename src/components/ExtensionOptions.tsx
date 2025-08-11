/**
 * ExtensionOptions component for VS Code Theme Generator
 * Configure extension generation options
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useAppContext } from '../context/AppContext';

const ExtensionOptions: React.FC = () => {
  const { formData } = useAppContext();

  return (
    <Box flexDirection="column" padding={2}>
      <Box marginBottom={2}>
        <Text color="blue" bold>Extension Options</Text>
      </Box>
      <Box marginBottom={1}>
        <Text>Configure extension generation settings</Text>
      </Box>
      <Box marginBottom={2}>
        <Text color="dim">Output: {formData.outputPath || 'Default location'}</Text>
      </Box>
    </Box>
  );
};

export default ExtensionOptions;
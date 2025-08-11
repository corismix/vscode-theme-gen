/**
 * ProgressIndicator component for VS Code Theme Generator
 * Shows generation progress
 */

import React from 'react';
import { Box, Text } from 'ink';

const ProgressIndicator: React.FC = () => {
  return (
    <Box flexDirection="column" padding={2}>
      <Box marginBottom={2}>
        <Text color="blue" bold>Generating Theme</Text>
      </Box>
      <Box marginBottom={1}>
        <Text>Please wait while your theme is being generated...</Text>
      </Box>
      <Box marginBottom={2}>
        <Text color="dim">●●●</Text>
      </Box>
    </Box>
  );
};

export default ProgressIndicator;
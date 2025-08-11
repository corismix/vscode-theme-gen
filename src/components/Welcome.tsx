/**
 * Welcome component for VS Code Theme Generator
 * Simple welcome screen with basic navigation
 */

import React from 'react';
import { Box, Text } from 'ink';

const Welcome: React.FC = () => {

  return (
    <Box flexDirection="column" padding={2}>
      <Box marginBottom={2}>
        <Text color="blue" bold>Welcome to VS Code Theme Generator</Text>
      </Box>
      <Box marginBottom={1}>
        <Text>Convert Ghostty terminal themes to VS Code extensions</Text>
      </Box>
      <Box marginBottom={2}>
        <Text color="dim">Press Enter to continue</Text>
      </Box>
    </Box>
  );
};

export default Welcome;
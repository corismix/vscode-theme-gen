/**
 * SuccessScreen component for VS Code Theme Generator
 * Shows completion and next steps
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useAppContext } from '../context/AppContext';

const SuccessScreen: React.FC = () => {
  const { generationResults } = useAppContext();

  return (
    <Box flexDirection="column" padding={2}>
      <Box marginBottom={2}>
        <Text color="green" bold>✓ Theme Generated Successfully!</Text>
      </Box>
      <Box marginBottom={1}>
        <Text>Your VS Code theme extension has been created.</Text>
      </Box>
      {generationResults && (
        <Box marginBottom={2}>
          <Text color="dim">Output: {generationResults.outputPath}</Text>
        </Box>
      )}
    </Box>
  );
};

export default SuccessScreen;
import React from 'react';
import { Box, Text, useInput } from 'ink';
import { Header } from '../ui';

interface ErrorDisplayProps {
  error: string;
  onBack: () => void;
  onRestart: () => void;
}

/**
 * Error display component
 * Shows error message and offers back/restart options
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onBack, onRestart }) => {
  useInput((input, key) => {
    if (key.return || input === 'r') {
      onRestart();
    } else if (key.escape || input === 'b') {
      onBack();
    }
  });

  return (
    <Box flexDirection='column'>
      <Header title='❌ Error' />

      <Box marginBottom={2} padding={1} borderStyle='single' borderColor='red'>
        <Text color='red'>{error}</Text>
      </Box>

      <Box>
        <Text color='gray'>Press Enter to restart, Esc to go back</Text>
      </Box>
    </Box>
  );
};

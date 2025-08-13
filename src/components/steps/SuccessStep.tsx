import React from 'react';
import { Box, Text, useInput } from 'ink';
import { Header } from '../ui';
import { FormData } from '@/types';

interface SuccessStepProps {
  formData: FormData;
  onRestart: () => void;
  onExit: () => void;
}

/**
 * Success step component
 * Shows completion message and offers restart/exit options
 */
const SuccessStepComponent: React.FC<SuccessStepProps> = ({ formData, onRestart, onExit }) => {
  useInput((input, key) => {
    if (key.return || input === 'y') {
      onRestart();
    } else if (input === 'n' || key.escape) {
      onExit();
    }
  });

  return (
    <Box flexDirection='column'>
      <Header title='Success!' />

      <Box marginBottom={1} padding={1} borderStyle='double' borderColor='green'>
        <Text color='green'>VS Code theme extension generated successfully!</Text>
      </Box>

      <Box marginBottom={1}>
        <Text>Output: {formData.outputPath}</Text>
      </Box>

      <Box marginBottom={2}>
        <Text>Theme: {formData.themeName}</Text>
      </Box>

      <Box>
        <Text color='gray'>Generate another theme? (y/n)</Text>
      </Box>
    </Box>
  );
};

SuccessStepComponent.displayName = 'SuccessStep';

export const SuccessStep = React.memo(SuccessStepComponent);

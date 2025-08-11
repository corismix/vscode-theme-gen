/**
 * ThemeConfigurator component for VS Code Theme Generator
 * Configure theme metadata and settings
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useAppContext } from '../context/AppContext';

const ThemeConfigurator: React.FC = () => {
  const { formData } = useAppContext();

  return (
    <Box flexDirection="column" padding={2}>
      <Box marginBottom={2}>
        <Text color="blue" bold>Configure Theme</Text>
      </Box>
      <Box marginBottom={1}>
        <Text>Set up your theme metadata</Text>
      </Box>
      <Box marginBottom={2}>
        <Text color="dim">Name: {formData.themeName || 'Not set'}</Text>
      </Box>
    </Box>
  );
};

export default ThemeConfigurator;
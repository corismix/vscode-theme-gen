import React from 'react';
import { Box, Text } from 'ink';

interface HeaderProps {
  title: string;
}

/**
 * Reusable header component with consistent styling
 */
export const Header: React.FC<HeaderProps> = ({ title }) => (
  <Box borderStyle='round' borderColor='cyan' padding={1} marginBottom={1}>
    <Text color='cyan' bold>
      {title}
    </Text>
  </Box>
);

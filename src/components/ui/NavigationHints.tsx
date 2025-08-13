import React from 'react';
import { Box, Text } from 'ink';

interface NavigationHintsProps {
  showInput?: boolean;
  showPaste?: boolean;
  showStepNavigation?: boolean;
  customHints?: string[];
}

/**
 * Shared navigation hints component to avoid duplication
 */
export const NavigationHints: React.FC<NavigationHintsProps> = ({
  showInput = true,
  showPaste = false,
  showStepNavigation = false,
  customHints = [],
}) => (
  <Box flexDirection='column'>
    {showInput && (
      <Text color='gray' dimColor>
        Navigate: ←→ arrows, Backspace/Delete, Ctrl+A/E
      </Text>
    )}
    {showPaste && (
      <Text color='gray' dimColor>
        Tip: Paste: Ctrl+V (Windows/Linux) or Cmd+V (macOS)
      </Text>
    )}
    {showStepNavigation && (
      <Text color='gray' dimColor>
        Step: Enter/Tab to continue, Esc to go back
      </Text>
    )}
    {customHints.map((hint, index) => (
      <Text key={index} color='gray' dimColor>
        {hint}
      </Text>
    ))}
  </Box>
);

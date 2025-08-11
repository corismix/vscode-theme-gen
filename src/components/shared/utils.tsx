/**
 * Utility components for wrapping Ink components with proper margins
 */

import React from 'react';
import { Box, Text } from 'ink';

// ============================================================================
// Text with Margin Components
// ============================================================================

interface TextWithMarginProps {
  children: React.ReactNode;
  color?: string;
  bold?: boolean;
  dimColor?: boolean;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
}

export const TextWithMargin: React.FC<TextWithMarginProps> = ({
  children,
  color,
  bold,
  dimColor,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  ...props
}) => (
  <Box
    marginTop={marginTop}
    marginBottom={marginBottom}
    marginLeft={marginLeft}
    marginRight={marginRight}
  >
    <Text color={color} bold={bold} dimColor={dimColor} {...props}>
      {children}
    </Text>
  </Box>
);

export default TextWithMargin;
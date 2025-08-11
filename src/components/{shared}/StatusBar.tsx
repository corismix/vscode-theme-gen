/**
 * Status Bar component
 * Provides a professional status bar with configurable items
 */

import React from 'react';
import { Box, Text } from 'ink';
import { StatusBarProps, StatusItem } from './types';

// ============================================================================
// Color Configuration
// ============================================================================

const colors = {
  background: '#1F2937',
  border: '#374151',
  text: '#F9FAFB',
  textMuted: '#9CA3AF',
  separator: '#6B7280'
};

// ============================================================================
// StatusBar Item Component
// ============================================================================

interface StatusBarItemProps {
  item: StatusItem;
  separatorChar: string;
  showSeparator: boolean;
}

const StatusBarItem: React.FC<StatusBarItemProps> = ({ item, separatorChar, showSeparator }) => {
  return (
    <Box alignItems="center">
      <Box width={item.width || 'auto'}>
        <Text color={item.color || colors.text}>
          {item.content}
        </Text>
      </Box>
      
      {showSeparator && (
        <Text color={colors.separator} marginLeft={1} marginRight={1}>
          {separatorChar}
        </Text>
      )}
    </Box>
  );
};

// ============================================================================
// Main StatusBar Component
// ============================================================================

const StatusBar: React.FC<StatusBarProps> = ({
  items = [],
  height = 1,
  borderStyle = 'single',
  backgroundColor = colors.background,
  textColor = colors.text,
  separatorChar = '│',
  className,
  testId
}) => {
  // Group items by position
  const leftItems = items.filter(item => item.position === 'left' || !item.position);
  const centerItems = items.filter(item => item.position === 'center');
  const rightItems = items.filter(item => item.position === 'right');

  // Sort by priority (higher priority first)
  const sortByPriority = (a: StatusItem, b: StatusItem) => (b.priority || 0) - (a.priority || 0);
  
  leftItems.sort(sortByPriority);
  centerItems.sort(sortByPriority);
  rightItems.sort(sortByPriority);

  const renderItems = (itemList: StatusItem[], showSeparators: boolean = true) => {
    if (itemList.length === 0) return null;
    
    return (
      <Box alignItems="center">
        {itemList.map((item, index) => (
          <StatusBarItem
            key={item.id}
            item={item}
            separatorChar={separatorChar}
            showSeparator={showSeparators && index < itemList.length - 1}
          />
        ))}
      </Box>
    );
  };

  if (borderStyle === 'none') {
    return (
      <Box
        width="100%"
        height={height}
        justifyContent="space-between"
        alignItems="center"
        paddingX={1}
        className={className}
        data-testid={testId}
      >
        {renderItems(leftItems)}
        {renderItems(centerItems, false)}
        {renderItems(rightItems)}
      </Box>
    );
  }

  return (
    <Box
      width="100%"
      height={height + 2} // Account for border
      borderStyle={borderStyle}
      borderColor={colors.border}
      className={className}
      data-testid={testId}
    >
      <Box
        width="100%"
        justifyContent="space-between"
        alignItems="center"
        paddingX={1}
      >
        {renderItems(leftItems)}
        {renderItems(centerItems, false)}
        {renderItems(rightItems)}
      </Box>
    </Box>
  );
};

export default StatusBar;
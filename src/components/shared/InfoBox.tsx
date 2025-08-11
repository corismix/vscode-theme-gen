/**
 * InfoBox component
 * Displays informational messages with different types and actions
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { InfoBoxProps } from './types';

// ============================================================================
// Color Configuration
// ============================================================================

const colors = {
  info: '#3B82F6',
  warning: '#F59E0B',
  error: '#EF4444',
  success: '#10B981',
  tip: '#8B5CF6',
  background: {
    info: '#1E3A8A',
    warning: '#92400E',
    error: '#7F1D1D',
    success: '#064E3B',
    tip: '#581C87'
  },
  border: {
    info: '#3B82F6',
    warning: '#F59E0B',
    error: '#EF4444',
    success: '#10B981',
    tip: '#8B5CF6'
  },
  text: '#F9FAFB',
  textMuted: '#9CA3AF',
  actionPrimary: '#3B82F6',
  actionSecondary: '#6B7280'
};

// ============================================================================
// Type Icons
// ============================================================================

const getTypeIcon = (type: InfoBoxProps['type']): string => {
  switch (type) {
    case 'info': return 'ℹ️';
    case 'warning': return '⚠️';
    case 'error': return '❌';
    case 'success': return '✅';
    case 'tip': return '💡';
    default: return 'ℹ️';
  }
};

// ============================================================================
// Main InfoBox Component
// ============================================================================

const InfoBox: React.FC<InfoBoxProps & { message?: string }> = ({
  title,
  content,
  message,
  type = 'info',
  icon,
  dismissible = false,
  onDismiss: _onDismiss,
  actions = [],
  collapsible = false,
  defaultCollapsed = false,
  borderStyle = 'single',
  width = '100%',
  padding = 1,
}) => {
  const [isCollapsed] = useState(defaultCollapsed);
  const [isDismissed] = useState(false);

  // Don't render if dismissed
  if (isDismissed) {
    return null;
  }

  // Style configuration
  const typeColor = colors[type] || colors.info;
  const borderColor = colors.border[type] || colors.border.info;
  const displayIcon = icon || getTypeIcon(type);

  // Handlers are defined but not used directly in render - kept for potential future use
  // const handleDismiss = () => {
  //   setIsDismissed(true);
  //   onDismiss?.();
  // };

  // const handleToggleCollapse = () => {
  //   setIsCollapsed(prev => !prev);
  // };

  // Render actions
  const renderActions = () => {
    if (actions.length === 0) return null;

    return (
      <Box marginTop={1} gap={1}>
        {actions.map((action, index) => {
          const actionColor = action.style === 'primary' 
            ? colors.actionPrimary 
            : colors.actionSecondary;

          return (
            <Box key={index}>
              <Text color={actionColor}>
                [{action.label}]
              </Text>
            </Box>
          );
        })}
      </Box>
    );
  };

  // Render header
  const renderHeader = () => (
    <Box justifyContent="space-between" alignItems="flex-start">
      <Box alignItems="center" gap={1}>
        <Text>{displayIcon}</Text>
        
        {title && (
          <Text color={typeColor} bold>
            {title}
          </Text>
        )}
      </Box>
      
      <Box alignItems="center" gap={1}>
        {collapsible && (
          <Text color={colors.textMuted} dimColor>
            [{isCollapsed ? '▶' : '▼'}]
          </Text>
        )}
        
        {dismissible && (
          <Text color={colors.textMuted} dimColor>
            [✕]
          </Text>
        )}
      </Box>
    </Box>
  );

  // Render content
  const renderContent = () => {
    if (isCollapsed) return null;

    const displayContent = content || message;
    if (!displayContent) return null;

    return (
      <Box flexDirection="column" marginTop={title ? 1 : 0}>
        <Box>
          {typeof displayContent === 'string' ? (
            <Text color={colors.text}>
              {displayContent}
            </Text>
          ) : (
            displayContent
          )}
        </Box>
        
        {renderActions()}
      </Box>
    );
  };

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle={borderStyle}
      borderColor={borderColor}
      paddingX={padding}
      paddingY={padding}
    >
      {/* Header */}
      {renderHeader()}
      
      {/* Content */}
      {renderContent()}

      {/* Usage hints */}
      {!isCollapsed && (collapsible || dismissible) && (
        <Box marginTop={1} paddingTop={1} borderTop borderColor={borderColor}>
          <Text color={colors.textMuted} dimColor>
            {collapsible && 'Space: toggle collapse'}
            {collapsible && dismissible && ' • '}
            {dismissible && 'Esc: dismiss'}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export { InfoBox };
export default InfoBox;
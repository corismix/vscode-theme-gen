/**
 * NotificationDisplay component for VS Code Theme Generator
 * Shows notifications at the bottom of the screen with proper styling
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useNotifications } from '../context/NotificationContext';

// ============================================================================
// Notification Item Component
// ============================================================================

interface NotificationItemProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

const NotificationItem: React.FC<NotificationItemProps> = ({ 
  message, 
  type 
}) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'green';
      case 'error': return 'red';
      case 'warning': return 'yellow';
      case 'info': return 'blue';
      default: return 'white';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      default: return '•';
    }
  };

  return (
    <Box paddingX={1} paddingY={0}>
      <Text color={getTypeColor(type)}>
        {getTypeIcon(type)} {message}
      </Text>
    </Box>
  );
};

// ============================================================================
// Main NotificationDisplay Component
// ============================================================================

export const NotificationDisplay: React.FC = () => {
  const { notifications } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="column" paddingBottom={1}>
      {notifications.slice(-3).map((notification) => (
        <NotificationItem
          key={notification.id}
          message={notification.message}
          type={notification.type}
        />
      ))}
    </Box>
  );
};

export default NotificationDisplay;
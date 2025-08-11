/**
 * Professional Notification System component
 * Provides color-coded messages with actions and auto-dismissal
 */

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { NotificationSystemProps, Notification, NotificationType } from './types';

// ============================================================================
// Color Configuration
// ============================================================================

const colors = {
  success: '#10B981',
  warning: '#F59E0B', 
  error: '#EF4444',
  info: '#3B82F6',
  loading: '#8B5CF6',
  background: {
    success: '#064E3B',
    warning: '#92400E',
    error: '#7F1D1D',
    info: '#1E3A8A',
    loading: '#581C87'
  },
  border: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444', 
    info: '#3B82F6',
    loading: '#8B5CF6'
  },
  text: '#F9FAFB',
  textMuted: '#9CA3AF',
  actionPrimary: '#3B82F6',
  actionSecondary: '#6B7280',
  actionDanger: '#EF4444'
};

// ============================================================================
// Notification Icons
// ============================================================================

const getNotificationIcon = (type: NotificationType): string => {
  switch (type) {
    case 'success': return '✅';
    case 'warning': return '⚠️';
    case 'error': return '❌';
    case 'info': return 'ℹ️';
    case 'loading': return '🔄';
    default: return 'ℹ️';
  }
};

// ============================================================================
// Individual Notification Component
// ============================================================================

interface NotificationItemProps {
  notification: Notification;
  onDismiss: (id: string) => void;
  width: number | string;
  animation: boolean;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onDismiss,
  width,
  animation
}) => {
  const { id, type, title, message, actions = [], dismissible = true } = notification;

  // ============================================================================
  // Style Configuration
  // ============================================================================
  
  const notificationColor = colors[type] || colors.info;
  const backgroundColor = colors.background[type] || colors.background.info;
  const borderColor = colors.border[type] || colors.border.info;
  const icon = getNotificationIcon(type);

  // ============================================================================
  // Time Display
  // ============================================================================
  
  const timeString = useMemo(() => {
    if (!notification.timestamp) return '';
    
    const now = new Date();
    const diff = Math.floor((now.getTime() - notification.timestamp.getTime()) / 1000);
    
    if (diff < 60) return 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }, [notification.timestamp]);

  // ============================================================================
  // Action Rendering
  // ============================================================================
  
  const renderActions = () => {
    if (actions.length === 0) return null;

    return (
      <Box marginTop={1} gap={1}>
        {actions.map((action, index) => {
          const actionColor = action.style === 'danger' 
            ? colors.actionDanger 
            : action.style === 'primary' 
              ? colors.actionPrimary 
              : colors.actionSecondary;

          return (
            <Box key={index}>
              <Text color={actionColor}>
                [{action.shortcut ? `${action.shortcut}: ` : ''}{action.label}]
              </Text>
            </Box>
          );
        })}
      </Box>
    );
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <Box 
      width={width}
      borderStyle="single" 
      borderColor={borderColor}
      paddingX={1}
      paddingY={0}
      marginBottom={1}
    >
      <Box flexDirection="column" width="100%">
        {/* Header */}
        <Box justifyContent="space-between" alignItems="flex-start">
          <Box alignItems="center" gap={1}>
            <Text>{icon}</Text>
            <Text color={notificationColor} bold>
              {title}
            </Text>
          </Box>
          
          <Box alignItems="center" gap={1}>
            {timeString && (
              <Text color={colors.textMuted} dimColor>
                {timeString}
              </Text>
            )}
            
            {dismissible && (
              <Text color={colors.textMuted} dimColor>
                [Esc]
              </Text>
            )}
          </Box>
        </Box>

        {/* Message */}
        {message && (
          <Box marginTop={1}>
            <Text color={colors.text}>
              {message}
            </Text>
          </Box>
        )}

        {/* Actions */}
        {renderActions()}

        {/* Progress bar for loading */}
        {type === 'loading' && (
          <Box marginTop={1} width="100%">
            <Text color={colors.loading}>
              {'█'.repeat(Math.floor(Math.random() * 20))}
              {'░'.repeat(20 - Math.floor(Math.random() * 20))}
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ============================================================================
// Main NotificationSystem Component  
// ============================================================================

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  notifications = [],
  onDismiss,
  maxVisible = 5,
  position = 'top',
  width = 60,
  animation = true,
  className,
  testId
}) => {
  // ============================================================================
  // Visible Notifications
  // ============================================================================
  
  const visibleNotifications = useMemo(() => {
    const sorted = [...notifications].sort((a, b) => {
      // Sort by timestamp, most recent first
      const aTime = a.timestamp?.getTime() || 0;
      const bTime = b.timestamp?.getTime() || 0;
      return bTime - aTime;
    });

    return sorted.slice(0, maxVisible);
  }, [notifications, maxVisible]);

  // ============================================================================
  // Empty State
  // ============================================================================
  
  if (visibleNotifications.length === 0) {
    return null;
  }

  // ============================================================================
  // Container Styles
  // ============================================================================
  
  const containerStyles = {
    position: 'absolute' as const,
    zIndex: 1000,
    width: width,
    ...(position === 'top' && { top: 1 }),
    ...(position === 'bottom' && { bottom: 1 }),
    ...(position === 'center' && { 
      top: '50%',
      transform: 'translateY(-50%)'
    })
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <Box
      flexDirection="column"
      width={width}
      className={className}
      data-testid={testId}
    >
      {/* Header */}
      {visibleNotifications.length > 1 && (
        <Box marginBottom={1} paddingX={1}>
          <Text color={colors.textMuted} dimColor>
            {visibleNotifications.length} notification{visibleNotifications.length !== 1 ? 's' : ''}
            {notifications.length > maxVisible && (
              <Text color={colors.textMuted} dimColor>
                {` (${notifications.length - maxVisible} more)`}
              </Text>
            )}
          </Text>
        </Box>
      )}

      {/* Notifications */}
      {visibleNotifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
          width={width}
          animation={animation}
        />
      ))}

      {/* Clear All Action */}
      {visibleNotifications.length > 1 && (
        <Box paddingX={1} marginTop={1}>
          <Text color={colors.textMuted} dimColor>
            Press Ctrl+X to clear all notifications
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default NotificationSystem;
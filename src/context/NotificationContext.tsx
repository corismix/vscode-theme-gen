/**
 * Notification Context Provider for VS Code Theme Generator
 * Manages notification system state and provides global notification functions
 */

import React, { createContext, useContext, useCallback, useState, ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  persistent?: boolean;
}

export interface NotificationContextValue {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  // Convenience methods
  showSuccess: (message: string, options?: { duration?: number; persistent?: boolean }) => string;
  showError: (message: string, options?: { duration?: number; persistent?: boolean }) => string;
  showWarning: (message: string, options?: { duration?: number; persistent?: boolean }) => string;
  showInfo: (message: string, options?: { duration?: number; persistent?: boolean }) => string;
}

// ============================================================================
// Context Definition
// ============================================================================

const NotificationContext = createContext<NotificationContextValue | null>(null);

// ============================================================================
// Hook for consuming context
// ============================================================================

export const useNotifications = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

// ============================================================================
// Provider Props
// ============================================================================

interface NotificationProviderProps {
  children: ReactNode;
}

// ============================================================================
// Utility Functions
// ============================================================================

const generateId = (): string => {
  return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// ============================================================================
// Provider Component
// ============================================================================

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // ============================================================================
  // Core Functions
  // ============================================================================

  const addNotification = useCallback((notification: Omit<Notification, 'id'>): string => {
    const id = generateId();
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? 5000,
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove after duration (unless persistent)
    if (!newNotification.persistent && newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // ============================================================================
  // Convenience Functions
  // ============================================================================

  const showSuccess = useCallback((
    message: string, 
    options?: { duration?: number; persistent?: boolean }
  ): string => {
    return addNotification({
      message,
      type: 'success',
      ...options,
    });
  }, [addNotification]);

  const showError = useCallback((
    message: string, 
    options?: { duration?: number; persistent?: boolean }
  ): string => {
    return addNotification({
      message,
      type: 'error',
      duration: options?.duration ?? 8000, // Errors stay longer by default
      ...options,
    });
  }, [addNotification]);

  const showWarning = useCallback((
    message: string, 
    options?: { duration?: number; persistent?: boolean }
  ): string => {
    return addNotification({
      message,
      type: 'warning',
      duration: options?.duration ?? 6000, // Warnings stay a bit longer
      ...options,
    });
  }, [addNotification]);

  const showInfo = useCallback((
    message: string, 
    options?: { duration?: number; persistent?: boolean }
  ): string => {
    return addNotification({
      message,
      type: 'info',
      ...options,
    });
  }, [addNotification]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const contextValue: NotificationContextValue = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
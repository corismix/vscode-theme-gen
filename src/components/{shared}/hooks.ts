/**
 * Shared hooks for React Ink components
 * Following TweakCC patterns for reusable logic
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useInput } from 'ink';
import { UseKeyboardOptions, UseNotificationOptions, Notification, NotificationType } from './types';

// ============================================================================
// Keyboard Shortcut Hook
// ============================================================================

export const useKeyboard = (
  shortcuts: Record<string, () => void>,
  options: UseKeyboardOptions = {}
) => {
  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = true,
    global = false
  } = options;

  useInput((input, key) => {
    if (!enabled) return;

    // Create key combination string
    let keyCombo = '';
    if (key.ctrl) keyCombo += 'ctrl+';
    if (key.meta) keyCombo += 'meta+';
    if (key.alt) keyCombo += 'alt+';
    if (key.shift) keyCombo += 'shift+';
    
    // Add the main key
    if (key.return) keyCombo += 'enter';
    else if (key.escape) keyCombo += 'escape';
    else if (key.tab) keyCombo += 'tab';
    else if (key.backspace) keyCombo += 'backspace';
    else if (key.delete) keyCombo += 'delete';
    else if (key.upArrow) keyCombo += 'up';
    else if (key.downArrow) keyCombo += 'down';
    else if (key.leftArrow) keyCombo += 'left';
    else if (key.rightArrow) keyCombo += 'right';
    else if (key.pageUp) keyCombo += 'pageup';
    else if (key.pageDown) keyCombo += 'pagedown';
    else if (key.home) keyCombo += 'home';
    else if (key.end) keyCombo += 'end';
    else keyCombo += input.toLowerCase();

    // Execute shortcut if found
    const handler = shortcuts[keyCombo] || shortcuts[input];
    if (handler) {
      if (preventDefault) key.preventDefault?.();
      if (stopPropagation) key.stopPropagation?.();
      handler();
    }
  }, { isActive: enabled });
};

// ============================================================================
// Notification Management Hook
// ============================================================================

export const useNotifications = (options: UseNotificationOptions = {}) => {
  const {
    maxNotifications = 5,
    defaultDuration = 5000,
    position = 'top',
    pauseOnHover = true
  } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const addNotification = useCallback((
    type: NotificationType,
    title: string,
    message?: string,
    duration?: number,
    actions?: Notification['actions']
  ) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const notification: Notification = {
      id,
      type,
      title,
      message,
      duration: duration ?? defaultDuration,
      actions,
      dismissible: true,
      timestamp: new Date()
    };

    setNotifications(prev => {
      const newNotifications = [notification, ...prev].slice(0, maxNotifications);
      return newNotifications;
    });

    // Auto-dismiss if duration is set
    if (notification.duration > 0) {
      const timeout = setTimeout(() => {
        dismissNotification(id);
      }, notification.duration);
      
      timeoutRefs.current.set(id, timeout);
    }

    return id;
  }, [maxNotifications, defaultDuration]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    
    // Clear timeout
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
    }
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    
    // Clear all timeouts
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current.clear();
  }, []);

  // Convenience methods
  const success = useCallback((title: string, message?: string, duration?: number) => 
    addNotification('success', title, message, duration), [addNotification]);
    
  const error = useCallback((title: string, message?: string, duration?: number) => 
    addNotification('error', title, message, duration), [addNotification]);
    
  const warning = useCallback((title: string, message?: string, duration?: number) => 
    addNotification('warning', title, message, duration), [addNotification]);
    
  const info = useCallback((title: string, message?: string, duration?: number) => 
    addNotification('info', title, message, duration), [addNotification]);
    
  const loading = useCallback((title: string, message?: string) => 
    addNotification('loading', title, message, 0), [addNotification]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);

  return {
    notifications,
    addNotification,
    dismissNotification,
    clearAllNotifications,
    success,
    error,
    warning,
    info,
    loading
  };
};

// ============================================================================
// List Navigation Hook
// ============================================================================

export const useListNavigation = <T>(
  items: T[],
  options: {
    loop?: boolean;
    initialIndex?: number;
    onSelect?: (item: T, index: number) => void;
    onCancel?: () => void;
    enabled?: boolean;
  } = {}
) => {
  const {
    loop = true,
    initialIndex = 0,
    onSelect,
    onCancel,
    enabled = true
  } = options;

  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [isActive, setIsActive] = useState(enabled);

  const selectedItem = useMemo(() => 
    items[selectedIndex] || null, [items, selectedIndex]);

  const moveUp = useCallback(() => {
    setSelectedIndex(prev => {
      if (prev <= 0) {
        return loop ? items.length - 1 : 0;
      }
      return prev - 1;
    });
  }, [items.length, loop]);

  const moveDown = useCallback(() => {
    setSelectedIndex(prev => {
      if (prev >= items.length - 1) {
        return loop ? 0 : items.length - 1;
      }
      return prev + 1;
    });
  }, [items.length, loop]);

  const selectCurrent = useCallback(() => {
    if (selectedItem && onSelect) {
      onSelect(selectedItem, selectedIndex);
    }
  }, [selectedItem, selectedIndex, onSelect]);

  const cancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  useInput((input, key) => {
    if (!isActive || !enabled) return;

    if (key.upArrow || input === 'k') {
      moveUp();
    } else if (key.downArrow || input === 'j') {
      moveDown();
    } else if (key.return || input === ' ') {
      selectCurrent();
    } else if (key.escape || input === 'q') {
      cancel();
    }
  }, { isActive: isActive && enabled });

  return {
    selectedIndex,
    selectedItem,
    setSelectedIndex,
    moveUp,
    moveDown,
    selectCurrent,
    cancel,
    isActive,
    setIsActive
  };
};

// ============================================================================
// Search Hook
// ============================================================================

export const useSearch = <T>(
  items: T[],
  searchFn: (item: T, query: string) => boolean,
  options: {
    initialQuery?: string;
    debounceMs?: number;
    caseSensitive?: boolean;
  } = {}
) => {
  const {
    initialQuery = '',
    debounceMs = 300,
    caseSensitive = false
  } = options;

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => {
      clearTimeout(handler);
    };
  }, [query, debounceMs]);

  const filteredItems = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return items;
    }

    const searchQuery = caseSensitive ? debouncedQuery : debouncedQuery.toLowerCase();
    return items.filter(item => searchFn(item, searchQuery));
  }, [items, debouncedQuery, searchFn, caseSensitive]);

  const clearSearch = useCallback(() => {
    setQuery('');
  }, []);

  return {
    query,
    setQuery,
    debouncedQuery,
    filteredItems,
    clearSearch,
    hasQuery: debouncedQuery.trim().length > 0
  };
};

// ============================================================================
// Focus Management Hook
// ============================================================================

export const useFocusManager = (initialFocused: string = '') => {
  const [focusedId, setFocusedId] = useState(initialFocused);
  const [focusHistory, setFocusHistory] = useState<string[]>([]);

  const focus = useCallback((id: string) => {
    setFocusHistory(prev => {
      const newHistory = prev.filter(item => item !== id);
      return [focusedId, ...newHistory].filter(Boolean).slice(0, 10);
    });
    setFocusedId(id);
  }, [focusedId]);

  const blur = useCallback(() => {
    setFocusedId('');
  }, []);

  const focusPrevious = useCallback(() => {
    if (focusHistory.length > 0) {
      const previousId = focusHistory[0];
      setFocusedId(previousId);
      setFocusHistory(prev => prev.slice(1));
    }
  }, [focusHistory]);

  const isFocused = useCallback((id: string) => focusedId === id, [focusedId]);

  return {
    focusedId,
    focus,
    blur,
    focusPrevious,
    isFocused,
    focusHistory
  };
};
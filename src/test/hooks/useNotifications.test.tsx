import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { NotificationProvider, useNotifications } from '../../hooks/useNotifications.js';
import type { Notification } from '../../types/index.js';

describe('useNotifications', () => {
  let TestComponent: React.FC;
  let hookValue: any;

  beforeEach(() => {
    hookValue = null;
    vi.useFakeTimers();
    
    TestComponent = () => {
      hookValue = useNotifications();
      return React.createElement('div', { 'data-testid': 'test' }, 'test');
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderWithProvider = () => {
    return render(
      React.createElement(NotificationProvider, {},
        React.createElement(TestComponent)
      )
    );
  };

  it('should provide initial empty notifications', () => {
    renderWithProvider();
    
    expect(hookValue).toBeDefined();
    expect(hookValue.notifications).toEqual([]);
    expect(hookValue.addNotification).toBeInstanceOf(Function);
    expect(hookValue.removeNotification).toBeInstanceOf(Function);
    expect(hookValue.clearNotifications).toBeInstanceOf(Function);
  });

  it('should add notifications', () => {
    renderWithProvider();
    
    const notification: Omit<Notification, 'id' | 'timestamp'> = {
      type: 'success',
      message: 'Test success message',
    };
    
    act(() => {
      hookValue.addNotification(notification);
    });

    expect(hookValue.notifications).toHaveLength(1);
    expect(hookValue.notifications[0]).toMatchObject({
      type: 'success',
      message: 'Test success message',
    });
    expect(hookValue.notifications[0]).toHaveProperty('id');
    expect(hookValue.notifications[0]).toHaveProperty('timestamp');
  });

  it('should add multiple notifications', () => {
    renderWithProvider();
    
    act(() => {
      hookValue.addNotification({ type: 'success', message: 'Success 1' });
      hookValue.addNotification({ type: 'error', message: 'Error 1' });
      hookValue.addNotification({ type: 'warning', message: 'Warning 1' });
    });

    expect(hookValue.notifications).toHaveLength(3);
    expect(hookValue.notifications[0].message).toBe('Success 1');
    expect(hookValue.notifications[1].message).toBe('Error 1');
    expect(hookValue.notifications[2].message).toBe('Warning 1');
  });

  it('should auto-remove notifications after timeout', () => {
    renderWithProvider();
    
    act(() => {
      hookValue.addNotification({ 
        type: 'info', 
        message: 'Auto remove test',
        autoRemove: true,
        timeout: 1000 
      });
    });

    expect(hookValue.notifications).toHaveLength(1);

    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(hookValue.notifications).toHaveLength(0);
  });

  it('should remove specific notifications', () => {
    renderWithProvider();
    
    let notificationId: string;
    
    act(() => {
      hookValue.addNotification({ type: 'success', message: 'Keep this' });
      const notification = hookValue.addNotification({ type: 'error', message: 'Remove this' });
      notificationId = notification?.id;
      hookValue.addNotification({ type: 'warning', message: 'Keep this too' });
    });

    expect(hookValue.notifications).toHaveLength(3);

    act(() => {
      hookValue.removeNotification(notificationId);
    });

    expect(hookValue.notifications).toHaveLength(2);
    expect(hookValue.notifications.find((n: Notification) => n.id === notificationId)).toBeUndefined();
  });

  it('should clear all notifications', () => {
    renderWithProvider();
    
    act(() => {
      hookValue.addNotification({ type: 'success', message: 'Test 1' });
      hookValue.addNotification({ type: 'error', message: 'Test 2' });
      hookValue.addNotification({ type: 'warning', message: 'Test 3' });
    });

    expect(hookValue.notifications).toHaveLength(3);

    act(() => {
      hookValue.clearNotifications();
    });

    expect(hookValue.notifications).toHaveLength(0);
  });

  it('should handle notification with custom timeout', () => {
    renderWithProvider();
    
    act(() => {
      hookValue.addNotification({ 
        type: 'info', 
        message: 'Custom timeout',
        autoRemove: true,
        timeout: 2000 
      });
    });

    expect(hookValue.notifications).toHaveLength(1);

    // Should not remove before timeout
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(hookValue.notifications).toHaveLength(1);

    // Should remove after timeout
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(hookValue.notifications).toHaveLength(0);
  });

  it('should handle notification without auto-remove', () => {
    renderWithProvider();
    
    act(() => {
      hookValue.addNotification({ 
        type: 'error', 
        message: 'Persistent notification',
        autoRemove: false 
      });
    });

    expect(hookValue.notifications).toHaveLength(1);

    // Should not remove after default timeout
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(hookValue.notifications).toHaveLength(1);
  });

  it('should generate unique IDs for notifications', () => {
    renderWithProvider();
    
    let ids: string[] = [];
    
    act(() => {
      ids.push(hookValue.addNotification({ type: 'info', message: 'Test 1' })?.id);
      ids.push(hookValue.addNotification({ type: 'info', message: 'Test 2' })?.id);
      ids.push(hookValue.addNotification({ type: 'info', message: 'Test 3' })?.id);
    });

    // All IDs should be unique
    const uniqueIds = [...new Set(ids)];
    expect(uniqueIds).toHaveLength(3);
  });

  it('should handle different notification types', () => {
    renderWithProvider();
    
    act(() => {
      hookValue.addNotification({ type: 'success', message: 'Success message' });
      hookValue.addNotification({ type: 'error', message: 'Error message' });
      hookValue.addNotification({ type: 'warning', message: 'Warning message' });
      hookValue.addNotification({ type: 'info', message: 'Info message' });
    });

    expect(hookValue.notifications).toHaveLength(4);
    expect(hookValue.notifications.map((n: Notification) => n.type)).toEqual([
      'success', 'error', 'warning', 'info'
    ]);
  });

  it('should throw error when used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(React.createElement(TestComponent));
    }).toThrow('useNotifications must be used within a NotificationProvider');

    consoleSpy.mockRestore();
  });
});
import { useState, useCallback } from 'react';

/**
 * Terminal text input hook with proper cursor navigation
 * Handles all standard terminal input behaviors
 */
export const useTextInput = (initialValue: string = '') => {
  const [value, setValue] = useState(initialValue);
  const [cursorOffset, setCursorOffset] = useState(0);

  const handleInput = useCallback((input: string, key: any) => {
    if (key.return) {
      return { shouldSubmit: true, value: value.trim() };
    }

    // Handle navigation and editing operations
    if (key.leftArrow) {
      setCursorOffset(Math.min(cursorOffset + 1, value.length));
      return { shouldSubmit: false, value };
    }

    if (key.rightArrow) {
      setCursorOffset(Math.max(cursorOffset - 1, 0));
      return { shouldSubmit: false, value };
    }

    // Home key - move to beginning
    if (key.ctrl && input === 'a') {
      setCursorOffset(value.length);
      return { shouldSubmit: false, value };
    }

    // End key - move to end
    if (key.ctrl && input === 'e') {
      setCursorOffset(0);
      return { shouldSubmit: false, value };
    }

    // Handle text modification operations
    const cursorPos = value.length - cursorOffset;

    // Handle backward delete (Backspace key, or Delete key on macOS)
    if (key.backspace && cursorPos > 0) {
      const newValue = value.slice(0, cursorPos - 1) + value.slice(cursorPos);
      setValue(newValue);
      // After deleting character before cursor, cursor effectively moves left
      // but since string is shorter, we maintain the same offset
      setCursorOffset(Math.max(0, cursorOffset));
      return { shouldSubmit: false, value: newValue };
    }

    // Handle forward delete (Fn+Delete on macOS, Delete on other systems)
    if (key.delete && cursorPos < value.length) {
      const newValue = value.slice(0, cursorPos) + value.slice(cursorPos + 1);
      setValue(newValue);
      // Cursor stays at same position, but offset may need adjustment for shorter string
      setCursorOffset(Math.min(cursorOffset, newValue.length));
      return { shouldSubmit: false, value: newValue };
    }

    // On macOS, the physical Delete key might be mapped to key.delete but should behave as backspace
    // This handles the case where macOS Delete key is detected as key.delete instead of key.backspace
    if (key.delete && cursorPos >= value.length && cursorPos > 0) {
      // Treat as backspace when Delete is pressed at end of line (common macOS behavior)
      const newValue = value.slice(0, cursorPos - 1) + value.slice(cursorPos);
      setValue(newValue);
      setCursorOffset(Math.max(0, cursorOffset));
      return { shouldSubmit: false, value: newValue };
    }

    // Regular character input
    if (input && !key.ctrl && !key.meta && !key.alt && input.length === 1 && input.charCodeAt(0) >= 32) {
      const newValue = value.slice(0, cursorPos) + input + value.slice(cursorPos);
      setValue(newValue);
      // Cursor moves right after character insertion, so offset stays the same
      return { shouldSubmit: false, value: newValue };
    }

    return { shouldSubmit: false, value };
  }, [value, cursorOffset]);

  const clear = useCallback(() => {
    setValue('');
    setCursorOffset(0);
  }, []);

  const getCurrentCursorPos = useCallback(() => {
    return value.length - cursorOffset;
  }, [value.length, cursorOffset]);

  return {
    value,
    setValue: (newValue: string) => {
      setValue(newValue);
      setCursorOffset(0);
    },
    handleInput,
    clear,
    cursorOffset,
    cursorPos: getCurrentCursorPos(),
  };
};

import { useState, useCallback, useRef } from 'react';
import { Text } from 'ink';

interface KeyEvent {
  return?: boolean;
  escape?: boolean;
  leftArrow?: boolean;
  rightArrow?: boolean;
  backspace?: boolean;
  delete?: boolean;
  ctrl?: boolean;
  meta?: boolean;
  alt?: boolean;
  upArrow?: boolean;
  downArrow?: boolean;
  tab?: boolean;
  shift?: boolean;
}

/**
 * Custom hook for text input with cursor navigation
 * Handles keyboard input, cursor positioning, and text rendering
 */
export const useTextInput = (initialValue: string = '') => {
  const [state, setState] = useState({
    value: initialValue,
    cursorPos: initialValue.length,
  });

  // Use ref to get the most current state during input handling
  const stateRef = useRef(state);
  stateRef.current = state;

  const handleInput = useCallback((input: string, key: KeyEvent) => {
    // Always work with the current state from the ref
    const currentState = stateRef.current;
    const { value, cursorPos } = currentState;

    if (key.return) {
      return { shouldSubmit: true, value: value.trim(), cursorPos };
    }

    let newValue = value;
    let newCursorPos = cursorPos;

    // Ensure cursor position is within bounds
    const safeCursorPos = Math.max(0, Math.min(cursorPos, value.length));

    if (key.leftArrow) {
      // Move cursor left one character
      newCursorPos = Math.max(0, safeCursorPos - 1);
    } else if (key.rightArrow) {
      // Move cursor right one character
      newCursorPos = Math.min(value.length, safeCursorPos + 1);
    } else if (key.backspace && safeCursorPos > 0) {
      // Delete character before cursor (Backspace behavior)
      newValue = value.slice(0, safeCursorPos - 1) + value.slice(safeCursorPos);
      newCursorPos = safeCursorPos - 1;
    } else if (key.delete && safeCursorPos < value.length) {
      // Delete character at cursor position (Delete key behavior)
      newValue = value.slice(0, safeCursorPos) + value.slice(safeCursorPos + 1);
      newCursorPos = safeCursorPos; // Cursor stays in same position
    } else if (
      input &&
      !key.ctrl &&
      !key.meta &&
      !key.alt &&
      !key.upArrow &&
      !key.downArrow &&
      input.length > 0
    ) {
      // Insert regular character at cursor position
      newValue = value.slice(0, safeCursorPos) + input + value.slice(safeCursorPos);
      newCursorPos = safeCursorPos + input.length;
    } else {
      // No changes - return current state without updating
      return { shouldSubmit: false, value, cursorPos: safeCursorPos };
    }

    // Update state atomically with the new values
    const newState = { value: newValue, cursorPos: newCursorPos };
    setState(newState);

    return { shouldSubmit: false, value: newValue, cursorPos: newCursorPos };
  }, []);

  const renderWithCursor = useCallback(() => {
    const { value, cursorPos } = stateRef.current;
    const safeCursorPos = Math.max(0, Math.min(cursorPos, value.length));

    if (value.length === 0) {
      // Empty string - show cursor at beginning
      return (
        <Text>
          <Text color='black' backgroundColor='cyan'>
            {' '}
          </Text>
        </Text>
      );
    }

    if (safeCursorPos >= value.length) {
      // Cursor at end - show space cursor after text
      return (
        <Text>
          {value}
          <Text color='black' backgroundColor='cyan'>
            {' '}
          </Text>
        </Text>
      );
    }

    // Cursor in middle - highlight the character at cursor position
    const before = value.slice(0, safeCursorPos);
    const cursorChar = value.slice(safeCursorPos, safeCursorPos + 1);
    const after = value.slice(safeCursorPos + 1);

    return (
      <Text>
        {before}
        <Text color='black' backgroundColor='cyan'>
          {cursorChar}
        </Text>
        {after}
      </Text>
    );
  }, []);

  const setValue = useCallback((newValue: string) => {
    const newCursorPos = Math.min(stateRef.current.cursorPos, newValue.length);
    const newState = { value: newValue, cursorPos: newCursorPos };
    setState(newState);
  }, []);

  const setCursorPos = useCallback((newPos: number) => {
    const { value } = stateRef.current;
    const clampedPos = Math.max(0, Math.min(newPos, value.length));
    setState(prevState => ({ ...prevState, cursorPos: clampedPos }));
  }, []);

  return {
    value: state.value,
    cursorPos: state.cursorPos,
    setValue,
    setCursorPos,
    handleInput,
    renderWithCursor,
  };
};

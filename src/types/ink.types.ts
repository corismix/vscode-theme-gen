/**
 * TypeScript interfaces for Ink key event handling
 * Replaces the unsafe 'any' typing with proper type definitions
 */

export interface InkKeyEvent {
  // Basic navigation keys
  return?: boolean;
  escape?: boolean;
  tab?: boolean;
  backspace?: boolean;
  delete?: boolean;

  // Modifier keys
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;

  // Arrow keys
  leftArrow?: boolean;
  rightArrow?: boolean;
  upArrow?: boolean;
  downArrow?: boolean;

  // Extended navigation
  pageDown?: boolean;
  pageUp?: boolean;
  home?: boolean;
  end?: boolean;

  // Special function keys
  f1?: boolean;
  f2?: boolean;
  f3?: boolean;
  f4?: boolean;
  f5?: boolean;
  f12?: boolean;
}

export interface InputHandlerResult {
  shouldSubmit: boolean;
  value: string;
}

export interface TextInputHook {
  value: string;
  setValue: (newValue: string) => void;
  handleInput: (input: string, key: InkKeyEvent) => InputHandlerResult;
  clear: () => void;
  cursorOffset: number;
  cursorPos: number;
}
/**
 * Unified keyboard navigation system for VS Code Theme Generator
 * 
 * Comprehensive keyboard handling system providing consistent shortcuts and navigation
 * patterns across all components. Features global and local keyboard management,
 * context-aware shortcut resolution, and platform-specific adaptations.
 * 
 * Features:
 * - Global shortcut configuration with categorized key bindings
 * - Context-aware shortcut resolution for different UI contexts
 * - Key normalization and matching with special key support
 * - Performance-optimized keyboard handlers with useCallback
 * - Global keyboard manager for application-wide shortcuts
 * - Platform-specific shortcut adaptation (Ctrl vs Cmd)
 * - Comprehensive error handling and recovery
 * 
 * Contexts Supported:
 * - global: Application-wide navigation and actions
 * - form: Form field navigation and submission
 * - dialog: Modal dialog actions and confirmations
 * - menu: Menu item navigation and selection
 * - preview: Theme preview controls and toggles
 * - help: Help panel navigation and search
 * 
 * @fileoverview Unified keyboard navigation system with context-aware shortcuts
 * @since 1.0.0
 */

import { useEffect, useCallback, useRef } from 'react';

// ============================================================================
// Global Keyboard Shortcuts Configuration
// ============================================================================

export const GLOBAL_SHORTCUTS = {
  navigation: {
    up: ['k', 'ArrowUp'],
    down: ['j', 'ArrowDown'],
    left: ['h', 'ArrowLeft'],
    right: ['l', 'ArrowRight'],
    back: ['h', 'Escape'],
    forward: ['l', 'Enter'],
    home: ['g', 'Home'],
    end: ['G', 'End'],
  },
  actions: {
    quit: ['q', 'Ctrl+C'],
    help: ['?', 'F1'],
    confirm: ['Enter', 'y', 'Space'],
    cancel: ['Escape', 'n'],
    retry: ['r'],
    delete: ['d', 'Delete'],
    edit: ['e'],
    copy: ['c', 'Ctrl+C'],
    paste: ['v', 'Ctrl+V'],
    save: ['s', 'Ctrl+S'],
    refresh: ['F5', 'Ctrl+R'],
  },
  panels: {
    toggleHelp: ['?', 'F1'],
    toggleDetails: ['i'],
    togglePreview: ['p'],
    fullscreen: ['f', 'F11'],
    minimize: ['m'],
  },
  workflow: {
    next: ['Tab', 'n', 'ArrowRight'],
    previous: ['Shift+Tab', 'p', 'ArrowLeft'],
    first: ['1', 'Home'],
    last: ['0', 'End'],
    restart: ['Ctrl+R'],
  }
} as const;

// ============================================================================
// Types
// ============================================================================

export type KeyBinding = {
  key: string;
  description: string;
  action: () => void;
  enabled?: boolean;
  category?: keyof typeof GLOBAL_SHORTCUTS;
  global?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
};

export type KeyboardContext = 
  | 'global'
  | 'navigation' 
  | 'form'
  | 'dialog'
  | 'menu'
  | 'preview'
  | 'help';

export type KeyboardShortcutCategory = {
  name: string;
  shortcuts: KeyBinding[];
  enabled?: boolean;
};

export interface UseKeyboardHandlerOptions {
  enabled?: boolean;
  context?: KeyboardContext;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  global?: boolean;
}

// ============================================================================
// Key Normalization
// ============================================================================

/**
 * Normalize keyboard input to standard format
 * 
 * Converts raw keyboard input (string or Buffer) to standardized key names
 * including special keys, control sequences, and arrow keys. Handles terminal
 * escape sequences and provides consistent key naming across platforms.
 * 
 * @param input - Raw keyboard input from terminal or event
 * @returns Normalized key name (e.g., 'Ctrl+C', 'ArrowUp', 'Enter')
 * 
 * @example
 * ```typescript
 * normalizeKey('\u0003'); // 'Ctrl+C'
 * normalizeKey('\u001b[A'); // 'ArrowUp'
 * normalizeKey('a'); // 'a'
 * ```
 * 
 * @since 1.0.0
 */
export const normalizeKey = (input: string | Buffer): string => {
  const key = input.toString();
  
  // Handle special keys
  const specialKeys: Record<string, string> = {
    '\u0003': 'Ctrl+C',    // Ctrl+C
    '\u001b': 'Escape',    // Escape
    '\u000d': 'Enter',     // Enter/Return
    '\u0009': 'Tab',       // Tab
    '\u007f': 'Backspace', // Backspace
    '\u001b[A': 'ArrowUp',
    '\u001b[B': 'ArrowDown',
    '\u001b[C': 'ArrowRight',
    '\u001b[D': 'ArrowLeft',
    '\u001b[H': 'Home',
    '\u001b[F': 'End',
    '\u001b[3~': 'Delete',
    '\u001b[5~': 'PageUp',
    '\u001b[6~': 'PageDown',
    ' ': 'Space',
  };

  return specialKeys[key] || key;
};

/**
 * Check if a key matches any of the specified key bindings
 * 
 * Performs case-insensitive matching against an array of key binding strings.
 * Normalizes input and compares against all possible bindings for flexibility.
 * 
 * @param input - Normalized key input to check
 * @param bindings - Array of key binding strings to match against
 * @returns True if input matches any binding, false otherwise
 * 
 * @example
 * ```typescript
 * matchesKey('Enter', ['Enter', 'Space']); // true
 * matchesKey('a', ['A', 'Enter']); // true (case insensitive)
 * matchesKey('x', ['Enter', 'Space']); // false
 * ```
 * 
 * @since 1.0.0
 */
export const matchesKey = (input: string, bindings: readonly string[]): boolean => {
  const normalizedInput = normalizeKey(input);
  return bindings.some(binding => 
    binding === normalizedInput || 
    binding.toLowerCase() === normalizedInput.toLowerCase()
  );
};

// ============================================================================
// Context-Aware Shortcut Resolver
// ============================================================================

/**
 * Get available shortcuts for a specific context
 * 
 * Returns context-specific keyboard shortcuts organized by category.
 * Provides appropriate shortcuts for different UI contexts with descriptive
 * labels and categorization for help displays and documentation.
 * 
 * @param context - UI context to get shortcuts for
 * @returns Array of shortcut categories with bindings
 * 
 * @example
 * ```typescript
 * const shortcuts = getContextShortcuts('form');
 * shortcuts.forEach(category => {
 *   console.log(category.name);
 *   category.shortcuts.forEach(shortcut => {
 *     console.log(`  ${shortcut.key}: ${shortcut.description}`);
 *   });
 * });
 * ```
 * 
 * @since 1.0.0
 */
export const getContextShortcuts = (context: KeyboardContext): KeyboardShortcutCategory[] => {
  const categories: KeyboardShortcutCategory[] = [];

  switch (context) {
    case 'global':
      categories.push(
        {
          name: 'Navigation',
          shortcuts: [
            { key: '↑/k', description: 'Move up', action: () => {}, category: 'navigation' },
            { key: '↓/j', description: 'Move down', action: () => {}, category: 'navigation' },
            { key: '←/h', description: 'Go back', action: () => {}, category: 'navigation' },
            { key: '→/l', description: 'Go forward', action: () => {}, category: 'navigation' },
          ]
        },
        {
          name: 'Actions',
          shortcuts: [
            { key: '?', description: 'Show help', action: () => {}, category: 'actions' },
            { key: 'q', description: 'Quit', action: () => {}, category: 'actions' },
            { key: 'r', description: 'Retry/Refresh', action: () => {}, category: 'actions' },
          ]
        }
      );
      break;

    case 'form':
      categories.push(
        {
          name: 'Form Navigation',
          shortcuts: [
            { key: 'Tab', description: 'Next field', action: () => {}, category: 'workflow' },
            { key: 'Shift+Tab', description: 'Previous field', action: () => {}, category: 'workflow' },
            { key: 'Enter', description: 'Submit/Confirm', action: () => {}, category: 'actions' },
            { key: 'Escape', description: 'Cancel', action: () => {}, category: 'actions' },
          ]
        }
      );
      break;

    case 'dialog':
      categories.push(
        {
          name: 'Dialog Actions',
          shortcuts: [
            { key: 'y/Enter', description: 'Confirm', action: () => {}, category: 'actions' },
            { key: 'n/Escape', description: 'Cancel', action: () => {}, category: 'actions' },
            { key: 'Tab', description: 'Switch focus', action: () => {}, category: 'navigation' },
          ]
        }
      );
      break;

    case 'menu':
      categories.push(
        {
          name: 'Menu Navigation',
          shortcuts: [
            { key: '↑/k', description: 'Previous item', action: () => {}, category: 'navigation' },
            { key: '↓/j', description: 'Next item', action: () => {}, category: 'navigation' },
            { key: 'Enter/Space', description: 'Select item', action: () => {}, category: 'actions' },
            { key: 'Escape', description: 'Close menu', action: () => {}, category: 'actions' },
          ]
        }
      );
      break;

    case 'preview':
      categories.push(
        {
          name: 'Preview Controls',
          shortcuts: [
            { key: 'p', description: 'Toggle preview', action: () => {}, category: 'panels' },
            { key: 'f', description: 'Fullscreen', action: () => {}, category: 'panels' },
            { key: 'i', description: 'Toggle details', action: () => {}, category: 'panels' },
            { key: 'r', description: 'Refresh preview', action: () => {}, category: 'actions' },
          ]
        }
      );
      break;

    case 'help':
      categories.push(
        {
          name: 'Help Navigation',
          shortcuts: [
            { key: '↑/k', description: 'Scroll up', action: () => {}, category: 'navigation' },
            { key: '↓/j', description: 'Scroll down', action: () => {}, category: 'navigation' },
            { key: '?/Escape', description: 'Close help', action: () => {}, category: 'actions' },
            { key: '/', description: 'Search', action: () => {}, category: 'actions' },
          ]
        }
      );
      break;
  }

  return categories;
};

// ============================================================================
// Keyboard Handler Hook
// ============================================================================

/**
 * Unified keyboard handler hook with stdin integration
 * 
 * Provides keyboard event handling with stdin integration for terminal applications.
 * Supports key normalization, binding matching, and configurable event handling
 * with error recovery and cleanup.
 * 
 * @param keyBindings - Array of key binding configurations
 * @param options - Handler configuration options
 * @returns Object with key handling functions and context shortcuts
 * 
 * @example
 * ```typescript
 * const { handleKeyPress, shortcuts } = useKeyboardHandler([
 *   { key: 'q', description: 'Quit', action: () => process.exit(0) },
 *   { key: '?', description: 'Help', action: () => showHelp() }
 * ], { context: 'global' });
 * ```
 * 
 * @since 1.0.0
 */
export const useKeyboardHandler = (
  keyBindings: KeyBinding[],
  options: UseKeyboardHandlerOptions = {}
) => {
  const {
    enabled = true,
    context = 'global',
    preventDefault = true,
    stopPropagation = true,
    global = false
  } = options;

  const keyBindingsRef = useRef(keyBindings);
  keyBindingsRef.current = keyBindings;

  const handleKeyPress = useCallback((input: string | Buffer) => {
    if (!enabled) return false;

    const key = normalizeKey(input);
    const bindings = keyBindingsRef.current;

    for (const binding of bindings) {
      if (binding.enabled !== false && matchesKey(key, [binding.key])) {
        try {
          binding.action();
          return true;
        } catch (error) {
          console.error(`Error executing keyboard shortcut for key "${key}":`, error);
        }
      }
    }

    return false;
  }, [enabled]);

  useEffect(() => {
    if (!enabled || global) return;

    const stdin = process.stdin;
    if (!stdin.setRawMode) return;

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const handleStdinData = (data: Buffer) => {
      const handled = handleKeyPress(data);
      
      if (handled) {
        if (preventDefault) {
          // Key was handled, prevent default
        }
        if (stopPropagation) {
          // Key was handled, stop propagation
        }
      }
    };

    stdin.on('data', handleStdinData);

    return () => {
      stdin.removeListener('data', handleStdinData);
      if (stdin.setRawMode) {
        stdin.setRawMode(false);
      }
    };
  }, [enabled, global, handleKeyPress, preventDefault, stopPropagation]);

  return {
    handleKeyPress,
    context,
    shortcuts: getContextShortcuts(context),
  };
};

// ============================================================================
// Global Keyboard Manager
// ============================================================================

class GlobalKeyboardManager {
  private handlers = new Set<(key: string | Buffer) => boolean>();
  private initialized = false;

  init() {
    if (this.initialized) return;

    const stdin = process.stdin;
    if (!stdin.setRawMode) return;

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    stdin.on('data', (data: Buffer) => {
      for (const handler of this.handlers) {
        if (handler(data)) {
          break; // Stop at first handler that returns true
        }
      }
    });

    // Cleanup on exit
    const cleanup = () => {
      if (stdin.setRawMode) {
        stdin.setRawMode(false);
      }
    };

    process.on('exit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    this.initialized = true;
  }

  addHandler(handler: (key: string | Buffer) => boolean) {
    this.handlers.add(handler);
    this.init();
    
    return () => {
      this.handlers.delete(handler);
    };
  }

  removeAllHandlers() {
    this.handlers.clear();
  }
}

export const globalKeyboardManager = new GlobalKeyboardManager();

// ============================================================================
// Global Keyboard Hook
// ============================================================================

/**
 * Hook for global keyboard shortcuts that work across the entire application
 * 
 * Provides application-wide keyboard shortcuts using the global keyboard manager.
 * Shortcuts registered with this hook work regardless of component focus and
 * are processed before local shortcuts.
 * 
 * @param keyBindings - Array of global key binding configurations
 * @param options - Global keyboard handler options
 * 
 * @example
 * ```typescript
 * useGlobalKeyboard([
 *   { key: 'Ctrl+C', description: 'Quit', action: () => process.exit(0), global: true },
 *   { key: '?', description: 'Global help', action: () => showGlobalHelp(), global: true }
 * ]);
 * ```
 * 
 * @since 1.0.0
 */
export const useGlobalKeyboard = (
  keyBindings: KeyBinding[],
  options: Omit<UseKeyboardHandlerOptions, 'global'> = {}
) => {
  const { enabled = true, preventDefault = true } = options;
  const keyBindingsRef = useRef(keyBindings);
  keyBindingsRef.current = keyBindings;

  useEffect(() => {
    if (!enabled) return;

    const handleKey = (input: string | Buffer): boolean => {
      const key = normalizeKey(input);
      const bindings = keyBindingsRef.current;

      for (const binding of bindings) {
        if (binding.enabled !== false && binding.global !== false) {
          if (matchesKey(key, [binding.key])) {
            try {
              binding.action();
              return preventDefault;
            } catch (error) {
              console.error(`Error executing global keyboard shortcut for key "${key}":`, error);
            }
          }
        }
      }

      return false;
    };

    const removeHandler = globalKeyboardManager.addHandler(handleKey);
    return removeHandler;
  }, [enabled, preventDefault]);
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create keyboard shortcut description string
 */
export const formatShortcut = (keys: readonly string[]): string => {
  return keys.join(' / ');
};

/**
 * Check if current platform supports the shortcut
 */
export const isShortcutSupported = (shortcut: string): boolean => {
  // Some shortcuts might not work on all platforms
  const unsupportedPatterns = [
    /^Cmd\+/i, // macOS specific
    /^Alt\+/i, // May not work in all terminals
  ];

  return !unsupportedPatterns.some(pattern => pattern.test(shortcut));
};

/**
 * Get platform-specific shortcut
 */
export const getPlatformShortcut = (shortcut: string): string => {
  const platform = process.platform;
  
  if (platform === 'darwin') {
    return shortcut.replace(/Ctrl\+/g, 'Cmd+');
  }
  
  return shortcut;
};
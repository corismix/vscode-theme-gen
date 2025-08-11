/**
 * Application constants for UI strings, magic numbers, and configuration values
 */

// UI Text Constants
export const UI_TEXT = {
  // App title and descriptions
  APP_TITLE: 'VS Code Theme Generator',
  APP_SUBTITLE: 'Create VS Code themes from Ghostty terminal color files',
  
  // Step labels
  STEP_LABELS: {
    FILE_SELECTION: 'Select Theme File',
    THEME_CONFIG: 'Configure Theme',
    EXTENSION_OPTIONS: 'Extension Options', 
    GENERATION: 'Generating Extension',
    SUCCESS: 'Success!'
  },
  
  // Step descriptions
  STEP_DESCRIPTIONS: {
    FILE_SELECTION: 'Choose your Ghostty theme file',
    THEME_CONFIG: 'Configure theme details',
    EXTENSION_OPTIONS: 'Set extension options',
    GENERATION: 'Creating your VS Code extension'
  },
  
  // Field labels
  FIELD_LABELS: {
    THEME_NAME: 'Theme name',
    DESCRIPTION: 'Description',
    VERSION: 'Version',
    PUBLISHER: 'Publisher',
    INPUT_FILE: 'File path'
  },
  
  // Validation messages
  VALIDATION_MESSAGES: {
    THEME_NAME_REQUIRED: 'Theme name is required',
    THEME_NAME_TOO_SHORT: 'Theme name must be at least 2 characters',
    THEME_NAME_TOO_LONG: 'Theme name must be less than 100 characters',
    VERSION_INVALID: 'Version must follow semantic versioning (e.g., 1.0.0)',
    PUBLISHER_INVALID: 'Publisher name must be 3-256 characters, alphanumeric with hyphens only',
    DESCRIPTION_TOO_LONG: 'Description must be less than 500 characters',
    FILE_REQUIRED: 'Please enter a file path',
    FILE_NOT_FOUND: 'File does not exist',
    FILE_TOO_LARGE: 'File too large',
    FILE_INVALID_EXTENSION: 'File must have .txt extension',
    FILE_NO_COLORS: 'No color definitions found in file',
    FILE_INVALID_COLORS: 'File contains too many invalid color values'
  },
  
  // Action labels
  ACTIONS: {
    CONTINUE: 'Continue',
    GO_BACK: 'Go back',
    EXIT: 'Exit',
    OPEN_VSCODE: 'Open in VS Code',
    OPEN_FOLDER: 'Open folder',
    CREATE_ANOTHER: 'Create another theme',
    CREATE_NEW_THEME: 'Create New Theme',
    RECENT_FILES: 'Recent Files',
    TOGGLE_HELP: 'Toggle help',
    NEW_LINE: 'New line in description'
  },

  // UI Messages
  MESSAGES: {
    WHAT_TO_DO: 'What would you like to do?',
    LOADING_OPTIONS: 'Loading options...',
    HELP_AND_EXIT: 'Press h for help, Ctrl+C to exit',
    LOADING_THEME_DATA: 'Loading theme data...'
  },
  
  // Help text
  HELP_TEXT: {
    FILE_FORMAT: 'Expected file format:',
    FILE_REQUIREMENTS: [
      'Ghostty terminal color configuration file (.txt)',
      'Contains color definitions like: color0=#000000',
      'May include background, foreground, cursor colors'
    ],
    KEYBOARD_SHORTCUTS: [
      { key: 'Tab', action: 'Navigate forward' },
      { key: 'Shift+Tab', action: 'Navigate backward' },
      { key: 'Enter', action: 'Confirm/Continue' },
      { key: 'Escape', action: 'Go back' },
      { key: 'h', action: 'Toggle help' },
      { key: 'Ctrl+C', action: 'Exit' }
    ]
  },
  
  // Success messages
  SUCCESS_MESSAGES: {
    EXTENSION_CREATED: 'Your VS Code theme extension has been created!',
    NEXT_STEPS: [
      'Press F5 in VS Code to test your theme',
      'Use Ctrl+K Ctrl+T to switch to your theme',
      'Edit theme files to customize colors',
      'Package and publish when ready'
    ]
  },
  
  // Error messages
  ERROR_MESSAGES: {
    VSCODE_OPEN_FAILED: 'Failed to open VS Code',
    FOLDER_OPEN_FAILED: 'Failed to open folder',
    GENERATION_FAILED: 'Theme generation failed',
    VALIDATION_FAILED: 'Please fix the validation errors before continuing'
  }
};

// Layout and sizing constants  
export const LAYOUT_CONSTANTS = {
  // Terminal size breakpoints
  BREAKPOINTS: {
    WIDTH: {
      XS: 60,    // Extra small terminals
      SM: 80,    // Standard terminal width
      LG: 120    // Large terminal width
    },
    HEIGHT: {
      XS: 20,    // Very short terminals
      SM: 30,    // Standard height
      LG: 50     // Large height
    }
  },
  
  // Spacing and margins
  SPACING: {
    COMPACT_MARGIN: 1,
    NORMAL_MARGIN: 2,
    COMPACT_PADDING: 1,
    NORMAL_PADDING: 1,
    DEBOUNCE_DELAY: 100, // ms for resize debouncing
    PROGRESS_REVEAL_DELAY: 500 // ms for compact mode reveals
  },
  
  // Content sizing
  CONTENT: {
    MAX_WIDTH: 120,
    MIN_WIDTH: 50,
    MAX_FEATURE_ITEMS: 8,
    MAX_BIG_TEXT_LENGTH: 20,
    MAX_TRUNCATE_LENGTH: 20,
    ELLIPSIS_LENGTH: 3
  },
  
  // Color display
  COLOR_DISPLAY: {
    MIN_COLOR_WIDTH: 12,
    MAX_COLORS_PER_ROW: 4,
    COMPACT_COLORS_PER_ROW: 8,
    COLOR_SWATCH_SIZES: {
      SMALL: 1,
      NORMAL: 3,
      LARGE: 5
    }
  },
  
  // Progress indicators
  PROGRESS: {
    MIN_BAR_WIDTH: 20,
    MAX_BAR_WIDTH: 40,
    DEFAULT_BAR_WIDTH: 40,
    UPDATE_INTERVAL: 50 // ms
  }
};

// File and validation constants
export const FILE_CONSTANTS = {
  // File size limits
  MAX_FILE_SIZE_MB: 1,
  MAX_FILE_SIZE_BYTES: 1024 * 1024, // 1MB
  
  // String length limits
  MIN_THEME_NAME_LENGTH: 2,
  MAX_THEME_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MIN_PUBLISHER_NAME_LENGTH: 3,
  MAX_PUBLISHER_NAME_LENGTH: 256,
  
  // File system
  FILE_PERMISSIONS_MODE: 0o600,
  RECENT_FILES_LIMIT: 10,
  CONFIG_FILE_NAME: '.theme-generator-recent',
  
  // File extensions
  THEME_FILE_EXTENSION: '.txt',
  THEME_JSON_EXTENSION: '.json',
  PACKAGE_JSON_NAME: 'package.json'
};

// Theme generation constants
export const THEME_CONSTANTS = {
  // Default values
  DEFAULT_VERSION: '1.0.0',
  DEFAULT_PUBLISHER: 'theme-creator',
  DEFAULT_DESCRIPTION: 'A custom VS Code theme generated from Ghostty colors',
  
  // Theme structure
  THEME_CATEGORIES: ['dark', 'light', 'high-contrast'],
  DEFAULT_CATEGORY: 'dark',
  
  // Color roles
  COLOR_ROLES: {
    BLACK: 'black',
    RED: 'red', 
    GREEN: 'green',
    YELLOW: 'yellow',
    BLUE: 'blue',
    MAGENTA: 'magenta',
    CYAN: 'cyan',
    WHITE: 'white',
    BRIGHT_BLACK: 'brightBlack',
    BRIGHT_RED: 'brightRed',
    BRIGHT_GREEN: 'brightGreen', 
    BRIGHT_YELLOW: 'brightYellow',
    BRIGHT_BLUE: 'brightBlue',
    BRIGHT_MAGENTA: 'brightMagenta',
    BRIGHT_CYAN: 'brightCyan',
    BRIGHT_WHITE: 'brightWhite'
  },
  
  // Extension structure
  EXTENSION_FILES: {
    PACKAGE_JSON: 'package.json',
    README: 'README.md',
    CHANGELOG: 'CHANGELOG.md',
    LICENSE: 'LICENSE',
    VSCODE_LAUNCH: '.vscode/launch.json',
    THEMES_DIR: 'themes',
    THEME_SUFFIX: '-color-theme.json'
  }
};

// Performance and timing constants
export const PERFORMANCE_CONSTANTS = {
  // Animation and transitions
  ANIMATION_DURATION: {
    FAST: 200,
    NORMAL: 300,
    SLOW: 500
  },
  
  // Debounce delays
  DEBOUNCE: {
    RESIZE: 100,
    VALIDATION: 300,
    SEARCH: 200
  },
  
  // Progressive disclosure timing
  REVEAL_TIMING: {
    CELEBRATION: 2000,
    SUMMARY: 1000, 
    COMMANDS: 1000,
    OPTIONS: 0,
    COMPACT_FACTOR: 0.5 // Multiply by this in compact mode
  },
  
  // Rendering optimization
  RENDERING: {
    MAX_LIST_ITEMS: 50,
    VIRTUAL_SCROLL_THRESHOLD: 100,
    UPDATE_THROTTLE: 16 // ~60fps
  }
};

// Regex patterns
export const REGEX_PATTERNS = {
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{8})$/,
  VERSION: /^\d+\.\d+\.\d+(-[\w.]+)?$/,
  PUBLISHER_NAME: /^[a-z0-9\-]+$/i,
  GHOSTTY_COLOR_LINE: /^(color\d+|background|foreground|cursor|selection_background|selection_foreground)[\s=:]/i,
  GHOSTTY_VALUE: /[\s=:]+(#[A-Fa-f0-9]{3,8}|\w+)\s*$/
};

// Accessibility constants
export const A11Y_CONSTANTS = {
  // ARIA labels
  ARIA_LABELS: {
    FILE_INPUT: 'Theme file path input',
    THEME_NAME_INPUT: 'Theme name input',
    DESCRIPTION_INPUT: 'Theme description input',
    VERSION_INPUT: 'Version input',
    PUBLISHER_INPUT: 'Publisher name input',
    NAVIGATION_MENU: 'Navigation menu',
    COLOR_PREVIEW: 'Color palette preview',
    PROGRESS_BAR: 'Generation progress',
    SUCCESS_ACTIONS: 'Success actions menu'
  },
  
  // Semantic roles
  SEMANTIC_ROLES: {
    MAIN: 'main',
    NAVIGATION: 'navigation',
    FORM: 'form',
    STATUS: 'status',
    ALERT: 'alert',
    PROGRESS: 'progressbar'
  },
  
  // Color contrast requirements
  CONTRAST_RATIOS: {
    MIN_NORMAL: 4.5,
    MIN_LARGE: 3.0,
    ENHANCED_NORMAL: 7.0,
    ENHANCED_LARGE: 4.5
  }
};
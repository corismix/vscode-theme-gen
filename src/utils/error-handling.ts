/**
 * Comprehensive error handling utilities
 * Provides user-friendly error messages and recovery suggestions
 */

// ============================================================================
// Error Types
// ============================================================================

export interface UserFriendlyError {
  title: string;
  message: string;
  details?: string;
  suggestions: string[];
  category: 'user' | 'system' | 'network' | 'validation' | 'file';
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  actions?: ErrorAction[];
}

export interface ErrorAction {
  label: string;
  action: 'retry' | 'navigate' | 'reset' | 'restart' | 'ignore' | 'custom';
  target?: string;
  handler?: () => void;
}

// ============================================================================
// Error Categories
// ============================================================================

const errorPatterns: Array<{
  test: (error: Error) => boolean;
  handler: (error: Error) => UserFriendlyError;
}> = [
  // File System Errors
  {
    test: (error) => error.message.includes('ENOENT') || error.message.includes('no such file'),
    handler: (error) => ({
      title: 'File Not Found',
      message: 'The requested file could not be found.',
      details: error.message,
      suggestions: [
        'Check that the file path is correct',
        'Ensure the file exists and has not been moved or deleted',
        'Verify you have permission to access the file'
      ],
      category: 'file',
      severity: 'medium',
      recoverable: true,
      actions: [
        { label: 'Browse for File', action: 'navigate', target: 'file-selection' },
        { label: 'Try Again', action: 'retry' }
      ]
    })
  },

  // Permission Errors
  {
    test: (error) => error.message.includes('EACCES') || error.message.includes('permission denied'),
    handler: (error) => ({
      title: 'Permission Denied',
      message: 'You do not have permission to access this file or directory.',
      details: error.message,
      suggestions: [
        'Check file permissions',
        'Run with appropriate privileges if necessary',
        'Choose a different file or location'
      ],
      category: 'system',
      severity: 'high',
      recoverable: true,
      actions: [
        { label: 'Choose Different File', action: 'navigate', target: 'file-selection' },
        { label: 'Try Again', action: 'retry' }
      ]
    })
  },

  // Theme File Validation Errors
  {
    test: (error) => error.message.includes('Invalid theme file') || error.message.includes('color format'),
    handler: (error) => ({
      title: 'Invalid Theme File',
      message: 'The selected file is not a valid Ghostty theme file.',
      details: error.message,
      suggestions: [
        'Ensure the file contains valid color definitions',
        'Check that colors are in hex format (e.g., #FF0000)',
        'Verify the file follows Ghostty theme format',
        'Use a different theme file'
      ],
      category: 'validation',
      severity: 'medium',
      recoverable: true,
      actions: [
        { label: 'Select Different File', action: 'navigate', target: 'file-selection' },
        { label: 'View File Format Help', action: 'custom' }
      ]
    })
  },

  // Network/Connectivity Errors
  {
    test: (error) => error.message.includes('ENOTFOUND') || error.message.includes('network'),
    handler: (error) => ({
      title: 'Network Error',
      message: 'A network error occurred while processing your request.',
      details: error.message,
      suggestions: [
        'Check your internet connection',
        'Try again in a few moments',
        'Verify that any required services are running'
      ],
      category: 'network',
      severity: 'medium',
      recoverable: true,
      actions: [
        { label: 'Try Again', action: 'retry' },
        { label: 'Continue Offline', action: 'ignore' }
      ]
    })
  },

  // Configuration Errors
  {
    test: (error) => error.message.includes('config') || error.message.includes('configuration'),
    handler: (error) => ({
      title: 'Configuration Error',
      message: 'There was a problem with the application configuration.',
      details: error.message,
      suggestions: [
        'Reset configuration to defaults',
        'Check configuration file format',
        'Restore from backup if available'
      ],
      category: 'system',
      severity: 'medium',
      recoverable: true,
      actions: [
        { label: 'Reset Configuration', action: 'reset' },
        { label: 'Continue with Defaults', action: 'ignore' }
      ]
    })
  },

  // Validation Errors
  {
    test: (error) => error.message.includes('validation') || error.message.includes('invalid'),
    handler: (error) => ({
      title: 'Validation Error',
      message: 'The provided input is not valid.',
      details: error.message,
      suggestions: [
        'Check the input format requirements',
        'Ensure all required fields are filled',
        'Verify the input meets validation criteria'
      ],
      category: 'validation',
      severity: 'low',
      recoverable: true,
      actions: [
        { label: 'Fix Input', action: 'ignore' },
        { label: 'Reset Form', action: 'reset' }
      ]
    })
  },

  // Out of Memory Errors
  {
    test: (error) => error.message.includes('out of memory') || error.message.includes('ENOMEM'),
    handler: (error) => ({
      title: 'Out of Memory',
      message: 'The application has run out of memory.',
      details: error.message,
      suggestions: [
        'Close other applications to free up memory',
        'Try with a smaller theme file',
        'Restart the application'
      ],
      category: 'system',
      severity: 'high',
      recoverable: false,
      actions: [
        { label: 'Restart Application', action: 'restart' },
        { label: 'Choose Smaller File', action: 'navigate', target: 'file-selection' }
      ]
    })
  },

  // Disk Space Errors
  {
    test: (error) => error.message.includes('ENOSPC') || error.message.includes('no space'),
    handler: (error) => ({
      title: 'Insufficient Disk Space',
      message: 'There is not enough disk space to complete this operation.',
      details: error.message,
      suggestions: [
        'Free up disk space',
        'Choose a different output location',
        'Clean up temporary files'
      ],
      category: 'system',
      severity: 'high',
      recoverable: true,
      actions: [
        { label: 'Choose Different Location', action: 'navigate', target: 'extension-options' },
        { label: 'Continue Anyway', action: 'ignore' }
      ]
    })
  },

  // Generic React Errors
  {
    test: (error) => error.message.includes('React') || (error.stack?.includes('react') ?? false),
    handler: (error) => ({
      title: 'Application Error',
      message: 'A component in the application has encountered an error.',
      details: error.message,
      suggestions: [
        'Try refreshing or restarting the application',
        'Check if you have the latest version',
        'Report this issue if it persists'
      ],
      category: 'system',
      severity: 'medium',
      recoverable: true,
      actions: [
        { label: 'Restart Application', action: 'restart' },
        { label: 'Go to Home', action: 'navigate', target: 'welcome' }
      ]
    })
  }
];

// ============================================================================
// Default Error Handler
// ============================================================================

const defaultErrorHandler = (error: Error): UserFriendlyError => ({
  title: 'Unexpected Error',
  message: 'An unexpected error has occurred.',
  details: error.message,
  suggestions: [
    'Try the operation again',
    'Restart the application if the problem persists',
    'Report this issue with the error details'
  ],
  category: 'system',
  severity: 'medium',
  recoverable: true,
  actions: [
    { label: 'Try Again', action: 'retry' },
    { label: 'Restart Application', action: 'restart' }
  ]
});

// ============================================================================
// Error Processing Functions
// ============================================================================

/**
 * Converts a raw error into a user-friendly error with context and suggestions
 */
export const processError = (error: Error | unknown): UserFriendlyError => {
  // Ensure we have an Error object
  const err = error instanceof Error ? error : new Error(String(error));

  // Find matching error pattern
  const pattern = errorPatterns.find(p => p.test(err));
  
  if (pattern) {
    return pattern.handler(err);
  }
  
  return defaultErrorHandler(err);
};

/**
 * Creates a user-friendly error from an error code and context
 */
export const createUserError = (
  code: string,
  context: Record<string, any> = {}
): UserFriendlyError => {
  const baseError = new Error(`Error ${code}: ${JSON.stringify(context)}`);
  return processError(baseError);
};

/**
 * Wraps an async function with error handling
 */
export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  onError?: (error: UserFriendlyError) => void
) => {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      const userError = processError(error);
      
      if (onError) {
        onError(userError);
      } else {
        console.error('Unhandled error:', userError);
      }
      
      return null;
    }
  };
};

/**
 * Creates an error handler for React components
 */
export const createErrorHandler = (
  onError: (error: UserFriendlyError) => void
) => {
  return (error: Error | unknown) => {
    const userError = processError(error);
    onError(userError);
  };
};

// ============================================================================
// Error Recovery Utilities
// ============================================================================

/**
 * Checks if an error is recoverable
 */
export const isRecoverable = (error: UserFriendlyError): boolean => {
  return error.recoverable && error.severity !== 'critical';
};

/**
 * Gets suggested recovery actions for an error
 */
export const getRecoveryActions = (error: UserFriendlyError): ErrorAction[] => {
  return error.actions || [
    { label: 'Try Again', action: 'retry' },
    { label: 'Go Back', action: 'navigate', target: 'previous' }
  ];
};

/**
 * Formats an error for display in the UI
 */
export const formatErrorForDisplay = (error: UserFriendlyError): string => {
  let formatted = `${error.title}\n\n${error.message}`;
  
  if (error.details) {
    formatted += `\n\nDetails: ${error.details}`;
  }
  
  if (error.suggestions.length > 0) {
    formatted += `\n\nSuggestions:\n${error.suggestions.map(s => `• ${s}`).join('\n')}`;
  }
  
  return formatted;
};

// ============================================================================
// Error Logging
// ============================================================================

/**
 * Logs an error with context for debugging
 */
export const logError = (
  error: Error | UserFriendlyError,
  context: Record<string, any> = {}
): void => {
  const timestamp = new Date().toISOString();
  const errorData = {
    timestamp,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error,
    context
  };
  
  console.error('Error logged:', JSON.stringify(errorData, null, 2));
  
  // In a real application, you might send this to a logging service
};

// All functions are already exported individually above
/**
 * Error Boundary component for React error handling
 * 
 * Comprehensive error boundary implementation providing graceful error recovery
 * and user-friendly error messages. Features keyboard-driven error recovery,
 * ProcessService integration for safe cleanup, and detailed error information.
 * 
 * Features:
 * - Multi-level error boundaries (component, page, application)
 * - Keyboard shortcuts for recovery actions
 * - Detailed error information with stack traces
 * - ProcessService integration for safe process management
 * - Customizable fallback components
 * - Error ID generation for debugging
 * - Graceful cleanup and shutdown handling
 * 
 * Recovery Options:
 * - [R] Try again - Resets the error boundary
 * - [H] Go to home - Navigation to home screen
 * - [D] Toggle details - Show/hide error details
 * - [Q] Exit application - Safe application exit
 * 
 * @fileoverview Comprehensive error boundary with keyboard-driven recovery
 * @since 1.0.0
 */

import React, { ReactNode, useEffect, useRef, useState, useCallback } from 'react';
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary';
import { Box, Text } from 'ink';
import { getProcessManager, setupGracefulShutdown, type ProcessManager } from '../../services/ProcessService';

// ============================================================================
// Types
// ============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
  level?: 'component' | 'page' | 'application';
}

interface ErrorFallbackProps extends FallbackProps {
  level?: 'component' | 'page' | 'application';
  showDetails?: boolean;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique error ID for tracking and debugging
 * 
 * Creates a unique identifier combining timestamp and random string
 * for error tracking and debugging purposes.
 * 
 * @returns Unique error ID in format "ERR-{timestamp}-{random}"
 * 
 * @example
 * ```typescript
 * const errorId = generateErrorId();
 * // Returns: "ERR-1640995200000-a1b2c3d4e"
 * ```
 * 
 * @since 1.0.0
 */
function generateErrorId(): string {
  return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Error Display Component
// ============================================================================

interface ErrorDisplayProps {
  error: Error;
  errorInfo?: React.ErrorInfo;
  errorId: string;
  level: string;
  showDetails: boolean;
  onRestart: () => void;
  onToggleDetails: () => void;
  onGoHome: () => void;
  onExit: () => void;
}

/**
 * ErrorDisplay component for rendering error information and recovery options
 * 
 * Displays comprehensive error information including error message, stack trace,
 * and keyboard shortcuts for recovery actions. Provides different layouts based
 * on error level (component, page, application).
 * 
 * @param props - Error display configuration and handlers
 * @returns JSX element with error information and recovery interface
 * 
 * @since 1.0.0
 */
const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  errorInfo,
  errorId,
  level,
  showDetails
  // Note: event handlers are passed but handled by parent component
}) => {
  const getErrorTitle = (level: string): string => {
    switch (level) {
      case 'application': return 'Application Error';
      case 'page': return 'Page Error';
      case 'component': return 'Component Error';
      default: return 'Unexpected Error';
    }
  };

  const getRecoveryMessage = (level: string): string => {
    switch (level) {
      case 'application': return 'The application has encountered an error. Please restart the application.';
      case 'page': return 'This page has encountered an error. Try navigating back or restarting.';
      case 'component': return 'A component has encountered an error. Some functionality may be limited.';
      default: return 'An unexpected error occurred.';
    }
  };

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="red"
      paddingX={2}
      paddingY={1}
      width="100%"
    >
      {/* Error Header */}
      <Box marginBottom={1}>
        <Text color="red" bold>
          ❌ {getErrorTitle(level)}
        </Text>
      </Box>

      {/* Error Message */}
      <Box marginBottom={1}>
        <Text color="white">
          {getRecoveryMessage(level)}
        </Text>
      </Box>

      {/* Error Details */}
      {showDetails && (
        <Box flexDirection="column" marginBottom={1}>
          <Box marginBottom={1}>
            <Text color="red" bold>Error Details:</Text>
          </Box>
          
          <Box marginBottom={1}>
            <Text color="gray">
              Error ID: {errorId}
            </Text>
          </Box>
          
          <Box marginBottom={1}>
            <Text color="yellow">
              {error.name}: {error.message}
            </Text>
          </Box>

          {error.stack && (
            <Box marginBottom={1}>
              <Text color="gray" dimColor>
                Stack trace:
              </Text>
            </Box>
          )}

          {error.stack && (
            <Box marginBottom={1}>
              <Text color="gray" dimColor>
                {error.stack.split('\n').slice(0, 5).join('\n')}
                {error.stack.split('\n').length > 5 ? '\n...' : ''}
              </Text>
            </Box>
          )}

          {errorInfo && (
            <Box marginBottom={1}>
              <Text color="gray" dimColor>
                Component stack: {errorInfo.componentStack?.split('\n')[1] || 'Unknown'}
              </Text>
            </Box>
          )}
        </Box>
      )}

      {/* Recovery Actions */}
      <Box flexDirection="column" marginTop={1} paddingTop={1} borderTop borderColor="gray">
        <Box marginBottom={1}>
          <Text color="cyan" bold>Recovery Options:</Text>
        </Box>
        
        <Box marginBottom={1}>
          <Text color="green">
            [R] Try again
          </Text>
        </Box>
        
        <Box marginBottom={1}>
          <Text color="blue">
            [H] Go to home
          </Text>
        </Box>
        
        <Box marginBottom={1}>
          <Text color="yellow">
            [D] Toggle details
          </Text>
        </Box>
        
        <Box>
          <Text color="red">
            [Q] Exit application
          </Text>
        </Box>
      </Box>

      {/* User Instructions */}
      <Box marginTop={1} paddingTop={1} borderTop borderColor="gray">
        <Text color="gray" dimColor>
          💡 If this error persists, please report it with Error ID: {errorId}
        </Text>
      </Box>
    </Box>
  );
};

// ============================================================================
// Error Fallback Component
// ============================================================================

/**
 * ErrorFallback component with keyboard handling and process management
 * 
 * Main fallback component that handles keyboard input for error recovery,
 * manages process cleanup, and provides interactive error recovery interface.
 * Integrates with ProcessService for safe stdin handling and cleanup.
 * 
 * @param props - Error fallback configuration including error and reset function
 * @returns JSX element with interactive error recovery interface
 * 
 * @since 1.0.0
 */
const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
  level = 'component',
  showDetails = true
}) => {
  const [localShowDetails, setLocalShowDetails] = useState(showDetails);
  const [errorId] = useState(() => generateErrorId());
  const processManagerRef = useRef<ProcessManager | null>(null);

  // Initialize process manager on mount
  useEffect(() => {
    processManagerRef.current = getProcessManager();
    setupGracefulShutdown();

    return () => {
      if (processManagerRef.current) {
        processManagerRef.current.cleanup();
      }
    };
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const processManager = processManagerRef.current;
    if (!processManager) return;

    const handleKeyPress = (key: Buffer): void => {
      const keyStr = key.toString();
      
      switch (keyStr.toLowerCase()) {
        case 'r':
          resetErrorBoundary();
          break;
        case 'h':
          // For now, just restart - in a full app this would navigate to home
          resetErrorBoundary();
          break;
        case 'd':
          setLocalShowDetails(prev => !prev);
          break;
        case 'q':
        case '\u0003': // Ctrl+C
          processManager.cleanup();
          process.exit(1);
          break;
      }
    };

    processManager.setupStdinHandling(handleKeyPress);

    return () => {
      processManager.cleanup();
    };
  }, [resetErrorBoundary]);

  const handleRestart = useCallback(() => {
    resetErrorBoundary();
  }, [resetErrorBoundary]);

  const handleToggleDetails = useCallback(() => {
    setLocalShowDetails(prev => !prev);
  }, []);

  const handleGoHome = useCallback(() => {
    resetErrorBoundary();
  }, [resetErrorBoundary]);

  const handleExit = useCallback(() => {
    if (processManagerRef.current) {
      processManagerRef.current.cleanup();
    }
    process.exit(1);
  }, []);

  return (
    <ErrorDisplay
      error={error}
      errorId={errorId}
      level={level}
      showDetails={localShowDetails}
      onRestart={handleRestart}
      onToggleDetails={handleToggleDetails}
      onGoHome={handleGoHome}
      onExit={handleExit}
    />
  );
};

// ============================================================================
// Main Error Boundary Component
// ============================================================================

/**
 * Main ErrorBoundary component with customizable fallback handling
 * 
 * Wrapper around react-error-boundary providing customizable error handling
 * with support for different error levels and fallback components. Handles
 * error logging and provides callback integration for custom error handling.
 * 
 * @param props - Error boundary configuration including children and options
 * @returns JSX element wrapping children with error boundary protection
 * 
 * @since 1.0.0
 */
const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({
  children,
  fallback,
  onError,
  showDetails = true,
  level = 'component'
}) => {
  const handleError = useCallback((error: Error, errorInfo: any) => {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    if (onError) {
      // Convert react-error-boundary errorInfo to React.ErrorInfo format
      const reactErrorInfo: React.ErrorInfo = {
        componentStack: errorInfo?.componentStack || ''
      };
      onError(error, reactErrorInfo);
    }
  }, [onError]);

  const fallbackRender = useCallback((props: FallbackProps) => {
    if (fallback) {
      return fallback;
    }

    return (
      <ErrorFallback
        {...props}
        level={level}
        showDetails={showDetails}
      />
    );
  }, [fallback, level, showDetails]);

  return (
    <ReactErrorBoundary
      FallbackComponent={fallbackRender}
      onError={handleError}
      onReset={() => {
        // Reset any additional state if needed
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
};

// ============================================================================
// Error Boundary Hook
// ============================================================================

/**
 * Hook for handling errors in functional components
 * 
 * Provides error handling capabilities for functional components by maintaining
 * error state and throwing errors to be caught by parent ErrorBoundary components.
 * 
 * @returns Object with error handling functions and state
 * @returns handleError - Function to handle and set errors
 * @returns resetError - Function to clear current error
 * @returns hasError - Boolean indicating if an error is present
 * 
 * @example
 * ```typescript
 * const { handleError, resetError, hasError } = useErrorHandler();
 * 
 * try {
 *   // Risky operation
 *   await riskyOperation();
 * } catch (error) {
 *   handleError(error);
 * }
 * ```
 * 
 * @since 1.0.0
 */
export const useErrorHandler = () => {
  const [error, setError] = useState<Error | null>(null);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((error: Error) => {
    console.error('Error caught by useErrorHandler:', error);
    setError(error);
  }, []);

  // Throw error to be caught by ErrorBoundary
  useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { handleError, resetError, hasError: !!error };
};

/**
 * Hook for process management with cleanup
 * 
 * Provides ProcessManager instance with automatic setup and cleanup.
 * Handles graceful shutdown registration and cleanup on component unmount.
 * 
 * @returns ProcessManager instance or null if not initialized
 * 
 * @example
 * ```typescript
 * const processManager = useProcessManager();
 * if (processManager) {
 *   processManager.setupStdinHandling(handleKeyPress);
 * }
 * ```
 * 
 * @since 1.0.0
 */
const useProcessManagerHook = () => {
  const processManagerRef = useRef<ProcessManager | null>(null);

  useEffect(() => {
    processManagerRef.current = getProcessManager();
    setupGracefulShutdown();

    return () => {
      if (processManagerRef.current) {
        processManagerRef.current.cleanup();
      }
    };
  }, []);

  return processManagerRef.current;
};

// ============================================================================
// Exports
// ============================================================================

export { ErrorDisplay, ErrorFallback, useProcessManagerHook as useProcessManager };
export default ErrorBoundary;

export type { ErrorBoundaryProps, ErrorBoundaryState, ErrorFallbackProps };
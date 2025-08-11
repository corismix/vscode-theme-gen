/**
 * Error Boundary component for React error handling
 * Provides graceful error recovery and user-friendly error messages
 */

import React, { Component, ReactNode } from 'react';
import { Box, Text } from 'ink';

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
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  errorInfo,
  errorId,
  level,
  showDetails
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
// Error Boundary Class Component
// ============================================================================

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: this.generateErrorId()
    };

    // Bind methods
    this.handleRestart = this.handleRestart.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
  }

  // ============================================================================
  // Error Boundary Methods
  // ============================================================================

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: ErrorBoundary.generateErrorId()
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({
      error,
      errorInfo
    });

    // Call the error callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  componentDidMount(): void {
    // Set up global error handling
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', this.handleKeyPress);
  }

  componentWillUnmount(): void {
    // Clean up event listeners
    process.stdin.removeListener('data', this.handleKeyPress);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private static generateErrorId(): string {
    return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorId(): string {
    return ErrorBoundary.generateErrorId();
  }

  private handleKeyPress = (key: Buffer): void => {
    if (!this.state.hasError) return;

    const keyStr = key.toString();
    
    switch (keyStr.toLowerCase()) {
      case 'r':
        this.handleRestart();
        break;
      case 'h':
        this.handleGoHome();
        break;
      case 'd':
        this.handleToggleDetails();
        break;
      case 'q':
        process.exit(1);
        break;
      case '\u0003': // Ctrl+C
        process.exit(1);
        break;
    }
  };

  private handleRestart = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: this.generateErrorId()
    });
  };

  private handleGoHome = (): void => {
    // For now, just restart - in a full app this would navigate to home
    this.handleRestart();
  };

  private handleToggleDetails = (): void => {
    // This would toggle showDetails if it were in state
    // For now, we'll just restart to keep it simple
    this.handleRestart();
  };

  // ============================================================================
  // Render Method
  // ============================================================================

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <ErrorDisplay
          error={this.state.error!}
          errorInfo={this.state.errorInfo || undefined}
          errorId={this.state.errorId}
          level={this.props.level || 'component'}
          showDetails={this.props.showDetails !== false}
          onRestart={this.handleRestart}
        />
      );
    }

    // Normal render
    return this.props.children;
  }
}

// ============================================================================
// Error Boundary Hook
// ============================================================================

/**
 * Hook for handling errors in functional components
 */
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error: Error) => {
    console.error('Error caught by useErrorHandler:', error);
    setError(error);
  }, []);

  // Throw error to be caught by ErrorBoundary
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { handleError, resetError, hasError: !!error };
};

// ============================================================================
// Exports
// ============================================================================

export { ErrorDisplay };
export default ErrorBoundary;

export type { ErrorBoundaryProps, ErrorBoundaryState };
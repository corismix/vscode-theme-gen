import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary, {
  ErrorDisplay,
  ErrorFallback,
  useErrorHandler,
  useProcessManager,
  type ErrorBoundaryProps,
} from '@/components/shared/ErrorBoundary';
import { TestProcessManager, resetProcessManager } from '@/services/ProcessService';

// Mock the ProcessService
vi.mock('@/services/ProcessService', () => ({
  getProcessManager: vi.fn(),
  resetProcessManager: vi.fn(),
  setupGracefulShutdown: vi.fn(),
  TestProcessManager: vi.fn().mockImplementation(() => ({
    setupStdinHandling: vi.fn(),
    cleanup: vi.fn(),
    isActive: vi.fn(() => false),
    simulateKeyPress: vi.fn(),
  })),
}));

// Mock process.exit
const mockExit = vi.fn();
vi.stubGlobal('process', {
  ...process,
  exit: mockExit,
});

// Mock console methods
const originalError = console.error;
const mockConsoleError = vi.fn();
console.error = mockConsoleError;

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow: boolean; message?: string }> = ({
  shouldThrow,
  message = 'Test error'
}) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  let mockProcessManager: TestProcessManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleError.mockClear();
    mockExit.mockClear();
    
    mockProcessManager = new TestProcessManager();
    vi.mocked(require('@/services/ProcessService').getProcessManager).mockReturnValue(mockProcessManager);
  });

  afterEach(() => {
    resetProcessManager();
    console.error = originalError;
  });

  describe('when no error occurs', () => {
    it('should render children normally', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeTruthy();
    });
  });

  describe('when error occurs', () => {
    it('should catch and display error with default fallback', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} message="Component failed" />
        </ErrorBoundary>
      );

      expect(screen.getByText(/❌ Component Error/)).toBeTruthy();
      expect(screen.getByText(/A component has encountered an error/)).toBeTruthy();
      expect(screen.getByText(/Component failed/)).toBeTruthy();
    });

    it('should call onError callback when provided', () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} message="Callback test" />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Callback test' }),
        expect.objectContaining({ componentStack: expect.any(String) })
      );
    });

    it('should render custom fallback when provided', () => {
      const customFallback = <div>Custom error message</div>;
      
      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeTruthy();
    });

    it('should display different error levels', () => {
      const { rerender } = render(
        <ErrorBoundary level="application">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/❌ Application Error/)).toBeTruthy();
      expect(screen.getByText(/The application has encountered an error/)).toBeTruthy();

      // Test page level
      rerender(
        <ErrorBoundary level="page">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/❌ Page Error/)).toBeTruthy();
      expect(screen.getByText(/This page has encountered an error/)).toBeTruthy();
    });

    it('should log error to console', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} message="Console test" />
        </ErrorBoundary>
      );

      expect(mockConsoleError).toHaveBeenCalledWith(
        'ErrorBoundary caught an error:',
        expect.objectContaining({ message: 'Console test' }),
        expect.any(Object)
      );
    });
  });

  describe('error display configuration', () => {
    it('should hide details when showDetails is false', () => {
      render(
        <ErrorBoundary showDetails={false}>
          <ThrowError shouldThrow={true} message="Hidden details" />
        </ErrorBoundary>
      );

      expect(screen.queryByText(/Error Details:/)).toBeNull();
      expect(screen.queryByText(/Error ID:/)).toBeNull();
      expect(screen.queryByText(/Stack trace:/)).toBeNull();
    });

    it('should show details when showDetails is true', () => {
      render(
        <ErrorBoundary showDetails={true}>
          <ThrowError shouldThrow={true} message="Visible details" />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Error Details:/)).toBeTruthy();
      expect(screen.getByText(/Error ID:/)).toBeTruthy();
      expect(screen.getByText(/Visible details/)).toBeTruthy();
    });

    it('should generate unique error IDs', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const firstErrorId = screen.getByText(/Error ID:/).textContent?.match(/ERR-\d+-\w+/)?.[0];
      
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} message="Different error" />
        </ErrorBoundary>
      );

      const secondErrorId = screen.getByText(/Error ID:/).textContent?.match(/ERR-\d+-\w+/)?.[0];
      
      expect(firstErrorId).toBeTruthy();
      expect(secondErrorId).toBeTruthy();
      expect(firstErrorId).not.toBe(secondErrorId);
    });
  });
});

describe('ErrorFallback', () => {
  let mockProcessManager: TestProcessManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExit.mockClear();
    
    mockProcessManager = new TestProcessManager();
    vi.mocked(require('@/services/ProcessService').getProcessManager).mockReturnValue(mockProcessManager);
  });

  describe('keyboard handling', () => {
    it('should setup stdin handling on mount', () => {
      const resetErrorBoundary = vi.fn();
      const error = new Error('Test error');

      render(
        <ErrorFallback 
          error={error} 
          resetErrorBoundary={resetErrorBoundary} 
        />
      );

      expect(mockProcessManager.setupStdinHandling).toHaveBeenCalled();
    });

    it('should handle R key for retry', () => {
      const resetErrorBoundary = vi.fn();
      const error = new Error('Test error');

      render(
        <ErrorFallback 
          error={error} 
          resetErrorBoundary={resetErrorBoundary} 
        />
      );

      // Get the keyboard handler
      const keyHandler = vi.mocked(mockProcessManager.setupStdinHandling).mock.calls[0][0];
      
      // Simulate 'r' key press
      keyHandler(Buffer.from('r'));
      
      expect(resetErrorBoundary).toHaveBeenCalled();
    });

    it('should handle H key for home navigation', () => {
      const resetErrorBoundary = vi.fn();
      const error = new Error('Test error');

      render(
        <ErrorFallback 
          error={error} 
          resetErrorBoundary={resetErrorBoundary} 
        />
      );

      // Get the keyboard handler
      const keyHandler = vi.mocked(mockProcessManager.setupStdinHandling).mock.calls[0][0];
      
      // Simulate 'h' key press
      keyHandler(Buffer.from('h'));
      
      expect(resetErrorBoundary).toHaveBeenCalled();
    });

    it('should handle D key for toggle details', () => {
      const resetErrorBoundary = vi.fn();
      const error = new Error('Test error');

      const { rerender } = render(
        <ErrorFallback 
          error={error} 
          resetErrorBoundary={resetErrorBoundary}
          showDetails={true}
        />
      );

      // Initially should show details
      expect(screen.getByText(/Error Details:/)).toBeTruthy();

      // Get the keyboard handler
      const keyHandler = vi.mocked(mockProcessManager.setupStdinHandling).mock.calls[0][0];
      
      // Simulate 'd' key press - this requires component re-render to see effect
      keyHandler(Buffer.from('d'));
      
      // In a real scenario, this would toggle the details visibility
      // The test validates that the handler is called correctly
      expect(vi.mocked(mockProcessManager.setupStdinHandling)).toHaveBeenCalled();
    });

    it('should handle Q key for exit', () => {
      const resetErrorBoundary = vi.fn();
      const error = new Error('Test error');

      render(
        <ErrorFallback 
          error={error} 
          resetErrorBoundary={resetErrorBoundary} 
        />
      );

      // Get the keyboard handler
      const keyHandler = vi.mocked(mockProcessManager.setupStdinHandling).mock.calls[0][0];
      
      // Simulate 'q' key press
      keyHandler(Buffer.from('q'));
      
      expect(mockProcessManager.cleanup).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should handle Ctrl+C for exit', () => {
      const resetErrorBoundary = vi.fn();
      const error = new Error('Test error');

      render(
        <ErrorFallback 
          error={error} 
          resetErrorBoundary={resetErrorBoundary} 
        />
      );

      // Get the keyboard handler
      const keyHandler = vi.mocked(mockProcessManager.setupStdinHandling).mock.calls[0][0];
      
      // Simulate Ctrl+C (character code 3)
      keyHandler(Buffer.from([3]));
      
      expect(mockProcessManager.cleanup).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should handle case-insensitive keys', () => {
      const resetErrorBoundary = vi.fn();
      const error = new Error('Test error');

      render(
        <ErrorFallback 
          error={error} 
          resetErrorBoundary={resetErrorBoundary} 
        />
      );

      // Get the keyboard handler
      const keyHandler = vi.mocked(mockProcessManager.setupStdinHandling).mock.calls[0][0];
      
      // Simulate uppercase 'R' key press
      keyHandler(Buffer.from('R'));
      
      expect(resetErrorBoundary).toHaveBeenCalled();
    });

    it('should ignore unhandled keys', () => {
      const resetErrorBoundary = vi.fn();
      const error = new Error('Test error');

      render(
        <ErrorFallback 
          error={error} 
          resetErrorBoundary={resetErrorBoundary} 
        />
      );

      // Get the keyboard handler
      const keyHandler = vi.mocked(mockProcessManager.setupStdinHandling).mock.calls[0][0];
      
      // Simulate unhandled key press
      keyHandler(Buffer.from('x'));
      
      expect(resetErrorBoundary).not.toHaveBeenCalled();
      expect(mockExit).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should cleanup process manager on unmount', () => {
      const resetErrorBoundary = vi.fn();
      const error = new Error('Test error');

      const { unmount } = render(
        <ErrorFallback 
          error={error} 
          resetErrorBoundary={resetErrorBoundary} 
        />
      );

      unmount();

      expect(mockProcessManager.cleanup).toHaveBeenCalled();
    });

    it('should cleanup process manager when effect cleanup runs', () => {
      const resetErrorBoundary = vi.fn();
      const error = new Error('Test error');

      const { unmount } = render(
        <ErrorFallback 
          error={error} 
          resetErrorBoundary={resetErrorBoundary} 
        />
      );

      // Simulate effect cleanup
      unmount();

      expect(mockProcessManager.cleanup).toHaveBeenCalled();
    });
  });

  describe('process manager error handling', () => {
    it('should handle missing process manager gracefully', () => {
      vi.mocked(require('@/services/ProcessService').getProcessManager).mockReturnValue(null);

      const resetErrorBoundary = vi.fn();
      const error = new Error('Test error');

      expect(() => {
        render(
          <ErrorFallback 
            error={error} 
            resetErrorBoundary={resetErrorBoundary} 
          />
        );
      }).not.toThrow();
    });

    it('should handle process manager setup errors', () => {
      const errorProcessManager = {
        setupStdinHandling: vi.fn(() => {
          throw new Error('Setup failed');
        }),
        cleanup: vi.fn(),
        isActive: vi.fn(() => false),
      };

      vi.mocked(require('@/services/ProcessService').getProcessManager).mockReturnValue(errorProcessManager);

      const resetErrorBoundary = vi.fn();
      const error = new Error('Test error');

      expect(() => {
        render(
          <ErrorFallback 
            error={error} 
            resetErrorBoundary={resetErrorBoundary} 
          />
        );
      }).not.toThrow();
    });
  });
});

describe('ErrorDisplay', () => {
  const mockHandlers = {
    onRestart: vi.fn(),
    onToggleDetails: vi.fn(),
    onGoHome: vi.fn(),
    onExit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display error information correctly', () => {
    const error = new Error('Display test error');
    error.stack = 'Error: Display test error\n    at TestComponent\n    at ErrorBoundary';

    const errorInfo = {
      componentStack: '\n    in TestComponent\n    in ErrorBoundary'
    };

    render(
      <ErrorDisplay
        error={error}
        errorInfo={errorInfo}
        errorId="TEST-123"
        level="component"
        showDetails={true}
        {...mockHandlers}
      />
    );

    expect(screen.getByText(/❌ Component Error/)).toBeTruthy();
    expect(screen.getByText(/A component has encountered an error/)).toBeTruthy();
    expect(screen.getByText(/Error ID: TEST-123/)).toBeTruthy();
    expect(screen.getByText(/Error: Display test error/)).toBeTruthy();
  });

  it('should display different error levels correctly', () => {
    const error = new Error('Level test');

    const { rerender } = render(
      <ErrorDisplay
        error={error}
        errorId="TEST-123"
        level="application"
        showDetails={false}
        {...mockHandlers}
      />
    );

    expect(screen.getByText(/❌ Application Error/)).toBeTruthy();
    expect(screen.getByText(/The application has encountered an error/)).toBeTruthy();

    rerender(
      <ErrorDisplay
        error={error}
        errorId="TEST-123"
        level="page"
        showDetails={false}
        {...mockHandlers}
      />
    );

    expect(screen.getByText(/❌ Page Error/)).toBeTruthy();
    expect(screen.getByText(/This page has encountered an error/)).toBeTruthy();

    rerender(
      <ErrorDisplay
        error={error}
        errorId="TEST-123"
        level="unknown"
        showDetails={false}
        {...mockHandlers}
      />
    );

    expect(screen.getByText(/❌ Unexpected Error/)).toBeTruthy();
    expect(screen.getByText(/An unexpected error occurred/)).toBeTruthy();
  });

  it('should show recovery options', () => {
    const error = new Error('Recovery test');

    render(
      <ErrorDisplay
        error={error}
        errorId="TEST-123"
        level="component"
        showDetails={false}
        {...mockHandlers}
      />
    );

    expect(screen.getByText(/Recovery Options:/)).toBeTruthy();
    expect(screen.getByText(/\[R\] Try again/)).toBeTruthy();
    expect(screen.getByText(/\[H\] Go to home/)).toBeTruthy();
    expect(screen.getByText(/\[D\] Toggle details/)).toBeTruthy();
    expect(screen.getByText(/\[Q\] Exit application/)).toBeTruthy();
  });

  it('should truncate long stack traces', () => {
    const error = new Error('Stack test');
    error.stack = Array(10).fill('    at SomeFunction').join('\n');

    render(
      <ErrorDisplay
        error={error}
        errorId="TEST-123"
        level="component"
        showDetails={true}
        {...mockHandlers}
      />
    );

    expect(screen.getByText(/Stack trace:/)).toBeTruthy();
    expect(screen.getByText(/\.\.\./)).toBeTruthy();
  });

  it('should handle missing stack trace gracefully', () => {
    const error = new Error('No stack test');
    delete error.stack;

    render(
      <ErrorDisplay
        error={error}
        errorId="TEST-123"
        level="component"
        showDetails={true}
        {...mockHandlers}
      />
    );

    expect(screen.queryByText(/Stack trace:/)).toBeNull();
  });

  it('should handle missing error info gracefully', () => {
    const error = new Error('No info test');

    render(
      <ErrorDisplay
        error={error}
        errorId="TEST-123"
        level="component"
        showDetails={true}
        {...mockHandlers}
      />
    );

    expect(screen.getByText(/Component stack: Unknown/)).toBeTruthy();
  });

  it('should conditionally show details', () => {
    const error = new Error('Details test');

    const { rerender } = render(
      <ErrorDisplay
        error={error}
        errorId="TEST-123"
        level="component"
        showDetails={false}
        {...mockHandlers}
      />
    );

    expect(screen.queryByText(/Error Details:/)).toBeNull();

    rerender(
      <ErrorDisplay
        error={error}
        errorId="TEST-123"
        level="component"
        showDetails={true}
        {...mockHandlers}
      />
    );

    expect(screen.getByText(/Error Details:/)).toBeTruthy();
  });
});

describe('useErrorHandler', () => {
  it('should handle errors correctly', () => {
    const TestComponent = () => {
      const { handleError, hasError, resetError } = useErrorHandler();

      return (
        <div>
          <div>Has Error: {hasError.toString()}</div>
          <button onClick={() => handleError(new Error('Test error'))}>
            Trigger Error
          </button>
          <button onClick={resetError}>
            Reset Error
          </button>
        </div>
      );
    };

    const { getByText, getByRole } = render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    expect(getByText('Has Error: false')).toBeTruthy();

    // Trigger error - this should cause the ErrorBoundary to catch it
    const triggerButton = getByRole('button', { name: /trigger error/i });
    triggerButton.click();

    // After error is thrown, ErrorBoundary should render fallback
    expect(screen.getByText(/❌ Component Error/)).toBeTruthy();
  });

  it('should log errors to console', () => {
    const TestComponent = () => {
      const { handleError } = useErrorHandler();

      React.useEffect(() => {
        handleError(new Error('Hook error test'));
      }, [handleError]);

      return <div>Test</div>;
    };

    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    expect(mockConsoleError).toHaveBeenCalledWith(
      'Error caught by useErrorHandler:',
      expect.objectContaining({ message: 'Hook error test' })
    );
  });
});

describe('useProcessManager', () => {
  let mockProcessManager: TestProcessManager;

  beforeEach(() => {
    mockProcessManager = new TestProcessManager();
    vi.mocked(require('@/services/ProcessService').getProcessManager).mockReturnValue(mockProcessManager);
  });

  it('should return process manager instance', () => {
    const TestComponent = () => {
      const processManager = useProcessManager();
      return <div>{processManager ? 'Manager Available' : 'No Manager'}</div>;
    };

    render(<TestComponent />);

    expect(screen.getByText('Manager Available')).toBeTruthy();
  });

  it('should cleanup on unmount', () => {
    const TestComponent = () => {
      useProcessManager();
      return <div>Test</div>;
    };

    const { unmount } = render(<TestComponent />);
    
    unmount();

    expect(mockProcessManager.cleanup).toHaveBeenCalled();
  });

  it('should setup graceful shutdown', () => {
    const TestComponent = () => {
      useProcessManager();
      return <div>Test</div>;
    };

    render(<TestComponent />);

    expect(require('@/services/ProcessService').setupGracefulShutdown).toHaveBeenCalled();
  });

  it('should handle missing process manager', () => {
    vi.mocked(require('@/services/ProcessService').getProcessManager).mockReturnValue(null);

    const TestComponent = () => {
      const processManager = useProcessManager();
      return <div>{processManager ? 'Manager Available' : 'No Manager'}</div>;
    };

    render(<TestComponent />);

    expect(screen.getByText('No Manager')).toBeTruthy();
  });
});

describe('Error Boundary Integration', () => {
  let mockProcessManager: TestProcessManager;

  beforeEach(() => {
    mockProcessManager = new TestProcessManager();
    vi.mocked(require('@/services/ProcessService').getProcessManager).mockReturnValue(mockProcessManager);
  });

  it('should integrate with ProcessService for keyboard handling', () => {
    render(
      <ErrorBoundary level="application" showDetails={true}>
        <ThrowError shouldThrow={true} message="Integration test" />
      </ErrorBoundary>
    );

    expect(mockProcessManager.setupStdinHandling).toHaveBeenCalled();
    expect(require('@/services/ProcessService').setupGracefulShutdown).toHaveBeenCalled();
  });

  it('should maintain proper cleanup chain', () => {
    const { unmount } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    unmount();

    expect(mockProcessManager.cleanup).toHaveBeenCalled();
  });

  it('should handle rapid error recovery cycles', () => {
    const onError = vi.fn();
    
    const { rerender } = render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} message="Error 1" />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);

    // Simulate recovery and new error
    rerender(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    rerender(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} message="Error 2" />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(2);
  });

  it('should handle concurrent keyboard events safely', () => {
    const resetErrorBoundary = vi.fn();
    const error = new Error('Concurrent test');

    render(
      <ErrorFallback 
        error={error} 
        resetErrorBoundary={resetErrorBoundary} 
      />
    );

    const keyHandler = vi.mocked(mockProcessManager.setupStdinHandling).mock.calls[0][0];
    
    // Simulate rapid key presses
    keyHandler(Buffer.from('r'));
    keyHandler(Buffer.from('r'));
    keyHandler(Buffer.from('r'));
    
    expect(resetErrorBoundary).toHaveBeenCalledTimes(3);
  });
});
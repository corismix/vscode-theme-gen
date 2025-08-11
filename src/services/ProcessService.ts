/**
 * ProcessService - Centralized process and stdin handling
 * 
 * Provides safe, testable process management with proper cleanup and resource management.
 * Replaces direct process manipulation in React components to ensure proper cleanup
 * and testing capabilities. Handles TTY detection, raw mode management, and graceful
 * shutdown procedures.
 * 
 * @fileoverview Process management service with production and test implementations
 * @since 1.0.0
 */

/**
 * Interface for process management implementations
 * 
 * Provides abstraction for handling stdin events and process lifecycle
 * with both production and test implementations.
 * 
 * @interface ProcessManager
 * @since 1.0.0
 */
export interface ProcessManager {
  /**
   * Setup stdin event handling with the provided callback
   * 
   * @param callback - Function to handle incoming stdin data
   * @throws {Error} When stdin setup fails or TTY is not available
   */
  setupStdinHandling(callback: (data: Buffer) => void): void;
  
  /**
   * Clean up all event listeners and reset stdin state
   * 
   * Should be called when shutting down to prevent resource leaks
   */
  cleanup(): void;
  
  /**
   * Check if the process manager is currently active and handling events
   * 
   * @returns True if stdin handling is active, false otherwise
   */
  isActive(): boolean;
}

/**
 * Callback function type for handling key press events
 * 
 * @param key - Buffer containing the pressed key data
 * @since 1.0.0
 */
export interface KeyPressHandler {
  (key: Buffer): void;
}

/**
 * Production process manager with proper resource management
 * 
 * Handles real stdin/stdout operations with TTY detection, raw mode management,
 * and proper cleanup. Used in production environments where actual process
 * manipulation is required.
 * 
 * @class ProductionProcessManager
 * @implements {ProcessManager}
 * @since 1.0.0
 */
export class ProductionProcessManager implements ProcessManager {
  private listeners = new Map<string, Function>();
  private isSetup = false;

  /**
   * Setup stdin handling with proper TTY checks and raw mode configuration
   * 
   * Configures the terminal for raw input mode and sets up event listeners.
   * Includes safety checks for TTY availability and duplicate setup prevention.
   * 
   * @param callback - Function to handle incoming key press data
   * @throws {Error} When stdin configuration fails
   * 
   * @example
   * ```typescript
   * const manager = new ProductionProcessManager();
   * manager.setupStdinHandling((data) => {
   *   console.log('Key pressed:', data.toString());
   * });
   * ```
   */
  setupStdinHandling(callback: KeyPressHandler): void {
    if (this.isSetup) {
      console.warn('ProcessManager already setup, skipping duplicate setup');
      return;
    }

    if (!process.stdin.isTTY) {
      console.warn('Not a TTY environment, skipping stdin setup');
      return;
    }

    try {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      
      const handler = (data: Buffer) => callback(data);
      process.stdin.on('data', handler);
      this.listeners.set('stdin', handler);
      this.isSetup = true;
    } catch (error) {
      console.error('Failed to setup stdin handling:', error);
    }
  }

  /**
   * Clean up all listeners and reset stdin state
   * 
   * Removes all event listeners, disables raw mode, and pauses stdin.
   * Safe to call multiple times and handles errors gracefully.
   * 
   * @example
   * ```typescript
   * const manager = new ProductionProcessManager();
   * // ... use manager
   * manager.cleanup(); // Always clean up resources
   * ```
   */
  cleanup(): void {
    try {
      for (const [event, handler] of this.listeners) {
        process.stdin.removeListener(event as any, handler as any);
      }
      
      if (process.stdin.isTTY && this.isSetup) {
        process.stdin.setRawMode(false);
        process.stdin.pause();
      }
      
      this.listeners.clear();
      this.isSetup = false;
    } catch (error) {
      console.error('Failed to cleanup process manager:', error);
    }
  }

  /**
   * Check if process manager is currently active and handling stdin events
   * 
   * @returns True if stdin handling has been setup and is active
   */
  isActive(): boolean {
    return this.isSetup;
  }
}

/**
 * Test process manager that doesn't manipulate actual process
 * 
 * Mock implementation for testing environments that doesn't interact with
 * real stdin/stdout. Provides the same interface as ProductionProcessManager
 * but stores callbacks for simulation and testing.
 * 
 * @class TestProcessManager
 * @implements {ProcessManager}
 * @since 1.0.0
 */
export class TestProcessManager implements ProcessManager {
  private callbacks: KeyPressHandler[] = [];
  private active = false;

  /**
   * Setup mock stdin handling for testing
   * 
   * Stores the callback for later simulation without touching real stdin.
   * 
   * @param callback - Function to handle simulated key press data
   */
  setupStdinHandling(callback: KeyPressHandler): void {
    this.callbacks.push(callback);
    this.active = true;
  }

  /**
   * Clean up mock stdin handling
   * 
   * Clears all stored callbacks and marks the manager as inactive.
   */
  cleanup(): void {
    this.callbacks = [];
    this.active = false;
  }

  /**
   * Check if test process manager is active
   * 
   * @returns True if setup has been called and cleanup hasn't been called
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Test utility to simulate key press events
   * 
   * Triggers all registered callbacks with the provided data, simulating
   * a real key press for testing purposes.
   * 
   * @param data - Buffer containing the simulated key press data
   * 
   * @example
   * ```typescript
   * const testManager = new TestProcessManager();
   * testManager.setupStdinHandling((data) => console.log(data));
   * testManager.simulateKeyPress(Buffer.from('q')); // Simulates 'q' key press
   * ```
   */
  simulateKeyPress(data: Buffer): void {
    this.callbacks.forEach(callback => callback(data));
  }
}

/**
 * Factory function to create appropriate process manager based on environment
 * 
 * Returns TestProcessManager for test environments (NODE_ENV=test or VITEST=true)
 * and ProductionProcessManager for all other environments.
 * 
 * @returns ProcessManager instance appropriate for current environment
 * 
 * @example
 * ```typescript
 * const manager = createProcessManager();
 * manager.setupStdinHandling(handleKeyPress);
 * // ... use manager
 * manager.cleanup();
 * ```
 * 
 * @since 1.0.0
 */
export function createProcessManager(): ProcessManager {
  if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
    return new TestProcessManager();
  }
  return new ProductionProcessManager();
}

/**
 * Global process manager instance
 */
let globalProcessManager: ProcessManager | null = null;

/**
 * Get the global process manager instance (singleton pattern)
 * 
 * Lazy-initializes the global process manager on first access.
 * Ensures only one process manager exists throughout the application lifecycle.
 * 
 * @returns The global ProcessManager instance
 * 
 * @example
 * ```typescript
 * const manager = getProcessManager();
 * manager.setupStdinHandling(callback);
 * ```
 * 
 * @since 1.0.0
 */
export function getProcessManager(): ProcessManager {
  if (!globalProcessManager) {
    globalProcessManager = createProcessManager();
  }
  return globalProcessManager;
}

/**
 * Reset the global process manager (for testing)
 * 
 * Cleans up the current global process manager and sets it to null.
 * Primarily used in test environments to ensure clean state between tests.
 * 
 * @example
 * ```typescript
 * // In test setup/teardown
 * afterEach(() => {
 *   resetProcessManager();
 * });
 * ```
 * 
 * @since 1.0.0
 */
export function resetProcessManager(): void {
  if (globalProcessManager) {
    globalProcessManager.cleanup();
    globalProcessManager = null;
  }
}

/**
 * Setup graceful shutdown handling for process termination signals
 * 
 * Registers event handlers for SIGINT, SIGTERM, and exit events to ensure
 * proper cleanup of the process manager before application shutdown.
 * 
 * @example
 * ```typescript
 * // Call once during application startup
 * setupGracefulShutdown();
 * ```
 * 
 * @since 1.0.0
 */
export function setupGracefulShutdown(): void {
  const processManager = getProcessManager();
  
  const cleanup = () => {
    processManager.cleanup();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', () => processManager.cleanup());
}
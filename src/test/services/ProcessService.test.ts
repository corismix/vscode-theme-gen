import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ProcessManager,
  ProductionProcessManager,
  TestProcessManager,
  createProcessManager,
  getProcessManager,
  resetProcessManager,
  setupGracefulShutdown,
  KeyPressHandler,
} from '@/services/ProcessService';

// Mock process.stdin
const mockStdin = {
  isTTY: true,
  setRawMode: vi.fn(),
  resume: vi.fn(),
  pause: vi.fn(),
  setEncoding: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
};

// Mock process object
const mockProcess = {
  stdin: mockStdin,
  env: {},
  on: vi.fn(),
  exit: vi.fn(),
};

vi.mock('process', () => mockProcess);

describe('ProcessService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetProcessManager();
    
    // Reset mock state
    mockStdin.isTTY = true;
    mockProcess.env = {};
  });

  afterEach(() => {
    resetProcessManager();
  });

  describe('ProductionProcessManager', () => {
    let processManager: ProductionProcessManager;
    let mockCallback: KeyPressHandler;

    beforeEach(() => {
      processManager = new ProductionProcessManager();
      mockCallback = vi.fn();
    });

    afterEach(() => {
      processManager.cleanup();
    });

    describe('setupStdinHandling', () => {
      it('should setup stdin handling in TTY environment', () => {
        processManager.setupStdinHandling(mockCallback);

        expect(mockStdin.setRawMode).toHaveBeenCalledWith(true);
        expect(mockStdin.resume).toHaveBeenCalled();
        expect(mockStdin.setEncoding).toHaveBeenCalledWith('utf8');
        expect(mockStdin.on).toHaveBeenCalledWith('data', expect.any(Function));
        expect(processManager.isActive()).toBe(true);
      });

      it('should warn and skip setup in non-TTY environment', () => {
        mockStdin.isTTY = false;
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        processManager.setupStdinHandling(mockCallback);

        expect(consoleSpy).toHaveBeenCalledWith('Not a TTY environment, skipping stdin setup');
        expect(mockStdin.setRawMode).not.toHaveBeenCalled();
        expect(processManager.isActive()).toBe(false);

        consoleSpy.mockRestore();
      });

      it('should warn and skip duplicate setup', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        processManager.setupStdinHandling(mockCallback);
        processManager.setupStdinHandling(mockCallback);

        expect(consoleSpy).toHaveBeenCalledWith('ProcessManager already setup, skipping duplicate setup');
        expect(mockStdin.setRawMode).toHaveBeenCalledTimes(1);

        consoleSpy.mockRestore();
      });

      it('should handle setup errors gracefully', () => {
        mockStdin.setRawMode.mockImplementation(() => {
          throw new Error('TTY error');
        });
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        processManager.setupStdinHandling(mockCallback);

        expect(consoleSpy).toHaveBeenCalledWith('Failed to setup stdin handling:', expect.any(Error));
        expect(processManager.isActive()).toBe(false);

        consoleSpy.mockRestore();
      });

      it('should call callback when data is received', () => {
        processManager.setupStdinHandling(mockCallback);

        // Get the registered handler from the mock
        const [, handler] = mockStdin.on.mock.calls.find(call => call[0] === 'data') || [];
        expect(handler).toBeDefined();

        // Simulate data event
        const testData = Buffer.from('q');
        handler(testData);

        expect(mockCallback).toHaveBeenCalledWith(testData);
      });
    });

    describe('cleanup', () => {
      it('should clean up listeners and reset stdin state', () => {
        processManager.setupStdinHandling(mockCallback);
        processManager.cleanup();

        expect(mockStdin.removeListener).toHaveBeenCalled();
        expect(mockStdin.setRawMode).toHaveBeenCalledWith(false);
        expect(mockStdin.pause).toHaveBeenCalled();
        expect(processManager.isActive()).toBe(false);
      });

      it('should handle cleanup in non-TTY environment', () => {
        processManager.setupStdinHandling(mockCallback);
        mockStdin.isTTY = false;
        
        processManager.cleanup();

        expect(mockStdin.removeListener).toHaveBeenCalled();
        expect(processManager.isActive()).toBe(false);
      });

      it('should handle cleanup errors gracefully', () => {
        processManager.setupStdinHandling(mockCallback);
        mockStdin.removeListener.mockImplementation(() => {
          throw new Error('Cleanup error');
        });
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        processManager.cleanup();

        expect(consoleSpy).toHaveBeenCalledWith('Failed to cleanup process manager:', expect.any(Error));
        expect(processManager.isActive()).toBe(false);

        consoleSpy.mockRestore();
      });

      it('should clean up without previous setup', () => {
        expect(() => processManager.cleanup()).not.toThrow();
        expect(processManager.isActive()).toBe(false);
      });
    });

    describe('isActive', () => {
      it('should return correct active state', () => {
        expect(processManager.isActive()).toBe(false);
        
        processManager.setupStdinHandling(mockCallback);
        expect(processManager.isActive()).toBe(true);
        
        processManager.cleanup();
        expect(processManager.isActive()).toBe(false);
      });
    });
  });

  describe('TestProcessManager', () => {
    let processManager: TestProcessManager;
    let mockCallback: KeyPressHandler;

    beforeEach(() => {
      processManager = new TestProcessManager();
      mockCallback = vi.fn();
    });

    afterEach(() => {
      processManager.cleanup();
    });

    describe('setupStdinHandling', () => {
      it('should setup callback handling', () => {
        processManager.setupStdinHandling(mockCallback);

        expect(processManager.isActive()).toBe(true);
      });

      it('should support multiple callbacks', () => {
        const callback2 = vi.fn();
        
        processManager.setupStdinHandling(mockCallback);
        processManager.setupStdinHandling(callback2);

        expect(processManager.isActive()).toBe(true);
      });
    });

    describe('cleanup', () => {
      it('should clear callbacks and set inactive', () => {
        processManager.setupStdinHandling(mockCallback);
        processManager.cleanup();

        expect(processManager.isActive()).toBe(false);
      });
    });

    describe('simulateKeyPress', () => {
      it('should call all registered callbacks', () => {
        const callback2 = vi.fn();
        
        processManager.setupStdinHandling(mockCallback);
        processManager.setupStdinHandling(callback2);

        const testData = Buffer.from('q');
        processManager.simulateKeyPress(testData);

        expect(mockCallback).toHaveBeenCalledWith(testData);
        expect(callback2).toHaveBeenCalledWith(testData);
      });

      it('should handle simulation without callbacks', () => {
        const testData = Buffer.from('q');
        expect(() => processManager.simulateKeyPress(testData)).not.toThrow();
      });

      it('should handle simulation after cleanup', () => {
        processManager.setupStdinHandling(mockCallback);
        processManager.cleanup();

        const testData = Buffer.from('q');
        processManager.simulateKeyPress(testData);

        expect(mockCallback).not.toHaveBeenCalled();
      });
    });

    describe('isActive', () => {
      it('should return correct active state', () => {
        expect(processManager.isActive()).toBe(false);
        
        processManager.setupStdinHandling(mockCallback);
        expect(processManager.isActive()).toBe(true);
        
        processManager.cleanup();
        expect(processManager.isActive()).toBe(false);
      });
    });
  });

  describe('createProcessManager', () => {
    it('should create TestProcessManager in test environment', () => {
      mockProcess.env.NODE_ENV = 'test';
      const manager = createProcessManager();
      expect(manager).toBeInstanceOf(TestProcessManager);
    });

    it('should create TestProcessManager when VITEST is true', () => {
      mockProcess.env.VITEST = 'true';
      const manager = createProcessManager();
      expect(manager).toBeInstanceOf(TestProcessManager);
    });

    it('should create ProductionProcessManager in production environment', () => {
      mockProcess.env.NODE_ENV = 'production';
      const manager = createProcessManager();
      expect(manager).toBeInstanceOf(ProductionProcessManager);
    });

    it('should create ProductionProcessManager by default', () => {
      const manager = createProcessManager();
      expect(manager).toBeInstanceOf(ProductionProcessManager);
    });
  });

  describe('Global Process Manager', () => {
    describe('getProcessManager', () => {
      it('should return singleton instance', () => {
        const manager1 = getProcessManager();
        const manager2 = getProcessManager();
        expect(manager1).toBe(manager2);
      });

      it('should create new instance after reset', () => {
        const manager1 = getProcessManager();
        resetProcessManager();
        const manager2 = getProcessManager();
        expect(manager1).not.toBe(manager2);
      });
    });

    describe('resetProcessManager', () => {
      it('should clean up existing manager', () => {
        const manager = getProcessManager();
        const cleanupSpy = vi.spyOn(manager, 'cleanup');
        
        resetProcessManager();
        
        expect(cleanupSpy).toHaveBeenCalled();
      });

      it('should handle multiple resets gracefully', () => {
        resetProcessManager();
        resetProcessManager();
        resetProcessManager();
        
        expect(() => getProcessManager()).not.toThrow();
      });

      it('should handle reset without existing manager', () => {
        expect(() => resetProcessManager()).not.toThrow();
      });
    });
  });

  describe('setupGracefulShutdown', () => {
    it('should setup process signal handlers', () => {
      setupGracefulShutdown();

      expect(mockProcess.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      expect(mockProcess.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(mockProcess.on).toHaveBeenCalledWith('exit', expect.any(Function));
    });

    it('should call cleanup on SIGINT', () => {
      setupGracefulShutdown();
      
      // Get the SIGINT handler
      const sigintHandler = mockProcess.on.mock.calls.find(call => call[0] === 'SIGINT')?.[1];
      expect(sigintHandler).toBeDefined();

      const manager = getProcessManager();
      const cleanupSpy = vi.spyOn(manager, 'cleanup');
      
      // Simulate SIGINT
      sigintHandler();
      
      expect(cleanupSpy).toHaveBeenCalled();
      expect(mockProcess.exit).toHaveBeenCalledWith(0);
    });

    it('should call cleanup on SIGTERM', () => {
      setupGracefulShutdown();
      
      // Get the SIGTERM handler
      const sigtermHandler = mockProcess.on.mock.calls.find(call => call[0] === 'SIGTERM')?.[1];
      expect(sigtermHandler).toBeDefined();

      const manager = getProcessManager();
      const cleanupSpy = vi.spyOn(manager, 'cleanup');
      
      // Simulate SIGTERM
      sigtermHandler();
      
      expect(cleanupSpy).toHaveBeenCalled();
      expect(mockProcess.exit).toHaveBeenCalledWith(0);
    });

    it('should call cleanup on exit', () => {
      setupGracefulShutdown();
      
      // Get the exit handler
      const exitHandler = mockProcess.on.mock.calls.find(call => call[0] === 'exit')?.[1];
      expect(exitHandler).toBeDefined();

      const manager = getProcessManager();
      const cleanupSpy = vi.spyOn(manager, 'cleanup');
      
      // Simulate exit
      exitHandler();
      
      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should handle multiple setups gracefully', () => {
      setupGracefulShutdown();
      setupGracefulShutdown();
      
      // Should still work without errors
      expect(mockProcess.on).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle process manager interface compliance', () => {
      const testManager = new TestProcessManager();
      const productionManager = new ProductionProcessManager();
      
      // Both should implement the same interface
      const testInterface = Object.getOwnPropertyNames(Object.getPrototypeOf(testManager));
      const productionInterface = Object.getOwnPropertyNames(Object.getPrototypeOf(productionManager));
      
      expect(testInterface).toEqual(expect.arrayContaining(['setupStdinHandling', 'cleanup', 'isActive']));
      expect(productionInterface).toEqual(expect.arrayContaining(['setupStdinHandling', 'cleanup', 'isActive']));
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback: KeyPressHandler = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      
      const testManager = new TestProcessManager();
      testManager.setupStdinHandling(errorCallback);
      
      // Should not throw when callback throws
      expect(() => {
        testManager.simulateKeyPress(Buffer.from('q'));
      }).not.toThrow();
    });

    it('should handle rapid setup/cleanup cycles', () => {
      const manager = new ProductionProcessManager();
      const callback = vi.fn();
      
      // Rapid setup/cleanup cycles
      for (let i = 0; i < 10; i++) {
        manager.setupStdinHandling(callback);
        manager.cleanup();
      }
      
      expect(manager.isActive()).toBe(false);
    });

    it('should handle stdin state changes during operation', () => {
      const manager = new ProductionProcessManager();
      const callback = vi.fn();
      
      manager.setupStdinHandling(callback);
      
      // Simulate stdin becoming unavailable
      mockStdin.isTTY = false;
      
      // Should clean up gracefully
      expect(() => manager.cleanup()).not.toThrow();
      expect(manager.isActive()).toBe(false);
    });

    it('should maintain proper listener management', () => {
      const manager = new ProductionProcessManager();
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      manager.setupStdinHandling(callback1);
      
      // Second setup should warn but not add duplicate listeners
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      manager.setupStdinHandling(callback2);
      
      expect(consoleSpy).toHaveBeenCalledWith('ProcessManager already setup, skipping duplicate setup');
      expect(mockStdin.on).toHaveBeenCalledTimes(1);
      
      consoleSpy.mockRestore();
    });
  });
});
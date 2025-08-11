import { vi } from 'vitest';
import React from 'react';

export const mockInkComponents = () => {
  // Mock Ink components
  vi.mock('ink', () => ({
    Box: ({ children, ...props }: any) => React.createElement('div', { 
      'data-testid': 'box', 
      'data-props': JSON.stringify(props)
    }, children),
    
    Text: ({ children, ...props }: any) => React.createElement('span', { 
      'data-testid': 'text',
      'data-props': JSON.stringify(props)
    }, children),
    
    useInput: vi.fn((handler) => {
      // Store handler for manual triggering in tests
      (global as any).__inkInputHandler = handler;
      return {};
    }),
    
    useApp: vi.fn(() => ({
      exit: vi.fn(),
    })),
    
    render: vi.fn((element) => ({
      unmount: vi.fn(),
      rerender: vi.fn(),
      stdin: {
        write: vi.fn(),
      },
      stdout: {
        write: vi.fn(),
      },
    })),
  }));

  // Mock React Testing Library for Ink
  vi.mock('@testing-library/react', () => ({
    render: vi.fn((component) => ({
      getByTestId: vi.fn((testId) => ({
        textContent: '',
        getAttribute: vi.fn(),
      })),
      queryByTestId: vi.fn(),
      getAllByTestId: vi.fn(() => []),
      container: {
        textContent: '',
        innerHTML: '',
      },
      unmount: vi.fn(),
      rerender: vi.fn(),
    })),
    
    screen: {
      getByTestId: vi.fn(),
      queryByTestId: vi.fn(),
      getAllByTestId: vi.fn(() => []),
      getByText: vi.fn(),
      queryByText: vi.fn(),
    },
    
    fireEvent: {
      keyDown: vi.fn(),
      keyUp: vi.fn(),
      keyPress: vi.fn(),
    },
    
    waitFor: vi.fn((fn) => Promise.resolve(fn())),
    act: vi.fn((fn) => fn()),
  }));

  return {
    triggerKeyInput: (input: string, key?: any) => {
      const handler = (global as any).__inkInputHandler;
      if (handler) {
        handler(input, key || {});
      }
    },
    
    getInputHandler: () => (global as any).__inkInputHandler,
  };
};
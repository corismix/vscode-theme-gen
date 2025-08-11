import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { AppContextProvider, useAppContext, initialAppState } from '../../context/AppContext.js';
import type { AppState, ThemeConfig, ExtensionConfig } from '../../types/index.js';

describe('AppContext', () => {
  let TestComponent: React.FC;
  let contextValue: any;

  beforeEach(() => {
    contextValue = null;
    
    TestComponent = () => {
      contextValue = useAppContext();
      return React.createElement('div', { 'data-testid': 'test' }, 'test');
    };
  });

  const renderWithProvider = (initialState?: Partial<AppState>) => {
    return render(
      React.createElement(AppContextProvider, { initialState },
        React.createElement(TestComponent)
      )
    );
  };

  it('should provide initial state', () => {
    renderWithProvider();
    
    expect(contextValue).toBeDefined();
    expect(contextValue.state).toEqual(initialAppState);
    expect(contextValue.actions).toBeDefined();
  });

  it('should provide all required actions', () => {
    renderWithProvider();
    
    expect(contextValue.actions).toHaveProperty('setCurrentStep');
    expect(contextValue.actions).toHaveProperty('setSelectedFile');
    expect(contextValue.actions).toHaveProperty('setThemeConfig');
    expect(contextValue.actions).toHaveProperty('setExtensionConfig');
    expect(contextValue.actions).toHaveProperty('setGenerationResult');
    expect(contextValue.actions).toHaveProperty('resetApp');
  });

  it('should update current step', () => {
    renderWithProvider();
    
    act(() => {
      contextValue.actions.setCurrentStep('file-selection');
    });

    expect(contextValue.state.currentStep).toBe('file-selection');
  });

  it('should update selected file', () => {
    renderWithProvider();
    
    const testFile = '/test/theme.txt';
    
    act(() => {
      contextValue.actions.setSelectedFile(testFile);
    });

    expect(contextValue.state.selectedFile).toBe(testFile);
  });

  it('should update theme config', () => {
    renderWithProvider();
    
    const themeConfig: ThemeConfig = {
      name: 'Test Theme',
      displayName: 'Test Theme',
      description: 'A test theme',
      version: '1.0.0',
    };
    
    act(() => {
      contextValue.actions.setThemeConfig(themeConfig);
    });

    expect(contextValue.state.themeConfig).toEqual(themeConfig);
  });

  it('should update extension config', () => {
    renderWithProvider();
    
    const extensionConfig: ExtensionConfig = {
      displayName: 'Test Extension',
      description: 'A test extension',
      version: '1.0.0',
      publisher: 'test-publisher',
      outputPath: '/test/output',
      extensionId: 'test-publisher.test-extension',
      includeReadme: true,
      includeLicense: true,
      includeQuickstart: false,
    };
    
    act(() => {
      contextValue.actions.setExtensionConfig(extensionConfig);
    });

    expect(contextValue.state.extensionConfig).toEqual(extensionConfig);
  });

  it('should update generation result', () => {
    renderWithProvider();
    
    const generationResult = {
      files: ['package.json', 'theme.json'],
      extensionPath: '/test/output',
      themeFile: '/test/output/themes/theme.json',
    };
    
    act(() => {
      contextValue.actions.setGenerationResult(generationResult);
    });

    expect(contextValue.state.generationResult).toEqual(generationResult);
  });

  it('should reset app state', () => {
    renderWithProvider();
    
    // Set some state first
    act(() => {
      contextValue.actions.setCurrentStep('progress');
      contextValue.actions.setSelectedFile('/test/theme.txt');
    });

    expect(contextValue.state.currentStep).toBe('progress');
    expect(contextValue.state.selectedFile).toBe('/test/theme.txt');
    
    // Reset
    act(() => {
      contextValue.actions.resetApp();
    });

    expect(contextValue.state).toEqual(initialAppState);
  });

  it('should handle custom initial state', () => {
    const customInitialState: Partial<AppState> = {
      currentStep: 'file-selection',
      selectedFile: '/custom/theme.txt',
    };
    
    renderWithProvider(customInitialState);
    
    expect(contextValue.state.currentStep).toBe('file-selection');
    expect(contextValue.state.selectedFile).toBe('/custom/theme.txt');
  });

  it('should throw error when used outside provider', () => {
    // Mock console.error to avoid noise in test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(React.createElement(TestComponent));
    }).toThrow('useAppContext must be used within an AppContextProvider');

    consoleSpy.mockRestore();
  });

  it('should maintain state immutability', () => {
    renderWithProvider();
    
    const originalState = { ...contextValue.state };
    
    act(() => {
      contextValue.actions.setCurrentStep('file-selection');
    });

    // Original state should not be modified
    expect(originalState.currentStep).toBe('welcome');
    expect(contextValue.state.currentStep).toBe('file-selection');
  });
});
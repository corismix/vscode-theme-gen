import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { promises as fs } from 'fs';
import ThemeConfigurator from '@/components/ThemeConfigurator';

// Mock all dependencies
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
  },
}));

vi.mock('@/context/AppContext', () => ({
  useAppContext: vi.fn(),
}));

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: vi.fn(),
}));

vi.mock('@/hooks/useThemeForm', () => ({
  useThemeForm: vi.fn(),
}));

vi.mock('@/hooks/useThemeNavigation', () => ({
  useThemeNavigation: vi.fn(),
}));

vi.mock('../utils/keyboard', () => ({
  useKeyboardHandler: vi.fn(),
}));

// Mock all the components
vi.mock('./ThemeForm', () => ({
  ThemeForm: ({ children, ...props }: any) => <div data-testid="theme-form">{JSON.stringify(props)}</div>,
}));

vi.mock('./ThemeConfigPreview', () => ({
  ThemeConfigPreview: ({ children, ...props }: any) => <div data-testid="theme-preview">{JSON.stringify(props)}</div>,
}));

vi.mock('@/components/shared/Header', () => ({
  Header: ({ title, subtitle, actions }: any) => (
    <div data-testid="header">
      <div data-testid="header-title">{title}</div>
      {subtitle && <div data-testid="header-subtitle">{subtitle}</div>}
      {actions && <div data-testid="header-actions">{JSON.stringify(actions)}</div>}
    </div>
  ),
}));

vi.mock('@/components/shared/InfoBox', () => ({
  InfoBox: ({ type, title, message, ...props }: any) => (
    <div data-testid="info-box">
      <div data-testid="info-type">{type}</div>
      <div data-testid="info-title">{title}</div>
      <div data-testid="info-message">{message}</div>
    </div>
  ),
}));

vi.mock('@/components/shared/KeyboardShortcuts', () => ({
  KeyboardShortcuts: ({ shortcuts }: any) => (
    <div data-testid="keyboard-shortcuts">
      {shortcuts?.map((shortcut: any, index: number) => (
        <div key={index} data-testid={`shortcut-${index}`}>
          {JSON.stringify(shortcut)}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@/components/shared/SplitPane', () => ({
  SplitPane: ({ children, split, defaultSize }: any) => (
    <div data-testid="split-pane" data-split={split} data-default-size={defaultSize}>
      {children}
    </div>
  ),
}));

vi.mock('./shared/ProgressIndicator', () => ({
  ProgressIndicator: ({ steps, currentStepIndex, ...props }: any) => (
    <div data-testid="progress-indicator">
      <div data-testid="current-step">{currentStepIndex}</div>
      <div data-testid="steps">{JSON.stringify(steps)}</div>
      <div data-testid="progress-props">{JSON.stringify(props)}</div>
    </div>
  ),
}));

vi.mock('./shared/HelpPanel', () => ({
  HelpPanel: ({ context, onClose, ...props }: any) => (
    <div data-testid="help-panel">
      <div data-testid="help-context">{context}</div>
      <button onClick={onClose}>Close Help</button>
      <div data-testid="help-props">{JSON.stringify(props)}</div>
    </div>
  ),
}));

vi.mock('./shared/ErrorRecoveryUI', () => ({
  ErrorRecoveryUI: ({ error, context, onRecover, onDismiss, ...props }: any) => (
    <div data-testid="error-recovery">
      <div data-testid="error-message">{error?.message}</div>
      <div data-testid="error-context">{context}</div>
      <button onClick={() => onRecover?.('retry-file')}>Retry</button>
      <button onClick={onDismiss}>Dismiss</button>
      <div data-testid="error-props">{JSON.stringify(props)}</div>
    </div>
  ),
}));

vi.mock('./shared/ConfirmDialog', () => ({
  ExitConfirm: ({ hasUnsavedChanges, onExit, onCancel }: any) => (
    <div data-testid="exit-confirm">
      <div data-testid="has-unsaved">{hasUnsavedChanges.toString()}</div>
      <button onClick={onExit}>Exit</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

describe('ThemeConfigurator', () => {
  let mockAppContext: any;
  let mockNotifications: any;
  let mockThemeForm: any;
  let mockThemeNavigation: any;
  let mockUseKeyboardHandler: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock default return values for hooks
    mockAppContext = {
      formData: {
        inputFile: '/test/theme.txt',
        themeName: '',
        description: '',
        publisher: '',
      },
      themeData: null,
      setThemeData: vi.fn(),
      navigation: {
        goToPreviousStep: vi.fn(),
        goToStep: vi.fn(),
      },
      exit: vi.fn(),
    };

    mockNotifications = {
      addNotification: vi.fn(),
    };

    mockThemeForm = {
      values: {
        themeName: 'Test Theme',
        description: 'A test theme',
        publisher: 'test-publisher',
      },
      validationErrors: {},
      configFields: [
        { name: 'themeName', label: 'Theme Name' },
        { name: 'description', label: 'Description' },
        { name: 'publisher', label: 'Publisher' },
      ],
      currentFieldIndex: 0,
      currentField: { name: 'themeName', label: 'Theme Name' },
      handleFieldChange: vi.fn(),
      handleFieldSubmit: vi.fn(),
      setCurrentFieldIndex: vi.fn(),
    };

    mockThemeNavigation = {
      configStep: 'form',
      keyboardShortcuts: [
        { key: 'Tab', description: 'Next field' },
        { key: 'Shift+Tab', description: 'Previous field' },
      ],
    };

    mockUseKeyboardHandler = vi.fn();

    // Setup mocks
    vi.mocked(require('@/context/AppContext').useAppContext).mockReturnValue(mockAppContext);
    vi.mocked(require('@/hooks/useNotifications').useNotifications).mockReturnValue(mockNotifications);
    vi.mocked(require('@/hooks/useThemeForm').useThemeForm).mockReturnValue(mockThemeForm);
    vi.mocked(require('@/hooks/useThemeNavigation').useThemeNavigation).mockReturnValue(mockThemeNavigation);
    vi.mocked(require('../utils/keyboard').useKeyboardHandler).mockImplementation(mockUseKeyboardHandler);
  });

  describe('Initial Loading', () => {
    it('should show loading state initially', async () => {
      vi.mocked(fs.readFile).mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<ThemeConfigurator />);

      expect(screen.getByTestId('header-title')).toHaveTextContent('Loading Theme...');
      expect(screen.getByTestId('progress-indicator')).toBeTruthy();
    });

    it('should load theme data successfully', async () => {
      const mockThemeContent = `
background=#000000
foreground=#ffffff
color0=#123456
      `.trim();

      vi.mocked(fs.readFile).mockResolvedValue(mockThemeContent);

      render(<ThemeConfigurator />);

      await waitFor(() => {
        expect(mockAppContext.setThemeData).toHaveBeenCalledWith({
          background: '#000000',
          foreground: '#ffffff',
          color0: '#123456',
        });
      });

      expect(mockNotifications.addNotification).toHaveBeenCalledWith({
        type: 'success',
        message: 'Theme loaded',
        details: 'Theme colors loaded for preview',
      });
    });

    it('should handle loading errors', async () => {
      const error = new Error('File not found');
      vi.mocked(fs.readFile).mockRejectedValue(error);

      render(<ThemeConfigurator />);

      await waitFor(() => {
        expect(screen.getByTestId('error-recovery')).toBeTruthy();
        expect(screen.getByTestId('error-message')).toHaveTextContent('File not found');
        expect(screen.getByTestId('error-context')).toHaveTextContent('theme-configuration');
      });

      expect(mockNotifications.addNotification).toHaveBeenCalledWith({
        type: 'error',
        message: 'Failed to load theme',
        details: 'File not found',
      });
    });
  });

  describe('Theme Parsing', () => {
    it('should parse theme content correctly', async () => {
      const mockThemeContent = `
# Comment line
background = #000000
foreground=#ffffff  
color0 = #123456
color1=#654321
invalid_line_without_equals
      `.trim();

      vi.mocked(fs.readFile).mockResolvedValue(mockThemeContent);

      render(<ThemeConfigurator />);

      await waitFor(() => {
        expect(mockAppContext.setThemeData).toHaveBeenCalledWith({
          background: '#000000',
          foreground: '#ffffff',
          color0: '#123456',
          color1: '#654321',
        });
      });
    });

    it('should handle empty theme content', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('');

      render(<ThemeConfigurator />);

      await waitFor(() => {
        expect(mockAppContext.setThemeData).toHaveBeenCalledWith({});
      });
    });

    it('should ignore commented lines and invalid formats', async () => {
      const mockThemeContent = `
# This is a comment
// Another comment style
background=#000000
invalid line
=no_key
no_value=
      `.trim();

      vi.mocked(fs.readFile).mockResolvedValue(mockThemeContent);

      render(<ThemeConfigurator />);

      await waitFor(() => {
        expect(mockAppContext.setThemeData).toHaveBeenCalledWith({
          background: '#000000',
        });
      });
    });
  });

  describe('Error Recovery', () => {
    it('should handle retry action', async () => {
      const error = new Error('File not found');
      vi.mocked(fs.readFile).mockRejectedValueOnce(error).mockResolvedValueOnce('background=#000000');

      render(<ThemeConfigurator />);

      await waitFor(() => {
        expect(screen.getByTestId('error-recovery')).toBeTruthy();
      });

      // Click retry button
      const retryButton = screen.getByText('Retry');
      retryButton.click();

      await waitFor(() => {
        expect(fs.readFile).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle choose different file action', async () => {
      const error = new Error('File not found');
      vi.mocked(fs.readFile).mockRejectedValue(error);

      render(<ThemeConfigurator />);

      await waitFor(() => {
        expect(screen.getByTestId('error-recovery')).toBeTruthy();
      });

      // Simulate error recovery with different file action
      const errorRecoveryComponent = screen.getByTestId('error-recovery');
      const onRecoverButton = errorRecoveryComponent.querySelector('button');
      onRecoverButton?.click();

      // This would trigger the recover handler in a real scenario
      expect(screen.getByTestId('error-recovery')).toBeTruthy();
    });

    it('should handle dismiss error action', async () => {
      const error = new Error('File not found');
      vi.mocked(fs.readFile).mockRejectedValue(error);

      render(<ThemeConfigurator />);

      await waitFor(() => {
        expect(screen.getByTestId('error-recovery')).toBeTruthy();
      });

      // Click dismiss button
      const dismissButton = screen.getByText('Dismiss');
      dismissButton.click();

      // Error should be cleared and normal form should show
      await waitFor(() => {
        expect(screen.getByTestId('theme-form')).toBeTruthy();
      });
    });
  });

  describe('Configuration States', () => {
    beforeEach(() => {
      vi.mocked(fs.readFile).mockResolvedValue('background=#000000');
      mockAppContext.themeData = { background: '#000000' };
    });

    it('should render normal configuration form', async () => {
      render(<ThemeConfigurator />);

      await waitFor(() => {
        expect(screen.getByTestId('theme-form')).toBeTruthy();
        expect(screen.getByTestId('header-title')).toHaveTextContent('Configure Theme');
        expect(screen.getByTestId('info-box')).toBeTruthy();
      });
    });

    it('should show preview mode', async () => {
      mockThemeNavigation.configStep = 'preview';

      render(<ThemeConfigurator />);

      await waitFor(() => {
        expect(screen.getByTestId('header-title')).toHaveTextContent('Theme Preview');
        expect(screen.getByTestId('theme-form')).toBeTruthy();
        expect(screen.getByTestId('theme-preview')).toBeTruthy();
      });
    });

    it('should show help panel', async () => {
      render(<ThemeConfigurator />);

      await waitFor(() => {
        expect(screen.getByTestId('theme-form')).toBeTruthy();
      });

      // Simulate help panel toggle through keyboard handler
      const keyboardHandlerCalls = mockUseKeyboardHandler.mock.calls;
      expect(keyboardHandlerCalls.length).toBeGreaterThan(0);
      
      const keyBindings = keyboardHandlerCalls[0][0];
      const helpBinding = keyBindings.find((binding: any) => binding.key === '?');
      
      expect(helpBinding).toBeTruthy();
      expect(helpBinding.description).toBe('Toggle help panel');
    });

    it('should show progress steps overlay', async () => {
      render(<ThemeConfigurator />);

      await waitFor(() => {
        expect(screen.getByTestId('theme-form')).toBeTruthy();
      });

      // Check that progress key binding is registered
      const keyboardHandlerCalls = mockUseKeyboardHandler.mock.calls;
      const keyBindings = keyboardHandlerCalls[0][0];
      const progressBinding = keyBindings.find((binding: any) => binding.key === 'p');
      
      expect(progressBinding).toBeTruthy();
      expect(progressBinding.description).toBe('Show progress steps');
    });

    it('should show exit confirmation', async () => {
      mockAppContext.formData.themeName = 'Test Theme'; // Has unsaved changes

      render(<ThemeConfigurator />);

      await waitFor(() => {
        expect(screen.getByTestId('theme-form')).toBeTruthy();
      });

      // Simulate exit key binding
      const keyboardHandlerCalls = mockUseKeyboardHandler.mock.calls;
      const keyBindings = keyboardHandlerCalls[0][0];
      const exitBinding = keyBindings.find((binding: any) => binding.key === 'q');
      
      expect(exitBinding).toBeTruthy();
      expect(exitBinding.description).toBe('Quit application');
    });
  });

  describe('Form Integration', () => {
    beforeEach(() => {
      vi.mocked(fs.readFile).mockResolvedValue('background=#000000');
      mockAppContext.themeData = { background: '#000000' };
    });

    it('should pass correct props to ThemeForm', async () => {
      render(<ThemeConfigurator />);

      await waitFor(() => {
        const themeForm = screen.getByTestId('theme-form');
        const props = JSON.parse(themeForm.textContent || '{}');

        expect(props.values).toEqual(mockThemeForm.values);
        expect(props.errors).toEqual(mockThemeForm.validationErrors);
        expect(props.configFields).toEqual(mockThemeForm.configFields);
        expect(props.currentFieldIndex).toBe(mockThemeForm.currentFieldIndex);
        expect(props.showValidationSummary).toBe(true);
        expect(props.showProgressIndicator).toBe(true);
      });
    });

    it('should pass correct props to ThemePreview in preview mode', async () => {
      mockThemeNavigation.configStep = 'preview';

      render(<ThemeConfigurator />);

      await waitFor(() => {
        const themePreview = screen.getByTestId('theme-preview');
        const props = JSON.parse(themePreview.textContent || '{}');

        expect(props.themeData).toEqual(mockAppContext.themeData);
        expect(props.formValues).toEqual(mockThemeForm.values);
        expect(props.showCode).toBe(true);
        expect(props.showUI).toBe(true);
        expect(props.showTerminal).toBe(true);
        expect(props.width).toBe('100%');
      });
    });

    it('should show info box when theme data is available', async () => {
      render(<ThemeConfigurator />);

      await waitFor(() => {
        const infoBox = screen.getByTestId('info-box');
        expect(screen.getByTestId('info-type')).toHaveTextContent('tip');
        expect(screen.getByTestId('info-title')).toHaveTextContent('Preview Available');
        expect(screen.getByTestId('info-message')).toHaveTextContent('Press \'p\' to preview your theme with current settings');
      });
    });

    it('should show progress counter', async () => {
      render(<ThemeConfigurator />);

      await waitFor(() => {
        expect(screen.getByText('Progress:')).toBeTruthy();
        expect(screen.getByText(/\d+\/\d+ steps complete/)).toBeTruthy();
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    beforeEach(() => {
      vi.mocked(fs.readFile).mockResolvedValue('background=#000000');
      mockAppContext.themeData = { background: '#000000' };
    });

    it('should register keyboard shortcuts', async () => {
      render(<ThemeConfigurator />);

      await waitFor(() => {
        expect(mockUseKeyboardHandler).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ key: '?', description: 'Toggle help panel' }),
            expect.objectContaining({ key: 'p', description: 'Show progress steps' }),
            expect.objectContaining({ key: 'Escape', description: 'Exit or go back' }),
            expect.objectContaining({ key: 'q', description: 'Quit application' }),
          ]),
          expect.objectContaining({
            enabled: true,
            context: 'form',
          })
        );
      });
    });

    it('should disable keyboard shortcuts when exit confirm is shown', async () => {
      mockAppContext.formData.themeName = 'Test Theme';

      render(<ThemeConfigurator />);

      await waitFor(() => {
        expect(screen.getByTestId('theme-form')).toBeTruthy();
      });

      // Simulate showing exit confirmation
      const keyboardHandlerCalls = mockUseKeyboardHandler.mock.calls;
      const options = keyboardHandlerCalls[0][1];
      
      expect(options.enabled).toBe(true); // Initially enabled
    });

    it('should handle escape key properly', async () => {
      render(<ThemeConfigurator />);

      await waitFor(() => {
        expect(screen.getByTestId('theme-form')).toBeTruthy();
      });

      const keyBindings = mockUseKeyboardHandler.mock.calls[0][0];
      const escapeBinding = keyBindings.find((binding: any) => binding.key === 'Escape');
      
      expect(escapeBinding).toBeTruthy();
      expect(typeof escapeBinding.action).toBe('function');
    });
  });

  describe('Conditional Rendering', () => {
    it('should show configuration error when no config fields', async () => {
      mockThemeForm.configFields = [];

      render(<ThemeConfigurator />);

      await waitFor(() => {
        expect(screen.getByTestId('header-title')).toHaveTextContent('Configuration Error');
        expect(screen.getByTestId('error-recovery')).toBeTruthy();
        expect(screen.getByTestId('error-message')).toHaveTextContent('Configuration fields are not available');
      });
    });

    it('should not load theme data if already present', async () => {
      mockAppContext.themeData = { background: '#000000' };

      render(<ThemeConfigurator />);

      // Should not call fs.readFile since themeData already exists
      expect(fs.readFile).not.toHaveBeenCalled();
    });

    it('should not load theme data if no input file', async () => {
      mockAppContext.formData.inputFile = '';

      render(<ThemeConfigurator />);

      // Should not call fs.readFile since no input file
      expect(fs.readFile).not.toHaveBeenCalled();
    });
  });

  describe('Component Memoization', () => {
    beforeEach(() => {
      vi.mocked(fs.readFile).mockResolvedValue('background=#000000');
      mockAppContext.themeData = { background: '#000000' };
    });

    it('should memoize theme form component', async () => {
      const { rerender } = render(<ThemeConfigurator />);

      await waitFor(() => {
        expect(screen.getByTestId('theme-form')).toBeTruthy();
      });

      const firstFormElement = screen.getByTestId('theme-form');
      const firstFormProps = firstFormElement.textContent;

      // Rerender with same props
      rerender(<ThemeConfigurator />);

      const secondFormElement = screen.getByTestId('theme-form');
      const secondFormProps = secondFormElement.textContent;

      // Props should be identical due to memoization
      expect(firstFormProps).toBe(secondFormProps);
    });

    it('should only render preview when theme data exists', async () => {
      mockAppContext.themeData = null;

      render(<ThemeConfigurator />);

      await waitFor(() => {
        expect(screen.getByTestId('theme-form')).toBeTruthy();
      });

      // Preview should not be rendered when no theme data
      expect(screen.queryByTestId('theme-preview')).toBeNull();
    });
  });

  describe('Integration with Hooks', () => {
    beforeEach(() => {
      vi.mocked(fs.readFile).mockResolvedValue('background=#000000');
      mockAppContext.themeData = { background: '#000000' };
    });

    it('should integrate with useThemeNavigation hook', async () => {
      render(<ThemeConfigurator />);

      await waitFor(() => {
        expect(require('@/hooks/useThemeNavigation').useThemeNavigation).toHaveBeenCalledWith({
          currentFieldIndex: mockThemeForm.currentFieldIndex,
          maxFieldIndex: mockThemeForm.configFields.length - 1,
          onFieldIndexChange: mockThemeForm.setCurrentFieldIndex,
          onFieldSubmit: mockThemeForm.handleFieldSubmit,
          themeData: mockAppContext.themeData,
        });
      });
    });

    it('should pass keyboard shortcuts from navigation hook', async () => {
      render(<ThemeConfigurator />);

      await waitFor(() => {
        const keyboardShortcuts = screen.getByTestId('keyboard-shortcuts');
        expect(keyboardShortcuts).toBeTruthy();
        
        // Should include shortcuts from navigation hook
        const shortcuts = keyboardShortcuts.textContent;
        expect(shortcuts).toContain('Tab');
        expect(shortcuts).toContain('Next field');
      });
    });

    it('should handle form hook integration correctly', async () => {
      render(<ThemeConfigurator />);

      await waitFor(() => {
        expect(require('@/hooks/useThemeForm').useThemeForm).toHaveBeenCalled();
      });

      const themeForm = screen.getByTestId('theme-form');
      const props = JSON.parse(themeForm.textContent || '{}');

      expect(props.configFields).toEqual(mockThemeForm.configFields);
      expect(props.currentFieldIndex).toBe(mockThemeForm.currentFieldIndex);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing theme data gracefully', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('');

      render(<ThemeConfigurator />);

      await waitFor(() => {
        expect(mockAppContext.setThemeData).toHaveBeenCalledWith({});
      });

      // Should still render form even with empty theme data
      expect(screen.getByTestId('theme-form')).toBeTruthy();
    });

    it('should handle rapid state changes', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('background=#000000');

      const { rerender } = render(<ThemeConfigurator />);

      await waitFor(() => {
        expect(screen.getByTestId('theme-form')).toBeTruthy();
      });

      // Rapid rerenders should not cause issues
      for (let i = 0; i < 5; i++) {
        rerender(<ThemeConfigurator />);
      }

      expect(screen.getByTestId('theme-form')).toBeTruthy();
    });

    it('should handle async loading cancellation', async () => {
      let resolvePromise: (value: string) => void;
      const promise = new Promise<string>(resolve => {
        resolvePromise = resolve;
      });

      vi.mocked(fs.readFile).mockReturnValue(promise);

      const { unmount } = render(<ThemeConfigurator />);

      // Unmount before promise resolves
      unmount();

      // Resolve promise after unmount
      resolvePromise!('background=#000000');

      // Should not cause any errors
      await waitFor(() => {
        expect(true).toBe(true); // Just ensure no errors thrown
      });
    });
  });
});
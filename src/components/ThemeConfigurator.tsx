/**
 * ThemeConfigurator component for VS Code Theme Generator
 * 
 * Main configuration component that orchestrates the theme customization process.
 * Features a split-pane layout with form controls on the left and live preview
 * on the right. Uses composition patterns and custom hooks for maintainability.
 * 
 * Key Features:
 * - Split-pane interface with form and preview
 * - Custom hooks for form state, validation, and navigation
 * - Keyboard navigation and shortcuts
 * - Progress tracking for configuration steps
 * - Error recovery and help system
 * - Live theme preview updates
 * - Exit confirmation dialog
 * 
 * Architecture:
 * - Uses useThemeForm for form state management
 * - Uses useThemeNavigation for keyboard navigation
 * - Integrates with AppContext for global state
 * - Composed of focused sub-components
 * 
 * @component
 * @since 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';
import { promises as fs } from 'fs';
import { useAppContext } from '@/context/AppContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useThemeForm } from '@/hooks/useThemeForm';
import { useThemeNavigation } from '@/hooks/useThemeNavigation';
import { ThemeForm } from './ThemeForm';
import { ThemeConfigPreview } from './ThemeConfigPreview';
import { Header } from '@/components/shared/Header';
import { InfoBox } from '@/components/shared/InfoBox';
import { KeyboardShortcuts } from '@/components/shared/KeyboardShortcuts';
import { SplitPane } from '@/components/shared/SplitPane';
import { ProgressIndicator, ProgressStep } from './shared/ProgressIndicator';
import { HelpPanel } from './shared/HelpPanel';
import { ErrorRecoveryUI } from './shared/ErrorRecoveryUI';
import { ExitConfirm } from './shared/ConfirmDialog';
import { useKeyboardHandler, KeyBinding } from '../utils/keyboard';
import type { GhosttyColors } from '@/types';

// ============================================================================
// Theme Content Parser
// ============================================================================

/**
 * Parse Ghostty theme file content into structured color data
 * 
 * Parses a Ghostty theme file content string into a structured GhosttyColors object.
 * Handles comment lines and malformed entries gracefully.
 * 
 * @param content - Raw theme file content
 * @returns Parsed color definitions
 * 
 * @example
 * ```typescript
 * const colors = parseThemeContent(`
 *   background=#000000
 *   foreground=#ffffff
 *   color0=#123456
 * `);
 * ```
 * 
 * @since 1.0.0
 */
const parseThemeContent = (content: string): GhosttyColors => {
  const lines = content.split('\n');
  const colors: GhosttyColors = {};
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    
    const [key, value] = trimmed.split('=').map(s => s.trim());
    if (key && value) {
      colors[key as keyof GhosttyColors] = value;
    }
  }
  
  return colors;
};


// ============================================================================
// ThemeConfigurator Component
// ============================================================================

/**
 * ThemeConfigurator React functional component
 * 
 * Main configuration interface component that provides a comprehensive
 * theme customization experience with split-pane layout, keyboard navigation,
 * and live preview capabilities.
 * 
 * State Management:
 * - Uses custom hooks for form state and navigation
 * - Integrates with global AppContext for shared state
 * - Local state for UI controls (loading, help, confirmation)
 * 
 * User Interactions:
 * - Keyboard shortcuts for navigation and actions
 * - Form validation with real-time feedback
 * - Exit confirmation for unsaved changes
 * - Help panel with contextual information
 * 
 * @returns JSX element containing the theme configuration interface
 */
const ThemeConfigurator: React.FC = () => {
  const { formData, themeData, setThemeData, navigation, exit } = useAppContext();
  const { addNotification } = useNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [loadingError, setLoadingError] = useState<Error | null>(null);
  const [showProgressSteps, setShowProgressSteps] = useState(false);

  // Custom hooks for separated concerns
  const formHook = useThemeForm();
  const navigationHook = useThemeNavigation({
    currentFieldIndex: formHook.currentFieldIndex,
    maxFieldIndex: formHook.configFields.length - 1,
    onFieldIndexChange: formHook.setCurrentFieldIndex,
    onFieldSubmit: formHook.handleFieldSubmit,
    themeData
  });

  // Progress tracking for configuration steps
  const [configurationSteps] = useState<ProgressStep[]>([
    {
      id: 'theme-name',
      label: 'Theme Name',
      description: 'Set your theme name and display title',
      completed: !!formData.themeName,
      current: !formData.themeName
    },
    {
      id: 'description',
      label: 'Description',
      description: 'Provide theme description and metadata',
      completed: !!formData.description,
      current: false
    },
    {
      id: 'publisher',
      label: 'Publisher Info',
      description: 'Set publisher name and version',
      completed: !!formData.publisher,
      current: false
    },
    {
      id: 'options',
      label: 'Extension Options',
      description: 'Configure extension generation options',
      completed: false,
      current: false
    }
  ]);

  // Enhanced keyboard shortcuts including new UI components
  const keyBindings: KeyBinding[] = [
    {
      key: '?',
      description: 'Toggle help panel',
      action: () => setShowHelp(prev => !prev),
      category: 'panels'
    },
    {
      key: 'p',
      description: 'Show progress steps',
      action: () => setShowProgressSteps(prev => !prev),
      category: 'panels'
    },
    {
      key: 'Escape',
      description: 'Exit or go back',
      action: () => {
        if (showHelp) {
          setShowHelp(false);
        } else if (showProgressSteps) {
          setShowProgressSteps(false);
        } else {
          setShowExitConfirm(true);
        }
      },
      category: 'navigation'
    },
    {
      key: 'q',
      description: 'Quit application',
      action: () => setShowExitConfirm(true),
      category: 'actions'
    }
  ];

  useKeyboardHandler(keyBindings, {
    enabled: !showExitConfirm,
    context: 'form'
  });

  // ============================================================================
  // Theme Data Loading
  // ============================================================================

  const loadThemeData = useCallback(async () => {
    if (!formData.inputFile || themeData) return;

    try {
      setIsLoading(true);
      setLoadingError(null);
      const content = await fs.readFile(formData.inputFile, 'utf8');
      const parsedTheme = parseThemeContent(content);
      setThemeData(parsedTheme);
      
      addNotification({
        type: 'success',
        message: 'Theme loaded',
        details: 'Theme colors loaded for preview'
      });
    } catch (error) {
      const loadError = error as Error;
      setLoadingError(loadError);
      addNotification({
        type: 'error',
        message: 'Failed to load theme',
        details: loadError.message
      });
    } finally {
      setIsLoading(false);
    }
  }, [formData.inputFile, themeData, setThemeData, addNotification]);

  // Error recovery handler
  const handleErrorRecovery = useCallback(async (actionId: string) => {
    switch (actionId) {
      case 'retry-file':
        await loadThemeData();
        break;
      case 'choose-different':
        navigation.goToPreviousStep();
        break;
      case 'restart':
        setLoadingError(null);
        navigation.goToStep('welcome');
        break;
      default:
        console.log(`Recovery action not implemented: ${actionId}`);
    }
  }, [loadThemeData, navigation]);

  useEffect(() => {
    loadThemeData();
  }, [loadThemeData]);



  // ============================================================================
  // Memoized Components
  // ============================================================================

  const MemoizedThemeForm = React.useMemo(() => (
    <ThemeForm
      values={formHook.values}
      errors={formHook.validationErrors}
      configFields={formHook.configFields}
      currentFieldIndex={formHook.currentFieldIndex}
      currentField={formHook.currentField}
      onFieldChange={formHook.handleFieldChange}
      onFieldSubmit={formHook.handleFieldSubmit}
      showValidationSummary={true}
      showProgressIndicator={true}
      showCurrentFieldOnly={false}
    />
  ), [formHook]);

  const MemoizedPreview = React.useMemo(() => {
    if (!themeData) return null;
    
    return (
      <ThemeConfigPreview
        themeData={themeData}
        formValues={formHook.values}
        showCode={true}
        showUI={true}
        showTerminal={true}
        showColorPalette={false}
        showConfigSummary={true}
        width="100%"
      />
    );
  }, [themeData, formHook.values]);

  // ============================================================================
  // Render
  // ============================================================================

  // ============================================================================
  // Render Methods
  // ============================================================================

  // Exit confirmation dialog
  if (showExitConfirm) {
    return (
      <Box justifyContent="center" alignItems="center" minHeight={20}>
        <ExitConfirm
          hasUnsavedChanges={!!formData.themeName || !!formData.description}
          onExit={exit}
          onCancel={() => setShowExitConfirm(false)}
        />
      </Box>
    );
  }

  // Error recovery screen
  if (loadingError) {
    return (
      <Box justifyContent="center" alignItems="center" minHeight={20}>
        <ErrorRecoveryUI
          error={loadingError}
          context="theme-configuration"
          onRecover={handleErrorRecovery}
          onDismiss={() => setLoadingError(null)}
          showTechnicalDetails={false}
          width={80}
        />
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box flexDirection="column" minHeight={20}>
        <Header title="Loading Theme..." />
        <Box justifyContent="center" alignItems="center" flexGrow={1}>
          <ProgressIndicator
            steps={[
              { id: 'read', label: 'Reading File', completed: false, current: true },
              { id: 'parse', label: 'Parsing Colors', completed: false, current: false },
              { id: 'validate', label: 'Validating Data', completed: false, current: false }
            ]}
            currentStepIndex={0}
            showDescription={true}
            compact={true}
            width={60}
          />
        </Box>
      </Box>
    );
  }

  // Preview Mode
  if (navigationHook.configStep === 'preview' && themeData) {
    return (
      <Box flexDirection="column" minHeight={20}>
        <Header 
          title="Theme Preview" 
          subtitle={`Previewing: ${formHook.values.themeName || 'Untitled Theme'}`}
        />

        <Box flexGrow={1}>
          <SplitPane split="vertical" defaultSize="60%">
            {/* Configuration panel */}
            <Box paddingX={2} paddingY={1}>
              {MemoizedThemeForm}
            </Box>
            
            {/* Live preview panel */}
            <Box paddingX={1}>
              {MemoizedPreview}
            </Box>
          </SplitPane>
        </Box>

        <KeyboardShortcuts
          shortcuts={navigationHook.keyboardShortcuts}
        />
      </Box>
    );
  }

  // Help panel overlay
  if (showHelp) {
    return (
      <Box flexDirection="column" minHeight={20}>
        <Box justifyContent="center" alignItems="center" flexGrow={1}>
          <HelpPanel
            context="theme-config"
            showSearch={true}
            showCategories={true}
            width={90}
            height={25}
            onClose={() => setShowHelp(false)}
          />
        </Box>
      </Box>
    );
  }

  // Progress steps overlay
  if (showProgressSteps) {
    return (
      <Box flexDirection="column" minHeight={20}>
        <Header title="Configuration Progress" subtitle="Track your theme setup progress" />
        <Box justifyContent="center" alignItems="center" flexGrow={1}>
          <ProgressIndicator
            steps={configurationSteps}
            currentStepIndex={formHook.currentFieldIndex}
            showDescription={true}
            showProgress={true}
            colorScheme="vibrant"
            orientation="vertical"
            width={80}
          />
        </Box>
        <Box paddingX={2} paddingY={1} borderTop borderColor="gray">
          <Text color="gray" dimColor>
            Press 'p' again to close • '?' for help • Esc to return
          </Text>
        </Box>
      </Box>
    );
  }

  // Normal Configuration Mode
  if (formHook.configFields.length === 0) {
    return (
      <Box flexDirection="column" minHeight={20}>
        <Header title="Configuration Error" />
        <Box justifyContent="center" alignItems="center" flexGrow={1}>
          <ErrorRecoveryUI
            error={new Error('Configuration fields are not available')}
            context="initialization"
            onRecover={() => navigation.goToStep('welcome')}
            showTechnicalDetails={true}
            width={70}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" minHeight={20}>
      <Header 
        title="Configure Theme" 
        subtitle="Set up your theme metadata and properties"
        actions={[
          { label: 'Help', shortcut: '?', action: () => setShowHelp(true), icon: '❓' },
          { label: 'Progress', shortcut: 'p', action: () => setShowProgressSteps(true), icon: '📊' }
        ]}
      />
      
      <Box flexGrow={1}>
        <SplitPane split="horizontal" defaultSize="70%">
          {/* Main form area */}
          <Box paddingX={2} paddingY={1}>
            {MemoizedThemeForm}
          </Box>

          {/* Status and info area */}
          <Box flexDirection="column" paddingX={2} paddingY={1} borderTop borderColor="gray">
            {themeData && (
              <InfoBox
                type="tip"
                title="Preview Available"
                message="Press 'p' to preview your theme with current settings"
                collapsible={true}
                defaultCollapsed={false}
              />
            )}

            {/* Mini progress indicator */}
            <Box marginTop={1}>
              <Text color="cyan" bold>Progress: </Text>
              <Text color="white">
                {configurationSteps.filter(step => step.completed).length}/{configurationSteps.length} steps complete
              </Text>
            </Box>
          </Box>
        </SplitPane>
      </Box>

      <KeyboardShortcuts
        shortcuts={[...navigationHook.keyboardShortcuts, ...keyBindings]}
      />
    </Box>
  );
};

export default ThemeConfigurator;
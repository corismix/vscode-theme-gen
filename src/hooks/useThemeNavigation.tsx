/**
 * useThemeNavigation - Navigation and keyboard handling hook
 * 
 * Comprehensive navigation hook providing keyboard handling, step management,
 * and preview functionality with ProcessService integration. Manages configuration
 * steps, field navigation, and preview state with optimized user experience.
 * 
 * Features:
 * - Configuration step management (basic, advanced, preview)
 * - Keyboard navigation with standard shortcuts
 * - Preview toggle with theme data availability checking
 * - ProcessService integration for reliable keyboard handling
 * - Navigation state calculation and validation
 * - Dynamic keyboard shortcut configuration
 * - Back/forward navigation with bounds checking
 * 
 * Keyboard Shortcuts:
 * - Enter: Submit current field
 * - Tab: Navigate to next field
 * - Shift+Tab: Navigate to previous field
 * - Escape: Back navigation or exit preview
 * - P: Toggle theme preview (when available)
 * 
 * @hook
 * @since 1.0.0
 */

import { useState, useCallback, useMemo } from 'react';
import { useInput } from 'ink';
import { useAppContext } from '@/context/AppContext';
import { useNotifications } from '@/hooks/useNotifications';
import { getProcessManager } from '@/services/ProcessService';
import type { GhosttyColors } from '@/types';

export type ConfigStep = 'basic' | 'advanced' | 'preview';

export interface NavigationState {
  configStep: ConfigStep;
  showPreview: boolean;
  canNavigateBack: boolean;
  canNavigateForward: boolean;
}

export interface NavigationActions {
  setConfigStep: (step: ConfigStep) => void;
  handleBack: () => void;
  handleSkipToPreview: () => void;
  handlePreviewToggle: () => void;
  handleTabNavigation: (direction: 'forward' | 'backward') => void;
  handleEscape: () => void;
}

export interface NavigationHookReturn extends NavigationState, NavigationActions {
  keyboardShortcuts: KeyboardShortcut[];
}

export interface KeyboardShortcut {
  key: string;
  description: string;
  action: () => void;
}

export interface UseThemeNavigationProps {
  currentFieldIndex: number;
  maxFieldIndex: number;
  onFieldIndexChange: (index: number) => void;
  onFieldSubmit: () => void;
  themeData: GhosttyColors | null;
}

/**
 * Custom hook for theme navigation and keyboard handling
 * 
 * Provides comprehensive navigation management with keyboard handling,
 * step progression, and preview functionality. Integrates with ProcessService
 * for reliable input handling and provides dynamic navigation capabilities.
 * 
 * @param props - Navigation configuration object
 * @param props.currentFieldIndex - Current active field index
 * @param props.maxFieldIndex - Maximum field index for bounds checking
 * @param props.onFieldIndexChange - Callback for field index changes
 * @param props.onFieldSubmit - Callback for field submission
 * @param props.themeData - Current theme data for preview availability
 * 
 * @returns NavigationHookReturn object with state and actions
 * 
 * @example
 * ```typescript
 * const navigation = useThemeNavigation({
 *   currentFieldIndex: 0,
 *   maxFieldIndex: 4,
 *   onFieldIndexChange: (index) => setCurrentField(index),
 *   onFieldSubmit: () => handleSubmit(),
 *   themeData: parsedThemeData
 * });
 * 
 * // Use navigation state
 * if (navigation.canNavigateBack) {
 *   // Show back button
 * }
 * 
 * // Handle navigation
 * navigation.handleBack();
 * navigation.handlePreviewToggle();
 * ```
 * 
 * @since 1.0.0
 */
export const useThemeNavigation = ({
  currentFieldIndex,
  maxFieldIndex,
  onFieldIndexChange,
  onFieldSubmit,
  themeData
}: UseThemeNavigationProps): NavigationHookReturn => {
  const { navigation } = useAppContext();
  const { addNotification } = useNotifications();
  const processManager = getProcessManager();

  // Navigation state
  const [configStep, setConfigStep] = useState<ConfigStep>('basic');
  const [showPreview, setShowPreview] = useState(false);

  // Computed navigation state
  const navigationState = useMemo<NavigationState>(() => ({
    configStep,
    showPreview,
    canNavigateBack: configStep === 'preview' || currentFieldIndex > 0,
    canNavigateForward: currentFieldIndex < maxFieldIndex
  }), [configStep, showPreview, currentFieldIndex, maxFieldIndex]);

  // Navigation actions
  const handleBack = useCallback(() => {
    if (configStep === 'preview') {
      setConfigStep('basic');
      setShowPreview(false);
    } else if (currentFieldIndex > 0) {
      onFieldIndexChange(currentFieldIndex - 1);
    } else {
      navigation.goToPreviousStep();
    }
  }, [configStep, currentFieldIndex, onFieldIndexChange, navigation]);

  const handleSkipToPreview = useCallback(() => {
    if (!themeData) {
      addNotification({
        type: 'warning',
        message: 'Preview Not Available',
        details: 'Theme data not loaded yet'
      });
      return;
    }
    
    setConfigStep('preview');
    setShowPreview(true);
  }, [themeData, addNotification]);

  const handlePreviewToggle = useCallback(() => {
    if (!themeData) {
      addNotification({
        type: 'warning',
        message: 'Preview Not Available',
        details: 'Theme data not loaded yet'
      });
      return;
    }

    setShowPreview(prev => {
      const newShowPreview = !prev;
      if (newShowPreview) {
        setConfigStep('preview');
      } else {
        setConfigStep('basic');
      }
      return newShowPreview;
    });
  }, [themeData, addNotification]);

  const handleTabNavigation = useCallback((direction: 'forward' | 'backward') => {
    if (direction === 'forward' && currentFieldIndex < maxFieldIndex) {
      onFieldIndexChange(currentFieldIndex + 1);
    } else if (direction === 'backward' && currentFieldIndex > 0) {
      onFieldIndexChange(currentFieldIndex - 1);
    }
  }, [currentFieldIndex, maxFieldIndex, onFieldIndexChange]);

  const handleEscape = useCallback(() => {
    if (showPreview) {
      setShowPreview(false);
      setConfigStep('basic');
    } else {
      handleBack();
    }
  }, [showPreview, handleBack]);

  // Keyboard shortcuts configuration
  const keyboardShortcuts = useMemo<KeyboardShortcut[]>(() => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 'enter', description: 'Next field / Complete', action: onFieldSubmit },
      { key: 'tab', description: 'Next field', action: () => handleTabNavigation('forward') },
      { key: 'shift+tab', description: 'Previous field', action: () => handleTabNavigation('backward') },
      { key: 'escape', description: 'Back', action: handleEscape }
    ];

    // Add preview shortcut if theme data is available
    if (themeData) {
      shortcuts.push({
        key: 'p',
        description: configStep === 'preview' ? 'Exit preview' : 'Preview theme',
        action: handlePreviewToggle
      });
    }

    return shortcuts;
  }, [
    onFieldSubmit,
    handleTabNavigation,
    handleEscape,
    themeData,
    configStep,
    handlePreviewToggle
  ]);

  // Keyboard input handling with ProcessService integration
  useInput((input, key) => {
    // Ensure ProcessService is active for proper keyboard handling
    if (!processManager.isActive()) {
      console.warn('ProcessService not active, keyboard handling may be limited');
    }

    if (key.escape) {
      handleEscape();
    } else if (key.tab && !key.shift) {
      handleTabNavigation('forward');
    } else if (key.tab && key.shift) {
      handleTabNavigation('backward');
    } else if (input === 'p') {
      handlePreviewToggle();
    }
    // Note: Enter key is handled by the individual form components
  });

  return {
    // State
    configStep,
    showPreview,
    canNavigateBack: navigationState.canNavigateBack,
    canNavigateForward: navigationState.canNavigateForward,
    
    // Actions
    setConfigStep,
    handleBack,
    handleSkipToPreview,
    handlePreviewToggle,
    handleTabNavigation,
    handleEscape,
    
    // Keyboard shortcuts
    keyboardShortcuts,
  };
};
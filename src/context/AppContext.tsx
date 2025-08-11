/**
 * Application Context Provider for VS Code Theme Generator
 * Manages global state and provides context to all components
 */

import React, { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import { 
  ThemeGeneratorState, 
  FormData, 
  GhosttyColors, 
  GenerationResults, 
  StepName,
  STEPS,
  STEP_ORDER,
  GeneratorConfig,
  DEFAULT_THEME_DEFAULTS,
  DEFAULT_USER_PREFERENCES
} from '../utils/types';

// ============================================================================
// Context Definition
// ============================================================================

const AppContext = createContext<ThemeGeneratorState | null>(null);

// ============================================================================
// Hook for consuming context
// ============================================================================

export const useAppContext = (): ThemeGeneratorState => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppContextProvider');
  }
  return context;
};

// ============================================================================
// Provider Props
// ============================================================================

interface AppContextProviderProps {
  children: ReactNode;
  initialData?: Partial<FormData>;
}

// ============================================================================
// Initial State
// ============================================================================

const createInitialFormData = (initialData?: Partial<FormData>): FormData => ({
  inputFile: '',
  themeName: '',
  description: '',
  version: '0.0.1',
  publisher: '',
  license: 'MIT',
  outputPath: '',
  generateFullExtension: true,
  generateReadme: true,
  generateChangelog: true,
  generateQuickstart: true,
  ...initialData,
});

const createInitialConfig = (): GeneratorConfig => ({
  version: '1.0.0',
  lastModified: new Date().toISOString(),
  recentFiles: [],
  preferences: DEFAULT_USER_PREFERENCES,
  themeDefaults: DEFAULT_THEME_DEFAULTS,
});

// ============================================================================
// Provider Component
// ============================================================================

export const AppContextProvider: React.FC<AppContextProviderProps> = ({ 
  children, 
  initialData 
}) => {
  // Core State
  const [currentStep, setCurrentStep] = useState<StepName>(() => {
    if (initialData?.skipToStep) {
      return initialData.skipToStep as StepName;
    }
    return STEPS.WELCOME;
  });
  
  const [formData, setFormData] = useState<FormData>(() => 
    createInitialFormData(initialData)
  );
  
  const [themeData, setThemeData] = useState<GhosttyColors | null>(null);
  const [generationResults, setGenerationResults] = useState<GenerationResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<GeneratorConfig>(createInitialConfig);

  // ============================================================================
  // Navigation Functions
  // ============================================================================

  const goToNextStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      setCurrentStep(STEP_ORDER[currentIndex + 1]);
    }
  }, [currentStep]);

  const goToPreviousStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEP_ORDER[currentIndex - 1]);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: StepName) => {
    setCurrentStep(step);
  }, []);

  const canGoBack = currentStep !== STEPS.WELCOME && currentStep !== STEPS.PROGRESS;
  const canGoNext = currentStep !== STEPS.SUCCESS;

  // ============================================================================
  // Form Data Functions
  // ============================================================================

  const updateFormData = useCallback((updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  // ============================================================================
  // Error Handling Functions
  // ============================================================================

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================================================
  // Config Functions
  // ============================================================================

  const updateConfig = useCallback((updateFn: (config: GeneratorConfig) => GeneratorConfig) => {
    setConfig(prevConfig => updateFn(prevConfig));
  }, []);

  // ============================================================================
  // Action Functions
  // ============================================================================

  const restart = useCallback(() => {
    setCurrentStep(STEPS.WELCOME);
    setFormData(createInitialFormData());
    setThemeData(null);
    setGenerationResults(null);
    setError(null);
  }, []);

  const exit = useCallback(() => {
    process.exit(0);
  }, []);

  // ============================================================================
  // Context Value
  // ============================================================================

  const contextValue: ThemeGeneratorState = {
    // Form data
    formData,
    updateFormData,
    
    // Theme data
    themeData,
    setThemeData,
    
    // Navigation
    navigation: {
      currentStep,
      goToNextStep,
      goToPreviousStep,
      goToStep,
      canGoBack,
      canGoNext,
    },
    
    // Results
    generationResults,
    setGenerationResults,
    
    // Error handling
    error,
    handleError,
    clearError,
    
    // Configuration
    config,
    updateConfig,
    
    // Actions
    restart,
    exit,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContextProvider;
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Box, useInput, useApp } from 'ink';
import Welcome from './Welcome.js';
import FileSelector from './FileSelector.js';
import ThemeConfigurator from './ThemeConfigurator.js';
import ExtensionOptions from './ExtensionOptions.js';
import ProgressIndicator from './ProgressIndicator.js';
import SuccessScreen from './SuccessScreen.js';

const STEPS = {
  WELCOME: 'welcome',
  FILE_SELECTOR: 'fileSelector',
  THEME_CONFIG: 'themeConfig',
  EXTENSION_OPTIONS: 'extensionOptions',
  PROGRESS: 'progress',
  SUCCESS: 'success'
};

const STEP_ORDER = [
  STEPS.WELCOME,
  STEPS.FILE_SELECTOR,
  STEPS.THEME_CONFIG,
  STEPS.EXTENSION_OPTIONS,
  STEPS.PROGRESS,
  STEPS.SUCCESS
];

function App({ initialData = {} }) {
  const { exit } = useApp();
  const [currentStep, setCurrentStep] = useState(STEPS.WELCOME);
  const [formData, setFormData] = useState({
    inputFile: initialData.inputFile || '',
    themeName: initialData.themeName || '',
    description: initialData.description || '',
    version: initialData.version || '0.0.1',
    publisher: initialData.publisher || '',
    license: initialData.license || 'MIT',
    outputPath: initialData.outputPath || '',
    generateFullExtension: initialData.generateFullExtension !== false,
    generateReadme: initialData.generateReadme !== false,
    generateChangelog: initialData.generateChangelog !== false,
    generateQuickstart: initialData.generateQuickstart !== false,
    ...initialData
  });
  
  const [themeData, setThemeData] = useState(null);
  const [generationResults, setGenerationResults] = useState(null);
  const [error, setError] = useState(null);

  // Global keyboard handlers
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
    }
    
    // Allow going back with Escape (except on welcome and progress screens)
    if (key.escape && currentStep !== STEPS.WELCOME && currentStep !== STEPS.PROGRESS) {
      goToPreviousStep();
    }
  });

  const updateFormData = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const goToNextStep = () => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      setCurrentStep(STEP_ORDER[currentIndex + 1]);
    }
  };

  const goToPreviousStep = () => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEP_ORDER[currentIndex - 1]);
    }
  };

  const goToStep = (step) => {
    if (STEP_ORDER.includes(step)) {
      setCurrentStep(step);
    }
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
  };

  const clearError = () => {
    setError(null);
  };

  const restart = () => {
    setCurrentStep(STEPS.WELCOME);
    setFormData({
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
      generateQuickstart: true
    });
    setThemeData(null);
    setGenerationResults(null);
    setError(null);
  };

  const stepProps = {
    formData,
    updateFormData,
    themeData,
    setThemeData,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    handleError,
    clearError,
    error,
    generationResults,
    setGenerationResults,
    restart,
    exit
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case STEPS.WELCOME:
        return <Welcome {...stepProps} />;
      case STEPS.FILE_SELECTOR:
        return <FileSelector {...stepProps} />;
      case STEPS.THEME_CONFIG:
        return <ThemeConfigurator {...stepProps} />;
      case STEPS.EXTENSION_OPTIONS:
        return <ExtensionOptions {...stepProps} />;
      case STEPS.PROGRESS:
        return <ProgressIndicator {...stepProps} />;
      case STEPS.SUCCESS:
        return <SuccessScreen {...stepProps} />;
      default:
        return <Welcome {...stepProps} />;
    }
  };

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {renderCurrentStep()}
    </Box>
  );
}

App.propTypes = {
  initialData: PropTypes.shape({
    inputFile: PropTypes.string,
    themeName: PropTypes.string,
    description: PropTypes.string,
    version: PropTypes.string,
    publisher: PropTypes.string,
    license: PropTypes.string,
    outputPath: PropTypes.string,
    generateFullExtension: PropTypes.bool,
    generateReadme: PropTypes.bool,
    generateChangelog: PropTypes.bool,
    generateQuickstart: PropTypes.bool
  })
};


export default App;
/**
 * Theme Generator - Main orchestrator component
 *
 * Simplified orchestration layer that coordinates step components
 * and manages the overall wizard flow for VS Code theme generation.
 */

import React, { useState } from 'react';
import { Box } from 'ink';

// Import core business logic
import { parseThemeFile, buildVSCodeTheme } from '../lib/theme-generator';

// Import step components and shared types
import { FileStep, ThemeStep, OptionsStep, ProcessStep, SuccessStep, ErrorDisplay } from './steps';
import { FormData, ThemeData, Step } from './types';

/**
 * Main Theme Generator orchestrator component
 * Manages wizard state and coordinates between step components
 */
const ThemeGenerator: React.FC<{ initialData?: Partial<FormData> | undefined }> = ({
  initialData = {},
}) => {
  // Core state management
  const [currentStep, setCurrentStep] = useState<Step>('file');
  const [formData, setFormData] = useState<FormData>({
    inputFile: '',
    themeName: '',
    description: '',
    version: '0.0.1',
    publisher: '',
    license: 'MIT',
    outputPath: '',
    generateReadme: true,
    generateChangelog: true,
    ...initialData,
  });
  const [themeData, setThemeData] = useState<ThemeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Navigation handlers
  const goToNext = async () => {
    setError(null);

    if (currentStep === 'file') {
      try {
        const parsedTheme = await parseThemeFile(formData.inputFile);
        const theme = buildVSCodeTheme(parsedTheme.colors, formData.themeName || 'Custom Theme');
        setThemeData({ colors: parsedTheme.colors, theme });
        setCurrentStep('theme');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse theme file');
      }
    } else if (currentStep === 'theme') {
      setCurrentStep('options');
    } else if (currentStep === 'options') {
      setCurrentStep('process');
    }
  };

  const goToBack = () => {
    setError(null);

    if (currentStep === 'theme') {
      setCurrentStep('file');
    } else if (currentStep === 'options') {
      setCurrentStep('theme');
    } else if (currentStep === 'error') {
      setCurrentStep('file');
    }
  };

  // Outcome handlers
  const handleSuccess = () => setCurrentStep('success');

  const handleError = (errorMsg: string) => {
    setError(errorMsg);
    setCurrentStep('error');
  };

  const restart = () => {
    setCurrentStep('file');
    setFormData({
      inputFile: '',
      themeName: '',
      description: '',
      version: '0.0.1',
      publisher: '',
      license: 'MIT',
      outputPath: '',
      generateReadme: true,
      generateChangelog: true,
    });
    setThemeData(null);
    setError(null);
  };

  const exit = () => process.exit(0);

  // Step rendering logic
  const renderCurrentStep = () => {
    const commonProps = {
      formData,
      setFormData,
      error: error || undefined,
    };

    switch (currentStep) {
      case 'file':
        return <FileStep {...commonProps} onNext={goToNext} />;

      case 'theme':
        return (
          <ThemeStep {...commonProps} themeData={themeData} onNext={goToNext} onBack={goToBack} />
        );

      case 'options':
        return <OptionsStep {...commonProps} onNext={goToNext} onBack={goToBack} />;

      case 'process':
        return themeData ? (
          <ProcessStep
            formData={formData}
            themeData={themeData}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        ) : null;

      case 'success':
        return <SuccessStep formData={formData} onRestart={restart} onExit={exit} />;

      case 'error':
        return (
          <ErrorDisplay
            error={error || 'Unknown error occurred'}
            onBack={goToBack}
            onRestart={restart}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Box width='100%' minHeight={20} padding={1}>
      {renderCurrentStep()}
    </Box>
  );
};

export default ThemeGenerator;

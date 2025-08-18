/**
 * Theme Generator - Main orchestrator component
 *
 * Simplified orchestration layer that coordinates step components
 * and manages the overall wizard flow for VS Code theme generation.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

// Import core business logic
import { parseThemeFile, buildVSCodeTheme } from '../lib/theme-generator';

// Import step components and shared types
import { FileStep, ThemeStep, OptionsStep, AdvancedOptionsStep, ProcessStep, SuccessStep, ErrorDisplay } from './steps';
import { FormData, ThemeData, Step } from '@/types';

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
    generateFullExtension: true,
    generateQuickstart: true,
    preserveSourceTheme: true,
    generateGitIgnore: true,
    generateVSCodeIgnore: true,
    allowOutsideCwd: false,
    ...initialData,
  });
  const [themeData, setThemeData] = useState<ThemeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

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
      setCurrentStep('advanced');
    } else if (currentStep === 'advanced') {
      setCurrentStep('process');
    }
  };

  const goToBack = () => {
    setError(null);

    if (currentStep === 'theme') {
      setCurrentStep('file');
    } else if (currentStep === 'options') {
      setCurrentStep('theme');
    } else if (currentStep === 'advanced') {
      setCurrentStep('options');
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
      generateFullExtension: true,
      generateQuickstart: true,
      preserveSourceTheme: true,
      generateGitIgnore: true,
      generateVSCodeIgnore: true,
      allowOutsideCwd: false,
    });
    setThemeData(null);
    setError(null);
  };

  const exit = () => process.exit(0);

  // Global keyboard navigation
  useInput((input, key) => {
    // ESC key for back navigation (except on first step and terminal states)
    if (key.escape && currentStep !== 'file' && currentStep !== 'success' && currentStep !== 'process') {
      goToBack();
      return;
    }

    // ? key for help
    if (input === '?') {
      setShowHelp(!showHelp);
      return;
    }

    // Ctrl+C for graceful exit
    if (key.ctrl && input === 'c') {
      exit();
      return;
    }
  });

  // Step information helpers
  const getStepInfo = () => {
    const steps = ['file', 'theme', 'options', 'advanced', 'process'] as const;
    const currentIndex = steps.indexOf(currentStep as typeof steps[number]);
    const totalSteps = steps.length;

    return {
      currentIndex: currentIndex + 1,
      totalSteps,
      stepName: currentStep,
      canGoBack: currentStep !== 'file' && currentStep !== 'success' && currentStep !== 'process',
    };
  };

  const getStepTitle = (step: string) => {
    const titles = {
      file: 'File Selection',
      theme: 'Theme Configuration',
      options: 'Extension Options',
      advanced: 'Advanced Settings',
      process: 'Generating Theme',
      success: 'Generation Complete',
      error: 'Error Recovery',
    };
    return titles[step as keyof typeof titles] || step;
  };

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

      case 'advanced':
        return <AdvancedOptionsStep {...commonProps} onNext={goToNext} onBack={goToBack} />;

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

  const stepInfo = getStepInfo();

  return (
    <Box width='100%' minHeight={20} padding={1} flexDirection='column'>
      {/* Progress indicator - only show for main workflow steps */}
      {['file', 'theme', 'options', 'advanced', 'process'].includes(currentStep) && (
        <Box marginBottom={1} paddingX={1} borderStyle='round' borderColor='gray'>
          <Box width='100%' justifyContent='space-between'>
            <Text color='cyan'>
              Step {stepInfo.currentIndex} of {stepInfo.totalSteps}: {getStepTitle(currentStep)}
            </Text>
            <Text color='gray'>
              Progress: {'█'.repeat(stepInfo.currentIndex)}{'░'.repeat(stepInfo.totalSteps - stepInfo.currentIndex)}
            </Text>
          </Box>
        </Box>
      )}

      {/* Main step content */}
      <Box flexGrow={1}>
        {renderCurrentStep()}
      </Box>

      {/* Global navigation hints */}
      {!['success', 'process'].includes(currentStep) && (
        <Box marginTop={1} borderStyle='single' borderColor='gray' padding={1}>
          <Box flexDirection='column'>
            <Text color='gray' dimColor>
              Global shortcuts: {stepInfo.canGoBack ? 'ESC (back) • ' : ''}? (help) • Ctrl+C (exit)
            </Text>
          </Box>
        </Box>
      )}

      {/* Help overlay */}
      {showHelp && (
        <Box
          borderStyle='double'
          borderColor='yellow'
          padding={1}
          marginTop={2}
          marginBottom={2}
        >
          <Box flexDirection='column'>
            <Text color='yellow' bold>Help - VS Code Theme Generator</Text>
            <Text> </Text>
            <Text color='white'><Text bold>Current Step:</Text> {getStepTitle(currentStep)}</Text>
            <Text> </Text>
            <Text color='cyan'><Text bold>Keyboard Shortcuts:</Text></Text>
            <Text>   • <Text color='green'>Enter:</Text> Submit/Next step</Text>
            {stepInfo.canGoBack && <Text>   • <Text color='green'>ESC:</Text> Go back to previous step</Text>}
            <Text>   • <Text color='green'>?:</Text> Toggle this help</Text>
            <Text>   • <Text color='green'>Ctrl+C:</Text> Exit application</Text>
            <Text> </Text>
            <Text color='cyan'><Text bold>File Input:</Text></Text>
            <Text>   • <Text color='green'>Paste:</Text> Ctrl+V (Win/Linux) or Cmd+V (Mac)</Text>
            <Text>   • <Text color='green'>Navigate:</Text> Arrow keys, Home/End</Text>
            <Text>   • <Text color='green'>Supports:</Text> ~/paths, .txt/.toml/.conf files</Text>
            <Text> </Text>
            <Text color='gray' dimColor>Press ? again to close this help</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ThemeGenerator;

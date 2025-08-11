import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { buildTheme } from '../lib/theme-generator.js';
import { generateExtensionFiles, toPackageName } from '../lib/file-generators.js';
import { getThemeFilePath, createProgressTracker, addRecentFile } from '../lib/utils.js';
import { useResponsiveLayout } from '../lib/terminal-utils.js';
import { ResponsiveHeader, ResponsiveText } from './shared/ResponsiveText.js';
import { StatusIndicator, SuccessText, ErrorText } from './shared/AdaptiveColorText.js';
import { ProgressIndicator as ResponsiveProgressBar } from './shared/AdaptiveColorText.js';
import { UI_TEXT, A11Y_CONSTANTS } from '../lib/constants.js';
import figures from 'figures';
import fs from 'fs';
import path from 'path';

const GENERATION_STEPS = [
  { id: 'parse', name: 'Parse theme file', description: 'Reading and validating theme colors' },
  { id: 'generate', name: 'Generate theme JSON', description: 'Creating VS Code theme definition' },
  { id: 'create_dirs', name: 'Create directories', description: 'Setting up extension structure' },
  { id: 'write_theme', name: 'Write theme file', description: 'Saving theme JSON to disk' },
  { id: 'generate_files', name: 'Generate extension files', description: 'Creating package.json, README, etc.' },
  { id: 'finalize', name: 'Finalize extension', description: 'Completing extension setup' }
];

function ProgressIndicator({
  formData,
  themeData = null,
  setGenerationResults,
  goToNextStep,
  handleError
}) {
  const layout = useResponsiveLayout();
  const [currentStep, setCurrentStep] = useState(0);
  const [progressTracker] = useState(() => {
    const tracker = createProgressTracker();
    GENERATION_STEPS.forEach(step => {
      tracker.addStep(step.name, step.description);
    });
    return tracker;
  });
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState({});

  useEffect(() => {
    startGeneration();
  }, []);

  const startGeneration = async () => {
    try {
      await executeGenerationSteps();
    } catch (err) {
      setError(err.message);
      handleError(`Generation failed: ${err.message}`);
    }
  };

  const executeGenerationSteps = async () => {
    const steps = [
      parseThemeStep,
      generateThemeStep,
      createDirectoriesStep,
      writeThemeFileStep,
      generateFilesStep,
      finalizeStep
    ];

    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i);
      progressTracker.start(i);
      
      try {
        await steps[i]();
        progressTracker.complete(i);
        
        // Small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (err) {
        progressTracker.error(i, err.message);
        throw err;
      }
    }

    setIsComplete(true);
    
    // Auto-advance after a brief pause
    setTimeout(() => {
      goToNextStep();
    }, 1000);
  };

  const parseThemeStep = async () => {
    // This should already be done in ThemeConfigurator, but verify
    if (!themeData?.parsed) {
      throw new Error('Theme data not available');
    }
    
    setResults(prev => ({
      ...prev,
      parsed: themeData.parsed
    }));
  };

  const generateThemeStep = async () => {
    const theme = buildTheme(
      themeData.parsed,
      formData.inputFile,
      formData.themeName
    );
    
    setResults(prev => ({
      ...prev,
      theme
    }));
  };

  const createDirectoriesStep = async () => {
    const extensionRoot = formData.outputPath;
    const themesPath = path.join(extensionRoot, 'themes');
    const vscodePath = path.join(extensionRoot, '.vscode');
    
    await fs.promises.mkdir(extensionRoot, { recursive: true });
    await fs.promises.mkdir(themesPath, { recursive: true });
    await fs.promises.mkdir(vscodePath, { recursive: true });
    
    setResults(prev => ({
      ...prev,
      directories: { extensionRoot, themesPath, vscodePath }
    }));
  };

  const writeThemeFileStep = async () => {
    const themeFilePath = getThemeFilePath(formData.outputPath, formData.themeName);
    const themeJson = JSON.stringify(results.theme, null, 2) + '\n';
    
    await fs.promises.writeFile(themeFilePath, themeJson, 'utf8');
    
    setResults(prev => ({
      ...prev,
      themeFile: themeFilePath
    }));
  };

  const generateFilesStep = async () => {
    if (!formData.generateFullExtension) {
      return;
    }
    
    // Calculate theme file path directly instead of relying on results.themeFile
    const themeFilePath = getThemeFilePath(formData.outputPath, formData.themeName);
    
    const extensionFiles = await generateExtensionFiles(
      formData.outputPath,
      formData.themeName,
      {
        description: formData.description,
        version: formData.version,
        publisher: formData.publisher,
        license: formData.license,
        generateReadme: formData.generateReadme,
        generateChangelog: formData.generateChangelog,
        generateQuickstart: formData.generateQuickstart
      },
      path.basename(themeFilePath)
    );
    
    setResults(prev => ({
      ...prev,
      extensionFiles
    }));
  };

  const finalizeStep = async () => {
    // Add to recent files
    addRecentFile(formData.inputFile, formData.themeName);
    
    // Calculate theme file path directly
    const themeFilePath = getThemeFilePath(formData.outputPath, formData.themeName);
    
    // Set final results for next screen
    const finalResults = {
      themeName: formData.themeName,
      outputPath: formData.outputPath,
      themeFile: themeFilePath,
      extensionFiles: results.extensionFiles || [],
      totalFiles: 1 + (results.extensionFiles?.length || 0),
      packageName: toPackageName(formData.themeName)
    };
    
    setGenerationResults(finalResults);
    setResults(prev => ({
      ...prev,
      final: finalResults
    }));
  };

  const renderStepStatus = (stepIndex) => {
    const step = GENERATION_STEPS[stepIndex];
    const stepState = progressTracker.getSteps()[stepIndex];
    
    let status, icon;
    if (stepState?.status === 'completed') {
      status = 'success';
      icon = figures.tick;
    } else if (stepState?.status === 'running') {
      status = 'loading';
      icon = <Spinner type="dots" />;
    } else if (stepState?.status === 'error') {
      status = 'error';
      icon = figures.cross;
    } else {
      status = 'pending';
      icon = figures.circle;
    }
    
    // In compact mode, show less detail
    if (layout.showCompact) {
      return (
        <Box key={stepIndex} marginBottom={0}>
          <StatusIndicator
            status={status}
            text={step.name}
            showIcon={true}
          />
          {stepState?.error && (
            <ErrorText text={stepState.error} />
          )}
        </Box>
      );
    }
    
    // Full mode with descriptions
    return (
      <Box key={stepIndex} marginBottom={1}>
        <Box width={3}>
          <Text color={status === 'success' ? 'green' : status === 'error' ? 'red' : status === 'loading' ? 'blue' : 'gray'}>
            {icon}
          </Text>
        </Box>
        <Box flexDirection="column" flex={1}>
          <ResponsiveText
            text={step.name}
            color={stepState?.status === 'completed' ? 'green' : 'white'}
            bold={stepState?.status === 'running'}
          />
          <ResponsiveText
            text={step.description}
            variant="caption"
            color="gray"
          />
          {stepState?.error && (
            <ErrorText text={stepState.error} />
          )}
        </Box>
      </Box>
    );
  };

  const renderProgressSummary = () => {
    const completedSteps = progressTracker.getSteps().filter(s => s.status === 'completed').length;
    const totalSteps = GENERATION_STEPS.length;
    const progress = Math.round((completedSteps / totalSteps) * 100);
    
    return (
      <Box flexDirection="column" marginBottom={layout.showCompact ? 1 : 2}>
        <ResponsiveText
          text={`Progress: ${completedSteps}/${totalSteps} steps (${progress}%)`}
          variant="subtitle"
          color="blue"
          bold
        />
        
        {/* Responsive progress bar */}
        {!layout.showCompact && (
          <Box marginTop={1}>
            <ResponsiveProgressBar
              current={completedSteps}
              total={totalSteps}
              showPercentage={false}
              showBar={true}
              width={Math.min(layout.maxContentWidth - 10, 30)}
              role={A11Y_CONSTANTS.SEMANTIC_ROLES.PROGRESS}
              aria-label={A11Y_CONSTANTS.ARIA_LABELS.PROGRESS_BAR}
            />
          </Box>
        )}
      </Box>
    );
  };

  const renderCurrentActivity = () => {
    const borderStyle = layout.showBorders ? "round" : undefined;
    const padding = layout.showBorders ? 1 : 0;
    
    if (isComplete) {
      return (
        <Box marginTop={layout.showCompact ? 1 : 2} borderStyle={borderStyle} borderColor="green" padding={padding}>
          <SuccessText text="Generation complete! Redirecting to results..." />
        </Box>
      );
    }
    
    if (error) {
      return (
        <Box marginTop={layout.showCompact ? 1 : 2} borderStyle={borderStyle} borderColor="red" padding={padding}>
          <ErrorText text={`Generation failed: ${error}`} />
        </Box>
      );
    }
    
    const currentStepData = GENERATION_STEPS[currentStep];
    return (
      <Box marginTop={layout.showCompact ? 1 : 2} borderStyle={borderStyle} borderColor="blue" padding={padding}>
        <Box alignItems="center">
          {!layout.showCompact && (
            <Box marginRight={2}>
              <Text color="blue">
                <Spinner type="dots" />
              </Text>
            </Box>
          )}
          <StatusIndicator
            status="loading"
            text={`${currentStepData?.name}...`}
          />
        </Box>
      </Box>
    );
  };

  // Determine which steps to show based on terminal size
  const getVisibleSteps = () => {
    if (!layout.showCompact) {
      return GENERATION_STEPS.map((_, index) => index);
    }
    
    // In compact mode, show current step and a few around it
    const maxSteps = Math.max(3, layout.maxSteps);
    const start = Math.max(0, currentStep - Math.floor(maxSteps / 2));
    const end = Math.min(GENERATION_STEPS.length, start + maxSteps);
    
    return Array.from({ length: end - start }, (_, i) => start + i);
  };

  const visibleStepIndices = getVisibleSteps();

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      {/* Responsive Header */}
      <ResponsiveHeader
        title={UI_TEXT.STEP_LABELS.GENERATION}
        subtitle={UI_TEXT.STEP_DESCRIPTIONS.GENERATION}
        showBigText={false}
        color="blue"
        marginBottom={layout.showCompact ? 1 : 2}
      />

      {/* Progress summary */}
      {renderProgressSummary()}

      {/* Step list - adaptive based on terminal size */}
      <Box flexDirection="column" marginBottom={layout.showCompact ? 1 : 2}>
        {visibleStepIndices.map((stepIndex) => renderStepStatus(stepIndex))}
        
        {/* Show indicator if steps are hidden */}
        {layout.showCompact && GENERATION_STEPS.length > visibleStepIndices.length && (
          <ResponsiveText
            text={`... ${GENERATION_STEPS.length - visibleStepIndices.length} more steps`}
            variant="caption"
            color="gray"
          />
        )}
      </Box>

      {/* Current activity */}
      {renderCurrentActivity()}

      {/* Footer - only show in full mode */}
      {!layout.showCompact && (
        <Box 
          marginTop={2} 
          borderStyle={layout.showBorders ? "round" : undefined}
          borderColor="gray" 
          padding={layout.showBorders ? 1 : 0}
        >
          <Box flexDirection="column">
            <ResponsiveText
              text="Creating extension structure and files"
              variant="caption"
              color="gray"
            />
            <ResponsiveText
              text="This may take a few moments"
              variant="caption"
              color="gray"
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}

ProgressIndicator.propTypes = {
  formData: PropTypes.object.isRequired,
  themeData: PropTypes.object,
  setGenerationResults: PropTypes.func.isRequired,
  goToNextStep: PropTypes.func.isRequired,
  handleError: PropTypes.func.isRequired
};


export default ProgressIndicator;
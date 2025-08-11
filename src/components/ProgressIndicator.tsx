/**
 * ProgressIndicator component for VS Code Theme Generator
 * Shows generation progress with enhanced UI
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useAppContext } from '../context/AppContext';
import { ProgressIndicator as SharedProgressIndicator, ProgressStep } from './shared/ProgressIndicator';

// ============================================================================
// Generation Steps Configuration
// ============================================================================

const GENERATION_STEPS: ProgressStep[] = [
  {
    id: 'parse',
    label: 'Parse Theme File',
    description: 'Extracting colors from Ghostty theme file',
    completed: false,
    current: false
  },
  {
    id: 'validate',
    label: 'Validate Colors',
    description: 'Checking color format and completeness',
    completed: false,
    current: false
  },
  {
    id: 'generate-theme',
    label: 'Generate Theme',
    description: 'Creating VS Code theme JSON structure',
    completed: false,
    current: false
  },
  {
    id: 'create-files',
    label: 'Create Extension Files',
    description: 'Generating package.json, README, and other files',
    completed: false,
    current: false
  },
  {
    id: 'bundle',
    label: 'Bundle Extension',
    description: 'Packaging files into extension structure',
    completed: false,
    current: false,
    optional: true
  },
  {
    id: 'finalize',
    label: 'Finalize',
    description: 'Completing generation and cleanup',
    completed: false,
    current: false
  }
];

// ============================================================================
// Progress Animation Hook
// ============================================================================

const useProgressAnimation = (isActive: boolean) => {
  const [animationState, setAnimationState] = useState(0);
  const [loadingText, setLoadingText] = useState('');

  useEffect(() => {
    if (!isActive) return;

    const loadingTexts = [
      'Generating theme...',
      'Processing colors...',
      'Creating files...',
      'Almost done...'
    ];

    const interval = setInterval(() => {
      setAnimationState(prev => (prev + 1) % 4);
      setLoadingText(loadingTexts[animationState]);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, animationState]);

  const getSpinner = () => {
    const spinners = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    return spinners[animationState % spinners.length];
  };

  return { spinner: getSpinner(), loadingText };
};

// ============================================================================
// Main Progress Indicator Component
// ============================================================================

const ProgressIndicator: React.FC = () => {
  const { formData, themeData } = useAppContext();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<ProgressStep[]>(GENERATION_STEPS);
  const [startTime] = useState(Date.now());
  const [isGenerating, setIsGenerating] = useState(true);
  
  const { spinner, loadingText } = useProgressAnimation(isGenerating);

  // Simulate progress steps
  useEffect(() => {
    if (!isGenerating) return;

    const progressTimer = setInterval(() => {
      setSteps(prevSteps => {
        const newSteps = [...prevSteps];
        const currentStep = newSteps[currentStepIndex];
        
        if (currentStep && !currentStep.completed) {
          // Mark current step as completed
          currentStep.completed = true;
          currentStep.current = false;
          
          // Move to next step
          const nextIndex = currentStepIndex + 1;
          if (nextIndex < newSteps.length) {
            newSteps[nextIndex].current = true;
            setCurrentStepIndex(nextIndex);
          } else {
            setIsGenerating(false);
          }
        }
        
        return newSteps;
      });
    }, 2000 + Math.random() * 1000); // Randomize timing slightly

    return () => clearInterval(progressTimer);
  }, [currentStepIndex, isGenerating]);

  // Initialize first step
  useEffect(() => {
    setSteps(prevSteps => {
      const newSteps = [...prevSteps];
      if (newSteps[0]) {
        newSteps[0].current = true;
      }
      return newSteps;
    });
  }, []);

  const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
  const completedSteps = steps.filter(step => step.completed).length;
  const totalSteps = steps.length;

  return (
    <Box flexDirection="column" padding={2}>
      {/* Header */}
      <Box marginBottom={2} alignItems="center">
        <Text color="cyan" bold>
          {isGenerating ? spinner : '✅'} {isGenerating ? 'Generating Theme' : 'Generation Complete'}
        </Text>
        <Box marginLeft={2}>
          <Text color="gray" dimColor>
            {elapsedTime}s elapsed
          </Text>
        </Box>
      </Box>

      {/* Current Operation */}
      <Box marginBottom={2}>
        <Text color="white">
          {isGenerating ? loadingText : `Theme "${formData.themeName}" generated successfully!`}
        </Text>
      </Box>

      {/* Progress Indicator */}
      <Box marginBottom={2}>
        <SharedProgressIndicator
          steps={steps}
          currentStepIndex={currentStepIndex}
          showDescription={false}
          showProgress={true}
          compact={false}
          colorScheme="default"
          orientation="vertical"
          width={70}
        />
      </Box>

      {/* Generation Details */}
      <Box 
        marginBottom={2}
        borderStyle="round"
        borderColor="gray"
        paddingX={2}
        paddingY={1}
      >
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color="cyan" bold>
              📋 Generation Details:
            </Text>
          </Box>
          
          <Box alignItems="center" marginBottom={1}>
            <Text color="white">Theme Name: </Text>
            <Text color="cyanBright" bold>{formData.themeName || 'Unnamed Theme'}</Text>
          </Box>
          
          <Box alignItems="center" marginBottom={1}>
            <Text color="white">Input File: </Text>
            <Text color="gray" dimColor>{formData.inputFile ? formData.inputFile.split('/').pop() : 'Unknown'}</Text>
          </Box>
          
          <Box alignItems="center" marginBottom={1}>
            <Text color="white">Output Path: </Text>
            <Text color="gray" dimColor>{formData.outputPath || 'Current directory'}</Text>
          </Box>
          
          {themeData && (
            <Box alignItems="center">
              <Text color="white">Colors Detected: </Text>
              <Text color="green">{Object.keys(themeData).length} colors</Text>
            </Box>
          )}
        </Box>
      </Box>

      {/* Status Bar */}
      <Box 
        borderStyle="single"
        borderColor="cyan"
        paddingX={2}
        paddingY={0}
      >
        <Box justifyContent="space-between" alignItems="center">
          <Text color="cyan">
            Status: {isGenerating ? 'Processing...' : 'Complete'}
          </Text>
          <Text color="white">
            {completedSteps}/{totalSteps} steps
          </Text>
        </Box>
      </Box>

      {/* Tips while generating */}
      {isGenerating && (
        <Box marginTop={2} borderTop borderColor="gray" paddingTop={1}>
          <Text color="yellow">
            💡 Tip: Generation typically takes 10-30 seconds depending on theme complexity.
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default ProgressIndicator;
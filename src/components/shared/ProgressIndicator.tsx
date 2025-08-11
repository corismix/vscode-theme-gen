/**
 * Progress Indicator Component for VS Code Theme Generator
 * Shows current step in workflow with visual progress tracking
 */

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';

// ============================================================================
// Types
// ============================================================================

export interface ProgressStep {
  id: string;
  label: string;
  completed: boolean;
  current: boolean;
  optional?: boolean;
  description?: string;
}

export interface ProgressIndicatorProps {
  steps: ProgressStep[];
  currentStepIndex: number;
  showDescription?: boolean;
  showProgress?: boolean;
  compact?: boolean;
  colorScheme?: 'default' | 'minimal' | 'vibrant';
  orientation?: 'horizontal' | 'vertical';
  width?: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

const getStepIcon = (step: ProgressStep): string => {
  if (step.completed) return '✅';
  if (step.current) return '🔄';
  if (step.optional) return '⭕';
  return '⚪';
};

const getStepColor = (step: ProgressStep, colorScheme: string) => {
  if (step.completed) {
    return colorScheme === 'vibrant' ? 'green' : 'greenBright';
  }
  if (step.current) {
    return colorScheme === 'vibrant' ? 'cyan' : 'cyanBright';
  }
  if (step.optional) {
    return colorScheme === 'minimal' ? 'gray' : 'yellow';
  }
  return colorScheme === 'minimal' ? 'gray' : 'white';
};

const calculateProgress = (steps: ProgressStep[]): { completed: number; total: number; percentage: number } => {
  const total = steps.length;
  const completed = steps.filter(step => step.completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return { completed, total, percentage };
};

// ============================================================================
// Progress Bar Component
// ============================================================================

interface ProgressBarProps {
  percentage: number;
  width: number;
  colorScheme: string;
  compact?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ percentage, width, colorScheme, compact }) => {
  const filledWidth = Math.floor((percentage / 100) * width);
  const emptyWidth = width - filledWidth;

  const fillChar = compact ? '█' : '█';
  const emptyChar = compact ? '░' : '░';
  
  const fillColor = colorScheme === 'vibrant' ? 'green' : 'greenBright';
  const emptyColor = 'gray';

  return (
    <Box>
      <Text color={fillColor}>{fillChar.repeat(filledWidth)}</Text>
      <Text color={emptyColor}>{emptyChar.repeat(emptyWidth)}</Text>
      <Text color="white" dimColor> {percentage}%</Text>
    </Box>
  );
};

// ============================================================================
// Step Component
// ============================================================================

interface StepComponentProps {
  step: ProgressStep;
  stepNumber: number;
  colorScheme: string;
  showDescription: boolean;
  compact: boolean;
  orientation: 'horizontal' | 'vertical';
  isLast?: boolean;
}

const StepComponent: React.FC<StepComponentProps> = ({
  step,
  stepNumber,
  colorScheme,
  showDescription,
  compact,
  orientation,
  isLast = false
}) => {
  const stepColor = getStepColor(step, colorScheme);
  const stepIcon = getStepIcon(step);
  const connector = orientation === 'horizontal' ? '─' : '│';

  if (orientation === 'horizontal') {
    return (
      <Box>
        <Box alignItems="center">
          <Text color={stepColor}>{stepIcon}</Text>
          {!compact && (
            <>
              <Text color={stepColor} bold={step.current}>
                {' '}{stepNumber}.{' '}
              </Text>
              <Text 
                color={stepColor} 
                bold={step.current}
                dimColor={!step.current && !step.completed}
              >
                {step.label}
              </Text>
            </>
          )}
        </Box>
        {!isLast && (
          <Box marginLeft={compact ? 1 : 0} marginRight={compact ? 1 : 0}>
            <Text color="gray" dimColor>{connector.repeat(compact ? 1 : 3)}</Text>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box alignItems="center">
        <Text color={stepColor}>{stepIcon}</Text>
        <Text color={stepColor} bold={step.current}>
          {' '}{stepNumber}.{' '}
        </Text>
        <Text 
          color={stepColor} 
          bold={step.current}
          dimColor={!step.current && !step.completed}
        >
          {step.label}
        </Text>
        {step.optional && (
          <Text color="yellow" dimColor> (optional)</Text>
        )}
      </Box>
      
      {showDescription && step.description && (
        <Box marginLeft={4} marginTop={0}>
          <Text color="gray" dimColor>
            {step.description}
          </Text>
        </Box>
      )}
      
      {!isLast && (
        <Box marginLeft={1}>
          <Text color="gray" dimColor>{connector}</Text>
        </Box>
      )}
    </Box>
  );
};

// ============================================================================
// Main Progress Indicator Component
// ============================================================================

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  currentStepIndex,
  showDescription = false,
  showProgress = true,
  compact = false,
  colorScheme = 'default',
  orientation = 'horizontal',
  width = 50
}) => {
  const progress = useMemo(() => calculateProgress(steps), [steps]);
  
  const currentStep = useMemo(() => 
    steps.find(step => step.current) || steps[currentStepIndex],
    [steps, currentStepIndex]
  );

  // Auto-detect orientation based on terminal width
  const effectiveOrientation = useMemo(() => {
    if (orientation !== 'horizontal') return orientation;
    
    // If we have many steps or long labels, prefer vertical
    const hasLongLabels = steps.some(step => step.label.length > 15);
    const hasManySteps = steps.length > 4;
    
    return (hasLongLabels || hasManySteps) ? 'vertical' : 'horizontal';
  }, [orientation, steps]);

  if (steps.length === 0) {
    return (
      <Box padding={1}>
        <Text color="gray" dimColor>No steps defined</Text>
      </Box>
    );
  }

  return (
    <Box 
      flexDirection="column" 
      borderStyle="round" 
      borderColor="gray" 
      paddingX={2} 
      paddingY={1}
      width={width}
    >
      {/* Header */}
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          🎯 Progress {showProgress && `(${progress.completed}/${progress.total})`}
        </Text>
      </Box>

      {/* Progress Bar */}
      {showProgress && !compact && (
        <Box marginBottom={1}>
          <ProgressBar
            percentage={progress.percentage}
            width={Math.min(40, width - 4)}
            colorScheme={colorScheme}
            compact={compact}
          />
        </Box>
      )}

      {/* Current Step Highlight */}
      {currentStep && !compact && (
        <Box 
          marginBottom={1} 
          paddingX={1} 
          borderStyle="single" 
          borderColor="cyan"
        >
          <Box alignItems="center">
            <Text color="cyan" bold>Current: </Text>
            <Text color="cyanBright" bold>{currentStep.label}</Text>
          </Box>
          {showDescription && currentStep.description && (
            <Box marginTop={0}>
              <Text color="gray">{currentStep.description}</Text>
            </Box>
          )}
        </Box>
      )}

      {/* Steps List */}
      <Box 
        flexDirection={effectiveOrientation === 'horizontal' ? 'row' : 'column'}
        flexWrap={effectiveOrientation === 'horizontal' ? 'wrap' : 'nowrap'}
        alignItems={effectiveOrientation === 'horizontal' ? 'center' : 'flex-start'}
      >
        {steps.map((step, index) => (
          <StepComponent
            key={step.id}
            step={step}
            stepNumber={index + 1}
            colorScheme={colorScheme}
            showDescription={showDescription && effectiveOrientation === 'vertical'}
            compact={compact}
            orientation={effectiveOrientation}
            isLast={index === steps.length - 1}
          />
        ))}
      </Box>

      {/* Summary */}
      {!compact && (
        <Box marginTop={1} paddingTop={1} borderTop borderColor="gray">
          <Text color="gray" dimColor>
            💡 {progress.completed} of {progress.total} steps completed
            {progress.percentage === 100 && (
              <Text color="green"> ✨ All done!</Text>
            )}
          </Text>
        </Box>
      )}
    </Box>
  );
};

// ============================================================================
// Specialized Progress Indicators
// ============================================================================

/**
 * Minimal progress indicator for tight spaces
 */
export const MiniProgressIndicator: React.FC<{
  current: number;
  total: number;
  label?: string;
}> = ({ current, total, label }) => (
  <Box alignItems="center">
    <Text color="cyan">
      [{current}/{total}]
    </Text>
    {label && (
      <Text color="white" dimColor>
        {' '}{label}
      </Text>
    )}
  </Box>
);

/**
 * Circular progress indicator
 */
export const CircularProgress: React.FC<{
  percentage: number;
  size?: 'small' | 'medium' | 'large';
  showPercentage?: boolean;
}> = ({ percentage, size: _size = 'medium', showPercentage = true }) => {

  return (
    <Box alignItems="center" justifyContent="center">
      <Text color="cyan">
        {percentage < 25 && '◔'}
        {percentage >= 25 && percentage < 50 && '◑'}
        {percentage >= 50 && percentage < 75 && '◕'}
        {percentage >= 75 && '●'}
      </Text>
      {showPercentage && (
        <Text color="white" dimColor>
          {' '}{percentage}%
        </Text>
      )}
    </Box>
  );
};

export default ProgressIndicator;
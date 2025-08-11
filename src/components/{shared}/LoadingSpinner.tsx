/**
 * Loading Spinner component
 * Provides various loading indicators with messages and elapsed time
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text } from 'ink';
import { LoadingSpinnerProps } from './types';

// ============================================================================
// Color Configuration
// ============================================================================

const colors = {
  primary: '#3B82F6',
  secondary: '#8B5CF6',
  text: '#F9FAFB',
  textMuted: '#9CA3AF'
};

// ============================================================================
// Spinner Animations
// ============================================================================

const spinnerFrames = {
  spinner: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  dots: ['⠁', '⠂', '⠄', '⡀', '⢀', '⠠', '⠐', '⠈'],
  bar: ['▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'],
  pulse: ['●', '◐', '◑', '◒', '◓', '◔', '◕', '○']
};

// ============================================================================
// Elapsed Time Hook
// ============================================================================

const useElapsedTime = (showElapsed: boolean) => {
  const [startTime] = useState(() => Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!showElapsed) return;

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [startTime, showElapsed]);

  const formatElapsedTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return formatElapsedTime(elapsedTime);
};

// ============================================================================
// Animation Hook
// ============================================================================

const useSpinnerAnimation = (type: LoadingSpinnerProps['type'], duration: number = 100) => {
  const frames = spinnerFrames[type || 'spinner'];
  const [currentFrame, setCurrentFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % frames.length);
    }, duration);

    return () => clearInterval(interval);
  }, [frames.length, duration]);

  return frames[currentFrame];
};

// ============================================================================
// Progress Bar Component
// ============================================================================

interface ProgressBarProps {
  type: 'bar';
  color: string;
  size: 'small' | 'medium' | 'large';
}

const ProgressBar: React.FC<ProgressBarProps> = ({ color, size }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + Math.random() * 10;
        return next >= 100 ? 0 : next;
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  const barWidth = useMemo(() => {
    switch (size) {
      case 'small': return 20;
      case 'large': return 50;
      case 'medium':
      default: return 30;
    }
  }, [size]);

  const filledWidth = Math.floor((progress / 100) * barWidth);
  const emptyWidth = barWidth - filledWidth;

  return (
    <Box>
      <Text color={color}>
        {'█'.repeat(filledWidth)}
        {'░'.repeat(emptyWidth)}
      </Text>
      <Text color={colors.textMuted} marginLeft={1}>
        {Math.floor(progress)}%
      </Text>
    </Box>
  );
};

// ============================================================================
// Main LoadingSpinner Component
// ============================================================================

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  type = 'spinner',
  message,
  color = colors.primary,
  size = 'medium',
  duration = 100,
  showElapsedTime = false,
  className,
  testId
}) => {
  const currentFrame = useSpinnerAnimation(type, duration);
  const elapsedTime = useElapsedTime(showElapsedTime);

  // Size-based styling
  const sizeStyles = useMemo(() => {
    switch (size) {
      case 'small':
        return { spinnerScale: 1, textSize: 'small' as const };
      case 'large':
        return { spinnerScale: 2, textSize: 'large' as const };
      case 'medium':
      default:
        return { spinnerScale: 1, textSize: 'medium' as const };
    }
  }, [size]);

  // Render progress bar for bar type
  if (type === 'bar') {
    return (
      <Box
        flexDirection="column"
        alignItems="center"
        className={className}
        data-testid={testId}
      >
        <ProgressBar type={type} color={color} size={size} />
        
        {message && (
          <Box marginTop={1}>
            <Text color={colors.text}>
              {message}
            </Text>
          </Box>
        )}

        {showElapsedTime && (
          <Box marginTop={1}>
            <Text color={colors.textMuted} dimColor>
              Elapsed: {elapsedTime}
            </Text>
          </Box>
        )}
      </Box>
    );
  }

  // Render animated spinner
  return (
    <Box
      flexDirection="column"
      alignItems="center"
      className={className}
      data-testid={testId}
    >
      {/* Spinner animation */}
      <Box alignItems="center">
        <Text color={color} bold={sizeStyles.spinnerScale > 1}>
          {currentFrame}
        </Text>
        
        {message && (
          <Text color={colors.text} marginLeft={2}>
            {message}
          </Text>
        )}
      </Box>

      {/* Elapsed time */}
      {showElapsedTime && (
        <Box marginTop={1}>
          <Text color={colors.textMuted} dimColor>
            {elapsedTime}
          </Text>
        </Box>
      )}

      {/* Additional info for different types */}
      {type === 'pulse' && (
        <Box marginTop={1}>
          <Text color={colors.textMuted} dimColor>
            Processing...
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default LoadingSpinner;
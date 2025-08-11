/**
 * SplitPane component for responsive layouts
 * Enables side-by-side content display with optional resizing
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Box, Text } from 'ink';
import { SplitPaneProps } from './types';

// ============================================================================
// Color Configuration
// ============================================================================

const colors = {
  border: '#374151',
  resizer: '#6B7280',
  resizerActive: '#3B82F6',
  background: '#1F2937'
};

// ============================================================================
// Resizer Component
// ============================================================================

interface ResizerProps {
  split: 'horizontal' | 'vertical';
  isActive: boolean;
  style: 'thin' | 'thick' | 'dotted';
  color: string;
  onResize?: (delta: number) => void;
}

const Resizer: React.FC<ResizerProps> = ({ 
  split, 
  isActive, 
  style, 
  color,
  onResize 
}) => {
  const resizerChar = useMemo(() => {
    if (split === 'horizontal') {
      switch (style) {
        case 'thick': return '━';
        case 'dotted': return '┈';
        case 'thin':
        default: return '─';
      }
    } else {
      switch (style) {
        case 'thick': return '┃';
        case 'dotted': return '┊';
        case 'thin':
        default: return '│';
      }
    }
  }, [split, style]);

  if (split === 'horizontal') {
    return (
      <Box width="100%">
        <Text color={isActive ? colors.resizerActive : color}>
          {resizerChar.repeat(80)} {/* Adjust based on terminal width */}
        </Text>
      </Box>
    );
  } else {
    return (
      <Box height="100%" justifyContent="center">
        <Text color={isActive ? colors.resizerActive : color}>
          {resizerChar}
        </Text>
      </Box>
    );
  }
};

// ============================================================================
// Main SplitPane Component
// ============================================================================

const SplitPane: React.FC<SplitPaneProps> = ({
  children,
  split = 'vertical',
  defaultSize = '50%',
  minSize = 10,
  maxSize,
  allowResize = false,
  resizerStyle = 'thin',
  paneStyle = {},
  resizerColor = colors.resizer,
  className,
  testId
}) => {
  // ============================================================================
  // State Management
  // ============================================================================
  
  const [size, setSize] = useState(defaultSize);
  const [isResizing, setIsResizing] = useState(false);
  const [terminalDimensions, setTerminalDimensions] = useState({ width: 80, height: 24 });
  const resizerRef = useRef<boolean>(false);

  // ============================================================================
  // Size Calculations
  // ============================================================================
  
  const calculateSize = useCallback((sizeValue: number | string): number => {
    if (typeof sizeValue === 'number') {
      return Math.max(minSize, Math.min(maxSize || Infinity, sizeValue));
    }
    
    if (typeof sizeValue === 'string' && sizeValue.endsWith('%')) {
      const percentage = parseFloat(sizeValue) / 100;
      const dimension = split === 'horizontal' ? terminalDimensions.height : terminalDimensions.width;
      const calculatedSize = Math.floor(dimension * percentage);
      return Math.max(minSize, Math.min(maxSize || dimension, calculatedSize));
    }
    
    return Math.max(minSize, parseInt(String(sizeValue)) || 0);
  }, [minSize, maxSize, split, terminalDimensions]);

  const firstPaneSize = useMemo(() => calculateSize(size), [size, calculateSize]);
  const secondPaneSize = useMemo(() => {
    const dimension = split === 'horizontal' ? terminalDimensions.height : terminalDimensions.width;
    const remaining = dimension - firstPaneSize - (allowResize ? 1 : 0); // Account for resizer
    return Math.max(0, remaining);
  }, [split, terminalDimensions, firstPaneSize, allowResize]);

  // ============================================================================
  // Terminal Dimensions Detection
  // ============================================================================
  
  useEffect(() => {
    // In a real terminal, you'd get actual dimensions
    // For now, using reasonable defaults
    const updateDimensions = () => {
      setTerminalDimensions({
        width: process.stdout.columns || 80,
        height: process.stdout.rows || 24
      });
    };

    updateDimensions();
    
    // Listen for terminal resize events
    process.stdout.on('resize', updateDimensions);
    
    return () => {
      process.stdout.off('resize', updateDimensions);
    };
  }, []);

  // ============================================================================
  // Resize Handling
  // ============================================================================
  
  const handleResize = useCallback((delta: number) => {
    if (!allowResize) return;

    const newSize = firstPaneSize + delta;
    const dimension = split === 'horizontal' ? terminalDimensions.height : terminalDimensions.width;
    const maxAllowedSize = maxSize || dimension - minSize - 1;

    const clampedSize = Math.max(minSize, Math.min(maxAllowedSize, newSize));
    setSize(clampedSize);
  }, [allowResize, firstPaneSize, split, terminalDimensions, minSize, maxSize]);

  // ============================================================================
  // Render Helpers
  // ============================================================================
  
  const renderPane = (child: React.ReactNode, paneSize: number, isFirst: boolean) => {
    const paneProps = split === 'horizontal' 
      ? { width: '100%', height: paneSize, ...paneStyle }
      : { width: paneSize, height: '100%', ...paneStyle };

    return (
      <Box {...paneProps} flexDirection="column" overflow="hidden">
        {child}
      </Box>
    );
  };

  // ============================================================================
  // Input Validation
  // ============================================================================
  
  if (children.length !== 2) {
    return (
      <Box>
        <Text color="#EF4444">
          Error: SplitPane requires exactly 2 children
        </Text>
      </Box>
    );
  }

  // ============================================================================
  // Main Render
  // ============================================================================

  const [firstChild, secondChild] = children;

  if (split === 'horizontal') {
    return (
      <Box 
        flexDirection="column" 
        width="100%" 
        height="100%"
        className={className}
        data-testid={testId}
      >
        {/* First pane */}
        {renderPane(firstChild, firstPaneSize, true)}
        
        {/* Resizer */}
        {allowResize && (
          <Resizer
            split={split}
            isActive={isResizing}
            style={resizerStyle}
            color={resizerColor}
            onResize={handleResize}
          />
        )}
        
        {/* Second pane */}
        {renderPane(secondChild, secondPaneSize, false)}
      </Box>
    );
  } else {
    return (
      <Box 
        flexDirection="row" 
        width="100%" 
        height="100%"
        className={className}
        data-testid={testId}
      >
        {/* First pane */}
        {renderPane(firstChild, firstPaneSize, true)}
        
        {/* Resizer */}
        {allowResize && (
          <Resizer
            split={split}
            isActive={isResizing}
            style={resizerStyle}
            color={resizerColor}
            onResize={handleResize}
          />
        )}
        
        {/* Second pane */}
        {renderPane(secondChild, secondPaneSize, false)}
      </Box>
    );
  }
};

export default SplitPane;
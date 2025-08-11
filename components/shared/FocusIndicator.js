import React from 'react';
import PropTypes from 'prop-types';
import { Box, Text } from 'ink';
import { useResponsiveLayout, adaptColor, adaptText } from '../../lib/terminal-utils.js';
import figures from 'figures';

// Unified focus indicator component
function FocusIndicator({ 
  isFocused, 
  label, 
  required = false, 
  error = null,
  children,
  showBorder = true,
  variant = 'default' // 'default', 'compact', 'minimal'
}) {
  const layout = useResponsiveLayout();

  // Determine colors based on state and capabilities
  const getColor = () => {
    if (error) return adaptColor('red', layout);
    if (isFocused) return adaptColor('blue', layout);
    return adaptColor('gray', layout);
  };

  const getBorderStyle = () => {
    if (!showBorder || !layout.showBorders) return undefined;
    return isFocused ? 'round' : 'single';
  };

  const getIndicator = () => {
    if (variant === 'minimal') return '';
    
    const focused = adaptText(figures.pointer, '>', layout);
    const unfocused = adaptText(figures.bullet, '*', layout);
    
    return isFocused ? focused : unfocused;
  };

  // Compact variant for small terminals
  if (variant === 'compact' || layout.showCompact) {
    return (
      <Box flexDirection="column">
        <Box>
          <Text color={getColor()} bold={isFocused}>
            {getIndicator()} {label}
            {required && <Text color={adaptColor('red', layout)}> *</Text>}
          </Text>
          {error && (
            <Box marginLeft={1}>
              <Text color={adaptColor('red', layout)}>
                {adaptText(figures.warning, '!', layout)} {error}
              </Text>
            </Box>
          )}
        </Box>
        {children && (
          <Box 
            marginTop={layout.showCompact ? 0 : 1}
            borderStyle={getBorderStyle()}
            borderColor={getColor()}
            paddingX={showBorder && layout.showBorders ? 1 : 0}
          >
            {children}
          </Box>
        )}
      </Box>
    );
  }

  // Default variant
  return (
    <Box flexDirection="column" marginBottom={layout.showCompact ? 1 : 2}>
      <Box marginBottom={1}>
        <Text color={getColor()} bold={isFocused}>
          {getIndicator()} {label}
          {required && <Text color={adaptColor('red', layout)}> *</Text>}
        </Text>
      </Box>
      
      {children && (
        <Box 
          marginBottom={error ? 1 : 0}
          borderStyle={getBorderStyle()}
          borderColor={getColor()}
          padding={showBorder && layout.showBorders ? 1 : 0}
        >
          {children}
        </Box>
      )}
      
      {error && (
        <Box marginBottom={1}>
          <Text color={adaptColor('red', layout)}>
            {adaptText(figures.warning, '!', layout)} {error}
          </Text>
        </Box>
      )}
    </Box>
  );
}

FocusIndicator.propTypes = {
  isFocused: PropTypes.bool.isRequired,
  label: PropTypes.string.isRequired,
  required: PropTypes.bool,
  error: PropTypes.string,
  children: PropTypes.node,
  showBorder: PropTypes.bool,
  variant: PropTypes.oneOf(['default', 'compact', 'minimal'])
};


export default FocusIndicator;

// Hook for standardized keyboard navigation
export const useStandardKeyNav = (items = [], onSelect = null, onExit = null) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [showHelp, setShowHelp] = React.useState(false);
  
  const moveNext = React.useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % items.length);
  }, [items.length]);
  
  const movePrev = React.useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + items.length) % items.length);
  }, [items.length]);
  
  const select = React.useCallback(() => {
    if (onSelect && items[currentIndex]) {
      onSelect(items[currentIndex], currentIndex);
    }
  }, [onSelect, items, currentIndex]);
  
  const toggleHelp = React.useCallback(() => {
    setShowHelp(prev => !prev);
  }, []);

  // Standard keyboard shortcuts
  const keyHandler = React.useCallback((input, key) => {
    // Navigation
    if (key.tab && !key.shift) {
      moveNext();
      return;
    }
    if (key.tab && key.shift) {
      movePrev();
      return;
    }
    if (key.downArrow || key.rightArrow) {
      moveNext();
      return;
    }
    if (key.upArrow || key.leftArrow) {
      movePrev();
      return;
    }
    
    // Actions
    if (key.return && !key.shift) {
      select();
      return;
    }
    if (key.escape && onExit) {
      onExit();
      return;
    }
    if (input === 'h' || key.F1) {
      toggleHelp();
      return;
    }
    if (input === 'q' && onExit) {
      onExit();
      return;
    }
    if (input === ' ') {
      select();
      return;
    }
  }, [moveNext, movePrev, select, toggleHelp, onExit]);

  return {
    currentIndex,
    setCurrentIndex,
    showHelp,
    toggleHelp,
    keyHandler,
    navigation: {
      moveNext,
      movePrev,
      select
    }
  };
};

// Standard help text component
export function StandardHelp({ shortcuts = [], layout }) {
  if (!layout) {
    layout = useResponsiveLayout();
  }

  const defaultShortcuts = [
    { key: 'Tab', action: 'Navigate forward' },
    { key: 'Shift+Tab', action: 'Navigate backward' },
    { key: 'Enter', action: 'Confirm/Continue' },
    { key: 'Escape', action: 'Go back' },
    { key: 'h', action: 'Toggle help' },
    { key: 'Ctrl+C', action: 'Exit' }
  ];

  const allShortcuts = [...defaultShortcuts, ...shortcuts];
  const displayShortcuts = layout.showCompact ? 
    allShortcuts.slice(0, 3) : 
    allShortcuts;

  return (
    <Box 
      flexDirection="column" 
      borderStyle={layout.showBorders ? "round" : undefined}
      borderColor={adaptColor("gray", layout)}
      padding={layout.showBorders ? 1 : 0}
      marginTop={1}
    >
      <Box marginBottom={1}>
        <Text color={adaptColor("yellow", layout)} bold>
          {adaptText(figures.info, 'i', layout)} Keyboard Shortcuts
        </Text>
      </Box>
      {displayShortcuts.map((shortcut, index) => (
        <Text key={index} color={adaptColor("gray", layout)} dimColor>
          {adaptText(figures.arrowRight, '->', layout)} {shortcut.key}: {shortcut.action}
        </Text>
      ))}
      {layout.showCompact && allShortcuts.length > 3 && (
        <Text color={adaptColor("gray", layout)} dimColor>
          {adaptText(figures.ellipsis, '...', layout)} Press 'h' again for more
        </Text>
      )}
    </Box>
  );
}

StandardHelp.propTypes = {
  shortcuts: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      action: PropTypes.string.isRequired
    })
  ),
  layout: PropTypes.object
};


import React from 'react';
import PropTypes from 'prop-types';
import { Box, Text } from 'ink';
import { useResponsiveLayout, useHighContrastMode, adaptColor } from '../../lib/terminal-utils.js';
import { filterLayoutProps } from '../../lib/layout-utils.js';
import figures from 'figures';

// Color-aware text component that adapts to terminal capabilities
export const AdaptiveColorText = ({
  text,
  color = null,
  highContrastColor = null,
  fallbackColor = null,
  noColorText = null, // Alternative text when colors aren't available
  semanticColor = null, // 'success', 'error', 'warning', 'info'
  intensity = 'normal', // 'dim', 'normal', 'bright'
  children,
  ...props
}) => {
  const layout = useResponsiveLayout();
  const { preferHighContrast, getColor } = useHighContrastMode();

  // Determine the appropriate color based on capabilities
  const getAdaptiveColor = () => {
    // If no colors are supported, return undefined
    if (layout.colors === 'none') {
      return undefined;
    }

    // Handle semantic colors
    if (semanticColor) {
      const semanticMap = {
        success: 'green',
        error: 'red',
        warning: 'yellow',
        info: 'blue',
        loading: 'cyan',
        pending: 'gray'
      };
      
      const semanticColorValue = semanticMap[semanticColor];
      return getColor(
        adaptColor(semanticColorValue, layout),
        adaptColor(highContrastColor || semanticColorValue, layout)
      );
    }

    // Use explicit colors with high contrast support
    if (color) {
      return getColor(
        adaptColor(color, layout),
        adaptColor(highContrastColor || color, layout)
      );
    }

    // Fallback color
    if (fallbackColor) {
      return adaptColor(fallbackColor, layout);
    }

    return undefined;
  };

  // Get text content with color fallback
  const getDisplayText = () => {
    if (layout.colors === 'none' && noColorText) {
      return noColorText;
    }
    return text || children;
  };

  // Get text properties based on intensity
  const getTextProps = () => {
    // Filter out layout props that should not be passed to Text component
    const textProps = filterLayoutProps(props);
    
    const baseProps = {
      color: getAdaptiveColor(),
      ...textProps
    };

    switch (intensity) {
      case 'dim':
        return { ...baseProps, dimColor: true };
      case 'bright':
        return { ...baseProps, bold: true };
      default:
        return baseProps;
    }
  };

  return <Text {...getTextProps()}>{getDisplayText()}</Text>;
}

AdaptiveColorText.propTypes = {
  text: PropTypes.string,
  color: PropTypes.string,
  highContrastColor: PropTypes.string,
  fallbackColor: PropTypes.string,
  noColorText: PropTypes.string,
  semanticColor: PropTypes.oneOf(['success', 'error', 'warning', 'info', 'loading', 'pending']),
  intensity: PropTypes.oneOf(['dim', 'normal', 'bright']),
  children: PropTypes.node
};


// Status indicator with adaptive colors and symbols
export const StatusIndicator = ({
  status, // 'success', 'error', 'warning', 'info', 'loading', 'pending'
  text,
  showIcon = true,
  ...props
}) => {
  const layout = useResponsiveLayout();

  const statusConfig = {
    success: {
      color: 'green',
      icon: figures.tick,
      fallbackIcon: '✓',
      noColorIcon: '[OK]'
    },
    error: {
      color: 'red',
      icon: figures.cross,
      fallbackIcon: '✗',
      noColorIcon: '[ERR]'
    },
    warning: {
      color: 'yellow',
      icon: figures.warning,
      fallbackIcon: '!',
      noColorIcon: '[WARN]'
    },
    info: {
      color: 'blue',
      icon: figures.info,
      fallbackIcon: 'i',
      noColorIcon: '[INFO]'
    },
    loading: {
      color: 'cyan',
      icon: figures.ellipsis,
      fallbackIcon: '...',
      noColorIcon: '[...]'
    },
    pending: {
      color: 'gray',
      icon: figures.bullet,
      fallbackIcon: '*',
      noColorIcon: '[ ]'
    }
  };

  const config = statusConfig[status] || statusConfig.info;
  
  const getIcon = () => {
    if (!showIcon) return '';
    
    if (layout.colors === 'none') {
      return config.noColorIcon + ' ';
    }
    
    const icon = layout.unicode ? config.icon : config.fallbackIcon;
    return icon + ' ';
  };

  return (
    <AdaptiveColorText
      text={getIcon() + text}
      semanticColor={status}
      {...props}
    />
  );
}

StatusIndicator.propTypes = {
  status: PropTypes.oneOf(['success', 'error', 'warning', 'info', 'loading', 'pending']).isRequired,
  text: PropTypes.string.isRequired,
  showIcon: PropTypes.bool
};


// Progress indicator with adaptive styling
export const ProgressIndicator = ({
  current = 0,
  total = 100,
  label = null,
  showPercentage = true,
  showBar = true,
  width = null,
  ...props
}) => {
  const layout = useResponsiveLayout();
  
  const percentage = Math.min(Math.max(current / total, 0), 1);
  const barWidth = width || Math.min(layout.maxContentWidth - 20, 40);
  
  // Determine progress bar style based on capabilities
  const getProgressBar = () => {
    if (!showBar || layout.showCompact) return '';
    
    const filled = Math.floor(percentage * barWidth);
    const empty = barWidth - filled;
    
    if (layout.unicode && layout.colors !== 'none') {
      return `${'█'.repeat(filled)}${'░'.repeat(empty)}`;
    } else {
      return `${'#'.repeat(filled)}${'-'.repeat(empty)}`;
    }
  };

  const getProgressText = () => {
    const parts = [];
    
    if (label) {
      parts.push(label);
    }
    
    if (showBar) {
      parts.push(getProgressBar());
    }
    
    if (showPercentage) {
      parts.push(`${Math.round(percentage * 100)}%`);
    }
    
    return parts.join(' ');
  };

  return (
    <Box {...props}>
      <AdaptiveColorText
        text={getProgressText()}
        semanticColor="info"
      />
    </Box>
  );
}

ProgressIndicator.propTypes = {
  current: PropTypes.number,
  total: PropTypes.number,
  label: PropTypes.string,
  showPercentage: PropTypes.bool,
  showBar: PropTypes.bool,
  width: PropTypes.number
};


// Color sample display with fallbacks
export const ColorSample = ({
  color,
  label = null,
  size = 'normal', // 'small', 'normal', 'large'
  showHex = false,
  fallbackText = null,
  ...props
}) => {
  const layout = useResponsiveLayout();
  
  // If no color support, show fallback
  if (layout.colors === 'none') {
    const displayText = fallbackText || label || color;
    // Filter out layout props that should not be passed to Text component
    const textProps = filterLayoutProps(props);
    
    return (
      <Text {...textProps}>
        [{displayText}]
      </Text>
    );
  }

  const getSampleSize = () => {
    switch (size) {
      case 'small':
        return layout.showCompact ? 1 : 2;
      case 'large':
        return layout.showCompact ? 3 : 5;
      default:
        return layout.showCompact ? 2 : 3;
    }
  };

  const sampleWidth = getSampleSize();
  const sample = '█'.repeat(sampleWidth);

  return (
    <Box flexDirection="row" {...props}>
      <Text color={color}>
        {sample}
      </Text>
      {label && (
        <Box marginLeft={1}>
          <Text>
            {label}
            {showHex && color && (
              <Text dimColor> ({color})</Text>
            )}
          </Text>
        </Box>
      )}
    </Box>
  );
}

ColorSample.propTypes = {
  color: PropTypes.string,
  label: PropTypes.string,
  size: PropTypes.oneOf(['small', 'normal', 'large']),
  showHex: PropTypes.bool,
  fallbackText: PropTypes.string
};


// Semantic text components for common use cases
export const SuccessText = (props) => (
  <AdaptiveColorText semanticColor="success" {...props} />
);

export const ErrorText = (props) => (
  <AdaptiveColorText semanticColor="error" {...props} />
);

export const WarningText = (props) => (
  <AdaptiveColorText semanticColor="warning" {...props} />
);

export const InfoText = (props) => (
  <AdaptiveColorText semanticColor="info" {...props} />
);

// Gradient text fallback for terminals without color support
export const AdaptiveGradient = ({
  text,
  colors = ['blue', 'cyan'],
  fallbackColor = 'blue',
  noColorText = null,
  children,
  ...props
}) => {
  const layout = useResponsiveLayout();
  
  // If we have text, render just the text with color
  if (text || noColorText) {
    // If no color support, use fallback
    if (layout.colors === 'none') {
      return (
        <AdaptiveColorText
          text={noColorText || text}
          color={fallbackColor}
          {...props}
        />
      );
    }

    // If basic color support, use first color
    if (layout.colors === 'basic') {
      return (
        <AdaptiveColorText
          text={text}
          color={colors[0] || fallbackColor}
          {...props}
        />
      );
    }

    // For full color support, use the primary color with bright intensity
    return (
      <AdaptiveColorText
        text={text}
        color={colors[0] || fallbackColor}
        intensity="bright"
        {...props}
      />
    );
  }

  // If we have children, render them in a Box (can't nest Box in Text)
  if (children) {
    return (
      <Box {...props}>
        {children}
      </Box>
    );
  }
  
  return null;
}

AdaptiveGradient.propTypes = {
  text: PropTypes.string,
  colors: PropTypes.arrayOf(PropTypes.string),
  fallbackColor: PropTypes.string,
  noColorText: PropTypes.string,
  children: PropTypes.node
};


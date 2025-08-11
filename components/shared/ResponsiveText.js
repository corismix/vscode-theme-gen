import React from 'react';
import PropTypes from 'prop-types';
import { Box, Text } from 'ink';
import BigText from 'ink-big-text';
import { useResponsiveLayout, adaptColor, adaptText } from '../../lib/terminal-utils.js';
import { filterLayoutProps } from '../../lib/layout-utils.js';

// Responsive text component that adapts based on terminal size
export const ResponsiveText = ({
  text,
  fallbackText = null,
  variant = 'normal', // 'big', 'title', 'subtitle', 'body', 'caption', 'normal'
  color = null,
  bold = false,
  dimColor = false,
  wrap = 'wrap', // 'wrap', 'truncate', 'truncate-start', 'truncate-middle'
  maxLength = null,
  ...props
}) => {
  const layout = useResponsiveLayout();
  
  // Determine if we should use big text
  const shouldUseBigText = variant === 'big' && layout.useBigText && text.length <= 20;
  
  // Get responsive text content
  const getDisplayText = () => {
    let displayText = text;
    
    // Use fallback in compact mode if provided
    if (layout.showCompact && fallbackText) {
      displayText = fallbackText;
    }
    
    // Apply text adaptations for unicode support
    displayText = adaptText(displayText, displayText, layout);
    
    // Handle text length constraints
    if (maxLength || layout.maxContentWidth) {
      const limit = maxLength || Math.max(layout.maxContentWidth - 4, 20);
      
      switch (wrap) {
        case 'truncate':
          if (displayText.length > limit) {
            displayText = displayText.slice(0, limit - 1) + (layout.unicode ? '…' : '...');
          }
          break;
          
        case 'truncate-start':
          if (displayText.length > limit) {
            displayText = (layout.unicode ? '…' : '...') + displayText.slice(-(limit - 1));
          }
          break;
          
        case 'truncate-middle':
          if (displayText.length > limit) {
            const half = Math.floor((limit - 3) / 2);
            const ellipsis = layout.unicode ? '…' : '...';
            displayText = displayText.slice(0, half) + ellipsis + displayText.slice(-half);
          }
          break;
          
        default:
          // wrap - let Ink handle natural wrapping
          break;
      }
    }
    
    return displayText;
  };

  // Get responsive color
  const getColor = () => {
    return adaptColor(color, layout);
  };

  // Get text style based on variant
  const getTextProps = () => {
    // Filter out layout props that should not be passed to Text component
    const textProps = filterLayoutProps(props);
    
    const baseProps = {
      color: getColor(),
      bold,
      dimColor,
      ...textProps
    };

    switch (variant) {
      case 'title':
        return {
          ...baseProps,
          bold: true,
          color: getColor() || adaptColor('blue', layout)
        };
        
      case 'subtitle':
        return {
          ...baseProps,
          color: getColor() || adaptColor('cyan', layout)
        };
        
      case 'caption':
        return {
          ...baseProps,
          dimColor: true,
          color: getColor() || adaptColor('gray', layout)
        };
        
      default:
        return baseProps;
    }
  };

  const displayText = getDisplayText();
  const textProps = getTextProps();

  // Use BigText for large displays when appropriate
  if (shouldUseBigText) {
    return (
      <Box>
        <BigText 
          text={displayText} 
          font={layout.columns >= 100 ? "block" : "tiny"}
        />
      </Box>
    );
  }

  // Standard text rendering
  return <Text {...textProps}>{displayText}</Text>;
};

ResponsiveText.propTypes = {
  text: PropTypes.string.isRequired,
  fallbackText: PropTypes.string,
  variant: PropTypes.oneOf(['big', 'title', 'subtitle', 'body', 'caption', 'normal']),
  color: PropTypes.string,
  bold: PropTypes.bool,
  dimColor: PropTypes.bool,
  wrap: PropTypes.oneOf(['wrap', 'truncate', 'truncate-start', 'truncate-middle']),
  maxLength: PropTypes.number
};

// Responsive header component
export const ResponsiveHeader = ({ 
  title, 
  subtitle = null, 
  showBigText = true,
  color = 'blue',
  ...props 
}) => {
  const layout = useResponsiveLayout();

  return (
    <Box flexDirection="column" marginBottom={layout.showCompact ? 1 : 2} {...props}>
      <ResponsiveText
        text={title}
        variant={showBigText ? 'big' : 'title'}
        color={color}
        bold={!showBigText}
      />
      {subtitle && (
        <Box marginTop={layout.showCompact ? 0 : 1}>
          <ResponsiveText
            text={subtitle}
            variant="subtitle"
            color="cyan"
          />
        </Box>
      )}
    </Box>
  );
};

ResponsiveHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  showBigText: PropTypes.bool,
  color: PropTypes.string
};

// Responsive description with automatic line breaking
export const ResponsiveDescription = ({ 
  lines, 
  color = 'gray',
  compact = null,
  maxLines = null,
  ...props 
}) => {
  const layout = useResponsiveLayout();
  
  // Use compact mode if specified or if terminal is compact
  const useCompact = compact !== null ? compact : layout.showCompact;
  
  // Determine how many lines to show
  const displayLines = Array.isArray(lines) ? lines : [lines];
  const lineLimit = maxLines !== null ? maxLines : (useCompact ? 1 : displayLines.length);
  
  // In compact mode or when maxLines is 1, join lines into single text to prevent duplication
  if (lineLimit === 1 && displayLines.length > 1) {
    const joinedText = displayLines.join(' ');
    return (
      <Box flexDirection="column" marginBottom={useCompact ? 1 : 2} {...props}>
        <ResponsiveText
          text={joinedText}
          color={color}
          wrap="wrap"
          maxLength={layout.maxContentWidth}
        />
      </Box>
    );
  }
  
  // Standard multi-line display
  const visibleLines = displayLines.slice(0, lineLimit);
  
  return (
    <Box flexDirection="column" marginBottom={useCompact ? 1 : 2} {...props}>
      {visibleLines.map((line, index) => (
        <ResponsiveText
          key={index}
          text={line}
          color={color}
          wrap="wrap"
          maxLength={layout.maxContentWidth}
        />
      ))}
      {displayLines.length > lineLimit && (
        <ResponsiveText
          text={adaptText('…more', '...more', layout)}
          color={adaptColor('gray', layout)}
          dimColor
        />
      )}
    </Box>
  );
}

// Responsive list component
export const ResponsiveList = ({ 
  items, 
  icon = null,
  color = 'green',
  maxItems = null,
  showCount = false,
  ...props 
}) => {
  const layout = useResponsiveLayout();
  
  const displayItems = Array.isArray(items) ? items : [items];
  const itemLimit = maxItems || layout.maxFeatureItems;
  const visibleItems = displayItems.slice(0, itemLimit);
  
  const getIcon = () => {
    if (icon) return icon;
    return adaptText('✓', '*', layout);
  };

  return (
    <Box flexDirection="column" marginBottom={layout.showCompact ? 1 : 2} {...props}>
      {visibleItems.map((item, index) => (
        <ResponsiveText
          key={index}
          text={`${getIcon()} ${item}`}
          color={color}
          wrap="wrap"
          maxLength={layout.maxContentWidth - 2} // Account for icon
        />
      ))}
      {displayItems.length > itemLimit && (
        <ResponsiveText
          text={`${adaptText('…', '...', layout)} ${displayItems.length - itemLimit} more ${showCount ? `(${displayItems.length} total)` : ''}`}
          color={adaptColor('gray', layout)}
          dimColor
        />
      )}
    </Box>
  );
}

ResponsiveList.propTypes = {
  items: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string)
  ]).isRequired,
  icon: PropTypes.string,
  color: PropTypes.string,
  maxItems: PropTypes.number,
  showCount: PropTypes.bool
};


// Responsive code or monospace text
export const ResponsiveCode = ({
  code,
  language = null,
  wrap = false,
  maxLength = null,
  ...props
}) => {
  const layout = useResponsiveLayout();
  
  // In compact mode or narrow terminals, truncate long code
  const shouldTruncate = !wrap && (layout.showCompact || layout.width === 'xs');
  const limit = maxLength || Math.max(layout.maxContentWidth - 4, 30);
  
  let displayCode = code;
  if (shouldTruncate && code.length > limit) {
    displayCode = code.slice(0, limit - 3) + '...';
  }

  return (
    <Box
      borderStyle={layout.showBorders ? 'single' : undefined}
      borderColor={adaptColor('gray', layout)}
      padding={layout.showBorders ? 1 : 0}
      marginY={layout.showCompact ? 0 : 1}
      {...props}
    >
      <Text color={adaptColor('yellow', layout)}>
        {displayCode}
      </Text>
    </Box>
  );
}

ResponsiveCode.propTypes = {
  code: PropTypes.string.isRequired,
  language: PropTypes.string,
  wrap: PropTypes.bool,
  maxLength: PropTypes.number
};


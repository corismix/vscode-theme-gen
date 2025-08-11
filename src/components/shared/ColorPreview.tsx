/**
 * Color Preview component
 * Displays color swatches with accessibility information
 */

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { ColorPreviewProps, ColorInfo } from './types';

// ============================================================================
// Color Utilities
// ============================================================================

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const getContrastRatio = (color1: string, color2: string): number => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 1;

  const getLuminance = (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
};

const isAccessible = (contrast: number): boolean => {
  return contrast >= 4.5; // WCAG AA standard
};

const getColorBrightness = (hex: string): number => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  
  return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
};

const groupColorsByUsage = (colors: ColorInfo[]) => {
  const groups: Record<string, ColorInfo[]> = {};
  
  colors.forEach(color => {
    const usage = color.usage || 'Other';
    if (!groups[usage]) {
      groups[usage] = [];
    }
    groups[usage].push(color);
  });
  
  return groups;
};

const groupColorsByBrightness = (colors: ColorInfo[]) => {
  const dark = colors.filter(c => getColorBrightness(c.hex) < 128);
  const light = colors.filter(c => getColorBrightness(c.hex) >= 128);
  
  return { Dark: dark, Light: light };
};

const groupColorsByHue = (colors: ColorInfo[]) => {
  // Simplified hue grouping
  const groups: Record<string, ColorInfo[]> = {
    Red: [],
    Orange: [],
    Yellow: [],
    Green: [],
    Blue: [],
    Purple: [],
    Gray: []
  };
  
  colors.forEach(color => {
    const rgb = hexToRgb(color.hex);
    if (!rgb) {
      groups.Gray.push(color);
      return;
    }
    
    const { r, g, b } = rgb;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    
    if (diff < 30) {
      groups.Gray.push(color);
      return;
    }
    
    if (r === max) {
      if (g > b) groups.Orange.push(color);
      else groups.Red.push(color);
    } else if (g === max) {
      if (r > b) groups.Yellow.push(color);
      else groups.Green.push(color);
    } else {
      if (r > g) groups.Purple.push(color);
      else groups.Blue.push(color);
    }
  });
  
  return groups;
};

// ============================================================================
// Color Swatch Component
// ============================================================================

interface ColorSwatchProps {
  color: ColorInfo;
  size: 'small' | 'medium' | 'large';
  showLabels: boolean;
  showHex: boolean;
  showContrast: boolean;
  interactive: boolean;
  onSelect?: (color: ColorInfo) => void;
}

const ColorSwatch: React.FC<ColorSwatchProps> = ({
  color,
  size,
  showLabels,
  showHex,
  showContrast,
  interactive,
  onSelect
}) => {
  const swatchChar = size === 'small' ? '●' : size === 'large' ? '████' : '██';
  const contrastRatio = color.contrast || getContrastRatio(color.hex, '#FFFFFF');
  const accessible = isAccessible(contrastRatio);

  return (
    <Box flexDirection="column" marginRight={1} marginBottom={1}>
      {/* Color swatch */}
      <Box alignItems="center">
        <Text color={color.hex}>
          {swatchChar}
        </Text>
        
        {showLabels && color.name && (
          <Text marginLeft={1} color="#F9FAFB">
            {color.name}
          </Text>
        )}
        
        {interactive && (
          <Text color="#6B7280" marginLeft={1} dimColor>
            [click]
          </Text>
        )}
      </Box>
      
      {/* Hex value */}
      {showHex && (
        <Box marginTop={0}>
          <Text color="#9CA3AF" dimColor>
            {color.hex}
          </Text>
        </Box>
      )}
      
      {/* Usage info */}
      {showLabels && color.usage && (
        <Box marginTop={0}>
          <Text color="#6B7280" dimColor>
            {color.usage}
          </Text>
        </Box>
      )}
      
      {/* Contrast info */}
      {showContrast && (
        <Box marginTop={0}>
          <Text color={accessible ? '#10B981' : '#EF4444'}>
            {accessible ? '✓' : '✗'} {contrastRatio.toFixed(1)}:1
          </Text>
        </Box>
      )}
    </Box>
  );
};

// ============================================================================
// Color Group Component
// ============================================================================

interface ColorGroupProps {
  title: string;
  colors: ColorInfo[];
  layout: 'grid' | 'list' | 'compact';
  columns: number;
  size: 'small' | 'medium' | 'large';
  showLabels: boolean;
  showHex: boolean;
  showContrast: boolean;
  interactive: boolean;
  onColorSelect?: (color: ColorInfo) => void;
}

const ColorGroup: React.FC<ColorGroupProps> = ({
  title,
  colors,
  layout,
  columns,
  size,
  showLabels,
  showHex,
  showContrast,
  interactive,
  onColorSelect
}) => {
  if (colors.length === 0) return null;

  const renderColors = () => {
    if (layout === 'list') {
      return (
        <Box flexDirection="column">
          {colors.map((color, index) => (
            <ColorSwatch
              key={`${color.hex}-${index}`}
              color={color}
              size={size}
              showLabels={showLabels}
              showHex={showHex}
              showContrast={showContrast}
              interactive={interactive}
              onSelect={onColorSelect}
            />
          ))}
        </Box>
      );
    }

    if (layout === 'compact') {
      return (
        <Box flexWrap="wrap">
          {colors.map((color, index) => (
            <ColorSwatch
              key={`${color.hex}-${index}`}
              color={color}
              size="small"
              showLabels={false}
              showHex={showHex}
              showContrast={false}
              interactive={interactive}
              onSelect={onColorSelect}
            />
          ))}
        </Box>
      );
    }

    // Grid layout
    const rows = Math.ceil(colors.length / columns);
    const grid = [];
    
    for (let row = 0; row < rows; row++) {
      const rowColors = colors.slice(row * columns, (row + 1) * columns);
      grid.push(
        <Box key={row} marginBottom={1}>
          {rowColors.map((color, index) => (
            <ColorSwatch
              key={`${color.hex}-${row}-${index}`}
              color={color}
              size={size}
              showLabels={showLabels}
              showHex={showHex}
              showContrast={showContrast}
              interactive={interactive}
              onSelect={onColorSelect}
            />
          ))}
        </Box>
      );
    }
    
    return <Box flexDirection="column">{grid}</Box>;
  };

  return (
    <Box flexDirection="column" marginBottom={2}>
      <Box marginBottom={1}>
        <Text color="#3B82F6" bold>
          {title} ({colors.length})
        </Text>
      </Box>
      
      {renderColors()}
    </Box>
  );
};

// ============================================================================
// Main ColorPreview Component
// ============================================================================

const ColorPreview: React.FC<ColorPreviewProps> = ({
  colors = [],
  layout = 'grid',
  showLabels = true,
  showHex = true,
  showContrast = false,
  interactive = false,
  onColorSelect,
  groupBy,
  columns = 4,
  size = 'medium',
  className,
  testId
}) => {
  const groupedColors = useMemo(() => {
    if (!groupBy) {
      return { 'All Colors': colors };
    }

    switch (groupBy) {
      case 'usage':
        return groupColorsByUsage(colors);
      case 'brightness':
        return groupColorsByBrightness(colors);
      case 'hue':
        return groupColorsByHue(colors);
      default:
        return { 'All Colors': colors };
    }
  }, [colors, groupBy]);

  if (colors.length === 0) {
    return (
      <Box className={className} data-testid={testId}>
        <Text color="#6B7280" dimColor>
          No colors to display
        </Text>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      className={className}
      data-testid={testId}
    >
      {Object.entries(groupedColors).map(([groupTitle, groupColors]) => (
        <ColorGroup
          key={groupTitle}
          title={groupTitle}
          colors={groupColors}
          layout={layout}
          columns={columns}
          size={size}
          showLabels={showLabels}
          showHex={showHex}
          showContrast={showContrast}
          interactive={interactive}
          onColorSelect={onColorSelect}
        />
      ))}

      {/* Accessibility summary */}
      {showContrast && (
        <Box marginTop={2} paddingX={1} borderStyle="single" borderColor="#374151">
          <Box flexDirection="column">
            <Text color="#F9FAFB" bold marginBottom={1}>
              Accessibility Summary
            </Text>
            
            {(() => {
              const accessibleColors = colors.filter(c => {
                const contrast = c.contrast || getContrastRatio(c.hex, '#FFFFFF');
                return isAccessible(contrast);
              });
              
              const accessibilityRate = (accessibleColors.length / colors.length) * 100;
              
              return (
                <Box>
                  <Text color={accessibilityRate >= 80 ? '#10B981' : '#F59E0B'}>
                    {accessibleColors.length}/{colors.length} colors meet WCAG AA ({accessibilityRate.toFixed(0)}%)
                  </Text>
                </Box>
              );
            })()}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ColorPreview;
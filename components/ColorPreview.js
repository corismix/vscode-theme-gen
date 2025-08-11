import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Text } from 'ink';
import chalk from 'chalk';
import { useResponsiveLayout } from '../lib/terminal-utils.js';
import { ResponsiveText } from './shared/ResponsiveText.js';
import { ColorSample } from './shared/AdaptiveColorText.js';
import { A11Y_CONSTANTS } from '../lib/constants.js';
import figures from 'figures';

function ColorPreview({ colorPalette = null, compact = false }) {
  const layout = useResponsiveLayout();

  if (!colorPalette) {
    return (
      <Box>
        <ResponsiveText
          text={`${figures.bullet} Color preview will appear after parsing theme file`}
          variant="caption"
          color="gray"
        />
      </Box>
    );
  }

  const renderColorSwatch = useCallback((color, name, bright = null) => {
    const displayColor = color || '#000000';
    
    // Determine size based on layout
    const isCompactMode = compact || layout.showCompact;
    
    if (isCompactMode) {
      return (
        <Box key={name} marginRight={layout.showCompact ? 0 : 1}>
          <ColorSample
            color={displayColor}
            size="small"
            fallbackText={name.slice(0, 2)}
          />
        </Box>
      );
    }

    return (
      <Box key={name} flexDirection="column" marginBottom={1} marginRight={layout.shouldStack ? 1 : 2}>
        <ResponsiveText
          text={name}
          variant="body"
          color="white"
          bold
        />
        <Box alignItems="center">
          <ColorSample
            color={displayColor}
            label={layout.columns >= 80 ? displayColor.toUpperCase() : null}
            size="normal"
            showHex={false}
          />
        </Box>
        {bright && !layout.showCompact && (
          <Box alignItems="center" marginTop={0}>
            <ColorSample
              color={bright}
              label={`${bright.toUpperCase()} (bright)`}
              size="normal" 
              showHex={false}
            />
          </Box>
        )}
      </Box>
    );
  }, [compact, layout]);


  const renderPrimaryColors = () => {
    const { primary } = colorPalette;
    const isCompactMode = compact || layout.showCompact;
    
    return (
      <Box flexDirection="column" marginBottom={isCompactMode ? 1 : 2}>
        <ResponsiveText
          text={`${figures.star} Primary Colors`}
          variant="subtitle"
          color="blue"
          bold
        />
        <Box flexDirection={layout.shouldStack ? "column" : "row"}>
          {renderColorSwatch(primary.background, 'Background')}
          {renderColorSwatch(primary.foreground, 'Foreground')}
          {renderColorSwatch(primary.cursor, 'Cursor')}
        </Box>
      </Box>
    );
  };

  const renderTerminalColors = () => {
    const { colors } = colorPalette;
    const isCompactMode = compact || layout.showCompact;
    
    // Calculate colors per row based on terminal width
    const getColorsPerRow = () => {
      if (isCompactMode) return Math.min(colors.length, 8);
      
      // Estimate space needed per color (name + swatch + spacing)
      const colorWidth = layout.shouldStack ? 12 : 16;
      const availableWidth = layout.maxContentWidth;
      const maxPerRow = Math.floor(availableWidth / colorWidth);
      
      return Math.max(1, Math.min(maxPerRow, 4)); // Between 1-4 colors per row
    };

    const colorsPerRow = getColorsPerRow();
    const rows = [];
    
    for (let i = 0; i < colors.length; i += colorsPerRow) {
      rows.push(colors.slice(i, i + colorsPerRow));
    }
    
    return (
      <Box flexDirection="column">
        <ResponsiveText
          text={`${figures.square} Terminal Colors`}
          variant="subtitle"
          color="blue"
          bold
        />
        <Box flexDirection="column">
          {rows.map((row, rowIndex) => (
            <Box key={rowIndex} marginBottom={rowIndex < rows.length - 1 ? 1 : 0}>
              {row.map((color) =>
                renderColorSwatch(color.value, color.name, color.bright)
              )}
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const renderCompactPreview = () => {
    const { primary, colors } = colorPalette;
    
    return (
      <Box flexDirection="column">
        <ResponsiveText
          text={`${figures.paintBrush} Color Palette Preview`}
          variant="subtitle"
          color="blue"
          bold
        />
        <Box flexDirection="column">
          <Box marginBottom={1} alignItems="center">
            <ResponsiveText
              text="Primary:"
              variant="caption"
              color="gray"
            />
            <Box>
              {renderColorSwatch(primary.background, 'bg')}
              {renderColorSwatch(primary.foreground, 'fg')}
              {renderColorSwatch(primary.cursor, 'cursor')}
            </Box>
          </Box>
          <Box alignItems="center">
            <ResponsiveText
              text="Terminal:"
              variant="caption"
              color="gray"
            />
            <Box>
              {colors.slice(0, Math.min(colors.length, 8)).map((color, index) => 
                renderColorSwatch(color.value, `${index}`)
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    );
  };

  // Use compact preview if requested or if terminal is compact
  if (compact || layout.showCompact) {
    return renderCompactPreview();
  }

  return (
    <Box flexDirection="column" role="region" aria-label={A11Y_CONSTANTS.ARIA_LABELS.COLOR_PREVIEW}>
      {renderPrimaryColors()}
      {renderTerminalColors()}
    </Box>
  );
}

ColorPreview.propTypes = {
  colorPalette: PropTypes.shape({
    primary: PropTypes.shape({
      background: PropTypes.string,
      foreground: PropTypes.string,
      cursor: PropTypes.string
    }),
    colors: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        value: PropTypes.string.isRequired,
        bright: PropTypes.string
      })
    )
  }),
  compact: PropTypes.bool
};


export default ColorPreview;
/**
 * ThemeConfigPreview - Theme preview and color display component
 * 
 * Optimized theme preview with caching, performance optimizations,
 * and comprehensive color display for theme configuration.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { ThemePreview } from '@/components/shared/ThemePreview';
import { InfoBox } from '@/components/shared/InfoBox';
import type { GhosttyColors } from '@/types';
import type { ThemeConfigForm } from '@/hooks/useThemeValidation';

export interface ThemePreviewData {
  name: string;
  colors: {
    background: string;
    foreground: string;
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    border: string;
    textMuted: string;
    // Terminal colors
    color0: string;
    color1: string;
    color2: string;
    color3: string;
    color4: string;
    color5: string;
    color6: string;
    color7: string;
  };
}

export interface ThemeConfigPreviewProps {
  themeData: GhosttyColors;
  formValues: ThemeConfigForm;
  showCode?: boolean;
  showUI?: boolean;
  showTerminal?: boolean;
  showColorPalette?: boolean;
  showConfigSummary?: boolean;
  width?: string | number;
}

/**
 * Create theme preview data from Ghostty colors and form values
 */
const createThemePreviewData = (
  themeData: GhosttyColors,
  formValues: ThemeConfigForm
): ThemePreviewData => ({
  name: formValues.themeName || 'Untitled Theme',
  colors: {
    background: themeData.background || '#1a1a1a',
    foreground: themeData.foreground || '#ffffff',
    primary: themeData.color4 || '#3b82f6',
    secondary: themeData.color2 || '#10b981',
    success: themeData.color2 || '#10b981',
    warning: themeData.color3 || '#f59e0b',
    error: themeData.color1 || '#ef4444',
    border: themeData.color8 || '#374151',
    textMuted: themeData.color7 || '#9ca3af',
    // Terminal colors
    color0: themeData.color0 || '#000000',
    color1: themeData.color1 || '#ff0000',
    color2: themeData.color2 || '#00ff00',
    color3: themeData.color3 || '#ffff00',
    color4: themeData.color4 || '#0000ff',
    color5: themeData.color5 || '#ff00ff',
    color6: themeData.color6 || '#00ffff',
    color7: themeData.color7 || '#ffffff',
  },
});

/**
 * Generate code example with theme name
 */
const generateCodeExample = (themeName: string): string => `// ${themeName || 'Your Theme'}
import { Box, Text } from 'ink';

const Welcome = () => {
  const themeName = "${themeName || 'Untitled'}";
  
  return (
    <Box>
      <Text color="blue">Welcome to {themeName}!</Text>
    </Box>
  );
};

export default Welcome;`;

/**
 * Color palette component for displaying all theme colors
 */
const ColorPalette: React.FC<{ colors: ThemePreviewData['colors'] }> = React.memo(({ colors }) => (
  <Box flexDirection="column" gap={1}>
    <Text bold color="#f3f4f6">Color Palette</Text>
    
    <Box flexDirection="column" gap={1}>
      <Text color="#6b7280">Base Colors:</Text>
      <Box gap={2}>
        <Box flexDirection="column">
          <Text>Background:</Text>
          <Text color={colors.background}>█ {colors.background}</Text>
        </Box>
        <Box flexDirection="column">
          <Text>Foreground:</Text>
          <Text color={colors.foreground}>█ {colors.foreground}</Text>
        </Box>
      </Box>
      
      <Text color="#6b7280">Semantic Colors:</Text>
      <Box gap={2}>
        <Text color={colors.primary}>█ Primary</Text>
        <Text color={colors.success}>█ Success</Text>
        <Text color={colors.warning}>█ Warning</Text>
        <Text color={colors.error}>█ Error</Text>
      </Box>
      
      <Text color="#6b7280">Terminal Colors:</Text>
      <Box gap={1}>
        <Text color={colors.color0}>█</Text>
        <Text color={colors.color1}>█</Text>
        <Text color={colors.color2}>█</Text>
        <Text color={colors.color3}>█</Text>
        <Text color={colors.color4}>█</Text>
        <Text color={colors.color5}>█</Text>
        <Text color={colors.color6}>█</Text>
        <Text color={colors.color7}>█</Text>
      </Box>
    </Box>
  </Box>
));

/**
 * Configuration summary component
 */
const ConfigurationSummary: React.FC<{ formValues: ThemeConfigForm }> = React.memo(({ formValues }) => (
  <Box flexDirection="column" gap={1}>
    <InfoBox
      type="info"
      title="Theme Configuration"
      message={[
        `Name: ${formValues.themeName || 'Untitled'}`,
        `Version: ${formValues.version || '1.0.0'}`,
        `Publisher: ${formValues.publisher || 'Unknown'}`,
        formValues.description && `Description: ${formValues.description}`,
        `License: ${formValues.license || 'MIT'}`,
      ].filter(Boolean).join('\n')}
    />
  </Box>
));

/**
 * Main theme configuration preview component
 */
export const ThemeConfigPreview: React.FC<ThemeConfigPreviewProps> = React.memo(({
  themeData,
  formValues,
  showCode = true,
  showUI = true,
  showTerminal = true,
  showColorPalette = false,
  showConfigSummary = true,
  width = "100%"
}) => {
  // Memoize theme preview data creation
  const previewData = React.useMemo(
    () => createThemePreviewData(themeData, formValues),
    [themeData, formValues]
  );

  // Memoize code example generation
  const codeExample = React.useMemo(
    () => generateCodeExample(formValues.themeName),
    [formValues.themeName]
  );

  if (!themeData) {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center" minHeight={10}>
        <InfoBox
          type="warning"
          title="No Theme Data"
          message="Theme data is not available for preview"
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={2} width={width}>
      {/* Configuration Summary */}
      {showConfigSummary && (
        <ConfigurationSummary formValues={formValues} />
      )}

      {/* Main Preview */}
      <Box flexGrow={1}>
        <ThemePreview
          theme={previewData}
          showCode={showCode}
          showUI={showUI}
          showTerminal={showTerminal}
          width="100%"
          codeExample={codeExample}
        />
      </Box>

      {/* Color Palette */}
      {showColorPalette && (
        <ColorPalette colors={previewData.colors} />
      )}

      {/* Preview Instructions */}
      <Box flexDirection="column" gap={1}>
        <Text color="#6b7280" dimColor>
          Preview Features:
        </Text>
        <Text color="#6b7280" dimColor>
          • Real-time theme preview with your configuration
        </Text>
        <Text color="#6b7280" dimColor>
          • Code syntax highlighting preview
        </Text>
        <Text color="#6b7280" dimColor>
          • Terminal color palette display
        </Text>
        <Text color="#6b7280" dimColor>
          • VS Code UI element simulation
        </Text>
      </Box>
    </Box>
  );
});

// Display name for React DevTools
ThemeConfigPreview.displayName = 'ThemeConfigPreview';
ColorPalette.displayName = 'ColorPalette';
ConfigurationSummary.displayName = 'ConfigurationSummary';
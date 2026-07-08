import React from 'react';
import { Box, Text, useInput } from 'ink';
import { Header } from '../ui';
import { FormData, ThemeData, TokenColor } from '@/types';
import { extractColorPalette } from '@/lib/theme-generator';

interface PreviewStepProps {
  formData: FormData;
  themeData: ThemeData | null;
  onNext: () => void;
  onBack: () => void;
  error?: string | undefined;
}

/**
 * Finds the foreground color VS Code would apply to a given TextMate scope,
 * for a rough (not pixel-perfect) syntax-highlighting preview.
 */
const findScopeColor = (
  tokenColors: TokenColor[],
  scope: string,
  fallback: string,
): string => {
  const match = tokenColors.find(token => {
    const scopes = Array.isArray(token.scope) ? token.scope : [token.scope];
    return scopes.includes(scope);
  });
  return match?.settings.foreground || fallback;
};

const ADVANCED_TOGGLES: { key: keyof FormData; label: string }[] = [
  { key: 'generateFullExtension', label: 'Full Extension' },
  { key: 'generateQuickstart', label: 'Developer Guide' },
  { key: 'preserveSourceTheme', label: 'Source Theme' },
  { key: 'generateGitIgnore', label: 'Git Ignore' },
  { key: 'generateVSCodeIgnore', label: 'VS Code Ignore' },
  { key: 'generateReadme', label: 'README' },
  { key: 'generateChangelog', label: 'Changelog' },
];

/**
 * Preview & review step - shown once all wizard input is collected, before
 * generation runs. Renders the parsed color palette, a rough syntax-highlighted
 * snippet, and a recap of every choice made so far, so the user can confirm
 * before committing rather than discovering problems after the fact.
 */
const PreviewStepComponent: React.FC<PreviewStepProps> = ({
  formData,
  themeData,
  onNext,
  onBack,
  error,
}) => {
  useInput((_input, key) => {
    if (key.escape) {
      onBack();
      return;
    }
    if (key.return) {
      onNext();
    }
  });

  if (!themeData) {
    return (
      <Box flexDirection='column'>
        <Header title='Preview & Review' />
        <Text color='red'>No theme data available - go back and re-select a file.</Text>
      </Box>
    );
  }

  const palette = extractColorPalette(themeData.colors);
  const tokenColors = themeData.theme.tokenColors;
  const commentColor = findScopeColor(tokenColors, 'comment', palette.colors[0]?.bright ?? palette.primary.foreground);
  const keywordColor = findScopeColor(tokenColors, 'keyword', palette.colors[2]?.bright ?? palette.primary.foreground);
  const functionColor = findScopeColor(tokenColors, 'entity.name.function', palette.colors[4]?.bright ?? palette.primary.foreground);
  const stringColor = findScopeColor(tokenColors, 'string', palette.colors[1]?.value ?? palette.primary.foreground);

  return (
    <Box flexDirection='column'>
      <Header title='Preview & Review' />

      <Box flexDirection='column' marginBottom={1}>
        <Text bold>Color Palette</Text>
        <Box>
          {palette.colors.map(c => (
            <Box key={c.name} marginRight={1}>
              <Text backgroundColor={c.value} color={c.value}>{'  '}</Text>
            </Box>
          ))}
        </Box>
        <Box>
          {palette.colors.map(c => (
            <Box key={`${c.name}-bright`} marginRight={1}>
              <Text backgroundColor={c.bright} color={c.bright}>{'  '}</Text>
            </Box>
          ))}
        </Box>
        <Text color='gray' dimColor>
          Background <Text color={palette.primary.background}>■</Text>{'  '}
          Foreground <Text color={palette.primary.foreground}>■</Text>{'  '}
          Accent/Cursor <Text color={palette.primary.accent}>■</Text>
        </Text>
      </Box>

      <Box flexDirection='column' marginBottom={1} borderStyle='round' borderColor='gray' paddingX={1}>
        <Text bold>Syntax Preview</Text>
        <Text><Text color={commentColor} italic>{'// A quick preview'}</Text></Text>
        <Text>
          <Text color={keywordColor}>function</Text>{' '}
          <Text color={functionColor}>greet</Text>
          (name) {'{'}
        </Text>
        <Text>
          {'  '}<Text color={keywordColor}>return</Text>{' '}
          <Text color={stringColor}>{'`Hello, ${name}!`'}</Text>;
        </Text>
        <Text>{'}'}</Text>
      </Box>

      <Box flexDirection='column' marginBottom={1}>
        <Text bold>Review</Text>
        <Text>Theme name: <Text color='cyan'>{formData.themeName}</Text></Text>
        <Text>Description: <Text color='cyan'>{formData.description || '(none)'}</Text></Text>
        <Text>Publisher: <Text color='cyan'>{formData.publisher || '(none)'}</Text></Text>
        <Text>Version: <Text color='cyan'>{formData.version}</Text></Text>
        <Text>License: <Text color='cyan'>{formData.license}</Text></Text>
        <Text>Output path: <Text color='cyan'>{formData.outputPath || '(none)'}</Text></Text>
        <Text>
          Will generate:{' '}
          {ADVANCED_TOGGLES.filter(o => formData[o.key]).map(o => o.label).join(', ') || 'theme file only'}
        </Text>
      </Box>

      {error && (
        <Box marginBottom={1}>
          <Text color='red'>{error}</Text>
        </Box>
      )}

      <Text color='gray' dimColor>Enter to generate • Esc to go back</Text>
    </Box>
  );
};

PreviewStepComponent.displayName = 'PreviewStep';

export const PreviewStep = React.memo(PreviewStepComponent);

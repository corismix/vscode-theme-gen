import React from 'react';
import { Box, Text, useInput } from 'ink';
import { Header } from '../ui';
import { FormData } from '@/types';

interface SuccessStepProps {
  formData: FormData;
  onRestart: () => void;
  onExit: () => void;
}

/**
 * Builds the list of files actually generated, based on the same toggles
 * generateExtensionFiles uses, so the user sees what they actually got
 * instead of having to go check the output folder themselves.
 */
const listGeneratedFiles = (formData: FormData): string[] => {
  const files = ['themes/<theme>-theme.json', 'package.json'];
  if (formData.generateReadme) files.push('README.md');
  if (formData.generateChangelog) files.push('CHANGELOG.md');
  if (formData.generateQuickstart) files.push('vsc-extension-quickstart.md');
  if (formData.generateFullExtension) {
    files.push('.vscode/launch.json', 'LICENSE');
  }
  if (formData.generateVSCodeIgnore || formData.generateFullExtension) files.push('.vscodeignore');
  if (formData.generateGitIgnore || formData.generateFullExtension) files.push('.gitignore');
  if (formData.preserveSourceTheme) files.push('src-theme/<original file>');
  return files;
};

/**
 * Success step component
 * Shows completion message, what was generated, and offers restart/exit options
 */
const SuccessStepComponent: React.FC<SuccessStepProps> = ({ formData, onRestart, onExit }) => {
  useInput((input, key) => {
    if (key.return || input === 'y') {
      onRestart();
    } else if (input === 'n' || key.escape) {
      onExit();
    }
  });

  const generatedFiles = listGeneratedFiles(formData);

  return (
    <Box flexDirection='column'>
      <Header title='Success!' />

      <Box marginBottom={1} padding={1} borderStyle='double' borderColor='green'>
        <Text color='green'>VS Code theme extension generated successfully!</Text>
      </Box>

      <Box marginBottom={1}>
        <Text>Output: {formData.outputPath}</Text>
      </Box>

      <Box marginBottom={1}>
        <Text>Theme: {formData.themeName}</Text>
      </Box>

      <Box flexDirection='column' marginBottom={1}>
        <Text bold>Generated files:</Text>
        {generatedFiles.map(file => (
          <Text key={file} color='gray'>  - {file}</Text>
        ))}
      </Box>

      <Box flexDirection='column' marginBottom={2} borderStyle='round' borderColor='cyan' paddingX={1}>
        <Text bold color='cyan'>Try it now:</Text>
        <Text>1. Open <Text color='cyan'>{formData.outputPath}</Text> in VS Code</Text>
        <Text>2. Press <Text color='cyan'>F5</Text> to launch the Extension Development Host</Text>
        <Text>3. Command Palette → &quot;Preferences: Color Theme&quot; → select {'"'}{formData.themeName}{'"'}</Text>
      </Box>

      <Box>
        <Text color='gray'>Generate another theme? (y/n)</Text>
      </Box>
    </Box>
  );
};

SuccessStepComponent.displayName = 'SuccessStep';

export const SuccessStep = React.memo(SuccessStepComponent);

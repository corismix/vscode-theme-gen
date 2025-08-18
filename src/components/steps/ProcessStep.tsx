import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Header } from '../ui';
import { buildVSCodeTheme } from '../../lib/theme-generator';
import { generateExtensionFiles } from '../../lib/file-generators';
import { FormData, ThemeData } from '@/types';

// Loading spinner component
const LoadingSpinner: React.FC = () => {
  const [spinnerIndex, setSpinnerIndex] = useState(0);
  const spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

  useEffect(() => {
    const interval = setInterval(() => {
      setSpinnerIndex(prev => (prev + 1) % spinnerChars.length);
    }, 80);

    return () => clearInterval(interval);
  }, [spinnerChars.length]);

  return (
    <Text color="cyan">
      {spinnerChars[spinnerIndex]}
    </Text>
  );
};

interface ProcessStepProps {
  formData: FormData;
  themeData: ThemeData;
  onSuccess: () => void;
  onError: (error: string) => void;
}

/**
 * Processing step component
 * Handles the generation of VS Code theme extension files
 */
const ProcessStepComponent: React.FC<ProcessStepProps> = ({
  formData,
  themeData,
  onSuccess,
  onError,
}) => {
  const [progress, setProgress] = useState('Starting...');

  useEffect(() => {
    const generateExtension = async () => {
      try {
        setProgress('Generating VS Code theme...');

        // Use core business logic
        const vsCodeTheme = buildVSCodeTheme(themeData.colors, formData.themeName);

        setProgress('Creating extension files...');

        const generationOptions = {
          themeName: formData.themeName,
          description: formData.description,
          version: formData.version,
          publisher: formData.publisher,
          license: formData.license,
          outputPath: formData.outputPath,
          generateReadme: formData.generateReadme,
          generateChangelog: formData.generateChangelog,
          generateFullExtension: formData.generateFullExtension,
          generateQuickstart: formData.generateQuickstart,
          preserveSourceTheme: formData.preserveSourceTheme,
          sourcePath: formData.inputFile,
          generateGitIgnore: formData.generateGitIgnore,
          generateVSCodeIgnore: formData.generateVSCodeIgnore,
          allowOutsideCwd: formData.allowOutsideCwd,
          // Derive gallery banner color from theme background or use default
          galleryBannerColor: themeData.colors.color0 || themeData.colors.background || '#1e1e1e',
        };

        await generateExtensionFiles(vsCodeTheme, generationOptions);

        setProgress('Complete!');
        setTimeout(onSuccess, 1000);
      } catch (error) {
        onError(error instanceof Error ? error.message : 'Generation failed');
      }
    };

    generateExtension();
  }, [formData, themeData, onSuccess, onError]);

  return (
    <Box flexDirection='column'>
      <Header title='Generating Extension' />

      <Box marginBottom={2}>
        <Text>Status: {progress}</Text>
      </Box>

      <Box>
        <LoadingSpinner />
        <Box marginLeft={1}>
          <Text color='gray'>Processing...</Text>
        </Box>
      </Box>
    </Box>
  );
};

ProcessStepComponent.displayName = 'ProcessStep';

export const ProcessStep = React.memo(ProcessStepComponent);

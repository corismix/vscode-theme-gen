import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Header } from '../ui';
import { buildVSCodeTheme } from '../../lib/theme-generator';
import { generateExtensionFiles } from '../../lib/file-generators';
import { FormData, ThemeData } from '../types';

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
export const ProcessStep: React.FC<ProcessStepProps> = ({
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
      <Header title='🔄 Generating Extension' />

      <Box marginBottom={2}>
        <Text>🎯 {progress}</Text>
      </Box>

      <Box>
        <Text color='gray'>Please wait...</Text>
      </Box>
    </Box>
  );
};

/**
 * ExtensionOptions component for VS Code Theme Generator
 * Configure extension generation options and output settings
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { join, resolve } from 'path';
import { homedir } from 'os';
import { useAppContext } from '../context/AppContext';
import { useNotifications } from '../hooks/useNotifications';
import { TextInput } from './TextInput';
import { Header } from './shared/Header';
import { InfoBox } from './shared/InfoBox';
import { KeyboardShortcuts } from './shared/KeyboardShortcuts';
import { buildVSCodeTheme } from '../lib/theme-generator';
import { generateExtensionFiles } from '../lib/file-generators';
import type { GenerationOptions } from '../utils/types';

// ============================================================================
// Types
// ============================================================================

interface ExtensionOptionsField {
  id: keyof ExtensionOptionsForm;
  label: string;
  placeholder: string;
  required: boolean;
  validation?: (value: string) => string | null;
  description?: string;
}

interface ExtensionOptionsForm {
  outputPath: string;
  generateFullExtension: boolean;
  generateReadme: boolean;
  generateChangelog: boolean;
  generateQuickstart: boolean;
}

type OptionStep = 'path' | 'options' | 'confirmation';

// ============================================================================
// Validation Functions
// ============================================================================

const validateOutputPath = (path: string): string | null => {
  if (!path.trim()) {
    return 'Output path is required';
  }
  // Basic path validation - just ensure it's not empty and doesn't contain invalid characters
  if (path.includes('<') || path.includes('>') || path.includes('|')) {
    return 'Path contains invalid characters';
  }
  return null;
};

// ============================================================================
// Form Configuration
// ============================================================================

const pathField: ExtensionOptionsField = {
  id: 'outputPath',
  label: 'Output Directory',
  placeholder: join(homedir(), 'vscode-themes', 'my-theme'),
  required: true,
  validation: validateOutputPath,
  description: 'Directory where the VS Code extension will be generated'
};

// ============================================================================
// ExtensionOptions Component
// ============================================================================

const ExtensionOptions: React.FC = () => {
  const { 
    formData, 
    updateFormData, 
    navigation, 
    themeData, 
    setGenerationResults 
  } = useAppContext();
  const { addNotification } = useNotifications();
  
  const [optionStep, setOptionStep] = useState<OptionStep>('path');
  const [formValues, setFormValues] = useState<ExtensionOptionsForm>({
    outputPath: formData.outputPath || join(homedir(), 'vscode-themes', formData.themeName?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'my-theme'),
    generateFullExtension: formData.generateFullExtension,
    generateReadme: formData.generateReadme,
    generateChangelog: formData.generateChangelog,
    generateQuickstart: formData.generateQuickstart
  });
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof ExtensionOptionsForm, string>>>({});
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  // Update output path when theme name changes
  useEffect(() => {
    if (formData.themeName && !formData.outputPath) {
      const defaultPath = join(
        homedir(), 
        'vscode-themes', 
        formData.themeName.toLowerCase().replace(/[^a-z0-9]/g, '-')
      );
      setFormValues(prev => ({ ...prev, outputPath: defaultPath }));
    }
  }, [formData.themeName, formData.outputPath]);

  // ============================================================================
  // Generation Options
  // ============================================================================

  const generationOptions = [
    {
      id: 'generateFullExtension' as const,
      label: 'Generate Full Extension',
      description: 'Creates a complete VS Code extension with all files',
      default: true
    },
    {
      id: 'generateReadme' as const,
      label: 'Generate README.md',
      description: 'Creates documentation for your theme',
      default: true
    },
    {
      id: 'generateChangelog' as const,
      label: 'Generate CHANGELOG.md',
      description: 'Creates a changelog file for version tracking',
      default: true
    },
    {
      id: 'generateQuickstart' as const,
      label: 'Generate QUICKSTART.md',
      description: 'Creates a quick start guide for users',
      default: true
    }
  ];

  // ============================================================================
  // Form Handlers
  // ============================================================================

  const handlePathChange = useCallback((value: string) => {
    setFormValues(prev => ({ ...prev, outputPath: value }));
    
    // Clear validation error for this field
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.outputPath;
      return newErrors;
    });
  }, []);

  const handlePathSubmit = useCallback(() => {
    const error = validateOutputPath(formValues.outputPath);
    
    if (error) {
      setValidationErrors(prev => ({ ...prev, outputPath: error }));
      addNotification({
        type: 'error',
        message: 'Validation Error',
        details: error
      });
      return;
    }

    // Resolve the path to absolute
    const resolvedPath = resolve(formValues.outputPath);
    setFormValues(prev => ({ ...prev, outputPath: resolvedPath }));
    setOptionStep('options');
  }, [formValues.outputPath, addNotification]);

  const toggleOption = useCallback((optionId: keyof ExtensionOptionsForm) => {
    setFormValues(prev => ({ 
      ...prev, 
      [optionId]: !prev[optionId] 
    }));
  }, []);

  const handleOptionsComplete = useCallback(() => {
    setOptionStep('confirmation');
  }, []);

  const handleStartGeneration = useCallback(async () => {
    if (!themeData) {
      addNotification({
        type: 'error',
        message: 'No Theme Data',
        details: 'Theme data is not loaded. Please go back and select a theme file.'
      });
      return;
    }

    setIsGenerating(true);
    
    // Update form data with current values
    updateFormData(formValues);
    
    // Navigate to progress screen
    navigation.goToStep('progress');
    
    try {
      // Generate the VS Code theme
      const vsCodeTheme = buildVSCodeTheme(themeData, formData.themeName);
      
      // Prepare generation options
      const generationOptions: GenerationOptions = {
        themeName: formData.themeName,
        description: formData.description,
        publisher: formData.publisher,
        version: formData.version,
        license: formData.license,
        outputPath: formValues.outputPath,
        generateFullExtension: formValues.generateFullExtension,
        generateReadme: formValues.generateReadme,
        generateChangelog: formValues.generateChangelog,
        generateQuickstart: formValues.generateQuickstart
      };
      
      // Generate all files
      const results = await generateExtensionFiles(vsCodeTheme, generationOptions);
      
      setGenerationResults(results);
      navigation.goToStep('success');
      
      addNotification({
        type: 'success',
        message: 'Theme Generated Successfully',
        details: `Generated ${results.totalFiles} files in ${results.outputPath}`
      });
      
    } catch (error) {
      const errorMessage = (error as Error).message;
      setGenerationResults({
        success: false,
        outputPath: formValues.outputPath,
        generatedFiles: [],
        themeFile: { path: '', content: '', type: 'json', size: 0 },
        packageFile: { path: '', content: '', type: 'json', size: 0 },
        totalFiles: 0,
        totalSize: 0,
        duration: 0,
        error: errorMessage
      });
      
      addNotification({
        type: 'error',
        message: 'Generation Failed',
        details: errorMessage
      });
      
      // Go back to options for retry
      setOptionStep('confirmation');
    } finally {
      setIsGenerating(false);
    }
  }, [themeData, formData, formValues, updateFormData, navigation, setGenerationResults, addNotification]);

  // ============================================================================
  // Navigation Handlers
  // ============================================================================

  const handleBack = useCallback(() => {
    if (optionStep === 'options') {
      setOptionStep('path');
    } else if (optionStep === 'confirmation') {
      setOptionStep('options');
    } else {
      navigation.goToPreviousStep();
    }
  }, [optionStep, navigation]);

  // ============================================================================
  // Keyboard Navigation
  // ============================================================================

  useInput((input, key) => {
    if (isGenerating) return; // Disable input during generation
    
    if (key.escape) {
      handleBack();
    } else if (optionStep === 'options') {
      if (key.upArrow) {
        setSelectedOptionIndex(prev => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setSelectedOptionIndex(prev => Math.min(generationOptions.length - 1, prev + 1));
      } else if (key.return || input === ' ') {
        if (selectedOptionIndex < generationOptions.length) {
          toggleOption(generationOptions[selectedOptionIndex].id);
        }
      } else if (input === 'c') {
        handleOptionsComplete();
      }
    } else if (optionStep === 'confirmation') {
      if (key.return || input === 'g') {
        handleStartGeneration();
      }
    }
  });

  // ============================================================================
  // Render Functions
  // ============================================================================

  const renderPathConfiguration = () => {
    const error = validationErrors.outputPath;

    return (
      <Box flexDirection="column">
        <Box marginBottom={2}>
          <InfoBox
            type="info"
            title="Output Configuration"
            message="Specify where your VS Code theme extension should be generated"
          />
        </Box>

        {error && (
          <Box marginBottom={2}>
            <InfoBox
              type="error"
              title="Validation Error"
              message={error}
            />
          </Box>
        )}

        <Box marginBottom={2}>
          <Text color="#6b7280">Output Directory:</Text>
        </Box>
        
        <Box marginBottom={2}>
          <TextInput
            placeholder={pathField.placeholder}
            value={formValues.outputPath}
            onChange={handlePathChange}
            onSubmit={handlePathSubmit}
            showCursor
          />
        </Box>

        <Box marginBottom={2}>
          <InfoBox
            type="tip"
            title="Path Info"
            message={`Extension will be created at: ${formValues.outputPath || 'Not specified'}`}
          />
        </Box>
      </Box>
    );
  };

  const renderOptionsConfiguration = () => {
    return (
      <Box flexDirection="column">
        <Box marginBottom={2}>
          <InfoBox
            type="info"
            title="Generation Options"
            message="Choose what files to generate with your theme extension"
          />
        </Box>

        <Box flexDirection="column" gap={1}>
          {generationOptions.map((option, index) => (
            <Box key={option.id} alignItems="center">
              <Text color={
                index === selectedOptionIndex ? '#3b82f6' : '#ffffff'
              }>
                {index === selectedOptionIndex ? '▶ ' : '  '}
                {formValues[option.id] ? '[✓]' : '[ ]'} {option.label}
              </Text>
            </Box>
          ))}
        </Box>

        <Box marginTop={2} marginBottom={2}>
          <InfoBox
            type="tip"
            title="Navigation"
            message="Use arrow keys to navigate, Space/Enter to toggle, 'c' to continue"
          />
        </Box>

        {selectedOptionIndex < generationOptions.length && (
          <Box marginBottom={2}>
            <Text color="#6b7280">{generationOptions[selectedOptionIndex].description}</Text>
          </Box>
        )}
      </Box>
    );
  };

  const renderConfirmation = () => {
    const selectedOptions = generationOptions.filter(opt => formValues[opt.id]);
    
    return (
      <Box flexDirection="column">
        <Box marginBottom={2}>
          <InfoBox
            type="info"
            title="Ready to Generate"
            message="Review your settings and start the theme generation process"
          />
        </Box>

        <Box marginBottom={2}>
          <Text color="#10b981" bold>Theme: {formData.themeName}</Text>
        </Box>

        <Box marginBottom={2}>
          <Text color="#6b7280">Output: {formValues.outputPath}</Text>
        </Box>

        <Box marginBottom={2}>
          <Text color="#6b7280">Files to generate: {selectedOptions.length} options selected</Text>
          {selectedOptions.map(option => (
            <Box key={option.id} marginLeft={2}>
              <Text color="#6b7280">• {option.label}</Text>
            </Box>
          ))}
        </Box>

        <Box marginBottom={2}>
          <InfoBox
            type="success"
            title="Ready!"
            message="Press Enter or 'g' to generate your theme extension"
          />
        </Box>
      </Box>
    );
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  if (isGenerating) {
    return (
      <Box flexDirection="column" minHeight={20}>
        <Header 
          title="Generating Theme" 
          subtitle="Please wait while your extension is being created..."
        />
        <Box justifyContent="center" alignItems="center" flexGrow={1}>
          <Text color="cyan">Starting theme generation...</Text>
        </Box>
      </Box>
    );
  }

  const getTitle = () => {
    switch (optionStep) {
      case 'path': return 'Extension Options - Output Path';
      case 'options': return 'Extension Options - Generation Settings';
      case 'confirmation': return 'Extension Options - Confirmation';
      default: return 'Extension Options';
    }
  };

  const getSubtitle = () => {
    switch (optionStep) {
      case 'path': return 'Configure where your theme extension will be generated';
      case 'options': return 'Choose what files to include with your theme';
      case 'confirmation': return 'Review settings and generate your theme';
      default: return 'Configure extension generation settings';
    }
  };

  const getShortcuts = () => {
    switch (optionStep) {
      case 'path':
        return [
          { key: 'enter', description: 'Confirm path', action: handlePathSubmit },
          { key: 'escape', description: 'Back', action: handleBack }
        ];
      case 'options':
        return [
          { key: '↑↓', description: 'Navigate options', action: () => {} },
          { key: 'space/enter', description: 'Toggle option', action: () => {} },
          { key: 'c', description: 'Continue', action: handleOptionsComplete },
          { key: 'escape', description: 'Back', action: handleBack }
        ];
      case 'confirmation':
        return [
          { key: 'enter/g', description: 'Generate theme', action: handleStartGeneration },
          { key: 'escape', description: 'Back', action: handleBack }
        ];
      default:
        return [];
    }
  };

  return (
    <Box flexDirection="column" minHeight={20}>
      <Header 
        title={getTitle()} 
        subtitle={getSubtitle()}
      />
      
      <Box flexGrow={1} paddingX={2} paddingY={1}>
        {optionStep === 'path' && renderPathConfiguration()}
        {optionStep === 'options' && renderOptionsConfiguration()}
        {optionStep === 'confirmation' && renderConfirmation()}
      </Box>

      <KeyboardShortcuts shortcuts={getShortcuts()} />
    </Box>
  );
};

export default ExtensionOptions;
/**
 * ThemeConfigurator component for VS Code Theme Generator
 * Professional theme configuration with real-time preview using split-pane layout
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { promises as fs } from 'fs';
import { useAppContext } from '../context/AppContext';
import { useNotifications } from '../hooks/useNotifications';
import { TextInput } from './TextInput';
// import { SelectInput } from './SelectInput'; // Currently unused
import { Header } from './shared/Header';
import { InfoBox } from './shared/InfoBox';
import { KeyboardShortcuts } from './shared/KeyboardShortcuts';
import { SplitPane } from './shared/SplitPane';
import { ThemePreview } from './shared/ThemePreview';
// Note: parseThemeFile expects a file path, we'll create a content parser
import type { GhosttyColors } from '../utils/types';

// ============================================================================
// Types
// ============================================================================

interface ThemeConfigField {
  id: keyof ThemeConfigForm;
  label: string;
  placeholder: string;
  required: boolean;
  validation?: (value: string) => string | null;
}

interface ThemeConfigForm {
  themeName: string;
  description: string;
  version: string;
  publisher: string;
  license: string;
}

type ConfigStep = 'basic' | 'advanced' | 'preview';

// ============================================================================
// Theme Parsing Utility
// ============================================================================

const parseThemeContent = (content: string): GhosttyColors => {
  const lines = content.split('\n');
  const colors: GhosttyColors = {};
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    
    const [key, value] = trimmed.split('=').map(s => s.trim());
    if (key && value) {
      colors[key as keyof GhosttyColors] = value;
    }
  }
  
  return colors;
};

// ============================================================================
// Validation Functions
// ============================================================================

const validateVersion = (version: string): string | null => {
  if (!version.match(/^\d+\.\d+\.\d+(-[\w.]+)?$/)) {
    return 'Version must follow semantic versioning (e.g., 1.0.0)';
  }
  return null;
};

const validatePublisher = (publisher: string): string | null => {
  if (!publisher.match(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/)) {
    return 'Publisher must contain only letters, numbers, and hyphens';
  }
  return null;
};

// ============================================================================
// Form Configuration
// ============================================================================

const configFields: ThemeConfigField[] = [
  {
    id: 'themeName',
    label: 'Theme Name',
    placeholder: 'Enter theme name (e.g., "Dark Terminal")',
    required: true
  },
  {
    id: 'description',
    label: 'Description',
    placeholder: 'Brief description of your theme',
    required: false
  },
  {
    id: 'version',
    label: 'Version',
    placeholder: '1.0.0',
    required: true,
    validation: validateVersion
  },
  {
    id: 'publisher',
    label: 'Publisher',
    placeholder: 'Your name or organization',
    required: true,
    validation: validatePublisher
  },
  {
    id: 'license',
    label: 'License',
    placeholder: 'MIT',
    required: false
  }
];

// ============================================================================
// ThemeConfigurator Component
// ============================================================================

const ThemeConfigurator: React.FC = () => {
  const { formData, updateFormData, navigation, themeData, setThemeData } = useAppContext();
  const { addNotification } = useNotifications();
  
  const [configStep, setConfigStep] = useState<ConfigStep>('basic');
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [formValues, setFormValues] = useState<ThemeConfigForm>({
    themeName: formData.themeName || '',
    description: formData.description || '',
    version: formData.version || '1.0.0',
    publisher: formData.publisher || '',
    license: formData.license || 'MIT'
  });
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof ThemeConfigForm, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [, setShowPreview] = useState(false);

  // ============================================================================
  // Load Theme Data
  // ============================================================================

  const loadThemeData = useCallback(async () => {
    if (!formData.inputFile || themeData) return;

    try {
      setIsLoading(true);
      const content = await fs.readFile(formData.inputFile, 'utf8');
      const parsedTheme = parseThemeContent(content);
      setThemeData(parsedTheme);
      
      addNotification({
        type: 'success',
        message: 'Theme loaded',
        details: 'Theme colors loaded for preview'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to load theme',
        details: (error as Error).message
      });
    } finally {
      setIsLoading(false);
    }
  }, [formData.inputFile, themeData, setThemeData, addNotification]);

  useEffect(() => {
    loadThemeData();
  }, [loadThemeData]);

  // Ensure currentFieldIndex is always valid
  useEffect(() => {
    if (configFields.length > 0) {
      const maxIndex = configFields.length - 1;
      if (currentFieldIndex < 0 || currentFieldIndex > maxIndex) {
        setCurrentFieldIndex(Math.max(0, Math.min(currentFieldIndex, maxIndex)));
      }
    }
  }, [currentFieldIndex, configFields.length]);

  // ============================================================================
  // Form Validation
  // ============================================================================

  const validateField = useCallback((field: ThemeConfigField, value: string): string | null => {
    if (field.required && !value.trim()) {
      return `${field.label} is required`;
    }
    
    if (field.validation && value.trim()) {
      return field.validation(value);
    }
    
    return null;
  }, []);

  const validateAllFields = useCallback((): boolean => {
    const errors: Partial<Record<keyof ThemeConfigForm, string>> = {};
    let isValid = true;

    configFields.forEach(field => {
      const error = validateField(field, formValues[field.id]);
      if (error) {
        errors[field.id] = error;
        isValid = false;
      }
    });

    setValidationErrors(errors);
    return isValid;
  }, [formValues, validateField]);

  // ============================================================================
  // Form Handlers
  // ============================================================================

  const handleFieldChange = useCallback((fieldId: keyof ThemeConfigForm, value: string) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
    
    // Clear validation error for this field
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldId];
      return newErrors;
    });
  }, []);

  const handleFieldSubmit = useCallback(() => {
    // Ensure currentFieldIndex is within bounds
    const safeCurrentFieldIndex = Math.max(0, Math.min(currentFieldIndex, configFields.length - 1));
    const currentField = configFields[safeCurrentFieldIndex];
    
    if (!currentField) {
      addNotification({
        type: 'error',
        message: 'Configuration Error',
        details: 'Invalid field configuration. Please restart the configuration process.'
      });
      return;
    }
    
    const value = formValues[currentField.id];
    const error = validateField(currentField, value);
    
    if (error) {
      setValidationErrors(prev => ({ ...prev, [currentField.id]: error }));
      addNotification({
        type: 'error',
        message: 'Validation Error',
        details: error
      });
      return;
    }

    if (safeCurrentFieldIndex < configFields.length - 1) {
      setCurrentFieldIndex(prev => Math.min(prev + 1, configFields.length - 1));
    } else {
      handleFormComplete();
    }
  }, [currentFieldIndex, formValues, validateField, addNotification]);

  const handleFormComplete = useCallback(() => {
    if (validateAllFields()) {
      // Update app context with form data
      updateFormData(formValues);
      
      addNotification({
        type: 'success',
        message: 'Configuration Complete',
        details: 'Theme configuration saved successfully'
      });
      
      navigation.goToStep('extension-options');
    }
  }, [validateAllFields, formValues, updateFormData, navigation, addNotification]);

  const handlePreviewToggle = useCallback(() => {
    setShowPreview(prev => !prev);
  }, []);

  // ============================================================================
  // Navigation Handlers
  // ============================================================================

  const handleBack = useCallback(() => {
    if (configStep === 'preview') {
      setConfigStep('basic');
    } else if (currentFieldIndex > 0) {
      setCurrentFieldIndex(prev => prev - 1);
    } else {
      navigation.goToPreviousStep();
    }
  }, [configStep, currentFieldIndex, navigation]);

  const handleSkipToPreview = useCallback(() => {
    if (!themeData) {
      addNotification({
        type: 'warning',
        message: 'Preview Not Available',
        details: 'Theme data not loaded yet'
      });
      return;
    }
    setConfigStep('preview');
  }, [themeData, addNotification]);

  // ============================================================================
  // Keyboard Navigation
  // ============================================================================

  useInput((input, key) => {
    if (key.escape) {
      handleBack();
    } else if (key.tab && !key.shift) {
      const nextIndex = Math.min(currentFieldIndex + 1, configFields.length - 1);
      if (nextIndex !== currentFieldIndex) {
        setCurrentFieldIndex(nextIndex);
      }
    } else if (key.tab && key.shift) {
      const prevIndex = Math.max(currentFieldIndex - 1, 0);
      if (prevIndex !== currentFieldIndex) {
        setCurrentFieldIndex(prevIndex);
      }
    } else if (input === 'p') {
      handlePreviewToggle();
    }
  });

  // ============================================================================
  // Theme Preview Object
  // ============================================================================

  const themePreviewData = React.useMemo(() => {
    if (!themeData) return null;

    return {
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
        color7: themeData.color7 || '#ffffff'
      }
    };
  }, [themeData, formValues.themeName]);

  // ============================================================================
  // Render Configuration Form
  // ============================================================================

  const renderConfigurationForm = () => {
    // Ensure currentFieldIndex is within bounds
    const safeCurrentFieldIndex = Math.max(0, Math.min(currentFieldIndex, configFields.length - 1));
    const currentField = configFields[safeCurrentFieldIndex];
    
    // Add safety check for currentField
    if (!currentField) {
      return (
        <Box flexDirection="column">
          <InfoBox
            type="error"
            title="Configuration Error"
            message="Invalid configuration state. Please go back and try again."
          />
        </Box>
      );
    }
    
    const error = validationErrors[currentField.id];

    return (
      <Box flexDirection="column">
        <Box marginBottom={2}>
          <InfoBox
            type="info"
            title={`Step ${currentFieldIndex + 1} of ${configFields.length}`}
            message={`Configure your theme's ${currentField.label.toLowerCase()}`}
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
          <TextInput
            placeholder={currentField.placeholder}
            value={formValues[currentField.id]}
            onChange={(value) => handleFieldChange(currentField.id, value)}
            onSubmit={handleFieldSubmit}
            showCursor
          />
        </Box>

        <Box flexDirection="column" gap={1}>
          <Text color="#6b7280">Progress:</Text>
          {configFields.map((field, index) => (
            <Box key={field.id} alignItems="center">
              <Text color={
                index === currentFieldIndex ? '#3b82f6' :
                formValues[field.id] && !validationErrors[field.id] ? '#10b981' :
                validationErrors[field.id] ? '#ef4444' :
                '#6b7280'
              }>
                {index === currentFieldIndex ? '▶' : formValues[field.id] && !validationErrors[field.id] ? '✓' : '○'} {field.label}
              </Text>
            </Box>
          ))}
        </Box>

        {themeData && (
          <Box marginTop={2}>
            <InfoBox
              type="tip"
              title="Preview Available"
              message="Press 'p' to preview your theme with current settings"
            />
          </Box>
        )}
      </Box>
    );
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <Box flexDirection="column" minHeight={20}>
        <Header title="Loading Theme..." />
        <Box justifyContent="center" alignItems="center" flexGrow={1}>
          <Text color="cyan">Loading theme data for configuration...</Text>
        </Box>
      </Box>
    );
  }

  // Preview Mode
  if (configStep === 'preview' && themePreviewData) {
    return (
      <Box flexDirection="column" minHeight={20}>
        <Header 
          title="Theme Preview" 
          subtitle={`Previewing: ${formValues.themeName || 'Untitled Theme'}`}
        />

        <Box flexGrow={1}>
          <SplitPane split="vertical" defaultSize="60%">
            {/* Configuration panel */}
            <Box paddingX={2} paddingY={1}>
              <Box flexDirection="column">
                <Box marginBottom={2}>
                  <InfoBox
                    type="info"
                    title="Configuration Summary"
                    message={`Name: ${formValues.themeName}\nVersion: ${formValues.version}\nPublisher: ${formValues.publisher}`}
                  />
                </Box>
                
                {renderConfigurationForm()}
              </Box>
            </Box>
            
            {/* Live preview panel */}
            <Box paddingX={1}>
              <ThemePreview
                theme={themePreviewData}
                showCode
                showUI
                showTerminal
                width="100%"
                codeExample={`// ${formValues.themeName || 'Your Theme'}
import { Box, Text } from 'ink';

const Welcome = () => {
  const themeName = "${formValues.themeName || 'Untitled'}";
  
  return (
    <Box>
      <Text color="blue">Welcome to {themeName}!</Text>
    </Box>
  );
};`}
              />
            </Box>
          </SplitPane>
        </Box>

        <KeyboardShortcuts
          shortcuts={[
            { key: 'tab', description: 'Next field', action: () => {} },
            { key: 'shift+tab', description: 'Previous field', action: () => {} },
            { key: 'enter', description: 'Confirm field', action: handleFieldSubmit },
            { key: 'p', description: 'Toggle preview', action: handlePreviewToggle },
            { key: 'escape', description: 'Back', action: handleBack }
          ]}
        />
      </Box>
    );
  }

  // Normal Configuration Mode
  // Additional safety check for configFields
  if (configFields.length === 0) {
    return (
      <Box flexDirection="column" minHeight={20}>
        <Header title="Configuration Error" />
        <Box justifyContent="center" alignItems="center" flexGrow={1}>
          <Text color="red">Configuration fields are not available. Please restart the application.</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" minHeight={20}>
      <Header 
        title="Configure Theme" 
        subtitle="Set up your theme metadata and properties"
      />
      
      <Box flexGrow={1} paddingX={2} paddingY={1}>
        {renderConfigurationForm()}
      </Box>

      <KeyboardShortcuts
        shortcuts={[
          { key: 'enter', description: 'Next field / Complete', action: handleFieldSubmit },
          { key: 'tab', description: 'Next field', action: () => {} },
          { key: 'shift+tab', description: 'Previous field', action: () => {} },
          ...(themeData ? [{ key: 'p', description: 'Preview theme', action: handleSkipToPreview }] : []),
          { key: 'escape', description: 'Back', action: handleBack }
        ]}
      />
    </Box>
  );
};

export default ThemeConfigurator;
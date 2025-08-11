import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { parseTxt, buildTheme, extractColorPalette } from '../lib/theme-generator.js';
import { sanitizeThemeName, isValidVersion, validateFormData } from '../lib/utils.js';
import ColorPreview from './ColorPreview.js';
import { useResponsiveLayout } from '../lib/terminal-utils.js';
import FocusIndicator, { StandardHelp, useStandardKeyNav } from './shared/FocusIndicator.js';
import { ResponsiveHeader, ResponsiveText } from './shared/ResponsiveText.js';
import { StatusIndicator, ErrorText } from './shared/AdaptiveColorText.js';
import { UI_TEXT, FILE_CONSTANTS, REGEX_PATTERNS, A11Y_CONSTANTS, THEME_CONSTANTS } from '../lib/constants.js';
import figures from 'figures';

const FIELDS = {
  THEME_NAME: 'themeName',
  DESCRIPTION: 'description',
  VERSION: 'version',
  PUBLISHER: 'publisher'
};

const FIELD_ORDER = [
  FIELDS.THEME_NAME,
  FIELDS.DESCRIPTION,
  FIELDS.VERSION,
  FIELDS.PUBLISHER
];

function ThemeConfigurator({
  formData,
  updateFormData,
  themeData = null,
  setThemeData,
  goToNextStep,
  goToPreviousStep,
  handleError,
  clearError,
  error = null
}) {
  const layout = useResponsiveLayout();
  const [currentField, setCurrentField] = useState(FIELDS.THEME_NAME);
  const [fieldValues, setFieldValues] = useState({
    themeName: formData.themeName || '',
    description: formData.description || '',
    version: formData.version || THEME_CONSTANTS.DEFAULT_VERSION,
    publisher: formData.publisher || ''
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [colorPalette, setColorPalette] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemeData();
  }, [formData.inputFile]);

  const loadThemeData = async () => {
    setIsLoading(true);
    clearError();
    
    try {
      // Parse the theme file
      const parsed = parseTxt(formData.inputFile);
      const theme = buildTheme(parsed, formData.inputFile, fieldValues.themeName);
      const palette = extractColorPalette(parsed);
      
      setThemeData({ parsed, theme });
      setColorPalette(palette);
      
      // Auto-populate theme name if empty
      if (!fieldValues.themeName) {
        const autoName = theme.name;
        setFieldValues(prev => ({ ...prev, themeName: autoName }));
      }
      
    } catch (err) {
      handleError(`Failed to parse theme file: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFieldValue = (field, value) => {
    setFieldValues(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const getAriaLabel = (field) => {
    switch (field) {
      case FIELDS.THEME_NAME:
        return A11Y_CONSTANTS.ARIA_LABELS.THEME_NAME_INPUT;
      case FIELDS.DESCRIPTION:
        return A11Y_CONSTANTS.ARIA_LABELS.DESCRIPTION_INPUT;
      case FIELDS.VERSION:
        return A11Y_CONSTANTS.ARIA_LABELS.VERSION_INPUT;
      case FIELDS.PUBLISHER:
        return A11Y_CONSTANTS.ARIA_LABELS.PUBLISHER_INPUT;
      default:
        return '';
    }
  };

  const validateField = (field, value) => {
    switch (field) {
      case FIELDS.THEME_NAME:
        if (!value.trim()) return UI_TEXT.VALIDATION_MESSAGES.THEME_NAME_REQUIRED;
        if (value.length < FILE_CONSTANTS.MIN_THEME_NAME_LENGTH) return UI_TEXT.VALIDATION_MESSAGES.THEME_NAME_TOO_SHORT;
        if (value.length > FILE_CONSTANTS.MAX_THEME_NAME_LENGTH) return UI_TEXT.VALIDATION_MESSAGES.THEME_NAME_TOO_LONG;
        break;
      case FIELDS.VERSION:
        if (value && !isValidVersion(value)) return UI_TEXT.VALIDATION_MESSAGES.VERSION_INVALID;
        break;
      case FIELDS.PUBLISHER:
        if (value && !REGEX_PATTERNS.PUBLISHER_NAME.test(value)) return UI_TEXT.VALIDATION_MESSAGES.PUBLISHER_INVALID;
        if (value && (value.length < FILE_CONSTANTS.MIN_PUBLISHER_NAME_LENGTH || value.length > FILE_CONSTANTS.MAX_PUBLISHER_NAME_LENGTH)) return UI_TEXT.VALIDATION_MESSAGES.PUBLISHER_INVALID;
        break;
      case FIELDS.DESCRIPTION:
        if (value && value.length > FILE_CONSTANTS.MAX_DESCRIPTION_LENGTH) return UI_TEXT.VALIDATION_MESSAGES.DESCRIPTION_TOO_LONG;
        break;
    }
    return null;
  };

  const validateAllFields = () => {
    const errors = {};
    
    FIELD_ORDER.forEach(field => {
      const error = validateField(field, fieldValues[field]);
      if (error) {
        errors[field] = error;
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleContinue = () => {
    if (!validateAllFields()) {
      handleError(UI_TEXT.ERROR_MESSAGES.VALIDATION_FAILED);
      return;
    }
    
    // Update theme data with current values
    if (themeData) {
      const updatedTheme = buildTheme(
        themeData.parsed,
        formData.inputFile,
        fieldValues.themeName
      );
      setThemeData(prev => ({ ...prev, theme: updatedTheme }));
    }
    
    // Update form data
    updateFormData({
      themeName: sanitizeThemeName(fieldValues.themeName),
      description: fieldValues.description,
      version: fieldValues.version,
      publisher: fieldValues.publisher
    });
    
    clearError();
    goToNextStep();
  };

  // Standardized keyboard navigation
  const { showHelp, keyHandler } = useStandardKeyNav(
    FIELD_ORDER.map(field => ({ value: field, label: field })),
    (item) => setCurrentField(item.value),
    goToPreviousStep
  );

  useInput((input, key) => {
    // Handle standard navigation first
    keyHandler(input, key);

    // Custom handling for form-specific actions
    if (key.return && !key.shift) {
      if (currentField === FIELDS.DESCRIPTION) {
        // In description field, allow line breaks with Shift+Enter
        return;
      } else {
        handleContinue();
      }
    } else if (key.tab && !key.shift) {
      // Navigate between fields
      const currentIndex = FIELD_ORDER.indexOf(currentField);
      const nextIndex = (currentIndex + 1) % FIELD_ORDER.length;
      setCurrentField(FIELD_ORDER[nextIndex]);
    } else if (key.tab && key.shift) {
      // Navigate backwards between fields
      const currentIndex = FIELD_ORDER.indexOf(currentField);
      const prevIndex = (currentIndex - 1 + FIELD_ORDER.length) % FIELD_ORDER.length;
      setCurrentField(FIELD_ORDER[prevIndex]);
    }
  });

  const renderField = (field, label, placeholder, multiline = false) => {
    const value = fieldValues[field];
    const error = validationErrors[field];
    const isFocused = currentField === field;
    const required = field === FIELDS.THEME_NAME;
    
    return (
      <FocusIndicator
        key={field}
        isFocused={isFocused}
        label={label}
        required={required}
        error={error}
        variant={layout.showCompact ? 'compact' : 'default'}
      >
        <TextInput
          value={value}
          placeholder={placeholder}
          onChange={(newValue) => updateFieldValue(field, newValue)}
          showCursor={isFocused}
          focus={isFocused}
          aria-label={getAriaLabel(field)}
        />
        
        {/* Additional field-specific info */}
        {field === FIELDS.THEME_NAME && value && (
          <ResponsiveText
            text={`Package name: ${sanitizeThemeName(value).toLowerCase().replace(/\s+/g, '-')}`}
            variant="caption"
          />
        )}
        
        {field === FIELDS.DESCRIPTION && (
          <ResponsiveText
            text={`${value.length}/${FILE_CONSTANTS.MAX_DESCRIPTION_LENGTH} characters`}
            variant="caption"
          />
        )}
      </FocusIndicator>
    );
  };

  if (isLoading) {
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <StatusIndicator
          status="loading"
          text={UI_TEXT.MESSAGES.LOADING_THEME_DATA}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1} role={A11Y_CONSTANTS.SEMANTIC_ROLES.FORM}>
      {/* Responsive Header */}
      <ResponsiveHeader
        title={UI_TEXT.STEP_LABELS.THEME_CONFIG}
        subtitle="Step 2 of 4: Set theme details and preview colors"
        showBigText={false}
        color="blue"
        marginBottom={layout.showCompact ? 1 : 2}
      />

      {/* Layout: Stack vertically on narrow terminals, side-by-side on wide */}
      <Box flexDirection={layout.shouldStack ? "column" : "row"}>
        {/* Form fields */}
        <Box 
          flexDirection="column" 
          width={layout.shouldStack ? "100%" : "50%"} 
          marginRight={layout.shouldStack ? 0 : 4}
        >
          {renderField(FIELDS.THEME_NAME, UI_TEXT.FIELD_LABELS.THEME_NAME, 'My Awesome Theme')}
          {renderField(FIELDS.DESCRIPTION, UI_TEXT.FIELD_LABELS.DESCRIPTION, THEME_CONSTANTS.DEFAULT_DESCRIPTION)}
          {renderField(FIELDS.VERSION, UI_TEXT.FIELD_LABELS.VERSION, THEME_CONSTANTS.DEFAULT_VERSION)}
          {renderField(FIELDS.PUBLISHER, UI_TEXT.FIELD_LABELS.PUBLISHER, THEME_CONSTANTS.DEFAULT_PUBLISHER)}

          {/* Error display */}
          {error && (
            <Box 
              marginBottom={2} 
              borderStyle={layout.showBorders ? "round" : undefined}
              borderColor="red" 
              padding={layout.showBorders ? 1 : 0}
            >
              <ErrorText text={error} />
            </Box>
          )}
        </Box>

        {/* Color preview - only show in non-compact mode */}
        {!layout.showCompact && (
          <Box 
            flexDirection="column" 
            width={layout.shouldStack ? "100%" : "50%"}
            marginTop={layout.shouldStack ? 2 : 0}
          >
            <ColorPreview colorPalette={colorPalette} compact={layout.shouldStack} />
          </Box>
        )}
      </Box>

      {/* Help section */}
      {showHelp && (
        <StandardHelp 
          layout={layout}
          shortcuts={[
            { key: 'Shift+Enter', action: 'New line in description' }
          ]}
        />
      )}

      {/* Navigation - compact version */}
      {!showHelp && !layout.showCompact && (
        <Box 
          marginTop={2} 
          borderStyle={layout.showBorders ? "round" : undefined}
          borderColor="gray" 
          padding={layout.showBorders ? 1 : 0}
        >
          <ResponsiveText
            text="Press h for help, Enter to continue, Escape to go back"
            variant="caption"
          />
        </Box>
      )}
    </Box>
  );
}

ThemeConfigurator.propTypes = {
  formData: PropTypes.object.isRequired,
  updateFormData: PropTypes.func.isRequired,
  themeData: PropTypes.object,
  setThemeData: PropTypes.func.isRequired,
  goToNextStep: PropTypes.func.isRequired,
  goToPreviousStep: PropTypes.func.isRequired,
  handleError: PropTypes.func.isRequired,
  clearError: PropTypes.func.isRequired,
  error: PropTypes.string
};


export default ThemeConfigurator;
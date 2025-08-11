import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { validateGhosttyFile, fileExists } from '../lib/utils.js';
import { UI_TEXT, PERFORMANCE_CONSTANTS, A11Y_CONSTANTS } from '../lib/constants.js';
import figures from 'figures';

function FileSelector({ 
  formData, 
  updateFormData, 
  goToNextStep, 
  goToPreviousStep,
  handleError,
  clearError,
  error = null
}) {
  const [inputValue, setInputValue] = useState(formData.inputFile || '');
  const [validationResult, setValidationResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    clearError();
  }, []);

  useEffect(() => {
    if (inputValue.trim()) {
      setIsValidating(true);
      // Debounce validation
      const timer = setTimeout(() => {
        const result = validateGhosttyFile(inputValue.trim());
        setValidationResult(result);
        setIsValidating(false);
      }, PERFORMANCE_CONSTANTS.DEBOUNCE.VALIDATION);
      
      return () => clearTimeout(timer);
    } else {
      setValidationResult(null);
      setIsValidating(false);
    }
  }, [inputValue]);

  const handleSubmit = () => {
    const trimmedInput = inputValue.trim();
    
    if (!trimmedInput) {
      handleError(UI_TEXT.VALIDATION_MESSAGES.FILE_REQUIRED);
      return;
    }

    const validation = validateGhosttyFile(trimmedInput);
    if (!validation.valid) {
      handleError(validation.error);
      return;
    }

    updateFormData({ inputFile: trimmedInput });
    clearError();
    goToNextStep();
  };

  useInput((input, key) => {
    if (key.return) {
      handleSubmit();
    }
  });

  const getStatusIcon = () => {
    if (isValidating) {
      return <Text color="yellow">{figures.ellipsis}</Text>;
    }
    
    if (!inputValue.trim()) {
      return <Text color="gray">{figures.bullet}</Text>;
    }
    
    if (validationResult?.valid) {
      return <Text color="green">{figures.tick}</Text>;
    } else {
      return <Text color="red">{figures.cross}</Text>;
    }
  };

  const getStatusMessage = () => {
    if (isValidating) {
      return <Text color="yellow">Validating file...</Text>;
    }
    
    if (!inputValue.trim()) {
      return <Text color="gray">Enter path to your Ghostty theme file</Text>;
    }
    
    if (validationResult?.valid) {
      return <Text color="green">Valid Ghostty theme file found!</Text>;
    } else if (validationResult?.error) {
      return <Text color="red">{validationResult.error}</Text>;
    }
    
    return null;
  };

  const renderFileHelp = () => {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text color="blue" bold>Expected file format:</Text>
        <Text color="gray" dimColor>
          • Ghostty terminal color configuration file (.txt)
        </Text>
        <Text color="gray" dimColor>
          • Contains color definitions like: color0=#000000
        </Text>
        <Text color="gray" dimColor>
          • May include background, foreground, cursor colors
        </Text>
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            Example: ~/Downloads/my-theme.txt
          </Text>
        </Box>
      </Box>
    );
  };

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      {/* Header */}
      <Box marginBottom={2}>
        <Text color="blue" bold>
          {figures.folderOpen} Select Theme File
        </Text>
      </Box>

      {/* Step indicator */}
      <Box marginBottom={2}>
        <Text color="gray">
          Step 1 of 4: Choose your Ghostty theme file
        </Text>
      </Box>

      {/* Input section */}
      <Box flexDirection="column" marginBottom={2}>
        <Box marginBottom={1}>
          <Text color="white" bold>File path:</Text>
        </Box>
        
        <Box marginBottom={1}>
          <Box marginRight={1}>
            {getStatusIcon()}
          </Box>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            placeholder="Enter path to .txt file..."
            showCursor={true}
            aria-label={A11Y_CONSTANTS.ARIA_LABELS.FILE_INPUT}
          />
        </Box>
        
        {/* Status message */}
        <Box marginBottom={1}>
          {getStatusMessage()}
        </Box>
      </Box>

      {/* Error display */}
      {error && (
        <Box marginBottom={2} borderStyle="round" borderColor="red" padding={1}>
          <Text color="red">
            {figures.warning} {error}
          </Text>
        </Box>
      )}

      {/* Help section */}
      {!validationResult?.valid && renderFileHelp()}

      {/* Navigation */}
      <Box marginTop={2} borderStyle="round" borderColor="gray" padding={1}>
        <Box flexDirection="column">
          <Text color="gray" dimColor>
            {figures.arrowRight} Press Enter to continue
          </Text>
          <Text color="gray" dimColor>
            {figures.arrowLeft} Press Escape to go back
          </Text>
          <Text color="gray" dimColor>
            {figures.cross} Press Ctrl+C to exit
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

FileSelector.propTypes = {
  formData: PropTypes.object.isRequired,
  updateFormData: PropTypes.func.isRequired,
  goToNextStep: PropTypes.func.isRequired,
  goToPreviousStep: PropTypes.func.isRequired,
  handleError: PropTypes.func.isRequired,
  clearError: PropTypes.func.isRequired,
  error: PropTypes.string
};


export default FileSelector;
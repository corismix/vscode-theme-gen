import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Header, useTextInput, NavigationHints, CursorText } from '../ui';
import { FormData } from '@/types';

interface OptionsStepProps {
  formData: FormData;
  setFormData: (data: FormData) => void;
  onNext: () => void;
  onBack: () => void;
  error?: string | undefined;
}

// Matches the publisher-format check main.ts applies to the --publisher CLI flag,
// so the interactive wizard rejects the same invalid input the CLI path would.
const PUBLISHER_REGEX = /^[a-z0-9-]+$/i;

const validatePublisher = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null; // publisher is optional
  if (trimmed.length < 3 || !PUBLISHER_REGEX.test(trimmed)) {
    return 'Publisher must be at least 3 characters and contain only letters, numbers, and hyphens';
  }
  return null;
};

const validateOutputPath = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return 'Output path is required';
  if (trimmed.includes('..')) return 'Output path cannot contain ".." (path traversal)';
  return null;
};

/**
 * Extension options configuration step component
 * Allows user to set publisher and output directory
 */
const OptionsStepComponent: React.FC<OptionsStepProps> = ({
  formData,
  setFormData,
  onNext,
  onBack,
  error,
}) => {
  const [currentField, setCurrentField] = useState<'publisher' | 'output'>('publisher');
  const publisherInput = useTextInput(formData.publisher);
  const outputInput = useTextInput(formData.outputPath);
  const publisherError = validatePublisher(publisherInput.value);
  const outputError = validateOutputPath(outputInput.value);

  // Sync form data with input values
  React.useEffect(() => {
    if (currentField === 'publisher' && publisherInput.value !== formData.publisher) {
      setFormData({ ...formData, publisher: publisherInput.value });
    } else if (currentField === 'output' && outputInput.value !== formData.outputPath) {
      setFormData({ ...formData, outputPath: outputInput.value });
    }
  }, [publisherInput.value, outputInput.value, formData, setFormData, currentField]);

  useInput((input, key) => {
    if (key.escape) {
      onBack();
      return;
    }

    if (currentField === 'publisher') {
      if (key.tab && publisherInput.value.trim() && !publisherError) {
        setCurrentField('output');
        return;
      }

      const result = publisherInput.handleInput(input, key);
      if (result.shouldSubmit && result.value.trim() && !publisherError) {
        setCurrentField('output');
      }
    } else {
      const result = outputInput.handleInput(input, key);
      if (result.shouldSubmit && result.value.trim() && !outputError) {
        onNext();
      } else if (key.tab && outputInput.value.trim() && !outputError) {
        onNext();
      }
    }
  });

  return (
    <Box flexDirection='column'>
      <Header title='Extension Options' />

      <Box marginBottom={1}>
        <Text>Publisher:</Text>
      </Box>

      {currentField === 'publisher' ? (
        <Box borderStyle='single' padding={1} marginBottom={1}>
          <CursorText value={publisherInput.value} cursorPos={publisherInput.cursorPos} />
        </Box>
      ) : (
        <Box padding={1} marginBottom={1}>
          <Text color='green'>{publisherInput.value}</Text>
        </Box>
      )}

      {currentField === 'publisher' && publisherInput.value.trim() && publisherError && (
        <Box marginBottom={1}>
          <Text color='red'>{publisherError}</Text>
        </Box>
      )}

      {currentField === 'output' && (
        <>
          <Box marginBottom={1}>
            <Text>Output Directory:</Text>
          </Box>

          <Box borderStyle='single' padding={1} marginBottom={1}>
            <CursorText value={outputInput.value} cursorPos={outputInput.cursorPos} />
          </Box>

          {outputError && (
            <Box marginBottom={1}>
              <Text color='red'>{outputError}</Text>
            </Box>
          )}
        </>
      )}

      {error && (
        <Box marginBottom={1}>
          <Text color='red'>{error}</Text>
        </Box>
      )}

      <Box flexDirection='column'>
        <Text color='gray'>Enter values and press Enter/Tab, Esc to go back</Text>
        <NavigationHints showInput />
      </Box>
    </Box>
  );
};

OptionsStepComponent.displayName = 'OptionsStep';

export const OptionsStep = React.memo(OptionsStepComponent);

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Header, useTextInput } from '../ui';
import { FormData } from '../types';

interface OptionsStepProps {
  formData: FormData;
  setFormData: (data: FormData) => void;
  onNext: () => void;
  onBack: () => void;
  error?: string | undefined;
}

/**
 * Extension options configuration step component
 * Allows user to set publisher and output directory
 */
export const OptionsStep: React.FC<OptionsStepProps> = ({
  formData,
  setFormData,
  onNext,
  onBack,
  error,
}) => {
  const [currentField, setCurrentField] = useState<'publisher' | 'output'>('publisher');
  const publisherInput = useTextInput(formData.publisher);
  const outputInput = useTextInput(formData.outputPath);

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
      if (key.tab && publisherInput.value.trim()) {
        setCurrentField('output');
        return;
      }

      const result = publisherInput.handleInput(input, key);
      if (result.shouldSubmit && result.value.trim()) {
        setCurrentField('output');
      }
    } else {
      const result = outputInput.handleInput(input, key);
      if (result.shouldSubmit && result.value.trim()) {
        onNext();
      } else if (key.tab && outputInput.value.trim()) {
        onNext();
      }
    }
  });

  return (
    <Box flexDirection='column'>
      <Header title='⚙️  Extension Options' />

      <Box marginBottom={1}>
        <Text>{currentField === 'publisher' ? '📝' : '✅'} Publisher:</Text>
      </Box>

      {currentField === 'publisher' ? (
        <Box borderStyle='single' padding={1} marginBottom={1}>
          {publisherInput.renderWithCursor()}
        </Box>
      ) : (
        <Box padding={1} marginBottom={1}>
          <Text color='green'>✅ {publisherInput.value}</Text>
        </Box>
      )}

      {currentField === 'output' && (
        <>
          <Box marginBottom={1}>
            <Text>📝 Output Directory:</Text>
          </Box>

          <Box borderStyle='single' padding={1} marginBottom={1}>
            {outputInput.renderWithCursor()}
          </Box>
        </>
      )}

      {error && (
        <Box marginBottom={1}>
          <Text color='red'>❌ {error}</Text>
        </Box>
      )}

      <Box flexDirection='column'>
        <Text color='gray'>Enter values and press Enter/Tab, Esc to go back</Text>
        <Text color='gray' dimColor>
          Navigation: ←→ move cursor, Backspace/Delete to remove text
        </Text>
      </Box>
    </Box>
  );
};

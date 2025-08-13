import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Header } from '../ui';
import { FormData } from '../types';

interface AdvancedOptionsStepProps {
  formData: FormData;
  setFormData: (data: FormData) => void;
  onNext: () => void;
  onBack: () => void;
  error?: string | undefined;
}

type AdvancedOption = 
  | 'generateFullExtension' 
  | 'generateQuickstart' 
  | 'preserveSourceTheme' 
  | 'generateGitIgnore' 
  | 'generateVSCodeIgnore';

const ADVANCED_OPTIONS: { key: AdvancedOption; label: string; description: string }[] = [
  {
    key: 'generateFullExtension',
    label: 'Full Extension',
    description: 'Generate complete extension with LICENSE, .vscode/launch.json'
  },
  {
    key: 'generateQuickstart',
    label: 'Developer Guide',
    description: 'Include VS Code extension developer quickstart guide'
  },
  {
    key: 'preserveSourceTheme',
    label: 'Source Theme',
    description: 'Preserve original Ghostty theme file in src-theme/ folder'
  },
  {
    key: 'generateGitIgnore',
    label: 'Git Ignore',
    description: 'Generate .gitignore for development workflow'
  },
  {
    key: 'generateVSCodeIgnore',
    label: 'VS Code Ignore',
    description: 'Generate .vscodeignore for extension packaging'
  }
];

/**
 * Advanced options configuration step component
 * Allows users to customize extension generation features
 */
export const AdvancedOptionsStep: React.FC<AdvancedOptionsStepProps> = ({
  formData,
  setFormData,
  onNext,
  onBack,
  error,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.escape) {
      onBack();
      return;
    }

    if (key.return) {
      onNext();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(prev => prev > 0 ? prev - 1 : ADVANCED_OPTIONS.length - 1);
      return;
    }

    if (key.downArrow) {
      setSelectedIndex(prev => prev < ADVANCED_OPTIONS.length - 1 ? prev + 1 : 0);
      return;
    }

    if (input === ' ') {
      const option = ADVANCED_OPTIONS[selectedIndex];
      if (option) {
        setFormData({
          ...formData,
          [option.key]: !formData[option.key]
        });
      }
      return;
    }

    // Quick toggle shortcuts
    const shortcutMap: { [key: string]: AdvancedOption } = {
      'f': 'generateFullExtension',
      'd': 'generateQuickstart',
      's': 'preserveSourceTheme',
      'g': 'generateGitIgnore',
      'v': 'generateVSCodeIgnore',
    };

    const optionKey = shortcutMap[input.toLowerCase()];
    if (optionKey) {
      setFormData({
        ...formData,
        [optionKey]: !formData[optionKey]
      });
    }
  });

  return (
    <Box flexDirection='column'>
      <Header title='⚡ Advanced Options' />

      <Box marginBottom={1}>
        <Text>Configure extension generation features:</Text>
      </Box>

      {ADVANCED_OPTIONS.map((option, index) => (
        <Box key={option.key} marginBottom={1}>
          <Text>
            {selectedIndex === index ? '→ ' : '  '}
            <Text color={formData[option.key] ? 'green' : 'gray'}>
              {formData[option.key] ? '✅' : '☐'}
            </Text>
            {' '}
            <Text color={selectedIndex === index ? 'cyan' : 'white'}>
              {option.label}
            </Text>
            <Text color='gray'> - {option.description}</Text>
          </Text>
        </Box>
      ))}

      {error && (
        <Box marginTop={1} marginBottom={1}>
          <Text color='red'>❌ {error}</Text>
        </Box>
      )}

      <Box flexDirection='column' marginTop={1}>
        <Text color='gray'>↑↓ to navigate, Space to toggle, Enter to continue</Text>
        <Text color='gray' dimColor>
          Shortcuts: (f)ull, (d)eveloper guide, (s)ource theme, (g)it ignore, (v)scode ignore
        </Text>
        <Text color='gray' dimColor>
          Esc to go back
        </Text>
      </Box>
    </Box>
  );
};
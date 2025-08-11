import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { resolveOutputPath } from '../lib/utils.js';
import { useResponsiveLayout, useContentChunking } from '../lib/terminal-utils.js';
import FocusIndicator, { StandardHelp, useStandardKeyNav } from './shared/FocusIndicator.js';
import { ResponsiveHeader, ResponsiveText, ResponsiveDescription } from './shared/ResponsiveText.js';
import { StatusIndicator, ErrorText, SuccessText } from './shared/AdaptiveColorText.js';
import { UI_TEXT } from '../lib/constants.js';
import figures from 'figures';

const LICENSE_OPTIONS = [
  { label: 'MIT', value: 'MIT' },
  { label: 'Apache-2.0', value: 'Apache-2.0' },
  { label: 'GPL-3.0', value: 'GPL-3.0' },
  { label: 'BSD-3-Clause', value: 'BSD-3-Clause' },
  { label: 'ISC', value: 'ISC' },
  { label: 'Unlicense', value: 'Unlicense' }
];

// Section definitions for content chunking
const SECTIONS = [
  { id: 'output', label: 'Output Directory', priority: 'high' },
  { id: 'license', label: 'License', priority: 'medium' },
  { id: 'files', label: 'Files to Generate', priority: 'high' }
];

function ExtensionOptions({
  formData,
  updateFormData,
  goToNextStep,
  goToPreviousStep,
  handleError,
  clearError,
  error = null
}) {
  const layout = useResponsiveLayout();
  const [currentSection, setCurrentSection] = useState('output');
  const [outputPath, setOutputPath] = useState(formData.outputPath || '');
  const [selectedLicense, setSelectedLicense] = useState(formData.license || 'MIT');
  const [extensionOptions, setExtensionOptions] = useState({
    generateFullExtension: formData.generateFullExtension !== false,
    generateReadme: formData.generateReadme !== false,
    generateChangelog: formData.generateChangelog !== false,
    generateQuickstart: formData.generateQuickstart !== false
  });

  // Content chunking for smaller terminals
  const { 
    currentItems: visibleSections, 
    hasMultipleChunks, 
    currentChunk, 
    totalChunks, 
    nextChunk, 
    prevChunk 
  } = useContentChunking(
    SECTIONS, 
    layout.showCompact ? 1 : 3 // Show one section at a time in compact mode
  );

  useEffect(() => {
    clearError();
    
    // Auto-generate output path if empty
    if (!outputPath && formData.themeName) {
      const autoPath = resolveOutputPath('', formData.themeName);
      setOutputPath(autoPath);
    }
  }, [formData.themeName]);

  const handleContinue = () => {
    const finalOutputPath = outputPath || resolveOutputPath('', formData.themeName);
    
    updateFormData({
      outputPath: finalOutputPath,
      license: selectedLicense,
      ...extensionOptions
    });
    
    clearError();
    goToNextStep();
  };

  const toggleOption = (option) => {
    setExtensionOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  // Standardized keyboard navigation
  const { showHelp, keyHandler } = useStandardKeyNav(
    SECTIONS.map(section => ({ value: section.id, label: section.label })),
    (item) => setCurrentSection(item.value),
    goToPreviousStep
  );

  useInput((input, key) => {
    // Handle standard navigation first
    keyHandler(input, key);

    // Custom navigation for sections
    if (key.return && !key.shift) {
      if (currentSection === 'files') {
        handleContinue();
      } else {
        // Move to next section
        const currentIndex = SECTIONS.findIndex(s => s.id === currentSection);
        const nextIndex = (currentIndex + 1) % SECTIONS.length;
        setCurrentSection(SECTIONS[nextIndex].id);
      }
    } else if (key.tab && !key.shift) {
      const currentIndex = SECTIONS.findIndex(s => s.id === currentSection);
      const nextIndex = (currentIndex + 1) % SECTIONS.length;
      setCurrentSection(SECTIONS[nextIndex].id);
    } else if (key.tab && key.shift) {
      const currentIndex = SECTIONS.findIndex(s => s.id === currentSection);
      const prevIndex = (currentIndex - 1 + SECTIONS.length) % SECTIONS.length;
      setCurrentSection(SECTIONS[prevIndex].id);
    }
    
    // Content chunking navigation
    if (hasMultipleChunks) {
      if (key.rightArrow || input === ']') {
        nextChunk();
        return;
      } else if (key.leftArrow || input === '[') {
        prevChunk();
        return;
      }
    }
    
    // Handle file option toggles
    if (currentSection === 'files') {
      if (input === '1') toggleOption('generateReadme');
      else if (input === '2') toggleOption('generateChangelog');
      else if (input === '3') toggleOption('generateQuickstart');
      else if (input === 'a') {
        // Toggle all
        const allEnabled = Object.values(extensionOptions).every(v => v);
        const newState = !allEnabled;
        setExtensionOptions(prev => Object.keys(prev).reduce((acc, key) => {
          acc[key] = key === 'generateFullExtension' ? true : newState;
          return acc;
        }, {}));
      }
    }
  });

  const renderOutputSection = () => {
    const isFocused = currentSection === 'output';
    const resolvedPath = outputPath || resolveOutputPath('', formData.themeName);
    
    return (
      <FocusIndicator
        isFocused={isFocused}
        label="Output Directory"
        variant={layout.showCompact ? 'compact' : 'default'}
      >
        <TextInput
          value={outputPath}
          placeholder={resolvedPath}
          onChange={setOutputPath}
          showCursor={isFocused}
          focus={isFocused}
        />
        
        {!layout.showCompact && (
          <Box marginTop={1}>
            <ResponsiveText
              text={`Extension will be created in: ${resolvedPath}`}
              variant="caption"
              color="gray"
              wrap="wrap"
            />
            <ResponsiveText
              text="Leave empty to use default location based on theme name"
              variant="caption"
              color="gray"
            />
          </Box>
        )}
      </FocusIndicator>
    );
  };

  const renderLicenseSection = () => {
    const isFocused = currentSection === 'license';
    
    return (
      <FocusIndicator
        isFocused={isFocused}
        label="License"
        variant={layout.showCompact ? 'compact' : 'default'}
      >
        {isFocused ? (
          <SelectInput
            items={LICENSE_OPTIONS}
            initialIndex={LICENSE_OPTIONS.findIndex(opt => opt.value === selectedLicense)}
            onSelect={(item) => setSelectedLicense(item.value)}
          />
        ) : (
          <ResponsiveText
            text={`Selected: ${selectedLicense}`}
            variant="body"
            color="gray"
          />
        )}
      </FocusIndicator>
    );
  };

  const renderFilesSection = () => {
    const isFocused = currentSection === 'files';
    
    const fileOptions = [
      { key: 'generateReadme', label: 'README.md', description: 'Documentation for users' },
      { key: 'generateChangelog', label: 'CHANGELOG.md', description: 'Version history' },
      { key: 'generateQuickstart', label: 'vsc-extension-quickstart.md', description: 'Developer guide' }
    ];

    const alwaysGeneratedFiles = [
      'package.json (extension manifest)',
      '.vscode/launch.json (debug configuration)', 
      'themes/*.json (theme file)',
      '.gitignore and LICENSE'
    ];
    
    return (
      <FocusIndicator
        isFocused={isFocused}
        label="Files to Generate"
        variant={layout.showCompact ? 'compact' : 'default'}
      >
        <Box flexDirection="column">
          {/* Always generated files - compact version */}
          {!layout.showCompact && (
            <>
              <SuccessText text="Always Generated:" />
              <Box marginBottom={2} paddingLeft={1}>
                {alwaysGeneratedFiles.map((file, index) => (
                  <ResponsiveText
                    key={index}
                    text={`${figures.bullet} ${file}`}
                    variant="caption"
                    color="gray"
                  />
                ))}
              </Box>
            </>
          )}
          
          {/* Optional files */}
          <Box marginBottom={1}>
            <ResponsiveText text="Optional Files:" variant="subtitle" color="blue" />
          </Box>
          
          <Box flexDirection="column" paddingLeft={1}>
            {fileOptions.map((option, index) => (
              <Box key={option.key} marginBottom={layout.showCompact ? 0 : 1}>
                <ResponsiveText
                  text={`${extensionOptions[option.key] ? figures.tick : figures.circle} ${index + 1}. ${option.label}`}
                  color={extensionOptions[option.key] ? "green" : "gray"}
                />
                {!layout.showCompact && (
                  <ResponsiveText
                    text={`- ${option.description}`}
                    variant="caption"
                    color="gray"
                  />
                )}
              </Box>
            ))}
          </Box>
          
          {isFocused && (
            <Box 
              marginTop={1} 
              borderStyle={layout.showBorders ? "single" : undefined}
              borderColor="blue" 
              padding={layout.showBorders ? 1 : 0}
            >
              <Box flexDirection="column">
                <ResponsiveText
                  text="Press 1-3 to toggle individual files"
                  variant="caption"
                  color="blue"
                />
                <ResponsiveText
                  text="Press 'a' to toggle all optional files"
                  variant="caption"
                  color="blue"
                />
              </Box>
            </Box>
          )}
        </Box>
      </FocusIndicator>
    );
  };

  const renderSummary = () => {
    if (layout.showCompact) return null; // Skip summary in compact mode
    
    const resolvedPath = outputPath || resolveOutputPath('', formData.themeName);
    const enabledFiles = Object.entries(extensionOptions)
      .filter(([key, enabled]) => enabled && key !== 'generateFullExtension')
      .map(([key]) => key.replace('generate', '').toLowerCase());
    
    const summaryItems = [
      `Theme: ${formData.themeName}`,
      `Output: ${resolvedPath}`,
      `License: ${selectedLicense}`,
      `Optional files: ${enabledFiles.length > 0 ? enabledFiles.join(', ') : 'none'}`
    ];
    
    return (
      <Box 
        flexDirection="column" 
        marginTop={2} 
        borderStyle={layout.showBorders ? "round" : undefined}
        borderColor="green" 
        padding={layout.showBorders ? 1 : 0}
      >
        <SuccessText text="Configuration Summary" bold />
        {summaryItems.map((item, index) => (
          <ResponsiveText
            key={index}
            text={`${figures.bullet} ${item}`}
            color="white"
          />
        ))}
      </Box>
    );
  };

  // Section renderers map
  const sectionRenderers = {
    output: renderOutputSection,
    license: renderLicenseSection,
    files: renderFilesSection
  };

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      {/* Responsive Header */}
      <ResponsiveHeader
        title={UI_TEXT.STEP_LABELS.EXTENSION_OPTIONS}
        subtitle="Step 3 of 4: Configure extension generation options"
        showBigText={false}
        color="blue"
        marginBottom={layout.showCompact ? 1 : 2}
      />

      {/* Content chunking for compact terminals */}
      {hasMultipleChunks && (
        <Box marginBottom={1}>
          <ResponsiveText
            text={`Section ${currentChunk + 1} of ${totalChunks} - Use ←/→ or [/] to navigate`}
            variant="caption"
            color="gray"
          />
        </Box>
      )}

      {/* Render visible sections */}
      {(layout.showCompact ? visibleSections : SECTIONS).map((section) => (
        <Box key={section.id}>
          {sectionRenderers[section.id]()}
        </Box>
      ))}

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

      {/* Summary - only in full mode */}
      {renderSummary()}

      {/* Help section */}
      {showHelp && (
        <StandardHelp 
          layout={layout}
          shortcuts={[
            { key: '1-3', action: 'Toggle files (in Files section)' },
            { key: 'a', action: 'Toggle all files (in Files section)' },
            ...(hasMultipleChunks ? [
              { key: '←/→ or [/]', action: 'Navigate sections' }
            ] : [])
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
            text="Press h for help, Enter to continue, Tab to navigate sections"
            variant="caption"
          />
        </Box>
      )}
    </Box>
  );
}

ExtensionOptions.propTypes = {
  formData: PropTypes.object.isRequired,
  updateFormData: PropTypes.func.isRequired,
  goToNextStep: PropTypes.func.isRequired,
  goToPreviousStep: PropTypes.func.isRequired,
  handleError: PropTypes.func.isRequired,
  clearError: PropTypes.func.isRequired,
  error: PropTypes.string
};


export default ExtensionOptions;
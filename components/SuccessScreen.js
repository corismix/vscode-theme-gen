import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { spawn } from 'child_process';
import { useResponsiveLayout, useProgressiveDisclosure } from '../lib/terminal-utils.js';
import { ResponsiveHeader, ResponsiveText, ResponsiveCode, ResponsiveDescription } from './shared/ResponsiveText.js';
import { StandardHelp, useStandardKeyNav } from './shared/FocusIndicator.js';
import { AdaptiveGradient, SuccessText, StatusIndicator } from './shared/AdaptiveColorText.js';
import { UI_TEXT, PERFORMANCE_CONSTANTS, A11Y_CONSTANTS } from '../lib/constants.js';
import figures from 'figures';

// Staged content reveal phases using performance constants
const REVEAL_PHASES = [
  { id: 'celebration', duration: PERFORMANCE_CONSTANTS.REVEAL_TIMING.CELEBRATION },
  { id: 'summary', duration: PERFORMANCE_CONSTANTS.REVEAL_TIMING.SUMMARY },
  { id: 'commands', duration: PERFORMANCE_CONSTANTS.REVEAL_TIMING.COMMANDS },
  { id: 'options', duration: PERFORMANCE_CONSTANTS.REVEAL_TIMING.OPTIONS }
];

function SuccessScreen({
  generationResults = null,
  restart,
  exit
}) {
  const layout = useResponsiveLayout();
  const [currentPhase, setCurrentPhase] = useState(0);
  const [showCelebration, setShowCelebration] = useState(true);
  
  // Progressive disclosure based on terminal capabilities
  const compactFactor = PERFORMANCE_CONSTANTS.REVEAL_TIMING.COMPACT_FACTOR;
  const { isVisible: showSummary } = useProgressiveDisclosure(false, layout.showCompact ? PERFORMANCE_CONSTANTS.REVEAL_TIMING.CELEBRATION * compactFactor : PERFORMANCE_CONSTANTS.REVEAL_TIMING.CELEBRATION);
  const { isVisible: showCommands } = useProgressiveDisclosure(false, layout.showCompact ? (PERFORMANCE_CONSTANTS.REVEAL_TIMING.CELEBRATION + PERFORMANCE_CONSTANTS.REVEAL_TIMING.SUMMARY) * compactFactor : PERFORMANCE_CONSTANTS.REVEAL_TIMING.CELEBRATION + PERFORMANCE_CONSTANTS.REVEAL_TIMING.SUMMARY);
  const { isVisible: showOptions } = useProgressiveDisclosure(false, layout.showCompact ? (PERFORMANCE_CONSTANTS.REVEAL_TIMING.CELEBRATION + PERFORMANCE_CONSTANTS.REVEAL_TIMING.SUMMARY + PERFORMANCE_CONSTANTS.REVEAL_TIMING.COMMANDS) * compactFactor : PERFORMANCE_CONSTANTS.REVEAL_TIMING.CELEBRATION + PERFORMANCE_CONSTANTS.REVEAL_TIMING.SUMMARY + PERFORMANCE_CONSTANTS.REVEAL_TIMING.COMMANDS);

  useEffect(() => {
    // In compact mode, speed up the reveal
    const phaseDelay = layout.showCompact ? PERFORMANCE_CONSTANTS.REVEAL_TIMING.SUMMARY * compactFactor : PERFORMANCE_CONSTANTS.REVEAL_TIMING.SUMMARY;
    
    const timer = setTimeout(() => {
      setShowCelebration(false);
    }, layout.showCompact ? PERFORMANCE_CONSTANTS.REVEAL_TIMING.CELEBRATION * compactFactor : PERFORMANCE_CONSTANTS.REVEAL_TIMING.CELEBRATION);
    
    return () => clearTimeout(timer);
  }, [layout.showCompact, compactFactor]);

  const handleSelect = async (item) => {
    switch (item.value) {
      case 'open_vscode':
        await openInVSCode();
        break;
      case 'open_folder':
        await openFolder();
        break;
      case 'create_another':
        restart();
        break;
      case 'exit':
        exit();
        break;
    }
  };

  const openInVSCode = async () => {
    try {
      const childProcess = spawn('code', [generationResults.outputPath], { 
        detached: true,
        stdio: 'ignore'
      });
      
      childProcess.on('error', (err) => {
        // VS Code command not found or failed to execute
        console.error(`Failed to open VS Code: ${err.message}`);
        console.log(`To open in VS Code manually, run: code "${generationResults.outputPath}"`);
      });
      
      childProcess.unref(); // Prevent process from keeping Node alive
    } catch (err) {
      // Fallback: just show the path
      console.error(`Error spawning VS Code: ${err.message}`);
      console.log(`To open in VS Code, run: code "${generationResults.outputPath}"`);
    }
    exit();
  };

  const openFolder = async () => {
    try {
      const platform = process.platform;
      let command, args;
      
      if (platform === 'darwin') {
        command = 'open';
        args = [generationResults.outputPath];
      } else if (platform === 'win32') {
        command = 'explorer';
        args = [generationResults.outputPath];
      } else {
        command = 'xdg-open';
        args = [generationResults.outputPath];
      }
      
      const childProcess = spawn(command, args, { 
        detached: true,
        stdio: 'ignore'
      });
      
      childProcess.on('error', (err) => {
        // File manager command not found or failed to execute
        console.error(`Failed to open folder: ${err.message}`);
        console.log(`Extension created at: ${generationResults.outputPath}`);
      });
      
      childProcess.unref(); // Prevent process from keeping Node alive
    } catch (err) {
      // Fallback: just show the path
      console.error(`Error opening folder: ${err.message}`);
      console.log(`Extension created at: ${generationResults.outputPath}`);
    }
    exit();
  };

  const createMenuItems = () => [
    {
      label: `${figures.play} ${UI_TEXT.ACTIONS.OPEN_VSCODE}`,
      value: 'open_vscode'
    },
    {
      label: `${figures.folderOpen} ${UI_TEXT.ACTIONS.OPEN_FOLDER}`,
      value: 'open_folder'
    },
    {
      label: `${figures.refresh} ${UI_TEXT.ACTIONS.CREATE_ANOTHER}`,
      value: 'create_another'
    },
    {
      label: `${figures.cross} Exit`,
      value: 'exit'
    }
  ];

  // Standardized keyboard navigation
  const { showHelp, keyHandler } = useStandardKeyNav(
    createMenuItems(),
    handleSelect,
    exit
  );

  useInput(keyHandler);

  const renderCelebration = () => (
    <Box flexDirection="column" alignItems="center">
      <AdaptiveGradient 
        colors={['green', 'blue']}
        fallbackColor="green"
        noColorText="SUCCESS!"
      >
        <ResponsiveText
          text="SUCCESS!"
          variant="big"
          color="green"
        />
      </AdaptiveGradient>
      
      <Box marginTop={1}>
        <SuccessText text={UI_TEXT.SUCCESS_MESSAGES.EXTENSION_CREATED} />
      </Box>
    </Box>
  );

  const renderResults = () => {
    if (!generationResults) return null;
    
    const { themeName, outputPath, totalFiles, packageName } = generationResults;
    
    const resultItems = [
      `Theme Name: ${themeName}`,
      `Package Name: ${packageName}`,
      `Location: ${outputPath}`,
      `Files Generated: ${totalFiles}`
    ];

    const nextSteps = [
      UI_TEXT.SUCCESS_MESSAGES.NEXT_STEPS[0],
      'Use Ctrl+K Ctrl+T to switch to your theme',
      'Edit theme files to customize colors',
      'Run "vsce package" to create .vsix file',
      'Publish to VS Code marketplace'
    ];
    
    return (
      <Box flexDirection="column" marginBottom={layout.showCompact ? 2 : 3}>
        <ResponsiveText
          text={`${figures.package} Extension Details`}
          variant="subtitle"
          color="blue"
          bold
          marginBottom={layout.showCompact ? 1 : 2}
        />
        
        <Box 
          flexDirection="column" 
          borderStyle={layout.showBorders ? "round" : undefined}
          borderColor="green" 
          padding={layout.showBorders ? (layout.showCompact ? 1 : 2) : 0}
        >
          {/* Extension details */}
          {resultItems.map((item, index) => (
            <ResponsiveText
              key={index}
              text={`${figures.bullet} ${item}`}
              wrap="wrap"
              maxLength={layout.maxContentWidth}
            />
          ))}
          
          {/* Next steps - collapsed in compact mode */}
          {!layout.showCompact && (
            <Box 
              flexDirection="column" 
              borderStyle={layout.showBorders ? "single" : undefined}
              borderColor="gray" 
              padding={layout.showBorders ? 1 : 0}
              marginTop={2}
            >
              <ResponsiveText
                text={`${figures.lightBulb} Next Steps:`}
                variant="subtitle"
                color="blue"
                bold
                marginBottom={1}
              />
              {nextSteps.slice(0, layout.showCompact ? 3 : 5).map((step, index) => (
                <ResponsiveText
                  key={index}
                  text={`${index + 1}. ${step}`}
                  wrap="wrap"
                  maxLength={layout.maxContentWidth - 4}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  const renderQuickCommands = () => {
    if (layout.showCompact) return null; // Skip in compact mode
    
    const commands = [
      {
        label: `${UI_TEXT.ACTIONS.OPEN_VSCODE}:`,
        command: `code "${generationResults?.outputPath}"`
      },
      {
        label: 'Test the theme:',
        command: UI_TEXT.SUCCESS_MESSAGES.NEXT_STEPS[0]
      },
      {
        label: 'Package for distribution:',
        command: 'npm install -g vsce && vsce package'
      }
    ];

    return (
      <Box 
        flexDirection="column" 
        marginBottom={2} 
        borderStyle={layout.showBorders ? "round" : undefined}
        borderColor="blue" 
        padding={layout.showBorders ? 1 : 0}
      >
        <ResponsiveText
          text={`${figures.terminal} Quick Commands`}
          variant="subtitle"
          color="blue"
          bold
          marginBottom={1}
        />
        
        <Box flexDirection="column">
          {commands.map((cmd, index) => (
            <Box key={index} flexDirection="column" marginBottom={index < commands.length - 1 ? 1 : 0}>
              <ResponsiveText
                text={cmd.label}
                variant="caption"
                color="gray"
              />
              <ResponsiveCode
                code={cmd.command}
                wrap={false}
                maxLength={layout.maxContentWidth - 4}
              />
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  // Celebration phase
  if (showCelebration) {
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1} alignItems="center" justifyContent="center">
        {renderCelebration()}
        
        <Box marginTop={2}>
          <StatusIndicator
            status="loading"
            text="Preparing results..."
          />
        </Box>
      </Box>
    );
  }

  // Staged content reveal
  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      {/* Responsive Header */}
      <ResponsiveHeader
        title="Extension Created Successfully!"
        showBigText={false}
        color="green"
        marginBottom={layout.showCompact ? 1 : 2}
      />

      {/* Staged content reveal */}
      {showSummary && renderResults()}
      {showCommands && renderQuickCommands()}

      {/* Options */}
      {showOptions ? (
        <Box flexDirection="column">
          <ResponsiveText
            text="What would you like to do next?"
            variant="subtitle"
            color="blue"
            bold
            marginBottom={1}
          />
          <SelectInput 
            items={createMenuItems()} 
            onSelect={handleSelect}
            aria-label={A11Y_CONSTANTS.ARIA_LABELS.SUCCESS_ACTIONS}
          />
        </Box>
      ) : showSummary && (
        <StatusIndicator
          status="loading"
          text="Loading options..."
        />
      )}

      {/* Help section */}
      {showHelp && <StandardHelp layout={layout} />}

      {/* Footer - only show in full mode */}
      {!layout.showCompact && showOptions && (
        <Box 
          marginTop={2} 
          borderStyle={layout.showBorders ? "round" : undefined}
          borderColor="gray" 
          padding={layout.showBorders ? 1 : 0}
        >
          <Box flexDirection="column">
            <ResponsiveText
              text={`${figures.star} Thank you for using the VS Code Theme Generator!`}
              variant="caption"
              color="gray"
            />
            <ResponsiveText
              text={`${figures.heart} Star us on GitHub if you found this helpful`}
              variant="caption"
              color="gray"
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}

SuccessScreen.propTypes = {
  generationResults: PropTypes.shape({
    themeName: PropTypes.string.isRequired,
    outputPath: PropTypes.string.isRequired,
    themeFile: PropTypes.string,
    extensionFiles: PropTypes.array,
    totalFiles: PropTypes.number,
    packageName: PropTypes.string
  }),
  restart: PropTypes.func.isRequired,
  exit: PropTypes.func.isRequired
};


export default SuccessScreen;
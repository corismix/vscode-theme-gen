import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { getRecentFiles } from '../lib/utils.js';
import { useResponsiveLayout, useProgressiveDisclosure } from '../lib/terminal-utils.js';
import { ResponsiveHeader, ResponsiveDescription, ResponsiveList } from './shared/ResponsiveText.js';
import { StandardHelp, useStandardKeyNav } from './shared/FocusIndicator.js';
import { AdaptiveGradient, StatusIndicator } from './shared/AdaptiveColorText.js';
import { UI_TEXT, A11Y_CONSTANTS } from '../lib/constants.js';
import figures from 'figures';

function Welcome({ formData, goToNextStep, exit }) {
  const [recentFiles, setRecentFiles] = useState([]);
  const layout = useResponsiveLayout();
  
  // Progressive disclosure for options
  const { isVisible: showOptions } = useProgressiveDisclosure(
    layout.showCompact, // Show immediately in compact mode
    layout.showCompact ? 0 : 300 // Reduced delay for better UX
  );

  useEffect(() => {
    setRecentFiles(getRecentFiles());
  }, []);

  // Handle menu selection
  const handleSelect = (item) => {
    if (item.value === 'new') {
      goToNextStep();
    } else if (item.value === 'exit') {
      exit();
    } else if (item.value.startsWith('recent:')) {
      const index = parseInt(item.value.split(':')[1]);
      const recent = recentFiles[index];
      // Load recent file data - this would be handled by parent
      goToNextStep();
    }
  };

  // Create menu items for standardized navigation
  const createMenuItems = () => {
    const items = [
      {
        label: `${figures.play} ${UI_TEXT.ACTIONS.CREATE_NEW_THEME}`,
        value: 'new'
      }
    ];

    // Add recent files (limit based on terminal size)
    if (recentFiles.length > 0) {
      items.push({
        label: `${figures.arrowDown} ${UI_TEXT.ACTIONS.RECENT_FILES}`,
        value: 'separator',
        disabled: true
      });

      const maxRecent = layout.maxRecentFiles;
      recentFiles.slice(0, maxRecent).forEach((recent, index) => {
        items.push({
          label: `  ${figures.bullet} ${recent.name}`,
          value: `recent:${index}`,
          hint: layout.showCompact ? null : recent.path
        });
      });
      
      if (recentFiles.length > maxRecent) {
        items.push({
          label: `  ${figures.ellipsis} ${recentFiles.length - maxRecent} more files...`,
          value: 'more-recent',
          disabled: true
        });
      }
    }

    items.push({
      label: `${figures.cross} ${UI_TEXT.ACTIONS.EXIT}`,
      value: 'exit'
    });

    return items;
  };

  // Standardized keyboard navigation
  const menuItems = createMenuItems();
  const { showHelp, keyHandler } = useStandardKeyNav(
    menuItems,
    handleSelect,
    exit
  );

  useInput(keyHandler);

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1} role={A11Y_CONSTANTS.SEMANTIC_ROLES.MAIN}>
      {/* Responsive Header */}
      <AdaptiveGradient 
        colors={['blue', 'cyan']}
        fallbackColor="blue"
        noColorText="THEME GENERATOR"
      >
        <ResponsiveHeader
          title={UI_TEXT.APP_TITLE}
          subtitle={`${figures.star} ${UI_TEXT.APP_SUBTITLE} ${figures.star}`}
          showBigText={layout.useBigText}
        />
      </AdaptiveGradient>

      {/* Responsive Description */}
      <ResponsiveDescription
        lines={[
          "Transform your favorite terminal color schemes into beautiful VS Code themes",
          "with a complete extension structure ready for publishing."
        ]}
        compact={layout.showCompact}
        maxLines={layout.showCompact ? 1 : 2}
      />

      {/* Features List - responsive based on terminal size */}
      {!layout.showCompact && (
        <ResponsiveList
          items={[
            "Interactive theme configuration",
            "Live color preview", 
            "Complete VS Code extension generation",
            "Ready-to-publish package"
          ]}
          icon={figures.tick}
          color="green"
          maxItems={layout.maxFeatureItems}
        />
      )}

      {/* Options */}
      {showOptions ? (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color="blue" bold>
              {UI_TEXT.MESSAGES.WHAT_TO_DO}
            </Text>
          </Box>
          <SelectInput 
            items={menuItems} 
            onSelect={handleSelect}
            aria-label={A11Y_CONSTANTS.ARIA_LABELS.NAVIGATION_MENU}
          />
        </Box>
      ) : (
        <StatusIndicator
          status="loading"
          text={UI_TEXT.MESSAGES.LOADING_OPTIONS}
        />
      )}

      {/* Help and Navigation */}
      {showHelp && <StandardHelp layout={layout} />}

      {/* Footer - only show if not in compact mode */}
      {!layout.showCompact && (
        <Box 
          marginTop={2} 
          borderStyle={layout.showBorders ? "round" : undefined}
          borderColor="gray" 
          padding={layout.showBorders ? 1 : 0}
        >
          <Box flexDirection="column">
            <Text color="gray" dimColor>
              {figures.info} {UI_TEXT.MESSAGES.HELP_AND_EXIT}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}

Welcome.propTypes = {
  formData: PropTypes.object.isRequired,
  goToNextStep: PropTypes.func.isRequired,
  exit: PropTypes.func.isRequired
};

export default Welcome;
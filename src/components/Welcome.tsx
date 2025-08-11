/**
 * Welcome component for VS Code Theme Generator
 * Professional welcome screen with recent files and TweakCC-style navigation
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppContext } from '../context/AppContext';
import { useNotifications } from '../hooks/useNotifications';
import { readConfigFile, validateRecentFiles, addRecentFile } from '../utils/config';
import { RecentFile } from '@/types';
import { SelectInput } from './SelectInput';
import { Header } from './shared/Header';
import { InfoBox } from './shared/InfoBox';
import { KeyboardShortcuts } from './shared/KeyboardShortcuts';

// ============================================================================
// Types
// ============================================================================

interface WelcomeAction {
  label: string;
  value: 'new' | 'recent' | 'browse' | 'exit';
  description?: string;
}

// ============================================================================
// Welcome Component
// ============================================================================

const Welcome: React.FC = () => {
  const { navigation, updateFormData, updateConfig } = useAppContext();
  const { addNotification } = useNotifications();
  
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [showRecentFiles, setShowRecentFiles] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ============================================================================
  // Load Configuration and Recent Files
  // ============================================================================

  const loadRecentFiles = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Validate recent files first (removes invalid ones)
      await validateRecentFiles();
      
      // Load configuration
      const config = await readConfigFile();
      setRecentFiles(config.recentFiles || []);
      
      // Update app context with config
      updateConfig(() => config);
      
      setIsLoading(false);
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to load recent files',
        details: (error as Error).message,
      });
      setIsLoading(false);
    }
  }, [addNotification, updateConfig]);

  useEffect(() => {
    loadRecentFiles();
  }, [loadRecentFiles]);

  // ============================================================================
  // Actions and Navigation
  // ============================================================================

  const mainActions: WelcomeAction[] = [
    {
      label: '🆕 Create New Theme',
      value: 'new',
      description: 'Select a new Ghostty theme file to convert'
    },
    ...(recentFiles.length > 0 ? [{
      label: `📁 Recent Files (${recentFiles.length})`,
      value: 'recent' as const,
      description: 'Choose from recently used theme files'
    }] : []),
    {
      label: '📂 Browse Files',
      value: 'browse',
      description: 'Browse and select theme files from your filesystem'
    },
    {
      label: '🚪 Exit',
      value: 'exit',
      description: 'Close the theme generator'
    }
  ];

  const handleMainAction = useCallback((action: WelcomeAction) => {
    
    switch (action.value) {
      case 'new':
      case 'browse':
        navigation.goToStep('file-selection');
        break;
      case 'recent':
        if (recentFiles.length > 0) {
          setShowRecentFiles(true);
        } else {
          addNotification({
            type: 'info',
            message: 'No recent files available',
            details: 'Use "Create New Theme" to get started'
          });
        }
        break;
      case 'exit':
        process.exit(0);
        break;
    }
  }, [navigation, recentFiles.length, addNotification]);

  const handleRecentFileSelect = useCallback(async (file: RecentFile) => {
    try {
      // Update the form data with the selected file
      updateFormData({
        inputFile: file.path,
        // Pre-populate with previous values if they exist
        themeName: file.name.replace(/\.(txt|theme)$/, ''),
      });

      // Update the recent file's last used time
      await addRecentFile(file.path, file.name);
      
      addNotification({
        type: 'success',
        message: 'Recent file selected',
        details: `Selected: ${file.name}`
      });

      // Navigate to theme configuration
      navigation.goToStep('theme-config');
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to load recent file',
        details: (error as Error).message
      });
    }
  }, [updateFormData, navigation, addNotification]);

  const handleBackFromRecent = useCallback(() => {
    setShowRecentFiles(false);
  }, []);

  // ============================================================================
  // Keyboard Navigation
  // ============================================================================

  useInput((_input, key) => {
    if (showRecentFiles) {
      // Let SelectInput handle recent files navigation
      if (key.escape) {
        handleBackFromRecent();
      }
    } else {
      // Main menu navigation
      if (key.escape) {
        process.exit(0);
      }
    }
  });

  // ============================================================================
  // Recent Files Items
  // ============================================================================

  const recentFileItems = recentFiles.map(file => ({
    label: `${file.name}`,
    value: file.path,
    description: `${file.path} • Last used: ${new Date(file.lastUsed).toLocaleDateString()}`
  }));

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <Box flexDirection="column" minHeight={20}>
        <Header title="VS Code Theme Generator" />
        <Box justifyContent="center" alignItems="center" flexGrow={1}>
          <Text color="cyan">Loading configuration...</Text>
        </Box>
      </Box>
    );
  }

  if (showRecentFiles) {
    return (
      <Box flexDirection="column" minHeight={20}>
        <Header 
          title="Recent Files" 
          subtitle={`${recentFiles.length} recently used theme files`}
        />
        
        <Box flexGrow={1} paddingX={2} paddingY={1}>
          {recentFiles.length > 0 ? (
            <SelectInput
              items={recentFileItems}
              onSelect={(item) => {
                const file = recentFiles.find(f => f.path === item.value);
                if (file) {
                  handleRecentFileSelect(file);
                }
              }}
              label="Select a recent file:"
              placeholder="Use arrow keys to navigate, Enter to select"
            />
          ) : (
            <InfoBox
              type="info"
              title="No Recent Files"
              message="You haven't used any theme files recently"
              actions={[
                { label: 'Create New Theme', action: () => navigation.goToStep('file-selection') }
              ]}
            />
          )}
        </Box>

        <KeyboardShortcuts
          shortcuts={[
            { key: 'up', description: 'Navigate files', action: () => {} },
            { key: 'down', description: 'Navigate files', action: () => {} },
            { key: 'enter', description: 'Select file', action: () => {} },
            { key: 'escape', description: 'Back to main menu', action: handleBackFromRecent }
          ]}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" minHeight={20}>
      <Header 
        title="🎨 VS Code Theme Generator" 
        subtitle="Convert Ghostty terminal themes to VS Code extensions"
      />
      
      <Box flexGrow={1} paddingX={2} paddingY={1}>
        <Box flexDirection="column">
          <Box marginBottom={2}>
            <InfoBox
              type="info"
              title="Welcome!"
              message="Transform your terminal color schemes into beautiful VS Code themes"
            />
          </Box>

          <SelectInput
            items={mainActions.map(action => ({
              label: action.label,
              value: action.value,
              description: action.description
            }))}
            onSelect={(item) => {
              const action = mainActions.find(a => a.value === item.value);
              if (action) {
                handleMainAction(action);
              }
            }}
            label="What would you like to do?"
            placeholder="Use arrow keys to navigate, Enter to select"
          />

          {recentFiles.length > 0 && (
            <Box marginTop={2}>
              <InfoBox
                type="success"
                title="Quick Start"
                message={`You have ${recentFiles.length} recent theme file${recentFiles.length !== 1 ? 's' : ''} available`}
              />
            </Box>
          )}
        </Box>
      </Box>

      <KeyboardShortcuts
        shortcuts={[
          { key: 'up', description: 'Navigate options', action: () => {} },
          { key: 'down', description: 'Navigate options', action: () => {} },
          { key: 'enter', description: 'Select option', action: () => {} },
          { key: 'escape', description: 'Exit application', action: () => process.exit(0) }
        ]}
      />
    </Box>
  );
};

export default Welcome;
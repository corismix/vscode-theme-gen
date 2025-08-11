/**
 * FileSelector component for VS Code Theme Generator
 * Professional file selection with browsing, validation, and TweakCC-style navigation
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { promises as fs } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { homedir } from 'os';
import { useAppContext } from '../context/AppContext';
import { useNotifications } from '../hooks/useNotifications';
import { processError } from '../utils/error-handling';
import { SelectInput } from './SelectInput';
import { TextInput } from './TextInput';
import { Header } from './shared/Header';
import { InfoBox } from './shared/InfoBox';
import { KeyboardShortcuts } from './shared/KeyboardShortcuts';
import { addRecentFile } from '../utils/config';

// ============================================================================
// Types
// ============================================================================

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  isThemeFile?: boolean;
  isValid?: boolean;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  themeInfo?: {
    name?: string;
    colors: Record<string, string>;
    colorCount: number;
  };
}

type ViewMode = 'browse' | 'manual' | 'validation';

// ============================================================================
// Utility Functions
// ============================================================================

const isThemeFile = (filename: string): boolean => {
  const ext = extname(filename).toLowerCase();
  return ext === '.txt' || ext === '.theme' || ext === '.conf';
};

const validateThemeFile = async (filePath: string): Promise<ValidationResult> => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const colors: Record<string, string> = {};
    
    // Parse theme file
    let hasBackground = false;
    let hasForeground = false;
    let colorCount = 0;
    
    for (const line of lines) {
      if (line.startsWith('#') || !line.includes('=')) continue;
      
      const [key, value] = line.split('=').map(s => s.trim());
      if (!key || !value) continue;
      
      if (key === 'background') hasBackground = true;
      if (key === 'foreground') hasForeground = true;
      if (key.startsWith('color')) colorCount++;
      
      // Validate hex color format
      if (!value.match(/^#[0-9a-fA-F]{6}$/)) {
        warnings.push(`Invalid color format for ${key}: ${value}`);
      }
      
      colors[key] = value;
    }
    
    // Validation checks
    if (!hasBackground) {
      errors.push('Missing background color definition');
    }
    
    if (!hasForeground) {
      errors.push('Missing foreground color definition');
    }
    
    if (colorCount < 8) {
      warnings.push(`Only ${colorCount} colors defined, typically 16 colors expected`);
    }
    
    if (Object.keys(colors).length === 0) {
      errors.push('No valid color definitions found');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      themeInfo: {
        name: basename(filePath, extname(filePath)),
        colors,
        colorCount
      }
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [`Failed to read file: ${(error as Error).message}`],
      warnings: []
    };
  }
};

const listDirectory = async (dirPath: string): Promise<FileItem[]> => {
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    const fileItems: FileItem[] = [];
    
    // Add parent directory if not at root
    if (dirPath !== '/' && dirPath !== homedir()) {
      fileItems.push({
        name: '..',
        path: dirname(dirPath),
        isDirectory: true
      });
    }
    
    // Process directory items
    for (const item of items) {
      const itemPath = join(dirPath, item.name);
      const isTheme = !item.isDirectory() && isThemeFile(item.name);
      
      fileItems.push({
        name: item.name,
        path: itemPath,
        isDirectory: item.isDirectory(),
        isThemeFile: isTheme,
        isValid: undefined // Will be determined during validation
      });
    }
    
    // Sort: directories first, then theme files, then other files
    return fileItems.sort((a, b) => {
      if (a.name === '..') return -1;
      if (b.name === '..') return 1;
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      if (a.isThemeFile !== b.isThemeFile) {
        return a.isThemeFile ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    throw new Error(`Cannot access directory: ${(error as Error).message}`);
  }
};

// ============================================================================
// FileSelector Component
// ============================================================================

const FileSelector: React.FC = () => {
  const { formData, updateFormData, navigation } = useAppContext();
  const { addNotification } = useNotifications();
  
  const [viewMode, setViewMode] = useState<ViewMode>('browse');
  const [currentPath, setCurrentPath] = useState<string>(homedir());
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [manualPath, setManualPath] = useState<string>(formData.inputFile || '');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // ============================================================================
  // Directory Loading
  // ============================================================================

  const loadDirectory = useCallback(async (path: string) => {
    try {
      setIsLoading(true);
      const items = await listDirectory(path);
      setFiles(items);
      setCurrentPath(path);
    } catch (error) {
      const userError = processError(error);
      addNotification({
        type: 'error',
        message: userError.title,
        details: userError.message
      });
      // Try to fall back to home directory
      if (path !== homedir()) {
        await loadDirectory(homedir());
      }
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadDirectory(currentPath);
  }, [loadDirectory, currentPath]);

  // ============================================================================
  // File Selection Handlers
  // ============================================================================

  const handleFileSelect = useCallback(async (item: FileItem) => {
    if (item.isDirectory) {
      await loadDirectory(item.path);
    } else if (item.isThemeFile) {
      setIsLoading(true);
      
      try {
        const validation = await validateThemeFile(item.path);
        setValidationResult(validation);
        
        if (validation.isValid) {
          updateFormData({ 
            inputFile: item.path,
            themeName: validation.themeInfo?.name || basename(item.name, extname(item.name))
          });
          
          // Add to recent files
          await addRecentFile(item.path, item.name);
          
          addNotification({
            type: 'success',
            message: 'Theme file selected',
            details: `${item.name} is ready for processing`
          });
          
          navigation.goToStep('theme-config');
        } else {
          setViewMode('validation');
        }
      } catch (error) {
        const userError = processError(error);
        addNotification({
          type: 'error',
          message: userError.title,
          details: userError.message
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      addNotification({
        type: 'warning',
        message: 'Invalid File Type',
        details: 'Please select a theme file (.txt, .theme, or .conf)'
      });
    }
  }, [addNotification, navigation, updateFormData]);

  const handleManualPathSubmit = useCallback(async () => {
    if (!manualPath.trim()) {
      addNotification({
        type: 'warning',
        message: 'Empty Path',
        details: 'Please enter a file path'
      });
      return;
    }

    try {
      const stats = await fs.stat(manualPath);
      if (stats.isFile()) {
        if (isThemeFile(manualPath)) {
          const validation = await validateThemeFile(manualPath);
          setValidationResult(validation);
          
          if (validation.isValid) {
            updateFormData({ 
              inputFile: manualPath,
              themeName: validation.themeInfo?.name || basename(manualPath, extname(manualPath))
            });
            
            await addRecentFile(manualPath, basename(manualPath));
            
            addNotification({
              type: 'success',
              message: 'Theme file selected',
              details: `File is ready for processing`
            });
            
            navigation.goToStep('theme-config');
          } else {
            setViewMode('validation');
          }
        } else {
          addNotification({
            type: 'warning',
            message: 'Invalid File Type',
            details: 'File must have .txt, .theme, or .conf extension'
          });
        }
      } else {
        addNotification({
          type: 'error',
          message: 'Invalid Path',
          details: 'Path must point to a file, not a directory'
        });
      }
    } catch (error) {
      const userError = processError(error);
      addNotification({
        type: 'error',
        message: userError.title,
        details: userError.message
      });
    }
  }, [manualPath, addNotification, navigation, updateFormData]);

  // ============================================================================
  // Navigation Handlers
  // ============================================================================

  const handleBack = useCallback(() => {
    if (viewMode === 'validation') {
      setViewMode('browse');
      setValidationResult(null);
    } else if (viewMode === 'manual') {
      setViewMode('browse');
    } else {
      navigation.goToPreviousStep();
    }
  }, [viewMode, navigation]);

  // ============================================================================
  // Keyboard Navigation
  // ============================================================================

  useInput((input, key) => {
    if (viewMode === 'browse') {
      if (key.escape) {
        navigation.goToPreviousStep();
      } else if (input === 'm') {
        setViewMode('manual');
      } else if (input === 'r') {
        loadDirectory(currentPath);
      }
    } else if (viewMode === 'manual') {
      if (key.escape) {
        setViewMode('browse');
      }
    } else if (viewMode === 'validation') {
      if (key.escape) {
        setViewMode('browse');
        setValidationResult(null);
      }
    }
  });

  // ============================================================================
  // File List Items
  // ============================================================================

  const fileListItems = files.map(file => {
    let icon = file.isDirectory ? '📁' : '📄';
    if (file.isThemeFile) icon = '🎨';
    if (file.name === '..') icon = '↩️';
    
    let description = file.isDirectory 
      ? 'Directory' 
      : file.isThemeFile 
        ? 'Theme file' 
        : 'File';
    
    if (file.name === '..') description = 'Parent directory';

    return {
      label: `${icon} ${file.name}`,
      value: file.path,
      description: `${description} - ${file.path}`
    };
  });

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <Box flexDirection="column" minHeight={20}>
        <Header title="Loading..." />
        <Box justifyContent="center" alignItems="center" flexGrow={1}>
          <Text color="cyan">Loading directory contents...</Text>
        </Box>
      </Box>
    );
  }

  // Validation View
  if (viewMode === 'validation' && validationResult) {
    return (
      <Box flexDirection="column" minHeight={20}>
        <Header 
          title="File Validation" 
          subtitle={validationResult.isValid ? 'File is valid' : 'Validation issues found'}
        />
        
        <Box flexGrow={1} paddingX={2} paddingY={1}>
          <Box flexDirection="column">
            {/* Errors */}
            {validationResult.errors.length > 0 && (
              <Box marginBottom={2}>
                <InfoBox
                  type="error"
                  title="Validation Errors"
                  message={validationResult.errors.join('\n')}
                />
              </Box>
            )}

            {/* Warnings */}
            {validationResult.warnings.length > 0 && (
              <Box marginBottom={2}>
                <InfoBox
                  type="warning"
                  title="Warnings"
                  message={validationResult.warnings.join('\n')}
                />
              </Box>
            )}

            {/* Theme Info */}
            {validationResult.themeInfo && (
              <Box marginBottom={2}>
                <InfoBox
                  type="info"
                  title="Theme Information"
                  message={`Theme: ${validationResult.themeInfo.name}\nColors found: ${validationResult.themeInfo.colorCount}\nTotal properties: ${Object.keys(validationResult.themeInfo.colors).length}`}
                />
              </Box>
            )}

            {/* Actions */}
            <Box flexDirection="row" gap={2}>
              {validationResult.isValid && (
                <Text color="green">[Enter] Continue anyway</Text>
              )}
              <Text color="yellow">[Esc] Go back</Text>
            </Box>
          </Box>
        </Box>

        <KeyboardShortcuts
          shortcuts={[
            ...(validationResult.isValid ? [{
              key: 'enter',
              description: 'Continue with file',
              action: () => navigation.goToStep('theme-config')
            }] : []),
            { key: 'escape', description: 'Go back', action: handleBack }
          ]}
        />
      </Box>
    );
  }

  // Manual Path Entry View
  if (viewMode === 'manual') {
    return (
      <Box flexDirection="column" minHeight={20}>
        <Header 
          title="Enter File Path" 
          subtitle="Manually specify the path to your theme file"
        />
        
        <Box flexGrow={1} paddingX={2} paddingY={1}>
          <Box flexDirection="column">
            <Box marginBottom={2}>
              <InfoBox
                type="info"
                title="File Path Entry"
                message="Enter the full path to your Ghostty theme file"
              />
            </Box>

            <TextInput
              placeholder="Enter file path (e.g., /path/to/theme.txt)"
              value={manualPath}
              onChange={setManualPath}
              onSubmit={handleManualPathSubmit}
            />
          </Box>
        </Box>

        <KeyboardShortcuts
          shortcuts={[
            { key: 'enter', description: 'Select file', action: handleManualPathSubmit },
            { key: 'escape', description: 'Back to browse', action: handleBack }
          ]}
        />
      </Box>
    );
  }

  // File Browser View (default)
  return (
    <Box flexDirection="column" minHeight={20}>
      <Header 
        title="Select Theme File" 
        subtitle={`Current directory: ${currentPath}`}
      />
      
      <Box flexGrow={1} paddingX={2} paddingY={1}>
        <Box flexDirection="column">
          <Box marginBottom={2}>
            <InfoBox
              type="info"
              title="File Selection"
              message="Browse and select a Ghostty theme file (.txt, .theme, or .conf)"
            />
          </Box>

          {files.length > 0 ? (
            <SelectInput
              items={fileListItems}
              onSelect={(item) => {
                const file = files.find(f => f.path === item.value);
                if (file) {
                  handleFileSelect(file);
                }
              }}
              label="Select a file or directory:"
              placeholder="Use arrow keys to navigate, Enter to select"
              limit={15}
            />
          ) : (
            <InfoBox
              type="warning"
              title="Empty Directory"
              message="No files or directories found in this location"
            />
          )}
        </Box>
      </Box>

      <KeyboardShortcuts
        shortcuts={[
          { key: 'up', description: 'Navigate files', action: () => {} },
          { key: 'down', description: 'Navigate files', action: () => {} },
          { key: 'enter', description: 'Select file/directory', action: () => {} },
          { key: 'm', description: 'Manual path entry', action: () => setViewMode('manual') },
          { key: 'r', description: 'Refresh directory', action: () => loadDirectory(currentPath) },
          { key: 'escape', description: 'Back to previous step', action: handleBack }
        ]}
      />
    </Box>
  );
};

export default FileSelector;
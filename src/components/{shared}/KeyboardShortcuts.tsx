/**
 * Keyboard Shortcuts component
 * Manages and displays keyboard shortcuts with help system
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { KeyboardShortcutsProps, KeyboardShortcut } from './types';
import { useKeyboard } from './hooks';

// ============================================================================
// Color Configuration
// ============================================================================

const colors = {
  primary: '#3B82F6',
  secondary: '#8B5CF6',
  text: '#F9FAFB',
  textMuted: '#9CA3AF',
  border: '#374151',
  key: '#10B981',
  description: '#F9FAFB',
  category: '#F59E0B'
};

// ============================================================================
// Help Panel Component
// ============================================================================

interface HelpPanelProps {
  shortcuts: KeyboardShortcut[];
  category?: string;
  onClose: () => void;
}

const HelpPanel: React.FC<HelpPanelProps> = ({ shortcuts, category, onClose }) => {
  const enabledShortcuts = shortcuts.filter(shortcut => shortcut.enabled !== false);
  const globalShortcuts = enabledShortcuts.filter(s => s.global);
  const localShortcuts = enabledShortcuts.filter(s => !s.global);

  const renderShortcut = (shortcut: KeyboardShortcut, index: number) => (
    <Box key={index} marginBottom={1}>
      <Box width={15} marginRight={2}>
        <Text color={colors.key} bold>
          {shortcut.key}
        </Text>
      </Box>
      <Box flex={1}>
        <Text color={colors.description}>
          {shortcut.description}
        </Text>
      </Box>
    </Box>
  );

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={colors.border}
      paddingX={2}
      paddingY={1}
      width={60}
    >
      {/* Header */}
      <Box justifyContent="space-between" marginBottom={2}>
        <Text color={colors.primary} bold>
          🎹 Keyboard Shortcuts {category && `- ${category}`}
        </Text>
        <Text color={colors.textMuted} dimColor>
          Press Esc to close
        </Text>
      </Box>

      {/* Local shortcuts */}
      {localShortcuts.length > 0 && (
        <Box flexDirection="column" marginBottom={2}>
          <Text color={colors.category} bold marginBottom={1}>
            Local Shortcuts
          </Text>
          {localShortcuts.map((shortcut, index) => renderShortcut(shortcut, index))}
        </Box>
      )}

      {/* Global shortcuts */}
      {globalShortcuts.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color={colors.category} bold marginBottom={1}>
            Global Shortcuts
          </Text>
          {globalShortcuts.map((shortcut, index) => renderShortcut(shortcut, index))}
        </Box>
      )}

      {/* Footer */}
      <Box borderTop borderColor={colors.border} paddingTop={1} marginTop={1}>
        <Text color={colors.textMuted} dimColor>
          💡 Tip: Use {category || 'shortcuts'} for faster navigation
        </Text>
      </Box>
    </Box>
  );
};

// ============================================================================
// Shortcuts Summary Component
// ============================================================================

interface ShortcutsSummaryProps {
  shortcuts: KeyboardShortcut[];
  onShowHelp: () => void;
}

const ShortcutsSummary: React.FC<ShortcutsSummaryProps> = ({ shortcuts, onShowHelp }) => {
  const enabledShortcuts = shortcuts.filter(shortcut => shortcut.enabled !== false);
  const quickShortcuts = enabledShortcuts.slice(0, 3); // Show first 3 shortcuts

  return (
    <Box alignItems="center">
      {quickShortcuts.map((shortcut, index) => (
        <Box key={index} marginRight={2}>
          <Text color={colors.key}>{shortcut.key}</Text>
          <Text color={colors.textMuted} marginLeft={1} dimColor>
            {shortcut.description.split(' ')[0]}
          </Text>
        </Box>
      ))}
      
      {enabledShortcuts.length > 3 && (
        <Box marginLeft={1}>
          <Text color={colors.textMuted} dimColor>
            +{enabledShortcuts.length - 3} more
          </Text>
        </Box>
      )}
      
      <Text color={colors.secondary} marginLeft={2}>
        [?] help
      </Text>
    </Box>
  );
};

// ============================================================================
// Main KeyboardShortcuts Component
// ============================================================================

const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  shortcuts = [],
  showHelp = true,
  helpToggleKey = '?',
  globalEnabled = true,
  category,
  className,
  testId
}) => {
  const [helpVisible, setHelpVisible] = useState(false);

  // Setup keyboard handlers
  const keyboardHandlers: Record<string, () => void> = {};
  
  // Add shortcut handlers
  shortcuts.forEach(shortcut => {
    if (shortcut.enabled !== false && (globalEnabled || !shortcut.global)) {
      keyboardHandlers[shortcut.key] = shortcut.action;
    }
  });

  // Add help toggle handler
  if (showHelp) {
    keyboardHandlers[helpToggleKey] = () => setHelpVisible(prev => !prev);
    keyboardHandlers['escape'] = () => setHelpVisible(false);
  }

  // Apply keyboard handlers
  useKeyboard(keyboardHandlers, {
    enabled: globalEnabled
  });

  // If help is visible, show the help panel
  if (helpVisible && showHelp) {
    return (
      <HelpPanel
        shortcuts={shortcuts}
        category={category}
        onClose={() => setHelpVisible(false)}
      />
    );
  }

  // Show shortcuts summary
  return (
    <Box className={className} data-testid={testId}>
      <ShortcutsSummary
        shortcuts={shortcuts}
        onShowHelp={() => setHelpVisible(true)}
      />
    </Box>
  );
};

export default KeyboardShortcuts;
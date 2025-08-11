/**
 * Confirmation Dialog Component for VS Code Theme Generator
 * Provides user confirmation for destructive or important actions
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Text } from 'ink';
import { useKeyboardHandler, KeyBinding } from '../../utils/keyboard';

// ============================================================================
// Types
// ============================================================================

export interface ConfirmDialogProps {
  message: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  details?: string;
  showDetails?: boolean;
  defaultAction?: 'confirm' | 'cancel';
  autoFocus?: boolean;
  width?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

interface ConfirmButtonProps {
  text: string;
  focused: boolean;
  destructive?: boolean;
  primary?: boolean;
  shortcut?: string;
  onClick: () => void;
}

// ============================================================================
// Confirm Button Component
// ============================================================================

const ConfirmButton: React.FC<ConfirmButtonProps> = ({
  text,
  focused,
  destructive = false,
  primary = false,
  shortcut
}) => {
  const getButtonColor = () => {
    if (focused) {
      if (destructive) return 'redBright';
      if (primary) return 'cyanBright';
      return 'whiteBright';
    }
    
    if (destructive) return 'red';
    if (primary) return 'cyan';
    return 'white';
  };

  const getButtonBorder = () => {
    if (focused) {
      return destructive ? 'red' : 'cyan';
    }
    return 'gray';
  };

  const getButtonChar = () => {
    if (focused) {
      return destructive ? '▶' : '▶';
    }
    return ' ';
  };

  return (
    <Box
      borderStyle="single"
      borderColor={getButtonBorder()}
      paddingX={2}
      paddingY={0}
      marginX={1}
    >
      <Box alignItems="center">
        <Text color={getButtonColor()}>
          {getButtonChar()} {text}
        </Text>
        {shortcut && (
          <Box marginLeft={1}>
            <Text color="gray" dimColor>
              ({shortcut})
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ============================================================================
// Dialog Icon Component
// ============================================================================

const DialogIcon: React.FC<{ type: 'warning' | 'question' | 'danger' | 'info' }> = ({ type }) => {
  const iconMap = {
    warning: { icon: '⚠️', color: 'yellow' as const },
    question: { icon: '❓', color: 'cyan' as const },
    danger: { icon: '🚨', color: 'red' as const },
    info: { icon: 'ℹ️', color: 'blue' as const }
  };

  const { icon, color } = iconMap[type];

  return (
    <Text color={color} bold>
      {icon}
    </Text>
  );
};

// ============================================================================
// Main Confirm Dialog Component
// ============================================================================

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  message,
  title,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive = false,
  details,
  showDetails: initialShowDetails = false,
  defaultAction = 'cancel',
  autoFocus = true,
  width = 60,
  onConfirm,
  onCancel
}) => {
  const [focusedButton, setFocusedButton] = useState<'confirm' | 'cancel'>(defaultAction);
  const [showDetails, setShowDetails] = useState(initialShowDetails);
  const [mounted, setMounted] = useState(false);

  // Auto-focus effect
  useEffect(() => {
    if (autoFocus) {
      setMounted(true);
    }
  }, [autoFocus]);

  // Dialog type determination
  const dialogType = useMemo((): 'warning' | 'question' | 'danger' | 'info' => {
    if (destructive) return 'danger';
    if (title?.toLowerCase().includes('warning')) return 'warning';
    if (message.includes('?')) return 'question';
    return 'info';
  }, [destructive, title, message]);

  // Action handlers
  const handleConfirm = useCallback(() => {
    try {
      onConfirm();
    } catch (error) {
      console.error('Error in confirm handler:', error);
    }
  }, [onConfirm]);

  const handleCancel = useCallback(() => {
    try {
      onCancel();
    } catch (error) {
      console.error('Error in cancel handler:', error);
    }
  }, [onCancel]);

  const toggleDetails = useCallback(() => {
    setShowDetails(prev => !prev);
  }, []);

  const switchFocus = useCallback(() => {
    setFocusedButton(prev => prev === 'confirm' ? 'cancel' : 'confirm');
  }, []);

  // Keyboard shortcuts
  const keyBindings: KeyBinding[] = useMemo(() => [
    {
      key: 'y',
      description: 'Confirm action',
      action: handleConfirm,
      category: 'actions'
    },
    {
      key: 'n',
      description: 'Cancel action',
      action: handleCancel,
      category: 'actions'
    },
    {
      key: 'Enter',
      description: 'Execute focused action',
      action: () => {
        if (focusedButton === 'confirm') {
          handleConfirm();
        } else {
          handleCancel();
        }
      },
      category: 'actions'
    },
    {
      key: 'Escape',
      description: 'Cancel action',
      action: handleCancel,
      category: 'actions'
    },
    {
      key: 'Tab',
      description: 'Switch focus',
      action: switchFocus,
      category: 'navigation'
    },
    {
      key: 'ArrowLeft',
      description: 'Focus previous button',
      action: () => setFocusedButton('cancel'),
      category: 'navigation'
    },
    {
      key: 'ArrowRight',
      description: 'Focus next button',
      action: () => setFocusedButton('confirm'),
      category: 'navigation'
    },
    ...(details ? [{
      key: 'i',
      description: 'Toggle details',
      action: toggleDetails,
      category: 'panels' as const
    }] : [])
  ], [focusedButton, handleConfirm, handleCancel, switchFocus, toggleDetails, details]);

  useKeyboardHandler(keyBindings, { 
    enabled: mounted,
    context: 'dialog',
    preventDefault: true 
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={destructive ? 'red' : 'cyan'}
      paddingX={3}
      paddingY={2}
      width={width}
      alignItems="center"
      justifyContent="center"
    >
      {/* Header */}
      <Box marginBottom={1} alignItems="center">
        <DialogIcon type={dialogType} />
        <Text color="white" bold marginLeft={1}>
          {title || (destructive ? 'Confirm Action' : 'Confirmation Required')}
        </Text>
      </Box>

      {/* Message */}
      <Box marginBottom={2} flexDirection="column" alignItems="center">
        <Text color="white" wrap="wrap">
          {message}
        </Text>
      </Box>

      {/* Details Section */}
      {details && (
        <Box marginBottom={2} flexDirection="column" width="100%">
          <Box marginBottom={1}>
            <Text color="gray" dimColor>
              Details {showDetails ? '▼' : '▶'} (Press 'i' to toggle)
            </Text>
          </Box>
          
          {showDetails && (
            <Box 
              borderStyle="single" 
              borderColor="gray" 
              paddingX={2} 
              paddingY={1}
            >
              <Text color="gray" wrap="wrap">
                {details}
              </Text>
            </Box>
          )}
        </Box>
      )}

      {/* Action Buttons */}
      <Box marginBottom={1} alignItems="center">
        <ConfirmButton
          text={cancelText}
          focused={focusedButton === 'cancel'}
          shortcut="n"
          onClick={handleCancel}
        />
        
        <ConfirmButton
          text={confirmText}
          focused={focusedButton === 'confirm'}
          destructive={destructive}
          primary={!destructive}
          shortcut="y"
          onClick={handleConfirm}
        />
      </Box>

      {/* Keyboard Help */}
      <Box borderTop borderColor="gray" paddingTop={1}>
        <Text color="gray" dimColor>
          💡 Use ←/→ to switch focus, Enter to execute, Esc to cancel
        </Text>
      </Box>
    </Box>
  );
};

// ============================================================================
// Specialized Confirm Dialogs
// ============================================================================

/**
 * Quick confirmation for simple yes/no questions
 */
export const QuickConfirm: React.FC<{
  message: string;
  onYes: () => void;
  onNo: () => void;
}> = ({ message, onYes, onNo }) => (
  <ConfirmDialog
    message={message}
    confirmText="Yes"
    cancelText="No"
    width={40}
    onConfirm={onYes}
    onCancel={onNo}
  />
);

/**
 * Destructive action confirmation
 */
export const DestructiveConfirm: React.FC<{
  action: string;
  target: string;
  details?: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ action, target, details, onConfirm, onCancel }) => (
  <ConfirmDialog
    title="⚠️ Destructive Action"
    message={`Are you sure you want to ${action} "${target}"?`}
    details={details || 'This action cannot be undone.'}
    confirmText={`${action.charAt(0).toUpperCase() + action.slice(1)}`}
    cancelText="Keep Safe"
    destructive={true}
    defaultAction="cancel"
    showDetails={true}
    onConfirm={onConfirm}
    onCancel={onCancel}
  />
);

/**
 * Exit confirmation dialog
 */
export const ExitConfirm: React.FC<{
  hasUnsavedChanges?: boolean;
  onExit: () => void;
  onCancel: () => void;
}> = ({ hasUnsavedChanges = false, onExit, onCancel }) => (
  <ConfirmDialog
    title="🚪 Exit Application"
    message={hasUnsavedChanges 
      ? "You have unsaved changes. Are you sure you want to exit?" 
      : "Are you sure you want to exit?"
    }
    details={hasUnsavedChanges 
      ? "Any unsaved progress will be lost. Consider saving your work first."
      : undefined
    }
    confirmText="Exit"
    cancelText="Stay"
    destructive={hasUnsavedChanges}
    defaultAction={hasUnsavedChanges ? 'cancel' : 'confirm'}
    showDetails={hasUnsavedChanges}
    onConfirm={onExit}
    onCancel={onCancel}
  />
);

export default ConfirmDialog;
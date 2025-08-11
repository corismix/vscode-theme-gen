/**
 * Error Recovery UI Component for VS Code Theme Generator
 * Provides contextual error recovery options with intelligent suggestions
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Box, Text } from 'ink';
import { useKeyboardHandler, KeyBinding } from '../../utils/keyboard';
import { 
  isValidationError,
  isFileProcessingError,
  isGenerationError,
  isSecurityError
} from '../../types';

// ============================================================================
// Types
// ============================================================================

export interface RecoveryAction {
  id: string;
  label: string;
  description: string;
  shortcut?: string;
  icon?: string;
  primary?: boolean;
  destructive?: boolean;
  action: () => void | Promise<void>;
}

export interface ErrorRecoveryUIProps {
  error: Error;
  context: string;
  onRecover: (actionId: string) => void | Promise<void>;
  onDismiss?: () => void;
  showTechnicalDetails?: boolean;
  autoFocus?: boolean;
  width?: number;
}

interface ErrorAnalysis {
  type: 'validation' | 'file' | 'generation' | 'security' | 'network' | 'system' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  category: string;
  suggestions: string[];
}

// ============================================================================
// Error Analysis Engine
// ============================================================================

const analyzeError = (error: Error, _context: string): ErrorAnalysis => {
  // Determine error type
  let type: ErrorAnalysis['type'] = 'unknown';
  let severity: ErrorAnalysis['severity'] = 'medium';
  let recoverable = true;
  let category = 'General Error';
  let suggestions: string[] = [];

  if (isValidationError(error)) {
    type = 'validation';
    severity = 'low';
    category = 'Input Validation';
    suggestions = [
      'Check your input format',
      'Verify required fields are filled',
      'Ensure values meet validation criteria'
    ];
  } else if (isFileProcessingError(error)) {
    type = 'file';
    severity = 'medium';
    category = 'File Processing';
    suggestions = [
      'Verify file exists and is readable',
      'Check file permissions',
      'Ensure file format is correct',
      'Try selecting a different file'
    ];
  } else if (isGenerationError(error)) {
    type = 'generation';
    severity = 'high';
    category = 'Theme Generation';
    suggestions = [
      'Check theme data integrity',
      'Verify output directory permissions',
      'Ensure sufficient disk space',
      'Try with different options'
    ];
  } else if (isSecurityError(error)) {
    type = 'security';
    severity = 'critical';
    category = 'Security Issue';
    recoverable = false;
    suggestions = [
      'Review file for malicious content',
      'Scan with antivirus software',
      'Use a different file source',
      'Contact system administrator'
    ];
  } else if (error.message.includes('ENOENT') || error.message.includes('file not found')) {
    type = 'file';
    severity = 'medium';
    category = 'File Not Found';
    suggestions = [
      'Check the file path is correct',
      'Verify the file exists',
      'Ensure proper file permissions',
      'Try browsing for the file'
    ];
  } else if (error.message.includes('EACCES') || error.message.includes('permission denied')) {
    type = 'file';
    severity = 'medium';
    category = 'Permission Denied';
    suggestions = [
      'Check file/directory permissions',
      'Run with appropriate privileges',
      'Choose a different location',
      'Contact system administrator'
    ];
  } else if (error.message.includes('ENOSPC') || error.message.includes('no space')) {
    type = 'system';
    severity = 'high';
    category = 'Insufficient Disk Space';
    suggestions = [
      'Free up disk space',
      'Choose a different output location',
      'Remove unnecessary files',
      'Check available storage'
    ];
  } else if (error.message.includes('network') || error.message.includes('fetch')) {
    type = 'network';
    severity = 'medium';
    category = 'Network Error';
    suggestions = [
      'Check internet connection',
      'Try again in a few moments',
      'Verify proxy settings',
      'Use offline mode if available'
    ];
  }

  return { type, severity, recoverable, category, suggestions };
};

// ============================================================================
// Recovery Actions Generator
// ============================================================================

const generateRecoveryActions = (
  error: Error,
  analysis: ErrorAnalysis,
  context: string,
  onRecover: (actionId: string) => void | Promise<void>
): RecoveryAction[] => {
  // Use error for error-specific recovery actions
  console.debug('Generating recovery actions for:', error.message, 'in context:', context);
  const actions: RecoveryAction[] = [];

  // Common actions based on error type
  switch (analysis.type) {
    case 'validation':
      actions.push(
        {
          id: 'fix-input',
          label: 'Fix Input',
          description: 'Return to fix the invalid input',
          shortcut: 'f',
          icon: '🔧',
          primary: true,
          action: () => onRecover('fix-input')
        },
        {
          id: 'use-defaults',
          label: 'Use Defaults',
          description: 'Apply default values for invalid fields',
          shortcut: 'd',
          icon: '⚙️',
          action: () => onRecover('use-defaults')
        }
      );
      break;

    case 'file':
      actions.push(
        {
          id: 'retry-file',
          label: 'Retry',
          description: 'Try accessing the file again',
          shortcut: 'r',
          icon: '🔄',
          primary: true,
          action: () => onRecover('retry-file')
        },
        {
          id: 'choose-different',
          label: 'Choose Different File',
          description: 'Select a different file',
          shortcut: 'c',
          icon: '📁',
          action: () => onRecover('choose-different')
        },
        {
          id: 'check-permissions',
          label: 'Fix Permissions',
          description: 'Help with file permission issues',
          shortcut: 'p',
          icon: '🔐',
          action: () => onRecover('fix-permissions')
        }
      );
      break;

    case 'generation':
      actions.push(
        {
          id: 'retry-generation',
          label: 'Retry Generation',
          description: 'Attempt theme generation again',
          shortcut: 'r',
          icon: '🔄',
          primary: true,
          action: () => onRecover('retry-generation')
        },
        {
          id: 'change-settings',
          label: 'Change Settings',
          description: 'Modify generation settings',
          shortcut: 's',
          icon: '⚙️',
          action: () => onRecover('change-settings')
        },
        {
          id: 'choose-different-output',
          label: 'Different Output',
          description: 'Choose a different output location',
          shortcut: 'o',
          icon: '📂',
          action: () => onRecover('different-output')
        }
      );
      break;

    case 'security':
      actions.push(
        {
          id: 'security-scan',
          label: 'Security Scan',
          description: 'Scan file for security issues',
          shortcut: 's',
          icon: '🛡️',
          action: () => onRecover('security-scan')
        },
        {
          id: 'safe-mode',
          label: 'Safe Mode',
          description: 'Process in safe mode with restrictions',
          shortcut: 'f',
          icon: '🔒',
          action: () => onRecover('safe-mode')
        }
      );
      break;

    case 'network':
      actions.push(
        {
          id: 'retry-connection',
          label: 'Retry Connection',
          description: 'Try connecting again',
          shortcut: 'r',
          icon: '🌐',
          primary: true,
          action: () => onRecover('retry-connection')
        },
        {
          id: 'offline-mode',
          label: 'Work Offline',
          description: 'Continue without network features',
          shortcut: 'o',
          icon: '📱',
          action: () => onRecover('offline-mode')
        }
      );
      break;

    case 'system':
      actions.push(
        {
          id: 'free-space',
          label: 'Free Space',
          description: 'Help free up disk space',
          shortcut: 'f',
          icon: '💾',
          action: () => onRecover('free-space')
        },
        {
          id: 'different-location',
          label: 'Different Location',
          description: 'Choose location with more space',
          shortcut: 'l',
          icon: '📍',
          primary: true,
          action: () => onRecover('different-location')
        }
      );
      break;
  }

  // Universal actions
  actions.push(
    {
      id: 'restart',
      label: 'Start Over',
      description: 'Restart the application',
      shortcut: 't',
      icon: '🔄',
      action: () => onRecover('restart')
    },
    {
      id: 'report-issue',
      label: 'Report Issue',
      description: 'Report this error for investigation',
      shortcut: 'i',
      icon: '🐛',
      action: () => onRecover('report-issue')
    }
  );

  return actions;
};

// ============================================================================
// Recovery Action Component
// ============================================================================

interface ActionComponentProps {
  action: RecoveryAction;
  focused: boolean;
  index: number;
}

const ActionComponent: React.FC<ActionComponentProps> = ({ action, focused, index }) => {
  const getActionColor = () => {
    if (focused) {
      if (action.destructive) return 'redBright';
      if (action.primary) return 'cyanBright';
      return 'whiteBright';
    }
    
    if (action.destructive) return 'red';
    if (action.primary) return 'cyan';
    return 'white';
  };

  const getBorderColor = () => {
    if (focused) {
      return action.destructive ? 'red' : 'cyan';
    }
    return 'gray';
  };

  return (
    <Box
      borderStyle={focused ? 'single' : 'round'}
      borderColor={getBorderColor()}
      paddingX={2}
      paddingY={1}
      marginBottom={1}
    >
      <Box alignItems="center">
        <Text color={getActionColor()} bold={focused}>
          {action.icon} {index + 1}. {action.label}
        </Text>
        {action.shortcut && (
          <Text color="gray" dimColor>
            {' '}({action.shortcut})
          </Text>
        )}
      </Box>
      
      <Box marginTop={0}>
        <Text color={focused ? 'white' : 'gray'} dimColor={!focused}>
          {action.description}
        </Text>
      </Box>
    </Box>
  );
};

// ============================================================================
// Main Error Recovery UI Component
// ============================================================================

export const ErrorRecoveryUI: React.FC<ErrorRecoveryUIProps> = ({
  error,
  context,
  onRecover,
  onDismiss,
  showTechnicalDetails = false,
  autoFocus = true,
  width = 80
}) => {
  const [focusedActionIndex, setFocusedActionIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(showTechnicalDetails);
  const [isProcessing, setIsProcessing] = useState(false);

  // Analyze error and generate recovery actions
  const analysis = useMemo(() => analyzeError(error, context), [error, context]);
  const recoveryActions = useMemo(() => 
    generateRecoveryActions(error, analysis, context, onRecover), 
    [error, analysis, context, onRecover]
  );

  // Get severity color and icon
  const getSeverityInfo = (severity: ErrorAnalysis['severity']) => {
    const severityMap = {
      low: { color: 'yellow', icon: '⚠️', label: 'Warning' },
      medium: { color: 'orange', icon: '❌', label: 'Error' },
      high: { color: 'red', icon: '🚨', label: 'Critical' },
      critical: { color: 'redBright', icon: '🔥', label: 'Critical' }
    };
    return severityMap[severity] || severityMap.medium;
  };

  const severityInfo = getSeverityInfo(analysis.severity);

  // Action handlers
  const executeAction = useCallback(async (action: RecoveryAction) => {
    setIsProcessing(true);
    try {
      await action.action();
    } catch (actionError) {
      console.error('Error executing recovery action:', actionError);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const navigateActions = useCallback((direction: 'up' | 'down') => {
    setFocusedActionIndex(prev => {
      if (direction === 'up') {
        return prev > 0 ? prev - 1 : recoveryActions.length - 1;
      } else {
        return prev < recoveryActions.length - 1 ? prev + 1 : 0;
      }
    });
  }, [recoveryActions.length]);

  const toggleDetails = useCallback(() => {
    setShowDetails(prev => !prev);
  }, []);

  // Keyboard shortcuts
  const keyBindings: KeyBinding[] = useMemo(() => [
    {
      key: 'ArrowUp',
      description: 'Previous action',
      action: () => navigateActions('up'),
      category: 'navigation'
    },
    {
      key: 'ArrowDown',
      description: 'Next action',
      action: () => navigateActions('down'),
      category: 'navigation'
    },
    {
      key: 'Enter',
      description: 'Execute selected action',
      action: () => {
        if (recoveryActions[focusedActionIndex]) {
          executeAction(recoveryActions[focusedActionIndex]);
        }
      },
      category: 'actions'
    },
    {
      key: 'Escape',
      description: 'Dismiss error',
      action: () => onDismiss?.(),
      category: 'actions'
    },
    {
      key: 'd',
      description: 'Toggle technical details',
      action: toggleDetails,
      category: 'panels'
    },
    // Dynamic shortcuts for actions
    ...recoveryActions.map(action => ({
      key: action.shortcut || '',
      description: action.label,
      action: () => executeAction(action),
      category: 'actions' as const,
      enabled: !!action.shortcut
    })).filter(binding => binding.enabled)
  ], [recoveryActions, focusedActionIndex, navigateActions, executeAction, onDismiss, toggleDetails]);

  useKeyboardHandler(keyBindings, {
    enabled: autoFocus && !isProcessing,
    context: 'dialog',
    preventDefault: true
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={severityInfo.color}
      paddingX={3}
      paddingY={2}
      width={width}
    >
      {/* Header */}
      <Box marginBottom={2} alignItems="center">
        <Text color={severityInfo.color} bold>
          {severityInfo.icon} {analysis.category}
        </Text>
        <Box marginLeft={2}>
          <Text color="gray" dimColor>
            Context: {context}
          </Text>
        </Box>
      </Box>

      {/* Error Summary */}
      <Box marginBottom={2} flexDirection="column">
        <Box marginBottom={1}>
          <Text color="white" bold>
            {error.name || 'Error'}
          </Text>
        </Box>
        <Text color="white" wrap="wrap">
          {error.message}
        </Text>
      </Box>

      {/* Suggestions */}
      {analysis.suggestions.length > 0 && (
        <Box marginBottom={2} flexDirection="column">
          <Box marginBottom={1}>
            <Text color="cyan" bold>
              💡 Suggestions:
            </Text>
          </Box>
          {analysis.suggestions.map((suggestion, index) => (
            <Box key={index} marginLeft={2}>
              <Text color="white" dimColor>
                • {suggestion}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Technical Details */}
      {showDetails && (
        <Box 
          marginBottom={2} 
          borderStyle="single" 
          borderColor="gray" 
          paddingX={2} 
          paddingY={1}
        >
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text color="gray" bold>
                Technical Details:
              </Text>
            </Box>
            <Text color="gray" dimColor>
              Type: {analysis.type}
            </Text>
            <Text color="gray" dimColor>
              Severity: {analysis.severity}
            </Text>
            <Text color="gray" dimColor>
              Recoverable: {analysis.recoverable ? 'Yes' : 'No'}
            </Text>
            {error.stack && (
              <>
                <Box marginTop={1}>
                  <Text color="gray" dimColor>
                    Stack trace:
                  </Text>
                </Box>
                <Text color="gray" dimColor>
                  {error.stack.split('\n').slice(0, 3).join('\n')}
                </Text>
              </>
            )}
          </Box>
        </Box>
      )}

      {/* Recovery Actions */}
      <Box marginBottom={2} flexDirection="column">
        <Box marginBottom={1}>
          <Text color="cyan" bold>
            🛠️ Recovery Options:
          </Text>
        </Box>
        
        {isProcessing ? (
          <Box alignItems="center" paddingY={2}>
            <Text color="cyan">🔄 Processing...</Text>
          </Box>
        ) : (
          recoveryActions.map((action, index) => (
            <ActionComponent
              key={action.id}
              action={action}
              focused={index === focusedActionIndex}
              index={index}
            />
          ))
        )}
      </Box>

      {/* Footer */}
      <Box borderTop borderColor="gray" paddingTop={1}>
        <Text color="gray" dimColor>
          Use ↑/↓ to navigate • Enter to execute • 'd' for details • Esc to dismiss
        </Text>
      </Box>
    </Box>
  );
};

export default ErrorRecoveryUI;
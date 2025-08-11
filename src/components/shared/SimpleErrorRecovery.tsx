/**
 * Simplified Error Recovery UI Component
 * Basic version without margin issues for demonstration
 */

import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import { useKeyboardHandler, KeyBinding } from '../../utils/keyboard';

export interface SimpleErrorRecoveryProps {
  error: Error;
  context: string;
  onRecover: (actionId: string) => void | Promise<void>;
  onDismiss?: () => void;
}

export const SimpleErrorRecovery: React.FC<SimpleErrorRecoveryProps> = ({
  error,
  context,
  onRecover,
  onDismiss
}) => {
  const [selectedAction, setSelectedAction] = useState(0);
  
  const actions = [
    { id: 'retry', label: 'Retry', shortcut: 'r', description: 'Try the operation again' },
    { id: 'restart', label: 'Restart', shortcut: 's', description: 'Start over from the beginning' },
    { id: 'dismiss', label: 'Dismiss', shortcut: 'd', description: 'Close this error message' }
  ];

  const handleAction = useCallback(async (actionId: string) => {
    if (actionId === 'dismiss') {
      onDismiss?.();
    } else {
      await onRecover(actionId);
    }
  }, [onRecover, onDismiss]);

  const keyBindings: KeyBinding[] = [
    {
      key: 'ArrowUp',
      description: 'Previous action',
      action: () => setSelectedAction(prev => prev > 0 ? prev - 1 : actions.length - 1),
      category: 'navigation'
    },
    {
      key: 'ArrowDown', 
      description: 'Next action',
      action: () => setSelectedAction(prev => prev < actions.length - 1 ? prev + 1 : 0),
      category: 'navigation'
    },
    {
      key: 'Enter',
      description: 'Execute action',
      action: () => handleAction(actions[selectedAction].id),
      category: 'actions'
    },
    ...actions.map(action => ({
      key: action.shortcut,
      description: action.label,
      action: () => handleAction(action.id),
      category: 'actions' as const
    }))
  ];

  useKeyboardHandler(keyBindings);

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="red"
      paddingX={3}
      paddingY={2}
      width={70}
    >
      {/* Header */}
      <Box>
        <Text color="red" bold>❌ Error in {context}</Text>
      </Box>

      {/* Error Message */}
      <Box paddingY={1}>
        <Text color="white">{error.message}</Text>
      </Box>

      {/* Actions */}
      <Box flexDirection="column" paddingY={1}>
        <Box>
          <Text color="cyan" bold>🛠️ Recovery Options:</Text>
        </Box>
        
        {actions.map((action, index) => (
          <Box key={action.id} paddingY={0}>
            <Text color={index === selectedAction ? 'cyanBright' : 'white'}>
              {index === selectedAction ? '▶ ' : '  '}
              [{action.shortcut}] {action.label} - {action.description}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Instructions */}
      <Box borderTop borderColor="gray" paddingTop={1}>
        <Text color="gray" dimColor>
          Use ↑/↓ to navigate • Enter to execute • Or press shortcut keys
        </Text>
      </Box>
    </Box>
  );
};

export default SimpleErrorRecovery;
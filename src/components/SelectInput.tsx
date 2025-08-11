/**
 * SelectInput component for VS Code Theme Generator
 * Wrapper around ink-select-input with additional features
 */

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import InkSelectInput from 'ink-select-input';

// ============================================================================
// Component Props
// ============================================================================

export interface SelectItem {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

export interface SelectInputProps {
  items: SelectItem[];
  onSelect: (item: SelectItem) => void;
  label?: string;
  placeholder?: string;
  initialIndex?: number;
  limit?: number;
}

// ============================================================================
// SelectInput Component
// ============================================================================

export const SelectInput: React.FC<SelectInputProps> = ({
  items,
  onSelect,
  label,
  placeholder,
  initialIndex = 0,
  limit,
}) => {
  // ============================================================================
  // Transform items for ink-select-input
  // ============================================================================

  const inkItems = useMemo(() => {
    return items
      .filter(item => !item.disabled)
      .map(item => ({
        label: item.label,
        value: item.value,
        description: item.description,
      }));
  }, [items]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleSelect = (selected: { label: string; value: string; description?: string }) => {
    const originalItem = items.find(item => item.value === selected.value);
    if (originalItem) {
      onSelect(originalItem);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (inkItems.length === 0) {
    return (
      <Box flexDirection="column">
        {label && (
          <Box marginBottom={1}>
            <Text>{label}</Text>
          </Box>
        )}
        <Text color="dim">No items available</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Label */}
      {label && (
        <Box marginBottom={1}>
          <Text>{label}</Text>
        </Box>
      )}

      {/* Placeholder */}
      {placeholder && (
        <Box marginBottom={1}>
          <Text color="dim">{placeholder}</Text>
        </Box>
      )}

      {/* Select Input */}
      <InkSelectInput
        items={inkItems}
        onSelect={handleSelect}
        initialIndex={Math.min(initialIndex, inkItems.length - 1)}
        limit={limit}
      />
    </Box>
  );
};

export default SelectInput;
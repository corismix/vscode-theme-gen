/**
 * Advanced SelectInput component with TweakCC-style sophisticated navigation
 * Provides professional dropdown selection with search, keyboard shortcuts, and rich UI
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { SelectInputProps, SelectOption } from './types';
import { useListNavigation, useSearch } from './hooks';

// ============================================================================
// Color Configuration
// ============================================================================

const colors = {
  primary: '#0EA5E9',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  muted: '#6B7280',
  background: '#1F2937',
  border: '#374151',
  text: '#F9FAFB',
  textMuted: '#9CA3AF',
  highlight: '#3B82F6',
  selected: '#1D4ED8'
};

// ============================================================================
// Utility Functions
// ============================================================================

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

const getOptionColor = (option: SelectOption, isSelected: boolean, isFocused: boolean): string => {
  if (option.disabled) return colors.muted;
  if (option.color) return option.color;
  if (isSelected) return colors.selected;
  if (isFocused) return colors.highlight;
  return colors.text;
};

const renderBorder = (style: string, width: number): string => {
  const chars = {
    single: { horizontal: '─', vertical: '│', topLeft: '┌', topRight: '┐', bottomLeft: '└', bottomRight: '┘' },
    double: { horizontal: '═', vertical: '║', topLeft: '╔', topRight: '╗', bottomLeft: '╚', bottomRight: '╝' },
    round: { horizontal: '─', vertical: '│', topLeft: '╭', topRight: '╮', bottomLeft: '╰', bottomRight: '╯' },
    bold: { horizontal: '━', vertical: '┃', topLeft: '┏', topRight: '┓', bottomLeft: '┗', bottomRight: '┛' }
  };
  
  const c = chars[style as keyof typeof chars] || chars.single;
  return c.topLeft + c.horizontal.repeat(width - 2) + c.topRight;
};

// ============================================================================
// Option Rendering Component
// ============================================================================

interface OptionItemProps {
  option: SelectOption;
  isSelected: boolean;
  isFocused: boolean;
  showIcons: boolean;
  showDescription: boolean;
  width: number;
}

const OptionItem: React.FC<OptionItemProps> = ({
  option,
  isSelected,
  isFocused,
  showIcons,
  showDescription,
  width
}) => {
  const maxLabelWidth = width - (showIcons ? 4 : 2) - 2; // Account for borders and indicators
  const color = getOptionColor(option, isSelected, isFocused);
  
  const indicator = isSelected ? '●' : isFocused ? '○' : ' ';
  const icon = showIcons && option.icon ? `${option.icon} ` : '';
  
  return (
    <Box>
      <Text color={isFocused ? colors.highlight : colors.textMuted}>
        {indicator}
      </Text>
      <Text color={color} dimColor={option.disabled}>
        {` ${icon}${truncateText(option.label, maxLabelWidth - icon.length)}`}
      </Text>
      {showDescription && option.description && (
        <Text color={colors.textMuted} dimColor>
          {` - ${truncateText(option.description, Math.max(20, width - option.label.length - 10))}`}
        </Text>
      )}
    </Box>
  );
};

// ============================================================================
// Main SelectInput Component
// ============================================================================

const SelectInput: React.FC<SelectInputProps> = ({
  options = [],
  value,
  defaultValue,
  placeholder = 'Select an option...',
  onSelect,
  onCancel,
  searchable = true,
  searchPlaceholder = 'Type to search...',
  allowEmpty = false,
  maxVisibleOptions = 10,
  showDescription = true,
  showIcons = true,
  enableKeyboardShortcuts = true,
  keyboardShortcuts = {},
  emptyMessage = 'No options available',
  width = 80,
  height = Math.min(maxVisibleOptions + 4, 20),
  borderStyle = 'single',
  focusColor = colors.primary,
  selectedColor = colors.selected,
  testId
}) => {
  // ============================================================================
  // State Management
  // ============================================================================
  
  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const scrollOffset = useRef(0);

  // ============================================================================
  // Search Functionality
  // ============================================================================
  
  const searchFn = useCallback((option: SelectOption, query: string) => {
    const searchTerm = query.toLowerCase();
    return (
      option.label.toLowerCase().includes(searchTerm) ||
      (option.description?.toLowerCase().includes(searchTerm) ?? false)
    );
  }, []);

  const { filteredItems: searchResults } = useSearch(options, searchFn, {
    initialQuery: searchQuery,
    debounceMs: 100
  });

  // ============================================================================
  // Navigation Logic
  // ============================================================================
  
  const currentOptions = searchResults.filter(opt => !opt.disabled);
  const initialIndex = useMemo(() => {
    const targetValue = value || defaultValue;
    if (!targetValue) return 0;
    
    const index = currentOptions.findIndex(opt => opt.value === targetValue);
    return Math.max(0, index);
  }, [currentOptions, value, defaultValue]);

  const {
    selectedIndex,
    selectedItem,
    moveUp,
    moveDown,
    selectCurrent,
    cancel
  } = useListNavigation(currentOptions, {
    initialIndex,
    onSelect: (option) => {
      onSelect(option.value, option);
      setIsOpen(false);
    },
    onCancel: () => {
      onCancel?.();
      setIsOpen(false);
    }
  });

  // ============================================================================
  // Keyboard Input Handling
  // ============================================================================
  
  useInput((input, key) => {
    if (!isOpen) return;

    // Handle search input
    if (searchable && !key.ctrl && !key.meta && !key.alt && !key.escape && !key.return && !key.upArrow && !key.downArrow) {
      if (key.backspace) {
        setSearchQuery(prev => prev.slice(0, -1));
      } else if (input && input.length === 1 && !key.tab) {
        setSearchQuery(prev => prev + input);
        setIsSearching(true);
      }
      return;
    }

    // Handle navigation and actions
    if (key.upArrow || (enableKeyboardShortcuts && input === 'k')) {
      moveUp();
    } else if (key.downArrow || (enableKeyboardShortcuts && input === 'j')) {
      moveDown();
    } else if (key.return || (enableKeyboardShortcuts && input === ' ')) {
      selectCurrent();
    } else if (key.escape || (enableKeyboardShortcuts && input === 'q')) {
      cancel();
    } else if (enableKeyboardShortcuts && input === '/') {
      setIsSearching(true);
    } else if (key.tab) {
      // Tab through options
      moveDown();
    } else if (key.ctrl && input === 'c') {
      cancel();
    }

    // Custom keyboard shortcuts
    if (enableKeyboardShortcuts && keyboardShortcuts[input]) {
      keyboardShortcuts[input]();
    }
  });

  // ============================================================================
  // Auto-scroll Logic
  // ============================================================================
  
  useEffect(() => {
    const visibleStart = scrollOffset.current;
    const visibleEnd = visibleStart + maxVisibleOptions - 1;
    
    if (selectedIndex < visibleStart) {
      scrollOffset.current = selectedIndex;
    } else if (selectedIndex > visibleEnd) {
      scrollOffset.current = selectedIndex - maxVisibleOptions + 1;
    }
  }, [selectedIndex, maxVisibleOptions]);

  // ============================================================================
  // Render Helpers
  // ============================================================================
  
  const visibleOptions = useMemo(() => {
    const start = scrollOffset.current;
    const end = start + maxVisibleOptions;
    return currentOptions.slice(start, end);
  }, [currentOptions, maxVisibleOptions]);

  const hasMore = currentOptions.length > maxVisibleOptions;
  const showScrollIndicator = hasMore && scrollOffset.current > 0;
  const showEndIndicator = hasMore && scrollOffset.current + maxVisibleOptions < currentOptions.length;

  if (!isOpen) {
    return null;
  }

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <Box flexDirection="column" width={width} height={height}>
      {/* Header with search */}
      <Box borderStyle={borderStyle} borderColor={focusColor} paddingX={1}>
        <Box flexDirection="column" width="100%">
          {/* Title bar */}
          <Box justifyContent="space-between">
            <Text color={focusColor} bold>
              {searchable && isSearching ? '🔍 Search' : '📋 Select Option'}
            </Text>
            <Text color={colors.textMuted} dimColor>
              {currentOptions.length} items
            </Text>
          </Box>
          
          {/* Search input */}
          {searchable && (
            <Box marginTop={1}>
              <Text color={colors.textMuted}>Search: </Text>
              <Text color={colors.text}>
                {searchQuery || (isSearching ? '|' : placeholder)}
              </Text>
            </Box>
          )}
        </Box>
      </Box>

      {/* Options list */}
      <Box borderStyle={borderStyle} borderColor={colors.border} borderTop={false} flexDirection="column" flexGrow={1}>
        {/* Scroll indicator */}
        {showScrollIndicator && (
          <Box paddingX={1}>
            <Text color={colors.textMuted} dimColor>
              ↑ {scrollOffset.current} more above
            </Text>
          </Box>
        )}

        {/* Options */}
        {currentOptions.length === 0 ? (
          <Box paddingX={1} paddingY={1}>
            <Text color={colors.textMuted}>
              {searchQuery ? 'No matches found' : emptyMessage}
            </Text>
          </Box>
        ) : (
          visibleOptions.map((option, index) => {
            const globalIndex = scrollOffset.current + index;
            return (
              <Box key={option.value} paddingX={1}>
                <OptionItem
                  option={option}
                  isSelected={option.value === value}
                  isFocused={globalIndex === selectedIndex}
                  showIcons={showIcons}
                  showDescription={showDescription}
                  width={width - 2}
                />
              </Box>
            );
          })
        )}

        {/* End scroll indicator */}
        {showEndIndicator && (
          <Box paddingX={1}>
            <Text color={colors.textMuted} dimColor>
              ↓ {currentOptions.length - scrollOffset.current - maxVisibleOptions} more below
            </Text>
          </Box>
        )}
      </Box>

      {/* Footer with shortcuts */}
      {enableKeyboardShortcuts && (
        <Box borderStyle={borderStyle} borderColor={colors.border} borderTop={false} paddingX={1}>
          <Text color={colors.textMuted} dimColor>
            ↑↓ navigate • Enter select • Esc cancel {searchable && '• / search'}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default SelectInput;
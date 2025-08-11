/**
 * Context-sensitive Help Panel Component for VS Code Theme Generator
 * Provides contextual help, shortcuts, and guidance based on current state
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useKeyboardHandler, KeyBinding, getContextShortcuts, KeyboardContext } from '../../utils/keyboard';

// ============================================================================
// Types
// ============================================================================

export interface HelpContent {
  title: string;
  description: string;
  sections: HelpSection[];
}

export interface HelpSection {
  title: string;
  content: string | React.ReactNode;
  shortcuts?: HelpShortcut[];
  tips?: string[];
  examples?: HelpExample[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface HelpShortcut {
  key: string;
  description: string;
  action?: () => void;
  category?: string;
  global?: boolean;
}

export interface HelpExample {
  title: string;
  description: string;
  code?: string;
  image?: string;
}

export interface HelpPanelProps {
  context: string;
  shortcuts?: HelpShortcut[];
  customContent?: HelpSection[];
  showSearch?: boolean;
  showCategories?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  width?: number;
  height?: number;
  onClose?: () => void;
}

type ViewMode = 'overview' | 'shortcuts' | 'search' | 'examples' | 'tips';

// ============================================================================
// Context-specific Help Content Generator
// ============================================================================

const generateHelpContent = (context: string): HelpContent => {
  const contextMap: Record<string, HelpContent> = {
    welcome: {
      title: 'Welcome Screen Help',
      description: 'Get started with the VS Code Theme Generator',
      sections: [
        {
          title: 'Getting Started',
          content: 'Welcome to the VS Code Theme Generator! This tool helps you convert Ghostty terminal themes into VS Code extensions.',
          tips: [
            'Have your Ghostty theme file ready',
            'Make sure you have write permissions to your desired output directory',
            'Consider having theme metadata (name, description) prepared'
          ]
        },
        {
          title: 'What You\'ll Need',
          content: 'To create a VS Code theme extension, you\'ll need:',
          examples: [
            {
              title: 'Ghostty Theme File',
              description: 'A .theme file containing color definitions',
              code: 'background = #1e1e1e\nforeground = #d4d4d4\npalette = 0=#000000\npalette = 1=#cd3131'
            },
            {
              title: 'Output Directory',
              description: 'A writable directory where the extension will be created'
            }
          ]
        }
      ]
    },
    'file-selection': {
      title: 'File Selection Help',
      description: 'Select and validate your Ghostty theme file',
      sections: [
        {
          title: 'File Requirements',
          content: 'Your theme file should be a valid Ghostty configuration file with color definitions.',
          tips: [
            'File must be readable and under 1MB in size',
            'Should contain color palette definitions',
            'Use .theme or .conf extension for best compatibility'
          ]
        },
        {
          title: 'Supported Formats',
          content: 'The following file formats are supported:',
          examples: [
            {
              title: 'Standard Format',
              description: 'Key-value pairs with color definitions',
              code: 'background = #1a1a1a\nforeground = #ffffff\ncursor-color = #ff0000'
            },
            {
              title: 'Palette Format',
              description: 'Numbered palette entries',
              code: 'palette = 0=#000000\npalette = 1=#800000\npalette = 15=#ffffff'
            }
          ]
        }
      ]
    },
    'theme-config': {
      title: 'Theme Configuration Help',
      description: 'Configure your VS Code theme settings and metadata',
      sections: [
        {
          title: 'Theme Metadata',
          content: 'Provide information about your theme that will appear in VS Code.',
          tips: [
            'Choose a unique, descriptive name',
            'Write a clear description of your theme\'s style',
            'Use semantic versioning (e.g., 1.0.0)'
          ]
        },
        {
          title: 'Color Mapping',
          content: 'Configure how Ghostty colors map to VS Code theme elements.',
          examples: [
            {
              title: 'Terminal Colors',
              description: 'Terminal palette colors map directly to VS Code integrated terminal'
            },
            {
              title: 'UI Colors',
              description: 'Background/foreground colors influence editor and UI theming'
            }
          ]
        }
      ]
    },
    'extension-options': {
      title: 'Extension Options Help',
      description: 'Configure VS Code extension generation options',
      sections: [
        {
          title: 'Extension Structure',
          content: 'Choose what files to include in your VS Code extension.',
          tips: [
            'README.md helps users understand your theme',
            'CHANGELOG.md is useful for tracking updates',
            'LICENSE file is required for public distribution'
          ]
        },
        {
          title: 'Publishing Preparation',
          content: 'Prepare your extension for publishing to the VS Code marketplace.',
          examples: [
            {
              title: 'Publisher Name',
              description: 'Must match your VS Code Marketplace publisher ID'
            },
            {
              title: 'Extension ID',
              description: 'Generated as publisher.theme-name (lowercase, hyphenated)'
            }
          ]
        }
      ]
    },
    progress: {
      title: 'Generation Progress Help',
      description: 'Monitor theme generation and handle any issues',
      sections: [
        {
          title: 'Generation Steps',
          content: 'The theme generation process follows these steps:',
          examples: [
            { title: 'Parse Theme', description: 'Extract colors from Ghostty theme file' },
            { title: 'Generate Theme', description: 'Create VS Code theme JSON' },
            { title: 'Create Files', description: 'Generate package.json, README, etc.' },
            { title: 'Bundle Extension', description: 'Package files into extension structure' }
          ]
        },
        {
          title: 'Common Issues',
          content: 'If generation fails, common causes include:',
          tips: [
            'Insufficient disk space in output directory',
            'Permission denied errors - check directory permissions',
            'Invalid theme data - verify your source file'
          ]
        }
      ]
    }
  };

  return contextMap[context] || {
    title: 'General Help',
    description: 'VS Code Theme Generator assistance',
    sections: [
      {
        title: 'Navigation',
        content: 'Use keyboard shortcuts to navigate efficiently through the application.',
        tips: [
          'Use arrow keys or vim-style navigation (h,j,k,l)',
          'Press ? to show help in any context',
          'Use Tab to move between form fields',
          'Press Escape to go back or cancel actions'
        ]
      }
    ]
  };
};

// ============================================================================
// Help Section Component
// ============================================================================

interface HelpSectionComponentProps {
  section: HelpSection;
  expanded: boolean;
  onToggle?: () => void;
}

const HelpSectionComponent: React.FC<HelpSectionComponentProps> = ({
  section,
  expanded,
  onToggle: _onToggle
}) => {
  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Section Header */}
      <Box marginBottom={1} alignItems="center">
        {section.collapsible && (
          <Text color="cyan" bold>
            {expanded ? '▼' : '▶'}{' '}
          </Text>
        )}
        <Text color="cyan" bold>
          {section.title}
        </Text>
      </Box>

      {/* Section Content */}
      {expanded && (
        <Box flexDirection="column" marginLeft={section.collapsible ? 2 : 0}>
          {/* Main Content */}
          <Box marginBottom={1}>
            {typeof section.content === 'string' ? (
              <Text color="white" wrap="wrap">
                {section.content}
              </Text>
            ) : (
              section.content
            )}
          </Box>

          {/* Tips */}
          {section.tips && section.tips.length > 0 && (
            <Box flexDirection="column" marginBottom={1}>
              <Box marginBottom={1}>
                <Text color="yellow" bold>
                  💡 Tips:
                </Text>
              </Box>
              {section.tips.map((tip, index) => (
                <Box key={index} marginLeft={2}>
                  <Text color="white" dimColor>
                    • {tip}
                  </Text>
                </Box>
              ))}
            </Box>
          )}

          {/* Examples */}
          {section.examples && section.examples.length > 0 && (
            <Box flexDirection="column" marginBottom={1}>
              <Box marginBottom={1}>
                <Text color="green" bold>
                  📝 Examples:
                </Text>
              </Box>
              {section.examples.map((example, index) => (
                <Box key={index} flexDirection="column" marginBottom={1}>
                  <Box marginLeft={2}>
                    <Text color="green" bold>
                      {example.title}:
                    </Text>
                    <Text color="white" dimColor>
                      {' '}{example.description}
                    </Text>
                  </Box>
                  {example.code && (
                    <Box 
                      marginLeft={4} 
                      borderStyle="round" 
                      borderColor="gray" 
                      paddingX={1}
                    >
                      <Text color="gray" dimColor>
                        {example.code}
                      </Text>
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          )}

          {/* Shortcuts */}
          {section.shortcuts && section.shortcuts.length > 0 && (
            <Box flexDirection="column">
              <Box marginBottom={1}>
                <Text color="blue" bold>
                  ⌨️ Shortcuts:
                </Text>
              </Box>
              {section.shortcuts.map((shortcut, index) => (
                <Box key={index} marginLeft={2} alignItems="center">
                  <Text color="cyan" bold>
                    {shortcut.key}
                  </Text>
                  <Text color="white" dimColor>
                    {' '}- {shortcut.description}
                  </Text>
                  {shortcut.global && (
                    <Text color="gray" dimColor>
                      {' '}(global)
                    </Text>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

// ============================================================================
// Search Component
// ============================================================================

interface SearchComponentProps {
  query: string;
  onQueryChange: (query: string) => void;
  results: HelpSection[];
}

const SearchComponent: React.FC<SearchComponentProps> = ({
  query,
  onQueryChange: _onQueryChange,
  results
}) => {
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          🔍 Search Help: {query || '(type to search)'}
        </Text>
      </Box>
      
      {query && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color="white">
              Found {results.length} result{results.length !== 1 ? 's' : ''}:
            </Text>
          </Box>
          
          {results.map((section, index) => (
            <HelpSectionComponent
              key={index}
              section={section}
              expanded={true}
            />
          ))}
          
          {results.length === 0 && (
            <Text color="gray" dimColor>
              No results found. Try different keywords.
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
};

// ============================================================================
// Main Help Panel Component
// ============================================================================

export const HelpPanel: React.FC<HelpPanelProps> = ({
  context,
  shortcuts: _customShortcuts = [],
  customContent = [],
  showSearch = true,
  showCategories = true,
  collapsible = false,
  defaultCollapsed = false,
  width = 80,
  height,
  onClose
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // Generate help content
  const helpContent = useMemo(() => generateHelpContent(context), [context]);
  const allSections = useMemo(() => [
    ...helpContent.sections,
    ...customContent
  ], [helpContent.sections, customContent]);

  // Get keyboard shortcuts
  const keyboardContext = context as KeyboardContext;
  const contextShortcuts = useMemo(() => getContextShortcuts(keyboardContext), [keyboardContext]);

  // Search functionality
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    return allSections.filter(section => 
      section.title.toLowerCase().includes(query) ||
      (typeof section.content === 'string' && section.content.toLowerCase().includes(query)) ||
      section.tips?.some(tip => tip.toLowerCase().includes(query)) ||
      section.shortcuts?.some(shortcut => 
        shortcut.key.toLowerCase().includes(query) || 
        shortcut.description.toLowerCase().includes(query)
      )
    );
  }, [searchQuery, allSections]);

  // Toggle section expansion
  const toggleSection = useCallback((sectionTitle: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
  }, []);

  // Initialize section expansion
  useEffect(() => {
    const initialExpansion: Record<string, boolean> = {};
    allSections.forEach(section => {
      initialExpansion[section.title] = section.defaultExpanded ?? true;
    });
    setExpandedSections(initialExpansion);
  }, [allSections]);

  // Keyboard shortcuts
  const keyBindings: KeyBinding[] = useMemo(() => [
    {
      key: 'Escape',
      description: 'Close help',
      action: () => {
        if (viewMode === 'search' && searchQuery) {
          setSearchQuery('');
        } else if (viewMode !== 'overview') {
          setViewMode('overview');
        } else {
          onClose?.();
        }
      },
      category: 'actions'
    },
    {
      key: '?',
      description: 'Close help',
      action: () => onClose?.(),
      category: 'actions'
    },
    {
      key: 'o',
      description: 'Overview',
      action: () => setViewMode('overview'),
      category: 'navigation'
    },
    {
      key: 's',
      description: 'Shortcuts',
      action: () => setViewMode('shortcuts'),
      category: 'navigation'
    },
    {
      key: '/',
      description: 'Search',
      action: () => {
        setViewMode('search');
        // In a real app, this would focus the search input
      },
      category: 'navigation',
      enabled: showSearch
    },
    {
      key: 'c',
      description: 'Toggle collapse',
      action: () => setIsCollapsed(prev => !prev),
      category: 'panels',
      enabled: collapsible
    }
  ], [viewMode, searchQuery, showSearch, collapsible, onClose]);

  useKeyboardHandler(keyBindings, {
    enabled: true,
    context: 'help',
    preventDefault: true
  });

  if (collapsible && isCollapsed) {
    return (
      <Box 
        borderStyle="single" 
        borderColor="cyan" 
        paddingX={2} 
        paddingY={1}
      >
        <Box alignItems="center">
          <Text color="cyan" bold>
            ? Help (Press 'c' to expand)
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
      paddingX={3}
      paddingY={2}
      width={width}
      height={height}
    >
      {/* Header */}
      <Box marginBottom={2} justifyContent="space-between" alignItems="center">
        <Box>
          <Text color="cyan" bold>
            ❓ {helpContent.title}
          </Text>
        </Box>
        <Box>
          <Text color="gray" dimColor>
            Press '?' or Esc to close
          </Text>
        </Box>
      </Box>

      {/* Description */}
      <Box marginBottom={2}>
        <Text color="white" wrap="wrap">
          {helpContent.description}
        </Text>
      </Box>

      {/* Navigation */}
      {showCategories && (
        <Box marginBottom={2} alignItems="center">
          <Text 
            color={viewMode === 'overview' ? 'cyanBright' : 'cyan'} 
            bold={viewMode === 'overview'}
          >
            [o] Overview
          </Text>
          <Text color="gray" dimColor> | </Text>
          <Text 
            color={viewMode === 'shortcuts' ? 'cyanBright' : 'cyan'} 
            bold={viewMode === 'shortcuts'}
          >
            [s] Shortcuts
          </Text>
          {showSearch && (
            <>
              <Text color="gray" dimColor> | </Text>
              <Text 
                color={viewMode === 'search' ? 'cyanBright' : 'cyan'} 
                bold={viewMode === 'search'}
              >
                [/] Search
              </Text>
            </>
          )}
        </Box>
      )}

      {/* Content */}
      <Box flexDirection="column" flexGrow={1}>
        {viewMode === 'overview' && (
          <Box flexDirection="column">
            {allSections.map((section, _index) => (
              <HelpSectionComponent
                key={section.title}
                section={section}
                expanded={expandedSections[section.title] ?? true}
                onToggle={section.collapsible ? () => toggleSection(section.title) : undefined}
              />
            ))}
          </Box>
        )}

        {viewMode === 'shortcuts' && (
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text color="cyan" bold>
                ⌨️ Available Shortcuts
              </Text>
            </Box>
            
            {contextShortcuts.map((category, catIndex) => (
              <Box key={catIndex} flexDirection="column" marginBottom={1}>
                <Text color="yellow" bold>
                  {category.name}:
                </Text>
                {category.shortcuts.map((shortcut, shortcutIndex) => (
                  <Box key={shortcutIndex} marginLeft={2} alignItems="center">
                    <Text color="cyan" bold>
                      {shortcut.key}
                    </Text>
                    <Text color="white" dimColor>
                      {' '}- {shortcut.description}
                    </Text>
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        )}

        {viewMode === 'search' && (
          <SearchComponent
            query={searchQuery}
            onQueryChange={setSearchQuery}
            results={searchResults}
          />
        )}
      </Box>

      {/* Footer */}
      <Box borderTop borderColor="gray" paddingTop={1} marginTop={1}>
        <Text color="gray" dimColor>
          Navigation: o=overview, s=shortcuts{showSearch ? ', /=search' : ''} • ? or Esc to close
        </Text>
      </Box>
    </Box>
  );
};

export default HelpPanel;
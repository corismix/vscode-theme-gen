/**
 * Theme Preview component
 * Provides real-time visualization of theme colors and code syntax highlighting
 */

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { ThemePreviewProps } from './types';

// ============================================================================
// Default Code Example
// ============================================================================

const defaultCodeExample = `// Example TypeScript/React code
import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

interface ThemeProps {
  name: string;
  colors: Record<string, string>;
}

const ThemeExample: React.FC<ThemeProps> = ({ name, colors }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const isDark = colors.background && colors.background < '#808080';
  
  useEffect(() => {
    // Simulate theme loading
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!isLoaded) {
    return <Text>Loading theme: {name}...</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text bold>Theme Preview: {name}</Text>
      <Text color={colors.primary || '#3B82F6'}>
        Primary Color: {colors.primary}
      </Text>
      <Text color={colors.secondary || '#10B981'}>
        Secondary Color: {colors.secondary}
      </Text>
    </Box>
  );
};

export default ThemeExample;`;

// ============================================================================
// Color Utilities
// ============================================================================

const isHexColor = (color: string): boolean => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

const getContrastColor = (hexColor: string): string => {
  if (!isHexColor(hexColor)) return '#FFFFFF';
  
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  return brightness > 128 ? '#000000' : '#FFFFFF';
};

const lightenColor = (hexColor: string, percent: number): string => {
  if (!isHexColor(hexColor)) return hexColor;
  
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  const newR = Math.min(255, Math.floor(r + (255 - r) * percent / 100));
  const newG = Math.min(255, Math.floor(g + (255 - g) * percent / 100));
  const newB = Math.min(255, Math.floor(b + (255 - b) * percent / 100));
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

// ============================================================================
// Code Syntax Highlighting Component
// ============================================================================

interface CodePreviewProps {
  code: string;
  theme: ThemePreviewProps['theme'];
  onColorClick?: (colorKey: string, colorValue: string) => void;
}

const CodePreview: React.FC<CodePreviewProps> = ({ code, theme, onColorClick }) => {
  const lines = code.split('\n');
  
  const getTokenColor = (token: string, type: 'keyword' | 'string' | 'comment' | 'number' | 'default'): string => {
    const tokenColors = theme.tokenColors || [];
    
    // Find matching token color rule
    for (const rule of tokenColors) {
      const scopes = Array.isArray(rule.scope) ? rule.scope : [rule.scope];
      const scopeMap: Record<string, string> = {
        'keyword': 'keyword.control',
        'string': 'string',
        'comment': 'comment',
        'number': 'constant.numeric',
        'default': 'source'
      };
      
      if (scopes.some(scope => scope.includes(scopeMap[type]))) {
        return rule.settings.foreground || theme.colors.foreground || '#FFFFFF';
      }
    }
    
    // Fallback colors
    const fallbacks: Record<string, string> = {
      'keyword': '#569CD6',
      'string': '#CE9178',
      'comment': '#6A9955',
      'number': '#B5CEA8',
      'default': theme.colors.foreground || '#FFFFFF'
    };
    
    return fallbacks[type];
  };

  const renderLine = (line: string, lineIndex: number) => {
    // Simple syntax highlighting
    const tokens = [];
    let currentIndex = 0;
    
    // Keywords
    const keywords = ['import', 'from', 'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'interface', 'type', 'export', 'default'];
    const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
    
    // Strings
    const stringRegex = /(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g;
    
    // Comments
    const commentRegex = /\/\/.*$/g;
    
    // Numbers
    const numberRegex = /\b\d+(\.\d+)?\b/g;

    let match;
    const ranges: Array<{start: number, end: number, type: string, content: string}> = [];

    // Find all matches
    while ((match = keywordRegex.exec(line)) !== null) {
      ranges.push({start: match.index, end: match.index + match[0].length, type: 'keyword', content: match[0]});
    }
    
    while ((match = stringRegex.exec(line)) !== null) {
      ranges.push({start: match.index, end: match.index + match[0].length, type: 'string', content: match[0]});
    }
    
    while ((match = commentRegex.exec(line)) !== null) {
      ranges.push({start: match.index, end: match.index + match[0].length, type: 'comment', content: match[0]});
    }
    
    while ((match = numberRegex.exec(line)) !== null) {
      ranges.push({start: match.index, end: match.index + match[0].length, type: 'number', content: match[0]});
    }

    // Sort ranges by start position
    ranges.sort((a, b) => a.start - b.start);

    // Remove overlapping ranges (comments override everything)
    const filteredRanges = ranges.filter((range, index) => {
      const nextRange = ranges[index + 1];
      return !nextRange || range.end <= nextRange.start || range.type === 'comment';
    });

    // Build tokens
    let lastEnd = 0;
    for (const range of filteredRanges) {
      // Add text before this range
      if (range.start > lastEnd) {
        tokens.push({
          content: line.slice(lastEnd, range.start),
          type: 'default' as const
        });
      }
      
      // Add the range
      tokens.push({
        content: range.content,
        type: range.type as 'keyword' | 'string' | 'comment' | 'number' | 'default'
      });
      
      lastEnd = range.end;
    }
    
    // Add remaining text
    if (lastEnd < line.length) {
      tokens.push({
        content: line.slice(lastEnd),
        type: 'default' as const
      });
    }

    return (
      <Box key={lineIndex}>
        <Text color="#6B7280" dimColor>
          {String(lineIndex + 1).padStart(3, ' ')} │ 
        </Text>
        {tokens.map((token, tokenIndex) => (
          <Text 
            key={tokenIndex}
            color={getTokenColor(token.content, token.type)}
          >
            {token.content}
          </Text>
        ))}
      </Box>
    );
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={theme.colors.foreground || '#FFFFFF'} bold>
          Code Preview
        </Text>
      </Box>
      
      <Box 
        flexDirection="column" 
        borderStyle="single" 
        borderColor={theme.colors.border || '#374151'}
        paddingX={1}
        paddingY={1}
      >
        {lines.map((line, index) => renderLine(line, index))}
      </Box>
    </Box>
  );
};

// ============================================================================
// UI Preview Component
// ============================================================================

interface UIPreviewProps {
  theme: ThemePreviewProps['theme'];
  onColorClick?: (colorKey: string, colorValue: string) => void;
}

const UIPreview: React.FC<UIPreviewProps> = ({ theme, onColorClick }) => {
  const colors = theme.colors;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={colors.foreground || '#FFFFFF'} bold>
          UI Preview
        </Text>
      </Box>

      {/* Editor simulation */}
      <Box 
        flexDirection="column" 
        borderStyle="single" 
        borderColor={colors.border || '#374151'}
        paddingX={1}
        paddingY={1}
      >
        {/* Tab bar */}
        <Box marginBottom={1} borderStyle="single" borderColor={colors.border || '#374151'} paddingX={1}>
          <Text color={colors.primary || '#3B82F6'}>● theme.json</Text>
          <Text color={colors.textMuted || '#9CA3AF'} marginLeft={2}>○ package.json</Text>
        </Box>

        {/* Status bar simulation */}
        <Box justifyContent="space-between" borderStyle="single" borderColor={colors.border || '#374151'} paddingX={1}>
          <Text color={colors.secondary || '#10B981'}>✓ Ready</Text>
          <Text color={colors.textMuted || '#9CA3AF'}>TypeScript</Text>
        </Box>

        {/* Sample UI elements */}
        <Box flexDirection="column" marginTop={1}>
          <Box marginBottom={1}>
            <Text color={colors.primary || '#3B82F6'}>Primary Button</Text>
            <Text color={colors.secondary || '#10B981'} marginLeft={2}>Secondary</Text>
          </Box>
          
          <Box marginBottom={1}>
            <Text color={colors.success || '#10B981'}>✅ Success message</Text>
          </Box>
          
          <Box marginBottom={1}>
            <Text color={colors.warning || '#F59E0B'}>⚠️ Warning message</Text>
          </Box>
          
          <Box>
            <Text color={colors.error || '#EF4444'}>❌ Error message</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

// ============================================================================
// Terminal Preview Component
// ============================================================================

interface TerminalPreviewProps {
  theme: ThemePreviewProps['theme'];
  onColorClick?: (colorKey: string, colorValue: string) => void;
}

const TerminalPreview: React.FC<TerminalPreviewProps> = ({ theme, onColorClick }) => {
  const colors = theme.colors;

  const terminalColors = {
    black: colors.color0 || '#000000',
    red: colors.color1 || '#FF0000', 
    green: colors.color2 || '#00FF00',
    yellow: colors.color3 || '#FFFF00',
    blue: colors.color4 || '#0000FF',
    magenta: colors.color5 || '#FF00FF',
    cyan: colors.color6 || '#00FFFF',
    white: colors.color7 || '#FFFFFF'
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={colors.foreground || '#FFFFFF'} bold>
          Terminal Preview
        </Text>
      </Box>

      <Box 
        flexDirection="column" 
        borderStyle="single" 
        borderColor={colors.border || '#374151'}
        paddingX={1}
        paddingY={1}
      >
        <Box marginBottom={1}>
          <Text color={terminalColors.green}>user@hostname</Text>
          <Text color={terminalColors.white}>:</Text>
          <Text color={terminalColors.blue}>~/projects/theme-generator</Text>
          <Text color={terminalColors.white}>$ </Text>
        </Box>
        
        <Box marginBottom={1}>
          <Text color={terminalColors.yellow}>npm</Text>
          <Text color={terminalColors.white}> run </Text>
          <Text color={terminalColors.cyan}>build</Text>
        </Box>
        
        <Box marginBottom={1}>
          <Text color={terminalColors.green}>✓ Theme generated successfully!</Text>
        </Box>
        
        <Box>
          <Text color={terminalColors.magenta}>Output:</Text>
          <Text color={terminalColors.white}> {theme.name}.vsix</Text>
        </Box>
      </Box>
    </Box>
  );
};

// ============================================================================
// Main ThemePreview Component
// ============================================================================

const ThemePreview: React.FC<ThemePreviewProps> = ({
  theme,
  showCode = true,
  showUI = true,
  showTerminal = true,
  interactive = false,
  onColorClick,
  width = '100%',
  height,
  codeExample = defaultCodeExample,
  className,
  testId
}) => {
  const containerStyle = useMemo(() => ({
    width: typeof width === 'string' ? width : `${width}ch`,
    height: height ? (typeof height === 'string' ? height : `${height}`) : undefined
  }), [width, height]);

  return (
    <Box
      flexDirection="column"
      width={containerStyle.width}
      height={containerStyle.height}
      className={className}
      data-testid={testId}
    >
      {/* Header */}
      <Box marginBottom={2}>
        <Text color={theme.colors.primary || '#3B82F6'} bold>
          🎨 {theme.name} Preview
        </Text>
      </Box>

      {/* Preview sections */}
      <Box flexDirection="column" gap={2}>
        {showUI && (
          <UIPreview 
            theme={theme} 
            onColorClick={interactive ? onColorClick : undefined} 
          />
        )}

        {showCode && (
          <CodePreview 
            code={codeExample} 
            theme={theme}
            onColorClick={interactive ? onColorClick : undefined}
          />
        )}

        {showTerminal && (
          <TerminalPreview 
            theme={theme}
            onColorClick={interactive ? onColorClick : undefined}
          />
        )}
      </Box>

      {/* Interactive hints */}
      {interactive && onColorClick && (
        <Box marginTop={2} paddingX={1}>
          <Text color="#6B7280" dimColor>
            💡 Click on any color to copy or edit
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default ThemePreview;
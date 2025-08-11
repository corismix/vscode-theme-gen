/**
 * Professional Header component
 * Provides consistent branding with colored headers and action buttons
 */

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { HeaderProps } from './types';

// ============================================================================
// Color Configuration
// ============================================================================

const colors = {
  primary: '#0EA5E9',
  secondary: '#3B82F6',
  accent: '#8B5CF6',
  text: '#F9FAFB',
  textMuted: '#9CA3AF',
  border: '#374151',
  background: '#1F2937',
  gradientStart: '#0EA5E9',
  gradientEnd: '#3B82F6'
};

// ============================================================================
// Gradient Text Utility
// ============================================================================

const createGradientText = (text: string, startColor: string, endColor: string): React.ReactNode => {
  // Simplified gradient effect using alternating colors
  return text.split('').map((char, index) => {
    const ratio = index / (text.length - 1);
    const isEven = index % 2 === 0;
    const color = isEven ? startColor : endColor;
    
    return (
      <Text key={index} color={color}>
        {char}
      </Text>
    );
  });
};

// ============================================================================
// Logo Component
// ============================================================================

interface LogoProps {
  logo?: string;
  showLogo: boolean;
}

const Logo: React.FC<LogoProps> = ({ logo, showLogo }) => {
  if (!showLogo) return null;

  const defaultLogo = '🎨';
  
  return (
    <Box marginRight={2}>
      <Text color={colors.primary}>
        {logo || defaultLogo}
      </Text>
    </Box>
  );
};

// ============================================================================
// Title Component
// ============================================================================

interface TitleProps {
  title: string;
  subtitle?: string;
  gradient: boolean;
}

const Title: React.FC<TitleProps> = ({ title, subtitle, gradient }) => {
  const titleElement = gradient ? (
    <Text bold>
      {createGradientText(title, colors.gradientStart, colors.gradientEnd)}
    </Text>
  ) : (
    <Text color={colors.primary} bold>
      {title}
    </Text>
  );

  return (
    <Box flexDirection="column">
      <Box>
        {titleElement}
      </Box>
      {subtitle && (
        <Box>
          <Text color={colors.textMuted} dimColor>
            {subtitle}
          </Text>
        </Box>
      )}
    </Box>
  );
};

// ============================================================================
// Version Component
// ============================================================================

interface VersionProps {
  version?: string;
  showVersion: boolean;
}

const Version: React.FC<VersionProps> = ({ version, showVersion }) => {
  if (!showVersion || !version) return null;

  return (
    <Box marginLeft={2}>
      <Text color={colors.textMuted} dimColor>
        v{version}
      </Text>
    </Box>
  );
};

// ============================================================================
// Actions Component
// ============================================================================

interface ActionsProps {
  actions: Array<{
    label: string;
    shortcut?: string;
    action: () => void;
    icon?: string;
  }>;
}

const Actions: React.FC<ActionsProps> = ({ actions }) => {
  if (actions.length === 0) return null;

  return (
    <Box gap={2}>
      {actions.map((action, index) => (
        <Box key={index} alignItems="center">
          {action.icon && (
            <Text color={colors.secondary} marginRight={1}>
              {action.icon}
            </Text>
          )}
          <Text color={colors.secondary}>
            {action.label}
          </Text>
          {action.shortcut && (
            <Text color={colors.textMuted} dimColor>
              {` (${action.shortcut})`}
            </Text>
          )}
        </Box>
      ))}
    </Box>
  );
};

// ============================================================================
// Border Component
// ============================================================================

interface BorderProps {
  borderStyle: 'single' | 'double' | 'round' | 'bold' | 'none';
  width: number;
  gradient: boolean;
}

const Border: React.FC<BorderProps> = ({ borderStyle, width, gradient }) => {
  if (borderStyle === 'none') return null;

  const borderChars = {
    single: '─',
    double: '═',
    round: '─',
    bold: '━'
  };

  const char = borderChars[borderStyle] || borderChars.single;
  const borderLine = char.repeat(Math.max(0, width - 2));

  const borderElement = gradient ? (
    <Text>
      {createGradientText(borderLine, colors.gradientStart, colors.gradientEnd)}
    </Text>
  ) : (
    <Text color={colors.border}>
      {borderLine}
    </Text>
  );

  return (
    <Box width="100%">
      {borderElement}
    </Box>
  );
};

// ============================================================================
// Main Header Component
// ============================================================================

const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  version,
  logo,
  showVersion = true,
  showLogo = true,
  actions = [],
  gradient = true,
  borderStyle = 'single',
  height = 3,
  backgroundColor,
  textColor,
  className,
  testId
}) => {
  // ============================================================================
  // Dynamic Width Calculation
  // ============================================================================
  
  const terminalWidth = useMemo(() => {
    return process.stdout.columns || 80;
  }, []);

  // ============================================================================
  // Style Overrides
  // ============================================================================
  
  const headerStyle = useMemo(() => ({
    backgroundColor: backgroundColor || colors.background,
    color: textColor || colors.text
  }), [backgroundColor, textColor]);

  // ============================================================================
  // Content Layout
  // ============================================================================
  
  const renderContent = () => (
    <Box justifyContent="space-between" alignItems="center" width="100%">
      {/* Left side - Logo and Title */}
      <Box alignItems="center">
        <Logo logo={logo} showLogo={showLogo} />
        <Title title={title} subtitle={subtitle} gradient={gradient} />
        <Version version={version} showVersion={showVersion} />
      </Box>

      {/* Right side - Actions */}
      <Actions actions={actions} />
    </Box>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <Box
      flexDirection="column"
      width="100%"
      height={height}
      paddingX={1}
      paddingY={0}
      className={className}
      data-testid={testId}
    >
      {/* Top border */}
      {borderStyle !== 'none' && (
        <Border 
          borderStyle={borderStyle} 
          width={terminalWidth} 
          gradient={gradient} 
        />
      )}

      {/* Main content */}
      <Box flex={1} alignItems="center">
        {renderContent()}
      </Box>

      {/* Bottom border */}
      {borderStyle !== 'none' && (
        <Border 
          borderStyle={borderStyle} 
          width={terminalWidth} 
          gradient={gradient} 
        />
      )}
    </Box>
  );
};

export default Header;
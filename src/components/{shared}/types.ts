/**
 * Shared component types
 * Based on TweakCC patterns for consistent interfaces
 */

import { ReactNode, Key } from 'react';

// ============================================================================
// Base Component Props
// ============================================================================

export interface BaseComponentProps {
  className?: string;
  testId?: string;
}

// ============================================================================
// SelectInput Component Types
// ============================================================================

export interface SelectOption<T = string> {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
  icon?: string;
  color?: string;
}

export interface SelectInputProps<T = string> extends BaseComponentProps {
  options: SelectOption<T>[];
  value?: T;
  defaultValue?: T;
  placeholder?: string;
  onSelect: (value: T, option: SelectOption<T>) => void;
  onCancel?: () => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  allowEmpty?: boolean;
  maxVisibleOptions?: number;
  showDescription?: boolean;
  showIcons?: boolean;
  enableKeyboardShortcuts?: boolean;
  keyboardShortcuts?: Record<string, () => void>;
  emptyMessage?: string;
  width?: number | string;
  height?: number;
  borderStyle?: 'single' | 'double' | 'round' | 'bold';
  focusColor?: string;
  selectedColor?: string;
}

// ============================================================================
// SplitPane Component Types
// ============================================================================

export interface SplitPaneProps extends BaseComponentProps {
  children: [ReactNode, ReactNode];
  split?: 'horizontal' | 'vertical';
  defaultSize?: number | string;
  minSize?: number;
  maxSize?: number;
  allowResize?: boolean;
  resizerStyle?: 'thin' | 'thick' | 'dotted';
  paneStyle?: object;
  resizerColor?: string;
}

// ============================================================================
// Notification System Types
// ============================================================================

export type NotificationType = 'success' | 'warning' | 'error' | 'info' | 'loading';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // Auto-dismiss after ms (0 = no auto-dismiss)
  actions?: NotificationAction[];
  dismissible?: boolean;
  timestamp?: Date;
}

export interface NotificationAction {
  label: string;
  action: () => void;
  shortcut?: string;
  style?: 'primary' | 'secondary' | 'danger';
}

export interface NotificationSystemProps extends BaseComponentProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  maxVisible?: number;
  position?: 'top' | 'bottom' | 'center';
  width?: number | string;
  animation?: boolean;
}

// ============================================================================
// Color Preview Types
// ============================================================================

export interface ColorInfo {
  hex: string;
  name?: string;
  usage?: string;
  contrast?: number;
  accessible?: boolean;
}

export interface ColorPreviewProps extends BaseComponentProps {
  colors: ColorInfo[];
  layout?: 'grid' | 'list' | 'compact';
  showLabels?: boolean;
  showHex?: boolean;
  showContrast?: boolean;
  interactive?: boolean;
  onColorSelect?: (color: ColorInfo) => void;
  groupBy?: 'usage' | 'brightness' | 'hue';
  columns?: number;
  size?: 'small' | 'medium' | 'large';
}

// ============================================================================
// Keyboard Shortcuts Types
// ============================================================================

export interface KeyboardShortcut {
  key: string;
  description: string;
  action: () => void;
  enabled?: boolean;
  global?: boolean;
}

export interface KeyboardShortcutsProps extends BaseComponentProps {
  shortcuts: KeyboardShortcut[];
  showHelp?: boolean;
  helpToggleKey?: string;
  globalEnabled?: boolean;
  category?: string;
}

// ============================================================================
// Loading Spinner Types
// ============================================================================

export interface LoadingSpinnerProps extends BaseComponentProps {
  type?: 'spinner' | 'dots' | 'bar' | 'pulse';
  message?: string;
  color?: string;
  size?: 'small' | 'medium' | 'large';
  duration?: number;
  showElapsedTime?: boolean;
}

// ============================================================================
// Status Bar Types
// ============================================================================

export interface StatusItem {
  id: string;
  content: ReactNode;
  position?: 'left' | 'center' | 'right';
  priority?: number;
  width?: number;
  color?: string;
}

export interface StatusBarProps extends BaseComponentProps {
  items: StatusItem[];
  height?: number;
  borderStyle?: 'single' | 'double' | 'round' | 'bold' | 'none';
  backgroundColor?: string;
  textColor?: string;
  separatorChar?: string;
}

// ============================================================================
// Theme Preview Types
// ============================================================================

export interface ThemePreviewProps extends BaseComponentProps {
  theme: {
    name: string;
    colors: Record<string, string>;
    tokenColors?: Array<{
      name?: string;
      scope: string | string[];
      settings: {
        foreground?: string;
        background?: string;
        fontStyle?: string;
      };
    }>;
  };
  showCode?: boolean;
  showUI?: boolean;
  showTerminal?: boolean;
  interactive?: boolean;
  onColorClick?: (colorKey: string, colorValue: string) => void;
  width?: number | string;
  height?: number | string;
  codeExample?: string;
}

// ============================================================================
// Header Types
// ============================================================================

export interface HeaderProps extends BaseComponentProps {
  title: string;
  subtitle?: string;
  version?: string;
  logo?: string;
  showVersion?: boolean;
  showLogo?: boolean;
  actions?: Array<{
    label: string;
    shortcut?: string;
    action: () => void;
    icon?: string;
  }>;
  gradient?: boolean;
  borderStyle?: 'single' | 'double' | 'round' | 'bold' | 'none';
  height?: number;
  backgroundColor?: string;
  textColor?: string;
}

// ============================================================================
// InfoBox Types
// ============================================================================

export interface InfoBoxProps extends BaseComponentProps {
  title?: string;
  content: ReactNode;
  type?: 'info' | 'warning' | 'error' | 'success' | 'tip';
  icon?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  actions?: Array<{
    label: string;
    action: () => void;
    style?: 'primary' | 'secondary';
  }>;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  borderStyle?: 'single' | 'double' | 'round' | 'bold';
  width?: number | string;
  padding?: number;
}

// ============================================================================
// Hook Types
// ============================================================================

export interface UseKeyboardOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  global?: boolean;
}

export interface UseNotificationOptions {
  maxNotifications?: number;
  defaultDuration?: number;
  position?: 'top' | 'bottom' | 'center';
  pauseOnHover?: boolean;
}
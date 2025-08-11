/**
 * UI component and interaction type definitions
 * Includes form handling, step navigation, and component props
 */

// Note: FormData and GenerationResults types are defined in service.types
// but imported here to avoid circular dependencies
import type { GhosttyColors } from './theme.types';

// ============================================================================
// Navigation Types
// ============================================================================

/**
 * Available application steps
 */
export type StepName = 
  | 'welcome'
  | 'file-selection'  
  | 'theme-config'
  | 'extension-options'
  | 'progress'
  | 'success';

/**
 * Step navigation interface for moving between application states
 */
export interface StepNavigation {
  /** Current active step */
  currentStep: StepName;
  /** Navigate to the next step */
  goToNextStep: () => void;
  /** Navigate to the previous step */
  goToPreviousStep: () => void;
  /** Navigate to a specific step */
  goToStep: (step: StepName) => void;
  /** Whether back navigation is available */
  canGoBack: boolean;
  /** Whether forward navigation is available */
  canGoNext: boolean;
}

// ============================================================================
// Input Component Types
// ============================================================================

/**
 * Selectable item in dropdown/list components
 */
export interface SelectItem {
  /** Display name */
  name: string;
  /** Internal value */
  value: string;
  /** Optional description */
  description?: string;
  /** Whether item is valid/selectable */
  isValid?: boolean;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Props for select input components
 */
export interface SelectInputProps {
  /** Available items to select from */
  items: SelectItem[];
  /** Currently selected index */
  selectedIndex: number;
  /** Called when selection changes */
  onSelect: (index: number) => void;
  /** Called when user confirms selection */
  onSubmit: (item: SelectItem) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether search filtering is enabled */
  searchable?: boolean;
  /** Maximum visible items */
  maxHeight?: number;
}

/**
 * Props for text input components
 */
export interface TextInputProps {
  /** Current input value */
  value: string;
  /** Called when value changes */
  onChange: (value: string) => void;
  /** Called when user submits (Enter key) */
  onSubmit: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Input mask pattern */
  mask?: string;
  /** Whether to show cursor */
  showCursor?: boolean;
  /** Whether to highlight pasted text */
  highlightPastedText?: boolean;
}

/**
 * Props for notification components
 */
export interface NotificationProps {
  /** Notification message */
  message: string;
  /** Notification type */
  type: 'success' | 'error' | 'warning' | 'info';
  /** Auto-dismiss duration in milliseconds */
  duration?: number;
  /** Called when notification is dismissed */
  onDismiss?: () => void;
}

// ============================================================================
// Component Props Types
// ============================================================================

// Forward declare types to avoid circular dependencies
interface FormData {
  inputFile: string;
  themeName: string;
  description: string;
  version: string;
  publisher: string;
  license: string;
  outputPath: string;
  generateFullExtension: boolean;
  generateReadme: boolean;
  generateChangelog: boolean;
  generateQuickstart: boolean;
  skipToStep?: string;
}

interface GenerationResults {
  success: boolean;
  outputPath: string;
  generatedFiles: any[];
  themeFile: any;
  packageFile: any;
  totalFiles: number;
  totalSize: number;
  duration: number;
  error?: string;
  warnings?: string[];
}

/**
 * Base props shared by all step components
 * Provides access to form data, theme data, navigation, and error handling
 */
export interface BaseStepProps {
  /** Current form data */
  formData: FormData;
  /** Update form data */
  updateFormData: (updates: Partial<FormData>) => void;
  /** Parsed theme data */
  themeData: GhosttyColors | null;
  /** Update theme data */
  setThemeData: (data: GhosttyColors | null) => void;
  /** Navigate to next step */
  goToNextStep: () => void;
  /** Navigate to previous step */
  goToPreviousStep: () => void;
  /** Navigate to specific step */
  goToStep: (step: StepName) => void;
  /** Handle error state */
  handleError: (error: string) => void;
  /** Clear current error */
  clearError: () => void;
  /** Current error message */
  error: string | null;
  /** Theme generation results */
  generationResults: GenerationResults | null;
  /** Set generation results */
  setGenerationResults: (results: GenerationResults | null) => void;
  /** Restart application */
  restart: () => void;
  /** Exit application */
  exit: () => void;
}

/**
 * Props for the main App component
 */
export interface AppProps {
  /** Initial form data to pre-populate */
  initialData?: Partial<FormData>;
}

// ============================================================================
// Keyboard Handling Types
// ============================================================================
// Note: KeyboardShortcut interface is also defined in components/shared/types.ts
// This version is for general use, shared version is for component-specific props

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  /** Key combination (e.g., 'ctrl+s', 'escape') */
  key: string;
  /** Human-readable description */
  description: string;
  /** Action to perform */
  action: () => void;
  /** Whether shortcut is currently active */
  enabled?: boolean;
}

/**
 * Keyboard event handler props
 */
export interface KeyboardHandlerProps {
  /** Available keyboard shortcuts */
  shortcuts: KeyboardShortcut[];
  /** Whether keyboard handling is enabled */
  enabled?: boolean;
}

// ============================================================================
// Form Validation Types
// ============================================================================

/**
 * Field validation result
 */
export interface FieldValidation {
  /** Whether field is valid */
  isValid: boolean;
  /** Validation error message */
  error?: string;
  /** Warning message (non-blocking) */
  warning?: string;
  /** Validation suggestions */
  suggestions?: string[];
}

/**
 * Form field configuration
 */
export interface FormField {
  /** Field name/key */
  name: string;
  /** Display label */
  label: string;
  /** Field type */
  type: 'text' | 'select' | 'boolean' | 'file';
  /** Whether field is required */
  required?: boolean;
  /** Validation function */
  validate?: (value: unknown) => FieldValidation;
  /** Field description/help text */
  description?: string;
  /** Placeholder text */
  placeholder?: string;
}

// ============================================================================
// Step Constants
// ============================================================================

/**
 * Step identifiers as constants
 */
export const STEPS = {
  WELCOME: 'welcome' as const,
  FILE_SELECTOR: 'file-selection' as const,
  THEME_CONFIG: 'theme-config' as const,
  EXTENSION_OPTIONS: 'extension-options' as const,
  PROGRESS: 'progress' as const,
  SUCCESS: 'success' as const,
} as const;

/**
 * Ordered list of steps for navigation
 */
export const STEP_ORDER: readonly StepName[] = [
  STEPS.WELCOME,
  STEPS.FILE_SELECTOR,
  STEPS.THEME_CONFIG,
  STEPS.EXTENSION_OPTIONS,
  STEPS.PROGRESS,
  STEPS.SUCCESS,
] as const;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for valid step names
 */
export const isValidStepName = (step: string): step is StepName => {
  return ['welcome', 'file-selection', 'theme-config', 'extension-options', 'progress', 'success'].includes(step);
};
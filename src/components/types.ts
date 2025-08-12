/**
 * Shared types for ThemeGenerator components
 */

import type { GhosttyColors, VSCodeTheme } from '@/types';

export interface FormData {
  inputFile: string;
  themeName: string;
  description: string;
  version: string;
  publisher: string;
  license: string;
  outputPath: string;
  generateReadme: boolean;
  generateChangelog: boolean;
}

export interface ThemeData {
  colors: GhosttyColors;
  theme: VSCodeTheme;
}

export type Step = 'file' | 'theme' | 'options' | 'process' | 'success' | 'error';

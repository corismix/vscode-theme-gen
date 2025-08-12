/**
 * Shared types for ThemeGenerator components
 */

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
  colors: any;
  theme: any;
}

export type Step = 'file' | 'theme' | 'options' | 'process' | 'success' | 'error';

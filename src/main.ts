#!/usr/bin/env node

/**
 * Main entry point for VS Code Theme Generator CLI
 * Converted to TypeScript with modern architecture
 */

import React from 'react';
import { render } from 'ink';
import meow from 'meow';
import App from './components/App';
import { fileUtils } from './lib/utils';
import { CLIFlags, FormData } from './utils/types';

// ============================================================================
// CLI Definition
// ============================================================================

const cli = meow(`
	Usage
	  $ theme-generator [options]

	Options
	  --input, -i       Input Ghostty theme file (.txt)
	  --output, -o      Output directory for extension
	  --name, -n        Theme name
	  --description, -d Theme description
	  --publisher, -p   Publisher name
	  --version, -v     Theme version (default: 0.0.1)
	  --license, -l     License type (default: MIT)
	  --no-readme       Skip README.md generation
	  --no-changelog    Skip CHANGELOG.md generation
	  --no-quickstart   Skip quickstart guide generation
	  --help, -h        Show help
	  --version         Show version

	Examples
	  $ theme-generator
	  $ theme-generator --input my-theme.txt --output ./my-theme
	  $ theme-generator -i theme.txt -n "My Theme" -p my-publisher
`, {
  importMeta: import.meta,
  flags: {
    input: {
      type: 'string',
      shortFlag: 'i',
    },
    output: {
      type: 'string',
      shortFlag: 'o',
    },
    name: {
      type: 'string',
      shortFlag: 'n',
    },
    description: {
      type: 'string',
      shortFlag: 'd',
    },
    publisher: {
      type: 'string',
      shortFlag: 'p',
    },
    version: {
      type: 'string',
      shortFlag: 'v',
      default: '0.0.1',
    },
    license: {
      type: 'string',
      shortFlag: 'l',
      default: 'MIT',
    },
    readme: {
      type: 'boolean',
      default: true,
    },
    changelog: {
      type: 'boolean',
      default: true,
    },
    quickstart: {
      type: 'boolean',
      default: true,
    },
  },
});

// ============================================================================
// Validation Functions
// ============================================================================

interface ValidationError {
  field: string;
  message: string;
  suggestion?: string;
}

/**
 * Validates command line flags
 */
const validateFlags = (flags: CLIFlags): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Validate input file if provided
  if (flags.input) {
    if (!fileUtils.fileExists(flags.input)) {
      errors.push({
        field: 'input',
        message: `Input file does not exist: ${flags.input}`,
        suggestion: 'Check that the file path is correct and the file exists',
      });
    } else {
      const validation = fileUtils.validateGhosttyFile(flags.input);
      if (!validation.isValid) {
        errors.push({
          field: 'input',
          message: `Invalid input file: ${validation.error}`,
          suggestion: validation.suggestions?.[0],
        });
      }
    }
  }

  // Validate version format
  if (flags.version && !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(flags.version)) {
    errors.push({
      field: 'version',
      message: 'Version must follow semantic versioning (e.g., 1.0.0)',
      suggestion: 'Use format: MAJOR.MINOR.PATCH',
    });
  }

  // Validate publisher name
  if (flags.publisher) {
    if (!/^[a-z0-9\-]+$/i.test(flags.publisher) || flags.publisher.length < 3) {
      errors.push({
        field: 'publisher',
        message: 'Publisher name must be at least 3 characters and contain only letters, numbers, and hyphens',
        suggestion: 'Use only alphanumeric characters and hyphens',
      });
    }
  }

  return errors;
};

/**
 * Creates initial data from CLI flags
 */
const createInitialData = (flags: CLIFlags): Partial<FormData> => {
  return {
    inputFile: flags.input || '',
    themeName: flags.name || '',
    description: flags.description || '',
    version: flags.version || '0.0.1',
    publisher: flags.publisher || '',
    license: flags.license || 'MIT',
    outputPath: flags.output || '',
    generateFullExtension: true,
    generateReadme: flags.readme !== false,
    generateChangelog: flags.changelog !== false,
    generateQuickstart: flags.quickstart !== false,
  };
};

/**
 * Determines which step to skip to based on provided flags
 */
const determineSkipStep = (flags: CLIFlags): string | undefined => {
  if (flags.input && flags.name) {
    // If both input and name are provided, skip to extension options
    return 'extension-options';
  } else if (flags.input) {
    // If just input is provided, skip to theme configuration
    return 'theme-config';
  }
  return undefined;
};

// ============================================================================
// Main Function
// ============================================================================

const main = (): void => {
  // Show header
  console.log('');
  console.log('🎨 VS Code Theme Generator');
  console.log('Convert Ghostty terminal themes to VS Code extensions');
  console.log('');

  // Validate command line flags
  const validationErrors = validateFlags(cli.flags as CLIFlags);
  if (validationErrors.length > 0) {
    console.error('❌ Validation errors:');
    validationErrors.forEach(error => {
      console.error(`   ${error.message}`);
      if (error.suggestion) {
        console.error(`   💡 ${error.suggestion}`);
      }
    });
    console.error('');
    console.error('Use --help for usage information.');
    process.exit(1);
  }

  // Create initial data from CLI flags
  const initialData = createInitialData(cli.flags as CLIFlags);
  const skipToStep = determineSkipStep(cli.flags as CLIFlags);
  
  if (skipToStep) {
    initialData.skipToStep = skipToStep;
  }

  // Start the interactive CLI
  const { clear, unmount } = render(React.createElement(App));

  // Handle process termination
  const cleanup = () => {
    clear();
    unmount();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Handle uncaught exceptions
  process.on('uncaughtException', (err: Error) => {
    clear();
    unmount();
    console.error('');
    console.error('❌ An unexpected error occurred:');
    console.error(err.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(err.stack);
    }
    console.error('');
    console.error('Please report this issue at: https://github.com/your-repo/issues');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    clear();
    unmount();
    console.error('');
    console.error('❌ An unexpected error occurred:');
    console.error(reason);
    console.error('');
    console.error('Please report this issue at: https://github.com/your-repo/issues');
    process.exit(1);
  });
};

// ============================================================================
// Entry Point
// ============================================================================

// Only run main if this file is being executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;
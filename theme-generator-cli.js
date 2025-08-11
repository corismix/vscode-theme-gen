#!/usr/bin/env node --loader babel-register-esm

import React from 'react';
import { render } from 'ink';
import meow from 'meow';
import App from './components/App.js';
import { fileExists, validateGhosttyFile } from './lib/utils.js';

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
			shortFlag: 'i'
		},
		output: {
			type: 'string',
			shortFlag: 'o'
		},
		name: {
			type: 'string',
			shortFlag: 'n'
		},
		description: {
			type: 'string',
			shortFlag: 'd'
		},
		publisher: {
			type: 'string',
			shortFlag: 'p'
		},
		version: {
			type: 'string',
			shortFlag: 'v',
			default: '0.0.1'
		},
		license: {
			type: 'string',
			shortFlag: 'l',
			default: 'MIT'
		},
		readme: {
			type: 'boolean',
			default: true
		},
		changelog: {
			type: 'boolean',
			default: true
		},
		quickstart: {
			type: 'boolean',
			default: true
		}
	}
});

function validateFlags() {
	const errors = [];

	// Validate input file if provided
	if (cli.flags.input) {
		if (!fileExists(cli.flags.input)) {
			errors.push(`Input file does not exist: ${cli.flags.input}`);
		} else {
			const validation = validateGhosttyFile(cli.flags.input);
			if (!validation.valid) {
				errors.push(`Invalid input file: ${validation.error}`);
			}
		}
	}

	// Validate version format
	if (cli.flags.version && !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(cli.flags.version)) {
		errors.push('Version must follow semantic versioning (e.g., 1.0.0)');
	}

	// Validate publisher name
	if (cli.flags.publisher && (!/^[a-z0-9\-]+$/i.test(cli.flags.publisher) || cli.flags.publisher.length < 3)) {
		errors.push('Publisher name must be at least 3 characters and contain only letters, numbers, and hyphens');
	}

	return errors;
}

function createInitialData() {
	return {
		inputFile: cli.flags.input || '',
		themeName: cli.flags.name || '',
		description: cli.flags.description || '',
		version: cli.flags.version,
		publisher: cli.flags.publisher || '',
		license: cli.flags.license,
		outputPath: cli.flags.output || '',
		generateFullExtension: true,
		generateReadme: cli.flags.readme,
		generateChangelog: cli.flags.changelog,
		generateQuickstart: cli.flags.quickstart
	};
}

function main() {
	// Show header
	console.log('');
	console.log('🎨 VS Code Theme Generator');
	console.log('Convert Ghostty terminal themes to VS Code extensions');
	console.log('');

	// Validate command line flags
	const validationErrors = validateFlags();
	if (validationErrors.length > 0) {
		console.error('❌ Validation errors:');
		validationErrors.forEach(error => console.error(`   ${error}`));
		console.error('');
		console.error('Use --help for usage information.');
		process.exit(1);
	}

	// Create initial data from CLI flags
	const initialData = createInitialData();

	// Check if we have enough info to skip some steps
	let skipToStep = null;
	if (cli.flags.input && cli.flags.name) {
		// If both input and name are provided, we can skip to extension options
		skipToStep = 'extensionOptions';
	} else if (cli.flags.input) {
		// If just input is provided, skip to theme configuration
		skipToStep = 'themeConfig';
	}

	// Start the interactive CLI
	const { clear, unmount } = render(
		React.createElement(App, {
			initialData: {
				...initialData,
				skipToStep
			}
		})
	);

	// Handle process termination
	const cleanup = () => {
		clear();
		unmount();
		process.exit(0);
	};

	process.on('SIGINT', cleanup);
	process.on('SIGTERM', cleanup);

	// Handle uncaught exceptions
	process.on('uncaughtException', (err) => {
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

	process.on('unhandledRejection', (reason) => {
		clear();
		unmount();
		console.error('');
		console.error('❌ An unexpected error occurred:');
		console.error(reason);
		console.error('');
		console.error('Please report this issue at: https://github.com/your-repo/issues');
		process.exit(1);
	});
}

// Only run main if this file is being executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}

export default main;
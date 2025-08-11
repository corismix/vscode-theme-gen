# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript CLI application for converting Ghostty terminal color themes to VS Code extensions. It features an interactive React-based terminal UI built with Ink and a complete build system using Vite.

## Architecture

### Core Components

- **CLI Entry**: `src/main.ts` - Meow-based CLI with validation and error handling
- **Theme Engine**: `src/lib/theme-generator.ts` - Ghostty to VS Code theme conversion logic
- **File Generators**: `src/lib/file-generators.ts` - Extension file generation
- **React Components**: `src/components/` - Interactive UI components using Ink
- **State Management**: `src/context/` - React Context for app state and notifications

### Key Technologies

- **Runtime**: Node.js 18+ with ES modules
- **Language**: TypeScript with strict mode
- **UI Framework**: React 18 with Ink for terminal UI
- **Build System**: Vite + TypeScript compiler
- **Testing**: Vitest + React Testing Library

## Development Commands

### Essential Commands

```bash
# Build for production
npm run build

# Development build with source maps
npm run build:dev

# Type checking (no emit)
npm run type-check

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting
npm run format:check

# Clean build artifacts
npm run clean

# Start the CLI (builds first)
npm start

# Development mode
npm run dev
```

### Testing Specific Files

```bash
# Run specific test file
npx vitest src/test/lib/theme-generator.test.ts

# Run tests matching pattern
npx vitest --grep "parseThemeFile"

# Debug tests
npx vitest --reporter=verbose
```

## Code Standards

### TypeScript Configuration

- Strict mode enabled
- Path aliases configured (@/, @/components, @/utils, @/lib, @/context)
- Target: ES2020, Module: ESNext
- React JSX automatic runtime

### ESLint Rules

- TypeScript strict rules with @typescript-eslint
- React hooks rules enforced
- Max line length: 120 characters
- Trailing commas: always-multiline
- Semicolons: always
- Quotes: single (with template literals allowed)
- Indent: 2 spaces

### Prettier Configuration

- Single quotes
- Semicolons
- Print width: 100
- Arrow parens: avoid
- Trailing comma: ES5

## Project Structure

```
src/
├── components/           # React UI components
│   ├── App.tsx          # Main app orchestrator
│   ├── Welcome.tsx      # Welcome screen
│   ├── FileSelector.tsx # File selection UI
│   ├── ThemeConfigurator.tsx # Theme configuration
│   └── shared/          # Reusable components
├── context/             # React Context providers
├── hooks/               # Custom React hooks
├── lib/                 # Core business logic
│   ├── theme-generator.ts # Theme conversion
│   ├── file-generators.ts # File generation
│   └── utils.ts         # File utilities
├── utils/               # Shared utilities
│   ├── types.ts         # TypeScript types
│   ├── config.ts        # Configuration
│   └── error-handling.ts # Error classes
└── main.ts              # CLI entry point
```

## Key Implementation Details

### Theme Parsing

The theme parser (`src/lib/theme-generator.ts`) handles:
- Ghostty theme file format (key=value pairs)
- Color validation (hex format)
- Palette format parsing (palette = N=#color)
- File size limits (1MB max)
- Comprehensive error handling with ValidationError and FileProcessingError classes

### State Management

Uses React Context (`src/context/AppContext.tsx`) for:
- Form data persistence
- Step navigation
- Error handling
- Notification system

### File Generation

Generates complete VS Code extension structure:
- package.json with proper manifest
- Theme JSON with workbench and token colors
- README, CHANGELOG, LICENSE files
- VS Code launch configuration

## Error Handling

- Custom error classes: ValidationError, FileProcessingError
- Comprehensive validation at each step
- User-friendly error messages with suggestions
- Graceful error recovery in UI

## Testing Strategy

- Unit tests for core logic (theme-generator, file-generators)
- Component tests with React Testing Library
- Mock filesystem operations in tests
- Coverage thresholds: 80% for all metrics

## Important Notes

- All new code must be TypeScript with proper types
- Use existing error classes for consistency
- Follow React hooks patterns in components
- Maintain Ink component compatibility
- Test file operations thoroughly
- Preserve terminal UI responsiveness